export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  // Get metadata from oEmbed where possible
  const platform = detectPlatform(url);
  let meta = { title: '', thumb: '', duration: '', author: '', platform };

  try {
    if (platform === 'youtube') {
      const ytId = (url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/) || [])[1];
      if (ytId) {
        const oEmbed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        const oe = await oEmbed.json();
        meta.title = oe.title || '';
        meta.thumb = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        meta.author = oe.author_name || '';
      }
    }
  } catch(e) {}

  // Always return formats list
  const formats = platform === 'youtube' ? [
    { id: '4k',    label: '4K Ultra HD', quality: '2160', type: 'video', ext: 'mp4' },
    { id: '1080',  label: '1080p Full HD', quality: '1080', type: 'video', ext: 'mp4' },
    { id: '720',   label: '720p HD',     quality: '720',  type: 'video', ext: 'mp4' },
    { id: '480',   label: '480p SD',     quality: '480',  type: 'video', ext: 'mp4' },
    { id: '360',   label: '360p',        quality: '360',  type: 'video', ext: 'mp4' },
    { id: 'mp3',   label: 'MP3 Audio',   quality: 'max',  type: 'audio', ext: 'mp3' },
    { id: 'm4a',   label: 'M4A Audio',   quality: 'max',  type: 'audio', ext: 'm4a' },
  ] : [
    { id: 'best',  label: 'Best Quality', quality: 'max', type: 'video', ext: 'mp4' },
    { id: 'mp3',   label: 'MP3 Audio',    quality: 'max', type: 'audio', ext: 'mp3' },
  ];

  return res.status(200).json({ ...meta, formats });
}

function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/facebook\.com|fb\.watch/.test(url)) return 'facebook';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  if (/vimeo\.com/.test(url)) return 'vimeo';
  return 'web';
}
