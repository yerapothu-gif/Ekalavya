import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Layout from './components/Layout.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import StudentDashboard from './features/student-dashboard/StudentDashboard.jsx';
import MentorDashboard from './features/mentor-dashboard/MentorDashboard.jsx';
import AdminDashboard from './features/admin-dashboard/AdminDashboard.jsx';

const HOME_BY_ROLE = {
  student: '/student',
  mentor: '/mentor',
  teacher: '/mentor',
  admin: '/admin',
};

function Home() {
  const { session, role, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={HOME_BY_ROLE[role] || '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<Layout />}>
        <Route
          path="/student"
          element={
            <RoleRoute allowedRoles={['student']}>
              <StudentDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/mentor"
          element={
            <RoleRoute allowedRoles={['mentor', 'teacher']}>
              <MentorDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="/" element={<Home />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
