
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, Globe, History, Atom, MessageSquare, AlertCircle, Loader2, Sparkles, Beaker, BookOpen, Coffee } from 'lucide-react';
import { LisaaService, TutorMode } from '../services/geminiLiveService';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: number;
}

const MODES: { id: TutorMode; label: string; icon: any; color: string; desc: string }[] = [
  { id: 'physics', label: 'Physics', icon: Atom, color: 'emerald', desc: 'Quantum & Mechanics' },
  { id: 'chemistry', label: 'Chemistry', icon: Beaker, color: 'blue', desc: 'Molecular Reactions' },
  { id: 'ielts', label: 'IELTS', icon: MessageSquare, color: 'blue', desc: 'Speaking Coach' },
  { id: 'history_geo', label: 'History', icon: History, color: 'amber', desc: 'Civilizations' },
  { id: 'islamic', label: 'Islamic', icon: BookOpen, color: 'emerald', desc: 'Ethics & Teachings' },
  { id: 'friendly_talk', label: 'Friendly', icon: Coffee, color: 'rose', desc: 'Casual Chat' }
];

const PulseRings: React.FC<{ volume: number; isConnected: boolean }> = ({ volume, isConnected }) => {
  if (!isConnected) return null;
  return (
    <div className="absolute inset-0 -m-3 sm:-m-6 pointer-events-none">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            scale: 1 + volume * (1.3 + i * 0.6), 
            opacity: 0.25 - i * 0.08 
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute inset-0 border border-emerald-500/20 rounded-full"
        />
      ))}
    </div>
  );
};

const LisaaInterface: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMode, setActiveMode] = useState<TutorMode>('physics');
  const [inputText, setInputText] = useState('');
  
  const serviceRef = useRef<LisaaService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const stopConnection = useCallback(() => {
    serviceRef.current?.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const startConnection = useCallback(async (mode: TutorMode) => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setError(null);

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
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
      }, mode);
    } catch (err: any) {
      console.error('Initialization Error:', err);
      setError(err.message || 'An unexpected error occurred during initialization.');
      setIsConnecting(false);
    }
  }, [isConnecting]);

  // Clear messages and handle mode switching
  useEffect(() => {
    setMessages([]);
    if (isConnected) {
      stopConnection();
      // Auto-reconnect with new mode
      setTimeout(() => startConnection(activeMode), 300);
    }
  }, [activeMode]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { text, isUser: true, timestamp: Date.now() }]);
    
    if (!isConnected) {
      await startConnection(activeMode);
      // Wait a bit for connection to be ready
      setTimeout(async () => {
        if (serviceRef.current) {
          await serviceRef.current.sendText(text);
        }
      }, 1000);
    } else if (serviceRef.current) {
      await serviceRef.current.sendText(text);
    }
  };

  const toggleConnection = useCallback(async () => {
    if (isConnected) {
      stopConnection();
    } else {
      await startConnection(activeMode);
    }
  }, [isConnected, activeMode, startConnection, stopConnection]);

  const currentModeData = MODES.find(m => m.id === activeMode)!;

  return (
    <div className="relative w-full max-w-5xl mx-auto px-2 sm:px-4">
      {/* Decorative Glow */}
      <div className="absolute -inset-4 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative flex flex-col min-h-[600px] sm:min-h-[750px] bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl">
        
        {/* Top Section: Mic Interaction Area */}
        <div className="pt-6 pb-4 sm:pt-8 sm:pb-6 px-4 sm:px-8 relative flex flex-col items-center">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div 
              animate={{ 
                scale: isConnected ? [1, 1.2, 1] : 1,
                opacity: isConnected ? [0.05, 0.15, 0.05] : 0.02
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-48 h-48 sm:w-64 sm:h-64 bg-emerald-500 rounded-full blur-[60px] sm:blur-[80px]" 
            />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <button
              onClick={toggleConnection}
              disabled={isConnecting}
              className="relative group/mic"
            >
              {/* Outer Pulse Rings */}
              <PulseRings volume={volume} isConnected={isConnected} />

              {/* Main Mic Button - Smaller */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center relative transition-all duration-700
                  ${isConnected 
                    ? 'bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)] border-2 border-white/20' 
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'}
                `}
              >
                <div className={`
                  absolute inset-1.5 sm:inset-2 rounded-full border border-dashed border-white/20
                  ${isConnected ? 'animate-[spin_15s_linear_infinite]' : ''}
                `} />
                
                {isConnecting ? (
                  <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-emerald-400" />
                ) : isConnected ? (
                  <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                ) : (
                  <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-white/20 group-hover/mic:text-white/60 transition-colors" />
                )}
              </motion.div>

              {/* Status Label - Smaller */}
              <div className="mt-4 text-center">
                <motion.h3 
                  key={isConnected ? 'connected' : 'idle'}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl sm:text-2xl font-serif italic tracking-tight text-white"
                >
                  {isConnecting ? 'Syncing...' : isConnected ? 'Listening' : 'Tap to Start'}
                </motion.h3>
              </div>
            </button>
          </div>
        </div>

        {/* Middle Section: Modules Grid - More Compact */}
        <div className="px-4 sm:px-6 py-2 grid grid-cols-3 sm:grid-cols-6 gap-2 z-20 border-y border-white/5 bg-white/[0.01]">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`
                relative flex flex-col items-center p-2 sm:p-3 rounded-xl transition-all duration-500 group/card
                ${activeMode === mode.id 
                  ? 'bg-white/10 border-white/20 shadow-lg scale-[1.02]' 
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] opacity-40 hover:opacity-100'}
                border backdrop-blur-md
              `}
            >
              <div className={`
                p-1.5 sm:p-2 rounded-lg mb-1.5 transition-colors duration-500
                ${activeMode === mode.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/20'}
              `}>
                <mode.icon size={14} className="sm:w-4 sm:h-4" />
              </div>
              <h4 className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${activeMode === mode.id ? 'text-white' : 'text-white/40'}`}>
                {mode.label}
              </h4>
              {activeMode === mode.id && !isConnected && (
                <motion.div layoutId="active-glow" className="absolute inset-0 border border-emerald-500/30 rounded-xl pointer-events-none" />
              )}
            </button>
          ))}
        </div>

        {/* Bottom Section: Transcript Area - Fills remaining space */}
        <div className="flex-1 bg-black/20 flex flex-col overflow-hidden min-h-[300px]">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-hide">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-10">
                  <p className="text-[9px] sm:text-[10px] font-serif italic max-w-[180px] sm:max-w-[240px] leading-relaxed">
                    "Knowledge is the only treasure that increases when shared."
                  </p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-[90%] sm:max-w-[85%] px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs leading-relaxed
                      ${m.isUser 
                        ? 'bg-white/5 text-white/60 border border-white/10 rounded-tr-none font-light' 
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

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2 text-red-400 text-[8px] font-bold uppercase tracking-widest"
            >
              <AlertCircle size={12} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Text Chat Bar */}
          <div className="px-4 pb-4">
            <form 
              onSubmit={handleSendText}
              className="relative flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2 transition-all"
            >
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent border-none outline-none text-xs text-white/80 placeholder:text-white/20"
              />
              <button 
                type="submit"
                disabled={!inputText.trim()}
                className="ml-2 p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 disabled:opacity-50 transition-colors"
              >
                <Sparkles size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LisaaInterface;
