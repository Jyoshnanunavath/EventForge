import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RouterProvider, useRouter } from '@/context/Router';
import { ToastProvider } from '@/components/Toast';
import { AppLayout } from '@/components/AppLayout';
import { FullPageLoader } from '@/components/ui';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EventsPage } from '@/pages/EventsPage';
import { EventDetailPage } from '@/pages/EventDetailPage';
import { EventEditorPage } from '@/pages/EventEditorPage';
import { VenuesPage } from '@/pages/VenuesPage';
import { SpeakersPage } from '@/pages/SpeakersPage';
import { SessionsPage } from '@/pages/SessionsPage';
import { SponsorsPage } from '@/pages/SponsorsPage';
import { ExhibitorsPage } from '@/pages/ExhibitorsPage';
import { TicketsPage, TicketDetailPage } from '@/pages/TicketsPage';
import { CheckInPage } from '@/pages/CheckInPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AIAssistantPage } from '@/pages/AIAssistantPage';
import { ScheduleGeneratorPage } from '@/pages/ScheduleGeneratorPage';
import { VolunteerAllocationPage } from '@/pages/VolunteerAllocationPage';
import { SeatingArrangementPage } from '@/pages/SeatingArrangementPage';
import { CrowdPredictionPage } from '@/pages/CrowdPredictionPage';
import { SentimentAnalysisPage } from '@/pages/SentimentAnalysisPage';
import { AIReportGeneratorPage } from '@/pages/AIReportGeneratorPage';
import { BudgetPredictionPage } from '@/pages/BudgetPredictionPage';
import { RiskDetectionPage } from '@/pages/RiskDetectionPage';
import { AttendeeChatbotPage } from '@/pages/AttendeeChatbotPage';

function Routes() {
  const { route, navigate } = useRouter();
  const { profile, loading } = useAuth();

  if (loading) return <FullPageLoader />;

  if (!profile) {
    if (route.path === '/' || route.path === '/signin' || route.path === '/signup') return <AuthPage />;
    return <AuthPage />;
  }

  const path = route.path;
  const parts = path.split('/');

  let page: React.ReactNode;

  if (path === '/' || path === '/dashboard') {
    page = <DashboardPage />;
  } else if (path === '/events') {
    page = <EventsPage />;
  } else if (path === '/events/new') {
    page = <EventEditorPage />;
  } else if (parts[1] === 'events' && parts[2] && parts[3] === 'edit') {
    page = <EventEditorPage eventId={parts[2]} />;
  } else if (parts[1] === 'events' && parts[2]) {
    page = <EventDetailPage eventId={parts[2]} />;
  } else if (path === '/venues') {
    page = <VenuesPage />;
  } else if (path === '/speakers') {
    page = <SpeakersPage />;
  } else if (path === '/sessions') {
    page = <SessionsPage />;
  } else if (path === '/sponsors') {
    page = <SponsorsPage />;
  } else if (path === '/exhibitors') {
    page = <ExhibitorsPage />;
  } else if (path === '/tickets') {
    page = <TicketsPage />;
  } else if (parts[1] === 'tickets' && parts[2]) {
    page = <TicketDetailPage ticketId={parts[2]} />;
  } else if (path === '/checkin') {
    page = <CheckInPage />;
  } else if (path === '/analytics') {
    page = <AnalyticsPage />;
  } else if (path === '/reports') {
    page = <ReportsPage />;
  } else if (path === '/settings') {
    page = <SettingsPage />;
  } else if (path === '/ai-assistant') {
    page = <AIAssistantPage />;
  } else if (path === '/schedule-generator') {
    page = <ScheduleGeneratorPage />;
  } else if (path === '/volunteer-allocation') {
    page = <VolunteerAllocationPage />;
  } else if (path === '/seating-arrangement') {
    page = <SeatingArrangementPage />;
  } else if (path === '/crowd-prediction') {
    page = <CrowdPredictionPage />;
  } else if (path === '/sentiment-analysis') {
    page = <SentimentAnalysisPage />;
  } else if (path === '/ai-report-generator') {
    page = <AIReportGeneratorPage />;
  } else if (path === '/budget-prediction') {
    page = <BudgetPredictionPage />;
  } else if (path === '/risk-detection') {
    page = <RiskDetectionPage />;
  } else if (path === '/attendee-chatbot') {
    page = <AttendeeChatbotPage />;
  } else {
    page = (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
        <p className="text-neutral-500 mb-6">Page not found</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">Go to Dashboard</button>
      </div>
    );
  }

  return <AppLayout>{page}</AppLayout>;
}

function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes />
        </ToastProvider>
      </AuthProvider>
    </RouterProvider>
  );
}

export default App;
