// Cobalt v10 API — community instances fallback
const INSTANCES = [
  'https://cobalt.api.lisek.world',
  'https://co.wuk.sh',
  'https://cobalt.urdh.dev',
  'https://cobalt.canine.tools',
  'https://cobalt.darkness.services',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, quality = '1080', audioOnly = false } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const body = {
    url,
    videoQuality: quality,
    audioFormat: 'mp3',
    downloadMode: audioOnly ? 'audio' : 'auto',
    filenameStyle: 'pretty',
  };

  let lastError = 'All instances failed';

  for (const instance of INSTANCES) {
    try {
      const response = await fetch(`${instance}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status} from ${instance}`;
        continue;
      }

      const data = await response.json();

      // Cobalt v10 response format
      if (data.status === 'tunnel' || data.status === 'redirect') {
        return res.status(200).json({
          success: true,
          directUrl: data.url,
          filename: data.filename || 'video',
          type: data.status,
        });
      }

      if (data.status === 'picker' && data.picker?.length > 0) {
        return res.status(200).json({
          success: true,
          directUrl: data.picker[0].url,
          type: 'picker',
          formats: data.picker.map(item => ({
            url: item.url,
            type: item.type,
            thumb: item.thumb || '',
          })),
        });
      }

      if (data.status === 'error') {
        lastError = data.error?.code || 'API error';
        continue;
      }

      lastError = 'Unexpected response: ' + JSON.stringify(data).slice(0, 100);

    } catch (e) {
      lastError = e.name === 'TimeoutError'
        ? `${instance} timed out`
        : e.message;
    }
  }

  return res.status(500).json({ success: false, error: lastError });
}
