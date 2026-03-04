
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Plane } from 'lucide-react';
import LisaaInterface from './components/LisaaInterface';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [splashStep, setSplashStep] = useState(0); // 0: App Name, 1: Developer Name

  useEffect(() => {
    const step1Timer = setTimeout(() => setSplashStep(1), 2000);
    const step2Timer = setTimeout(() => setShowSplash(false), 4500);
    return () => {
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-emerald-500/30 overflow-x-hidden relative">
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
          >
            <AnimatePresence mode="wait">
              {splashStep === 0 ? (
                <motion.div
                  key="app-name"
                  initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="text-center"
                >
                  <h1 className="text-6xl md:text-8xl font-serif italic tracking-tighter text-emerald-400">Lisaa</h1>
                  <p className="text-[10px] uppercase tracking-[0.6em] text-white/20 mt-4 font-bold">Intelligence Redefined</p>
                </motion.div>
              ) : (
                <motion.div
                  key="dev-name"
                  initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="text-center space-y-4"
                >
                  <p className="text-[10px] uppercase tracking-[0.5em] text-emerald-400 font-bold">System Architect</p>
                  <h1 className="text-4xl md:text-6xl font-serif italic tracking-tighter">MD OMAR FARUK</h1>
                  <div className="w-12 h-[1px] bg-white/20 mx-auto mt-8" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Immersive Background & Real-time Animations */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Star Field (Universe) */}
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            initial={{ opacity: Math.random(), scale: Math.random() }}
            animate={{ 
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{ 
              duration: 3 + Math.random() * 4, 
              repeat: Infinity, 
              delay: Math.random() * 5 
            }}
            className="absolute bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              willChange: 'opacity, transform'
            }}
          />
        ))}

        {/* Rocket Animation */}
        <motion.div
          initial={{ x: '-10vw', y: '110vh', rotate: 45 }}
          animate={{ x: '110vw', y: '-10vh' }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: "linear",
            delay: 5
          }}
          className="absolute text-emerald-500/20"
          style={{ willChange: 'transform' }}
        >
          <Rocket size={40} />
        </motion.div>

        {/* Airplane Animation */}
        <motion.div
          initial={{ x: '110vw', y: '20vh', rotate: -90 }}
          animate={{ x: '-10vw' }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "linear",
            delay: 12
          }}
          className="absolute text-blue-500/10"
          style={{ willChange: 'transform' }}
        >
          <Plane size={30} />
        </motion.div>

        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay" />
      </div>

      <header className="relative z-20 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center">
                <span className="font-serif italic text-lg text-emerald-400">L</span>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-serif italic tracking-tight">Lisaa</h1>
              <p className="text-[7px] uppercase tracking-[0.2em] text-white/30 font-bold">AI Systems</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-white/50">Neural Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          animate={!showSplash ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : {}}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          <LisaaInterface />
        </motion.div>
      </main>

      {/* Permanent Developer Credit */}
      <div className="fixed bottom-4 right-4 z-[50] pointer-events-none">
        <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/5 rounded-full">
          <p className="text-[8px] uppercase tracking-[0.1em] text-white/20 font-bold">
            By: <span className="text-white/40">MD OMAR FARUK</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
