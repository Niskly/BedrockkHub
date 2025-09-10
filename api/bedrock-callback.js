// api/bedrock-callback.js
// This handles the callback from XBL.io's OAuth flow

export default async function handler(req, res) {
    console.log('[bedrock-callback] Handler started');
    console.log('[bedrock-callback] Query params:', req.query);
    
    const { code, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
        console.error('[bedrock-callback] OAuth error:', { error, error_description });
        return res.status(400).send(`
          <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
            <h2>Authentication Failed</h2>
            <p>${error_description || error}</p>
            <p>You can close this window.</p>
            <script>setTimeout(() => window.close(), 4000);</script>
          </body></html>
        `);
    }

    if (!code) {
        console.error('[bedrock-callback] No authorization code received');
        return res.status(400).send(`
          <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
            <h2>Authentication Error</h2>
            <p>No authorization code received from Xbox Live.</p>
            <p>You can close this window.</p>
            <script>setTimeout(() => window.close(), 4000);</script>
          </body></html>
        `);
    }

    try {
        console.log('[bedrock-callback] Exchanging code for token...');
        
        // Use the correct XBL.io token endpoint
        const tokenResponse = await fetch('https://xbl.io/api/v2/oauth/token', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.OPENXBL_PUBLIC_KEY,
                client_secret: process.env.OPENXBL_APP_SECRET, // This is your Azure client secret
                grant_type: 'authorization_code',
                code: code,
                // XBL.io uses their own callback, not yours
                redirect_uri: 'https://xbl.io/app/callback'
            }),
        });

        console.log('[bedrock-callback] Token response status:', tokenResponse.status);

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('[bedrock-callback] Token exchange failed:', {
                status: tokenResponse.status,
                statusText: tokenResponse.statusText,
                body: errorText
            });

            return res.status(500).send(`
                <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
                    <h2>Token Exchange Failed</h2>
                    <p>Status: ${tokenResponse.status}</p>
                    <p>Error: ${errorText}</p>
                    <details style="margin-top: 1rem; text-align: left; background: #2c2c2c; padding: 1rem; border-radius: 8px;">
                        <summary>Debug Info</summary>
                        <pre>Client ID: ${process.env.OPENXBL_PUBLIC_KEY ? 'Present' : 'Missing'}
Client Secret: ${process.env.OPENXBL_APP_SECRET ? 'Present' : 'Missing'}
Code: ${code ? 'Present' : 'Missing'}</pre>
                    </details>
                    <script>setTimeout(() => window.close(), 10000);</script>
                </body></html>
            `);
        }

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
            console.error('[bedrock-callback] No access token in response:', tokenData);
            throw new Error('No access token received from XBL.io');
        }

        console.log('[bedrock-callback] Token exchange successful');

        // Get the base URL for the postMessage
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : `https://${req.headers.host}`;

        // Send success response with token
        res.status(200).send(`
          <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
            <h2>Authentication Successful!</h2>
            <p>Finalizing... You can close this window now.</p>
            <script>
              console.log('Callback page loaded, sending message to parent...');
              if (window.opener) {
                window.opener.postMessage({
                  type: 'BEDROCK_AUTH_SUCCESS',
                  token: "${tokenData.access_token}"
                }, "${baseUrl}");
                console.log('Message sent to parent window');
              } else {
                console.error('No opener window found');
              }
              setTimeout(() => {
                console.log('Closing popup window');
                window.close();
              }, 2000);
            </script>
          </body></html>
        `);

    } catch (error) {
        console.error('[bedrock-callback] Unexpected error:', error);
        res.status(500).send(`
            <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
                <h2>Authentication Error</h2>
                <p>An unexpected error occurred: ${error.message}</p>
                <script>setTimeout(() => window.close(), 8000);</script>
            </body></html>
        `);
    }
}
