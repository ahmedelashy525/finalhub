import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const CustomLogo = () => (
  <motion.svg 
    width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    whileHover={{ scale: 1.15, filter: "drop-shadow(0px 0px 8px rgba(16,185,129,0.8))" }}
    transition={{ type: "spring", stiffness: 400, damping: 10 }}
    className="shrink-0"
  >
    {/* Stethoscope / Heart Curve */}
    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" stroke="#3b82f6"/>
    {/* Brain/Heart EKG Pulse inside */}
    <motion.path 
      d="M3 11h3l2-3 4 8 2-5h5" 
      stroke="#10b981" 
      initial={{ pathLength: 0 }} 
      animate={{ pathLength: 1 }} 
      transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.5 }} 
    />
  </motion.svg>
);

export default function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full px-6 py-5 flex items-center justify-between max-w-7xl mx-auto"
    >
      {/* BRANDING LEFT */}
      <Link to="/" className="flex items-center gap-3 group relative cursor-pointer z-50">
        <motion.div 
           initial={{ x: -20, opacity: 0 }} 
           animate={{ x: 0, opacity: 1 }} 
           transition={{ delay: 0.2 }}
        >
           <CustomLogo />
        </motion.div>
        
        <motion.div 
           whileHover={{ y: -2 }}
           className="flex flex-col relative"
        >
           <span className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500 font-['Montserrat',sans-serif] tracking-tight group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-300">
             MedPortal
           </span>
           <span className="text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 font-['Cairo',sans-serif] tracking-widest -mt-1 group-hover:text-emerald-500 transition-colors">
             ميد بورتال
           </span>
        </motion.div>
      </Link>

      {/* NAVIGATION RIGHT */}
      <div className="flex items-center gap-3 z-50">
        <Link 
           to="/admin" 
           className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md transition-all active:scale-95"
           title="Admin Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>
        
        <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

        <div className="bg-slate-100 dark:bg-slate-800/80 rounded-full p-1.5 shadow-inner">
           <ThemeToggle />
        </div>
      </div>
    </motion.nav>
  );
}
