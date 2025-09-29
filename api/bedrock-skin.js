import { createClient } from '@supabase/supabase-js';

// Helper to fetch an image and return its buffer and content type
async function fetchTextureFromUrl(url) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'MCHub/1.0' } });
        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        return { buffer: Buffer.from(buffer), contentType: response.headers.get('content-type') || 'image/png' };
    } catch (error) {
        console.error(`[Texture Fetch] Error downloading from ${url}:`, error.message);
        return null;
    }
}

// Helper to get the raw skin data (including Java UUID) from GeyserMC API
async function getPlayerSkinData(xuid) {
    try {
        const geyserApiUrl = `https://api.geysermc.org/v2/skin/${xuid}`;
        const response = await fetch(geyserApiUrl);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('[Player Skin Data] Error during GeyserMC fetch:', error.message);
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

        // --- NEW LOGIC FOR RENDERING ONLY THE HEAD ---
        if (render_type === 'head') {
            const uuid = skinData?.uuid; // Extract the Java UUID if it exists
            const fallbackHeadUrl = "https://cravatar.eu/helmavatar/steve/40.png"; // Default Steve head
            
            // Use the UUID with a skin rendering service, or fall back to Steve
            const headUrl = uuid ? `https://cravatar.eu/helmavatar/${uuid}/40.png?default=steve` : fallbackHeadUrl;
            
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.redirect(302, headUrl); // Redirect the browser to the head image
            return;
        }

        // --- EXISTING LOGIC FOR FULL SKIN TEXTURE ---
        let textureUrl = null;
        if (skinData?.value) {
            try {
                const decoded = JSON.parse(Buffer.from(skinData.value, 'base64').toString());
                textureUrl = decoded?.textures?.SKIN?.url;
            } catch (e) { /* ignore parse error */ }
        }
        if (!textureUrl && skinData?.texture_id) {
            textureUrl = `https://textures.minecraft.net/texture/${skinData.texture_id}`;
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
