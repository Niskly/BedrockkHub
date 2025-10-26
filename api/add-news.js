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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ details: 'Profile not found.' });
    }

    const { content, postId } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ details: 'Post content cannot be empty.' });
    }

    // EDIT POST
    if (postId) {
      // Check if post exists and user owns it or is admin
      const { data: existingPost } = await supabaseAdmin
        .from('news')
        .select('author_id')
        .eq('id', postId)
        .single();

      if (!existingPost) {
        return res.status(404).json({ details: 'Post not found.' });
      }

      if (existingPost.author_id !== user.id && profile.role !== 'admin') {
        return res.status(403).json({ details: 'You are not authorized to edit this post.' });
      }

      const { data: updatedPost, error: updateError } = await supabaseAdmin
        .from('news')
        .update({ content: content })
        .eq('id', postId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      return res.status(200).json({ message: 'News post updated successfully.', post: updatedPost });
    }

    // CREATE NEW POST (admin only)
    if (profile.role !== 'admin') {
      return res.status(403).json({ details: 'Only admins can create news posts.' });
    }

    const { data: newPost, error: insertError } = await supabaseAdmin
      .from('news')
      .insert({
        author_id: user.id,
        content: content
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    res.status(200).json({ message: 'News post created successfully.', post: newPost });

  } catch (error) {
    console.error('Error in add-news function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
