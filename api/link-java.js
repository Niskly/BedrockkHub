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

    console.log("[link-java] Function initiated.");

    try {
        const { mchub_token, java_username } = req.body;

        if (!mchub_token || !java_username) {
            return res.status(400).json({ details: 'MCHub token and Java username are required.' });
        }

        // 1. Authenticate the MCHub user
        const { data: { user }, error: userError } = await supabase.auth.getUser(mchub_token);
        if (userError || !user) {
            return res.status(401).json({ details: 'Invalid MCHub user token.' });
        }
        console.log(`[link-java] Supabase user authenticated: ${user.id}`);

        // 2. Fetch UUID from Mojang API
        const mojangResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${java_username}`);
        if (!mojangResponse.ok) {
            if (mojangResponse.status === 204 || mojangResponse.status === 404) {
                 return res.status(404).json({ details: `Minecraft Java user '${java_username}' not found.` });
            }
            throw new Error(`Mojang API failed with status: ${mojangResponse.status}`);
        }

        const mojangData = await mojangResponse.json();
        const java_uuid = mojangData.id;

        if (!java_uuid) {
            throw new Error('Could not extract UUID from Mojang API response.');
        }
        console.log(`[link-java] Found UUID: ${java_uuid} for username: ${java_username}`);

        // 3. Check if this Java account is already linked to another MCHub user
        const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('java_uuid', java_uuid)
            .neq('id', user.id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found, which is good
            throw new Error('Database error while checking for existing Java link.');
        }

        if (existingUser) {
            throw new Error(`This Java account is already linked to MCHub user: ${existingUser.username}`);
        }

        // 4. Update the user's profile in Supabase
        const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ java_username: mojangData.name, java_uuid: java_uuid }) // Use the name from Mojang for correct casing
            .eq('id', user.id)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Failed to save Java account info: ${updateError.message}`);
        }
        
        console.log(`[link-java] Profile updated successfully for user ${user.id}`);

        // 5. Return a success message
        return res.status(200).json({
            message: 'Java account linked successfully!',
            java_username: updatedProfile.java_username,
            java_uuid: updatedProfile.java_uuid
        });

    } catch (error) {
        console.error('[link-java] Critical error:', error);
        return res.status(500).json({
            details: error.message || 'An internal server error occurred.'
        });
    }
}
