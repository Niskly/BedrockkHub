import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ details: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ details: 'Authentication failed.' });
    }

    // Delete all notifications for this user
    const { error: deleteError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      throw new Error(`Failed to clear notifications: ${deleteError.message}`);
    }

    res.status(200).json({ message: 'All notifications cleared successfully.' });

  } catch (error) {
    console.error('Error in clear-notifications function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
