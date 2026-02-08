import { Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import { AdminLayout } from './components/AdminLayout';
import WorkPlansPage from './pages/WorkPlansPage';
import ReportsPage from './pages/ReportsPage';
import EmployeesPage from './pages/EmployeesPage';
import CRMLeadsPage from './pages/CRMLeadsPage';
import ConfigPage from './pages/ConfigPage';
import AuditLogsPage from './pages/AuditLogsPage';

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-red-900/50 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h1 className="text-xl font-bold text-white">Configuration Error</h1>
            </div>
            <p className="text-zinc-300 mb-4">
              The application failed to initialize. This is likely due to missing environment variables.
            </p>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3 mb-4">
              <p className="text-red-400 text-sm font-mono">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
            <div className="text-sm text-zinc-400 space-y-2">
              <p className="font-semibold text-zinc-300">To fix this:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to Netlify Dashboard → Site configuration</li>
                <li>Navigate to Environment variables</li>
                <li>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</li>
                <li>Trigger a new deployment</li>
              </ol>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <div className="p-8 text-white">Access Denied. Admins only.</div>;
  }

  return <>{children}</>;
}


function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="crm-leads" element={<CRMLeadsPage />} />
              <Route path="work-plans" element={<WorkPlansPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="config" element={<ConfigPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
