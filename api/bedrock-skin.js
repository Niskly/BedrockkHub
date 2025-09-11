import { createCanvas } from '@napi-rs/canvas';

// api/bedrock-skin.js
// Get Bedrock skins DIRECTLY from GeyserMC skin endpoint - THE RIGHT WAY! 🔥
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { xuid } = req.query;
        if (!xuid) {
            return res.status(400).json({ error: 'XUID is required' });
        }

        console.log(`[bedrock-skin] Getting REAL Bedrock skin for XUID: ${xuid} directly from GeyserMC! 🚀`);

        // Use the DIRECT GeyserMC skin endpoint - no Java UUID needed!
        const skinData = await getBedrockSkinDirect(xuid);
        
        if (skinData && skinData.buffer && skinData.buffer.length > 0) {
            console.log(`[bedrock-skin] SUCCESS! Got that fire skin from GeyserMC: ${skinData.buffer.length} bytes 🎨`);
            res.setHeader('Content-Type', skinData.contentType || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(skinData.buffer);
        } else {
            // Generate a fire default skin
            console.warn(`[bedrock-skin] GeyserMC API call failed or returned empty data for ${xuid}`);
            console.warn(`[bedrock-skin] Try manually checking: https://api.geysermc.org/v2/skin/${xuid}`);
            const defaultSkinBuffer = generateFireDefaultSkin(xuid);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=1800'); // Shorter cache for defaults
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(defaultSkinBuffer);
        }

    } catch (error) {
        console.error('[bedrock-skin] ERROR:', error);
        const defaultSkinBuffer = generateFireDefaultSkin("error");
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(500).send(defaultSkinBuffer);
    }
}

/**
 * Get Bedrock skin DIRECTLY from GeyserMC API - the GOAT method! 🐐
 * This hits the direct skin endpoint that gets skins from Bedrock Geyser servers
 */
async function getBedrockSkinDirect(xuid) {
    try {
        console.log(`[GeyserMC Direct] Hitting the direct skin endpoint for XUID: ${xuid}`);
        
        // Hit the DIRECT GeyserMC skin endpoint
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
        
        // Get the JSON response which should contain the skin data
        const skinData = await response.json();
        console.log(`[GeyserMC Direct] Got response data:`, {
            hasHash: !!skinData.hash,
            hasSignature: !!skinData.signature,
            hasTextureId: !!skinData.texture_id,
            hasValue: !!skinData.value,
            isSteve: skinData.is_steve
        });
        
        // First, try to get the hash from the response (this is the texture hash)
        if (skinData.hash) {
            console.log(`[GeyserMC Direct] Found hash: ${skinData.hash}`);
            
            // Use the hash to get the texture from Minecraft's texture server
            const textureUrl = `https://textures.minecraft.net/texture/${skinData.hash}`;
            console.log(`[GeyserMC Direct] Fetching texture from: ${textureUrl}`);
            
            const textureResponse = await fetch(textureUrl, {
                headers: {
                    'User-Agent': 'MCHub-BedrockSkinFetcher/2.0'
                }
            });
            
            if (textureResponse.ok) {
                const textureBuffer = await textureResponse.arrayBuffer();
                console.log(`[GeyserMC Direct] SUCCESS! Downloaded your real skin: ${textureBuffer.byteLength} bytes 🎉`);
                
                return {
                    buffer: Buffer.from(textureBuffer),
                    contentType: textureResponse.headers.get('content-type') || 'image/png'
                };
            } else {
                console.log(`[GeyserMC Direct] Failed to fetch texture from hash: ${textureResponse.status}`);
            }
        }
        
        // Fallback: try texture_id if hash didn't work
        if (skinData.texture_id) {
            console.log(`[GeyserMC Direct] Trying texture_id: ${skinData.texture_id}`);
            
            const textureUrl = `https://textures.minecraft.net/texture/${skinData.texture_id}`;
            console.log(`[GeyserMC Direct] Fetching texture from: ${textureUrl}`);
            
            const textureResponse = await fetch(textureUrl, {
                headers: {
                    'User-Agent': 'MCHub-BedrockSkinFetcher/2.0'
                }
            });
            
            if (textureResponse.ok) {
                const textureBuffer = await textureResponse.arrayBuffer();
                console.log(`[GeyserMC Direct] SUCCESS via texture_id! Downloaded: ${textureBuffer.byteLength} bytes 🎉`);
                
                return {
                    buffer: Buffer.from(textureBuffer),
                    contentType: textureResponse.headers.get('content-type') || 'image/png'
                };
            } else {
                console.log(`[GeyserMC Direct] Failed to fetch texture from texture_id: ${textureResponse.status}`);
            }
        }
        
        // Try to decode the value field if texture_id didn't work
        if (skinData.value) {
            console.log(`[GeyserMC Direct] Trying to decode value field...`);
            try {
                const decodedData = JSON.parse(Buffer.from(skinData.value, 'base64').toString());
                const skinUrl = decodedData.textures?.SKIN?.url;
                
                if (skinUrl) {
                    console.log(`[GeyserMC Direct] Found skin URL in value field: ${skinUrl.substring(0, 50)}...`);
                    
                    const skinResponse = await fetch(skinUrl, {
                        headers: {
                            'User-Agent': 'MCHub-BedrockSkinFetcher/2.0'
                        }
                    });
                    
                    if (skinResponse.ok) {
                        const skinBuffer = await skinResponse.arrayBuffer();
                        console.log(`[GeyserMC Direct] SUCCESS via value field! Downloaded: ${skinBuffer.byteLength} bytes 🎉`);
                        
                        return {
                            buffer: Buffer.from(skinBuffer),
                            contentType: skinResponse.headers.get('content-type') || 'image/png'
                        };
                    }
                }
            } catch (decodeError) {
                console.log(`[GeyserMC Direct] Failed to decode value field:`, decodeError.message);
            }
        }
        
        console.log(`[GeyserMC Direct] No usable skin data found in response`);
        return null;

    } catch (error) {
        console.error('[getBedrockSkinDirect] Error:', error.message);
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
