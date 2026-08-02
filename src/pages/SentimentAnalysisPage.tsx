import { useEffect, useState } from 'react';
import { Smile, Frown, Meh, Star, Sparkles, Plus, Send } from 'lucide-react';
import { supabase, type Event, type EventFeedback, type FeedbackCategory } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import { analyzeSentiment, summarizeSentiment, type SentimentSummary } from '@/lib/ai';
import { PageLoader, EmptyState, StatCard, Spinner } from '@/components/ui';
import { DonutChart } from '@/components/Charts';
import { cn, formatRelative } from '@/lib/utils';

const categories: { value: FeedbackCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'content', label: 'Content' },
  { value: 'venue', label: 'Venue' },
  { value: 'speakers', label: 'Speakers' },
  { value: 'organization', label: 'Organization' },
  { value: 'food', label: 'Food' },
  { value: 'other', label: 'Other' },
];

export function SentimentAnalysisPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [feedback, setFeedback] = useState<EventFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: '', category: 'general' as FeedbackCategory });

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data: eData } = await supabase.from('events').select('*').order('start_date', { ascending: false });
      const eventList = (eData as Event[]) || [];
      setEvents(eventList);
      if (eventList.length > 0) setSelectedEvent(eventList[0].id);
      setLoading(false);
    })();
  }, [profile]);

  useEffect(() => {
    if (!selectedEvent || !profile) return;
    (async () => {
      const isOrganizer = profile.role === 'organizer' || profile.role === 'admin';
      const query = isOrganizer
        ? supabase.from('event_feedback').select('*').eq('event_id', selectedEvent).order('created_at', { ascending: false })
        : supabase.from('event_feedback').select('*').eq('event_id', selectedEvent).eq('user_id', profile.id).order('created_at', { ascending: false });
      const { data } = await query;
      setFeedback((data as EventFeedback[]) || []);
    })();
  }, [selectedEvent, profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !selectedEvent) return;
    if (!form.comment.trim()) { toast('Please write a comment', 'error'); return; }
    setSubmitting(true);
    const { score, label } = analyzeSentiment(form.comment);
    const { data, error } = await supabase.from('event_feedback').insert({
      event_id: selectedEvent,
      user_id: profile.id,
      rating: form.rating,
      comment: form.comment,
      sentiment_score: score,
      sentiment_label: label,
      category: form.category,
    }).select().single();
    if (error) { toast(error.message, 'error'); setSubmitting(false); return; }
    setFeedback((prev) => [data as EventFeedback, ...prev]);
    setForm({ rating: 5, comment: '', category: 'general' });
    toast('Feedback submitted — thank you!');
    setSubmitting(false);
  }

  if (loading) return <PageLoader />;
  if (events.length === 0) return <EmptyState icon={<Smile className="w-8 h-8" />} title="No events available" description="Create an event to collect feedback" action={<button onClick={() => navigate('/events/new')} className="btn-primary">Create Event</button>} />;

  const isOrganizer = profile?.role === 'organizer' || profile?.role === 'admin';
  const summary: SentimentSummary = summarizeSentiment(feedback);
  const sentimentData = [
    { label: 'Positive', value: summary.positiveCount, color: '#10b981' },
    { label: 'Neutral', value: summary.neutralCount, color: '#94a3b8' },
    { label: 'Negative', value: summary.negativeCount, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
          <Smile className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Sentiment Analysis</h1>
          <p className="text-xs text-neutral-500">AI-powered feedback analysis from your attendees</p>
        </div>
      </div>

      <select className="input sm:w-64" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
        {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>

      {/* Submit feedback form */}
      <div className="card p-6">
        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-primary-600" /> {isOrganizer ? 'Add Test Feedback' : 'Share Your Feedback'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button key={r} type="button" onClick={() => setForm({ ...form, rating: r })} className="p-1">
                    <Star className={cn('w-7 h-7 transition-colors', r <= form.rating ? 'fill-warning-500 text-warning-500' : 'text-neutral-300')} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as FeedbackCategory })}>
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Comment</label>
            <textarea className="input min-h-[80px]" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Tell us about your experience…" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <Spinner /> : <><Send className="w-4 h-4" /> Submit Feedback</>}</button>
          </div>
        </form>
      </div>

      {feedback.length > 0 ? (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Feedback" value={String(feedback.length)} icon={<Sparkles className="w-5 h-5" />} color="primary" />
            <StatCard label="Avg Rating" value={`${summary.averageRating.toFixed(1)}/5`} icon={<Star className="w-5 h-5" />} color="warning" />
            <StatCard label="Positive" value={String(summary.positiveCount)} icon={<Smile className="w-5 h-5" />} color="accent" />
            <StatCard label="Negative" value={String(summary.negativeCount)} icon={<Frown className="w-5 h-5" />} color="error" />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Sentiment Distribution</h3>
              {sentimentData.length > 0 ? <DonutChart data={sentimentData} /> : <p className="text-sm text-neutral-400 py-8 text-center">No data</p>}
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Category Breakdown</h3>
              <div className="space-y-3">
                {summary.categoryBreakdown.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-600 capitalize">{c.category}</span>
                      <span className={cn('font-medium', c.avgScore > 0.1 ? 'text-accent-600' : c.avgScore < -0.1 ? 'text-error-600' : 'text-neutral-500')}>
                        {c.avgScore > 0.1 ? 'Positive' : c.avgScore < -0.1 ? 'Negative' : 'Neutral'} ({c.count})
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', c.avgScore > 0.1 ? 'bg-accent-500' : c.avgScore < -0.1 ? 'bg-error-500' : 'bg-neutral-400')} style={{ width: `${Math.abs(c.avgScore) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top themes */}
          {summary.topThemes.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary-600" /> Top Feedback Themes</h3>
              <div className="flex flex-wrap gap-2">
                {summary.topThemes.map((t) => (
                  <div key={t.theme} className={cn('px-3 py-2 rounded-xl border text-sm', t.sentiment > 0.1 ? 'bg-accent-50 border-accent-200 text-accent-700' : t.sentiment < -0.1 ? 'bg-error-50 border-error-200 text-error-700' : 'bg-neutral-50 border-neutral-200 text-neutral-600')}>
                    {t.theme} <span className="text-xs opacity-60">({t.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual feedback */}
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-neutral-100"><h3 className="font-semibold text-neutral-900">All Feedback ({feedback.length})</h3></div>
            <div className="divide-y divide-neutral-50 max-h-96 overflow-y-auto">
              {feedback.map((f) => (
                <div key={f.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {f.sentiment_label === 'positive' && <Smile className="w-5 h-5 text-accent-500" />}
                      {f.sentiment_label === 'neutral' && <Meh className="w-5 h-5 text-neutral-400" />}
                      {f.sentiment_label === 'negative' && <Frown className="w-5 h-5 text-error-500" />}
                      <span className="text-xs font-medium text-neutral-500 capitalize">{f.category}</span>
                      <div className="flex">{[...Array(f.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-warning-500 text-warning-500" />)}</div>
                    </div>
                    <span className="text-xs text-neutral-400">{formatRelative(f.created_at)}</span>
                  </div>
                  <p className="text-sm text-neutral-700">{f.comment}</p>
                  <p className="text-xs text-neutral-400 mt-1">Sentiment score: {f.sentiment_score.toFixed(2)} ({f.sentiment_label})</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={<Smile className="w-8 h-8" />} title="No feedback yet" description="Feedback will appear here once attendees submit their reviews" />
      )}
    </div>
  );
}
