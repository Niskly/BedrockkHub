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

    // FIXED: Use OpenXBL's claim endpoint instead of account endpoint
    // This processes the auth code and returns the AUTHENTICATED USER's data
    const claimResponse = await fetch('https://xbl.io/api/v2/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': process.env.OPENXBL_API_KEY
      },
      body: JSON.stringify({
        code: xbl_token,
        app_key: process.env.OPENXBL_PUBLIC_KEY
      })
    });

    if (!claimResponse.ok) {
      const errorText = await claimResponse.text();
      console.error('OpenXBL claim error:', claimResponse.status, errorText);
      throw new Error('Failed to verify Xbox Live authentication. Please try again.');
    }
    
    const xboxData = await claimResponse.json();
    
    // Extract user data from the claim response
    const xuid = xboxData.xuid;
    const bedrockGamertag = xboxData.gamertag;
    const bedrockGamepicUrl = xboxData.avatar;

    if (!xuid || !bedrockGamertag) {
      throw new Error('Could not retrieve essential profile data (XUID or Gamertag).');
    }

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
