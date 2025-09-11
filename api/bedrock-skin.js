import { createCanvas } from '@napi-rs/canvas';

// api/bedrock-skin.js
// Get Bedrock skins ONLY from GeyserMC API - the real MVP! 💪
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { xuid } = req.query;
        if (!xuid) {
            return res.status(400).json({ error: 'XUID is required' });
        }

        console.log(`[bedrock-skin] Fetching REAL Bedrock skin for XUID: ${xuid} using GeyserMC 🔥`);

        // Only use GeyserMC - the GOAT for Bedrock skins
        const skinData = await getSkinFromGeyserMC(xuid);
        
        if (skinData) {
            console.log(`[bedrock-skin] SUCCESS: Found that fire skin via GeyserMC for ${xuid} 🎨`);
            res.setHeader('Content-Type', skinData.contentType || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(skinData.buffer);
        } else {
            // Generate a sick default skin if GeyserMC doesn't have it
            console.warn(`[bedrock-skin] GeyserMC doesn't have skin for ${xuid}, making a fresh one 🎭`);
            const defaultSkinBuffer = generateFireDefaultSkin(xuid);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache default for 24 hours
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(defaultSkinBuffer);
        }

    } catch (error) {
        console.error('[bedrock-skin] ERROR in the matrix:', error);
        const defaultSkinBuffer = generateFireDefaultSkin("error");
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(500).send(defaultSkinBuffer);
    }
}

/**
 * Get skin from GeyserMC API - THE ONLY WAY! 🚀
 * GeyserMC stores the actual Bedrock skins that players use on servers
 */
async function getSkinFromGeyserMC(xuid) {
    try {
        console.log(`[GeyserMC] Hitting up the GeyserMC API for XUID: ${xuid}`);
        
        // Step 1: Get the Java UUID from GeyserMC using Bedrock XUID
        const geyserResponse = await fetch(`https://api.geysermc.org/v2/xbox/xuid/${xuid}`, {
            headers: {
                'User-Agent': 'MCHub-BedrockSkinFetcher/1.0'
            }
        });
        
        if (!geyserResponse.ok) {
            console.log(`[GeyserMC] API said nah fam. Status: ${geyserResponse.status}`);
            return null;
        }
        
        const geyserData = await geyserResponse.json();
        console.log(`[GeyserMC] Response data:`, geyserData);
        
        const javaUuid = geyserData.java_uuid;
        
        if (!javaUuid) {
            console.log(`[GeyserMC] No Java UUID found for XUID ${xuid}. Player might not have linked accounts.`);
            return null;
        }

        console.log(`[GeyserMC] Found Java UUID: ${javaUuid} for XUID: ${xuid} 🎯`);

        // Step 2: Get the skin from Mojang's session server using the Java UUID
        const mojangResponse = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${javaUuid}`, {
            headers: {
                'User-Agent': 'MCHub-BedrockSkinFetcher/1.0'
            }
        });
        
        if (!mojangResponse.ok) {
            console.log(`[Mojang API] Failed to get profile for UUID ${javaUuid}. Status: ${mojangResponse.status}`);
            return null;
        }
        
        const mojangData = await mojangResponse.json();
        console.log(`[Mojang API] Got profile data for ${mojangData.name || 'unknown'}`);

        // Step 3: Decode the base64 texture data to find the skin URL
        const textureProperty = mojangData.properties?.find(prop => prop.name === 'textures');
        if (!textureProperty) {
            console.log(`[Mojang API] No texture property found for UUID ${javaUuid}`);
            return null;
        }

        const textureData = JSON.parse(Buffer.from(textureProperty.value, 'base64').toString());
        const skinUrl = textureData.textures?.SKIN?.url;

        if (!skinUrl) {
            console.log(`[Mojang API] No skin URL found in texture data for UUID ${javaUuid}`);
            return null;
        }

        console.log(`[Mojang API] Found skin URL: ${skinUrl.substring(0, 50)}...`);

        // Step 4: Download the actual skin image - this is the REAL DEAL! 🔥
        const skinResponse = await fetch(skinUrl, {
            headers: {
                'User-Agent': 'MCHub-BedrockSkinFetcher/1.0'
            }
        });
        
        if (!skinResponse.ok) {
            console.log(`[Skin Download] Failed to download skin from ${skinUrl}. Status: ${skinResponse.status}`);
            return null;
        }
        
        const buffer = await skinResponse.arrayBuffer();
        console.log(`[Skin Download] Successfully downloaded skin! Size: ${buffer.byteLength} bytes 💾`);
        
        return {
            buffer: Buffer.from(buffer),
            contentType: skinResponse.headers.get('content-type') || 'image/png'
        };

    } catch (error) {
        console.error('[getSkinFromGeyserMC] Bruh something went wrong:', error.message);
        return null;
    }
}

/**
 * Generate a fire default skin when GeyserMC doesn't have the player's skin
 * This makes a unique skin based on their XUID so it's always the same for them
 */
function generateFireDefaultSkin(xuid) {
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext('2d');
    
    // Create a consistent hash from XUID for same colors every time
    let hash = 0;
    for (let i = 0; i < xuid.length; i++) {
        hash = xuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate some fire colors based on the hash
    const hue = Math.abs(hash) % 360;
    const skinTone = `hsl(${30 + (hash % 40)}, 50%, 65%)`; // Skin tone range
    const shirtColor = `hsl(${hue}, 70%, 45%)`;
    const pantsColor = `hsl(${(hue + 180) % 360}, 60%, 35%)`;
    const shoeColor = `hsl(${(hue + 90) % 360}, 40%, 25%)`;
    
    // Clear canvas with transparency
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, 64, 64);
    
    // Draw the Minecraft skin layout (64x64 format)
    
    // HEAD (front face)
    ctx.fillStyle = skinTone;
    ctx.fillRect(8, 8, 8, 8);   // Head front
    
    // BODY
    ctx.fillStyle = skinTone;
    ctx.fillRect(20, 20, 8, 12); // Body front
    
    // ARMS
    ctx.fillStyle = skinTone;
    ctx.fillRect(44, 20, 4, 12); // Right arm front
    ctx.fillRect(36, 20, 4, 12); // Left arm front
    
    // LEGS
    ctx.fillStyle = skinTone;
    ctx.fillRect(4, 20, 4, 12);  // Right leg front
    ctx.fillRect(20, 52, 4, 12); // Left leg front
    
    // Add clothing details to make it look fresh 🔥
    
    // Shirt
    ctx.fillStyle = shirtColor;
    ctx.fillRect(20, 20, 8, 7); // Shirt on body
    ctx.fillRect(44, 20, 4, 7); // Right arm shirt
    ctx.fillRect(36, 20, 4, 7); // Left arm shirt
    
    // Pants
    ctx.fillStyle = pantsColor;
    ctx.fillRect(20, 27, 8, 5); // Pants on body
    ctx.fillRect(4, 20, 4, 8);  // Right leg pants
    ctx.fillRect(20, 52, 4, 8); // Left leg pants
    
    // Shoes
    ctx.fillStyle = shoeColor;
    ctx.fillRect(4, 28, 4, 4);  // Right shoe
    ctx.fillRect(20, 60, 4, 4); // Left shoe
    
    // Add some detail pixels to make it look more interesting
    const accentColor = `hsl(${(hue + 60) % 360}, 80%, 60%)`;
    ctx.fillStyle = accentColor;
    
    // Add some random detail pixels based on hash
    for (let i = 0; i < 3; i++) {
        const x = 21 + (hash >> (i * 2)) % 6;
        const y = 21 + (hash >> (i * 3)) % 5;
        ctx.fillRect(x, y, 1, 1);
    }
    
    console.log(`[Default Skin] Generated fire default skin with colors - Skin: ${skinTone}, Shirt: ${shirtColor}, Pants: ${pantsColor} 🎨`);
    
    return canvas.toBuffer('image/png');
}
