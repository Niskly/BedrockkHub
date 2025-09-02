import { createClient } from '@supabase/supabase-js';

// This uses environment variables for security.
// It REQUIRES SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set in Vercel.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    // --- THE DEFINITIVE FIX ---
    // This securely calls the 'email_exists' function you added to your database.
    const { data, error } = await supabase.rpc('email_exists', {
      email_to_check: email
    });

    if (error) {
      // Any error during the lookup is a server problem.
      throw error;
    }

    // The 'data' returned by the function is the boolean result (true or false).
    res.status(200).json({ exists: data });

  } catch (error) {
    console.error('Error in check-email function:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

