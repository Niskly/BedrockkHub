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

    // 3. Proceed with the upload, now with the user's ID
    const { name, color, tags, filename, resolution, version, description, icon_url } = req.body;

    if (!name || !filename) {
      return res.status(400).json({ error: 'Name and filename are required.' });
    }

    const tagsString = Array.isArray(tags) ? tags.join(',') : '';

    const { data, error } = await supabase
      .from('packs')
      .insert([{ 
          name, 
          color, 
          tags: tagsString, 
          filename, 
          resolution, 
          version, 
          description, 
          icon_url,
          user_id: user.id
        }])
      .select()
      .single();

    if (error) { throw error; }

    res.status(200).json({ message: 'Pack added successfully!', pack: data });

  } catch (error) {
    console.error('Error in addpacks function:', error);
    res.status(500).json({ error: 'Failed to add pack', details: error.message });
  }
}
