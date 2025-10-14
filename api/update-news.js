import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key for admin-level access to check roles and update data
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
    if (!authHeader) {
        throw new Error('No authorization header');
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ details: 'Authentication failed.' });
    }

    // 2. Get the postId and content from the request body
    const { postId, content } = req.body;
    if (!postId) {
      return res.status(400).json({ details: 'Post ID is required.' });
    }
    if (!content || content.trim() === '') {
      return res.status(400).json({ details: 'Post content cannot be empty.' });
    }

    // 3. Get the existing post to verify ownership
    const { data: existingPost, error: fetchError } = await supabaseAdmin
      .from('news')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (fetchError || !existingPost) {
      return res.status(404).json({ details: 'Post not found.' });
    }

    // 4. Check if the user is the author or an admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile && profile.role === 'admin';
    const isAuthor = existingPost.author_id === user.id;

    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ details: 'You are not authorized to edit this post.' });
    }

    // 5. Update the post content
    const { data: updatedPost, error: updateError } = await supabaseAdmin
      .from('news')
      .update({ content: content })
      .eq('id', postId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // 6. Return a success message
    res.status(200).json({ message: 'News post updated successfully.', post: updatedPost });

  } catch (error) {
    console.error('Error in update-news function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
