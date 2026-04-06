import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, deleteDoc, doc, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Trash2, LogOut, Save, BookOpen, Bell, Activity, Menu, X, CheckCircle, Calendar, Clock, Database, RefreshCw, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getIconMap, ColorDictionary, IconDictionary } from '../utils/subjectMappers';

const PAGE_LIMIT = 20;

const TAB_CONFIG = {
  materials:     { col: 'materials',     orderField: 'createdAt', dir: 'desc' },
  announcements: { col: 'announcements', orderField: 'date',      dir: 'desc' },
  quest:         { col: 'quests',        orderField: 'createdAt', dir: 'desc' },
  settings:      { col: 'deadlines',     orderField: 'createdAt', dir: 'desc' },
  subjects:      { col: 'subjects',      orderField: 'createdAt', dir: 'asc'  },
};

export default function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('materials');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // In-memory cache: { [tab]: { docs: [], lastDoc, hasMore } }
  const [tabCache, setTabCache] = useState({});
  const [tabLoading, setTabLoading] = useState({});
  // Subjects fetched once — needed in MaterialSection form dropdown
  const [subjectsCache, setSubjectsCache] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  // Track which tabs have been fetched — stored in a ref so it never
  // triggers a re-render or causes the useEffect to re-fire.
  const fetchedTabsRef = React.useRef(new Set());
  const subjectsFetchedRef = React.useRef(false);

  // Fetch subjects once for the MaterialSection form dropdown
  useEffect(() => {
    if (!user || subjectsFetchedRef.current) return;
    subjectsFetchedRef.current = true;
    async function fetchSubjects() {
      try {
        const snap = await getDocs(query(collection(db, 'subjects'), orderBy('createdAt', 'asc'), limit(PAGE_LIMIT)));
        console.log('Admin Data Fetched at:', new Date().toLocaleTimeString(), '— subjects');
        setSubjectsCache(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {}
    }
    fetchSubjects();
  }, [user]);

  // Tab-based lazy loading: each tab fetched exactly ONCE per session.
  // fetchedTabsRef (a Set inside a ref) tracks visited tabs so this effect
  // never re-fires on state updates — only when activeTab or user changes.
  useEffect(() => {
    if (!user) return;
    if (fetchedTabsRef.current.has(activeTab)) return; // cache hit — skip
    fetchedTabsRef.current.add(activeTab);
    const cfg = TAB_CONFIG[activeTab];
    setTabLoading(prev => ({ ...prev, [activeTab]: true }));
    async function doFetch() {
      try {
        const q = query(collection(db, cfg.col), orderBy(cfg.orderField, cfg.dir), limit(PAGE_LIMIT));
        const snap = await getDocs(q);
        console.log('Admin Data Fetched at:', new Date().toLocaleTimeString(), '— tab:', activeTab);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const lastDoc = snap.docs[snap.docs.length - 1] || null;
        setTabCache(prev => ({ ...prev, [activeTab]: { docs, lastDoc, hasMore: snap.docs.length === PAGE_LIMIT } }));
      } catch (e) { console.error('[Admin] fetch error:', e); }
      finally { setTabLoading(prev => ({ ...prev, [activeTab]: false })); }
    }
    doFetch();
  }, [activeTab, user]);

  const handleLoadMore = useCallback(async (tab) => {
    const cached = tabCache[tab];
    if (!cached?.hasMore || !cached?.lastDoc) return;
    const cfg = TAB_CONFIG[tab];
    setTabLoading(prev => ({ ...prev, [tab]: true }));
    try {
      const q = query(collection(db, cfg.col), orderBy(cfg.orderField, cfg.dir), startAfter(cached.lastDoc), limit(PAGE_LIMIT));
      const snap = await getDocs(q);
      const newDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const lastDoc = snap.docs[snap.docs.length - 1] || cached.lastDoc;
      setTabCache(prev => ({
        ...prev,
        [tab]: { docs: [...cached.docs, ...newDocs], lastDoc, hasMore: snap.docs.length === PAGE_LIMIT }
      }));
    } catch (e) {}
    finally { setTabLoading(prev => ({ ...prev, [tab]: false })); }
  }, [tabCache]);

  const handleRefresh = useCallback((tab) => {
    fetchedTabsRef.current.delete(tab); // allow useEffect to re-fetch this tab
    setTabCache(prev => { const n = { ...prev }; delete n[tab]; return n; });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthError('');
    } catch (err) {
      setAuthError('بيانات الاعتماد غير صالحة أو تم رفض الوصول.');
    }
  };

  const handleLogout = () => signOut(auth);

  if (!user) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card max-w-md w-full p-8 rounded-3xl shadow-2xl bg-white dark:bg-slate-800 z-50">
          <h2 className="text-2xl font-bold text-center mb-6 text-slate-800 dark:text-white"> Admin Login </h2>
          {authError && <div className="p-3 mb-4 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 rounded-lg">{authError}</div>}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300"> User Name </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300"> Password </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100" required />
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg z-50 relative mt-2 text-center flex justify-center items-center">
              Login
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-blue-500 text-sm hover:text-blue-700 dark:hover:text-blue-400 transition">← Back to Home</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans text-sm md:text-base">

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between border-b border-slate-800 bg-slate-900 text-white p-4 shrink-0 shadow-md">
        <h1 className="text-xl font-black flex items-center gap-2"> Dash </h1>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(isMobileMenuOpen || window.innerWidth >= 768) && (
          <>
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="md:hidden fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm" />
            )}

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className={`fixed md:relative inset-y-0 right-0 w-64 md:w-72 bg-slate-900 dark:bg-slate-950 border-l border-slate-800 text-white flex flex-col shadow-2xl z-[70] shrink-0`}
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h1 className="text-2xl font-black text-white hidden md:flex items-center gap-2">لوحة المشرف</h1>
                <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
                <button onClick={() => { setActiveTab('materials'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 p-4 rounded-xl transition-all font-medium text-right ${activeTab === 'materials' ? 'bg-blue-600 shadow-lg text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
                  <BookOpen className="w-5 h-5 shrink-0" /> إدارة المحتوى
                </button>
                <button onClick={() => { setActiveTab('announcements'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 p-4 rounded-xl transition-all font-medium text-right ${activeTab === 'announcements' ? 'bg-blue-600 shadow-lg text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
                  <Bell className="w-5 h-5 shrink-0" /> الإعلانات
                </button>
                <button onClick={() => { setActiveTab('quest'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 p-4 rounded-xl transition-all font-medium text-right ${activeTab === 'quest' ? 'bg-blue-600 shadow-lg text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
                  <Activity className="w-5 h-5 shrink-0" /> سؤال اليوم
                </button>
                <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 p-4 rounded-xl transition-all font-medium text-right ${activeTab === 'settings' ? 'bg-blue-600 shadow-lg text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
                  <Calendar className="w-5 h-5 shrink-0" /> المواعيد النهائية ⏳
                </button>
                <button onClick={() => { setActiveTab('subjects'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 p-4 rounded-xl transition-all font-medium text-right ${activeTab === 'subjects' ? 'bg-blue-600 shadow-lg text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
                  <Database className="w-5 h-5 shrink-0" /> الأقسام والمواد
                </button>
              </nav>
              <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
                <Link to="/" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium">
                  <ArrowRight className="w-5 h-5 shrink-0" /> الواجهة الرئيسية
                </Link>
                <button onClick={handleLogout} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-900/30 text-red-400 hover:bg-red-900/60 transition font-medium mt-2 text-right">
                  <LogOut className="w-5 h-5 shrink-0" /> تسجيل الخروج
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Form Content Area */}
      <main className="flex-1 overflow-y-auto w-full bg-slate-100 dark:bg-slate-800/50 p-4 md:p-10 relative">
        <div className="max-w-5xl mx-auto space-y-8 pb-16">
          {activeTab === 'materials' && (
            <MaterialSection
              list={tabCache['materials']?.docs || []}
              subjects={subjectsCache}
              loading={!!tabLoading['materials']}
              hasMore={!!tabCache['materials']?.hasMore}
              onLoadMore={() => handleLoadMore('materials')}
              onRefresh={() => handleRefresh('materials')}
            />
          )}
          {activeTab === 'announcements' && (
            <AnnouncementSection
              list={tabCache['announcements']?.docs || []}
              loading={!!tabLoading['announcements']}
              hasMore={!!tabCache['announcements']?.hasMore}
              onLoadMore={() => handleLoadMore('announcements')}
              onRefresh={() => handleRefresh('announcements')}
            />
          )}
          {activeTab === 'quest' && (
            <QuestSection
              list={tabCache['quest']?.docs || []}
              loading={!!tabLoading['quest']}
              hasMore={!!tabCache['quest']?.hasMore}
              onLoadMore={() => handleLoadMore('quest')}
              onRefresh={() => handleRefresh('quest')}
            />
          )}
          {activeTab === 'settings' && (
            <DeadlinesSection
              list={tabCache['settings']?.docs || []}
              loading={!!tabLoading['settings']}
              hasMore={!!tabCache['settings']?.hasMore}
              onLoadMore={() => handleLoadMore('settings')}
              onRefresh={() => handleRefresh('settings')}
            />
          )}
          {activeTab === 'subjects' && (
            <SubjectSection
              list={tabCache['subjects']?.docs || []}
              loading={!!tabLoading['subjects']}
              hasMore={!!tabCache['subjects']?.hasMore}
              onLoadMore={() => handleLoadMore('subjects')}
              onRefresh={() => handleRefresh('subjects')}
            />
          )}
        </div>
      </main>

    </div>
  );
}

// -------------------------------------------------------------
// Core Sections
// -------------------------------------------------------------

function MaterialSection({ list = [], subjects = [], loading, hasMore, onLoadMore, onRefresh }) {
  const [form, setForm] = useState({ title: '', link: '', audioUrl: '', subject: subjects.length > 0 ? subjects[0].id : '', category: 'Lectures' });
  const [saving, setSaving] = useState(false);

  // Synchronise state safely if subjects arrive late over the network
  useEffect(() => {
    if (subjects.length > 0 && !form.subject) {
      setForm(prev => ({ ...prev, subject: subjects[0].id }));
    }
  }, [subjects]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.link) { alert('الرجاء إدخال الرابط الأساسي.'); return; }
    setSaving(true);
    await addDoc(collection(db, 'materials'), { ...form, createdAt: new Date() });
    setForm({ title: '', link: '', audioUrl: '', subject: subjects.length > 0 ? subjects[0].id : '', category: 'Lectures' });
    setSaving(false);
    alert('تم حفظ المادة بنجاح');
    onRefresh();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-blue-500" /> إضافة محتوى دراسي
        </h2>

        <form onSubmit={handleAdd} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">عنوان المادة</label>
              <input placeholder="أدخل العنوان..." required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">الرابط الأساسي (يوتيوب، درايف، أو ملف)</label>
              <input placeholder="https://..." type="url" required value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full text-left" dir="ltr" />
              <span className="text-[11px] text-slate-500 font-medium">يمكنك وضع رابط فيديو يوتيوب أو إرفاق ملف جوجل درايف هنا.</span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">رابط الريكورد (درايف - اختياري)</label>
              <input placeholder="اختياري - https://drive.google.com/..." type="url" value={form.audioUrl} onChange={e => setForm({ ...form, audioUrl: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full text-left" dir="ltr" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">المادة الدراسية</label>
              <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full">
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.title}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">النوع (Category)</label>
              <input
                list="categories_list"
                placeholder="اختر النوع مسطّر أو اكتب إضافة جديدة..."
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                required
              />
              <datalist id="categories_list">
                {Array.from(new Set(list.map(m => m.category).filter(Boolean))).map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={loading} className="w-full md:w-auto px-8 py-4 md:py-3 min-h-[50px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors relative z-50 text-lg shadow-lg">
              <Save className="w-5 h-5 shrink-0" /> {saving ? 'جاري الحفظ...' : 'حفظ المادة'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800 w-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">المواد الموجودة</h2>
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition"><RefreshCw className="w-3.5 h-3.5" /> تحديث</button>
        </div>
        {loading && <p className="text-center text-slate-400 py-6 text-sm">جاري التحميل...</p>}
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 touch-pan-x">
          <table className="w-full text-right text-slate-700 dark:text-slate-300 min-w-[500px]">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-sm font-bold">
              <tr>
                <th className="p-4 rounded-tr-xl">عنوان المادة</th>
                <th className="p-4">القسم</th>
                <th className="p-4">النوع</th>
                <th className="p-4 rounded-tl-xl w-24 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {list.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-4 font-medium text-blue-600 dark:text-blue-400">
                    <a href={m.link} target="_blank" rel="noreferrer" className="hover:underline">{m.title}</a>
                  </td>
                  <td className="p-4">{m.subject}</td>
                  <td className="p-4">{m.category}</td>
                  <td className="p-4 flex justify-center">
                    <button onClick={() => { deleteDoc(doc(db, 'materials', m.id)); onRefresh(); }} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition relative z-50">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && list.length === 0 && (
                <tr><td colSpan="4" className="p-8 text-center text-slate-500">لا توجد مواد مضافة حتى الآن.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="flex justify-center mt-4">
            <button onClick={onLoadMore} className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition">
              <ChevronDown className="w-4 h-4" /> تحميل المزيد
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AnnouncementSection({ list = [], loading, hasMore, onLoadMore, onRefresh }) {
  const [form, setForm] = useState({
    text: '',
    category: 'Administrative',
    isPinned: false,
    externalLink: '',
    linkText: '',
    expiresAt: '',
    date: new Date().toISOString().split('T')[0] // legacy fallback
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, createdAt: new Date() };
    await addDoc(collection(db, 'announcements'), payload);
    setForm({ text: '', category: 'Administrative', isPinned: false, externalLink: '', linkText: '', expiresAt: '', date: new Date().toISOString().split('T')[0] });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    onRefresh();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-500" /> إضافة إعلان جديد
          </h2>
          {success && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-4 py-2 rounded-full font-bold">
              <CheckCircle className="w-5 h-5" /> تم النشر بنجاح
            </motion.div>
          )}
        </div>

        <form onSubmit={handleAdd} className="flex flex-col gap-6">
          {/* Main Text Content */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">نص الإعلان (Content)</label>
            <textarea placeholder="أدخل تفاصيل التنبيه أو الحدث هنا..." required value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[120px] focus:ring-2 focus:ring-blue-500 outline-none w-full dir-auto" />
          </div>

          {/* Grid Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">التصنيف (Category)</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full">
                <option value="Urgent">عاجل 🔴 (Urgent)</option>
                <option value="Administrative">إداري 🔵 (Administrative)</option>
                <option value="Academic">أكاديمي 🟢 (Academic)</option>
                <option value="Event">حدث / فعالية 🟣 (Event)</option>
              </select>
            </div>

            <div className="flex items-center justify-start gap-4 h-full md:mt-6">
              <input type="checkbox" id="pin-switch" checked={form.isPinned} onChange={e => setForm({ ...form, isPinned: e.target.checked })} className="w-6 h-6 text-blue-600 focus:ring-blue-500 rounded-lg cursor-pointer" />
              <label htmlFor="pin-switch" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                تثبيت الإعلان في الأعلى (Pin to top)
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">رابط خارجي (External Link) - اختياري</label>
              <input type="url" placeholder="https://..." value={form.externalLink} onChange={e => setForm({ ...form, externalLink: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full text-left" dir="ltr" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">نص الزر (Button Label)</label>
              <input type="text" placeholder="مثال: تسجيل الحضور" value={form.linkText} onChange={e => setForm({ ...form, linkText: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full" disabled={!form.externalLink} />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">تاريخ الانتهاء الإختياري (Expires At)</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-1/2 text-left" dir="ltr" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={loading} className="w-full md:w-auto px-10 py-4 min-h-[50px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors relative z-50 text-lg shadow-lg touch-manipulation">
              <Bell className="w-5 h-5 shrink-0" /> {saving ? 'جاري البث...' : 'بث الإعلان للجميع'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">الإعلانات الموجودة</h2>
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition"><RefreshCw className="w-3.5 h-3.5" /> تحديث</button>
        </div>
        {loading && <p className="text-center text-slate-400 py-4 text-sm">جاري التحميل...</p>}
        <div className="grid grid-cols-1 gap-4">
          {list.map(a => (
            <div key={a.id} className={`flex flex-col md:flex-row md:items-center justify-between p-5 border rounded-2xl gap-4 ${a.isPinned ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <div className="flex flex-col gap-2 w-full md:w-auto overflow-hidden">
                {a.isPinned && <span className="text-xs font-bold text-yellow-700 bg-yellow-200/50 w-fit px-2 py-0.5 rounded-md">📌 مثبت</span>}
                <p className="font-semibold text-slate-800 dark:text-slate-200 leading-relaxed max-w-2xl px-2 truncate break-words">{a.text}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 px-2">
                  <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{a.category || 'Administrative'}</span>
                  <span>{a.date || 'No Date'}</span>
                </div>
              </div>
              <button onClick={() => { deleteDoc(doc(db, 'announcements', a.id)); onRefresh(); }} className="self-end md:self-auto flex items-center justify-center bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 p-3 rounded-xl transition relative z-50 shrink-0">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {!loading && list.length === 0 && (
            <div className="p-8 text-center text-slate-500 w-full border-dashed border-2 border-slate-300 dark:border-slate-700 rounded-2xl">لا توجد إعلانات نشطة.</div>
          )}
        </div>
        {hasMore && (
          <div className="flex justify-center mt-4">
            <button onClick={onLoadMore} className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition">
              <ChevronDown className="w-4 h-4" /> تحميل المزيد
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// -------------------------------------------------------------
// Interactive Clinical Case Quest Section
// -------------------------------------------------------------

function QuestSection({ list = [], loading, hasMore, onLoadMore, onRefresh }) {
  const defaultQuest = {
    title: '',
    age: '',
    gender: 'Male',
    symptoms: '',
    options: ['', '', '', ''],
    correctIndex: '0',
    explanation: '',
    difficulty: 'medium'
  };

  const [form, setForm] = useState(defaultQuest);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleOptionChange = (idx, value) => {
    const currentOptions = Array.isArray(form.options) ? form.options : ['', '', '', ''];
    const newOptions = [...currentOptions];
    newOptions[idx] = value;
    setForm({ ...form, options: newOptions });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.options.some(opt => opt.trim() === '')) {
      alert('يرجى تعبئة جميع الخيارات الأربعة.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title,
        patientInfo: { age: form.age, gender: form.gender },
        symptoms: form.symptoms,
        options: form.options,
        correctAnswerIndex: Number(form.correctIndex),
        explanation: form.explanation,
        difficulty: form.difficulty,
        createdAt: new Date().getTime(),
      };
      await addDoc(collection(db, 'quests'), payload);
      setForm(defaultQuest);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onRefresh();
    } catch (err) {
      alert('حدث خطأ أثناء حفظ اللغز.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('إزالة حالة اللغز هذه نهائياً؟')) {
      await deleteDoc(doc(db, 'quests', id));
      onRefresh();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* 1. Editor Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 shadow-xl border border-slate-200 dark:border-slate-800">

        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-blue-500" /> إدارة لغز التشخيص
          </h2>
          {success && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-4 py-2 rounded-full font-bold">
              <CheckCircle className="w-5 h-5" /> تم الحفظ بنجاح
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-8">

          {/* Section 1: Header Profile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">عنوان الحالة (Case Title)</label>
              <input required placeholder="مثال: A 45-year-old man presents with..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full dir-auto" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">العمر (Age)</label>
              <input type="number" required placeholder="45" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full text-left" dir="ltr" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">الجنس (Gender)</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full">
                <option value="Male">ذكر (Male)</option>
                <option value="Female">أنثى (Female)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">مستوى الصعوبة (Difficulty)</label>
              <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full">
                <option value="easy">سهل 🟢</option>
                <option value="medium">متوسط 🟡</option>
                <option value="hard">صعب 🔴</option>
              </select>
            </div>
          </div>

          {/* Section 2: Clinical Details */}
          <div className="flex flex-col gap-2 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">التاريخ المرضي والأعراض (Symptoms)</label>
            <textarea required placeholder="اكتب تفاصيل الحالة هنا..." value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-h-[150px] focus:ring-2 focus:ring-blue-500 outline-none w-full leading-relaxed" />
          </div>

          {/* Section 3: MCQ Engine */}
          <div className="flex flex-col gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">الخيارات (Options)</label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((idx) => {
                const currentOptions = Array.isArray(form.options) ? form.options : ['', '', '', ''];
                return (
                  <div key={idx} className="flex flex-col gap-2 relative">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctIndex"
                        id={`radio-option-${idx}`}
                        value={idx}
                        checked={String(form.correctIndex) === String(idx)}
                        onChange={(e) => setForm({ ...form, correctIndex: e.target.value })}
                        className="w-5 h-5 text-blue-600 cursor-pointer relative z-50"
                      />
                      <label htmlFor={`radio-option-${idx}`} className="text-xs font-bold text-slate-500 uppercase">Option {['A', 'B', 'C', 'D'][idx]}</label>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder={`إجابة ${['A', 'B', 'C', 'D'][idx]}`}
                      value={currentOptions[idx]}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className={`p-3 rounded-xl border ${String(form.correctIndex) === String(idx) ? 'border-green-500 bg-green-50' : 'border-slate-300 dark:border-slate-700 dark:bg-slate-800'} text-slate-900 dark:text-white w-full`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Explanation */}
          <div className="flex flex-col gap-2 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">تفسير علمي (Explanation)</label>
            <textarea required placeholder="يظهر للطالب بعد الحل..." value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 w-full min-h-[120px] dark:bg-slate-800 dark:text-white" />
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xl transition-colors shadow-lg">
              {isSubmitting ? 'جاري النشر...' : 'نشر اللغز السري'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-indigo-500" /> مكتبة الحالات السريرية
          </h2>
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition"><RefreshCw className="w-3.5 h-3.5" /> تحديث</button>
        </div>
        {loading && <p className="text-center text-slate-400 py-4 text-sm">جاري التحميل...</p>}
        {!loading && list.length > 0 ? (
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 touch-pan-x">
            <table className="w-full text-right text-slate-700 dark:text-slate-300 min-w-[600px]">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-sm font-bold">
                <tr>
                  <th className="p-4 rounded-tr-xl">عنوان الحالة</th>
                  <th className="p-4">تاريخ النشر</th>
                  <th className="p-4 rounded-tl-xl w-24 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {[...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(q => (
                  <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-4 font-bold min-w-[200px]">{q.title}</td>
                    <td className="p-4 opacity-80" dir="ltr">{new Date(q.createdAt).toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDelete(q.id)} className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 rounded-lg transition">
                        <Trash2 className="w-5 h-5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading && (
          <div className="text-center py-10 opacity-60">
            <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="font-bold">لا يوجد أي حالات مدخلة حالياً.</p>
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center mt-4">
            <button onClick={onLoadMore} className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition">
              <ChevronDown className="w-4 h-4" /> تحميل المزيد
            </button>
          </div>
        )}
      </div>

    </motion.div>
  )
}
function DeadlinesSection({ list = [], loading, hasMore, onLoadMore, onRefresh }) {
  const [form, setForm] = useState({ title: '', targetDate: '', importance: 'High' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSaveMap = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dbDate = new Date(form.targetDate).getTime();
      const createdAt = new Date().getTime();
      await addDoc(collection(db, 'deadlines'), {
        title: form.title,
        targetDate: dbDate,
        createdAt: createdAt,
        importance: form.importance
      });
      setForm({ title: '', targetDate: '', importance: 'High' });
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('خطأ أثناء إضافة الموعد.');
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من مسح هذا الموعد؟')) {
      await deleteDoc(doc(db, 'deadlines', id));
      onRefresh();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* 1. Editor Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-500" /> إضافة موعد نهائي جديد
          </h2>
          {success && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-4 py-2 rounded-full font-bold">
              <CheckCircle className="w-5 h-5" /> تمت الإضافة بنجاح
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSaveMap} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">عنوان الموعد (Title)</label>
              <input type="text" required placeholder="مثال: Final Exams" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 w-full" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">تاريخ الانتهاء</label>
              <input type="datetime-local" required value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 w-full text-left" dir="ltr" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">درجة الأهمية</label>
              <select value={form.importance} onChange={e => setForm({ ...form, importance: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 w-full">
                <option value="High">مرتفعة الاستعجال (Red)</option>
                <option value="Medium">متوسطة (Orange)</option>
                <option value="Low">توضيحية (Blue)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={loading} className="w-full md:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors relative z-50 text-lg shadow-lg touch-manipulation">
              <Save className="w-5 h-5 shrink-0" /> {saving ? 'جاري الحفظ...' : 'إضافة الموعد'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Management Visual List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Clock className="w-6 h-6 text-indigo-500" /> إدارة المواعيد النشطة
          </h2>
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition"><RefreshCw className="w-3.5 h-3.5" /> تحديث</button>
        </div>
        {loading && <p className="text-center text-slate-400 py-4 text-sm">جاري التحميل...</p>}
        {!loading && list.length > 0 ? (
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 touch-pan-x">
            <table className="w-full text-right text-slate-700 dark:text-slate-300 min-w-[600px]">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-sm font-bold">
                <tr>
                  <th className="p-4 rounded-tr-xl">عنوان الموعد</th>
                  <th className="p-4">الأهمية</th>
                  <th className="p-4">تاريخ الانتهاء</th>
                  <th className="p-4 rounded-tl-xl w-24 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {list.map(d => {
                  const impColor = d.importance === 'High' ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : d.importance === 'Medium' ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
                  return (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4 font-bold min-w-[200px]">{d.title}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-black ${impColor}`}>{d.importance}</span></td>
                      <td className="p-4 opacity-80" dir="ltr">{new Date(d.targetDate).toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => handleDelete(d.id)} className="p-2 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/60 dark:text-red-400 rounded-lg transition">
                          <Trash2 className="w-5 h-5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : !loading && (
          <div className="text-center py-10 opacity-60">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="font-bold">لا يوجد أي خطط أو مواعيد حالياً.</p>
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center mt-4">
            <button onClick={onLoadMore} className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition">
              <ChevronDown className="w-4 h-4" /> تحميل المزيد
            </button>
          </div>
        )}
      </div>

    </motion.div>
  );
}

// -------------------------------------------------------------
// Subjects Manager
// -------------------------------------------------------------
function SubjectSection({ list = [], loading, hasMore, onLoadMore, onRefresh }) {
  const [form, setForm] = useState({ title: '', iconName: 'BookOpen', colorId: 'blue' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    await addDoc(collection(db, 'subjects'), { ...form, createdAt: new Date() });
    setForm({ title: '', iconName: 'BookOpen', colorId: 'blue' });
    setSaving(false);
    alert('تم حفظ المادة بنجاح');
    onRefresh();
  };

  const SelectedIcon = getIconMap(form.iconName);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Add Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-500" /> إدارة الأقسام والمواد
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">اسم المادة / القسم</label>
              <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">الأيقونة الممثلة</label>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"><SelectedIcon className="w-5 h-5 text-blue-500" /></div>
                <select value={form.iconName} onChange={e => setForm({ ...form, iconName: e.target.value })} className="p-3 flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none">
                  {Object.keys(IconDictionary).map(key => <option key={key} value={key}>{key}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">اللون التعريفي</label>
              <select value={form.colorId} onChange={e => setForm({ ...form, colorId: e.target.value })} className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none w-full">
                {ColorDictionary.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <button disabled={saving} type="submit" className="min-w-[150px] self-end py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex justify-center items-center gap-2">
            <Save className="w-5 h-5" /> {saving ? 'جاري الحفظ...' : 'حفظ القسم'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">الأقسام الحالية المتاحة</h2>
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition">
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </button>
        </div>
        {loading && <p className="text-center text-slate-400 py-4 text-sm">جاري التحميل...</p>}
        {!loading && list.length === 0 ? (
          <div className="text-center py-6 opacity-60">
            <Database className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="font-bold">لا توجد مسارات مضافة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {list.map(sub => {
              const Icon = getIconMap(sub.iconName);
              return (
                <div key={sub.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-gradient-to-br ${ColorDictionary.find(c => c.id === sub.colorId)?.class || 'from-slate-500 to-slate-700'} text-white rounded-xl shadow-md`}><Icon className="w-5 h-5" /></div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{sub.title}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`هل أنت متأكد من حذف القسم '${sub.title}'؟`)) {
                        deleteDoc(doc(db, 'subjects', sub.id));
                        onRefresh();
                      }
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center mt-4">
            <button onClick={onLoadMore} className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition">
              <ChevronDown className="w-4 h-4" /> تحميل المزيد
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
