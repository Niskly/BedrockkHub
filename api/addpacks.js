import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client on the server
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, color, tags, filename } = JSON.parse(req.body);

    if (!name || !filename) {
      return res.status(400).json({ error: 'Name and filename are required.' });
    }

    // Convert tags array to a comma-separated string for storage
    const tagsString = tags.join(',');

    const { data, error } = await supabase
      .from('packs')
      .insert([{ name, color, tags: tagsString, filename }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json({ message: 'Pack added successfully!', pack: data });
  } catch (error) {
    console.error('Error adding pack:', error);
    res.status(500).json({ error: 'Failed to add pack', details: error.message });
  }
}
