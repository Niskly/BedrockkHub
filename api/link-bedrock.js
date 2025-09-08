import { createClient } from '@supabase/supabase-js';

// Initialize the ADMIN client for database updates
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// These are the details from your Azure App Registration
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || 'common'; // Use 'common' for multi-tenant apps
const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/bedrock-callback.html` : 'http://localhost:3000/bedrock-callback.html';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ details: 'Method Not Allowed' });
  }

  try {
    const { mchub_token, auth_code } = req.body;
    
    if (!mchub_token || !auth_code) {
      return res.status(400).json({ details: 'MCHub token and auth code are required.' });
    }

    // 1. Authenticate the MCHub user (unchanged)
    const supabaseUserClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser(mchub_token);
    if (userError || !user) {
      return res.status(401).json({ details: 'Invalid MCHub user token.' });
    }

    // 2. NEW: Exchange the authorization code for an access token directly from Microsoft
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        scope: 'XboxLive.signin offline_access',
        code: auth_code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
        console.error("Microsoft Token Exchange Error:", tokenData);
        throw new Error('Failed to get access token from Microsoft.');
    }
    const accessToken = tokenData.access_token;

    // 3. NEW: Use the access token to get the user's Xbox Live profile
    const profileResponse = await fetch('https://profile.xboxlive.com/users/me/profile/settings?settings=Gamertag,GameDisplayPicRaw', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-xbl-contract-version': '2',
            'Accept-Language': 'en-US'
        }
    });

    if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error("Xbox Profile Fetch Error:", errorText);
        throw new Error('Failed to fetch Xbox Live profile details.');
    }
    
    const profileData = await profileResponse.json();
    const xuid = profileData.profileUsers[0].id;
    const bedrockGamertag = profileData.profileUsers[0].settings.find(s => s.id === 'Gamertag')?.value;
    const bedrockGamepicUrl = profileData.profileUsers[0].settings.find(s => s.id === 'GameDisplayPicRaw')?.value;

    if (!xuid || !bedrockGamertag) {
      throw new Error('Could not retrieve essential profile data (XUID or Gamertag).');
    }

    // 4. Check for existing links and update the profile (unchanged logic)
    const { data: existingLinks, error: linkCheckError } = await supabaseAdmin.from('profiles').select('id, username').eq('xuid', xuid);
    if (linkCheckError) throw linkCheckError;

    const otherUserLinks = existingLinks?.filter(link => link.id !== user.id) || [];
    if (otherUserLinks.length > 0) {
      throw new Error(`This Xbox account is already linked to another MCHub user: ${otherUserLinks[0].username}`);
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ xuid, bedrock_gamertag: bedrockGamertag, bedrock_gamerpic_url: bedrockGamepicUrl || null })
      .eq('id', user.id);

    if (updateError) throw updateError;

    res.status(200).json({
      message: 'Bedrock account linked successfully!',
      bedrock_gamertag: bedrockGamertag,
    });

  } catch (error) {
    console.error('Error in link-bedrock function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}

