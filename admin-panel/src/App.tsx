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
  );
}

export default App;
