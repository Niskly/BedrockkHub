// PASTE THIS INTO: /api/link-bedrock.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ details: 'Method Not Allowed' });
    }

    try {
        const { mchub_token, xbl_token } = req.body;

        if (!mchub_token || !xbl_token) {
            return res.status(400).json({ details: 'MCHub token and OpenXBL token are required.' });
        }

        // 1. Authenticate the MCHub user
        const { data: { user }, error: userError } = await supabase.auth.getUser(mchub_token);
        if (userError || !user) {
            console.error('User authentication failed:', userError);
            return res.status(401).json({ details: 'Invalid MCHub user token.' });
        }

        // 2. Use the user's OpenXBL access token to get their account info
        const accountResponse = await fetch('https://xbl.io/api/v2/account', {
            method: 'GET',
            headers: {
                // THIS IS THE CRITICAL FIX
                'Authorization': `Bearer ${xbl_token}`, // Use the USER's token to get THEIR data
                'X-Authorization': process.env.OPENXBL_API_KEY, // Your main API key for billing
                'Accept': 'application/json',
                'Accept-Language': 'en-US'
            }
        });

        if (!accountResponse.ok) {
            const errorText = await accountResponse.text();
            console.error('OpenXBL API error:', accountResponse.status, errorText);
            throw new Error(`Failed to fetch Xbox Live profile. Status: ${accountResponse.status}`);
        }

        const accountData = await accountResponse.json();
        const profileUser = accountData.profileUsers?.[0];

        if (!profileUser) {
            throw new Error('No Xbox Live profile found for this user.');
        }

        const xuid = profileUser.id;
        const bedrockGamertag = profileUser.settings?.find(s => s.id === 'Gamertag')?.value;
        const bedrockGamepicUrl = profileUser.settings?.find(s => s.id === 'GameDisplayPicRaw')?.value;

        if (!xuid || !bedrockGamertag) {
            throw new Error('Could not retrieve essential profile data (XUID or Gamertag).');
        }
        
        // (Optional but recommended) Check if this Xbox account is already linked
        const { data: existingLink } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('xuid', xuid)
          .neq('id', user.id)
          .single();

        if (existingLink) {
          throw new Error(`This Xbox account is already linked to another user: ${existingLink.username}`);
        }

        // 3. Update the user's profile in Supabase
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                xuid,
                bedrock_gamertag: bedrockGamertag,
                bedrock_gamerpic_url: bedrockGamepicUrl || null
            })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }

        // 4. Return success
        res.status(200).json({
            message: 'Bedrock account linked successfully!',
            bedrock_gamertag: bedrockGamertag
        });

    } catch (error) {
        console.error('Error in link-bedrock function:', error);
        res.status(500).json({
            details: error.message || 'An internal server error occurred.'
        });
    }
}
