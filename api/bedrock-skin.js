No longer needed as we are not generating a skin
// import { createCanvas } from '@napi-rs/canvas';

/**
 * Helper function to fetch an image from a URL and return its buffer and content type.
 * @param {string} url The URL of the image to fetch.
 * @returns {Promise<{buffer: Buffer, contentType: string}|null>}
 */
async function fetchTextureFromUrl(url) {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'MCHub-BedrockSkinFetcher/3.0' }
        });
        if (!response.ok) {
            return null;
        }
        const buffer = await response.arrayBuffer();
        return {
            buffer: Buffer.from(buffer),
            contentType: response.headers.get('content-type') || 'image/png'
        };
    } catch (error) {
        console.error(`[Texture Fetch] Error downloading from ${url}:`, error.message);
        return null;
    }
}


// api/bedrock-skin.js
// Get Bedrock skins DIRECTLY from GeyserMC skin endpoint - THE RIGHT WAY! 🔥
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { xuid, gamertag } = req.query; // Added gamertag for future fallbacks
        if (!xuid) {
            return res.status(400).json({ error: 'XUID is required' });
        }

        console.log(`[bedrock-skin] Getting REAL Bedrock skin for XUID: ${xuid} directly from GeyserMC! 🚀`);

        // Use the DIRECT GeyserMC skin endpoint - no Java UUID needed!
        const skinData = await getBedrockSkinDirect(xuid);
        
        if (skinData && skinData.buffer && skinData.buffer.length > 0) {
            console.log(`[bedrock-skin] SUCCESS! Got that fire skin from GeyserMC: ${skinData.buffer.length} bytes 🎨`);
            res.setHeader('Content-Type', skinData.contentType || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(skinData.buffer);
        } else {
            // --- MODIFIED PART ---
            // If the custom skin isn't found, fetch the Steve skin from your Supabase URL.
            console.warn(`[bedrock-skin] GeyserMC API call failed for ${xuid}. Serving default Steve skin.`);
            const steveSkinUrl = "https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/steve.png";
            const steveSkinData = await fetchTextureFromUrl(steveSkinUrl);

            if (steveSkinData && steveSkinData.buffer) {
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=86400'); // Steve can be cached
                res.setHeader('Access-Control-Allow-Origin', '*');
                return res.send(steveSkinData.buffer);
            } else {
                // This is a final failsafe if Supabase is down or the URL is wrong.
                console.error('[Handler] CRITICAL: Could not fetch default Steve skin from Supabase.');
                return res.status(500).json({ error: 'Could not load default skin.' });
            }
        }

    } catch (error) {
        console.error('[bedrock-skin] ERROR:', error);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Access-Control-Allow-Origin', '*');
        // Attempt to send Steve skin even on error
        const steveSkinUrl = "https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/steve.png";
        const steveSkinData = await fetchTextureFromUrl(steveSkinUrl);
        if (steveSkinData && steveSkinData.buffer) {
            return res.status(500).send(steveSkinData.buffer);
        }
        return res.status(500).send('Error processing request.');
    }
}

/**
 * Get Bedrock skin DIRECTLY from GeyserMC API - the GOAT method! 🐐
 * This hits the direct skin endpoint that gets skins from Bedrock Geyser servers
 */
async function getBedrockSkinDirect(xuid) {
    try {
        console.log(`[GeyserMC Direct] Hitting the direct skin endpoint for XUID: ${xuid}`);
        
        const response = await fetch(`https://api.geysermc.org/v2/skin/${xuid}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'MCHub-BedrockSkinFetcher/2.0'
            }
        });
        
        console.log(`[GeyserMC Direct] Response status: ${response.status}`);
        
        if (!response.ok) {
            console.log(`[GeyserMC Direct] API response not OK: ${response.status} ${response.statusText}`);
            return null;
        }
        
        const skinData = await response.json();
        console.log(`[GeyserMC Direct] Got response data:`, {
            hasValue: !!skinData.value,
            hasTextureId: !!skinData.texture_id,
            isSteve: skinData.is_steve
        });
        
        // Try to decode the value field first, as it's most common
        if (skinData.value) {
            console.log(`[GeyserMC Direct] Trying to decode value field...`);
            try {
                const decodedData = JSON.parse(Buffer.from(skinData.value, 'base64').toString());
                const skinUrl = decodedData.textures?.SKIN?.url;
                
                if (skinUrl) {
                    console.log(`[GeyserMC Direct] Found skin URL in value field.`);
                    return await fetchTextureFromUrl(skinUrl);
                }
            } catch (decodeError) {
                console.log(`[GeyserMC Direct] Failed to decode value field:`, decodeError.message);
            }
        }
        
        // Fallback: try texture_id if value didn't work or was absent
        if (skinData.texture_id) {
            console.log(`[GeyserMC Direct] Trying texture_id: ${skinData.texture_id}`);
            const textureUrl = `https://textures.minecraft.net/texture/${skinData.texture_id}`;
            return await fetchTextureFromUrl(textureUrl);
        }
        
        console.log(`[GeyserMC Direct] No usable skin data found in response.`);
        return null;

    } catch (error) {
        console.error('[getBedrockSkinDirect] Error:', error.message);
        return null;
    }
}

