/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Image as ImageIcon, 
  Volume2, 
  Sparkles, 
  Plus, 
  History, 
  User, 
  Bot, 
  Maximize2, 
  ChevronRight,
  Loader2,
  Trash2,
  ArrowUp
} from 'lucide-react';
import { cn, streamChat, generateImage, textToSpeech, type ChatMessage } from './lib/gemini';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  type: 'text' | 'image' | 'audio';
  timestamp: Date;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (textOverride?: string) => {
    const finalInput = typeof textOverride === 'string' ? textOverride : input;
    if (!finalInput.trim() || isTyping) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: finalInput,
      type: 'text',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const history: ChatMessage[] = messages
        .filter(m => m.type === 'text')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));
      
      history.push({ role: 'user', parts: [{ text: finalInput }] });

      const stream = streamChat(history);
      let modelContent = '';
      
      const assistantId = Math.random().toString(36).substring(7);
      
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'model',
        content: '',
        type: 'text',
        timestamp: new Date(),
      }]);

      for await (const chunk of stream) {
        modelContent += chunk;
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, content: modelContent } : m
        ));
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        role: 'model',
        content: 'I encountered an error. Please try again.',
        type: 'text',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!input.trim() || isTyping) return;
    
    setIsTyping(true);
    const prompt = input;
    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: `Generate image: ${prompt}`,
      type: 'text',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const imageUrl = await generateImage(prompt);
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        role: 'model',
        content: imageUrl,
        type: 'image',
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Image Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const speak = async (text: string) => {
    try {
      const audioUrl = await textToSpeech(text);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-950 overflow-hidden text-zinc-100 selection:bg-zinc-100 selection:text-zinc-950">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-72 flex-col border-r border-zinc-900 bg-zinc-950 p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shadow-2xl shadow-zinc-100/10">
            <Sparkles className="w-6 h-6 text-zinc-950" />
          </div>
          <h1 className="text-xl font-medium tracking-tight">Aether AI</h1>
        </div>

        <nav className="flex-1 space-y-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-4 px-2">Navigation</div>
            <button 
              onClick={() => setActiveTab('chat')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                activeTab === 'chat' ? "bg-zinc-900 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
              )}
            >
              <Bot className="w-4 h-4" />
              Chat Assistant
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 mt-1",
                activeTab === 'history' ? "bg-zinc-900 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
              )}
            >
              <History className="w-4 h-4" />
              History
            </button>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-4 px-2">Actions</div>
            <button 
              onClick={() => setMessages([])}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-red-950/10 transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
              Clear Session
            </button>
          </div>
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-900">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <User className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <div className="text-xs font-medium">Guest User</div>
              <div className="text-[10px] text-zinc-500">Free Tier</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl z-10">
          <div className="md:hidden flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-zinc-100" />
            <span className="font-medium tracking-tight">Aether AI</span>
          </div>
          <div className="hidden md:block text-xs font-medium text-zinc-500 tracking-wider uppercase">
            Model: <span className="text-zinc-100">Gemini 3.1 Pro</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Connected</span>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-8 md:px-0"
        >
          <div className="max-w-3xl mx-auto space-y-8">
            <AnimatePresence initial={false}>
              {messages.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800 shadow-2xl">
                    <Sparkles className="w-8 h-8 text-zinc-100" />
                  </div>
                  <h2 className="text-3xl font-light tracking-tight mb-2">How can I assist you today?</h2>
                  <p className="text-zinc-500 text-sm max-w-md">
                    Experience Aether AI's advanced reasoning, image generation, and refined speech capabilities.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-12 w-full max-w-lg">
                    {[
                      { icon: <Bot className="w-4 h-4"/>, text: "Explain quantum entanglement simply" },
                      { icon: <ImageIcon className="w-4 h-4"/>, text: "Generate a neon cyberpunk cityscape" },
                      { icon: <Loader2 className="w-4 h-4"/>, text: "Write a high-end marketing email" },
                      { icon: <Volume2 className="w-4 h-4"/>, text: "Describe the architectural style of brutalism" }
                    ].map((item, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleSend(item.text)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left text-sm text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all duration-200 group"
                      >
                        <span className="text-zinc-500 group-hover:text-zinc-100 transition-colors">{item.icon}</span>
                        {item.text}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col gap-3 group",
                    message.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "flex items-center gap-2 mb-1",
                    message.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center border",
                      message.role === 'user' ? "bg-zinc-100 border-zinc-100 text-zinc-950" : "bg-zinc-950 border-zinc-800 text-zinc-100"
                    )}>
                      {message.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                      {message.role === 'user' ? 'Me' : 'Aether'}
                    </span>
                  </div>

                  <div className={cn(
                    "max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed relative",
                    message.role === 'user' 
                      ? "bg-zinc-100 text-zinc-950" 
                      : "bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-xl"
                  )}>
                    {message.type === 'text' && (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                    {message.type === 'image' && (
                      <div className="space-y-3">
                        <img 
                          src={message.content} 
                          alt="AI Generated" 
                          referrerPolicy="no-referrer"
                          className="rounded-lg w-full h-auto object-cover border border-zinc-800 hover:scale-[1.02] transition-transform duration-500" 
                        />
                        <button 
                          onClick={() => window.open(message.content)}
                          className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-zinc-100 transition-colors"
                        >
                          <Maximize2 className="w-3 h-3" /> View Large
                        </button>
                      </div>
                    )}

                    {message.role === 'model' && message.type === 'text' && message.content && (
                      <button 
                        onClick={() => speak(message.content)}
                        className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-zinc-900 text-zinc-500 hover:text-zinc-100 transition-all duration-200"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 text-zinc-500"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Lumina processing...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 md:pb-10 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message Aether or generate an image..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-6 pr-32 py-5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all duration-300 placeholder:text-zinc-600 focus:bg-zinc-900/80"
              />
              
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button 
                  onClick={handleGenerateImage}
                  disabled={!input.trim() || isTyping}
                  className="p-2 py-3.5 rounded-xl text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-all duration-200 disabled:opacity-30 flex items-center gap-2 px-3"
                  title="Generate Image"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-[10px] hidden sm:block uppercase font-bold tracking-widest">Image</span>
                </button>
                
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="p-2 py-3.5 h-[48px] px-4 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white transition-all duration-200 disabled:opacity-30 disabled:scale-95 flex items-center gap-2 group"
                >
                  <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-600">
              <div className="flex items-center gap-2"><Sparkles className="w-3 h-3" /> Pro 3.1</div>
              <div className="flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Flash 2.5</div>
              <div className="flex items-center gap-2"><Volume2 className="w-3 h-3" /> Zephyr Voice</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
