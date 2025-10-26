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
        console.log('[bedrock-callback] Claiming access token with code:', code);
        
        // Use XBL.io's claim endpoint to exchange code for access token
        const claimResponse = await fetch('https://xbl.io/app/claim', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                code: code,
                app_key: process.env.OPENXBL_PUBLIC_KEY
            }),
        });

        console.log('[bedrock-callback] Claim response status:', claimResponse.status);

        if (!claimResponse.ok) {
            const errorText = await claimResponse.text();
            console.error('[bedrock-callback] Token claim failed:', {
                status: claimResponse.status,
                statusText: claimResponse.statusText,
                body: errorText
            });

            return res.status(500).send(`
                <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
                    <h2>Token Claim Failed</h2>
                    <p>Status: ${claimResponse.status}</p>
                    <p>Error: ${errorText}</p>
                    <details style="margin-top: 1rem; text-align: left; background: #2c2c2c; padding: 1rem; border-radius: 8px;">
                        <summary>Debug Info</summary>
                        <pre>Public Key: ${process.env.OPENXBL_PUBLIC_KEY ? 'Present' : 'Missing'}
Code: ${code ? 'Present' : 'Missing'}
Code Length: ${code ? code.length : 0}</pre>
                    </details>
                    <script>setTimeout(() => window.close(), 10000);</script>
                </body></html>
            `);
        }

        const claimData = await claimResponse.json();
        console.log('[bedrock-callback] Claim response data keys:', Object.keys(claimData));
        
        // XBL.io returns the user's access token in the response
        // This token can be used to make API calls on behalf of the user
        const accessToken = claimData.app_key || claimData.access_token || claimData.token;
        
        if (!accessToken) {
            console.error('[bedrock-callback] No access token in claim response:', claimData);
            throw new Error('No access token received from XBL.io claim endpoint');
        }

        console.log('[bedrock-callback] Token claim successful');

        // FIXED: Get the base URL from the request host header (which matches the parent window)
        // This ensures the postMessage target origin matches the recipient window origin
        const baseUrl = `https://${req.headers.host}`;
        
        console.log('[bedrock-callback] Using base URL for postMessage:', baseUrl);

        // Send success response with token
        res.status(200).send(`
          <html><body style="font-family: sans-serif; background: #1c1c1c; color: #e8eefc; text-align: center; padding: 2rem;">
            <h2>Authentication Successful!</h2>
            <p>Finalizing... You can close this window now.</p>
            <script>
              console.log('Callback page loaded, sending message to parent...');
              console.log('Target origin:', "${baseUrl}");
              if (window.opener) {
                try {
                  window.opener.postMessage({
                    type: 'BEDROCK_AUTH_SUCCESS',
                    token: "${accessToken}"
                  }, "${baseUrl}");
                  console.log('Message sent to parent window');
                } catch (e) {
                  console.error('Failed to send message:', e);
                  // Fallback: try with wildcard origin (less secure but might work)
                  try {
                    window.opener.postMessage({
                      type: 'BEDROCK_AUTH_SUCCESS',
                      token: "${accessToken}"
                    }, "*");
                    console.log('Message sent with wildcard origin');
                  } catch (e2) {
                    console.error('Wildcard fallback also failed:', e2);
                  }
                }
              } else {
                console.error('No opener window found');
              }
              setTimeout(() => {
                console.log('Closing popup window');
                try {
                  window.close();
                } catch (e) {
                  console.log('Could not close window automatically');
                }
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
                <details style="margin-top: 1rem; text-align: left; background: #2c2c2c; padding: 1rem; border-radius: 8px;">
                    <summary>Error Details</summary>
                    <pre>${error.message}</pre>
                </details>
                <script>setTimeout(() => window.close(), 8000);</script>
            </body></html>
        `);
    }
}
