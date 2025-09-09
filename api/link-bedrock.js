// In your api/link-bedrock.js - Try this approach without using your private API key:

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

    console.log('=== PROCESSING XBOX AUTHORIZATION ===');
    console.log('Token received:', xbl_token.substring(0, 20) + '...');
    
    let xboxData;
    let authSuccess = false;

    // Method 1: Try to exchange the authorization code directly (no API key)
    try {
      console.log('Trying direct OAuth token exchange...');
      
      const tokenResponse = await fetch('https://login.live.com/oauth20_token.srf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          'client_id': process.env.OPENXBL_PUBLIC_KEY,
          'grant_type': 'authorization_code',
          'code': xbl_token,
          'redirect_uri': `${process.env.VERCEL_URL || 'https://mchub.vercel.app'}/bedrock-callback.html`
        })
      });

      console.log('OAuth token response status:', tokenResponse.status);
      const tokenText = await tokenResponse.text();
      console.log('OAuth token response:', tokenText);

      if (tokenResponse.ok) {
        const tokenData = JSON.parse(tokenText);
        console.log('Got OAuth tokens:', tokenData);
        
        // Now use the access token to authenticate with Xbox Live
        const xblAuthResponse = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            Properties: {
              AuthMethod: 'RPS',
              SiteName: 'user.auth.xboxlive.com',
              RpsTicket: `d=${tokenData.access_token}`
            },
            RelyingParty: 'http://auth.xboxlive.com',
            TokenType: 'JWT'
          })
        });

        console.log('Xbox Live auth response status:', xblAuthResponse.status);
        const xblAuthText = await xblAuthResponse.text();
        console.log('Xbox Live auth response:', xblAuthText);

        if (xblAuthResponse.ok) {
          const xblData = JSON.parse(xblAuthText);
          
          // Get XSTS token
          const xstsResponse = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              Properties: {
                SandboxId: 'RETAIL',
                UserTokens: [xblData.Token]
              },
              RelyingParty: 'http://xboxlive.com',
              TokenType: 'JWT'
            })
          });

          console.log('XSTS response status:', xstsResponse.status);
          const xstsText = await xstsResponse.text();
          console.log('XSTS response:', xstsText);

          if (xstsResponse.ok) {
            const xstsData = JSON.parse(xstsText);
            
            // Extract user info from XSTS token
            const userClaims = xstsData.DisplayClaims?.xui?.[0];
            if (userClaims) {
              xboxData = {
                xuid: userClaims.xid,
                gamertag: userClaims.gtg,
                avatar: userClaims.pic
              };
              authSuccess = true;
              console.log('✅ Direct Xbox Live authentication successful');
            }
          }
        }
      }
    } catch (error) {
      console.log('❌ Direct OAuth method failed:', error.message);
    }

    // Method 2: Try using OpenXBL's public claim endpoint (if it exists)
    if (!authSuccess) {
      try {
        console.log('Trying OpenXBL public claim...');
        
        const claimResponse = await fetch('https://xbl.io/api/v2/oauth/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            code: xbl_token,
            public_key: process.env.OPENXBL_PUBLIC_KEY
          })
        });

        console.log('Public claim response status:', claimResponse.status);
        const claimText = await claimResponse.text();
        console.log('Public claim response:', claimText);

        if (claimResponse.ok) {
          xboxData = JSON.parse(claimText);
          authSuccess = true;
          console.log('✅ OpenXBL public claim successful');
        }
      } catch (error) {
        console.log('❌ Public claim method failed:', error.message);
      }
    }

    // Method 3: Try OpenXBL's user-specific token approach
    if (!authSuccess) {
      try {
        console.log('Trying user-specific token...');
        
        // Some OAuth systems return the token in a format we can use directly
        const userTokenResponse = await fetch('https://xbl.io/api/v2/account', {
          headers: {
            'Authorization': `Bearer ${xbl_token}`,
            'Accept': 'application/json'
            // NOTE: No X-Authorization header (no private API key)
          }
        });

        console.log('User token response status:', userTokenResponse.status);
        const userTokenText = await userTokenResponse.text();
        console.log('User token response:', userTokenText);

        if (userTokenResponse.ok) {
          xboxData = JSON.parse(userTokenText);
          authSuccess = true;
          console.log('✅ User-specific token successful');
        }
      } catch (error) {
        console.log('❌ User token method failed:', error.message);
      }
    }

    if (!authSuccess || !xboxData) {
      console.error('❌ All authentication methods failed');
      console.error('This suggests the OAuth flow might not be properly configured');
      console.error('Consider reaching out to OpenXBL support for user authentication guidance');
      
      throw new Error('Unable to authenticate Xbox user. The authorization code may have expired or the OAuth configuration needs adjustment.');
    }

    console.log('✅ Xbox authentication successful:', JSON.stringify(xboxData, null, 2));

    // Parse the Xbox data
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
      throw new Error('Unable to parse Xbox profile data.');
    }

    if (!xuid || !bedrockGamertag) {
      console.error(`Missing essential data - XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);
      throw new Error(`Incomplete Xbox profile data. XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);
    }

    console.log(`✅ Parsed data - XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);

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

    // Update profile
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
      message: 'Xbox account linked successfully!',
      bedrock_gamertag: bedrockGamertag,
    });

  } catch (error) {
    console.error('❌ Error in link-bedrock function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
