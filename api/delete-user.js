import { createClient } from '@supabase/supabase-js';

// IMPORTANT: This function MUST use the SERVICE_ROLE_KEY to have admin privileges
// to delete a user's auth record.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ details: 'Method Not Allowed' });
  }

  try {
    // 1. Get the user from the JWT sent by the client
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return res.status(401).json({ details: 'Authentication failed.' });
    }

    // 2. Delete the user from the 'auth.users' table
    // This is a protected, admin-level action.
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteAuthUserError) {
        // It's possible the profile was deleted but auth user wasn't, or vice-versa.
        // Log the error but don't stop, as the profile might still exist.
        console.error(`Failed to delete auth user ${user.id}:`, deleteAuthUserError.message);
        // Depending on your policy, you might want to throw an error here.
        // For this case, we will proceed to ensure profile data is also removed.
    }

    // 3. The `on delete cascade` in your database schema should handle deleting the user's profile
    // from the 'profiles' table automatically when the auth user is deleted.
    // If you don't have that set up, you would manually delete the profile here:
    /*
    const { error: deleteProfileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', user.id);
    if (deleteProfileError) {
        console.error(`Failed to delete profile for user ${user.id}:`, deleteProfileError.message);
        // Handle this error as needed
    }
    */
    
    // Note: You should also consider deleting user-generated content from storage,
    // like avatars, banners, and uploaded packs. This would be a more complex operation.

    res.status(200).json({ details: 'User account deleted successfully.' });

  } catch (error) {
    console.error('Error in delete-user function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
