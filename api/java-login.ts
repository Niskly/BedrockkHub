export default async function handler(req, res) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = 'https://mchub.vercel.app/api/java-callback';
  const scopes = ['offline_access', 'Minecraft'].join(' ');

  const authUrl = `https://login.live.com/oauth20_authorize.srf?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

  res.redirect(authUrl);
}
