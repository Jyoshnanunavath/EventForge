import { useState, useEffect, type ReactNode } from 'react';
import {
  CalendarDays, LayoutDashboard, Ticket as TicketIcon, MapPin, Users, Mic,
  Building2, QrCode, BarChart3, Bell, LogOut, Menu, X, Settings, ChevronDown,
  Sparkles, FileBarChart, UserCog, Bot, CalendarClock, Armchair, TrendingUp,
  Smile, FileText, DollarSign, ShieldAlert, MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/Router';
import { cn, initials } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import type { NotificationItem } from '@/lib/supabase';

type NavItem = {
  label: string;
  path: string;
  icon: ReactNode;
  roles?: string[];
};

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { label: 'Events', path: '/events', icon: <CalendarDays className="w-[18px] h-[18px]" /> },
  { label: 'My Tickets', path: '/tickets', icon: <TicketIcon className="w-[18px] h-[18px]" />, roles: ['attendee', 'organizer', 'admin'] },
  { label: 'Event Assistant', path: '/attendee-chatbot', icon: <MessageCircle className="w-[18px] h-[18px]" />, roles: ['attendee', 'organizer', 'admin'] },
  { label: 'Venues', path: '/venues', icon: <MapPin className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Speakers', path: '/speakers', icon: <Mic className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Sessions', path: '/sessions', icon: <Users className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Sponsors', path: '/sponsors', icon: <Building2 className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Exhibitors', path: '/exhibitors', icon: <Building2 className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Check-in', path: '/checkin', icon: <QrCode className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Analytics', path: '/analytics', icon: <BarChart3 className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Reports', path: '/reports', icon: <FileBarChart className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
];

const aiNavItems: NavItem[] = [
  { label: 'AI Planning Assistant', path: '/ai-assistant', icon: <Bot className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Schedule Generator', path: '/schedule-generator', icon: <CalendarClock className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Volunteer Allocation', path: '/volunteer-allocation', icon: <Users className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Seating Arrangement', path: '/seating-arrangement', icon: <Armchair className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Crowd Prediction', path: '/crowd-prediction', icon: <TrendingUp className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Sentiment Analysis', path: '/sentiment-analysis', icon: <Smile className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'AI Report Generator', path: '/ai-report-generator', icon: <FileText className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Budget Prediction', path: '/budget-prediction', icon: <DollarSign className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
  { label: 'Risk Detection', path: '/risk-detection', icon: <ShieldAlert className="w-[18px] h-[18px]" />, roles: ['organizer', 'admin'] },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { route, navigate } = useRouter();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const role = profile?.role || 'attendee';
  const items = navItems.filter((i) => !i.roles || i.roles.includes(role));
  const aiItems = aiNavItems.filter((i) => !i.roles || i.roles.includes(role));

  useEffect(() => {
    if (!profile) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications((data as NotificationItem[]) || []);
      channel = supabase
        .channel('notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
          setNotifications((prev) => [payload.new as NotificationItem, ...prev].slice(0, 20));
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [profile]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAllRead() {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
    toast('Signed out successfully');
  }

  function isActive(path: string) {
    if (path === '/events' && route.path.startsWith('/events')) return true;
    if (path === '/venues' && route.path.startsWith('/venues')) return true;
    if (path === '/ai-assistant' && route.path.startsWith('/ai-assistant')) return true;
    if (path === '/schedule-generator' && route.path.startsWith('/schedule-generator')) return true;
    if (path === '/volunteer-allocation' && route.path.startsWith('/volunteer-allocation')) return true;
    if (path === '/seating-arrangement' && route.path.startsWith('/seating-arrangement')) return true;
    if (path === '/crowd-prediction' && route.path.startsWith('/crowd-prediction')) return true;
    if (path === '/sentiment-analysis' && route.path.startsWith('/sentiment-analysis')) return true;
    if (path === '/ai-report-generator' && route.path.startsWith('/ai-report-generator')) return true;
    if (path === '/budget-prediction' && route.path.startsWith('/budget-prediction')) return true;
    if (path === '/risk-detection' && route.path.startsWith('/risk-detection')) return true;
    if (path === '/attendee-chatbot' && route.path.startsWith('/attendee-chatbot')) return true;
    return route.path === path;
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-neutral-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white font-display tracking-tight">EventForge</h1>
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">AI Event Platform</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              isActive(item.path)
                ? 'bg-primary-600/20 text-primary-300 border border-primary-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60',
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
        {aiItems.length > 0 && (
          <div className="pt-4 mt-2 border-t border-neutral-800">
            <p className="px-3 mb-1 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> AI Tools
            </p>
            {aiItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive(item.path)
                    ? 'bg-primary-600/20 text-primary-300 border border-primary-600/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-neutral-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {initials(profile?.full_name || 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
            <p className="text-xs text-neutral-500 capitalize">{role}</p>
          </div>
          <button onClick={handleSignOut} className="text-neutral-400 hover:text-error-400 transition-colors p-1.5" title="Sign out">
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f2fb] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-neutral-900 flex-col fixed inset-y-0 left-0 z-30">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-neutral-900 animate-slide-in">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-neutral-200">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-neutral-600">
                <Menu className="w-6 h-6" />
              </button>
              <div className="hidden sm:block">
                <h2 className="text-sm font-semibold text-neutral-700">
                  {[...items, ...aiItems].find((i) => isActive(i.path))?.label || 'EventForge'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen && unreadCount > 0) markAllRead(); }}
                  className="relative p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-error-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-card border border-neutral-200 z-20 animate-scale-in max-h-96 overflow-y-auto">
                      <div className="p-4 border-b border-neutral-100">
                        <h3 className="font-semibold text-sm text-neutral-900">Notifications</h3>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-neutral-400">No notifications yet</div>
                      ) : (
                        <div className="divide-y divide-neutral-50">
                          {notifications.map((n) => (
                            <div key={n.id} className={cn('p-4 hover:bg-neutral-50 transition-colors', !n.is_read && 'bg-primary-50/40')}>
                              <p className="text-sm font-medium text-neutral-900">{n.title}</p>
                              <p className="text-xs text-neutral-500 mt-0.5">{n.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2 rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-semibold">
                    {initials(profile?.full_name || 'U')}
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-card border border-neutral-200 z-20 animate-scale-in py-2">
                      <div className="px-4 py-2 border-b border-neutral-100">
                        <p className="text-sm font-medium text-neutral-900 truncate">{profile?.full_name}</p>
                        <p className="text-xs text-neutral-500 truncate">{profile?.company || 'No company set'}</p>
                      </div>
                      <button
                        onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </button>
                      {role === 'attendee' && (
                        <button
                          onClick={() => { setUserMenuOpen(false); navigate('/tickets'); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                        >
                          <TicketIcon className="w-4 h-4" /> My Tickets
                        </button>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error-600 hover:bg-error-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
