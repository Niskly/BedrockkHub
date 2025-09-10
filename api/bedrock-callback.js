// CREATE THIS FILE: /api/bedrock-callback.js

export default async function handler(req, res) {
    const { code, error, error_description } = req.query;

    // Handle the case where the user denies access in the Xbox login popup
    if (error) {
        return res.status(400).send(`
          <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center;">
            <h2>Authentication Failed</h2>
            <p>${error_description || error}</p>
            <p>You can close this window.</p>
            <script>setTimeout(() => window.close(), 4000);</script>
          </body></html>
        `);
    }

    try {
        // Exchange the temporary code for a real access token
        const tokenResponse = await fetch('https://xbl.io/api/v2/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.OPENXBL_PUBLIC_KEY,
                client_secret: process.env.OPENXBL_APP_SECRET, // Your Azure Secret
                grant_type: 'authorization_code',
                redirect_uri: `https://${process.env.VERCEL_URL}/api/bedrock-callback`,
                code: code,
            }),
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.json();
            console.error("Token exchange failed:", errorBody);
            throw new Error('Failed to exchange authorization code for a token.');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

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
                }, "https://${process.env.VERCEL_URL}");
              }
              setTimeout(() => window.close(), 1500);
            </script>
          </body></html>
        `);

    } catch (e) {
        console.error('Bedrock callback error:', e);
        res.status(500).send(`
            <html><body><h2>Error</h2><p>An unexpected error occurred during authentication.</p></body></html>
        `);
    }
}
