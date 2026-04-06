import React from 'react';
import { Bell, Calendar, ChevronLeft, Link as LinkIcon, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Robust Arabic Time Ago formatter
const timeAgoArabic = (dateString, timestamp) => {
  if (!dateString && !timestamp) return 'منذ فترة';
  
  // if timestamp exists from firebase
  let past;
  if (timestamp && timestamp.seconds) {
    past = new Date(timestamp.seconds * 1000);
  } else {
    past = new Date(dateString);
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) return 'الآن';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    if (diffInHours === 1) return 'منذ ساعة';
    if (diffInHours === 2) return 'منذ ساعتين';
    return `منذ ${diffInHours} ساعات`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'أمس';
  if (diffInDays === 2) return 'منذ يومين';
  if (diffInDays < 30) return `منذ ${diffInDays} أيام`;
  
  return past.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function AnnouncementTicker({ announcements }) {
  if (!announcements || announcements.length === 0) {
    return (
      <div className="w-full text-center p-8 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
         لا توجد إعلانات حالياً
      </div>
    );
  }

  // Sorting Logic: Pinned First, then Newest First
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    const timeA = a.createdAt ? a.createdAt.seconds : new Date(a.date).getTime() / 1000;
    const timeB = b.createdAt ? b.createdAt.seconds : new Date(b.date).getTime() / 1000;
    
    return timeB - timeA;
  });

  const categoryStyles = {
    'Urgent': 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-500/50 text-red-900 dark:text-red-100',
    'Administrative': 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500/50 text-blue-900 dark:text-blue-100',
    'Academic': 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-100',
    'Event': 'bg-purple-50 dark:bg-purple-900/20 border-purple-400 dark:border-purple-500/50 text-purple-900 dark:text-purple-100',
  };

  const categoryLabels = {
    'Urgent': 'عاجل',
    'Administrative': 'إداري',
    'Academic': 'أكاديمي',
    'Event': 'حدث'
  };

  const categoryIcons = {
    'Urgent': <Bell className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse" />,
    'Administrative': <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    'Academic': <BookIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    'Event': <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
  };

  return (
    <div className="mb-12 space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-800 dark:text-slate-100 px-2">
        <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" /> إعلانات البوابة
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <AnimatePresence>
          {sortedAnnouncements.map((ann, i) => {
            const catStyle = categoryStyles[ann.category] || categoryStyles['Administrative'];
            const label = categoryLabels[ann.category] || categoryLabels['Administrative'];
            const icon = categoryIcons[ann.category] || categoryIcons['Administrative'];
            const timeAgo = timeAgoArabic(ann.date, ann.createdAt);

            return (
              <motion.div
                key={ann.id || i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={`relative flex flex-col justify-between p-5 lg:p-6 rounded-2xl border-2 shadow-sm hover:shadow-md transition-shadow ${catStyle}`}
              >
                {/* Pinned Ribbon */}
                {ann.isPinned && (
                  <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1 rounded-full shadow-sm flex items-center gap-1 border border-yellow-500">
                    <Pin className="w-3 h-3 fill-current" /> مثبت
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {/* Category Header & Time ago */}
                  <div className="flex justify-between items-start gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/60 dark:bg-slate-950/40 border border-current/10 ${ann.category === 'Urgent' ? 'shadow-[0_0_15px_rgba(239,68,68,0.3)]' : ''}`}>
                      {icon} {label}
                    </div>
                    <span className="text-xs font-medium opacity-70 whitespace-nowrap">{timeAgo}</span>
                  </div>

                  {/* Body Content */}
                  <p className="text-base lg:text-lg font-semibold leading-relaxed mt-2" dir="auto">
                    {ann.text}
                  </p>
                </div>

                {/* Smart Action Button */}
                {ann.externalLink && (
                  <div className="mt-6 pt-4 border-t border-current/10">
                    <a 
                      href={ann.externalLink} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900/5 dark:bg-white/10 hover:bg-slate-900/10 dark:hover:bg-white/20 rounded-xl font-bold transition-colors w-full md:w-auto justify-center group"
                    >
                      <LinkIcon className="w-4 h-4 opacity-70 group-hover:scale-110 transition-transform" />
                      {ann.linkText || 'عرض التفاصيل'}
                      <ChevronLeft className="w-4 h-4 opacity-50 absolute left-4 md:relative md:left-0" />
                    </a>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Simple fallback icons since lucide tree doesn't natively expose BookIcon directly as "BookIcon"
function InfoIcon(props) { return <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function BookIcon(props) { return <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>; }
