// Proxy hacia la API de Anthropic. La key vive en ANTHROPIC_API_KEY (Vercel).
// El servidor fija modelo y tamaño de respuesta: el cliente solo manda el texto del prompt.

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1000;
const MAX_PROMPT_CHARS = 6000;

// Solo se aceptan pedidos desde la app (producción y previews de Vercel de este proyecto)
const ALLOWED_ORIGINS = [
  /^https:\/\/my-mood-chi\.vercel\.app$/,
  /^https:\/\/my-mood-[a-z0-9-]+-nicolas-projects095\.vercel\.app$/,
];

// Límite por IP (en memoria: se reinicia si Vercel reinicia la función)
const RATE_LIMIT = 30;               // consultas
const RATE_WINDOW_MS = 60 * 60 * 1000; // por hora
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Limpieza simple para que el mapa no crezca sin fin
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some(t => now - t < RATE_WINDOW_MS)) hits.delete(k);
  }
  return false;
}

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const originOk = typeof origin === 'string' && ALLOWED_ORIGINS.some(r => r.test(origin));

  if (originOk) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') return res.status(originOk ? 200 : 403).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });
  if (!originOk) return res.status(403).json({ error: { message: 'Origen no permitido.' } });

  if (isRateLimited(getIp(req))) {
    return res.status(429).json({ error: { message: 'Hiciste muchas consultas seguidas. Esperá un rato y probá de nuevo.' } });
  }

  // Tomar solo el texto del prompt; se ignora cualquier modelo o max_tokens que mande el cliente
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const prompt = body?.messages?.[0]?.content;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: { message: 'Pedido inválido.' } });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(413).json({ error: { message: 'El pedido es demasiado largo.' } });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'ANTHROPIC_API_KEY no configurada en Vercel. Andá a Settings → Environment Variables.' } });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: { message: data?.error?.message || 'Error de la API de Anthropic' } });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: { message: `Proxy error: ${error.message}` } });
  }
}
