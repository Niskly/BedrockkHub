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
    // 1. Authorization and Admin Check (omitted for brevity, assumed functional)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
        return res.status(401).json({ error: 'Unauthorized: You must be logged in to upload.' });
    }
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
         return res.status(403).json({ error: 'Forbidden: You do not have permission to upload.' });
    }

    // 2. Extract data
    const { packs: packsData, mode } = req.body; 

    if (!packsData || !Array.isArray(packsData) || packsData.length === 0) {
      return res.status(400).json({ error: 'Invalid pack data provided. Expected an array of packs.' });
    }

    // 3. Prepare data for database insertion with cleanup
    const insertionRecords = packsData.map(pack => {
        const tagsArray = Array.isArray(pack.tags) ? pack.tags : (pack.tags ? pack.tags.split(',') : []);
        
        // --- TAGS CLEANUP LOGIC ---
        // 3a. Filter out default metadata values that were accidentally included as tags
        let finalTags = tagsArray
            .filter(tag => tag && tag.toLowerCase() !== 'unknown' && tag.toLowerCase() !== 'none');
        
        // 3b. Handle the 'needs-tags' flag specifically for bulk mode
        if (mode === 'bulk') {
            const hasNeedsTags = finalTags.includes('needs-tags');
            
            // Filter out 'needs-tags' if other actual tags exist (i.e., user provided them during bulk)
            if (finalTags.length > 1 && hasNeedsTags) {
                finalTags = finalTags.filter(tag => tag !== 'needs-tags');
            } else if (finalTags.length === 0) {
                 // If the array is empty after cleanup, ensure 'needs-tags' is present
                 finalTags.push('needs-tags'); 
            }
        }
        
        const tagsString = finalTags.join(',');

        // Set metadata defaults (these fields are correct in the DB schema)
        const color = pack.color || 'none';
        const resolution = pack.resolution || 'unknown';
        const description = pack.description || null;

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
            user_id: user.id
        };
    });

    // 4. Insert records into the database
    const { data: insertedPacks, error: dbError } = await supabase
      .from('packs')
      .insert(insertionRecords)
      .select('id, name');

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
