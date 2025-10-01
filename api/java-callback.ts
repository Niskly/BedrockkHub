import cookie from 'cookie';

export default async function handler(req, res) {
  const code = req.query.code;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = 'https://mchub.vercel.app/api/java-callback';

  // Exchange code for access token
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

  // Fetch Minecraft profile
  const profileRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const profile = await profileRes.json();
  const ign = profile.name;

  // Store IGN in cookie
  res.setHeader('Set-Cookie', cookie.serialize('minecraft_ign', ign, {
    httpOnly: false,
    path: '/',
    maxAge: 3600
  }));

  res.redirect('/');
}
