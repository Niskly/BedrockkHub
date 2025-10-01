import cookie from 'cookie';

export default async function handler(req, res) {
  const code = req.query.code;
  const clientId = '73f0ee68-d1d4-4a5c-a2cf-bc775f80cb75';
  const clientSecret = '1V.8Q~dn5qVIMeD4Hq6HhzGi2CdUQPmEWDn2ia46';
  const redirectUri = 'https://mchub.vercel.app/api/java-callback';

  const tokenRes = await fetch('https://login.live.com/oauth20_token.srf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const profileRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const profile = await profileRes.json();
  const ign = profile.name;

  res.setHeader('Set-Cookie', cookie.serialize('minecraft_ign', ign, {
    httpOnly: false,
    path: '/',
    maxAge: 3600
  }));

  res.redirect('/java-link.html');
}
