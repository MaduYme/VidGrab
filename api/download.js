export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, quality = '1080', audioOnly = false } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const qualities = audioOnly ? ['max'] : [quality, 'max', '1080', '720'];
  let lastError = null;

  for (const q of qualities) {
    try {
      const body = {
        url,
        videoQuality: audioOnly ? 'max' : q,
        audioFormat: 'mp3',
        downloadMode: audioOnly ? 'audio' : 'auto',
      };

      const response = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.url || data.picker) {
        // Handle picker (multiple streams)
        if (data.picker) {
          const formatted = data.picker.map((item, i) => ({
            quality: item.quality || `Option ${i+1}`,
            url: item.url,
            type: 'video',
          }));
          return res.status(200).json({
            success: true,
            type: 'picker',
            formats: formatted,
            title: data.filename || url,
            platform: data.service || 'unknown',
          });
        }

        return res.status(200).json({
          success: true,
          type: 'single',
          directUrl: data.url,
          title: data.filename || url,
          platform: data.service || 'unknown',
          quality: q,
        });
      }

      lastError = data.error || data.text || 'No URL returned';
    } catch (e) {
      lastError = e.message;
    }
  }

  return res.status(500).json({ error: 'Could not get download link', details: lastError });
}
