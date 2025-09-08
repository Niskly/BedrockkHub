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

    console.log('Attempting to use Xbox token for user-specific profile access...');
    
    let xboxData;
    let authSuccess = false;

    // Method 1: Try using the token as a user-specific Bearer token (NO API KEY)
    try {
      console.log('Trying user-specific Bearer token authentication...');
      const bearerResponse = await fetch('https://xbl.io/api/v2/account', {
        headers: {
          'Authorization': `Bearer ${xbl_token}`,
          'Accept': 'application/json'
          // REMOVED: 'X-Authorization': process.env.OPENXBL_API_KEY - this was causing app owner auth
        }
      });

      if (bearerResponse.ok) {
        xboxData = await bearerResponse.json();
        authSuccess = true;
        console.log('User-specific Bearer token authentication successful');
      } else {
        const errorText = await bearerResponse.text();
        console.log(`Bearer token failed with status: ${bearerResponse.status} - ${errorText}`);
      }
    } catch (error) {
      console.log('Bearer token method failed:', error.message);
    }

    // Method 2: Try OAuth token exchange for user-specific data
    if (!authSuccess) {
      try {
        console.log('Trying OAuth token exchange for user-specific access...');
        
        // First, try to exchange the authorization code for an access token
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

        if (tokenExchangeResponse.ok) {
          const tokenData = await tokenExchangeResponse.json();
          console.log('Token exchange successful, fetching user-specific data...');
          
          // Now use the user's access token to get their Xbox profile
          const userDataResponse = await fetch('https://xbl.io/api/v2/account', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Accept': 'application/json'
              // NO X-Authorization - we want the user's data, not the app owner's
            }
          });

          if (userDataResponse.ok) {
            xboxData = await userDataResponse.json();
            authSuccess = true;
            console.log('OAuth user-specific authentication successful');
          } else {
            const errorText = await userDataResponse.text();
            console.log(`User data fetch failed: ${userDataResponse.status} - ${errorText}`);
          }
        } else {
          const errorText = await tokenExchangeResponse.text();
          console.log(`Token exchange failed: ${tokenExchangeResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.log('OAuth token exchange method failed:', error.message);
      }
    }

    // Method 3: Try direct profile lookup with user token (if we have an XUID from the token)
    if (!authSuccess) {
      try {
        console.log('Trying direct user profile lookup...');
        
        // Sometimes the token contains user info we can extract
        let decodedToken;
        try {
          // Try to decode JWT if it's a JWT token
          const tokenParts = xbl_token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.xid) {
              decodedToken = payload;
              console.log('Found user ID in token:', payload.xid);
            }
          }
        } catch (e) {
          console.log('Token is not a JWT or cannot be decoded');
        }

        if (decodedToken && decodedToken.xid) {
          // Try to get profile data using the user's XUID
          const profileResponse = await fetch(`https://xbl.io/api/v2/account/${decodedToken.xid}`, {
            headers: {
              'X-Authorization': process.env.OPENXBL_API_KEY, // OK to use API key for specific user lookup
              'Accept': 'application/json'
            }
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.people && profileData.people.length > 0) {
              xboxData = profileData;
              authSuccess = true;
              console.log('Direct profile lookup successful');
            }
          }
        }
      } catch (error) {
        console.log('Direct profile lookup failed:', error.message);
      }
    }

    if (!authSuccess || !xboxData) {
      console.error('All authentication methods failed');
      throw new Error('Failed to authenticate with Xbox Live. This might be because:\n1. The authorization code expired\n2. The user denied permissions\n3. There was a temporary service issue\n\nPlease try linking your Xbox account again.');
    }

    console.log('Xbox data received:', JSON.stringify(xboxData, null, 2));

    // Parse the response based on the API documentation structure
    let xuid, bedrockGamertag, bedrockGamepicUrl;

    if (xboxData.profileUsers && xboxData.profileUsers.length > 0) {
      // Format from /account endpoint (user's own data)
      const profile = xboxData.profileUsers[0];
      xuid = profile.id;
      
      const gamertagSetting = profile.settings?.find(s => s.id === 'Gamertag');
      bedrockGamertag = gamertagSetting?.value;
      
      const picSetting = profile.settings?.find(s => s.id === 'GameDisplayPicRaw');
      bedrockGamepicUrl = picSetting?.value;
      
    } else if (xboxData.people && xboxData.people.length > 0) {
      // Format from /account/{xuid} endpoint (specific user data)
      const profile = xboxData.people[0];
      xuid = profile.xuid;
      bedrockGamertag = profile.gamertag;
      bedrockGamepicUrl = profile.displayPicRaw;
      
    } else if (xboxData.xuid || xboxData.id) {
      // Direct user object format
      xuid = xboxData.xuid || xboxData.id;
      bedrockGamertag = xboxData.gamertag;
      bedrockGamepicUrl = xboxData.avatar || xboxData.displayPicRaw;
      
    } else {
      console.error('Unexpected Xbox data format:', xboxData);
      throw new Error('Received unexpected data format from Xbox Live. Please try again.');
    }

    if (!xuid || !bedrockGamertag) {
      console.error(`Missing essential profile data - XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);
      throw new Error(`Could not retrieve your Xbox profile information. Please ensure your Xbox account has a valid gamertag and try again.`);
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
