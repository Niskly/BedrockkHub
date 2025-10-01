export default async function handler(req, res) {
  const clientId = '73f0ee68-d1d4-4a5c-a2cf-bc775f80cb75';
  const redirectUri = 'https://mchub.vercel.app/api/java-callback';
  const scopes = ['Minecraft', 'offline_access'].join(' ');

  const authUrl = `https://login.live.com/oauth20_authorize.srf?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

  res.redirect(authUrl);
}
