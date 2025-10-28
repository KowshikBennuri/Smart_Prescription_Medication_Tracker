import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, FileText, LogOut, Plus, Calendar, Clock, Activity } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { PrescriptionForm } from './PrescriptionForm';
import { PrescriptionList } from './PrescriptionList';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Prescription = Database['public']['Tables']['prescriptions']['Row'];
type Relationship = Database['public']['Tables']['doctor_patient_relationships']['Row'];

export function DoctorDashboard() {
  const { profile, signOut } = useAuth();
  const [patients, setPatients] = useState<Profile[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'patients' | 'prescriptions'>('prescriptions');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoctorData();
  }, []);

  const loadDoctorData = async () => {
    try {
      const { data: relationships } = await supabase
        .from('doctor_patient_relationships')
        .select('patient_id')
        .eq('doctor_id', profile?.id)
        .eq('status', 'active');

      if (relationships && relationships.length > 0) {
        const patientIds = relationships.map(r => r.patient_id);
        const { data: patientsData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', patientIds);

        setPatients(patientsData || []);
      }

      const { data: prescriptionsData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('doctor_id', profile?.id)
        .order('created_at', { ascending: false });

      setPrescriptions(prescriptionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: patientData } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', newPatientEmail)
        .eq('role', 'patient')
        .maybeSingle();

      if (!patientData) {
        alert('Patient not found. Please ensure the email is correct and the patient has registered.');
        return;
      }

      const { error } = await supabase
        .from('doctor_patient_relationships')
        .insert({
          doctor_id: profile?.id!,
          patient_id: patientData.id,
          status: 'active',
        });

      if (error) throw error;

      setNewPatientEmail('');
      loadDoctorData();
    } catch (error: any) {
      if (error.code === '23505') {
        alert('This patient is already in your list.');
      } else {
        alert('Error adding patient: ' + error.message);
      }
    }
  };

  const stats = {
    totalPatients: patients.length,
    activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
    totalPrescriptions: prescriptions.length,
  };

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Patients</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPatients}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Prescriptions</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activePrescriptions}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Prescriptions</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPrescriptions}</p>
              </div>
              <div className="bg-teal-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('prescriptions')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'prescriptions'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Prescriptions
              </button>
              <button
                onClick={() => setActiveTab('patients')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'patients'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Patients
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'prescriptions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Prescriptions</h2>
                  <button
                    onClick={() => setShowPrescriptionForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    New Prescription
                  </button>
                </div>

                <PrescriptionList
                  prescriptions={prescriptions}
                  patients={patients}
                  onRefresh={loadDoctorData}
                />
              </div>
            )}

            {activeTab === 'patients' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Patient</h2>
                  <form onSubmit={addPatient} className="flex gap-3">
                    <input
                      type="email"
                      value={newPatientEmail}
                      onChange={(e) => setNewPatientEmail(e.target.value)}
                      placeholder="Enter patient's email"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Patient
                    </button>
                  </form>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-gray-900">Your Patients</h2>
                  {patients.length === 0 ? (
                    <p className="text-gray-500 py-8 text-center">No patients yet. Add your first patient using their email address.</p>
                  ) : (
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
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Create Prescription
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
            loadDoctorData();
            setShowPrescriptionForm(false);
            setSelectedPatient(null);
          }}
        />
      )}
    </div>
  );
}
