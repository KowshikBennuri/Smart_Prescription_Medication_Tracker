import { Calendar, FileText, Trash2, Sunrise, Sun, Sunset } from 'lucide-react';
import { supabase } from '../lib/supabaseClient'; // <-- NEW IMPORT

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
  doctor_id: string;
  patient_id: string;
  start_date: string;
  end_date: string;
  diagnosis?: string;
  status: 'active' | 'completed' | 'cancelled' | 'pending_ai_check';
  medications: MedicationItem[];
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
};

interface PrescriptionListProps {
  prescriptions: Prescription[];
  patients: Profile[];
  onRefresh: () => void; // This is now the loadPrescriptions() function from Dashboard
}
// --- (End Types) ---

export function PrescriptionList({ prescriptions, patients, onRefresh }: PrescriptionListProps) {
  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.full_name || 'Unknown Patient';
  };

  const getStatusColor = (status: Prescription['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending_ai_check':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // --- MODIFIED: No longer writes to localStorage ---
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entire prescription set?')) return;
    try {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      onRefresh(); // Refresh the list from the DB
    } catch (error: any) {
      alert("Error deleting prescription: " + error.message);
    }
  };

  // --- MODIFIED: No longer writes to localStorage ---
  const handleStatusChange = async (id: string, newStatus: 'active' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      onRefresh(); // Refresh the list from the DB
    } catch (error: any) {
      alert("Error updating status: " + error.message);
    }
  };

  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">
          No prescriptions yet. Create your first prescription to get started.
        </p>
      </div>
    );
  }

  // --- (The JSX is unchanged from the previous version) ---
  return (
    <div className="space-y-4">
      {prescriptions.map((prescription) => (
        <div
          key={prescription.id}
          className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {prescription.diagnosis || 'Prescription Set'}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.status)}`}>
                  {prescription.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                Patient: {getPatientName(prescription.patient_id)}
              </p>
            </div>

            <button
              onClick={() => handleDelete(prescription.id)}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(prescription.start_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">End Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(prescription.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">
              Medications ({prescription.medications.length})
            </p>
            <div className="space-y-3">
              {prescription.medications.map((med) => (
                <div key={med.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="font-semibold text-sm text-gray-900">{med.name} - {med.dosage}</p>
                  <p className="text-sm text-gray-600 mt-1">{med.instructions}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {med.timing.morning && (
                      <div className="flex items-center gap-1 text-xs text-yellow-700">
                        <Sunrise className="w-3 h-3" /> Morning
                      </div>
                    )}
                    {med.timing.afternoon && (
                       <div className="flex items-center gap-1 text-xs text-blue-700">
                        <Sun className="w-3 h-3" /> Afternoon
                      </div>
                    )}
                    {med.timing.night && (
                      <div className="flex items-center gap-1 text-xs text-indigo-700">
                        <Sunset className="w-3 h-3" /> Night
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {prescription.status !== 'active' && (
              <button
                onClick={() => handleStatusChange(prescription.id, 'active')}
                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
              >
                Mark Active
              </button>
            )}
            {prescription.status !== 'completed' && (
              <button
                onClick={() => handleStatusChange(prescription.id, 'completed')}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                Mark Completed
              </button>
            )}
            {prescription.status !== 'cancelled' && (
              <button
                onClick={() => handleStatusChange(prescription.id, 'cancelled')}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}