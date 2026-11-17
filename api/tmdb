// Proxy de TMDb: la clave vive en la variable de entorno TMDB_API_KEY (Vercel),
// nunca en el HTML ni en el repo.
const ALLOWED = [
  /^\/search\/(movie|tv)$/,
  /^\/(movie|tv)\/\d+\/watch\/providers$/
];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.TMDB_API_KEY;
  if (!key) return res.status(500).json({ error: 'Falta TMDB_API_KEY en Vercel.' });

  const { path, ...params } = req.query;
  if (typeof path !== 'string' || !ALLOWED.some(r => r.test(path))) {
    return res.status(400).json({ error: 'Ruta no permitida.' });
  }

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v.length <= 200) qs.set(k, v);
  }
  qs.set('api_key', key);

  try {
    const r = await fetch(`https://api.themoviedb.org/3${path}?${qs.toString()}`);
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Error consultando TMDb.' });
  }
}
