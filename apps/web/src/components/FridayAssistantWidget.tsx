import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

interface Message {
  id: string;
  sender: 'friday' | 'user';
  text: string;
  action?: {
    label: string;
    url: string;
  };
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    sender: 'friday',
    text: 'Hello! I am Friday, your GST & Indirect Tax assistant prototype. How can I help you streamline your compliance today?',
  },
];

const PROMPTS = [
  {
    label: '📅 Upcoming Deadlines',
    query: 'What are the upcoming GST deadlines this month?',
    reply: 'GSTR-1 for monthly filers is due on the 11th. GSTR-3B is due on the 20th (or 22nd/24th under QRMP). Under our contractual SLA, we guarantee 100% zero late fees when documents are shared by the 5th.',
    action: { label: 'Explore Filing Plans', url: '/pricing' },
  },
  {
    label: '🔥 New 40% Demerit Slab',
    query: 'What is the new 40% GST slab?',
    reply: 'Under the landmark Rate Rationalisation overhaul, the 12% & 28% slabs were dissolved (moving essentials to 5% and durables to 18%). A new statutory 40% slab was established for luxury cars, super-bikes >350cc, aerated drinks, and tobacco.',
    action: { label: 'Open Live Calculator', url: '/resources' },
  },
  {
    label: '🛡️ Capped Late Fees',
    query: 'How are Section 47 late fees capped?',
    reply: 'Under Notification 19/2021-CT, late fees are strictly capped: ₹500 for Nil returns, ₹2,000 for turnover ≤ ₹1.5 Cr, ₹5,000 for ₹1.5–5 Cr, and ₹10,000 for > ₹5 Cr.',
    action: { label: 'Calculate Your Late Fee', url: '/resources#calculators' },
  },
  {
    label: '💬 Speak with a Senior CA',
    query: 'I need to speak directly with a Chartered Accountant.',
    reply: 'Our senior CA advisory desk is on standby for notice defense, 2B ITC leakage recovery, and full monthly retainers.',
    action: { label: 'Book Free 15-Min CA Call', url: '/contact' },
  },
];

export function FridayAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectPrompt = (prompt: typeof PROMPTS[0]) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: prompt.query,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const fridayMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'friday',
        text: prompt.reply,
        action: prompt.action,
      };
      setMessages((prev) => [...prev, fridayMsg]);
    }, 550);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const fridayMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'friday',
        text: 'Thank you for your inquiry. For specific legal representation or customized return filings, connect directly with our senior Chartered Accountant advisory desk.',
        action: { label: 'Connect with CA Desk', url: '/contact' },
      };
      setMessages((prev) => [...prev, fridayMsg]);
    }, 600);
  };

  return (
    <aside aria-label="Friday GST Assistant" className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 select-none">
      {/* Floating Launcher Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            aria-label="Open Friday Tax Assistant"
            className="group relative flex items-center justify-center gap-2.5 w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:shadow-blue-600/60 border border-blue-400/40 cursor-pointer min-h-[48px] min-w-[48px]"
          >
            {/* Live Status Pulse */}
            <span className="absolute top-1 right-1 sm:relative sm:top-auto sm:right-auto flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-200">
                Friday AI Assistant
              </span>
              <span className="text-xs font-black text-white">Ask GST Question</span>
            </div>

            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm sm:ml-1 group-hover:rotate-12 transition-transform">
              ⚡
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Assistant Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="w-[calc(100vw-32px)] sm:w-[380px] h-[520px] max-h-[82vh] bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Window Header */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-black shadow-inner">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">Friday</h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      CA Prototype
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Verified Indirect Tax Assistant
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Friday Assistant"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white shadow-sm rounded-br-xs'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.action && (
                    <div className="mt-1.5">
                      <Link
                        to={msg.action.url}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-400/40 text-[11px] font-bold text-blue-300 hover:bg-blue-500/25 hover:text-white transition-colors"
                      >
                        <span>{msg.action.label}</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-2xl rounded-bl-xs w-16">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.3s]" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Quick Prompt Chips */}
            <div className="p-2.5 bg-slate-900/60 border-t border-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => handleSelectPrompt(prompt)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-blue-600 border border-slate-700/80 text-[10px] font-semibold text-slate-300 hover:text-white whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  {prompt.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask Friday a GST question..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                aria-label="Send message"
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center font-bold text-xs transition-colors cursor-pointer shrink-0"
              >
                &uarr;
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
