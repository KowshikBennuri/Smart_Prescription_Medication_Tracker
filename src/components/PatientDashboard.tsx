import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Pill, LogOut, CheckCircle, AlertCircle, Sunrise, Sun, Sunset, User } from 'lucide-react'; // Added User icon
import { MedicationTracker } from './MedicationTracker';
import { supabase } from '../lib/supabaseClient';
import { EditProfileModal } from './EditProfileModal'; // NEW IMPORT

// --- (Types) ---
type MedicationItem = {
  id: string;
  name: string;
  dosage: string;
  timing: { morning: boolean; afternoon: boolean; night: boolean };
  instructions: string;
};

type Prescription = {
  id: string;
  patient_id: string;
  doctor_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled' | 'pending_ai_check';
  diagnosis?: string | null;
  medications: MedicationItem[];
  created_at?: string;
};

type MedicationLog = {
  id: string; // This is the log's own ID
  prescription_id: string;
  patient_id: string;
  medication_id: string;
  medication_name: string;
  dosage: string;
  scheduled_time: string; // ISO string
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  taken_at?: string | null;
};
// --- (End Types) ---

export function PatientDashboard() {
  const { profile, signOut } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false); // NEW STATE for Edit Profile modal

  // NEW STATE for medication alerts
  const [shownAlerts, setShownAlerts] = useState<string[]>([]); // To avoid spamming alerts

  // NEW: Load all data from Supabase
  const loadDataFromSupabase = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Fetch prescriptions
      const { data: prescriptionsData, error: prescriptionsError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', profile.id)
        .order('created_at', { ascending: false });

      if (prescriptionsError) throw prescriptionsError;
      setPrescriptions(prescriptionsData as Prescription[] || []);

      // 2. Fetch all medication logs
      const { data: logsData, error: logsError } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('patient_id', profile.id)
        .order('scheduled_time', { ascending: true });

      if (logsError) throw logsError;
      setLogs(logsData as MedicationLog[] || []);

    } catch (error: any) {
      console.error("Error loading patient data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromSupabase();
  }, [profile?.id]);

  // --- NEW useEffect for Medication Alerts ---
  useEffect(() => {
    const checkMedications = () => {
      const now = new Date().getTime();
      
      // We only care about pending logs
      const pendingLogs = logs.filter(log => log.status === 'pending');
      
      for (const log of pendingLogs) {
        const scheduledTime = new Date(log.scheduled_time).getTime();
        
        // If the scheduled time is in the past AND we haven't alerted for it yet
        if (now > scheduledTime && !shownAlerts.includes(log.id)) {
          
          // Show the alert
          alert(
            `Medication Reminder:\n\nIt's time to take your ${log.medication_name} (${log.dosage}).`
          );
          
          // Add this log's ID to the list of shown alerts
          // This ensures the alert only fires once
          setShownAlerts(prev => [...prev, log.id]);
        }
      }
    };

    // Check every 30 seconds
    const intervalId = setInterval(checkMedications, 30000);

    // Run once on load just in case
    if (logs.length > 0 && !loading) { // Check only after initial load
      checkMedications();
    }

    // Cleanup the interval when the component unmounts
    return () => clearInterval(intervalId);
    
  }, [logs, shownAlerts, loading]); // Added loading dependency

  const activePrescriptions = prescriptions.filter(p => p.status === 'active');

  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.scheduled_time).toDateString();
    return logDate === new Date().toDateString();
  });

  const takenToday = todayLogs.filter(log => log.status === 'taken').length;
  const pendingToday = todayLogs.filter(log => log.status === 'pending').length;

  const adherenceRate =
    logs.length > 0
      ? Math.round((logs.filter(log => log.status === 'taken').length / logs.filter(log => log.status !== 'skipped').length) * 100)
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar - MODIFIED */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center">
            <Pill className="w-8 h-8 text-teal-600 mr-3" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{profile?.full_name}</h1>
              <p className="text-sm text-gray-500">Patient Portal</p>
            </div>
          </div>
          {/* MODIFIED: Added Edit Profile button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditProfile(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition"
            >
              <User className="w-5 h-5" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Active Prescriptions</p>
            <p className="text-3xl font-bold">{activePrescriptions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Taken Today</p>
            <p className="text-3xl font-bold">{takenToday}</p>
            <CheckCircle className="w-6 h-6 text-green-600 mt-2" />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Pending Today</p>
            <p className="text-3xl font-bold">{pendingToday}</p>
            <AlertCircle className="w-6 h-6 text-blue-600 mt-2" />
          </div>
        </div>

        {/* Lower Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Medication Tracker */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">Medication Tracker</h2>
            </div>
            <div className="p-6">
              <MedicationTracker
                logs={logs} // Pass the logs from DB
                onRefresh={loadDataFromSupabase} // Pass the DB refresh function
              />
            </div>
          </div>

          {/* Prescriptions List - MODIFIED to show new structure */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">Your Prescriptions</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
              {prescriptions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No prescriptions yet.
                </div>
              )}

              {prescriptions.map(p => (
                <div
                  key={p.id}
                  className={`border rounded-lg p-4 ${
                    p.status === 'active' ? 'bg-teal-50 border-teal-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between mb-3">
                    <h3 className="font-semibold">{p.diagnosis || 'Prescription Set'}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100">
                      {p.status}
                    </span>
                  </div>

                  <p className="text-sm">
                    <strong>Start:</strong> {new Date(p.start_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm">
                    <strong>End:</strong> {new Date(p.end_date).toLocaleDateString()}
                  </p>

                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-gray-600">Medications:</p>
                    {p.medications.map(med => (
                      <div key={med.id} className="p-2 bg-white rounded border">
                        <p className="font-semibold text-sm">{med.name} - {med.dosage}</p>
                        <p className="text-xs text-gray-600">{med.instructions}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          {med.timing.morning && <div className="flex items-center gap-1 text-xs text-yellow-700"><Sunrise className="w-3 h-3" /> Morning</div>}
                          {med.timing.afternoon && <div className="flex items-center gap-1 text-xs text-blue-700"><Sun className="w-3 h-3" /> Afternoon</div>}
                          {med.timing.night && <div className="flex items-center gap-1 text-xs text-indigo-700"><Sunset className="w-3 h-3" /> Night</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Render the Edit Profile modal */}
      {showEditProfile && (
        <EditProfileModal onClose={() => setShowEditProfile(false)} />
      )}
    </div>
  );
}