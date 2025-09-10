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
        console.log("[link-bedrock] Using token:", xbl_token.substring(0, 10) + '...');
        
        const accountResponse = await fetch('https://xbl.io/api/v2/account', {
            method: 'GET',
            headers: {
                'X-Authorization': xbl_token,
                'X-Contract': '100',
                'Accept': 'application/json',
                'Accept-Language': 'en-US'
            }
        });

        console.log('[link-bedrock] Account API response status:', accountResponse.status);
        console.log('[link-bedrock] Account API response headers:', Object.fromEntries(accountResponse.headers.entries()));

        if (!accountResponse.ok) {
            const errorText = await accountResponse.text();
            console.error(`[link-bedrock] OpenXBL API error. Status: ${accountResponse.status}. Body: ${errorText}`);
            
            // More specific error handling
            if (accountResponse.status === 401) {
                throw new Error('Xbox Live authentication failed. Please try linking your account again.');
            } else if (accountResponse.status === 429) {
                throw new Error('Rate limit exceeded. Please try again in a few minutes.');
            } else if (accountResponse.status === 403) {
                throw new Error('Access forbidden. Your Xbox profile may be set to private.');
            } else {
                throw new Error(`Xbox Live API error (${accountResponse.status}): ${errorText}`);
            }
        }

        const accountData = await accountResponse.json();
        console.log('[link-bedrock] Full account response:', JSON.stringify(accountData, null, 2));

        const profileUser = accountData.profileUsers?.[0];

        if (!profileUser) {
            console.error("[link-bedrock] Error: No profile user found in xbl.io response.", accountData);
            throw new Error('No Xbox Live profile found. Your profile may be private or you may not have Xbox Live Gold/Game Pass.');
        }

        // 3. Extract the necessary data from the response
        const xuid = profileUser.id;
        const bedrockGamertag = profileUser.settings?.find(s => s.id === 'Gamertag')?.value;
        const bedrockGamepicUrl = profileUser.settings?.find(s => s.id === 'GameDisplayPicRaw')?.value;

        console.log('[link-bedrock] Extracted profile data:', {
            xuid,
            bedrockGamertag,
            hasGamepic: !!bedrockGamepicUrl,
            allSettings: profileUser.settings?.map(s => ({ id: s.id, value: s.value }))
        });

        if (!xuid || !bedrockGamertag) {
            console.error("[link-bedrock] Error: Could not find XUID or Gamertag in profile data.", {
                xuid,
                bedrockGamertag,
                availableSettings: profileUser.settings?.map(s => s.id) || []
            });
            throw new Error('Could not retrieve Xbox Live gamertag. Your Xbox profile may be set to private or missing required information.');
        }

        console.log(`[link-bedrock] Found Gamertag: ${bedrockGamertag} (XUID: ${xuid})`);

        // 4. Check if this Xbox account is already linked to another MCHub user
        console.log('[link-bedrock] Checking for existing Xbox account links...');
        const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('xuid', xuid)
            .neq('id', user.id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('[link-bedrock] Error checking for existing Xbox link:', checkError);
            throw new Error('Database error while checking Xbox account linkage.');
        }

        if (existingUser) {
            console.error('[link-bedrock] Xbox account already linked to another user:', existingUser.username);
            throw new Error(`This Xbox account is already linked to another MCHub user: ${existingUser.username}`);
        }

        // 5. Update the user's profile in your Supabase database
        console.log(`[link-bedrock] Updating profile for user ${user.id} in Supabase...`);
        
        // Try both possible column names in case there's a mismatch
        const updateData = {
            xuid,
            bedrock_gamertag: bedrockGamertag,
            bedrock_gamer: bedrockGamertag, // Backup in case the column name is different
            bedrock_gamerpic_url: bedrockGamepicUrl || null
        };

        console.log('[link-bedrock] Update data:', updateData);

        const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error("[link-bedrock] Supabase update error:", updateError);
            throw new Error(`Failed to save Xbox account information: ${updateError.message}`);
        }
        
        console.log(`[link-bedrock] Profile updated successfully:`, updatedProfile);

        // 6. Verify the update worked
        const { data: verifyProfile, error: verifyError } = await supabase
            .from('profiles')
            .select('xuid, bedrock_gamertag, bedrock_gamerpic_url')
            .eq('id', user.id)
            .single();

        if (verifyError) {
            console.error("[link-bedrock] Verification error:", verifyError);
        } else {
            console.log("[link-bedrock] Verification - profile after update:", verifyProfile);
        }

        // 7. Return a success message
        return res.status(200).json({
            message: 'Xbox account linked successfully!',
            bedrock_gamertag: bedrockGamertag,
            xuid: xuid,
            profile_updated: updatedProfile
        });

    } catch (error) {
        console.error('[link-bedrock] Critical error occurred:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return res.status(500).json({
            details: error.message || 'An internal server error occurred.'
        });
    }
}
