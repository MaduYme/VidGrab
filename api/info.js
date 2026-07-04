export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const platform =
    /youtube\.com|youtu\.be/.test(url) ? 'youtube' :
    /facebook\.com|fb\.watch/.test(url) ? 'facebook' :
    /instagram\.com/.test(url) ? 'instagram' :
    /tiktok\.com/.test(url) ? 'tiktok' :
    /twitter\.com|x\.com/.test(url) ? 'twitter' :
    /vimeo\.com/.test(url) ? 'vimeo' : 'web';

  let title = '', thumb = '', author = '';

  // YouTube metadata via oEmbed
  if (platform === 'youtube') {
    try {
      const ytId = (url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/) || [])[1];
      if (ytId) {
        const oe = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        if (oe.ok) {
          const d = await oe.json();
          title  = d.title || '';
          author = d.author_name || '';
          thumb  = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        }
      }
    } catch (e) {}
  }

  const formats = platform === 'youtube' ? [
    { quality: '2160', label: '4K Ultra HD',  ext: 'mp4', type: 'video' },
    { quality: '1080', label: '1080p Full HD', ext: 'mp4', type: 'video' },
    { quality: '720',  label: '720p HD',       ext: 'mp4', type: 'video' },
    { quality: '480',  label: '480p',          ext: 'mp4', type: 'video' },
    { quality: '360',  label: '360p',          ext: 'mp4', type: 'video' },
    { quality: 'max',  label: 'MP3 Audio',     ext: 'mp3', type: 'audio' },
    { quality: 'max',  label: 'M4A Audio',     ext: 'm4a', type: 'audio', aFormat: 'm4a' },
  ] : [
    { quality: 'max', label: 'Best Quality', ext: 'mp4', type: 'video' },
    { quality: 'max', label: 'MP3 Audio',    ext: 'mp3', type: 'audio' },
  ];

  return res.status(200).json({ title, thumb, author, platform, formats });
}
