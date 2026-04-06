import React from 'react';
import { motion } from 'framer-motion';
import { getIconMap, getColorClass } from '../utils/subjectMappers';
import { Database } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function SubjectGrid({ subjects = [], onSubjectClick }) {
  if (subjects.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="w-full text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center opacity-70 shadow-inner"
      >
        <Database className="w-12 h-12 text-slate-400 mb-4" />
        <span className="font-bold text-slate-500 text-lg">لا توجد مواد مضافة حالياً.</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mx-auto"
    >
      {subjects.map((subject) => {
        const Icon = getIconMap(subject.iconName);
        const resolvedColor = getColorClass(subject.colorId);
        
        return (
          <motion.div
            key={subject.id}
            variants={itemVariants}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            // Note: Now we pass the FULL object out not just the ID, so the modal knows what the title explicitly is seamlessly.
            onClick={() => onSubjectClick(subject)}
            className="cursor-pointer bg-white dark:bg-slate-800 rounded-2xl overflow-hidden group relative h-48 flex flex-col items-center justify-center border border-slate-200 shadow-md hover:shadow-xl dark:border-slate-700/50 transition-all duration-300"
          >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${resolvedColor} transition-opacity duration-300 pointer-events-none`} />
            <div className={`p-4 rounded-full bg-gradient-to-br ${resolvedColor} text-white mb-4 shadow-md group-hover:shadow-[0_0_15px_rgba(0,0,0,0.2)] transition-shadow`}>
               <Icon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
               {subject.title}
            </h3>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
