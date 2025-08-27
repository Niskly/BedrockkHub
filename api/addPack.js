import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, color, tags, file } = req.body;
  if (!name || !color || !tags || !file) return res.status(400).json({ error: 'Missing fields' });

  const { data: storageData, error: storageError } = await supabase.storage.from('packs').upload(file.name, file, { upsert: true });
  if (storageError) return res.status(500).json({ error: storageError.message });

  const { data, error } = await supabase.from('packs').insert([{ name, color, tags, filename: file.name }]);
  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ status: 'success', data });
}
