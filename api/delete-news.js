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

    const { postId } = req.body;
    if (!postId) {
      return res.status(400).json({ details: 'Post ID is required.' });
    }

    // Check if user is admin or post owner
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const { data: post } = await supabaseAdmin
      .from('news')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (!post) {
      return res.status(404).json({ details: 'Post not found.' });
    }

    // Allow deletion if user is admin or post owner
    if (profile.role !== 'admin' && post.author_id !== user.id) {
      return res.status(403).json({ details: 'You are not authorized to delete this post.' });
    }

    // Delete the post
    const { error: deleteError } = await supabaseAdmin
      .from('news')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      throw new Error(`Failed to delete post: ${deleteError.message}`);
    }

    res.status(200).json({ message: 'Post deleted successfully.' });

  } catch (error) {
    console.error('Error in delete-news function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
