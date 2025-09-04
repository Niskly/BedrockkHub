import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key for admin-level access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { provider_token } = req.body;
    if (!provider_token) {
      return res.status(400).json({ error: 'Microsoft access token is required.' });
    }

    // 1. Get the user's session from their browser token
    const token = req.headers.authorization.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // 2. Use the Microsoft token to get the user's Minecraft profile
    const minecraftProfileResponse = await fetch('https://api.minecraftservices.com/minecraft/profile', {
      headers: { 'Authorization': `Bearer ${provider_token}` }
    });

    if (!minecraftProfileResponse.ok) {
      throw new Error('Failed to fetch Minecraft profile. Make sure you are using a Microsoft account that owns Minecraft: Java Edition.');
    }

    const minecraftProfile = await minecraftProfileResponse.json();
    const minecraft_uuid = minecraftProfile.id;
    const minecraft_username = minecraftProfile.name;

    // 3. Save the UUID and username to the user's MCHub profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ minecraft_uuid, minecraft_username })
      .eq('id', user.id);

    if (updateError) throw updateError;

    res.status(200).json({ message: 'Minecraft account linked successfully!', minecraft_username });

  } catch (error) {
    console.error('Error in link-minecraft function:', error);
    res.status(500).json({ error: 'Failed to link Minecraft account', details: error.message });
  }
}

