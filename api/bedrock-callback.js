// api/bedrock-callback.js
export default async function handler(req, res) {
    const { code, error, error_description } = req.query;

    // Handle the case where the user denies access in the Xbox login popup
    if (error) {
        console.error('OAuth error:', error, error_description);
        return res.status(400).send(`
          <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center;">
            <h2>Authentication Failed</h2>
            <p>${error_description || error}</p>
            <p>You can close this window.</p>
            <script>setTimeout(() => window.close(), 4000);</script>
          </body></html>
        `);
    }

    if (!code) {
        return res.status(400).send(`
            <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center;">
                <h2>Error</h2>
                <p>Missing authorization code.</p>
            </body></html>
        `);
    }

    try {
        // Get the current domain dynamically
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const redirectUri = `${protocol}://${host}/api/bedrock-callback`;
        
        console.log('Token exchange attempt with redirect_uri:', redirectUri);

        // Exchange the temporary code for a real access token
        const tokenResponse = await fetch('https://xbl.io/api/v2/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.OPENXBL_PUBLIC_KEY,
                client_secret: process.env.OPENXBL_APP_SECRET,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code: code,
            }),
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.text();
            console.error("Token exchange failed:", tokenResponse.status, errorBody);
            
            return res.status(500).send(`
                <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
                    <h2>Token Exchange Failed</h2>
                    <p><strong>Status:</strong> ${tokenResponse.status}</p>
                    <p><strong>Response:</strong></p>
                    <pre style="background: #000; padding: 1rem; border-radius: 8px; text-align: left; white-space: pre-wrap; word-break: break-all;">${errorBody}</pre>
                    <p>Please try again or contact support if the issue persists.</p>
                    <script>setTimeout(() => window.close(), 8000);</script>
                </body></html>
            `);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            throw new Error('No access token received from provider');
        }

        // This script runs in the popup, sends the token to the main settings page, and closes itself.
        res.status(200).send(`
          <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center;">
            <h2>Authentication Successful!</h2>
            <p>Finalizing... You can close this window now.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'BEDROCK_AUTH_SUCCESS',
                  token: "${accessToken}"
                }, "${protocol}://${host}");
              }
              setTimeout(() => window.close(), 1500);
            </script>
          </body></html>
        `);

    } catch (e) {
        console.error('Bedrock callback error:', e);
        res.status(500).send(`
            <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
                <h2>Unexpected Error</h2>
                <p>An unexpected error occurred during authentication: ${e.message}</p>
                <p>Please try again or contact support if the issue persists.</p>
                <script>setTimeout(() => window.close(), 5000);</script>
            </body></html>
        `);
    }
}
