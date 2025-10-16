import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Use the Service Role Key here for admin-level access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Authorization and Admin Check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
        return res.status(401).json({ error: 'Unauthorized: You must be logged in to upload.' });
    }
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
         return res.status(403).json({ error: 'Forbidden: You do not have permission to upload.' });
    }

    // 2. Extract data from the request body
    const { packs: packsData } = req.body; 

    if (!packsData || !Array.isArray(packsData) || packsData.length === 0) {
      return res.status(400).json({ error: 'Invalid pack data provided. Expected an array of packs.' });
    }

    // 3. Prepare data for database insertion with simplified cleanup
    const insertionRecords = packsData.map(pack => {
        // Ensure tags are an array, even if they are not provided
        const tagsArray = Array.isArray(pack.tags) ? pack.tags : [];
        
        // --- SIMPLIFIED TAGS CLEANUP ---
        // Just trim, lowercase, and filter out any empty strings. No more "needs-tags".
        const finalTags = tagsArray
            .map(tag => tag ? tag.trim().toLowerCase() : '')
            .filter(tag => !!tag); // Keeps only non-empty tags
        
        // Use a Set to ensure there are no duplicate tags before joining
        const tagsString = [...new Set(finalTags)].join(',');

        // Set metadata defaults. The frontend now controls these correctly.
        const color = pack.color || 'none';
        const resolution = pack.resolution || 'unknown';
        const description = pack.description || null;

        // Final record structure for insertion
        return { 
            name: pack.name, 
            color: color, 
            tags: tagsString, 
            filename: pack.filename, 
            resolution: resolution, 
            version: pack.version, 
            description: description, 
            icon_url: pack.icon_url,
            user_id: user.id
        };
    });

    // 4. Insert records into the database
    const { data: insertedPacks, error: dbError } = await supabase
      .from('packs')
      .insert(insertionRecords)
      .select('id, name, icon_url');

    if (dbError) { 
        console.error('Supabase DB Insert Error:', dbError);
        throw dbError; 
    }

    // 5. Create notifications for all users about new packs
    try {
        // Get all user IDs except the uploader
        const { data: allUsers } = await supabase
            .from('profiles')
            .select('id')
            .neq('id', user.id);
        
        if (allUsers && allUsers.length > 0) {
            // Create notification for each pack
            const notifications = [];
            for (const pack of insertedPacks) {
                for (const targetUser of allUsers) {
                    notifications.push({
                        user_id: targetUser.id,
                        type: 'new_pack',
                        content: {
                            text: `New pack uploaded: ${pack.name}`,
                            link: `/packs.html?id=${pack.id}`,
                            pack_icon: pack.icon_url
                        }
                    });
                }
            }
            
            // Insert all notifications at once
            if (notifications.length > 0) {
                await supabase.from('notifications').insert(notifications);
            }
        }
    } catch (notifError) {
        console.error('Error creating notifications:', notifError);
        // Don't fail the request if notifications fail
    }

    // 6. Send success response
    res.status(200).json({ 
        message: `${insertedPacks.length} pack(s) added successfully!`, 
        packs: insertedPacks
    });

  } catch (error) {
    console.error('Error in addpacks function:', error);
    res.status(500).json({ error: 'Failed to add pack(s)', details: error.message });
  }
}

