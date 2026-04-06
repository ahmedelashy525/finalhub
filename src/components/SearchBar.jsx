import React, { useState, useEffect, useRef } from 'react';
import { Search, X, History, Bell, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Robust normalizer handling typo tolerances and Arabic 'ال' prefixes
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/^ال/, '')
    .replace(/\sال/g, ' ');
};

export default function SearchBar({
  searchTerm,
  setSearchTerm,
  subjects = [],
  announcements = [],
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const inputRef = useRef(null);

  // Persistence: Load recent searches
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('recent_searches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (e) {}
  }, []);

  // Keyboard Shortcut '/'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debouncer (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSaveSearch = (term) => {
    const q = term.trim();
    if (!q) return;
    try {
      let updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5);
      setRecentSearches(updated);
      window.localStorage.setItem('recent_searches', JSON.stringify(updated));
    } catch (e) {}
  };

  const removeRecentSearch = (e, idx) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((_, i) => i !== idx);
      setRecentSearches(updated);
      window.localStorage.setItem('recent_searches', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleClear = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  // ------------------------------------
  // FILTER ENGINE — Subjects & Announcements only
  // ------------------------------------
  const normQuery = normalizeText(debouncedSearch);

  const filteredSubjects = (subjects || []).filter(s =>
    normalizeText(s.title).includes(normQuery)
  );

  const filteredAnnouncements = (announcements || []).filter(a =>
    normalizeText(a.text).includes(normQuery) ||
    normalizeText(a.category).includes(normQuery)
  );

  const hasResults = filteredSubjects.length > 0 || filteredAnnouncements.length > 0;
  const isSearching = normQuery.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative w-full max-w-3xl mx-auto mt-6 mb-8 group z-[100] text-right"
      dir="rtl"
    >
      {/* Search Input */}
      <div className={`relative flex items-center transition-all duration-300 ${isFocused ? 'ring-4 ring-blue-500/20 rounded-full shadow-2xl' : ''}`}>
        {/* Search icon – right side */}
        <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none">
          <Search className={`h-5 w-5 transition-colors duration-300 ${isFocused ? 'text-blue-500' : 'text-slate-400'}`} />
        </div>

        <input
          ref={inputRef}
          type="text"
          className="block w-full pr-12 pl-12 py-3.5 md:py-4 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:outline-none text-base md:text-lg transition-all shadow-sm"
          placeholder="ابحث عن المواد والإعلانات..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSaveSearch(searchTerm);
              inputRef.current?.blur();
              setIsFocused(false);
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        />

        {/* Left side: X clear button or / hint */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
          {searchTerm ? (
            <button
              onClick={handleClear}
              className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-slate-400 hover:text-red-500 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md hidden md:block border border-slate-200 dark:border-slate-700 shadow-inner select-none pointer-events-none">
              /
            </span>
          )}
        </div>
      </div>

      {/* DROPDOWN */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, pointerEvents: 'none' }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[65vh] flex flex-col z-[200]"
          >
            {/* Recent searches (empty state) */}
            {!isSearching ? (
              <div className="p-4 md:p-5">
                <h3 className="text-xs font-bold text-slate-500 flex items-center gap-2 mb-3 uppercase tracking-wider">
                  <History className="w-3.5 h-3.5" /> عمليات البحث الأخيرة
                </h3>
                {recentSearches.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, idx) => (
                      <button
                        key={idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchTerm(term);
                          inputRef.current?.focus();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        {term}
                        <div
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeRecentSearch(e, idx); }}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">لا توجد عمليات بحث سابقة.</p>
                )}
              </div>
            ) : (
              /* Search Results */
              <div className="overflow-y-auto p-3 md:p-4 space-y-4">
                {hasResults ? (
                  <>
                    {/* Subjects */}
                    {filteredSubjects.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 pb-2 mb-2 border-b border-blue-100 dark:border-blue-900/40 uppercase tracking-wider">
                          <Search className="w-3.5 h-3.5" /> المواد الدراسية ({filteredSubjects.length})
                        </h3>
                        <div className="flex flex-col gap-1">
                          {filteredSubjects.map(s => (
                            <div
                              key={s.id}
                              className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 text-right cursor-pointer group/item select-none"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSaveSearch(searchTerm);
                                setIsFocused(false);
                                setSearchTerm('');
                              }}
                            >
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover/item:text-blue-400 shrink-0 transition-colors transform -scale-x-100" />
                              <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate mr-2 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                                {s.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Announcements */}
                    {filteredAnnouncements.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pb-2 mb-2 border-b border-amber-100 dark:border-amber-900/40 uppercase tracking-wider">
                          <Bell className="w-3.5 h-3.5" /> الإعلانات ({filteredAnnouncements.length})
                        </h3>
                        <div className="flex flex-col gap-1">
                          {filteredAnnouncements.slice(0, 4).map(a => (
                            <div
                              key={a.id}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-900/20 border border-transparent"
                            >
                              <div className="flex flex-col truncate gap-1">
                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{a.text}</span>
                                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 w-fit px-2 py-0.5 rounded-full">
                                  {a.category || 'عام'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* No Results */
                  <div className="py-10 flex flex-col items-center justify-center text-center">
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full mb-3">
                      <Search className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                      لا توجد نتائج لـ "<span className="text-blue-500">{debouncedSearch}</span>"
                    </p>
                    <p className="text-sm text-slate-500 mb-4">تأكد من الكلمات أو حاول مصطلحًا آخر.</p>
                    <button
                      onClick={(e) => { e.preventDefault(); handleClear(); }}
                      className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-sm font-bold transition-colors"
                    >
                      مسح البحث
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
