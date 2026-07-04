export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, quality = '1080', audioOnly = false } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Quality fallback chain
  const qualities = audioOnly ? ['max'] : [quality, 'max', '1080', '720', '480'];
  let lastError = null;

  for (const q of qualities) {
    try {
      const response = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          url,
          vQuality: q,
          aFormat: 'mp3',
          downloadMode: audioOnly ? 'audio' : 'auto',
          isNoTTWatermark: true,
        }),
      });

      const data = await response.json();

      if (data.url) {
        return res.status(200).json({
          success: true,
          directUrl: data.url,
          type: 'single',
          quality: q,
        });
      }

      if (data.picker && data.picker.length > 0) {
        return res.status(200).json({
          success: true,
          type: 'picker',
          directUrl: data.picker[0].url,
          formats: data.picker.map(item => ({
            url: item.url,
            quality: item.quality || '',
            type: 'video',
          })),
        });
      }

      lastError = data.error || data.text || 'No URL returned';
    } catch (e) {
      lastError = e.message;
    }
  }

  return res.status(500).json({ success: false, error: lastError });
}
