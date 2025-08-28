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
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Pack ID is required.' });
    }

    // Call the database function we created in Step 1
    const { error } = await supabase.rpc('increment_downloads', { pack_id: id });

    if (error) { throw error; }

    res.status(200).json({ message: 'Download count incremented.' });

  } catch (error) {
    console.error('Error incrementing download count:', error);
    res.status(500).json({ error: 'Failed to increment count', details: error.message });
  }
}
