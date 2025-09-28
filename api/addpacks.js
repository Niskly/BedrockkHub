import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Use the Service Role Key here for admin-level access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Check if authorization header exists and is properly formatted
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }

    // 2. Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
        return res.status(401).json({ error: 'Unauthorized: You must be logged in to upload.' });
    }
    
    // Check if the user is an admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
         return res.status(403).json({ error: 'Forbidden: You do not have permission to upload.' });
    }

    // 3. Extract data for single or bulk upload
    const { packs: packsData, mode } = req.body; // Expect an array of packs or a single pack object wrapped in an array

    if (!packsData || !Array.isArray(packsData) || packsData.length === 0) {
      return res.status(400).json({ error: 'Invalid pack data provided. Expected an array of packs.' });
    }

    // 4. Prepare data for database insertion
    const insertionRecords = packsData.map(pack => {
        const tagsArray = Array.isArray(pack.tags) ? pack.tags : (pack.tags ? pack.tags.split(',') : []);
        
        // Define default values for bulk mode
        let color = pack.color || 'none';
        let resolution = pack.resolution || 'unknown';
        let tagsString = tagsArray.join(',');
        let description = pack.description || null;

        if (mode === 'bulk') {
            color = 'none';
            resolution = 'unknown';
            // Ensure the pack has a tag indicating it needs attention
            if (!tagsArray.includes('needs-tags')) {
                tagsArray.push('needs-tags');
            }
            tagsString = tagsArray.join(',');
            description = pack.description || 'Quick bulk upload: needs tags and review.';
        }


        // Final record structure for insertion
        return { 
            name: pack.name, 
            color: color, 
            tags: tagsString, 
            filename: pack.filename, 
            resolution: resolution, 
            version: pack.version, 
            description: description, 
            icon_url: pack.icon_url,
            user_id: user.id // Assign to the admin user
        };
    });

    // 5. Insert records into the database
    const { data: insertedPacks, error: dbError } = await supabase
      .from('packs')
      .insert(insertionRecords)
      .select('id, name'); // Select specific fields to return

    if (dbError) { 
        console.error('Supabase DB Insert Error:', dbError);
        throw dbError; 
    }

    res.status(200).json({ 
        message: `${insertedPacks.length} pack(s) added successfully!`, 
        packs: insertedPacks,
        mode: mode
    });

  } catch (error) {
    console.error('Error in addpacks function:', error);
    res.status(500).json({ error: 'Failed to add pack(s)', details: error.message });
  }
}
