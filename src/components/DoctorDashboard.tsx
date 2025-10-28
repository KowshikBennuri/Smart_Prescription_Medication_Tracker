import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, FileText, LogOut, Plus, Activity } from 'lucide-react';
import { PrescriptionForm } from './PrescriptionForm';
import { PrescriptionList } from './PrescriptionList';
import { supabase } from '../lib/supabaseClient'; // Make sure this is imported

// Key for storing prescription data in localStorage
const PRESCRIPTIONS_KEY = 'mock_prescriptions_v1';

// Temporary local mock types and sample data (replace later with backend API)
type Profile = {
  id: string;
  full_name: string;
  email: string;
  date_of_birth?: string;
  specialization?: string;
};

type Prescription = {
  id: string;
  doctor_id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string;
  instructions: string;
  diagnosis?: string;
  status: 'active' | 'completed' | 'cancelled';
};

// Initial sample patient list
const mockPatients: Profile[] = [
  {
    id: 'p1',
    full_name: 'John Doe',
    email: 'john@example.com',
    date_of_birth: '1990-01-01'
  },
  {
    id: 'p2',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    date_of_birth: '1988-05-09'
  }
];

export function DoctorDashboard() {
  const { profile, signOut } = useAuth();
  const [patients, setPatients] = useState<Profile[]>(mockPatients);
  
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'patients' | 'prescriptions'>('prescriptions');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [loading] = useState(false); 

  const loadPrescriptions = () => {
    try {
      const raw = localStorage.getItem(PRESCRIPTIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Prescription[];
        parsed.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
        setPrescriptions(parsed);
      } else {
        setPrescriptions([]);
      }
    } catch {
      console.error("Failed to load prescriptions from localStorage");
      setPrescriptions([]);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const addPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 1. Query Supabase for the patient by email
      const { data: foundPatient, error } = await supabase
        .from('profiles')
        .select('*')
        // MODIFICATION: Add .trim() to clean up email input
        .eq('email', newPatientEmail.trim()) 
        .eq('role', 'patient') // Make sure they are a patient
        .single(); // We only expect one

      if (error) {
        throw new Error("No patient found with that email or user is not a patient.");
      }

      if (foundPatient) {
        // 2. Check if patient is already in the list
        if (patients.find(p => p.id === foundPatient.id)) {
          alert('This patient is already in your list.');
        } else {
          // 3. Add the found patient to your state
          setPatients(prevPatients => [...prevPatients, foundPatient]);
          alert('Patient added successfully!');
        }
        setNewPatientEmail('');
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleNewPrescription = () => {
    setShowPrescriptionForm(true);
  };

  const stats = {
    totalPatients: patients.length,
    activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
    totalPrescriptions: prescriptions.length,
  };

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
                  onRefresh={loadPrescriptions}
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
          patients={patients}
          preselectedPatient={selectedPatient}
          onClose={() => {
            setShowPrescriptionForm(false);
            setSelectedPatient(null);
          }}
          onSuccess={() => {
            setShowPrescriptionForm(false);
            setSelectedPatient(null);
            loadPrescriptions(); 
          }}
        />
      )}
    </div>
  );
}

// (The DashboardStat and DashboardTab functions are unchanged)
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