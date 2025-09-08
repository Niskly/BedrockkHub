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

    console.log('Attempting to use Xbox token for profile access...');
    
    // The xbl_token from the callback should be a user-specific access token
    // Try multiple authentication methods based on OpenXBL's API patterns

    let xboxData;
    let authSuccess = false;

    // Method 1: Try using the token as a Bearer token
    try {
      console.log('Trying Bearer token authentication...');
      const bearerResponse = await fetch('https://xbl.io/api/v2/account', {
        headers: {
          'Authorization': `Bearer ${xbl_token}`,
          'Accept': 'application/json'
        }
      });

      if (bearerResponse.ok) {
        xboxData = await bearerResponse.json();
        authSuccess = true;
        console.log('Bearer token authentication successful');
      } else {
        console.log(`Bearer token failed with status: ${bearerResponse.status}`);
      }
    } catch (error) {
      console.log('Bearer token method failed:', error.message);
    }

    // Method 2: If Bearer failed, try OAuth token exchange
    if (!authSuccess) {
      try {
        console.log('Trying OAuth token exchange...');
        const tokenExchangeResponse = await fetch('https://xbl.io/api/v2/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            'grant_type': 'authorization_code',
            'code': xbl_token,
            'client_id': process.env.OPENXBL_PUBLIC_KEY
          })
        });

        if (tokenExchangeResponse.ok) {
          const tokenData = await tokenExchangeResponse.json();
          console.log('Token exchange successful, fetching user data...');
          
          // Now use the access token to get user data
          const userDataResponse = await fetch('https://xbl.io/api/v2/account', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Accept': 'application/json'
            }
          });

          if (userDataResponse.ok) {
            xboxData = await userDataResponse.json();
            authSuccess = true;
            console.log('OAuth token exchange authentication successful');
          }
        } else {
          const errorText = await tokenExchangeResponse.text();
          console.log(`Token exchange failed: ${tokenExchangeResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.log('OAuth token exchange method failed:', error.message);
      }
    }

    // Method 3: Last resort - try the original XBL3.0 format (likely won't work for user-specific data)
    if (!authSuccess) {
      console.log('Trying legacy XBL3.0 authentication as last resort...');
      try {
        const xblResponse = await fetch('https://xbl.io/api/v2/account', {
          headers: {
            'X-Authorization': process.env.OPENXBL_API_KEY,
            'Authorization': `XBL3.0 x=${xbl_token}`,
            'Accept': 'application/json'
          }
        });

        const responseText = await xblResponse.text();
        console.log('XBL Response status:', xblResponse.status);
        console.log('XBL Response body:', responseText);

        if (xblResponse.ok) {
          try {
            xboxData = JSON.parse(responseText);
            authSuccess = true;
            console.log('Legacy XBL3.0 authentication successful');
          } catch (e) {
            console.log('Failed to parse XBL response:', e.message);
          }
        }
      } catch (error) {
        console.log('Legacy XBL3.0 method failed:', error.message);
      }
    }

    if (!authSuccess || !xboxData) {
      throw new Error('All authentication methods failed. The Xbox token may be invalid or expired. Please try linking your account again.');
    }

    console.log('Xbox data received:', JSON.stringify(xboxData, null, 2));

    // Parse the response based on the API documentation structure
    let xuid, bedrockGamertag, bedrockGamepicUrl;

    if (xboxData.profileUsers && xboxData.profileUsers.length > 0) {
      // Format from /account endpoint (API key owner's data)
      const profile = xboxData.profileUsers[0];
      xuid = profile.id;
      
      const gamertagSetting = profile.settings?.find(s => s.id === 'Gamertag');
      bedrockGamertag = gamertagSetting?.value;
      
      const picSetting = profile.settings?.find(s => s.id === 'GameDisplayPicRaw');
      bedrockGamepicUrl = picSetting?.value;
      
    } else if (xboxData.people && xboxData.people.length > 0) {
      // Format from /account/{xuids} endpoint (specific user data)
      const profile = xboxData.people[0];
      xuid = profile.xuid;
      bedrockGamertag = profile.gamertag;
      bedrockGamepicUrl = profile.displayPicRaw;
      
    } else if (xboxData.xuid) {
      // Direct user object format
      xuid = xboxData.xuid;
      bedrockGamertag = xboxData.gamertag;
      bedrockGamepicUrl = xboxData.avatar || xboxData.displayPicRaw;
      
    } else {
      throw new Error('Unexpected Xbox data format received. This might indicate an authentication issue - please try linking again.');
    }

    if (!xuid || !bedrockGamertag) {
      throw new Error(`Could not retrieve essential profile data. This usually means the authentication token doesn't have the right permissions. XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);
    }

    console.log(`Successfully extracted - XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);

    // Check if this Xbox account is already linked to a DIFFERENT user
    const { data: existingLinks, error: linkCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('xuid', xuid);

    if (linkCheckError) {
      console.error('Database error while checking existing links:', linkCheckError);
      throw new Error('Database error while checking existing links.');
    }

    // Filter out the current user from existing links
    const otherUserLinks = existingLinks?.filter(link => link.id !== user.id) || [];

    if (otherUserLinks.length > 0) {
      const existingUser = otherUserLinks[0];
      throw new Error(`This Xbox account is already linked to another MCHub user: ${existingUser.username}`);
    }

    // Update the user's profile in Supabase using the ADMIN client
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

    // Return success
    res.status(200).json({
      message: 'Bedrock account linked successfully!',
      bedrock_gamertag: bedrockGamertag,
    });

  } catch (error) {
    console.error('Error in link-bedrock function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
