import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Send, Mic, Volume2, Plus, MessageSquare,
  TrendingUp, Wallet, Calendar, Zap, Bot, Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/store';
import { useI18n } from '@/lib/i18n/store';
import { streamCopilotResponse } from '@/lib/api/services';
import { cn, initials } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

const AGENTS = [
  { id: 'ceo', name: 'CEO Agent', icon: Bot, color: 'bg-primary' },
  { id: 'sales', name: 'Sales Agent', icon: TrendingUp, color: 'bg-emerald-500' },
  { id: 'finance', name: 'Finance Agent', icon: Wallet, color: 'bg-amber-500' },
  { id: 'hr', name: 'HR Agent', icon: Bot, color: 'bg-pink-500' },
  { id: 'analyst', name: 'Data Analyst', icon: Zap, color: 'bg-violet-500' },
];

const SUGGESTED_PROMPTS = [
  { key: 'ai.daySummary', icon: Calendar },
  { key: 'ai.unpaidClients', icon: Wallet },
  { key: 'ai.revenueForecast', icon: TrendingUp },
];

export function CopilotPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: '1', title: 'Analyse Q3 2024', messages: [], createdAt: new Date().toISOString() },
    { id: '2', title: 'Stratégie commerciale', messages: [], createdAt: new Date().toISOString() },
  ]);
  const [activeConvId, setActiveConvId] = useState('new');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m));
      }
    } finally {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m));
      setIsStreaming(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    setActiveConvId('new');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader title={t('ai.copilot')} description="Conversation complète avec votre assistant IA" />

      <div className="flex flex-1 gap-4 min-h-0">
        {/* History sidebar */}
        <Card className="w-64 shrink-0 hidden lg:flex flex-col">
          <CardContent className="p-3 flex flex-col h-full">
            <Button onClick={newChat} className="mb-3 w-full">
              <Plus className="h-4 w-4" />
              {t('ai.newChat')}
            </Button>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
              <p className="px-2 py-1 text-2xs font-medium uppercase text-muted-foreground">Aujourd'hui</p>
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
                    activeConvId === conv.id ? 'bg-primary-10 text-primary' : 'hover:bg-muted'
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-3">
            <div className="flex items-center gap-2">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-white', selectedAgent.color)}>
                <selectedAgent.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{selectedAgent.name}</p>
                <p className="text-2xs text-muted-foreground">En ligne</p>
              </div>
            </div>
            <select
              value={selectedAgent.id}
              onChange={(e) => setSelectedAgent(AGENTS.find((a) => a.id === e.target.value) || AGENTS[0])}
              className="rounded-lg border border-border bg-card px-2 py-1 text-xs outline-none"
            >
              {AGENTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-ai">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">{t('ai.copilot')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('ai.askAnything')}</p>
                <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3 max-w-lg">
                  {SUGGESTED_PROMPTS.map((prompt) => {
                    const Icon = prompt.icon;
                    return (
                      <button
                        key={prompt.key}
                        onClick={() => handleSend(t(prompt.key))}
                        className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:shadow-soft"
                      >
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="text-xs font-medium text-center">{t(prompt.key)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}
              >
                {msg.role === 'assistant' ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-ai">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary-100 text-2xs text-primary-700">
                      {user ? initials(`${user.firstName} ${user.lastName}`) : '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                    {msg.streaming && <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current" />}
                  </p>
                  {msg.role === 'assistant' && !msg.streaming && msg.content && (
                    <button className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <Volume2 className="h-3 w-3" /> Écouter
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <div className="flex flex-1 items-end rounded-xl border border-input bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={t('ai.askAnything')}
                  rows={1}
                  className="max-h-24 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => setIsRecording(!isRecording)} className={cn(isRecording && 'bg-red-50 border-red-200')}>
                <Mic className={cn('h-4 w-4', isRecording && 'text-red-500 animate-pulse')} />
              </Button>
              <Button size="icon" onClick={() => handleSend()} disabled={!input.trim() || isStreaming}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
