// Helper to fetch the raw skin data from the GeyserMC API
async function getPlayerSkinData(xuid) {
    try {
        const geyserApiUrl = `https://api.geysermc.org/v2/skin/${xuid}`;
        const response = await fetch(geyserApiUrl, { headers: { 'User-Agent': 'MCHub/1.1' } });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('[Player Skin Data] Error during GeyserMC fetch:', error.message);
        return null;
    }
}

// Helper to fetch a full image texture and return its buffer
async function fetchTextureFromUrl(url) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'MCHub/1.1' } });
        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        return { buffer: Buffer.from(buffer), contentType: response.headers.get('content-type') || 'image/png' };
    } catch (error) {
        console.error(`[Texture Fetch] Error downloading from ${url}:`, error.message);
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { xuid, render_type } = req.query;
        if (!xuid) {
            return res.status(400).json({ error: 'XUID is required' });
        }

        const skinData = await getPlayerSkinData(xuid);
        const textureId = skinData?.texture_id;

        // --- NEW, MORE RELIABLE HEAD RENDERING LOGIC ---
        if (render_type === 'head') {
            const size = 40; // The desired image size in pixels
            // Use a reliable rendering service that works directly with texture IDs.
            // This is better than relying on Java UUIDs, which may not exist.
            const headUrl = textureId 
                ? `https://visage.surgeplay.com/face/${size}/${textureId}`
                : `https://visage.surgeplay.com/face/${size}/default`; // Fallback to default Steve head

            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.redirect(302, headUrl); // Redirect the browser to the final head image
            return;
        }

        // --- EXISTING LOGIC FOR FULL SKIN TEXTURE (UNCHANGED) ---
        let textureUrl = null;
        if (textureId) {
            textureUrl = `https://textures.minecraft.net/texture/${textureId}`;
        }

        if (textureUrl) {
            const texture = await fetchTextureFromUrl(textureUrl);
            if (texture?.buffer) {
                res.setHeader('Content-Type', texture.contentType);
                res.setHeader('Cache-Control', 'public, max-age=86400');
                res.setHeader('Access-Control-Allow-Origin', '*');
                return res.send(texture.buffer);
            }
        }
        
        // Fallback to default full Steve skin if no custom skin is found
        const steveSkinUrl = "https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/steve.png";
        const steveSkinData = await fetchTextureFromUrl(steveSkinUrl);
        if (steveSkinData?.buffer) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(steveSkinData.buffer);
        }

        return res.status(500).json({ error: 'Could not load default skin.' });

    } catch (error) {
        console.error('[Handler] A critical error occurred:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
}

