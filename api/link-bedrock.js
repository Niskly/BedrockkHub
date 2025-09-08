import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// These are the credentials from your Azure App Registration
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/bedrock-callback.html`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ details: 'Method Not Allowed' });
  }

  try {
    const { mchub_token, auth_code } = req.body;
    if (!mchub_token || !auth_code) {
      return res.status(400).json({ details: 'MCHub token and Auth Code are required.' });
    }

    // 1. Authenticate the MCHub user
    const supabaseUserClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser(mchub_token);
    if (userError || !user) {
      throw new Error('Invalid or expired MCHub user token.');
    }

    // --- The Three-Token Dance Begins ---

    // STEP 1: Exchange the Authorization Code for an OAuth Token (The ID Check)
    const tokenParams = new URLSearchParams({
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: auth_code,
      redirect_uri: REDIRECT_URI,
      scope: 'XboxLive.signin offline_access',
    });

    const oauthRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!oauthRes.ok) {
        const errorData = await oauthRes.json();
        console.error("OAuth Token Error:", errorData);
        throw new Error(`Failed to get OAuth token: ${errorData.error_description}`);
    }
    const oauthData = await oauthRes.json();
    const accessToken = oauthData.access_token;

    // STEP 2: Use the OAuth Token to get an Xbox Live User Token (The VIP Wristband)
    const userTokenRes = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-xbl-contract-version': '1'
        },
        body: JSON.stringify({
            RelyingParty: 'http://auth.xboxlive.com',
            TokenType: 'JWT',
            Properties: {
                AuthMethod: 'RPS',
                SiteName: 'user.auth.xboxlive.com',
                RpsTicket: `d=${accessToken}`
            }
        })
    });

    if (!userTokenRes.ok) {
        const errorData = await userTokenRes.json();
        console.error("User Token Error:", errorData);
        throw new Error('Failed to authenticate with Xbox Live.');
    }
    const userTokenData = await userTokenRes.json();
    const userToken = userTokenData.Token;

    // STEP 3: Use the User Token to get the final XSTS Token (The Drink Ticket)
    const xstsTokenRes = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-xbl-contract-version': '1'
        },
        body: JSON.stringify({
            RelyingParty: 'http://xboxlive.com',
            TokenType: 'JWT',
            Properties: {
                UserTokens: [userToken],
                SandboxId: 'RETAIL'
            }
        })
    });

    if (!xstsTokenRes.ok) {
        const errorData = await xstsTokenRes.json();
        console.error("XSTS Token Error:", errorData);
        // Check for child account error
        if (errorData.XErr === 2148916238) {
             throw new Error('Authentication failed. Child accounts are not supported.');
        }
        throw new Error('Failed to get final authorization token.');
    }
    const xstsTokenData = await xstsTokenRes.json();

    // --- Extract Profile Info from the final XSTS Token ---
    const displayClaims = xstsTokenData.DisplayClaims.xui[0];
    const xuid = displayClaims.xid;
    const bedrockGamertag = displayClaims.gtg;
    
    // We need one more call to get the gamerpic
    const xstsTokenForRequest = xstsTokenData.Token;
    const userHash = xstsTokenData.DisplayClaims.xui[0].uhs;
    
    const profileRes = await fetch(`https://profile.xboxlive.com/users/xuid(${xuid})/profile/settings?settings=GameDisplayPicRaw`, {
        headers: {
            'Authorization': `XBL 1.0 x=${userHash};${xstsTokenForRequest}`,
            'x-xbl-contract-version': '2',
            'Accept': 'application/json'
        }
    });

    let bedrockGamepicUrl = null;
    if (profileRes.ok) {
        const profileData = await profileRes.json();
        bedrockGamepicUrl = profileData.profileUsers?.[0]?.settings?.[0]?.value || null;
    }

    // --- Final Database Operations ---
    const { data: existingLinks } = await supabaseAdmin.from('profiles').select('id, username').eq('xuid', xuid);
    const otherUserLinks = existingLinks?.filter(link => link.id !== user.id) || [];
    if (otherUserLinks.length > 0) {
      throw new Error(`This Xbox account is already linked to user: ${otherUserLinks[0].username}`);
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ xuid, bedrock_gamertag: bedrockGamertag, bedrock_gamerpic_url: bedrockGamepicUrl })
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

