import { createClient } from '@supabase/supabase-js';

// Use the standard environment variable names for Vercel
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Vercel automatically parses the body, so we just use req.body directly
    // NEW: Added 'resolution' to the list
    const { name, color, tags, filename, resolution } = req.body;

    if (!name || !filename) {
      return res.status(400).json({ error: 'Name and filename are required.' });
    }

    // Convert tags array to a comma-separated string for the database
    const tagsString = tags.join(',');

    const { data, error } = await supabase
      .from('packs')
      // NEW: Added 'resolution' to the insert data
      .insert([{ name, color, tags: tagsString, filename, resolution }])
      .select()
      .single();

    if (error) {
      // If there's a database error, throw it to the catch block
      throw error;
    }

    // Send a success response with the new pack data
    res.status(200).json({ message: 'Pack added successfully!', pack: data });

  } catch (error) {
    // Catch any error and send a detailed server error response
    console.error('Error in addpacks function:', error);
    res.status(500).json({ error: 'Failed to add pack', details: error.message });
  }
}
