import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Target } from 'lucide-react';

export default function HeroTimer() {
  // Step 4: State holds the fetched deadline object
  const [deadlineDate, setDeadlineDate] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  // Step 3: One-time fetch — empty dependency array [] guarantees single execution
  // No custom hooks. Direct Firebase import only. No onSnapshot anywhere.
  useEffect(() => {
    let cancelled = false;

    async function fetchDeadlineOnce() {
      try {
        // Direct getDocs call — one HTTP request, no persistent channel
        const snapshot = await getDocs(collection(db, 'deadlines'));
        if (cancelled) return;

        const now = Date.now();
        const docs = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => Number(d.targetDate) > now)
          .sort((a, b) => Number(a.targetDate) - Number(b.targetDate));

        setDeadlineDate(docs.length > 0 ? docs[0] : null);
      } catch (err) {
        if (!cancelled) console.error('[HeroTimer] fetch failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDeadlineOnce();

    // Cleanup: cancel any pending setState if component unmounts before fetch completes
    return () => { cancelled = true; };
  }, []); // ← empty array: runs ONCE on mount only

  // Step 5: Client-side countdown driven entirely by setInterval — no Firebase involved
  // Step 6: clearInterval in the cleanup return to prevent memory leaks
  useEffect(() => {
    if (!deadlineDate) {
      setTimeLeft(null);
      return;
    }

    function computeTimeLeft() {
      const now = Date.now();
      const start = Number(deadlineDate.createdAt);
      const target = Number(deadlineDate.targetDate);
      const diff = target - now;

      // Progress bar calculation
      let pct = 0;
      if (now >= target) {
        pct = 100;
      } else if (now > start && target > start) {
        pct = ((now - start) / (target - start)) * 100;
      }
      setProgress(Math.min(Math.max(pct, 0), 100));

      if (diff > 0) {
        return {
          days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    // Set immediately so there's no 1-second blank on first render
    setTimeLeft(computeTimeLeft());

    // Tick every second — pure client-side, zero Firebase reads
    const intervalId = setInterval(() => setTimeLeft(computeTimeLeft()), 1000);

    // Step 6: Memory leak prevention — interval cleared on unmount or deadlineDate change
    return () => clearInterval(intervalId);
  }, [deadlineDate]); // ← depends only on the fetched deadline object

  if (loading || !deadlineDate || !timeLeft) return null;

  // Visual theme derived from importance field
  let colorTheme  = 'text-blue-600 dark:text-blue-400';
  let bgColorClass = 'from-blue-500 to-cyan-400';
  let borderClass  = 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800/80';
  let badgeColor   = 'bg-blue-600';

  if (deadlineDate.importance === 'High') {
    colorTheme   = 'text-red-600 dark:text-red-400';
    bgColorClass = 'bg-red-500';
    borderClass  = 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 pulse-shadow';
    badgeColor   = 'bg-red-600 animate-pulse';
  } else if (deadlineDate.importance === 'Medium') {
    colorTheme   = 'text-orange-600 dark:text-orange-400';
    bgColorClass = 'from-orange-500 to-amber-500';
    borderClass  = 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/40';
    badgeColor   = 'bg-orange-500';
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-col w-full max-w-2xl mx-auto mt-4 md:mt-0 backdrop-blur-3xl shadow-xl px-6 pt-5 pb-6 rounded-3xl border relative overflow-hidden ${borderClass}`}
      dir="rtl"
    >
      {deadlineDate.importance === 'High' && (
        <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl text-white ${badgeColor}`}>
            <Target className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-black text-slate-900 dark:text-white line-clamp-1">
              {deadlineDate.title}
            </span>
            <span className={`text-xs font-bold tracking-wide mt-0.5 ${colorTheme} opacity-80`}>
              الوقت المتبقي للهدف
            </span>
          </div>
        </div>

        {/* Digital clock display */}
        <div
          className="flex items-center gap-3 md:gap-4 bg-slate-100/50 dark:bg-slate-950/50 px-4 py-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shrink-0"
          dir="ltr"
        >
          {[
            { value: timeLeft.days,    label: 'Days' },
            { value: timeLeft.hours,   label: 'Hrs'  },
            { value: timeLeft.minutes, label: 'Mins' },
            { value: timeLeft.seconds, label: 'Secs' },
          ].map(({ value, label }, i) => (
            <React.Fragment key={label}>
              {i > 0 && (
                <span className="text-xl font-bold text-slate-300 dark:text-slate-700 pb-4">:</span>
              )}
              <div className="flex flex-col items-center min-w-[3rem]">
                <span className={`text-2xl font-black ${colorTheme}`}>
                  {String(value).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                  {label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-2 w-full z-10" dir="ltr">
        <div className="flex justify-between items-center text-xs font-bold text-slate-500 relative px-1">
          <span className="opacity-80">Start</span>
          <span className={`absolute left-1/2 transform -translate-x-1/2 ${colorTheme}`}>
            {progress.toFixed(0)}% Complete
          </span>
          <span className="opacity-80">Target</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden shadow-inner p-0.5 border border-slate-300 dark:border-slate-700/50">
          <motion.div
            className={`h-full rounded-full relative overflow-hidden ${bgColorClass}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'linear', duration: 1 }}
          >
            <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
