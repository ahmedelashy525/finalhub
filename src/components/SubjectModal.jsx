import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, PlayCircle, FileText, Database, Eye, Download, Share2, CheckCircle, Loader2, Headphones } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Converts /view to /preview for iframes
const transformDriveUrlForIframe = (url) => {
  if (!url) return '';
  return url.replace(/\/view.*$/, '/preview');
};

const getYouTubeIframeUrl = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
};

const formatWhatsAppLink = (m, subjectTitle) => {
  const text = `ألقِ نظرة على ${m.title} لمادة ${subjectTitle}:\n${m.link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

export default function SubjectModal({ isOpen, onClose, subjectData, searchTerm }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [doneFiles, setDoneFiles] = useState([]);
  const [fetchedMaterials, setFetchedMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('doneFiles') || '[]');
      setDoneFiles(saved);
    } catch(e) {}
  }, []);

  // Ref to prevent double-pop back-loop:
  // true  → modal was closed BY the hardware back button (popstate already consumed the state)
  // false → modal was closed by X / backdrop click (cleanup must pop the dummy state)
  const closedByPopstateRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !subjectData?.id) return;

    // 1. Push a dummy history entry so the back button targets THIS state
    window.history.pushState({ modalOpen: true }, '', window.location.pathname);
    closedByPopstateRef.current = false;

    // 2. Fetch materials for this subject
    const fetchMats = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'materials'), where('subject', '==', subjectData.id));
        const snap = await getDocs(q);
        setFetchedMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
      setLoading(false);
    };
    fetchMats();

    // 3. Intercept the hardware / browser back button
    const handlePopState = (e) => {
      // The browser already consumed the dummy state — just close the modal
      closedByPopstateRef.current = true;
      onClose();
    };
    window.addEventListener('popstate', handlePopState);

    // 4. Cleanup: remove listener; pop dummy state only if back wasn't pressed
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!closedByPopstateRef.current && window.history.state?.modalOpen) {
        // Closed via X / backdrop — clean up the dummy history entry
        window.history.back();
      }
    };
  }, [isOpen, subjectData?.id]);

  const toggleDone = (id) => {
    const updated = doneFiles.includes(id) 
      ? doneFiles.filter(item => item !== id)
      : [...doneFiles, id];
    
    setDoneFiles(updated);
    try {
      localStorage.setItem('doneFiles', JSON.stringify(updated));
    } catch(e){}
  };

  if (!isOpen) return null;

  const subjectTitle = subjectData?.title || 'Subject';

  const filteredMaterials = fetchedMaterials?.filter(m => 
    searchTerm === '' || m.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const categories = Array.from(new Set(filteredMaterials.map(m => m.category).filter(Boolean)));

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white/20 dark:border-slate-700/50"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 md:p-8 flex items-center justify-between border-b dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/50">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {subjectTitle} Materials
                </h2>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto space-y-10 flex-grow" dir="rtl">
                
                {loading && (
                  <div className="flex flex-col items-center justify-center py-20 text-blue-500">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p className="font-bold">جاري تحميل المحتويات...</p>
                  </div>
                )}
                
                {!loading && fetchedMaterials.length === 0 && (
                  <div className="text-center py-20 flex flex-col items-center justify-center opacity-70">
                    <Database className="w-16 h-16 text-slate-400 mb-4" />
                    <p className="text-lg font-bold text-slate-500">لا توجد محتويات مضافة في هذه المادة حتى الآن.</p>
                  </div>
                )}

                {!loading && categories.map(cat => {
                  const catMaterials = filteredMaterials.filter(m => m.category === cat);
                  if (catMaterials.length === 0) return null;
                  
                  const getIcon = () => {
                    if (cat === 'Lectures') return <PlayCircle className="w-5 h-5" />;
                    if (cat === 'Summaries') return <FileText className="w-5 h-5" />;
                    if (cat === 'Practical') return <Database className="w-5 h-5" />;
                    return <FileText className="w-5 h-5" />;
                  }

                  return (
                    <div key={cat} className="space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <span className="text-blue-500">{getIcon()}</span> {cat}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                        {catMaterials.map(m => {
                          const isDone = doneFiles.includes(m.id);
                          const isNew = m.createdAt && (new Date() - new Date(m.createdAt.seconds * 1000) < 48 * 60 * 60 * 1000);

                          return (
                            <div 
                              key={m.id}
                              dir="rtl"
                              className={`flex flex-col p-4 rounded-xl transition-all border ${isDone ? 'bg-green-50/40 border-green-200 dark:bg-green-900/10 dark:border-green-800/30' : 'bg-slate-50 hover:bg-white border-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:border-slate-700'} group relative gap-4`}
                            >
                              <div className="flex justify-between items-start w-full">
                                <div className="flex items-center gap-2">
                                   <div className={`p-1.5 rounded-lg ${isDone ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                                      {getIcon()}
                                   </div>
                                   <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg leading-tight line-clamp-2">
                                     {m.title}
                                   </h4>
                                   {isNew && !isDone && (
                                     <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/80 dark:text-blue-300 text-[10px] uppercase font-black px-2 py-0.5 rounded-full shrink-0">
                                       جديد
                                     </span>
                                   )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                   <button 
                                     onClick={() => toggleDone(m.id)}
                                     className={`p-1.5 rounded-full min-w-max transition-colors ${isDone ? 'bg-green-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 hover:bg-green-100 hover:text-green-600'}`}
                                     title="علامة الانتهاء"
                                   >
                                     <CheckCircle className="w-5 h-5" />
                                   </button>
                                </div>
                              </div>

                              <div className="w-full mt-auto flex flex-col gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                <button 
                                  onClick={() => setPreviewUrl(m.link)}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-transform active:scale-95 shadow-md"
                                >
                                  {getYouTubeIframeUrl(m.link) ? <><PlayCircle className="w-5 h-5" /> مشاهدة الفيديو</> : <><Eye className="w-5 h-5" /> عرض الملف</>}
                                </button>
                                
                                {m.audioUrl && (
                                  <a 
                                    href={m.audioUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-transform active:scale-95 shadow-md"
                                  >
                                    <Headphones className="w-5 h-5" /> استماع للتسجيل الصوتي
                                  </a>
                                )}
                                
                                <div className="flex items-center gap-2 w-full mt-1">
                                  <a 
                                    href={m.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors border border-transparent dark:border-slate-700 hover:border-slate-300"
                                    title="تحميل / فتح الملف الأصلي"
                                  >
                                    <Download className="w-4 h-4" /> الرابط الأصلي
                                  </a>
                                  <a 
                                    href={formatWhatsAppLink(m, subjectTitle)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl flex items-center justify-center transition-colors"
                                    title="مشاركة عبر واتساب"
                                  >
                                    <Share2 className="w-5 h-5" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {!loading && fetchedMaterials.length > 0 && filteredMaterials.length === 0 && (
                  <div className="text-center py-20 flex flex-col items-center justify-center opacity-60">
                    <Database className="w-16 h-16 text-slate-400 mb-4" />
                    <p className="text-lg font-medium text-slate-500">لا توجد مواد مطابقة لـ "{searchTerm}"</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Drive Preview Overlay */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-6 bg-black/90 backdrop-blur-md"
            onClick={() => setPreviewUrl(null)}
          >
            <div 
              className="w-full h-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 flex items-center justify-between border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">معاينة الملف (Preview)</h3>
                <div className="flex items-center gap-2">
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                     <ExternalLink className="w-4 h-4" /> فتح في نافذة جديدة
                  </a>
                  <button onClick={() => setPreviewUrl(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 w-full relative outline-none border-none">
                 <iframe 
                   src={getYouTubeIframeUrl(previewUrl) ? getYouTubeIframeUrl(previewUrl) : transformDriveUrlForIframe(previewUrl)}
                   className="absolute inset-0 w-full h-full border-0"
                   allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
                   title="Document Preview"
                 />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
