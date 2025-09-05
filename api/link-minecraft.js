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

    // --- Step 3a: Exchange Microsoft OAuth token for Xbox Live token ---
    // IMPORTANT: We need to use the Microsoft Graph token to get user info first,
    // then use a different flow for Xbox authentication
    
    console.log('Step 1: Getting XBL token...');
    const xblResponse = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
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
                RpsTicket: `d=${provider_token}` // The 'd=' prefix is REQUIRED
            }
        })
    });

    if (!xblResponse.ok) {
      const errorText = await xblResponse.text();
      console.error('XBL Response Status:', xblResponse.status);
      console.error('XBL Response:', errorText);
      
      // Check if it's an invalid token error
      if (xblResponse.status === 400) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.XErr === 2148916233) {
            throw new Error('This Microsoft account does not have an Xbox profile. Please create an Xbox profile at xbox.com first.');
          } else if (errorData.XErr === 2148916235) {
            throw new Error('Xbox Live is not available in your country/region.');
          }
        } catch (e) {
          // If we can't parse the error, continue with generic message
        }
        throw new Error('The Microsoft token is not valid for Xbox Live authentication. Please ensure you are using a personal Microsoft account (not work/school) that has Xbox Live enabled.');
      }
      
      throw new Error(`Failed to authenticate with Xbox Live. Status: ${xblResponse.status}. Please ensure your Microsoft account has Xbox Live access.`);
    }

    const xblData = await xblResponse.json();
    const xblToken = xblData.Token;
    const userHash = xblData.DisplayClaims?.xui?.[0]?.uhs;
    
    if (!xblToken || !userHash) {
      console.error('Invalid XBL response structure:', xblData);
      throw new Error('Failed to get Xbox Live token. Invalid response from Xbox Live service.');
    }
    
    console.log('XBL token obtained successfully');

    // --- Step 3b: Get XSTS token ---
    console.log('Step 2: Getting XSTS token...');
    const xstsResponse = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json',
          'x-xbl-contract-version': '1'
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
      console.error('XSTS Response Status:', xstsResponse.status);
      console.error('XSTS Response:', errorText);
      
      // Handle specific XSTS errors
      if (xstsResponse.status === 401) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.XErr === 2148916233) {
            throw new Error('This Microsoft account does not have an Xbox account. Please create an Xbox account at xbox.com first.');
          } else if (errorData.XErr === 2148916235) {
            throw new Error('Xbox Live is not available in your country/region.');
          } else if (errorData.XErr === 2148916236 || errorData.XErr === 2148916237) {
            throw new Error('This account needs adult verification on Xbox Live.');
          } else if (errorData.XErr === 2148916238) {
            throw new Error('This account is a child account and needs to be added to a family.');
          }
        } catch (e) {
          // If parsing fails, continue with generic error
        }
      }
      throw new Error(`Failed to get XSTS token. Status: ${xstsResponse.status}. This may indicate Xbox Live account issues.`);
    }

    const xstsData = await xstsResponse.json();
    const xstsToken = xstsData.Token;
    const xstsUserHash = xstsData.DisplayClaims?.xui?.[0]?.uhs;
    
    if (!xstsToken || !xstsUserHash) {
      console.error('Invalid XSTS response structure:', xstsData);
      throw new Error('Failed to get XSTS token. Invalid response from Xbox security service.');
    }
    
    console.log('XSTS token obtained successfully');

    // --- Step 3c: Get Minecraft access token ---
    console.log('Step 3: Getting Minecraft access token...');
    const mcAuthResponse = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json' 
        },
        body: JSON.stringify({
            identityToken: `XBL3.0 x=${xstsUserHash};${xstsToken}`
        })
    });

    if (!mcAuthResponse.ok) {
      const errorText = await mcAuthResponse.text();
      console.error('Minecraft Auth Response Status:', mcAuthResponse.status);
      console.error('Minecraft Auth Response:', errorText);
      throw new Error(`Failed to log in to Minecraft services. Status: ${mcAuthResponse.status}. Please ensure you have a valid Minecraft account.`);
    }

    const mcAuthData = await mcAuthResponse.json();
    const minecraftAccessToken = mcAuthData.access_token;
    
    if (!minecraftAccessToken) {
      console.error('Invalid Minecraft auth response:', mcAuthData);
      throw new Error('Failed to get Minecraft access token.');
    }
    
    console.log('Minecraft access token obtained successfully');
    
    // --- Step 4: Get Minecraft profile ---
    console.log('Step 4: Getting Minecraft profile...');
    const minecraftProfileResponse = await fetch('https://api.minecraftservices.com/minecraft/profile', {
      headers: { 
        'Authorization': `Bearer ${minecraftAccessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!minecraftProfileResponse.ok) {
      if (minecraftProfileResponse.status === 404) {
        throw new Error('This Microsoft account does not own Minecraft. Please purchase Minecraft or use a different account.');
      }
      const errorText = await minecraftProfileResponse.text();
      console.error('Minecraft Profile Response Status:', minecraftProfileResponse.status);
      console.error('Minecraft Profile Response:', errorText);
      throw new Error(`Failed to fetch Minecraft profile. Status: ${minecraftProfileResponse.status}`);
    }

    const minecraftProfile = await minecraftProfileResponse.json();
    const minecraft_uuid = minecraftProfile.id;
    const minecraft_username = minecraftProfile.name;
    
    if (!minecraft_uuid || !minecraft_username) {
      console.error('Invalid Minecraft profile response:', minecraftProfile);
      throw new Error('Failed to get Minecraft profile information.');
    }
    
    console.log(`Successfully retrieved Minecraft profile: ${minecraft_username} (${minecraft_uuid})`);

    // --- Step 5: Check if this Minecraft account is already linked ---
    const { data: existingLink } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('minecraft_uuid', minecraft_uuid)
      .neq('id', user.id)
      .single();

    if (existingLink) {
      throw new Error(`This Minecraft account is already linked to another MCHub user: ${existingLink.username}`);
    }

    // --- Step 6: Save to database ---
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
    
    // Provide user-friendly error messages
    let errorMessage = error.message;
    
    // Map technical errors to user-friendly messages
    if (error.message.includes('d=')) {
      errorMessage = 'Invalid authentication token format. Please try logging in again.';
    } else if (error.message.includes('Xbox Live')) {
      // Keep the original Xbox Live related messages as they are already user-friendly
    } else if (error.message.includes('Network') || error.message.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    }
    
    res.status(500).json({ 
      error: 'Failed to link Minecraft account', 
      details: errorMessage 
    });
  }
}
