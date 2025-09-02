import { createClient } from '@supabase/supabase-js';

// IMPORTANT: This uses the SERVICE_ROLE_KEY for admin privileges.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } } // We don't need to persist sessions on the server
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

    // Use the admin client to securely look up a user by their email.
    const { data, error } = await supabase.auth.admin.getUserByEmail(email);

    if (error) {
      // "User not found" is the expected error for a NEW user.
      // In this case, the email does NOT exist, which is good.
      if (error.status === 404) {
        return res.status(200).json({ exists: false });
      }
      // Any other error is a real problem.
      throw error;
    }

    // If we get here without an error, it means a user was found.
    res.status(200).json({ exists: true });

  } catch (error) {
    console.error('Error in check-email function:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
