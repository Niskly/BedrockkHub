import cookie from 'cookie';

export default async function handler(req, res) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const ign = cookies.minecraft_ign || null;

  res.json({ name: ign });
}
