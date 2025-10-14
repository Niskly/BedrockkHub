import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    // Mark all unread notifications as read for this user
    const { error: updateError } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (updateError) {
      throw new Error(`Failed to mark notifications as read: ${updateError.message}`);
    }

    res.status(200).json({ message: 'All notifications marked as read.' });

  } catch (error) {
    console.error('Error in mark-notifications-read function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
