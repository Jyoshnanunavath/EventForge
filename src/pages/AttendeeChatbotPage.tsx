import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Bot, User as UserIcon, Sparkles, Trash2 } from 'lucide-react';
import { supabase, type Event, type Session, type Speaker, type ChatMessage, type ChatbotConversation } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { generateChatbotResponse } from '@/lib/ai';
import { PageLoader, EmptyState, Spinner } from '@/components/ui';
import { cn, formatRelative } from '@/lib/utils';

const suggestedQuestions = [
  'What time does the event start?',
  'Who are the speakers?',
  'What is the schedule?',
  'How do I check in?',
  'Where is the venue?',
];

export function AttendeeChatbotPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [venueName, setVenueName] = useState<string>('');
  const [conversation, setConversation] = useState<ChatbotConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data: eData } = await supabase.from('events').select('*, venue:venues(*)').eq('status', 'published').order('start_date', { ascending: false });
      const eventList = (eData as Event[]) || [];
      setEvents(eventList);
      if (eventList.length > 0) setSelectedEvent(eventList[0].id);
      setLoading(false);
    })();
  }, [profile]);

  useEffect(() => {
    if (!selectedEvent) return;
    (async () => {
      const [sessRes, spRes, convRes] = await Promise.all([
        supabase.from('sessions').select('*').eq('event_id', selectedEvent).order('start_time'),
        supabase.from('speakers').select('*').eq('event_id', selectedEvent),
        supabase.from('chatbot_conversations').select('*').eq('event_id', selectedEvent).maybeSingle(),
      ]);
      setSessions((sessRes.data as Session[]) || []);
      setSpeakers((spRes.data as Speaker[]) || []);
      const event = events.find((e) => e.id === selectedEvent);
      setVenueName(event?.venue?.name || '');
      const conv = convRes.data as ChatbotConversation | null;
      setConversation(conv);
      if (conv?.messages?.length) {
        setMessages(conv.messages);
      } else {
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm the event assistant for "${event?.title || 'this event'}". Ask me about the schedule, speakers, venue, tickets, check-in, or anything else!`,
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
      await supabase.from('chatbot_conversations').update({ messages: updatedMessages, updated_at: new Date().toISOString() }).eq('id', conversation.id);
    } else {
      const { data } = await supabase.from('chatbot_conversations').insert({
        event_id: selectedEvent,
        user_id: profile.id,
        messages: updatedMessages,
      }).select().single();
      setConversation(data as ChatbotConversation);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || !selectedEvent) return;
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setThinking(true);
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 600));
    const event = events.find((e) => e.id === selectedEvent)!;
    const response = generateChatbotResponse(text, { event, sessions, speakers, venueName });
    const assistantMsg: ChatMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
    const finalMessages = [...newMessages, assistantMsg];
    setMessages(finalMessages);
    setThinking(false);
    await saveConversation(finalMessages);
  }

  async function clearConversation() {
    if (!confirm('Clear conversation?')) return;
    if (conversation) await supabase.from('chatbot_conversations').delete().eq('id', conversation.id);
    setConversation(null);
    const event = events.find((e) => e.id === selectedEvent);
    setMessages([{ role: 'assistant', content: `Conversation cleared. What would you like to know about "${event?.title}"?`, timestamp: new Date().toISOString() }]);
    toast('Conversation cleared');
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<MessageCircle className="w-8 h-8" />} title="No events available" description="No published events to ask about yet" action={<button onClick={() => navigate('/events')} className="btn-primary">Browse Events</button>} />;

  return (
    <div className="space-y-4 max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Event Assistant</h1>
            <p className="text-xs text-neutral-500">Ask me anything about the event</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="input sm:w-56" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <button onClick={clearConversation} className="btn-ghost" title="Clear conversation"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center shrink-0"><Bot className="w-5 h-5" /></div>
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
        <input className="input flex-1" placeholder="Ask about the event…" value={input} onChange={(e) => setInput(e.target.value)} disabled={thinking} />
        <button type="submit" disabled={thinking || !input.trim()} className="btn-primary">{thinking ? <Spinner /> : <Send className="w-4 h-4" />}</button>
      </form>
    </div>
  );
}
