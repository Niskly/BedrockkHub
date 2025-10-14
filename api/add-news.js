import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key for admin-level access to check roles and insert data
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

    // 2. Check if the user has the 'admin' role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({ details: 'You are not authorized to perform this action.' });
    }

    // 3. Get the content from the request body
    const { content } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ details: 'Post content cannot be empty.' });
    }

    // 4. Insert the new post into the 'news' table
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
    
    // The database trigger will automatically create notifications for all users.

    // 5. Return a success message
    res.status(200).json({ message: 'News post created successfully.', post: newPost });

  } catch (error) {
    console.error('Error in add-news function:', error);
    res.status(500).json({ details: error.message || 'An internal server error occurred.' });
  }
}
