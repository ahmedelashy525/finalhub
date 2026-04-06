export function getDirectAudioUrl(url) {
  if (!url) return '';
  
  try {
    if (url.includes('drive.google.com')) {
      // Match pattern: https://drive.google.com/file/d/[FILE_ID]/view
      const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (matchD && matchD[1]) {
        return `https://drive.google.com/uc?export=download&id=${matchD[1]}`;
      }
      
      // Match pattern: https://drive.google.com/open?id=[FILE_ID]
      const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchId && matchId[1]) {
        return `https://drive.google.com/uc?export=download&id=${matchId[1]}`;
      }
    }
  } catch (error) {
    console.error('Error converting audio link:', error);
  }
  
  // Return fallback generically protecting standard MP3 links natively
  return url;
}
