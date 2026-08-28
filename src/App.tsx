import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { AppShell, BareLayout } from '@/components/Navigation';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { AccountSettingsPage } from '@/pages/AccountSettingsPage';
import { CoursesPage } from '@/pages/CoursesPage';
import { JoinPage } from '@/pages/JoinPage';
import { StudentsPage } from '@/pages/StudentsPage';
import { CourseDetailPage } from '@/pages/CourseDetailPage';
import { TaskDetailPage } from '@/pages/TaskDetailPage';
import { SubmitTaskPage } from '@/pages/SubmitTaskPage';
import { SubmissionDetailPage } from '@/pages/SubmissionDetailPage';
import { EvaluatePage } from '@/pages/EvaluatePage';
import { DiagnosticsPage } from '@/pages/DiagnosticsPage';
import { RequireProfile } from '@/hooks/useBackend';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function Layout({ children }: { children: React.ReactNode }) {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (path === '/login' || path === '/sign-up') {
    return <BareLayout><ErrorBoundary>{children}</ErrorBoundary></BareLayout>;
  }
  return <AppShell><ErrorBoundary>{children}</ErrorBoundary></AppShell>;
}

export function App() {
  return (
    <BrowserRouter>
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <style>{`.Toastify__progress-bar{ background: #1E5AA8 !important; } .Toastify__progress-bar--bg{ background: #EAF1F9 !important; }`}</style>
      <Layout>
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />

          {/* Requiere sesión + rol elegido */}
          <Route path="/onboarding" element={<><SignedIn><OnboardingPage /></SignedIn><SignedOut><Navigate to="/login?redirect_url=%2Fonboarding" replace /></SignedOut></>} />
          <Route path="/settings" element={<><SignedIn><AccountSettingsPage /></SignedIn><SignedOut><Navigate to="/login" replace /></SignedOut></>} />
          <Route path="/courses" element={<RequireProfile><CoursesPage /></RequireProfile>} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/:code" element={<JoinPage />} />
          <Route path="/courses/:id" element={<RequireProfile><CourseDetailPage /></RequireProfile>} />
          <Route path="/courses/:id/students" element={<RequireProfile><StudentsPage /></RequireProfile>} />
          <Route path="/courses/:cid/tasks/:tid" element={<RequireProfile><TaskDetailPage /></RequireProfile>} />
          <Route path="/courses/:cid/tasks/:tid/submit" element={<RequireProfile><SubmitTaskPage /></RequireProfile>} />
          <Route path="/courses/:cid/tasks/:tid/submissions/:sid" element={<RequireProfile><SubmissionDetailPage /></RequireProfile>} />

          {/* Herramientas */}
          <Route path="/dev/evaluate" element={<><SignedIn><EvaluatePage /></SignedIn><SignedOut><Navigate to="/login" replace /></SignedOut></>} />
          <Route path="/dev/rls" element={<DiagnosticsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
