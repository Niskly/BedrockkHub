// PASTE THIS INTO: /api/link-bedrock.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    const { code, error, error_description } = req.query;

    if (error) {
        return res.status(400).send(`
          <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
            <h2>Authentication Failed</h2>
            <p><strong>Error:</strong> ${error}</p>
            <p><strong>Details:</strong> ${error_description || 'No details provided.'}</p>
            <p>You can close this window.</p>
            <script>setTimeout(() => window.close(), 5000);</script>
          </body></html>
        `);
    }

    if (!code) {
        return res.status(400).send(`<html><body><h2>Error</h2><p>Missing authorization code.</p></body></html>`);
    }

    let tokenResponse; // Define it here to access it in the catch block

    try {
        tokenResponse = await fetch('https://xbl.io/api/v2/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.OPENXBL_PUBLIC_KEY,
                client_secret: process.env.OPENXBL_APP_SECRET,
                grant_type: 'authorization_code',
                redirect_uri: `https://${process.env.VERCEL_URL}/api/bedrock-callback`,
                code: code,
            }),
        });

        if (!tokenResponse.ok) {
            // This is the key part: we throw an error so the catch block can read the body
            throw new Error('Token exchange failed');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        res.status(200).send(`
          <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center;">
            <h2>Authentication Successful!</h2>
            <p>Finalizing... You can close this window now.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'BEDROCK_AUTH_SUCCESS',
                  token: "${accessToken}"
                }, "https://${process.env.VERCEL_URL}");
              }
              setTimeout(() => window.close(), 1500);
            </script>
          </body></html>
        `);

    } catch (e) {
        console.error('Bedrock callback error:', e);

        // ** THIS IS THE NEW DEBUGGING CODE **
        // If the fetch failed, we try to read the error body from xbl.io
        if (tokenResponse) {
            const errorBodyText = await tokenResponse.text();
            console.error('Error response from xbl.io:', errorBodyText);
            return res.status(500).send(`
                <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
                    <h2>An unexpected error occurred during authentication.</h2>
                    <p>The server received the following error from the authentication provider:</p>
                    <pre style="background: #000; padding: 1rem; border-radius: 8px; text-align: left; white-space: pre-wrap; word-break: break-all;">${errorBodyText}</pre>
                </body></html>
            `);
        }

        // Fallback for other types of errors
        res.status(500).send(`
            <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
                <h2>An unexpected error occurred during authentication.</h2>
                <p>${e.message}</p>
            </body></html>
        `);
    }
}
