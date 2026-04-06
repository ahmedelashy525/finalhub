import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Book, Trash2, CheckCircle2, Circle, Plus, ListTodo, Archive } from 'lucide-react';
import { getIconMap, ColorDictionary } from '../utils/subjectMappers';

const templates = ["مذاكرة محاضرة", "مراجعة سريعة", "حل كويز", "تلخيص"];

const formatDeadline = (isoString) => {
   if (!isoString) return '';
   return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(isoString));
};

export default function StudyPlanner({ subjects = [], materials = [] }) {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Sync Initialization
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('user_study_tasks') || '[]');
      setTasks(saved);
    } catch(e) {}
  }, []);

  // Sync Mutation
  useEffect(() => {
    localStorage.setItem('user_study_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      text,
      deadline,
      subjectId,
      materialId,
      isCompleted: false,
      createdAt: Date.now()
    };

    setTasks(prev => [...prev, newTask]);
    setText('');
    setDeadline('');
    setSubjectId('');
    setMaterialId('');
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const clearCompleted = () => {
    if (window.confirm('هل أنت متأكد من حذف جميع المهام المكتملة؟')) {
      setTasks(prev => prev.filter(t => !t.isCompleted));
    }
  };

  // Smart Engine Triage
  const activeTasks = tasks.filter(t => !t.isCompleted).sort((a, b) => {
    if (!a.deadline && !b.deadline) return b.createdAt - a.createdAt;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  const completedTasks = tasks.filter(t => t.isCompleted).sort((a, b) => b.createdAt - a.createdAt);

  // Math Setup
  const totalTasks = tasks.length;
  const completedCount = completedTasks.length;
  const percentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Dynamic Color Resolution Engine
  const getTaskColorMapping = (task) => {
    if (!task.deadline) return 'border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300';
    
    const tDate = new Date(task.deadline);
    tDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (tDate < today) return 'border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-900/20 text-red-800 dark:text-red-300';
    if (tDate.getTime() === today.getTime()) return 'border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300';
    return 'border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300';
  };

  return (
    <div className="w-full max-w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-8 shadow-2xl relative overflow-hidden" dir="rtl">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Progress HUD */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <h2 className="text-lg md:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2 md:gap-3">
          <ListTodo className="w-6 h-6 md:w-7 md:h-7 text-blue-500 shrink-0" /> مخطط الدراسة الذكي
        </h2>
        <div className="flex flex-col items-end gap-1">
           <span className="text-sm font-bold text-slate-500 dark:text-slate-400">إنجاز اليوم: {completedCount}/{totalTasks}</span>
        </div>
      </div>
      
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 mb-6 overflow-hidden relative z-10">
         <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${percentage}%` }}
           transition={{ duration: 0.8, ease: "easeOut" }}
           className="h-full bg-gradient-to-r from-blue-600 to-teal-500"
         />
      </div>

      {/* Input Pipeline */}
      <form onSubmit={addTask} className="flex flex-col gap-3 mb-6 md:mb-8 relative z-10">
        {/* Main Text Row */}
        <div className="flex gap-3">
          <input 
            type="text" 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="ما الذي ستدرسه الآن؟..." 
            className="flex-1 min-h-[44px] p-3 md:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium w-full"
            required
          />
          <button type="submit" className="min-h-[44px] px-4 md:p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition shadow-lg shrink-0">
             <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Secondary Controls Row: flex-col on mobile, flex-row on md+ */}
        <div className="flex flex-col md:flex-row gap-3">
           <div className="relative border-2 border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800 focus-within:border-blue-500 focus-within:dark:border-blue-500 transition-colors flex items-center px-3 w-full shadow-inner min-h-[44px]">
             <Clock className="w-4 h-4 text-slate-400 rtl:ml-2 ltr:mr-2 shrink-0" />
             <input 
               type="datetime-local" 
               value={deadline}
               onChange={(e) => setDeadline(e.target.value)}
               className="bg-transparent outline-none w-full text-sm font-bold text-slate-700 dark:text-slate-200 dark:[color-scheme:dark] p-2.5"
             />
           </div>
           
           {subjects.length > 0 && (
              <div className="relative border-2 border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800 focus-within:border-blue-500 flex items-center px-3 w-full overflow-hidden shadow-inner min-h-[44px]">
                <Book className="w-4 h-4 text-slate-400 rtl:ml-2 ltr:mr-2 shrink-0" />
                <select 
                  value={subjectId} 
                  onChange={(e) => { setSubjectId(e.target.value); setMaterialId(''); }}
                  className="bg-transparent outline-none w-full text-sm font-bold text-slate-700 dark:text-slate-300 appearance-none py-2.5"
                >
                  <option value="">بدون مادة</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
           )}

           {subjectId && (
              <div className="relative border-2 border-slate-200 dark:border-slate-700 rounded-2xl bg-blue-50 dark:bg-blue-900/20 focus-within:border-blue-500 flex items-center px-3 w-full overflow-hidden shadow-inner min-h-[44px]">
                <Book className="w-4 h-4 text-blue-400 rtl:ml-2 ltr:mr-2 shrink-0" />
                <select 
                  value={materialId} 
                  onChange={(e) => setMaterialId(e.target.value)}
                  className="bg-transparent outline-none w-full text-sm font-bold text-blue-700 dark:text-blue-300 appearance-none py-2.5"
                >
                  <option value="">تحديد المحاضرة (اختياري)</option>
                  {materials?.filter(m => m.subject === subjectId).map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
           )}
        </div>
        
        {/* Quick Add Tags */}
        <div className="flex flex-wrap gap-2 justify-start">
           {templates.map(tmp => (
              <button 
                key={tmp} 
                type="button" 
                onClick={() => setText(tmp)}
                className="px-3 py-1.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition whitespace-nowrap"
              >
               {tmp}
              </button>
           ))}
        </div>
      </form>

      {/* Triage Queue */}
      <div className="space-y-3 relative z-10">
        <AnimatePresence>
           {activeTasks.length === 0 && completedTasks.length === 0 && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center opacity-60">
               <ListTodo className="w-16 h-16 mx-auto text-slate-400 mb-4" />
               <p className="text-lg font-bold text-slate-500">ابدأ بتنظيم يومك الدراسي الآن..</p>
             </motion.div>
           )}

           {activeTasks.map(task => {
              const mappedSubject = subjects.find(s => s.id === task.subjectId);
              const mappedMaterial = materials?.find(m => m.id === task.materialId);
              const SubIcon = mappedSubject ? getIconMap(mappedSubject.iconName) : Book;
              const colorMappings = getTaskColorMapping(task);

              return (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${colorMappings}`}
                >
                   <div className="flex gap-4 items-center flex-1">
                      <button onClick={() => toggleTask(task.id)} className="shrink-0 transition-all active:scale-95 group/check border bg-slate-50 dark:bg-slate-800 shadow-inner rounded-full p-1 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50">
                         <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 group-hover/check:text-emerald-500 transition-colors" />
                      </button>
                      <div className="flex flex-col gap-2">
                         <span className="font-bold text-[15px] leading-tight text-slate-800 dark:text-slate-200">{task.text}</span>
                         <div className="flex flex-wrap items-center gap-3 text-xs font-bold opacity-80">
                           {task.deadline && (
                             <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><Clock className="w-3.5 h-3.5" /> {formatDeadline(task.deadline)}</span>
                           )}
                           {mappedSubject && (
                              <span className="flex items-center gap-1.5 px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm">
                                <SubIcon className="w-3.5 h-3.5 text-blue-500" /> {mappedSubject.title}
                              </span>
                           )}
                           {mappedMaterial && (
                              <span className="flex items-center gap-1.5 px-2 py-0.5 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm overflow-hidden text-ellipsis max-w-[150px] whitespace-nowrap">
                                {mappedMaterial.title}
                              </span>
                           )}
                         </div>
                      </div>
                   </div>
                   
                   <button onClick={() => deleteTask(task.id)} className="opacity-60 sm:opacity-0 group-hover:opacity-100 p-2 text-red-500 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/60 rounded-xl transition-all shrink-0 mr-1">
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                   </button>
                </motion.div>
              );
           })}
        </AnimatePresence>
      </div>

      {/* Completed Archive */}
      {completedTasks.length > 0 && (
         <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5 rounded-xl transition hover:bg-slate-100 dark:hover:bg-slate-800">
                 <Archive className="w-5 h-5" /> المهام المكتملة ({completedCount})
              </button>
              <button onClick={clearCompleted} className="text-xs font-bold px-3 py-1.5 text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition">
                مسح المكتمل
              </button>
            </div>
            
            <AnimatePresence>
               {showArchived && (
                 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                    {completedTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 opacity-60 group">
                        <div className="flex items-center gap-4 line-through">
                          <button onClick={() => toggleTask(task.id)} className="shrink-0"><CheckCircle2 className="w-6 h-6 text-emerald-500" /></button>
                          <span className="font-bold text-sm text-slate-500">{task.text}</span>
                        </div>
                        <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-all shrink-0">
                           <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                 </motion.div>
               )}
            </AnimatePresence>
         </div>
      )}

    </div>
  );
}
