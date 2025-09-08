// In your api/link-bedrock.js - Replace the entire authentication section:

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

    console.log('=== CLAIMING XBOX USER DATA ===');
    console.log('Authorization code received:', xbl_token.substring(0, 20) + '...');
    
    // This is the equivalent of PHP $auth->claim($code)
    // According to OpenXBL docs, we need to "claim" the code to get user data
    try {
      console.log('Claiming authorization code with OpenXBL...');
      
      const claimResponse = await fetch('https://xbl.io/api/v2/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Authorization': process.env.OPENXBL_API_KEY // Your private API key
        },
        body: JSON.stringify({
          code: xbl_token,
          public_key: process.env.OPENXBL_PUBLIC_KEY
        })
      });

      console.log('Claim response status:', claimResponse.status);
      const claimText = await claimResponse.text();
      console.log('Claim response body:', claimText);

      if (!claimResponse.ok) {
        throw new Error(`OpenXBL claim failed: ${claimResponse.status} - ${claimText}`);
      }

      const xboxData = JSON.parse(claimText);
      console.log('✅ Successfully claimed user data:', JSON.stringify(xboxData, null, 2));

      // Parse the claimed data - OpenXBL should return user profile directly
      let xuid, bedrockGamertag, bedrockGamepicUrl;

      // The claim response should contain the user's Xbox data directly
      if (xboxData.xuid && xboxData.gamertag) {
        // Direct format from claim
        xuid = xboxData.xuid;
        bedrockGamertag = xboxData.gamertag;
        bedrockGamepicUrl = xboxData.avatar;
        
      } else if (xboxData.profileUsers && xboxData.profileUsers.length > 0) {
        // Alternative format
        const profile = xboxData.profileUsers[0];
        xuid = profile.id;
        
        const gamertagSetting = profile.settings?.find(s => s.id === 'Gamertag');
        bedrockGamertag = gamertagSetting?.value;
        
        const picSetting = profile.settings?.find(s => s.id === 'GameDisplayPicRaw');
        bedrockGamepicUrl = picSetting?.value;
        
      } else {
        console.error('Unexpected claim response format:', xboxData);
        throw new Error('Unable to parse Xbox profile from OpenXBL claim response.');
      }

      if (!xuid || !bedrockGamertag) {
        console.error(`Missing essential data - XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);
        throw new Error(`Incomplete Xbox profile data received. XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);
      }

      console.log(`✅ Parsed Xbox data - XUID: ${xuid}, Gamertag: ${bedrockGamertag}`);

      // Check if this Xbox account is already linked to a different user
      const { data: existingLinks, error: linkCheckError } = await supabaseAdmin
        .from('profiles')
        .select('id, username')
        .eq('xuid', xuid);

      if (linkCheckError) {
        console.error('Database error while checking existing links:', linkCheckError);
        throw new Error('Database error while checking existing links.');
      }

      const otherUserLinks = existingLinks?.filter(link => link.id !== user.id) || [];

      if (otherUserLinks.length > 0) {
        const existingUser = otherUserLinks[0];
        throw new Error(`This Xbox account is already linked to another MCHub user: ${existingUser.username}`);
      }

      // Update the user's profile in Supabase
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

      // Return success
      res.status(200).json({
        message: 'Xbox account linked successfully!',
        bedrock_gamertag: bedrockGamertag,
      });

    } catch (error) {
      console.error('❌ OpenXBL claim error:', error);
      
      // Provide helpful error messages based on common issues
      if (error.message.includes('404')) {
        throw new Error('The authorization code has expired or is invalid. Please try linking your Xbox account again.');
      } else if (error.message.includes('401')) {
        throw new Error('OpenXBL API authentication failed. Please check your API keys.');
      } else if (error.message.includes('400')) {
        throw new Error('Invalid request to OpenXBL. The authorization code format may be incorrect.');
      } else {
        throw new Error(`Failed to claim Xbox profile: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error in link-bedrock function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
