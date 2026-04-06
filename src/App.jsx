import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import { motion } from 'framer-motion';
import { syncServerTime } from './utils/timeSync';
import Footer from './components/Footer';

function MedicalBackground() {
  return (
    <motion.div 
      className="fixed inset-0 pointer-events-none -z-10 flex items-center justify-center opacity-5 dark:opacity-10"
      animate={{
        y: [0, -30, 0],
        rotate: [0, 5, -5, 0]
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <svg width="400" height="400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900 dark:text-white">
        <path d="M30 10 C45 30, 48 45, 50 50 C52 55, 55 70, 70 90" />
        <path d="M70 10 C55 30, 52 45, 50 50 C48 55, 45 70, 30 90" />
        <circle cx="50" cy="50" r="5" fill="currentColor" />
        <circle cx="50" cy="50" r="8" opacity="0.3" fill="currentColor" />
      </svg>
    </motion.div>
  );
}

export default function App() {
  useEffect(() => {
    // Initiate secure Global Time Sync
    syncServerTime();
  }, []);

  return (
    <Router>
      <div className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-500 overflow-x-hidden font-sans">
        
        {/* Animated Background Blobs */}
        <div className="absolute top-[-15%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-300/30 dark:bg-indigo-900/20 rounded-full blur-3xl animate-[pulse_12s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[40rem] h-[40rem] bg-blue-300/30 dark:bg-blue-900/20 rounded-full blur-3xl animate-[pulse_15s_ease-in-out_infinite]" />
        
        <MedicalBackground />

        <div className="relative z-10 w-full flex-1 flex flex-col">
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </div>
    </Router>
  );
}

