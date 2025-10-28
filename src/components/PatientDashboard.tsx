import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Pill, LogOut, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { MedicationTracker } from './MedicationTracker';

type Prescription = Database['public']['Tables']['prescriptions']['Row'];
type MedicationLog = Database['public']['Tables']['medication_logs']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface PrescriptionWithDoctor extends Prescription {
  doctor?: Profile;
}

export function PatientDashboard() {
  const { profile, signOut } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionWithDoctor[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    try {
      const { data: prescriptionsData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', profile?.id)
        .order('created_at', { ascending: false });

      if (prescriptionsData) {
        const prescriptionsWithDoctors = await Promise.all(
          prescriptionsData.map(async (prescription) => {
            const { data: doctor } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', prescription.doctor_id)
              .maybeSingle();
            return { ...prescription, doctor: doctor || undefined };
          })
        );
        setPrescriptions(prescriptionsWithDoctors);
      }

      const { data: logsData } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('patient_id', profile?.id)
        .order('scheduled_time', { ascending: false })
        .limit(50);

      setLogs(logsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
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
  const adherenceRate = logs.length > 0
    ? Math.round((logs.filter(log => log.status === 'taken').length / logs.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Pill className="w-8 h-8 text-teal-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{profile?.full_name}</h1>
                <p className="text-sm text-gray-500">Patient Portal</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Prescriptions</p>
                <p className="text-3xl font-bold text-gray-900">{activePrescriptions.length}</p>
              </div>
              <div className="bg-teal-100 p-3 rounded-lg">
                <Pill className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Taken Today</p>
                <p className="text-3xl font-bold text-gray-900">{takenToday}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Adherence Rate</p>
                <p className="text-3xl font-bold text-gray-900">{adherenceRate}%</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Medication Tracker</h2>
            </div>
            <div className="p-6">
              <MedicationTracker
                prescriptions={activePrescriptions}
                onRefresh={loadPatientData}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Prescriptions</h2>
            </div>
            <div className="p-6">
              {prescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No prescriptions yet. Your doctor will prescribe medications when needed.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {prescriptions.map((prescription) => (
                    <div
                      key={prescription.id}
                      className={`border rounded-lg p-4 ${
                        prescription.status === 'active' ? 'border-teal-200 bg-teal-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{prescription.medication_name}</h3>
                          <p className="text-sm text-gray-600">
                            Prescribed by Dr. {prescription.doctor?.full_name || 'Unknown'}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            prescription.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : prescription.status === 'completed'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {prescription.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div>
                          <span className="text-gray-500">Dosage:</span>
                          <span className="ml-2 font-medium text-gray-900">{prescription.dosage}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Frequency:</span>
                          <span className="ml-2 font-medium text-gray-900">{prescription.frequency}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Start:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {new Date(prescription.start_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">End:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {new Date(prescription.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {prescription.diagnosis && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-500">Diagnosis</p>
                          <p className="text-sm text-gray-900">{prescription.diagnosis}</p>
                        </div>
                      )}

                      <div className="bg-white rounded p-3 border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Instructions</p>
                        <p className="text-sm text-gray-700">{prescription.instructions}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
