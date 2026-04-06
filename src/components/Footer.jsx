import React from 'react';
import { Send } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full mt-auto relative z-50 py-3 px-4 mb-6">
      <div className="flex items-center justify-center">
        <a
          href="https://t.me/Ahmed2deof"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center justify-center gap-2 w-fit px-4 py-2 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-sky-300/60 dark:hover:border-sky-700/50 transition-all duration-200 ease-out mx-auto"
        >
          <Send className="w-3.5 h-3.5 transition-colors duration-200 group-hover:text-sky-500 dark:group-hover:text-sky-400 -rotate-12" />
          <span>Developed with <span className="text-red-400">❤️</span> by Ahmed</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-sky-500 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -ml-1">@Ahmed2deof</span>
        </a>
      </div>
    </footer>
  );
}
