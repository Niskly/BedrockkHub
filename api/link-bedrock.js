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

    // CRITICAL: We need to understand what xbl_token actually is
    // Based on the PHP demo, it's likely an authorization code that needs to be "claimed"
    // Let's try to exchange this code for user data using OpenXBL's claim mechanism
    
    console.log('Attempting to claim Xbox token...');
    
    // Try to use OpenXBL's token exchange/claim mechanism
    // This is similar to how OAuth2 works: code -> access token -> user data
    const tokenExchangeResponse = await fetch('https://xbl.io/api/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': xbl_token,
        'client_id': process.env.OPENXBL_PUBLIC_KEY
      })
    });

    if (!tokenExchangeResponse.ok) {
      console.log('Token exchange failed, trying direct account access...');
      
      // Fallback: Try using the token directly as an access token
      const directResponse = await fetch('https://xbl.io/api/v2/account', {
        headers: {
          'Authorization': `Bearer ${xbl_token}`,
          'Accept': 'application/json'
        }
      });

      if (!directResponse.ok) {
        console.log('Direct access failed, trying XBL3.0 format...');
        
        // Last attempt: Try the original XBL3.0 format but log the full response
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

        if (!xblResponse.ok) {
          throw new Error(`All authentication methods failed. Last error: ${responseText}`);
        }

        try {
          var xboxData = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`Failed to parse Xbox response: ${responseText}`);
        }
      } else {
        var xboxData = await directResponse.json();
      }
    } else {
      // If token exchange worked, use the access token to get user data
      const tokenData = await tokenExchangeResponse.json();
      const userDataResponse = await fetch('https://xbl.io/api/v2/account', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        }
      });

      if (!userDataResponse.ok) {
        throw new Error('Failed to fetch user data with exchanged token');
      }

      var xboxData = await userDataResponse.json();
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
      throw new Error('Unexpected Xbox data format received: ' + JSON.stringify(xboxData));
    }

    if (!xuid || !bedrockGamertag) {
      throw new Error(`Could not retrieve essential profile data. XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);
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
