// Create a new file: api/xbox-callback.js
// This handles the OAuth callback server-side like the PHP demo

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseUserClient = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { code, state, error } = req.query;
    
    console.log('=== XBOX OAUTH CALLBACK ===');
    console.log('Code:', code ? code.substring(0, 20) + '...' : 'Missing');
    console.log('State:', state);
    console.log('Error:', error);

    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`/settings.html?xbox_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      console.error('No authorization code received');
      return res.redirect('/settings.html?xbox_error=no_code');
    }

    // Decode state to get user information
    let userInfo;
    try {
      userInfo = JSON.parse(atob(state));
      console.log('Decoded state:', userInfo);
    } catch (e) {
      console.error('Invalid state parameter');
      return res.redirect('/settings.html?xbox_error=invalid_state');
    }

    // Verify the user is still logged in by checking their token
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser(userInfo.mchub_token);

    if (userError || !user || user.id !== userInfo.user_id) {
      console.error('User verification failed');
      return res.redirect('/settings.html?xbox_error=user_verification_failed');
    }

    // NOW PROCESS THE CODE IMMEDIATELY (like PHP demo)
    let xboxData;
    let authSuccess = false;

    // Method 1: Try the correct OpenXBL claim endpoint with your private API key
    try {
      console.log('Claiming Xbox data with OpenXBL...');
      
      // This mimics what the PHP SDK does in $auth->claim($code)
      const claimResponse = await fetch('https://xbl.io/api/v2/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Authorization': process.env.OPENXBL_API_KEY
        },
        body: JSON.stringify({
          code: code,
          public_key: process.env.OPENXBL_PUBLIC_KEY
        })
      });

      console.log('Claim response status:', claimResponse.status);
      const claimText = await claimResponse.text();
      console.log('Claim response:', claimText);

      if (claimResponse.ok) {
        xboxData = JSON.parse(claimText);
        authSuccess = true;
        console.log('✅ OpenXBL claim successful');
      } else {
        console.log('❌ OpenXBL claim failed');
      }
    } catch (error) {
      console.log('❌ OpenXBL claim error:', error.message);
    }

    // Method 2: Try alternative OpenXBL endpoint
    if (!authSuccess) {
      try {
        console.log('Trying alternative OpenXBL endpoint...');
        
        const altResponse = await fetch(`https://xbl.io/api/v2/oauth/claim/${code}`, {
          headers: {
            'X-Authorization': process.env.OPENXBL_API_KEY,
            'Accept': 'application/json'
          }
        });

        console.log('Alt response status:', altResponse.status);
        const altText = await altResponse.text();
        console.log('Alt response:', altText);

        if (altResponse.ok) {
          xboxData = JSON.parse(altText);
          authSuccess = true;
          console.log('✅ Alternative endpoint successful');
        }
      } catch (error) {
        console.log('❌ Alternative endpoint error:', error.message);
      }
    }

    // Method 3: Try creating an OpenXBL Auth instance (if possible via API)
    if (!authSuccess) {
      try {
        console.log('Trying OpenXBL auth instance...');
        
        const authResponse = await fetch('https://xbl.io/api/v2/auth/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            public_key: process.env.OPENXBL_PUBLIC_KEY,
            code: code,
            api_key: process.env.OPENXBL_API_KEY
          })
        });

        console.log('Auth instance status:', authResponse.status);
        const authText = await authResponse.text();
        console.log('Auth instance response:', authText);

        if (authResponse.ok) {
          xboxData = JSON.parse(authText);
          authSuccess = true;
          console.log('✅ Auth instance successful');
        }
      } catch (error) {
        console.log('❌ Auth instance error:', error.message);
      }
    }

    if (!authSuccess || !xboxData) {
      console.error('❌ All server-side claim methods failed');
      return res.redirect('/settings.html?xbox_error=claim_failed');
    }

    console.log('✅ Xbox data claimed:', JSON.stringify(xboxData, null, 2));

    // Parse Xbox data
    let xuid, bedrockGamertag, bedrockGamepicUrl;

    if (xboxData.xuid && xboxData.gamertag) {
      xuid = xboxData.xuid;
      bedrockGamertag = xboxData.gamertag;
      bedrockGamepicUrl = xboxData.avatar;
    } else if (xboxData.profileUsers && xboxData.profileUsers.length > 0) {
      const profile = xboxData.profileUsers[0];
      xuid = profile.id;
      
      const gamertagSetting = profile.settings?.find(s => s.id === 'Gamertag');
      bedrockGamertag = gamertagSetting?.value;
      
      const picSetting = profile.settings?.find(s => s.id === 'GameDisplayPicRaw');
      bedrockGamepicUrl = picSetting?.value;
    } else {
      console.error('Unexpected Xbox data format:', xboxData);
      return res.redirect('/settings.html?xbox_error=parse_failed');
    }

    if (!xuid || !bedrockGamertag) {
      console.error(`Missing essential data - XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);
      return res.redirect('/settings.html?xbox_error=incomplete_data');
    }

    console.log(`✅ Parsed - XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);

    // Check for existing links
    const { data: existingLinks, error: linkCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('xuid', xuid);

    if (linkCheckError) {
      console.error('Database error:', linkCheckError);
      return res.redirect('/settings.html?xbox_error=database_error');
    }

    const otherUserLinks = existingLinks?.filter(link => link.id !== user.id) || [];

    if (otherUserLinks.length > 0) {
      const existingUser = otherUserLinks[0];
      console.log('Xbox account already linked to:', existingUser.username);
      return res.redirect(`/settings.html?xbox_error=${encodeURIComponent(`already_linked_to_${existingUser.username}`)}`);
    }

    // Update user profile
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
      return res.redirect('/settings.html?xbox_error=update_failed');
    }

    console.log('✅ Profile updated successfully');

    // Redirect back to settings with success
    return res.redirect(`/settings.html?xbox_success=${encodeURIComponent(bedrockGamertag)}`);

  } catch (error) {
    console.error('❌ Xbox callback error:', error);
    return res.redirect(`/settings.html?xbox_error=${encodeURIComponent(error.message)}`);
  }
}
