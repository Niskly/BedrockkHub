import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key for admin-level access from environment variables
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
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: No MCHub token provided' });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: 'Unauthorized: Invalid MCHub token' });

    // --- Step 2: Get the Microsoft Access Token from the client ---
    const { provider_token } = req.body;
    if (!provider_token) {
      return res.status(400).json({ error: 'Microsoft access token is required.' });
    }

    console.log('Starting Xbox Live authentication chain...');

    // --- Step 3a: Swap Microsoft Token for an Xbox Live (XBL) Token ---
    console.log('Step 1: Getting XBL token...');
    const xblResponse = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json' 
        },
        body: JSON.stringify({
            RelyingParty: 'http://auth.xboxlive.com',
            TokenType: 'JWT',
            Properties: {
                AuthMethod: 'RPS',
                SiteName: 'user.auth.xboxlive.com',
                RpsTicket: `d=${provider_token}` // 'd=' prefix is required for Microsoft tokens
            }
        })
    });

    if (!xblResponse.ok) {
      const errorText = await xblResponse.text();
      console.error('XBL Response Error:', errorText);
      throw new Error(`Failed to authenticate with Xbox Live. Status: ${xblResponse.status}`);
    }

    const xblData = await xblResponse.json();
    const xblToken = xblData.Token;
    console.log('XBL token obtained successfully');

    // --- Step 3b: Swap XBL Token for an Xbox Security Token (XSTS) ---
    console.log('Step 2: Getting XSTS token...');
    const xstsResponse = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json' 
        },
        body: JSON.stringify({
            RelyingParty: 'rp://api.minecraftservices.com/',
            TokenType: 'JWT',
            Properties: {
                SandboxId: 'RETAIL',
                UserTokens: [xblToken]
            }
        })
    });

    if (!xstsResponse.ok) {
      const errorText = await xstsResponse.text();
      console.error('XSTS Response Error:', errorText);
      
      // Handle specific XSTS errors
      if (xstsResponse.status === 401) {
        const errorData = JSON.parse(errorText);
        if (errorData.XErr === 2148916233) {
          throw new Error('This Microsoft account is not associated with an Xbox Live account. Please create an Xbox Live account first.');
        } else if (errorData.XErr === 2148916235) {
          throw new Error('Xbox Live is not available in your country/region.');
        } else if (errorData.XErr === 2148916236 || errorData.XErr === 2148916237) {
          throw new Error('This account needs adult verification on Xbox Live.');
        }
      }
      throw new Error(`Failed to get XSTS token. Status: ${xstsResponse.status}`);
    }

    const xstsData = await xstsResponse.json();
    const xstsToken = xstsData.Token;
    const userHash = xstsData.DisplayClaims.xui[0].uhs;
    console.log('XSTS token obtained successfully');

    // --- Step 3c: Swap XSTS Token for a Minecraft Access Token ---
    console.log('Step 3: Getting Minecraft access token...');
    const mcAuthResponse = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json' 
        },
        body: JSON.stringify({
            identityToken: `XBL3.0 x=${userHash};${xstsToken}`
        })
    });

    if (!mcAuthResponse.ok) {
      const errorText = await mcAuthResponse.text();
      console.error('Minecraft Auth Response Error:', errorText);
      throw new Error(`Failed to log in to Minecraft services. Status: ${mcAuthResponse.status}`);
    }

    const mcAuthData = await mcAuthResponse.json();
    const minecraftAccessToken = mcAuthData.access_token;
    console.log('Minecraft access token obtained successfully');
    
    // --- Step 4: Use the Final Minecraft Token to Get the User's Profile ---
    console.log('Step 4: Getting Minecraft profile...');
    const minecraftProfileResponse = await fetch('https://api.minecraftservices.com/minecraft/profile', {
      headers: { 'Authorization': `Bearer ${minecraftAccessToken}` }
    });

    if (!minecraftProfileResponse.ok) {
      if (minecraftProfileResponse.status === 404) {
        throw new Error('This Microsoft account does not own Minecraft. Please purchase Minecraft or use a different account.');
      }
      const errorText = await minecraftProfileResponse.text();
      console.error('Minecraft Profile Response Error:', errorText);
      throw new Error(`Failed to fetch Minecraft profile. Status: ${minecraftProfileResponse.status}`);
    }

    const minecraftProfile = await minecraftProfileResponse.json();
    const minecraft_uuid = minecraftProfile.id;
    const minecraft_username = minecraftProfile.name;
    console.log(`Successfully retrieved Minecraft profile: ${minecraft_username} (${minecraft_uuid})`);

    // --- Step 5: Check if this Minecraft account is already linked to another user ---
    const { data: existingLink } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('minecraft_uuid', minecraft_uuid)
      .neq('id', user.id)
      .single();

    if (existingLink) {
      throw new Error(`This Minecraft account is already linked to another MCHub user: ${existingLink.username}`);
    }

    // --- Step 6: Save the Minecraft Info to the MCHub Profile ---
    console.log('Step 5: Saving to database...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ minecraft_uuid, minecraft_username })
      .eq('id', user.id);

    if (updateError) {
      console.error('Database Update Error:', updateError);
      throw updateError;
    }

    console.log('Minecraft account linked successfully!');
    res.status(200).json({ 
      message: 'Minecraft account linked successfully!', 
      minecraft_username,
      minecraft_uuid 
    });

  } catch (error) {
    console.error('Error in link-minecraft function:', error.message);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message.includes('authenticate with Xbox Live')) {
      errorMessage = 'Failed to connect to Xbox Live. Please ensure your Microsoft account has Xbox Live access.';
    } else if (error.message.includes('XSTS token')) {
      errorMessage = 'Xbox Live authentication failed. This might be due to account restrictions or regional limitations.';
    } else if (error.message.includes('Minecraft services')) {
      errorMessage = 'Failed to connect to Minecraft services. Please try again later.';
    }
    
    res.status(500).json({ 
      error: 'Failed to link Minecraft account', 
      details: errorMessage 
    });
  }
}
