import { createClient } from '@supabase/supabase-js';

// 1. Initialize the ADMIN client (God Mode) for database updates
// This uses the service role key to bypass RLS for the final update.
const supabaseAdmin = createClient(
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

    // 2. Initialize a separate, USER-LEVEL client to verify the token
    // This uses the public ANON key, which is safe and ensures correct user identification.
    const supabaseUserClient = createClient(
        process.env.SUPABASE_URL, 
        process.env.SUPABASE_ANON_KEY
    );

    // 3. Authenticate the MCHub user with the USER-LEVEL client
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser(mchub_token);

    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return res.status(401).json({ details: 'Invalid or expired MCHub user token. Please sign in again.' });
    }
    // Now, `user.id` is GUARANTEED to be the ID of the person making the request

    // 4. Use the OpenXBL token to get the user's account info (unchanged)
    const accountResponse = await fetch('https://xbl.io/api/v2/account', {
      headers: {
        'X-Authorization': process.env.OPENXBL_API_KEY,
        'Authorization': `XBL3.0 x=${xbl_token}`,
        'Accept': 'application/json',
        'x-contract-version': '5'
      }
    });

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error('OpenXBL API error:', accountResponse.status, errorText);
      throw new Error(`Failed to fetch Xbox Live profile. Please try again.`);
    }
    
    const accountData = await accountResponse.json();
    const profileUser = accountData.profileUsers?.[0];
    if (!profileUser) {
      throw new Error('No Xbox Live profile found for this user.');
    }

    const xuid = profileUser.id;
    const bedrockGamertag = profileUser.settings?.find(s => s.id === 'Gamertag')?.value;
    const bedrockGamepicUrl = profileUser.settings?.find(s => s.id === 'GameDisplayPicRaw')?.value;

    if (!xuid || !bedrockGamertag) {
      throw new Error('Could not retrieve essential profile data (XUID or Gamertag).');
    }

    // 5. Check if this Xbox account is already linked to a DIFFERENT user
    // FIXED: Only check for OTHER users, not the current user
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

    // 6. Update the user's profile in Supabase using the ADMIN client
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

    // 7. Return success
    res.status(200).json({
      message: 'Bedrock account linked successfully!',
      bedrock_gamertag: bedrockGamertag,
    });

  } catch (error) {
    console.error('Error in link-bedrock function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
