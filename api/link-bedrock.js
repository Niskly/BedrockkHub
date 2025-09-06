import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ details: 'Method Not Allowed' });
  }

  try {
    console.log('Link-bedrock API called');
    const { mchub_token, xbl_token } = req.body;
    
    if (!mchub_token || !xbl_token) {
      console.log('Missing required tokens');
      return res.status(400).json({ details: 'MCHub token and OpenXBL token are required.' });
    }

    // 1. Authenticate the MCHub user
    console.log('Authenticating MCHub user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser(mchub_token);
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return res.status(401).json({ details: 'Invalid MCHub user token.' });
    }
    console.log('MCHub user authenticated:', user.id);

    // 2. Use the OpenXBL token to get the user's account info
    console.log('Fetching Xbox Live profile...');
    const accountResponse = await fetch('https://xbl.io/api/v2/account', {
      method: 'GET',
      headers: {
        'X-Authorization': process.env.OPENXBL_API_KEY,
        'X-Contract': '5',
        'Authorization': `XBL3.0 x=${xbl_token}`,
        'Accept': 'application/json'
      }
    });

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error('OpenXBL API error:', accountResponse.status, errorText);
      
      if (accountResponse.status === 401) {
        throw new Error('Xbox Live authentication expired. Please try linking again.');
      } else if (accountResponse.status === 403) {
        throw new Error('Xbox Live account access denied. Please check your privacy settings.');
      } else {
        throw new Error(`Failed to fetch Xbox Live profile. Status: ${accountResponse.status}`);
      }
    }
    
    const accountData = await accountResponse.json();
    console.log('OpenXBL response received, processing...');
    
    const profileUser = accountData.profileUsers?.[0];
    if (!profileUser) {
      console.error('No profile user found in response:', accountData);
      throw new Error('No Xbox Live profile found for this user.');
    }

    const xuid = profileUser.id;
    const bedrockGamertag = profileUser.settings?.find(s => s.id === 'Gamertag')?.value;
    const bedrockGamepicUrl = profileUser.settings?.find(s => s.id === 'GameDisplayPicRaw')?.value;

    console.log('Profile data extracted:', { xuid, bedrockGamertag });

    if (!xuid || !bedrockGamertag) {
      console.error('Missing essential profile data:', { xuid, bedrockGamertag });
      throw new Error('Could not retrieve essential profile data (XUID or Gamertag).');
    }

    // 3. Check if this Xbox account is already linked to another MCHub user
    console.log('Checking for existing links...');
    const { data: existingLink, error: linkCheckError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('xuid', xuid)
      .neq('id', user.id)
      .single();

    if (linkCheckError && linkCheckError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing links:', linkCheckError);
      throw new Error('Database error while checking existing links.');
    }

    if (existingLink) {
      console.log('Xbox account already linked to:', existingLink.username);
      throw new Error(`This Xbox account is already linked to another MCHub user: ${existingLink.username}`);
    }

    // 4. Update the user's profile in Supabase
    console.log('Updating user profile...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        xuid,
        bedrock_gamertag: bedrockGamertag,
        bedrock_gamerpic_url: bedrockGamepicUrl || null
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log('Profile updated successfully');

    // 5. Return success
    res.status(200).json({
      message: 'Bedrock account linked successfully!',
      bedrock_gamertag: bedrockGamertag,
      bedrock_gamerpic_url: bedrockGamepicUrl
    });

  } catch (error) {
    console.error('Error in link-bedrock function:', error);
    res.status(500).json({ 
      details: error.message || 'An internal server error occurred.',
      timestamp: new Date().toISOString()
    });
  }
}
