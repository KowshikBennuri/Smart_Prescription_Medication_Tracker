import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Pill, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { MedicationTracker } from './MedicationTracker';

type Prescription = {
  id: string;
  patient_id: string;
  doctor_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  diagnosis?: string | null;
  instructions?: string | null;
  doctor_name?: string;
};

type MedicationLog = {
  id: string;
  prescription_id: string;
  patient_id: string;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  taken_at?: string | null;
};

const PRESCRIPTIONS_KEY = 'mock_prescriptions_v1';
const MED_LOGS_KEY = 'mock_medication_logs_v1';

export function PatientDashboard() {
  const { profile, signOut } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocalData();
  }, [profile?.id]);

  const loadLocalData = () => {
    setLoading(true);
    try {
      const rawPrescriptions = localStorage.getItem(PRESCRIPTIONS_KEY);
      const rawLogs = localStorage.getItem(MED_LOGS_KEY);

      const allPrescriptions = rawPrescriptions ? JSON.parse(rawPrescriptions) : [];
      const allLogs = rawLogs ? JSON.parse(rawLogs) : [];

      const filteredPres = allPrescriptions.filter(
        (p: Prescription) => p.patient_id === profile?.id
      );
      const filteredLogs = allLogs.filter(
        (l: MedicationLog) => l.patient_id === profile?.id
      );

      setPrescriptions(filteredPres);
      setLogs(filteredLogs);
    } finally {
      setLoading(false);
    }
  };

  const activePrescriptions = prescriptions.filter(p => p.status === 'active');

  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.scheduled_time).toDateString();
    return logDate === new Date().toDateString();
  });

  const takenToday = todayLogs.filter(log => log.status === 'taken').length;

  const adherenceRate =
    logs.length > 0
      ? Math.round((logs.filter(log => log.status === 'taken').length / logs.length) * 100)
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
      {/* Top bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center">
            <Pill className="w-8 h-8 text-teal-600 mr-3" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{profile?.full_name}</h1>
              <p className="text-sm text-gray-500">Patient Portal</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
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
            <p className="text-sm text-gray-600 mb-1">Adherence Rate</p>
            <p className="text-3xl font-bold">{adherenceRate}%</p>
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
                prescriptions={activePrescriptions}
                onRefresh={loadLocalData}
              />
            </div>
          </div>

          {/* Prescriptions List */}
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
                    <h3 className="font-semibold">{p.medication_name}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100">
                      {p.status}
                    </span>
                  </div>

                  <p className="text-sm"><strong>Dosage:</strong> {p.dosage}</p>
                  <p className="text-sm"><strong>Frequency:</strong> {p.frequency}</p>
                  <p className="text-sm">
                    <strong>Start:</strong> {new Date(p.start_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm">
                    <strong>End:</strong> {new Date(p.end_date).toLocaleDateString()}
                  </p>

                  {p.instructions && (
                    <p className="text-sm mt-2"><strong>Instructions:</strong> {p.instructions}</p>
                  )}

                  {p.diagnosis && (
                    <p className="text-sm mt-2"><strong>Diagnosis:</strong> {p.diagnosis}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}