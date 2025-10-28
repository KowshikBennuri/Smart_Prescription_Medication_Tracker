import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PatientDashboard } from './components/PatientDashboard';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth />;
  }

  if (profile.role === 'doctor') {
    return <DoctorDashboard />;
  }

  return <PatientDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
