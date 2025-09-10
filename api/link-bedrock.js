import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase admin client to perform elevated actions
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ details: 'Method Not Allowed' });
    }

    console.log("[link-bedrock] Function initiated.");

    try {
        const { mchub_token, xbl_token } = req.body;

        if (!mchub_token || !xbl_token) {
            console.error("[link-bedrock] Error: Missing required tokens in request body.");
            return res.status(400).json({ details: 'MCHub token and OpenXBL token are required.' });
        }
        console.log("[link-bedrock] Received tokens successfully.");

        // 1. Authenticate the MCHub user with their token
        const { data: { user }, error: userError } = await supabase.auth.getUser(mchub_token);
        if (userError || !user) {
            console.error('[link-bedrock] Supabase user authentication failed:', userError);
            return res.status(401).json({ details: 'Invalid MCHub user token.' });
        }
        console.log(`[link-bedrock] Supabase user authenticated: ${user.id}`);

        // 2. Use the user's OpenXBL access token to get their account info
        console.log("[link-bedrock] Fetching Xbox Live profile from xbl.io...");
        const accountResponse = await fetch('https://xbl.io/api/v2/account', {
            method: 'GET',
            headers: {
                // This is the user's unique access token, proving who they are.
                'Authorization': `Bearer ${xbl_token}`,
                // This is your app's main API key for billing and identification.
                // It is a DIFFERENT key than your public key or secret key.
                'X-Authorization': process.env.OPENXBL_API_KEY,
                'Accept': 'application/json',
                'Accept-Language': 'en-US'
            }
        });

        if (!accountResponse.ok) {
            const errorText = await accountResponse.text();
            console.error(`[link-bedrock] OpenXBL API error. Status: ${accountResponse.status}. Body: ${errorText}`);
            throw new Error(`Failed to fetch Xbox Live profile. The API returned status ${accountResponse.status}.`);
        }
        console.log("[link-bedrock] Successfully received profile from xbl.io.");

        const accountData = await accountResponse.json();
        const profileUser = accountData.profileUsers?.[0];

        if (!profileUser) {
            console.error("[link-bedrock] Error: No profile user found in xbl.io response.", accountData);
            throw new Error('No Xbox Live profile found for this user in the API response.');
        }

        // 3. Extract the necessary data from the response
        const xuid = profileUser.id;
        const bedrockGamertag = profileUser.settings?.find(s => s.id === 'Gamertag')?.value;
        const bedrockGamepicUrl = profileUser.settings?.find(s => s.id === 'GameDisplayPicRaw')?.value;

        if (!xuid || !bedrockGamertag) {
            console.error("[link-bedrock] Error: Could not find XUID or Gamertag in profile data.", profileUser.settings);
            throw new Error('Could not retrieve essential profile data (XUID or Gamertag).');
        }
        console.log(`[link-bedrock] Found Gamertag: ${bedrockGamertag} (XUID: ${xuid})`);

        // 4. Update the user's profile in your Supabase database
        console.log(`[link-bedrock] Updating profile for user ${user.id} in Supabase...`);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                xuid,
                bedrock_gamertag: bedrockGamertag,
                bedrock_gamerpic_url: bedrockGamepicUrl || null
            })
            .eq('id', user.id);

        if (updateError) {
            console.error("[link-bedrock] Supabase update error:", updateError);
            throw updateError;
        }
        console.log(`[link-bedrock] Profile for ${user.id} updated successfully.`);

        // 5. Return a success message
        return res.status(200).json({
            message: 'Bedrock account linked successfully!',
            bedrock_gamertag: bedrockGamertag
        });

    } catch (error) {
        console.error('[link-bedrock] A critical error occurred in the function:', error);
        return res.status(500).json({
            details: error.message || 'An internal server error occurred.'
        });
    }
}
