import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function CustomAudioPlayer({ audioUrl }) {
  if (!audioUrl) return null;

  const extractDriveId = (url) => {
    try {
      const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (matchD && matchD[1]) return matchD[1];
      
      const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchId && matchId[1]) return matchId[1];
    } catch(e) {}
    return null;
  };

  const driveId = extractDriveId(audioUrl);

  if (!driveId) {
    return (
      <a 
        href={audioUrl} 
        target="_blank" 
        rel="noreferrer" 
        className="flex items-center justify-center gap-2 w-full py-3 mt-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition text-sm"
      >
        <ExternalLink className="w-5 h-5" /> استماع للمقطع الصوتي الخارجي
      </a>
    );
  }

  return (
    <iframe 
      src={`https://drive.google.com/file/d/${driveId}/preview`}
      width="100%" 
      height="80" 
      allow="autoplay" 
      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 mt-2 bg-slate-50 dark:bg-slate-800 overflow-hidden"
      title="Audio Player Embed"
    />
  );
}
