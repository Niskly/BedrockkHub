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

    const { postId, content } = req.body;
    if (!postId || !content) {
      return res.status(400).json({ details: 'Post ID and content are required.' });
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

    // Allow update if user is admin or post owner
    if (profile.role !== 'admin' && post.author_id !== user.id) {
      return res.status(403).json({ details: 'You are not authorized to edit this post.' });
    }

    // Update the post
    const { data: updatedPost, error: updateError } = await supabaseAdmin
      .from('news')
      .update({ content: content })
      .eq('id', postId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    res.status(200).json({ message: 'Post updated successfully.', post: updatedPost });

  } catch (error) {
    console.error('Error in update-news function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
