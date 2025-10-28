import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Pill, LogOut, CheckCircle, AlertTriangle, Calendar, User, ChevronDown, ChevronUp, XCircle, Sunrise, Sun, Sunset } from 'lucide-react'; // Added icons
import { MedicationTracker } from './MedicationTracker';
import { supabase } from '../lib/supabaseClient';
import { EditProfileModal } from './EditProfileModal'; // NEW IMPORT

// --- (Types remain the same) ---
type MedicationItem = {
  id: string;
  name: string;
  dosage: string;
  timing: { morning: boolean; afternoon: boolean; night: boolean };
  instructions: string;
};
type Prescription = {
  id: string; patient_id: string; doctor_id: string; start_date: string; end_date: string;
  status: 'active' | 'completed' | 'cancelled' | 'pending_ai_check';
  diagnosis?: string | null; medications: MedicationItem[]; created_at?: string;
};
type MedicationLog = {
  id: string; prescription_id: string; patient_id: string; medication_id: string;
  medication_name: string; dosage: string; scheduled_time: string;
  status: 'pending' | 'taken' | 'missed' | 'skipped'; taken_at?: string | null;
};
// --- (End Types) ---

export function PatientDashboard() {
  const { profile, signOut } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false); // State for Edit Profile modal
  const [shownAlerts, setShownAlerts] = useState<string[]>([]); // State for medication alerts

  // State for selected date & prescription list visibility
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAllPrescriptions, setShowAllPrescriptions] = useState(false);

  // Load data from Supabase
  const loadDataFromSupabase = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: prescriptionsData, error: prescriptionsError } = await supabase
        .from('prescriptions').select('*').eq('patient_id', profile.id)
        .order('created_at', { ascending: false });
      if (prescriptionsError) throw prescriptionsError;
      setPrescriptions(prescriptionsData as Prescription[] || []);

      const { data: logsData, error: logsError } = await supabase
        .from('medication_logs').select('*').eq('patient_id', profile.id)
        .order('scheduled_time', { ascending: true });
      if (logsError) throw logsError;
      setLogs(logsData as MedicationLog[] || []);
    } catch (error: any) { console.error("Error loading patient data:", error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadDataFromSupabase();
  }, [profile?.id]);

  // useEffect for Medication Alerts
  useEffect(() => {
    const checkMedications = () => {
      const now = new Date().getTime();
      const pendingLogs = logs.filter(log => log.status === 'pending');

      for (const log of pendingLogs) {
        const scheduledTime = new Date(log.scheduled_time).getTime();
        if (now > scheduledTime && !shownAlerts.includes(log.id)) {
          alert(
            `Medication Reminder:\n\nIt's time to take your ${log.medication_name} (${log.dosage}).`
          );
          setShownAlerts(prev => [...prev, log.id]);
        }
      }
    };

    const intervalId = setInterval(checkMedications, 30000); // Check every 30 seconds
    if (logs.length > 0 && !loading) { // Check only after initial load
      checkMedications();
    }
    return () => clearInterval(intervalId); // Cleanup interval
  }, [logs, shownAlerts, loading]); // Dependencies for the effect

  // Filter logs based on the selectedDate state
  const selectedDateLogs = logs.filter(log => {
    const logDate = new Date(log.scheduled_time);
    const selDate = new Date(selectedDate);
    // Compare year, month, and day, adjusting for potential timezone offset in Date object
    return logDate.getFullYear() === selDate.getFullYear() &&
           logDate.getMonth() === selDate.getMonth() &&
           logDate.getDate() === selDate.getDate(); // Compare dates directly
  });


  // Calculate stats based on selectedDateLogs
  const takenToday = selectedDateLogs.filter(log => log.status === 'taken').length;
  const pendingToday = selectedDateLogs.filter(log => log.status === 'pending').length;
  const missedToday = selectedDateLogs.filter(log => log.status === 'missed').length;
  const totalToday = selectedDateLogs.length;
  const adherenceToday = totalToday > 0
    ? Math.round((takenToday / (totalToday - selectedDateLogs.filter(l => l.status === 'skipped').length)) * 100)
    : 100; // 100% if no doses scheduled

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Top Nav Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
           {/* Name/Logo */}
            <div className="flex items-center">
             <Pill className="w-8 h-8 text-teal-600 mr-3" />
             <div>
               <h1 className="text-xl font-bold text-gray-900">{profile?.full_name}</h1>
               <p className="text-sm text-gray-500">Patient Portal</p>
             </div>
           </div>
           {/* Buttons */}
           <div className="flex items-center gap-2">
             <button onClick={() => setShowEditProfile(true)} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition">
               <User className="w-5 h-5" /> <span>Edit Profile</span>
             </button>
             <button onClick={() => signOut()} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition">
               <LogOut className="w-5 h-5" /> <span>Sign Out</span>
             </button>
           </div>
         </div>
       </nav>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Today's Overview */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Today's Schedule</h2>
              <p className="text-gray-500">Overview of your medication for the selected date.</p>
            </div>
             {/* Date Selector */}
            <div className="flex items-center gap-2 mt-3 sm:mt-0">
               <Calendar className="w-5 h-5 text-gray-400" />
               <input
                 type="date"
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
               />
             </div>
          </div>

          {/* Today's Stats & Progress */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
             {/* Progress Circle */}
             <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center">
               <div className="relative w-24 h-24">
                 <svg className="w-full h-full" viewBox="0 0 36 36">
                   <path
                     className="text-gray-200"
                     strokeWidth="3" fill="none"
                     d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                   />
                   <path
                     className="text-teal-500"
                     strokeWidth="3" fill="none"
                     strokeDasharray={`${adherenceToday}, 100`}
                     strokeLinecap="round" // Make the line end round
                     transform="rotate(-90 18 18)" // Start from the top
                     d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                   />
                 </svg>
                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                   <span className="text-2xl font-bold text-gray-700">{adherenceToday}%</span>
                   <p className="text-xs text-gray-500">Adherence</p>
                 </div>
               </div>
             </div>
             {/* Stat Cards */}
             <StatCard value={pendingToday} label="Pending Doses" icon={<AlertTriangle className="text-blue-500"/>} />
             <StatCard value={takenToday} label="Doses Taken" icon={<CheckCircle className="text-green-500"/>} />
             <StatCard value={missedToday} label="Doses Missed" icon={<XCircle className="text-red-500"/>} />
          </div>
        </div>


        {/* Medication Tracker (Focused on Selected Date) */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
           <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Medications for {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
            <MedicationTracker
              logs={selectedDateLogs} // Pass only the logs for the selected date
              onRefresh={loadDataFromSupabase}
            />
        </div>


        {/* All Prescriptions (Collapsible) */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowAllPrescriptions(!showAllPrescriptions)}
            className="w-full flex justify-between items-center px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none"
          >
            <h2 className="text-lg font-semibold text-gray-800">All Your Prescriptions ({prescriptions.length})</h2>
            {showAllPrescriptions ? <ChevronUp className="w-5 h-5 text-gray-500"/> : <ChevronDown className="w-5 h-5 text-gray-500"/>}
          </button>

          {showAllPrescriptions && (
             <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto border-t border-gray-200">
               {prescriptions.length === 0 ? (
                 <div className="text-center py-12 text-gray-500">No prescriptions found.</div>
               ) : (
                 prescriptions.map(p => (
                   <div key={p.id} className={`border rounded-lg p-4 shadow-sm ${
                       p.status === 'active' ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200'
                     }`}
                   >
                      <div className="flex justify-between mb-3">
                         <h3 className="font-semibold text-gray-800">{p.diagnosis || 'Prescription Set'}</h3>
                         <span className={`text-xs px-2 py-1 rounded font-medium ${
                             p.status === 'active' ? 'bg-green-100 text-green-700' :
                             p.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                             p.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                             'bg-yellow-100 text-yellow-700' // pending_ai_check
                           }`}
                         >
                           {p.status.replace('_', ' ')}
                         </span>
                       </div>
                       <p className="text-sm text-gray-600"><strong>Start:</strong> {new Date(p.start_date).toLocaleDateString()}</p>
                       <p className="text-sm text-gray-600"><strong>End:</strong> {new Date(p.end_date).toLocaleDateString()}</p>
                       <div className="mt-4 space-y-2">
                         <p className="text-xs font-medium text-gray-700">Medications:</p>
                         {p.medications.map(med => (
                           <div key={med.id} className="p-2 bg-white rounded border border-gray-200">
                              <p className="font-semibold text-sm text-gray-800">{med.name} - {med.dosage}</p>
                              <p className="text-xs text-gray-600 mt-0.5">{med.instructions}</p>
                              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
                               {med.timing.morning && <div className="flex items-center gap-1 text-xs text-yellow-700"><Sunrise className="w-3 h-3" /> Morning</div>}
                               {med.timing.afternoon && <div className="flex items-center gap-1 text-xs text-blue-700"><Sun className="w-3 h-3" /> Afternoon</div>}
                               {med.timing.night && <div className="flex items-center gap-1 text-xs text-indigo-700"><Sunset className="w-3 h-3" /> Night</div>}
                             </div>
                           </div>
                         ))}
                       </div>
                   </div>
                 ))
               )}
             </div>
           )}
        </div>
      </div>

      {/* Edit Profile Modal Rendering */}
       {showEditProfile && (
         <EditProfileModal onClose={() => setShowEditProfile(false)} />
       )}
    </div>
  );
}

// Helper Component for Stat Cards
function StatCard({ value, label, icon }: { value: number | string; label: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200 shadow-sm">
      <div className="mx-auto w-6 h-6 mb-1 text-gray-500">{icon}</div>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  );
}