import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key for admin-level access
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ details: 'Method Not Allowed' });
  }

  try {
    // 1. Authenticate the user from the request header
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ details: 'Authentication failed.' });
    }

    const { packId } = req.body;
    if (!packId) {
      return res.status(400).json({ details: 'Pack ID is required.' });
    }

    // 2. Fetch the pack to verify ownership and get file paths
    const { data: pack, error: fetchError } = await supabaseAdmin
      .from('packs')
      .select('id, user_id, filename, icon_url')
      .eq('id', packId)
      .single();

    if (fetchError || !pack) {
      return res.status(404).json({ details: 'Pack not found.' });
    }

    // 3. SECURITY CHECK: Ensure the authenticated user is the owner of the pack
    if (pack.user_id !== user.id) {
      return res.status(403).json({ details: 'You are not authorized to delete this pack.' });
    }

    // 4. Delete associated files from storage
    const filesToDelete = [];
    if (pack.filename) {
      filesToDelete.push(pack.filename);
    }
    if (pack.icon_url) {
      // Extract the path from the full URL
      const iconPath = pack.icon_url.substring(pack.icon_url.indexOf('/packs/') + 7);
      filesToDelete.push(iconPath);
    }
    
    if (filesToDelete.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage.from('packs').remove(filesToDelete);
        if (storageError) {
            console.error('Storage deletion error (continuing to DB deletion):', storageError.message);
        }
    }

    // 5. Delete the pack record from the database
    const { error: dbError } = await supabaseAdmin
      .from('packs')
      .delete()
      .eq('id', pack.id);

    if (dbError) {
      throw new Error(`Database deletion failed: ${dbError.message}`);
    }

    res.status(200).json({ details: 'Pack deleted successfully.' });

  } catch (error) {
    console.error('Error in delete-pack function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
