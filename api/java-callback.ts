import cookie from 'cookie';

export default async function handler(req, res) {
  const code = req.query.code;
  const clientId = '73f0ee68-d1d4-4a5c-a2cf-bc775f80cb75';
  const clientSecret = '1V.8Q~dn5qVIMeD4Hq6HhzGi2CdUQPmEWDn2ia46';
  const redirectUri = 'https://mchub.vercel.app/api/java-callback';

  if (!code) {
    return res.status(400).send('Missing code');
  }

  try {
    const tokenRes = await fetch('https://login.live.com/oauth20_token.srf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code.toString(),
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('Token error:', tokenData);
      return res.status(500).send('Token exchange failed');
    }

    const profileRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!profileRes.ok) {
      const errorText = await profileRes.text();
      console.error('Profile fetch failed:', errorText);
      return res.status(500).send('Failed to fetch Minecraft profile');
    }

    const profile = await profileRes.json();
    const ign = profile.name;

    res.setHeader('Set-Cookie', cookie.serialize('minecraft_ign', ign, {
      httpOnly: false,
      path: '/',
      maxAge: 3600
    }));

    res.redirect('/java-link.html');
  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).send('OAuth failed');
  }
}
