import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Bot, User as UserIcon, CalendarDays, Users, DollarSign, Mic, Trash2 } from 'lucide-react';
import { supabase, type Event, type Ticket, type Speaker, type Session, type ChatMessage, type AIConversation } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { generateAssistantResponse } from '@/lib/ai';
import { PageLoader, EmptyState, Spinner } from '@/components/ui';
import { cn, formatRelative } from '@/lib/utils';

const suggestedQuestions = [
  'What should I prioritize for my event?',
  'How is my event budget looking?',
  'How do I promote my event?',
  'How many volunteers do I need?',
  'What could go wrong at my event?',
];

export function AIAssistantPage() {
  const { profile } = useAuth();
  const { route, navigate } = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data: eData } = await supabase.from('events').select('*').order('start_date', { ascending: false });
      const eventList = (eData as Event[]) || [];
      setEvents(eventList);
      if (route.params.event) setSelectedEvent(route.params.event);
      else if (eventList.length > 0) setSelectedEvent(eventList[0].id);
      setLoading(false);
    })();
  }, [profile, route.params.event]);

  useEffect(() => {
    if (!selectedEvent) return;
    (async () => {
      const [tRes, spRes, sessRes, convRes] = await Promise.all([
        supabase.from('tickets').select('*').eq('event_id', selectedEvent),
        supabase.from('speakers').select('*').eq('event_id', selectedEvent),
        supabase.from('sessions').select('*').eq('event_id', selectedEvent),
        supabase.from('ai_conversations').select('*').eq('event_id', selectedEvent).maybeSingle(),
      ]);
      setTickets((tRes.data as Ticket[]) || []);
      setSpeakers((spRes.data as Speaker[]) || []);
      setSessions((sessRes.data as Session[]) || []);
      const conv = convRes.data as AIConversation | null;
      setConversation(conv);
      if (conv?.messages?.length) {
        setMessages(conv.messages);
      } else {
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm your AI Event Planning Assistant. I can help you plan "${events.find((e) => e.id === selectedEvent)?.title || 'your event'}" — ask me about timelines, budgets, marketing, speakers, volunteers, seating, and more.`,
          timestamp: new Date().toISOString(),
        }]);
      }
    })();
  }, [selectedEvent, events]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  async function saveConversation(updatedMessages: ChatMessage[]) {
    if (!profile || !selectedEvent) return;
    if (conversation) {
      await supabase.from('ai_conversations').update({ messages: updatedMessages, updated_at: new Date().toISOString() }).eq('id', conversation.id);
    } else {
      const { data } = await supabase.from('ai_conversations').insert({
        user_id: profile.id,
        event_id: selectedEvent,
        messages: updatedMessages,
      }).select().single();
      setConversation(data as AIConversation);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || !selectedEvent) return;
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setThinking(true);

    // Simulate AI thinking time
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));

    const event = events.find((e) => e.id === selectedEvent);
    const confirmedTickets = tickets.filter((t) => t.status === 'confirmed');
    const response = generateAssistantResponse(text, {
      event: event || undefined,
      events,
      ticketCount: confirmedTickets.reduce((s, t) => s + t.quantity, 0),
      speakerCount: speakers.length,
      sessionCount: sessions.length,
      venueCapacity: event?.max_attendees,
    });

    const assistantMsg: ChatMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
    const finalMessages = [...newMessages, assistantMsg];
    setMessages(finalMessages);
    setThinking(false);
    await saveConversation(finalMessages);
  }

  async function clearConversation() {
    if (!confirm('Clear conversation history?')) return;
    if (conversation) {
      await supabase.from('ai_conversations').delete().eq('id', conversation.id);
    }
    setConversation(null);
    setMessages([{
      role: 'assistant',
      content: `Conversation cleared. What would you like to know about your event?`,
      timestamp: new Date().toISOString(),
    }]);
    toast('Conversation cleared');
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<Sparkles className="w-8 h-8" />} title="No events to analyze" description="Create an event first to use the AI assistant" action={<button onClick={() => navigate('/events/new')} className="btn-primary">Create Event</button>} />;

  const event = events.find((e) => e.id === selectedEvent);
  const confirmedTickets = tickets.filter((t) => t.status === 'confirmed').reduce((s, t) => s + t.quantity, 0);

  return (
    <div className="space-y-4 max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">AI Planning Assistant</h1>
            <p className="text-xs text-neutral-500">Context-aware recommendations for your events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="input sm:w-56" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <button onClick={clearConversation} className="btn-ghost" title="Clear conversation"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Context bar */}
      {event && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge-primary"><CalendarDays className="w-3 h-3" /> {event.category}</span>
          <span className="badge-neutral"><DollarSign className="w-3 h-3" /> {event.price > 0 ? `$${event.price}` : 'Free'}</span>
          <span className="badge-neutral"><Users className="w-3 h-3" /> {confirmedTickets}/{event.max_attendees} sold</span>
          <span className="badge-neutral"><Mic className="w-3 h-3" /> {speakers.length} speakers</span>
          <span className="badge-neutral"><CalendarDays className="w-3 h-3" /> {sessions.length} sessions</span>
        </div>
      )}

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-1">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', msg.role === 'assistant' ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white' : 'bg-neutral-200 text-neutral-600')}>
              {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
            </div>
            <div className={cn('max-w-[80%] rounded-2xl px-4 py-3', msg.role === 'assistant' ? 'bg-white border border-neutral-200 shadow-soft' : 'bg-primary-600 text-white')}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <p className={cn('text-[10px] mt-1.5', msg.role === 'assistant' ? 'text-neutral-400' : 'text-primary-200')}>{formatRelative(msg.timestamp)}</p>
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-neutral-200 shadow-soft rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && !thinking && (
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <button key={q} onClick={() => sendMessage(q)} className="px-3 py-2 rounded-xl text-xs font-medium bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300 hover:text-primary-700 transition-colors">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Ask me anything about your event…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={thinking}
        />
        <button type="submit" disabled={thinking || !input.trim()} className="btn-primary">
          {thinking ? <Spinner /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
