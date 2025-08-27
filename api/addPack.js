import { createClient } from '@supabase/supabase-js';

// Your Supabase project URL & service role key
const supabaseUrl = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { name, colors, tags, fileName } = req.body;

  if (!name || !colors || !tags || !fileName) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }

  try {
    // Insert the pack metadata into Supabase DB
    const { data, error } = await supabase
      .from('packs')
      .insert([
        {
          name,
          colors: colors.join(','),  // store as comma-separated
          tags: tags.join(','),      // store as comma-separated
          filename: fileName
        }
      ]);

    if (error) throw error;

    res.status(200).json({ status: 'success', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
