
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, Globe, History, Atom, MessageSquare, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { LisaaService, TutorMode } from '../services/geminiLiveService';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: number;
}

const MODES: { id: TutorMode; label: string; icon: any; color: string; desc: string }[] = [
  { id: 'physics', label: 'Physics', icon: Atom, color: 'emerald', desc: 'Quantum & Classical Mechanics' },
  { id: 'ielts', label: 'IELTS', icon: MessageSquare, color: 'blue', desc: 'Speaking Proficiency Coach' },
  { id: 'history_geo', label: 'History & Geo', icon: History, color: 'amber', desc: 'Civilizations & Earth Science' }
];

const LisaaInterface: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMode, setActiveMode] = useState<TutorMode>('physics');
  
  const serviceRef = useRef<LisaaService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleConnection = useCallback(async () => {
    if (isConnected) {
      serviceRef.current?.disconnect();
      setIsConnected(false);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      if (!process.env.API_KEY && !process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API Key is missing. Please set GEMINI_API_KEY in your environment variables.');
      }

      if (!serviceRef.current) {
        serviceRef.current = new LisaaService();
      }

      await serviceRef.current.connect({
        onOpen: () => {
          setIsConnected(true);
          setIsConnecting(false);
        },
        onClose: () => {
          setIsConnected(false);
          setIsConnecting(false);
        },
        onError: (err) => {
          console.error('Lisaa Error:', err);
          const message = err instanceof Error ? err.message : 'Connection failed. Please check your microphone permissions and internet connection.';
          setError(message);
          setIsConnected(false);
          setIsConnecting(false);
        },
        onTranscript: (text, isUser) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.isUser === isUser && Date.now() - last.timestamp < 3000) {
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, text: last.text + ' ' + text };
              return updated;
            }
            return [...prev, { text, isUser, timestamp: Date.now() }];
          });
        },
        onVolumeChange: (vol) => {
          setVolume(vol);
        }
      }, activeMode);
    } catch (err: any) {
      console.error('Initialization Error:', err);
      setError(err.message || 'An unexpected error occurred during initialization.');
      setIsConnecting(false);
    }
  }, [isConnected, activeMode]);

  const currentModeData = MODES.find(m => m.id === activeMode)!;

  return (
    <div className="relative group">
      {/* Decorative Border Glow */}
      <div className="absolute -inset-[1px] bg-gradient-to-br from-white/10 via-white/5 to-white/10 rounded-[2.5rem] blur-sm group-hover:blur-md transition-all duration-500" />
      
      <div className="relative flex flex-col h-[700px] bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
        
        {/* Mode Selector (Only when disconnected) */}
        {!isConnected && (
          <div className="p-6 grid grid-cols-3 gap-3 border-b border-white/5 bg-white/[0.02]">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={`
                  relative flex flex-col items-center p-4 rounded-2xl transition-all duration-500 group/btn
                  ${activeMode === mode.id 
                    ? 'bg-white/10 border-white/20 shadow-xl' 
                    : 'bg-transparent border-transparent hover:bg-white/5'}
                  border
                `}
              >
                <mode.icon size={18} className={`mb-2 ${activeMode === mode.id ? 'text-emerald-400' : 'text-white/20'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${activeMode === mode.id ? 'text-white' : 'text-white/20'}`}>
                  {mode.label}
                </span>
                {activeMode === mode.id && (
                  <motion.div layoutId="active-pill" className="absolute inset-0 border border-emerald-500/30 rounded-2xl pointer-events-none" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main Interaction Area */}
        <div className="flex-1 relative flex flex-col overflow-hidden">
          
          {/* Visualizer / Orb Area */}
          <div className="h-[350px] flex flex-col items-center justify-center p-8 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div 
                animate={{ 
                  scale: isConnected ? [1, 1.2, 1] : 1,
                  opacity: isConnected ? [0.05, 0.15, 0.05] : 0.02
                }}
                transition={{ duration: 5, repeat: Infinity }}
                className="w-80 h-80 bg-white rounded-full blur-[100px]" 
              />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                <motion.div
                  animate={{
                    scale: isConnected ? 1 + volume * 0.5 : 1,
                    rotate: isConnected ? 360 : 0
                  }}
                  transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" } }}
                  className={`
                    w-40 h-40 rounded-full flex items-center justify-center relative
                    ${isConnected 
                      ? 'bg-white/5 border border-white/20' 
                      : 'bg-white/[0.02] border border-white/5'}
                  `}
                >
                  <div className={`
                    absolute inset-2 rounded-full border border-dashed border-white/10
                    ${isConnected ? 'animate-[spin_10s_linear_infinite]' : ''}
                  `} />
                  
                  {isConnecting ? (
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-400" />
                  ) : isConnected ? (
                    <div className="relative">
                      <div className="absolute inset-0 blur-xl bg-emerald-400/20 rounded-full" />
                      <Sparkles className="w-12 h-12 text-emerald-400 relative" />
                    </div>
                  ) : (
                    <currentModeData.icon className="w-12 h-12 text-white/10" />
                  )}
                </motion.div>
                
                {/* Volume Rings */}
                {isConnected && (
                  <div className="absolute inset-0 -m-4 pointer-events-none">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: 1 + volume * (1 + i * 0.5), opacity: 0.2 - i * 0.05 }}
                        className="absolute inset-0 border border-emerald-500/20 rounded-full"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-12 text-center space-y-3">
                <h3 className="text-3xl font-serif italic tracking-tight">
                  {isConnecting ? 'Initializing...' : isConnected ? 'Lisaa is Listening' : currentModeData.label}
                </h3>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.3em]">
                  {isConnected ? 'Bilingual Neural Link Active' : currentModeData.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Transcript Area */}
          <div className="flex-1 bg-black/40 border-t border-white/5 overflow-y-auto p-8 space-y-8 scrollbar-hide">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-20"
                >
                  <div className="p-6 rounded-full bg-white/[0.02] border border-white/5">
                    <Globe size={32} strokeWidth={1} />
                  </div>
                  <p className="text-xs font-serif italic max-w-[240px] leading-relaxed">
                    "The beautiful thing about learning is that no one can take it away from you."
                  </p>
                </motion.div>
              ) : (
                messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-[85%] px-6 py-4 rounded-3xl text-sm leading-relaxed font-light
                      ${m.isUser 
                        ? 'bg-white/5 text-white/80 border border-white/10 rounded-tr-none' 
                        : 'bg-emerald-500/[0.03] text-emerald-100/80 border border-emerald-500/10 rounded-tl-none font-serif italic'}
                    `}>
                      {m.text}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="p-8 bg-white/[0.02] border-t border-white/5">
          <button
            onClick={toggleConnection}
            disabled={isConnecting}
            className={`
              w-full py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.3em] transition-all duration-700
              flex items-center justify-center space-x-4 group/main
              ${isConnected 
                ? 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10' 
                : 'bg-white text-black hover:bg-emerald-400 shadow-2xl shadow-white/10'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isConnecting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Synchronizing...</span>
              </>
            ) : isConnected ? (
              <>
                <MicOff size={16} />
                <span>Disconnect Link</span>
              </>
            ) : (
              <>
                <Mic size={16} className="group-hover/main:scale-110 transition-transform" />
                <span>Initialize {currentModeData.label} Session</span>
              </>
            )}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center space-x-4 text-red-400 text-[10px] font-bold uppercase tracking-wider"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LisaaInterface;
