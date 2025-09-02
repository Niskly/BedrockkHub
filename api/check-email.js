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

    // --- THE CORRECTED FUNCTION ---
    // Instead of the non-existent 'getUserByEmail', we use 'listUsers'.
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      email: email,
    });

    if (error) {
      // Any error during the lookup is a server problem.
      throw error;
    }

    // If the 'users' array contains one or more users, it means the email exists.
    if (users && users.length > 0) {
      res.status(200).json({ exists: true });
    } else {
      // If the array is empty, the email is available.
      res.status(200).json({ exists: false });
    }

  } catch (error) {
    console.error('Error in check-email function:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

