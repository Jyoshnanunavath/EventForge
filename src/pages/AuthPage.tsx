import { useState } from 'react';
import { Sparkles, Calendar, Users, BarChart3, ArrowRight, Mail, Lock, User, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { useToast } from '@/components/Toast';
import type { UserRole } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('attendee');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) {
        toast(error, 'error');
        setLoading(false);
      } else {
        toast('Welcome back!');
        navigate('/dashboard');
      }
    } else {
      if (password.length < 6) {
        toast('Password must be at least 6 characters', 'error');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, role);
      if (error) {
        toast(error, 'error');
        setLoading(false);
      } else {
        toast('Account created! You are now signed in.');
        navigate('/dashboard');
      }
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #8b5cf6 0%, transparent 50%), radial-gradient(circle at 70% 80%, #10b981 0%, transparent 50%)' }} />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight">EventForge</h1>
              <p className="text-xs text-neutral-400 uppercase tracking-wider">AI Event Management Platform</p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold font-display leading-tight mb-3">
                Plan, manage &amp;<br />deliver events<br />at scale.
              </h2>
              <p className="text-neutral-400 text-lg max-w-md">
                The all-in-one platform for event organizers — from ticketing and check-in to analytics and reporting.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md">
              {[
                { icon: <Calendar className="w-5 h-5" />, label: 'Event Creation' },
                { icon: <Users className="w-5 h-5" />, label: 'Speaker Management' },
                { icon: <BarChart3 className="w-5 h-5" />, label: 'Live Analytics' },
                { icon: <Sparkles className="w-5 h-5" />, label: 'QR Check-in' },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-9 h-9 rounded-lg bg-primary-500/20 text-primary-300 flex items-center justify-center">{f.icon}</div>
                  <span className="text-sm font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-neutral-500">Trusted by organizers worldwide · 15 features in one platform</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#f6f2fb]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold font-display">EventForge</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-1">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-neutral-500">
              {mode === 'signin' ? 'Sign in to manage your events' : 'Start managing events in minutes'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input className="input pl-10" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input className="input pl-10" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input className="input pl-10" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="label">I am joining as</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'attendee', label: 'Attendee', desc: 'Book & attend events', icon: <Users className="w-4 h-4" /> },
                    { value: 'organizer', label: 'Organizer', desc: 'Create & manage events', icon: <Building2 className="w-4 h-4" /> },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      className={cn(
                        'flex flex-col items-start gap-1.5 p-3.5 rounded-xl border-2 text-left transition-all',
                        role === opt.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300',
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', role === opt.value ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-500')}>
                        {opt.icon}
                      </div>
                      <span className="text-sm font-semibold text-neutral-900">{opt.label}</span>
                      <span className="text-xs text-neutral-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner /> : (<>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>)}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-6">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-primary-600 font-semibold hover:text-primary-700"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
