import { createClient } from '@supabase/supabase-js';

// Initialize the ADMIN client for database updates
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize user-level client for token verification
const supabaseUserClient = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ details: 'Method Not Allowed' });
  }

  try {
    const { mchub_token, xbl_token } = req.body;
    
    if (!mchub_token || !xbl_token) {
      return res.status(400).json({ details: 'MCHub token and Xbox token are required.' });
    }

    // Authenticate the MCHub user
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser(mchub_token);

    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return res.status(401).json({ details: 'Invalid or expired MCHub user token. Please sign in again.' });
    }

    console.log('=== DEBUGGING XBOX TOKEN ===');
    console.log('Token received:', xbl_token);
    console.log('Token type:', typeof xbl_token);
    console.log('Token length:', xbl_token.length);
    console.log('Token starts with:', xbl_token.substring(0, 20) + '...');
    
    // Check if it's a JWT
    const tokenParts = xbl_token.split('.');
    console.log('Token parts count:', tokenParts.length);
    if (tokenParts.length === 3) {
      try {
        const header = JSON.parse(atob(tokenParts[0]));
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('JWT Header:', header);
        console.log('JWT Payload:', payload);
      } catch (e) {
        console.log('Failed to parse as JWT:', e.message);
      }
    }

    let xboxData;
    let authSuccess = false;
    let lastError = '';

    // Method 1: Try using the token as a user-specific Bearer token
    try {
      console.log('=== METHOD 1: Bearer Token ===');
      const bearerResponse = await fetch('https://xbl.io/api/v2/account', {
        headers: {
          'Authorization': `Bearer ${xbl_token}`,
          'Accept': 'application/json'
        }
      });

      console.log('Bearer response status:', bearerResponse.status);
      console.log('Bearer response headers:', Object.fromEntries(bearerResponse.headers));
      
      const responseText = await bearerResponse.text();
      console.log('Bearer response body:', responseText);

      if (bearerResponse.ok) {
        try {
          xboxData = JSON.parse(responseText);
          authSuccess = true;
          console.log('✅ Bearer token authentication successful');
        } catch (parseError) {
          console.log('❌ Failed to parse Bearer response as JSON:', parseError.message);
          lastError = `Bearer method failed: Invalid JSON response`;
        }
      } else {
        lastError = `Bearer method failed: ${bearerResponse.status} - ${responseText}`;
        console.log('❌ Bearer token failed:', lastError);
      }
    } catch (error) {
      lastError = `Bearer method error: ${error.message}`;
      console.log('❌ Bearer token method failed:', lastError);
    }

    // Method 2: Try OAuth token exchange
    if (!authSuccess) {
      try {
        console.log('=== METHOD 2: OAuth Token Exchange ===');
        const tokenExchangeResponse = await fetch('https://xbl.io/api/v2/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            'grant_type': 'authorization_code',
            'code': xbl_token,
            'client_id': process.env.OPENXBL_PUBLIC_KEY,
            'redirect_uri': `${process.env.VERCEL_URL || 'https://mchub.vercel.app'}/bedrock-callback.html`
          })
        });

        console.log('Token exchange status:', tokenExchangeResponse.status);
        const exchangeResponseText = await tokenExchangeResponse.text();
        console.log('Token exchange response:', exchangeResponseText);

        if (tokenExchangeResponse.ok) {
          const tokenData = JSON.parse(exchangeResponseText);
          console.log('Token exchange successful, got:', tokenData);
          
          // Now use the access token to get user data
          const userDataResponse = await fetch('https://xbl.io/api/v2/account', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Accept': 'application/json'
            }
          });

          console.log('User data response status:', userDataResponse.status);
          const userDataText = await userDataResponse.text();
          console.log('User data response:', userDataText);

          if (userDataResponse.ok) {
            xboxData = JSON.parse(userDataText);
            authSuccess = true;
            console.log('✅ OAuth authentication successful');
          } else {
            lastError = `OAuth user data failed: ${userDataResponse.status} - ${userDataText}`;
            console.log('❌', lastError);
          }
        } else {
          lastError = `OAuth token exchange failed: ${tokenExchangeResponse.status} - ${exchangeResponseText}`;
          console.log('❌', lastError);
        }
      } catch (error) {
        lastError = `OAuth method error: ${error.message}`;
        console.log('❌ OAuth token exchange failed:', lastError);
      }
    }

    // Method 3: Try using your API key with the token (fallback)
    if (!authSuccess) {
      try {
        console.log('=== METHOD 3: API Key Fallback ===');
        const fallbackResponse = await fetch('https://xbl.io/api/v2/account', {
          headers: {
            'X-Authorization': process.env.OPENXBL_API_KEY,
            'Authorization': `XBL3.0 x=${xbl_token}`,
            'Accept': 'application/json'
          }
        });

        console.log('Fallback response status:', fallbackResponse.status);
        const fallbackResponseText = await fallbackResponse.text();
        console.log('Fallback response:', fallbackResponseText);

        if (fallbackResponse.ok) {
          try {
            xboxData = JSON.parse(fallbackResponseText);
            authSuccess = true;
            console.log('✅ API Key fallback successful');
            console.log('⚠️  WARNING: This might return app owner data, not user data');
          } catch (parseError) {
            lastError = `API key method failed: Invalid JSON - ${parseError.message}`;
            console.log('❌', lastError);
          }
        } else {
          lastError = `API key method failed: ${fallbackResponse.status} - ${fallbackResponseText}`;
          console.log('❌', lastError);
        }
      } catch (error) {
        lastError = `API key method error: ${error.message}`;
        console.log('❌ API key method failed:', lastError);
      }
    }

    console.log('=== FINAL RESULT ===');
    console.log('Auth success:', authSuccess);
    console.log('Last error:', lastError);
    
    if (!authSuccess || !xboxData) {
      console.error('❌ All authentication methods failed');
      console.error('Environment check:');
      console.error('- OPENXBL_PUBLIC_KEY:', process.env.OPENXBL_PUBLIC_KEY ? 'Set' : 'Missing');
      console.error('- VERCEL_URL:', process.env.VERCEL_URL || 'Not set (using fallback)');
      
      throw new Error(`All authentication methods failed. Last error: ${lastError}`);
    }

    console.log('✅ Xbox data received:', JSON.stringify(xboxData, null, 2));

    // Parse the Xbox data (your existing logic)
    let xuid, bedrockGamertag, bedrockGamepicUrl;

    if (xboxData.profileUsers && xboxData.profileUsers.length > 0) {
      const profile = xboxData.profileUsers[0];
      xuid = profile.id;
      
      const gamertagSetting = profile.settings?.find(s => s.id === 'Gamertag');
      bedrockGamertag = gamertagSetting?.value;
      
      const picSetting = profile.settings?.find(s => s.id === 'GameDisplayPicRaw');
      bedrockGamepicUrl = picSetting?.value;
      
    } else if (xboxData.people && xboxData.people.length > 0) {
      const profile = xboxData.people[0];
      xuid = profile.xuid;
      bedrockGamertag = profile.gamertag;
      bedrockGamepicUrl = profile.displayPicRaw;
      
    } else if (xboxData.xuid || xboxData.id) {
      xuid = xboxData.xuid || xboxData.id;
      bedrockGamertag = xboxData.gamertag;
      bedrockGamepicUrl = xboxData.avatar || xboxData.displayPicRaw;
      
    } else {
      console.error('❌ Unexpected Xbox data format:', xboxData);
      throw new Error('Received unexpected data format from Xbox Live. Please try again.');
    }

    if (!xuid || !bedrockGamertag) {
      console.error(`❌ Missing essential data - XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);
      throw new Error(`Could not retrieve Xbox profile information. XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);
    }

    console.log(`✅ Extracted - XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);

    // Check for existing links
    const { data: existingLinks, error: linkCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('xuid', xuid);

    if (linkCheckError) {
      console.error('Database error:', linkCheckError);
      throw new Error('Database error while checking existing links.');
    }

    const otherUserLinks = existingLinks?.filter(link => link.id !== user.id) || [];

    if (otherUserLinks.length > 0) {
      const existingUser = otherUserLinks[0];
      throw new Error(`This Xbox account is already linked to another MCHub user: ${existingUser.username}`);
    }

    // Update the user's profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        xuid,
        bedrock_gamertag: bedrockGamertag,
        bedrock_gamerpic_url: bedrockGamepicUrl || null
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw updateError;
    }

    console.log('✅ Profile updated successfully');

    res.status(200).json({
      message: 'Bedrock account linked successfully!',
      bedrock_gamertag: bedrockGamertag,
    });

  } catch (error) {
    console.error('❌ Error in link-bedrock function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
