import { Auth } from './components/Auth'; // <-- Fixed path
import { DoctorDashboard } from './components/DoctorDashboard'; // <-- Fixed path
import { PatientDashboard } from './components/PatientDashboard'; // <-- Fixed path
import { useAuth } from './contexts/AuthContext'; // <-- Fixed path

function App() {
  const { session, profile, loading } = useAuth();

  // Show a loading screen while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  // No session, show the Auth page
  if (!session || !profile) {
    return <Auth />;
  }

  // Session exists, check the profile role
  if (profile.role === 'doctor') {
    return <DoctorDashboard />;
  }

  if (profile.role === 'patient') {
    return <PatientDashboard />;
  }

  // Fallback (e.g., profile still loading or role is undefined)
  return <Auth />;
}

export default App;