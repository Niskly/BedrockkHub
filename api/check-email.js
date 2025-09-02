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

    // Securely look up a user by email using admin privileges.
    const { data, error } = await supabase.auth.admin.getUserByEmail(email);

    if (error) {
      // A "User not found" error is expected for a NEW user, which is a success case for us.
      if (error.status === 404) {
        return res.status(200).json({ exists: false });
      }
      // Any other error is a real problem.
      throw error;
    }

    // If no error occurred, a user was found.
    res.status(200).json({ exists: true });

  } catch (error) {
    console.error('Error in check-email function:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

