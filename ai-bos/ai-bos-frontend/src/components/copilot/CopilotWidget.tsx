import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Send, Mic, Volume2, Bot, User as UserIcon,
  TrendingUp, Wallet, Calendar, Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/store';
import { useI18n } from '@/lib/i18n/store';
import { streamCopilotResponse } from '@/lib/api/services';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, initials } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const AGENTS = [
  { id: 'ceo', name: 'CEO Agent', icon: Bot },
  { id: 'sales', name: 'Sales Agent', icon: TrendingUp },
  { id: 'finance', name: 'Finance Agent', icon: Wallet },
  { id: 'hr', name: 'HR Agent', icon: UserIcon },
  { id: 'analyst', name: 'Data Analyst', icon: Zap },
];

const SUGGESTED_PROMPTS = [
  { key: 'ai.daySummary', icon: Calendar },
  { key: 'ai.unpaidClients', icon: Wallet },
  { key: 'ai.revenueForecast', icon: TrendingUp },
];

function getContextFromPath(pathname: string): string {
  if (pathname.includes('crm')) return 'CRM';
  if (pathname.includes('finance')) return 'Finance';
  if (pathname.includes('hr')) return 'HR';
  if (pathname.includes('project')) return 'Projects';
  if (pathname.includes('analytics') || pathname.includes('bi') || pathname.includes('forecast')) return 'Analytics';
  if (pathname.includes('support')) return 'Support';
  if (pathname.includes('marketing')) return 'Marketing';
  if (pathname.includes('dashboard')) return 'Dashboard';
  return 'Global';
}

export function CopilotWidget() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const context = getContextFromPath(location.pathname);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (promptText?: string) => {
    const text = promptText || input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    try {
      for await (const chunk of streamCopilotResponse(text, selectedAgent.id)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      }
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
      setIsStreaming(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl gradient-ai shadow-floating hover:shadow-floating hover:scale-105 transition-transform"
          >
            <Sparkles className="h-6 w-6 text-white" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-floating"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary-600 to-violet-600 p-3 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t('ai.copilot')}</p>
                  <p className="text-2xs text-white/70">Context: {context}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={selectedAgent.id}
                  onChange={(e) => setSelectedAgent(AGENTS.find((a) => a.id === e.target.value) || AGENTS[0])}
                  className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs text-white outline-none [&>option]:text-slate-900"
                >
                  {AGENTS.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setOpen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl gradient-ai">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{t('ai.copilot')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('ai.askAnything')}</p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {SUGGESTED_PROMPTS.map((prompt) => {
                      const Icon = prompt.icon;
                      return (
                        <button
                          key={prompt.key}
                          onClick={() => handleSend(t(prompt.key))}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary-50"
                        >
                          <Icon className="h-3 w-3 text-primary" />
                          {t(prompt.key)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}
                >
                  {msg.role === 'assistant' ? (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg gradient-ai">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-primary-100 text-2xs text-primary-700">
                        {user ? initials(`${user.firstName} ${user.lastName}`) : '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                      {msg.streaming && <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current" />}
                    </p>
                    {msg.role === 'assistant' && !msg.streaming && msg.content && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <button className="rounded p-1 text-muted-foreground hover:bg-card hover:text-foreground" title="Speaker">
                          <Volume2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <div className="flex flex-1 items-end rounded-xl border border-input bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={t('ai.askAnything')}
                    rows={1}
                    className="max-h-24 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsRecording(!isRecording)}
                  className={cn(isRecording && 'bg-red-50 border-red-200')}
                >
                  <Mic className={cn('h-4 w-4', isRecording && 'text-red-500 animate-pulse')} />
                </Button>
                <Button
                  size="icon"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isStreaming}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
