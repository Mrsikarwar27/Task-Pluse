import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import { PageLoader } from './components/LoadingState.jsx';
import Login from './pages/Login.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ManageClients from './pages/ManageClients.jsx';
import TaskFormPage from './pages/TaskFormPage.jsx';
import ClientDashboard from './pages/ClientDashboard.jsx';
import TaskDetailPage from './pages/TaskDetailPage.jsx';
import NotFound from './pages/NotFound.jsx';
import { dashboardPath } from './lib/utils.js';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={user ? dashboardPath(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/clients" element={<ManageClients />} />
          <Route path="/admin/tasks/new" element={<TaskFormPage />} />
          <Route path="/admin/tasks/:id/edit" element={<TaskFormPage />} />
          <Route path="/admin/tasks/:id" element={<TaskDetailPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['client']} />}>
        <Route element={<AppLayout />}>
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/client/tasks/:id" element={<TaskDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
