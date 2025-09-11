import { createCanvas } from '@napi-rs/canvas';

// api/bedrock-skin.js
// Simplified endpoint to fetch Bedrock skins, prioritizing GeyserMC.
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { xuid } = req.query;
        if (!xuid) {
            return res.status(400).json({ error: 'XUID is required' });
        }

        console.log(`[bedrock-skin] Fetching skin for XUID: ${xuid}`);

        // --- PRIMARY METHOD: GeyserMC API ---
        // This is the most reliable way to get the skin for a Bedrock player.
        const skinData = await getSkinFromGeyser(xuid);
        
        if (skinData) {
            console.log(`[bedrock-skin] Success: Found skin via GeyserMC for ${xuid}`);
            res.setHeader('Content-Type', skinData.contentType || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
            return res.send(skinData.buffer);
        } else {
            // --- FALLBACK METHOD: Generate a default skin ---
            // This runs only if the GeyserMC API fails or finds no skin.
            console.warn(`[bedrock-skin] Fallback: Could not find skin for ${xuid}, generating default.`);
            const defaultSkinBuffer = generateDefaultSkinBuffer(xuid);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache default for 24 hours
            return res.send(defaultSkinBuffer);
        }

    } catch (error) {
        console.error('[bedrock-skin] Critical Error:', error);
        // If anything breaks, send a default skin so the page doesn't show a broken image.
        const defaultSkinBuffer = generateDefaultSkinBuffer("error");
        res.setHeader('Content-Type', 'image/png');
        res.status(500).send(defaultSkinBuffer);
    }
}

/**
 * Fetches skin data from the GeyserMC API and Mojang sessionserver.
 * @param {string} xuid - The Xbox User ID.
 * @returns {Promise<{buffer: Buffer, contentType: string}|null>}
 */
async function getSkinFromGeyser(xuid) {
    try {
        // 1. Get the Java UUID from GeyserMC using the Bedrock XUID
        const geyserResponse = await fetch(`https://api.geysermc.org/v2/xbox/xuid/${xuid}`);
        if (!geyserResponse.ok) {
            console.log(`[Geyser API] Failed to get UUID for XUID ${xuid}. Status: ${geyserResponse.status}`);
            return null;
        }
        const geyserData = await geyserResponse.json();
        const javaUuid = geyserData.java_uuid;
        
        if (!javaUuid) {
            console.log(`[Geyser API] No Java UUID found for XUID ${xuid}.`);
            return null;
        }

        // 2. Use the Java UUID to get skin information from Mojang's session server
        const mojangResponse = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${javaUuid}`);
        if (!mojangResponse.ok) {
            console.log(`[Mojang API] Failed to get profile for UUID ${javaUuid}. Status: ${mojangResponse.status}`);
            return null;
        }
        const mojangData = await mojangResponse.json();

        // 3. Decode the base64 texture data to find the skin URL
        const textureProperty = mojangData.properties?.find(prop => prop.name === 'textures');
        if (!textureProperty) {
             console.log(`[Mojang API] No texture property found for UUID ${javaUuid}.`);
            return null;
        }

        const textureData = JSON.parse(Buffer.from(textureProperty.value, 'base64').toString());
        const skinUrl = textureData.textures?.SKIN?.url;

        if (!skinUrl) {
             console.log(`[Mojang API] No skin URL found for UUID ${javaUuid}.`);
            return null;
        }

        // 4. Download the skin image from the URL
        const skinResponse = await fetch(skinUrl);
        if (!skinResponse.ok) {
             console.log(`[Skin Download] Failed to download skin from ${skinUrl}. Status: ${skinResponse.status}`);
            return null;
        }
        
        const buffer = await skinResponse.arrayBuffer();
        return {
            buffer: Buffer.from(buffer),
            contentType: skinResponse.headers.get('content-type') || 'image/png'
        };

    } catch (error) {
        console.error('[getSkinFromGeyser] Error:', error.message);
        return null;
    }
}

/**
 * Generates a consistent, default skin based on the user's XUID.
 * @param {string} xuid - The Xbox User ID.
 * @returns {Buffer} - A PNG image buffer.
 */
function generateDefaultSkinBuffer(xuid) {
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext('2d');
    
    // Create a hash from XUID for consistent colors
    let hash = 0;
    for (let i = 0; i < xuid.length; i++) {
        hash = xuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    const skinTone = `hsl(${hue}, 50%, 65%)`;
    const shirtColor = `hsl(${(hue + 150) % 360}, 70%, 45%)`;
    const pantsColor = `hsl(${(hue + 210) % 360}, 60%, 30%)`;
    
    // Draw simple skin layout
    ctx.fillStyle = skinTone;
    ctx.fillRect(8, 8, 8, 8); // Head
    ctx.fillRect(44, 20, 4, 12); // Right Arm
    ctx.fillRect(16, 20, 4, 12); // Left Arm (mirrored)

    ctx.fillStyle = shirtColor;
    ctx.fillRect(20, 20, 8, 12); // Body

    ctx.fillStyle = pantsColor;
    ctx.fillRect(20, 32, 8, 12); // "Legs" part of body
    
    return canvas.toBuffer('image/png');
}

