async function fetchTextureFromUrl(url) {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'MCHub-BedrockSkinFetcher/4.0' } // Updated user agent
        });
        if (!response.ok) {
            console.error(`[Texture Fetch] Failed: ${response.status} from ${url}`);
            return null;
        }
        const buffer = await response.arrayBuffer();
        return {
            buffer: Buffer.from(buffer),
            contentType: response.headers.get('content-type') || 'image/png'
        };
    } catch (error) {
        console.error(`[Texture Fetch] Critical error downloading from ${url}:`, error.message);
        return null;
    }
}

/**
 * Fetches a player's custom skin from the GeyserMC API.
 * This function is responsible for finding a user's unique skin.
 * @param {string} xuid The player's Xbox User ID.
 * @returns {Promise<{buffer: Buffer, contentType: string}|null>}
 */
async function getPlayerSkin(xuid) {
    try {
        const geyserApiUrl = `https://api.geysermc.org/v2/skin/${xuid}`;
        console.log(`[Player Skin] Attempting to fetch from GeyserMC: ${geyserApiUrl}`);
        
        const response = await fetch(geyserApiUrl);
        if (!response.ok) {
            return null; // Don't log an error, it's common for users not to be in the DB
        }
        
        const skinData = await response.json();
        
        // The 'value' field is the most reliable source for the skin URL
        if (skinData.value) {
            try {
                const decoded = JSON.parse(Buffer.from(skinData.value, 'base64').toString());
                const skinUrl = decoded?.textures?.SKIN?.url;
                if (skinUrl) {
                    console.log(`[Player Skin] Found skin URL in 'value' field.`);
                    return await fetchTextureFromUrl(skinUrl);
                }
            } catch (e) {
                 console.warn(`[Player Skin] Could not parse 'value' field.`);
            }
        }
        
        // Fallback to trying the texture_id if 'value' fails
        if (skinData.texture_id) {
            const textureUrl = `https://textures.minecraft.net/texture/${skinData.texture_id}`;
            console.log(`[Player Skin] Fallback: Trying texture_id: ${skinData.texture_id}`);
            return await fetchTextureFromUrl(textureUrl);
        }

        return null;

    } catch (error) {
        console.error('[Player Skin] Error during GeyserMC fetch:', error.message);
        return null;
    }
}

/**
 * The main API handler that orchestrates the skin fetching process.
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { xuid } = req.query;
        if (!xuid) {
            return res.status(400).json({ error: 'XUID is required' });
        }

        // Step 1: Attempt to get the player's unique custom skin.
        const skinData = await getPlayerSkin(xuid);
        
        if (skinData && skinData.buffer) {
            // If we found a custom skin, send it.
            console.log(`[Handler] SUCCESS: Sending custom skin for ${xuid}.`);
            res.setHeader('Content-Type', skinData.contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(skinData.buffer);
        } else {
            // Step 2: If no custom skin was found, serve the default Steve skin as a fallback.
            console.warn(`[Handler] FALLBACK: Custom skin not found for ${xuid}. Serving default Steve skin.`);
            const steveSkinUrl = "https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/steve.png";
            const steveSkinData = await fetchTextureFromUrl(steveSkinUrl);

            if (steveSkinData && steveSkinData.buffer) {
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=86400');
                res.setHeader('Access-Control-Allow-Origin', '*');
                return res.send(steveSkinData.buffer);
            } else {
                // Failsafe if the Steve skin itself can't be fetched.
                console.error('[Handler] CRITICAL: Could not fetch default Steve skin from Supabase.');
                return res.status(500).json({ error: 'Could not load default skin.' });
            }
        }

    } catch (error) {
        console.error('[Handler] A critical error occurred:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
}

