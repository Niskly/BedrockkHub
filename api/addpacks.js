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
    // 1. Authorization and Admin Check
    // Get the user's token from the request header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    // Ensure the user is logged in
    if (userError || !user) {
        return res.status(401).json({ error: 'Unauthorized: You must be logged in to upload.' });
    }
    
    // Check if the user has the 'admin' role in the profiles table
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
         return res.status(403).json({ error: 'Forbidden: You do not have permission to upload.' });
    }

    // 2. Extract and Validate Incoming Data
    const { packs: packsData, mode } = req.body; 

    if (!packsData || !Array.isArray(packsData) || packsData.length === 0) {
      return res.status(400).json({ error: 'Invalid pack data provided. Expected an array of packs.' });
    }

    // 3. Prepare Data for Database Insertion
    // Map over the array of packs sent from the frontend
    const insertionRecords = packsData.map(pack => {
        // Ensure tags are a clean array of strings
        const tagsArray = Array.isArray(pack.tags) ? pack.tags : (pack.tags ? pack.tags.toString().split(',') : []);
        
        // Clean up tags: trim whitespace, convert to lowercase, and filter out any empty or placeholder values
        let finalTags = tagsArray
            .map(tag => tag ? tag.trim().toLowerCase() : '')
            .filter(tag => tag && tag !== 'unknown' && tag !== 'none');
        
        // If it was a bulk upload and no real tags were found, ensure 'needs-tags' is present
        if (mode === 'bulk' && finalTags.length === 0) {
            finalTags.push('needs-tags');
        }
        
        // Join the cleaned tags array back into a comma-separated string for the database
        const tagsString = [...new Set(finalTags)].join(','); // Use Set to remove duplicates

        // Set default values for metadata if not provided
        const color = pack.color || 'none';
        const resolution = pack.resolution || 'unknown';
        const description = pack.description || null;

        // Return the final, clean record structure for this pack
        return { 
            name: pack.name, 
            color: color, 
            tags: tagsString, 
            filename: pack.filename, 
            resolution: resolution, 
            version: pack.version, 
            description: description, 
            icon_url: pack.icon_url,
            user_id: user.id // Assign the pack to the currently logged-in admin
        };
    });

    // 4. Insert All Records into the Database at Once
    const { data: insertedPacks, error: dbError } = await supabase
      .from('packs')
      .insert(insertionRecords)
      .select('id, name'); // Only select the ID and name to send back

    if (dbError) { 
        console.error('Supabase DB Insert Error:', dbError);
        throw dbError; 
    }

    // 5. Send a Success Response
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
