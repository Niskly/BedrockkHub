// Helper to fetch an image and return its buffer
async function fetchTextureFromUrl(url) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'MCHub/1.2' } });
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
        const { uuid, render_type } = req.query;
        if (!uuid) {
            return res.status(400).json({ error: 'Java UUID is required' });
        }

        // Use a reliable skin rendering service that works directly with UUIDs.
        // This service provides both full skins and rendered heads.
        const serviceUrl = 'https://visage.surgeplay.com';

        let finalUrl;
        if (render_type === 'head') {
            const size = 40; // The desired head size in pixels
            finalUrl = `${serviceUrl}/face/${size}/${uuid}`;
        } else {
            // Default to fetching the full skin texture
            finalUrl = `${serviceUrl}/skin/${uuid}`;
        }

        // Fetch the skin/head from the rendering service
        const texture = await fetchTextureFromUrl(finalUrl);

        if (texture?.buffer) {
            res.setHeader('Content-Type', texture.contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(texture.buffer);
        }

        // Fallback to default Steve skin if the lookup fails for any reason
        const steveSkinUrl = `${serviceUrl}/skin/default`;
        const steveSkinData = await fetchTextureFromUrl(steveSkinUrl);
        if (steveSkinData?.buffer) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(steveSkinData.buffer);
        }

        // If even the default skin fails, send an error
        return res.status(500).json({ error: 'Could not load default skin.' });

    } catch (error) {
        console.error('[java-skin handler] A critical error occurred:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
}
