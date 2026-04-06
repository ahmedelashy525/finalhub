import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { Activity, Beaker, CheckCircle2, ChevronRight, XCircle, Share2, Award, Clock, Star, Medal, Zap, Trophy, Crown, AlertTriangle, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getSyncTime } from '../utils/timeSync';

// Rank Mapping Algorithm
const getRankConfig = (streakCount) => {
  if (streakCount >= 30) return { title: 'بروفيسور عبقري 🔥', icon: Crown, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30 font-black' };
  if (streakCount >= 14) return { title: 'استشاري قدير 🏆', icon: Trophy, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' };
  if (streakCount >= 7)  return { title: 'أخصائي محترف ⚕️', icon: Zap, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
  if (streakCount >= 3)  return { title: 'طبيب مقيم 🩺', icon: Medal, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
  return { title: 'طالب امتياز 🎓', icon: Star, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' };
};

// Generate a date-based localStorage key that naturally invalidates at midnight
const getTodayCacheKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `quest_${y}_${m}_${d}`;
};

export default function DiagnosisQuest() {
  const [quest, setQuest] = useState(null);
  const [stats, setStats] = useState({ counts: {}, total: 0 });
  const [hasAnswered, setHasAnswered] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [streak, setStreak] = useState(0);
  const [midnightTimer, setMidnightTimer] = useState('');
  const [shake, setShake] = useState(false);
  const [isExpOpen, setIsExpOpen] = useState(false);

  // One-time fetch with date-keyed localStorage cache
  useEffect(() => {
    let isMounted = true;

    const loadQuest = async () => {
      const todayKey = getTodayCacheKey();

      // 1. Check localStorage first — zero Firebase reads if cache hit
      try {
        const cached = JSON.parse(localStorage.getItem(todayKey) || 'null');
        if (cached?.quest) {
          if (isMounted) {
            setQuest(cached.quest);
            setStats(cached.stats || { counts: {}, total: 0 });
          }
          return; // Cache hit — skip all Firebase calls
        }
      } catch (e) {}

      // 2. Cache miss — fetch quest ONCE from Firebase
      try {
        const q = query(collection(db, 'quests'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        if (!snapshot.empty && isMounted) {
          const latestQuest = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

          // 3. Fetch stats ONCE for this quest
          let questStats = { counts: {}, total: 0 };
          try {
            const statsSnap = await getDoc(doc(db, 'quest_stats', latestQuest.id));
            if (statsSnap.exists()) questStats = statsSnap.data();
          } catch (e) {}

          // 4. Store in date-keyed cache — auto-invalidates tomorrow
          try {
            localStorage.setItem(todayKey, JSON.stringify({ quest: latestQuest, stats: questStats }));
          } catch (e) {}

          if (isMounted) {
            setQuest(latestQuest);
            setStats(questStats);
          }
        } else if (isMounted) {
          setQuest(null);
        }
      } catch (err) {
        console.error('DiagnosisQuest fetch error:', err);
      }
    };

    loadQuest();
    return () => { isMounted = false; };
  }, []);

  // Client Integrity Vault — check localStorage for prior answer to today's quest
  useEffect(() => {
    if (!quest) return;

    try {
      const vault = JSON.parse(localStorage.getItem('user_quest_vault') || '{}');
      const streakInfo = JSON.parse(localStorage.getItem('user_streak') || '{"count": 0, "lastDate": 0}');
      const serverNow = getSyncTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      let currentStreak = streakInfo.count;
      if (streakInfo.lastDate > 0 && (serverNow - streakInfo.lastDate > twentyFourHours)) {
        const questRecord = vault[quest.id];
        if (!questRecord || (serverNow - questRecord.timestamp > twentyFourHours)) {
          currentStreak = 0;
          localStorage.setItem('user_streak', JSON.stringify({ count: 0, lastDate: 0 }));
        }
      }

      setStreak(currentStreak);

      const record = vault[quest.id];
      if (record?.answered) {
        setHasAnswered(true);
        setEvaluation({ isCorrect: record.isCorrect, selectedIndex: record.selectedIndex });
      } else {
        setHasAnswered(false);
        setEvaluation(null);
      }
    } catch (e) {}
  }, [quest]);

  // Midnight Countdown — client-side only, cleared on unmount
  useEffect(() => {
    if (!hasAnswered) return;

    const timerId = setInterval(() => {
      const syncTime = getSyncTime();
      const now = new Date(syncTime);
      const tomorrow = new Date(syncTime);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow - now;

      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setMidnightTimer(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timerId);
  }, [hasAnswered]);

  // Answer submission — only Firebase write is the stats increment on actual answer
  const handleSelect = async (idx, e) => {
    e.stopPropagation();
    if (hasAnswered) return;

    const syncNow = getSyncTime();
    const todayBoundary = new Date(syncNow);
    todayBoundary.setHours(0, 0, 0, 0);
    if (quest.createdAt < todayBoundary.getTime() - 86400000) return;

    setHasAnswered(true);
    const correctIdx = Number(quest.correctAnswerIndex);
    const isVerdictCorrect = idx === correctIdx;
    setEvaluation({ isCorrect: isVerdictCorrect, selectedIndex: idx });

    // Optimistic local stats update — no listener needed
    setStats(prev => {
      const currentTotal = prev?.total || 0;
      const currentCounts = prev?.counts || {};
      return {
        total: currentTotal + 1,
        counts: { ...currentCounts, [Number(idx)]: (currentCounts[Number(idx)] || 0) + 1 }
      };
    });

    // Single write to Firebase on submission
    try {
      await setDoc(doc(db, 'quest_stats', quest.id), {
        total: increment(1),
        [`counts.${idx}`]: increment(1)
      }, { merge: true });
    } catch (e) {}

    // Vault update
    const vault = JSON.parse(localStorage.getItem('user_quest_vault') || '{}');
    vault[quest.id] = { answered: true, isCorrect: isVerdictCorrect, selectedIndex: idx, timestamp: syncNow };
    localStorage.setItem('user_quest_vault', JSON.stringify(vault));

    // Streak update
    if (isVerdictCorrect) {
      const newStreak = streak + 1;
      localStorage.setItem('user_streak', JSON.stringify({ count: newStreak, lastDate: syncNow }));
      setStreak(newStreak);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#10b981', '#f59e0b'] });
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      localStorage.setItem('user_streak', JSON.stringify({ count: 0, lastDate: syncNow }));
      setStreak(0);
    }
  };

  const constructWhatsAppText = () => {
    if (!evaluation) return '';
    const text = evaluation.isCorrect
      ? `أكملت لغز التشخيص الطبي لليوم بنجاح! 🔥\nرتبتي الحالية: ${getRankConfig(streak).title}\nالـ Streak الخاص بي: ${streak} أيام متواصلة! 💪\nهل يمكنك التغلب علي؟`
      : `حاولت حل لغز التشخيص الطبي لليوم على منصة MedPortal الطبي!\nشارك في التحدي واختبر معلوماتك السريرية الآن!`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  if (!quest) return null;

  const currentRank = getRankConfig(streak);
  const RankIcon = currentRank.icon;
  const safeTotal = stats?.total || 0;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-8 shadow-xl overflow-hidden relative" dir="rtl">
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col gap-5 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 md:p-3 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl md:rounded-2xl shadow-sm shrink-0">
              <Activity className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-xl font-black text-slate-800 dark:text-white leading-tight">لغز التشخيص</h2>
              <p className="text-[10px] md:text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">Clinical Case Study</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <Award className={`w-4 h-4 md:w-5 md:h-5 text-orange-500 transition-all ${streak > 0 ? 'animate-pulse drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]' : 'opacity-40'}`} />
            <span className="font-extrabold text-slate-700 dark:text-slate-200 text-sm md:text-base">{streak}</span>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Streak</span>
            {streak > 0 && (
              <span className="hidden md:inline-flex ml-1 items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                🔥 {streak > 1 ? `${streak} يوم` : 'يوم واحد'}
              </span>
            )}
          </div>
        </div>

        {/* Patient Profile Card */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-2 text-xs md:text-sm bg-blue-100/50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
              <Beaker className="w-4 h-4" /> Patient Profile
            </span>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase" dir="ltr">
              {quest.patientInfo?.age} Yrs • {quest.patientInfo?.gender}
            </span>
          </div>
          <h3 className="text-right text-base md:text-lg font-bold leading-relaxed text-slate-800 dark:text-slate-200 mb-3">{quest.title}</h3>
          <p className="text-right text-slate-600 dark:text-slate-400 text-sm md:text-base leading-loose font-medium">{quest.symptoms}</p>
        </div>

        {/* Answer Options */}
        <motion.div
          className="flex flex-col gap-4"
          animate={{ x: shake ? [-10, 10, -10, 10, 0] : 0 }}
        >
          {quest.options?.map((opt, idx) => {
            const isCorrectAnswer = idx === Number(quest.correctAnswerIndex);
            const didSelectThis = evaluation?.selectedIndex === idx;
            const selectionCount = stats?.counts?.[idx] || 0;
            const percentage = safeTotal > 0 ? Math.round((selectionCount / safeTotal) * 100) : 0;

            let baseStyles = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200";
            let DynamicIcon = () => <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />;

            if (hasAnswered) {
              if (isCorrectAnswer) {
                baseStyles = "bg-emerald-500 border-emerald-500 text-white shadow-lg scale-[1.01]";
                DynamicIcon = () => <CheckCircle2 className="w-6 h-6 text-white shrink-0" />;
              } else if (didSelectThis && !isCorrectAnswer) {
                baseStyles = "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900 text-red-600 dark:text-red-400";
                DynamicIcon = () => <XCircle className="w-6 h-6 text-red-500 shrink-0" />;
              } else {
                baseStyles = "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-70 grayscale-[50%]";
                DynamicIcon = () => null;
              }
            }

            return (
              <button
                key={idx}
                onClick={(e) => handleSelect(idx, e)}
                disabled={hasAnswered}
                className={`relative overflow-hidden flex flex-col ${hasAnswered ? 'p-2 md:p-3' : 'p-4 md:p-5'} rounded-2xl border text-right transition-all duration-300 group ${baseStyles}`}
              >
                {hasAnswered && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`absolute top-0 right-0 h-full z-0 ${isCorrectAnswer ? 'bg-white/20' : (didSelectThis ? 'bg-red-500/10' : 'bg-slate-300/30 dark:bg-slate-600/30')}`}
                  />
                )}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <div className="flex flex-col gap-1 w-[85%]">
                    <span className={`font-bold whitespace-normal ${hasAnswered && isCorrectAnswer ? 'text-lg text-white' : ''} leading-relaxed`}>{opt}</span>
                    {hasAnswered && (
                      <span className={`text-[11px] font-black tracking-wider uppercase opacity-90 mt-1 flex items-center ${isCorrectAnswer ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {percentage}%
                      </span>
                    )}
                  </div>
                  <DynamicIcon />
                </div>
              </button>
            );
          })}
        </motion.div>

        {/* Post-solve HUD */}
        <AnimatePresence>
          {hasAnswered && evaluation && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
              className="flex flex-col gap-3 mt-4 relative z-10"
            >
              {evaluation.isCorrect ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-3 flex flex-row items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500 rounded-full flex items-center justify-center shadow-inner shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-emerald-700 dark:text-emerald-400">عاش يا دكتور! 🥳</h3>
                  </div>
                  <div className={`px-4 py-1.5 rounded-xl flex items-center gap-2 shadow-inner border border-emerald-100 dark:border-emerald-800 ${currentRank.bg}`}>
                    <RankIcon className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-l from-emerald-600 to-teal-500">
                      {currentRank.title}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-full flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-red-700 dark:text-red-400">إجابة خاطئة!</h3>
                      <p className="text-red-600 dark:text-red-300 font-bold text-xs mt-0.5">تم تصفير الـ Streak.</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-2 text-slate-800 dark:text-slate-200 font-bold text-sm shadow-sm text-center">
                    الصح: {quest.options[quest.correctAnswerIndex]}
                  </div>
                </div>
              )}

              {/* Scientific Explanation */}
              <div className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-inner transition-all">
                <button
                  onClick={() => setIsExpOpen(!isExpOpen)}
                  className="w-full flex items-center justify-between p-4 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-150"
                >
                  <span className="flex items-center gap-2 text-sm font-bold tracking-wider"><Beaker className="w-5 h-5 text-blue-500" /> التفسير العلمي للحالة</span>
                  <ChevronDown className={`w-5 h-5 opacity-60 transition-transform duration-150 ease-out ${isExpOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isExpOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="px-4 pb-4 pt-1"
                    >
                      <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed text-right border-t border-slate-200 dark:border-slate-700 pt-3">{quest.explanation}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Next Quest Tracker */}
              <div className="flex flex-row items-center gap-3 w-full mt-1">
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 flex items-center justify-center gap-3 shadow-inner">
                  <Clock className="w-5 h-5 text-slate-500 hidden sm:block" />
                  <div className="flex flex-col text-center sm:text-right">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight">التحدي القادم</span>
                    <span className="text-sm sm:text-base font-black text-slate-800 dark:text-white tracking-widest leading-none" dir="ltr">{midnightTimer}</span>
                  </div>
                </div>
                <a
                  href={constructWhatsAppText()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-[1.5] w-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center gap-2 py-3 px-2 sm:px-4 rounded-2xl font-bold transition shadow-md shadow-[#25D366]/20 active:scale-95 text-sm sm:text-base text-center"
                >
                  <Share2 className="w-4 h-4 shrink-0" /> <span className="line-clamp-1">{evaluation.isCorrect ? 'شارك إنجازك' : 'تحدى أصدقاءك!'}</span>
                </a>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
