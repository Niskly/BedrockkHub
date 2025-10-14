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

    const { notificationId } = req.body;
    if (!notificationId) {
      return res.status(400).json({ details: 'Notification ID is required.' });
    }

    // Verify the notification belongs to the user
    const { data: notification } = await supabaseAdmin
      .from('notifications')
      .select('user_id')
      .eq('id', notificationId)
      .single();

    if (!notification) {
      return res.status(404).json({ details: 'Notification not found.' });
    }

    if (notification.user_id !== user.id) {
      return res.status(403).json({ details: 'You are not authorized to delete this notification.' });
    }

    // Delete the notification
    const { error: deleteError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (deleteError) {
      throw new Error(`Failed to delete notification: ${deleteError.message}`);
    }

    res.status(200).json({ message: 'Notification deleted successfully.' });

  } catch (error) {
    console.error('Error in delete-notification function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
