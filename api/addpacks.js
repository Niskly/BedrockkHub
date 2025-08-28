import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // NEW: Added 'icon_url'
    const { name, color, tags, filename, resolution, icon_url } = req.body;

    if (!name || !filename) {
      return res.status(400).json({ error: 'Name and filename are required.' });
    }

    const tagsString = tags.join(',');

    const { data, error } = await supabase
      .from('packs')
      // NEW: Added 'icon_url' to the insert data
      .insert([{ name, color, tags: tagsString, filename, resolution, icon_url }])
      .select()
      .single();

    if (error) { throw error; }

    res.status(200).json({ message: 'Pack added successfully!', pack: data });

  } catch (error) {
    console.error('Error in addpacks function:', error);
    res.status(500).json({ error: 'Failed to add pack', details: error.message });
  }
}
