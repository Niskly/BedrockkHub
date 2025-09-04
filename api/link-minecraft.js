import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key for admin-level access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- Step 1: Authenticate the MCHub User ---
    // Get the user's session from their browser token to make sure they're logged into our site
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: No MCHub token provided' });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: 'Unauthorized: Invalid MCHub token' });

    // --- Step 2: Begin the Token Chain with the Microsoft Token ---
    const { provider_token } = req.body;
    if (!provider_token) {
      return res.status(400).json({ error: 'Microsoft access token is required.' });
    }

    // --- Step 3a: Swap Microsoft Token for an Xbox Live (XBL) Token ---
    const xblResponse = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            RelyingParty: 'http://auth.xboxlive.com',
            TokenType: 'JWT',
            Properties: {
                AuthMethod: 'RPS',
                SiteName: 'user.auth.xboxlive.com',
                RpsTicket: `d=${provider_token}`
            }
        })
    });
    if (!xblResponse.ok) throw new Error('Failed to authenticate with Xbox Live.');
    const xblData = await xblResponse.json();
    const xblToken = xblData.Token;

    // --- Step 3b: Swap XBL Token for an Xbox Security Token (XSTS) ---
    const xstsResponse = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            RelyingParty: 'rp://api.minecraftservices.com/',
            TokenType: 'JWT',
            Properties: {
                SandboxId: 'RETAIL',
                UserTokens: [xblToken]
            }
        })
    });
    if (!xstsResponse.ok) throw new Error('Failed to get XSTS token.');
    const xstsData = await xstsResponse.json();
    const xstsToken = xstsData.Token;
    const userHash = xstsData.DisplayClaims.xui[0].uhs;

    // --- Step 3c: Swap XSTS Token for a Minecraft Access Token ---
    const mcAuthResponse = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            identityToken: `XBL3.0 x=${userHash};${xstsToken}`
        })
    });
    if (!mcAuthResponse.ok) throw new Error('Failed to log in to Minecraft services.');
    const mcAuthData = await mcAuthResponse.json();
    const minecraftAccessToken = mcAuthData.access_token;
    
    // --- Step 4: Use the Final Minecraft Token to Get the User's Profile ---
    const minecraftProfileResponse = await fetch('https://api.minecraftservices.com/minecraft/profile', {
      headers: { 'Authorization': `Bearer ${minecraftAccessToken}` }
    });

    if (!minecraftProfileResponse.ok) {
      throw new Error('Failed to fetch Minecraft profile. The Microsoft account may not own Minecraft.');
    }

    const minecraftProfile = await minecraftProfileResponse.json();
    const minecraft_uuid = minecraftProfile.id;
    const minecraft_username = minecraftProfile.name;

    // --- Step 5: Save the Minecraft Info to the MCHub Profile ---
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ minecraft_uuid, minecraft_username })
      .eq('id', user.id);

    if (updateError) throw updateError;

    res.status(200).json({ message: 'Minecraft account linked successfully!', minecraft_username });

  } catch (error) {
    console.error('Error in link-minecraft function:', error);
    res.status(500).json({ error: 'Failed to link Minecraft account', details: error.message });
  }
}
