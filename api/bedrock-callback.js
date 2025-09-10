// api/bedrock-callback.js

export default async function handler(req, res) {
    console.log('[bedrock-callback] Handler started');
    console.log('[bedrock-callback] Query params:', req.query);
    console.log('[bedrock-callback] Environment check:', {
        hasPublicKey: !!process.env.OPENXBL_PUBLIC_KEY,
        hasAppSecret: !!process.env.OPENXBL_APP_SECRET,
        hasVercelUrl: !!process.env.VERCEL_URL
    });

    const { code, error, error_description } = req.query;

    // Handle the case where the user denies access in the Xbox login popup
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
        console.log('[bedrock-callback] Starting token exchange with code:', code);

        // Determine the correct redirect URI
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : `https://${req.headers.host}`;
        const redirectUri = `${baseUrl}/api/bedrock-callback`;
        
        console.log('[bedrock-callback] Using redirect URI:', redirectUri);

        // Exchange the temporary code for a real access token
        const tokenRequestBody = {
            client_id: process.env.OPENXBL_PUBLIC_KEY,
            client_secret: process.env.OPENXBL_APP_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: code,
        };

        console.log('[bedrock-callback] Token request body (without secrets):', {
            client_id: tokenRequestBody.client_id,
            grant_type: tokenRequestBody.grant_type,
            redirect_uri: tokenRequestBody.redirect_uri,
            code: 'REDACTED'
        });

        const tokenResponse = await fetch('https://xbl.io/api/v2/oauth/token', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(tokenRequestBody),
        });

        console.log('[bedrock-callback] Token response status:', tokenResponse.status);
        
        const responseText = await tokenResponse.text();
        console.log('[bedrock-callback] Token response body:', responseText);

        if (!tokenResponse.ok) {
            let errorBody;
            try {
                errorBody = JSON.parse(responseText);
            } catch {
                errorBody = { error: 'Invalid response format', message: responseText };
            }
            
            console.error('[bedrock-callback] Token exchange failed:', {
                status: tokenResponse.status,
                statusText: tokenResponse.statusText,
                body: errorBody
            });

            return res.status(500).send(`
                <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
                    <h2>Token Exchange Failed</h2>
                    <p>Status: ${tokenResponse.status}</p>
                    <p>Error: ${JSON.stringify(errorBody)}</p>
                    <details style="margin-top: 1rem; text-align: left; background: #2c2c2c; padding: 1rem; border-radius: 8px;">
                        <summary>Debug Info</summary>
                        <pre>${JSON.stringify({ 
                            redirectUri, 
                            hasClientId: !!process.env.OPENXBL_PUBLIC_KEY,
                            hasClientSecret: !!process.env.OPENXBL_APP_SECRET,
                            code: code ? 'Present' : 'Missing'
                        }, null, 2)}</pre>
                    </details>
                    <script>setTimeout(() => window.close(), 10000);</script>
                </body></html>
            `);
        }

        let tokenData;
        try {
            tokenData = JSON.parse(responseText);
        } catch (parseError) {
            console.error('[bedrock-callback] Failed to parse token response:', parseError);
            throw new Error('Invalid JSON response from token endpoint');
        }

        if (!tokenData.access_token) {
            console.error('[bedrock-callback] No access token in response:', tokenData);
            throw new Error('No access token received');
        }

        console.log('[bedrock-callback] Token exchange successful');
        const accessToken = tokenData.access_token;

        // This script runs in the popup, sends the token to the main settings page, and closes itself.
        res.status(200).send(`
          <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
            <h2>Authentication Successful!</h2>
            <p>Finalizing... You can close this window now.</p>
            <script>
              console.log('Callback page loaded, sending message to parent...');
              if (window.opener) {
                window.opener.postMessage({
                  type: 'BEDROCK_AUTH_SUCCESS',
                  token: "${accessToken}"
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

    } catch (e) {
        console.error('[bedrock-callback] Unexpected error:', e);
        res.status(500).send(`
            <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
                <h2>Authentication Error</h2>
                <p>An unexpected error occurred during authentication.</p>
                <details style="margin-top: 1rem; text-align: left; background: #2c2c2c; padding: 1rem; border-radius: 8px;">
                    <summary>Error Details</summary>
                    <pre>${e.message}\n${e.stack}</pre>
                </details>
                <script>setTimeout(() => window.close(), 8000);</script>
            </body></html>
        `);
    }
}
