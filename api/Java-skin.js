export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { uuid, render_type = 'full' } = req.query;
        if (!uuid) {
            return res.status(400).json({ error: 'Java UUID is required' });
        }

        // Use a reliable, fast, and cached skin rendering service
        const baseUrl = 'https://visage.surgeplay.com';
        let skinUrl;

        if (render_type === 'head') {
            skinUrl = `${baseUrl}/face/64/${uuid}`;
        } else { // 'full' body render
            skinUrl = `${baseUrl}/skin/${uuid}`;
        }

        // Redirect the user's browser directly to the cached skin image
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.redirect(307, skinUrl); // 307 Temporary Redirect is appropriate here

    } catch (error) {
        console.error('[java-skin] A critical error occurred:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
}
