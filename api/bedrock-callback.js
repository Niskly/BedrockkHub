// PASTE THIS INTO: /api/bedrock-skin.js

import { createCanvas } from '@napi-rs/canvas';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { xuid } = req.query;
        if (!xuid) {
            return res.status(400).json({ error: 'XUID is required' });
        }

        console.log(`[bedrock-skin] Attempting to fetch skin for XUID: ${xuid}`);

        const skinData = await getBedrockSkin(xuid);
        
        if (skinData && skinData.buffer) {
            console.log(`[bedrock-skin] Successfully fetched skin (${skinData.buffer.length} bytes). Sending image.`);
            res.setHeader('Content-Type', skinData.contentType || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            return res.send(skinData.buffer);
        } else {
            console.warn(`[bedrock-skin] Could not retrieve a valid skin for ${xuid}. Generating a placeholder.`);
            const defaultSkinBuffer = generatePlaceholderSkin(xuid);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache placeholders for 1 hour
            return res.send(defaultSkinBuffer);
        }

    } catch (error) {
        console.error('[bedrock-skin] A critical error occurred:', error.message);
        const errorSkinBuffer = generatePlaceholderSkin("error");
        res.setHeader('Content-Type', 'image/png');
        res.status(500).send(errorSkinBuffer);
    }
}

/**
 * Fetches the Bedrock skin texture from the GeyserMC API.
 * It intelligently checks multiple data points in the API response.
 * @param {string} xuid The Xbox User ID.
 * @returns {Promise<{buffer: Buffer, contentType: string}|null>}
 */
async function getBedrockSkin(xuid) {
    try {
        const geyserApiUrl = `https://api.geysermc.org/v2/skin/${xuid}`;
        console.log(`[Geyser API] Fetching from: ${geyserApiUrl}`);
        
        const response = await fetch(geyserApiUrl, {
            headers: { 'User-Agent': 'MCHub/1.0' }
        });
        
        if (!response.ok) {
            console.error(`[Geyser API] Failed response: ${response.status} ${response.statusText}`);
            return null;
        }
        
        const data = await response.json();
        console.log('[Geyser API] Received data:', JSON.stringify(data));
        
        // Geyser might return a `value` field which is a Base64 encoded JSON
        if (data.value) {
            try {
                const decoded = JSON.parse(Buffer.from(data.value, 'base64').toString());
                const skinUrl = decoded?.textures?.SKIN?.url;
                if (skinUrl) {
                    console.log(`[Texture Fetch] Found skin URL in 'value' field: ${skinUrl}`);
                    return await fetchTextureFromUrl(skinUrl);
                }
            } catch (e) {
                console.warn("[Geyser API] Failed to parse base64 'value' field.", e.message);
            }
        }
        
        // Fallback to trying the `texture_id`
        if (data.texture_id) {
            const textureUrl = `https://textures.minecraft.net/texture/${data.texture_id}`;
            console.log(`[Texture Fetch] Found 'texture_id', trying URL: ${textureUrl}`);
            return await fetchTextureFromUrl(textureUrl);
        }
        
        console.warn('[Geyser API] No usable skin URL or texture ID found in the response.');
        return null;

    } catch (error) {
        console.error('[getBedrockSkin] Error fetching or processing skin:', error.message);
        return null;
    }
}

/**
 * Downloads the skin image from a given URL.
 * @param {string} url The URL of the skin texture.
 * @returns {Promise<{buffer: Buffer, contentType: string}|null>}
 */
async function fetchTextureFromUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[Texture Fetch] Failed to download texture: ${response.status}`);
            return null;
        }
        const buffer = await response.arrayBuffer();
        return {
            buffer: Buffer.from(buffer),
            contentType: response.headers.get('content-type')
        };
    } catch (error) {
        console.error(`[Texture Fetch] Error downloading texture from URL: ${url}`, error.message);
        return null;
    }
}

/**
 * Generates a consistent, colored placeholder skin based on the XUID.
 * This is the function creating the "weird" skin you see.
 * @param {string} xuid The Xbox User ID to seed the colors.
 * @returns {Buffer} A PNG image buffer.
 */
function generatePlaceholderSkin(xuid) {
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext('2d');
    
    let hash = 0;
    for (let i = 0; i < xuid.length; i++) {
        hash = xuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    const skinTone = `hsl(${25 + (hash % 20)}, 55%, 60%)`;
    const shirtColor = `hsl(${hue}, 65%, 40%)`;
    const pantsColor = `hsl(${(hue + 180) % 360}, 50%, 30%)`;

    // Draw basic skin layout
    ctx.fillStyle = skinTone;
    ctx.fillRect(8, 8, 8, 8);   // Head
    ctx.fillRect(20, 20, 8, 12); // Body
    ctx.fillRect(44, 20, 4, 12); // Right arm
    ctx.fillRect(36, 52, 4, 12); // Left arm overlay (for 3D effect)
    ctx.fillRect(4, 20, 4, 12);  // Right leg
    ctx.fillRect(20, 52, 4, 12); // Left leg overlay (for 3D effect)
    
    // Shirt
    ctx.fillStyle = shirtColor;
    ctx.fillRect(20, 20, 8, 12); // Body
    ctx.fillRect(44, 20, 4, 12); // Right arm
    ctx.fillRect(36, 52, 4, 12); // Left arm overlay

    // Pants
    ctx.fillStyle = pantsColor;
    ctx.fillRect(4, 20, 4, 12); // Right leg
    ctx.fillRect(20, 52, 4, 12); // Left leg overlay

    console.log(`[Placeholder] Generated skin for ${xuid}`);
    return canvas.toBuffer('image/png');
}
