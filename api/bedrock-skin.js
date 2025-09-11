// api/bedrock-skin.js
// Endpoint to fetch Bedrock skins from various sources

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

        // Method 1: Try Geyser skin conversion API
        let skinData = await tryGeyserSkin(xuid);
        
        // Method 2: Try Xbox Live avatar conversion
        if (!skinData) {
            skinData = await tryXboxAvatarConversion(xuid);
        }
        
        // Method 3: Try Minecraft skin APIs
        if (!skinData) {
            skinData = await tryMinecraftSkinAPIs(xuid);
        }
        
        if (skinData) {
            // Set appropriate headers for image response
            res.setHeader('Content-Type', skinData.contentType || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
            return res.send(skinData.buffer);
        } else {
            // Return default skin
            const defaultSkin = generateDefaultSkinBuffer(xuid);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache default for 24 hours
            return res.send(defaultSkin);
        }

    } catch (error) {
        console.error('[bedrock-skin] Error:', error);
        res.status(500).json({ error: 'Failed to fetch skin' });
    }
}

// Try to get skin from Geyser or similar Bedrock->Java conversion service
async function tryGeyserSkin(xuid) {
    try {
        // If you have a Geyser instance with skin conversion
        const geyserUrl = process.env.GEYSER_SKIN_API_URL;
        if (!geyserUrl) return null;

        const response = await fetch(`${geyserUrl}/skin/${xuid}`, {
            headers: {
                'User-Agent': 'MCHub-SkinFetcher/1.0'
            },
            timeout: 5000
        });

        if (response.ok) {
            const buffer = await response.arrayBuffer();
            return {
                buffer: Buffer.from(buffer),
                contentType: response.headers.get('content-type')
            };
        }
    } catch (error) {
        console.log('[bedrock-skin] Geyser API failed:', error.message);
    }
    return null;
}

// Convert Xbox Live avatar to Minecraft skin format
async function tryXboxAvatarConversion(xuid) {
    try {
        // Use XBL.io to get the player's avatar
        const response = await fetch(`https://xbl.io/api/v2/avatar/body/${xuid}`, {
            headers: {
                'X-Authorization': process.env.OPENXBL_API_KEY,
                'Accept': 'image/png'
            },
            timeout: 5000
        });

        if (response.ok) {
            const avatarBuffer = await response.arrayBuffer();
            
            // Convert Xbox avatar to Minecraft skin format
            const skinBuffer = await convertAvatarToSkin(Buffer.from(avatarBuffer));
            
            return {
                buffer: skinBuffer,
                contentType: 'image/png'
            };
        }
    } catch (error) {
        console.log('[bedrock-skin] Xbox avatar conversion failed:', error.message);
    }
    return null;
}

// Try various Minecraft skin APIs that might have Bedrock data
async function tryMinecraftSkinAPIs(xuid) {
    const apis = [
        `https://api.geysermc.org/v2/xbox/xuid/${xuid}`,
        `https://api.geysermc.org/v2/skin/${xuid}`,
        // Add more APIs as needed
    ];

    for (const apiUrl of apis) {
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'MCHub-SkinFetcher/1.0'
                },
                timeout: 3000
            });

            if (response.ok) {
                const data = await response.json();
                
                // Try to get skin URL from response
                let skinUrl = data.skin_url || data.textures?.SKIN?.url || data.skin;
                
                if (skinUrl) {
                    const skinResponse = await fetch(skinUrl, { timeout: 5000 });
                    if (skinResponse.ok) {
                        const buffer = await skinResponse.arrayBuffer();
                        return {
                            buffer: Buffer.from(buffer),
                            contentType: skinResponse.headers.get('content-type') || 'image/png'
                        };
                    }
                }
            }
        } catch (error) {
            console.log(`[bedrock-skin] API ${apiUrl} failed:`, error.message);
        }
    }
    
    return null;
}

// Convert Xbox Live avatar image to Minecraft skin format
async function convertAvatarToSkin(avatarBuffer) {
    // This is a simplified conversion - you might want to use a more sophisticated method
    // For now, we'll create a basic skin template and overlay the avatar as the head
    
    const { createCanvas, loadImage } = await import('canvas');
    
    // Create 64x64 skin canvas
    const skinCanvas = createCanvas(64, 64);
    const ctx = skinCanvas.getContext('2d');
    
    // Fill with default skin color
    ctx.fillStyle = '#F0D0A0'; // Default skin tone
    ctx.fillRect(0, 0, 64, 64);
    
    try {
        // Load the Xbox avatar
        const avatarImg = await loadImage(avatarBuffer);
        
        // Draw avatar as head (scaled to fit head area)
        ctx.drawImage(avatarImg, 8, 8, 8, 8); // Front head
        ctx.drawImage(avatarImg, 40, 8, 8, 8); // Side head
        
        // Add basic body (you can enhance this)
        ctx.fillStyle = '#0066CC'; // Blue shirt
        ctx.fillRect(20, 20, 8, 12);
        
        // Add arms
        ctx.fillRect(44, 20, 4, 12);
        ctx.fillRect(36, 52, 4, 12);
        
        // Add legs
        ctx.fillStyle = '#333333'; // Dark pants
        ctx.fillRect(4, 20, 4, 12);
        ctx.fillRect(20, 52, 4, 12);
        
    } catch (error) {
        console.log('[bedrock-skin] Avatar overlay failed:', error.message);
        // Continue with default skin
    }
    
    return skinCanvas.toBuffer('image/png');
}

// Generate a default procedural skin based on XUID
function generateDefaultSkinBuffer(xuid) {
    const { createCanvas } = require('canvas');
    
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext('2d');
    
    // Create hash from XUID for consistent colors
    let hash = 0;
    for (let i = 0; i < xuid.length; i++) {
        hash = xuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate colors based on hash
    const hue = Math.abs(hash) % 360;
    const skinTone = `hsl(${hue}, 60%, 70%)`;
    const shirtColor = `hsl(${(hue + 120) % 360}, 80%, 50%)`;
    const pantsColor = `hsl(${(hue + 240) % 360}, 70%, 40%)`;
    
    // Fill background (transparent parts)
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 64, 64);
    
    // Draw head (front and back)
    ctx.fillStyle = skinTone;
    ctx.fillRect(8, 8, 8, 8);   // Head front
    ctx.fillRect(24, 8, 8, 8);  // Head back
    
    // Draw body
    ctx.fillStyle = shirtColor;
    ctx.fillRect(20, 20, 8, 12); // Body front
    ctx.fillRect(32, 20, 8, 12); // Body back
    
    // Draw arms
    ctx.fillStyle = skinTone;
    ctx.fillRect(44, 20, 4, 12); // Right arm
    ctx.fillRect(36, 52, 4, 12); // Left arm
    ctx.fillRect(52, 20, 4, 12); // Right arm back
    ctx.fillRect(44, 52, 4, 12); // Left arm back
    
    // Draw legs
    ctx.fillStyle = pantsColor;
    ctx.fillRect(4, 20, 4, 12);  // Right leg
    ctx.fillRect(20, 52, 4, 12); // Left leg
    ctx.fillRect(12, 20, 4, 12); // Right leg back
    ctx.fillRect(28, 52, 4, 12); // Left leg back
    
    // Add some details/accessories
    ctx.fillStyle = '#8B4513'; // Brown hair
    ctx.fillRect(8, 0, 8, 8);   // Hair overlay
    ctx.fillRect(24, 0, 8, 8);  // Hair overlay back
    
    return canvas.toBuffer('image/png');
}
