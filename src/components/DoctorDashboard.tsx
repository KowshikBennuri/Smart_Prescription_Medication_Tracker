import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, FileText, LogOut, Plus, Activity } from 'lucide-react';
import { PrescriptionForm } from './PrescriptionForm';
import { PrescriptionList } from './PrescriptionList';
import { supabase } from '../lib/supabaseClient';
import { MedicalHistoryCheck } from './MedicalHistoryCheck';

// --- (Types: Profile, Prescription) ---
type Profile = {
  id: string;
  full_name: string;
  email: string;
  date_of_birth?: string;
  specialization?: string;
  // --- ADD THESE NEW FIELDS ---
  ongoing_medications?: string;
  medical_history?: { complication: string; description: string }[];
};

type Prescription = {
  id: string; // This will be handled by the database
  doctor_id: string;
  patient_id: string;
  start_date: string;
  end_date: string;
  diagnosis?: string;
  status: 'active' | 'completed' | 'cancelled' | 'pending_ai_check';
  medications: {
    id: string;
    name: string;
    dosage: string;
    timing: { morning: boolean; afternoon: boolean; night: boolean };
    instructions: string;
  }[];
  created_at?: string; // Will come from DB
};
// --- (End Types) ---

export function DoctorDashboard() {
  const { profile, signOut } = useAuth();
  
  // --- MODIFIED: Both states now start empty and load from DB ---
  const [patients, setPatients] = useState<Profile[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'ai_check'>('dashboard');
  const [draftPrescription, setDraftPrescription] = useState<Prescription | null>(null);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'patients' | 'prescriptions'>('prescriptions');
  const [newPatientEmail, setNewPatientEmail] = useState('');

  // --- NEW: Function to load the doctor's patient list from DB ---
  const loadPatients = async () => {
    if (!profile) return;
    try {
      // 1. Get the list of patient IDs from the join table
      const { data: patientLinks, error: linksError } = await supabase
        .from('doctor_patients')
        .select('patient_id')
        .eq('doctor_id', profile.id);

      if (linksError) throw linksError;
      if (!patientLinks || patientLinks.length === 0) {
        setPatients([]);
        return;
      }

      // 2. Fetch the profiles for those patient IDs
      const patientIds = patientLinks.map(link => link.patient_id);
      const { data: patientProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', patientIds);
      
      if (profilesError) throw profilesError;
      
      setPatients(patientProfiles as Profile[] || []);

    } catch (error: any) {
      console.error("Error loading patients:", error.message);
    }
  };

  // --- MODIFIED: Function to load prescriptions from DB ---
  const loadPrescriptions = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('doctor_id', profile.id)
        .order('created_at', { ascending: false }); // Show newest first

      if (error) throw error;
      setPrescriptions(data as Prescription[] || []);
    } catch (error: any) {
      console.error("Error loading prescriptions:", error.message);
    }
  };

  // --- MODIFIED: useEffect now loads from DB on mount ---
  useEffect(() => {
    if (profile) {
      loadPatients();
      loadPrescriptions();
    }
  }, [profile]); // Depends on profile to be loaded

  // --- MODIFIED: addPatient now saves to DB ---
  const addPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    try {
      // 1. Find the patient profile by email
      const { data: foundPatient, error: findError } = await supabase
        .from('profiles')
        .select('id, full_name') // Only select what we need
        .eq('email', newPatientEmail.trim())
        .eq('role', 'patient')
        .single();

      if (findError) throw new Error("No patient found with that email or user is not a patient.");

      // 2. Check if they are already in the *local* state (prevents double-click)
      if (patients.find(p => p.id === foundPatient.id)) {
        alert('This patient is already in your list.');
        setNewPatientEmail('');
        return;
      }

      // 3. Insert into the join table to link them
      const { error: insertError } = await supabase
        .from('doctor_patients')
        .insert({
          doctor_id: profile.id,
          patient_id: foundPatient.id
        });
      
      if (insertError) throw insertError;

      // 4. Refresh the patient list from the DB
      alert(`Patient ${foundPatient.full_name} added successfully!`);
      setNewPatientEmail('');
      await loadPatients(); // Refresh the list

    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleNewPrescription = () => {
    if (patients.length === 0) {
      alert("Please add a patient to your list before creating a prescription.");
      return;
    }
    setShowPrescriptionForm(true);
  };

  // --- MODIFIED: handleFinalSave now saves to DB ---
  // ... (inside DoctorDashboard component) ...

  // This function is passed to MedicalHistoryCheck
  const handleFinalSave = async (finalPrescription: Prescription) => {
    try {
      // 1. Save the main prescription
      const { id, ...prescriptionToInsert } = finalPrescription;
      
      const { data: newPrescription, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert(prescriptionToInsert)
        .select() // Get the newly created row
        .single(); // We know we only inserted one
      
      if (prescriptionError) throw prescriptionError;

      // --- 2. NEW: GENERATE MEDICATION LOGS ---
      const logsToInsert = [];
      const startDate = new Date(newPrescription.start_date);
      const endDate = new Date(newPrescription.end_date);
      
      // Loop from start date to end date
      for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
        
        for (const med of newPrescription.medications) {
          
          const createLogEntry = (time: 'morning' | 'afternoon' | 'night') => {
            const scheduled_time = new Date(day);
            if (time === 'morning') scheduled_time.setHours(8, 0, 0, 0); // 8:00 AM
            if (time === 'afternoon') scheduled_time.setHours(13, 0, 0, 0); // 1:00 PM
            if (time === 'night') scheduled_time.setHours(20, 0, 0, 0); // 8:00 PM

            return {
              patient_id: newPrescription.patient_id,
              prescription_id: newPrescription.id,
              medication_id: med.id,
              medication_name: med.name,
              dosage: med.dosage,
              scheduled_time: scheduled_time.toISOString(),
              status: 'pending',
            };
          };

          if (med.timing.morning) logsToInsert.push(createLogEntry('morning'));
          if (med.timing.afternoon) logsToInsert.push(createLogEntry('afternoon'));
          if (med.timing.night) logsToInsert.push(createLogEntry('night'));
        }
      }

      // 3. Bulk insert all generated logs
      if (logsToInsert.length > 0) {
        const { error: logsError } = await supabase
          .from('medication_logs')
          .insert(logsToInsert);
        
        if (logsError) throw logsError;
      }

      // 4. Reload the dashboard and switch view
      await loadPrescriptions(); // Refresh list from DB
      setCurrentView('dashboard');
      setDraftPrescription(null);
      alert("Prescription saved and schedule generated!");

    } catch (error: any) {
      console.error("Error saving prescription:", error.message);
      alert("Error: " + error.message);
    }
  };

  const stats = {
    totalPatients: patients.length,
    activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
    totalPrescriptions: prescriptions.length,
  };

  // --- (Conditional Rendering for AI check is unchanged) ---
  if (currentView === 'ai_check' && draftPrescription) {
    return (
      <MedicalHistoryCheck
        patient={patients.find(p => p.id === draftPrescription.patient_id)!}
        prescription={draftPrescription}
        onFinalSave={handleFinalSave}
        onCancel={() => {
          setCurrentView('dashboard');
          setDraftPrescription(null);
        }}
      />
    );
  }

  // --- (Rest of the JSX is unchanged) ---
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dr. {profile?.full_name}</h1>
                <p className="text-sm text-gray-500">{profile?.specialization || 'Medical Professional'}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DashboardStat title="Total Patients" value={stats.totalPatients} icon={<Users className="w-6 h-6 text-blue-600" />} />
          <DashboardStat title="Active Prescriptions" value={stats.activePrescriptions} icon={<Activity className="w-6 h-6 text-green-600" />} />
          <DashboardStat title="Total Prescriptions" value={stats.totalPrescriptions} icon={<FileText className="w-6 h-6 text-teal-600" />} />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-200">
            <div className="flex">
              <DashboardTab label="Prescriptions" active={activeTab === 'prescriptions'} onClick={() => setActiveTab('prescriptions')} />
              <DashboardTab label="Patients" active={activeTab === 'patients'} onClick={() => setActiveTab('patients')} />
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'prescriptions' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Prescriptions</h2>
                  <button
                    onClick={handleNewPrescription}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    New Prescription
                  </button>
                </div>

                <PrescriptionList
                  prescriptions={prescriptions}
                  patients={patients}
                  onRefresh={loadPrescriptions} // Pass the DB refresh function
                />
              </>
            )}

            {activeTab === 'patients' && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Patient</h2>
                <form onSubmit={addPatient} className="flex gap-3 mb-6">
                  <input
                    type="email"
                    value={newPatientEmail}
                    onChange={(e) => setNewPatientEmail(e.target.value)}
                    placeholder="Enter patient's email"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Add Patient
                  </button>
                </form>

                <div className="grid gap-4">
                  {patients.length === 0 && (
                    <p className="text-gray-500">No patients added yet.</p>
                  )}
                  {patients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">{patient.full_name}</p>
                        <p className="text-sm text-gray-600">{patient.email}</p>
                        {patient.date_of_birth && (
                          <p className="text-sm text-gray-500">DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowPrescriptionForm(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Create Prescription
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showPrescriptionForm && (
        <PrescriptionForm
          patients={patients} // Pass the DB-loaded patient list
          preselectedPatient={selectedPatient}
          onClose={() => {
            setShowPrescriptionForm(false);
            setSelectedPatient(null);
          }}
          onSuccess={(newPrescription) => {
            setShowPrescriptionForm(false);
            setSelectedPatient(null);
            setDraftPrescription(newPrescription);
            setCurrentView('ai_check');
          }}
        />
      )}
    </div>
  );
}

// (DashboardStat and DashboardTab components are unchanged)
function DashboardStat({ title, value, icon }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 font-medium transition-colors ${
        active ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );
}