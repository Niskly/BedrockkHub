import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase admin client to perform elevated actions
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// This function handles the entire authentication flow with Xbox Live and Minecraft services
async function getMinecraftProfile(provider_token) {
    try {
        // 1. Authenticate with Xbox Live using the provider token from Supabase
        const xblResponse = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${provider_token}` },
                RelyingParty: 'http://auth.xboxlive.com',
                TokenType: 'JWT'
            })
        });
        if (!xblResponse.ok) throw new Error(`Xbox Live auth failed: ${await xblResponse.text()}`);
        const xblData = await xblResponse.json();
        const userHash = xblData.DisplayClaims.xui[0].uhs;
        const xblToken = xblData.Token;

        // 2. Use the XBL token to get an XSTS token for Minecraft services
        const xstsResponse = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken] },
                RelyingParty: 'rp://api.minecraftservices.com/',
                TokenType: 'JWT'
            })
        });
        if (!xstsResponse.ok) throw new Error(`XSTS auth failed: ${await xstsResponse.text()}`);
        const xstsData = await xstsResponse.json();
        const xstsToken = xstsData.Token;

        // 3. Use the XSTS token to log into Minecraft and get an access token
        const mcLoginResponse = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ identityToken: `XBL3.0 x=${userHash};${xstsToken}` })
        });
        if (!mcLoginResponse.ok) throw new Error(`Minecraft login failed: ${await mcLoginResponse.text()}`);
        const mcLoginData = await mcLoginResponse.json();
        const mcAccessToken = mcLoginData.access_token;

        // 4. Use the Minecraft access token to fetch the user's profile
        const mcProfileResponse = await fetch('https://api.minecraftservices.com/minecraft/profile', {
            headers: { 'Authorization': `Bearer ${mcAccessToken}` }
        });
        if (!mcProfileResponse.ok) throw new Error(`Minecraft profile fetch failed: ${await mcProfileResponse.text()}`);
        const mcProfileData = await mcProfileResponse.json();
        
        // Return the essential data
        return {
            java_username: mcProfileData.name,
            java_uuid: mcProfileData.id
        };
    } catch (error) {
        console.error('Error during Minecraft profile fetch:', error.message);
        throw error;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ details: 'Method Not Allowed' });
    }

    try {
        const { mchub_token, provider_token } = req.body;
        if (!mchub_token || !provider_token) {
            return res.status(400).json({ details: 'MCHub token and provider token are required.' });
        }

        // 1. Authenticate the MCHub user
        const { data: { user }, error: userError } = await supabase.auth.getUser(mchub_token);
        if (userError || !user) {
            return res.status(401).json({ details: 'Invalid MCHub user token.' });
        }

        // 2. Get the Minecraft Java profile using the secure flow
        const minecraftProfile = await getMinecraftProfile(provider_token);
        if (!minecraftProfile.java_username || !minecraftProfile.java_uuid) {
            throw new Error('Could not retrieve Minecraft profile details from Microsoft.');
        }

        // 3. Check if the Java account is already linked to another user
        const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('java_uuid', minecraftProfile.java_uuid)
            .neq('id', user.id)
            .single();
        if (checkError && checkError.code !== 'PGRST116') throw checkError;
        if (existingUser) {
            throw new Error(`This Minecraft account is already linked to another user: ${existingUser.username}`);
        }

        // 4. Update the user's profile in Supabase
        const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
                java_username: minecraftProfile.java_username,
                java_uuid: minecraftProfile.java_uuid
            })
            .eq('id', user.id)
            .select()
            .single();

        if (updateError) throw updateError;

        // 5. Return a success response
        return res.status(200).json({
            message: 'Java account linked successfully!',
            java_username: updatedProfile.java_username,
        });

    } catch (error) {
        console.error('[link-java] Critical error:', error);
        return res.status(500).json({
            details: error.message || 'An internal server error occurred.'
        });
    }
}
