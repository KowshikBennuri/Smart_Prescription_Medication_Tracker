import { Pill, Calendar, Clock, FileText, Trash2 } from 'lucide-react';

type Prescription = {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  diagnosis?: string | null;
  instructions?: string | null;
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
};

interface PrescriptionListProps {
  prescriptions: Prescription[];
  patients: Profile[];
  onRefresh: () => void;
}

const PRESCRIPTIONS_KEY = 'mock_prescriptions_v1';

export function PrescriptionList({ prescriptions, patients, onRefresh }: PrescriptionListProps) {
  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.full_name || 'Unknown Patient';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const updateStorage = (updatedList: Prescription[]) => {
    localStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(updatedList));
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this prescription?')) return;
    const updated = prescriptions.filter(p => p.id !== id);
    updateStorage(updated);
  };

  const handleStatusChange = (id: string, newStatus: 'active' | 'completed' | 'cancelled') => {
    const updated = prescriptions.map(p =>
      p.id === id ? { ...p, status: newStatus } : p
    );
    updateStorage(updated);
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
                <h3 className="text-lg font-semibold text-gray-900">{prescription.medication_name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.status)}`}>
                  {prescription.status}
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Dosage</p>
                <p className="text-sm font-medium text-gray-900">{prescription.dosage}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Frequency</p>
                <p className="text-sm font-medium text-gray-900">{prescription.frequency}</p>
              </div>
            </div>

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

          {prescription.diagnosis && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Diagnosis</p>
              <p className="text-sm text-gray-900">{prescription.diagnosis}</p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Instructions</p>
            <p className="text-sm text-gray-700">{prescription.instructions}</p>
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