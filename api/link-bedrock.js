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
    const { mchub_token, xbl_token } = req.body;
    if (!mchub_token || !xbl_token) {
      return res.status(400).json({ details: 'MCHub token and OpenXBL token are required.' });
    }

    // 1. Authenticate the MCHub user
    const { data: { user }, error: userError } = await supabase.auth.getUser(mchub_token);
    if (userError || !user) {
      return res.status(401).json({ details: 'Invalid MCHub user token.' });
    }

    // 2. Use the OpenXBL token to get the user's account info
    const accountResponse = await fetch('https://xbl.io/api/v2/account', {
      headers: {
        'X-Authorization': process.env.OPENXBL_API_KEY,
        'X-Contract': '5',
        'Authorization': `XBL3.0 x=${xbl_token}`
      }
    });

    if (!accountResponse.ok) {
      throw new Error('Failed to fetch Xbox Live profile from OpenXBL.');
    }
    const accountData = await accountResponse.json();
    const profileUser = accountData.profileUsers[0];

    if (!profileUser) {
      throw new Error('No Xbox Live profile found for this user.');
    }

    const xuid = profileUser.id;
    const bedrock_gamertag = profileUser.settings.find(s => s.id === 'Gamertag')?.value;
    const bedrock_gamerpic_url = profileUser.settings.find(s => s.id === 'GameDisplayPicRaw')?.value;

    if (!xuid || !bedrock_gamertag) {
        throw new Error('Could not retrieve essential profile data (XUID or Gamertag).');
    }

    // 3. Check if this Xbox account is already linked to another MCHub user
    const { data: existingLink } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('xuid', xuid)
      .neq('id', user.id)
      .single();

    if (existingLink) {
      throw new Error(`This Xbox account is already linked to another MCHub user: ${existingLink.username}`);
    }

    // 4. Update the user's profile in Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        xuid,
        bedrock_gamertag,
        bedrock_gamerpic_url
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    // 5. Return success
    res.status(200).json({
      message: 'Bedrock account linked successfully!',
      bedrock_gamertag,
      bedrock_gamerpic_url
    });

  } catch (error) {
    console.error('Error in link-bedrock function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
