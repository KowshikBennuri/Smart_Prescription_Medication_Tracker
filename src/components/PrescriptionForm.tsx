import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { X, Plus, Trash2, Sunrise, Sun, Sunset } from "lucide-react";

// --- (Types) ---
type Profile = {
  id: string;
  full_name?: string;
  email?: string;
};

// New types for the form
type MedicationItem = {
  id: string;
  name: string;
  dosage: string;
  timing: { morning: boolean; afternoon: boolean; night: boolean };
  instructions: string;
};

// This is the "Prescription Set"
type Prescription = {
  id: string;
  doctor_id: string;
  patient_id: string;
  start_date: string;
  end_date: string;
  diagnosis?: string;
  status: 'active' | 'pending_ai_check';
  medications: MedicationItem[];
};

interface PrescriptionFormProps {
  patients: Profile[];
  preselectedPatient?: Profile | null;
  onClose: () => void;
  onSuccess: (prescription: Prescription) => void; // Will pass the new prescription
}

// Default state for a new medication
const defaultMedState = {
  id: "",
  name: "",
  dosage: "",
  timing: { morning: false, afternoon: false, night: false },
  instructions: "",
};
// --- (End Types) ---

export function PrescriptionForm({
  patients,
  preselectedPatient,
  onClose,
  onSuccess,
}: PrescriptionFormProps) {
  const { profile } = useAuth();
  
  // --- STATE FOR THE "PRESCRIPTION SET" ---
  const [patientId, setPatientId] = useState(preselectedPatient?.id || "");
  const [diagnosis, setDiagnosis] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [durationDays, setDurationDays] = useState("7"); // Default to 7 days
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // --- STATE FOR THE *INDIVIDUAL* MEDICATION BEING ADDED ---
  const [currentMed, setCurrentMed] = useState<Omit<MedicationItem, 'id'>>(defaultMedState);

  // --- FUNCTION TO ADD A MEDICATION TO THE LIST ---
  const handleAddMedication = () => {
    if (!currentMed.name || !currentMed.dosage || !currentMed.instructions) {
      alert("Please fill in all medication details.");
      return;
    }
    if (!currentMed.timing.morning && !currentMed.timing.afternoon && !currentMed.timing.night) {
      alert("Please select at least one time of day (e.g., Morning).");
      return;
    }
    
    setMedications([
      ...medications,
      { ...currentMed, id: 'med_' + Math.random().toString(36).slice(2, 9) }
    ]);
    setCurrentMed(defaultMedState); // Reset the form
  };

  // --- FUNCTION TO REMOVE A MEDICATION ---
  const handleRemoveMedication = (id: string) => {
    setMedications(medications.filter(med => med.id !== id));
  };
  
  // --- FUNCTION TO HANDLE THE FINAL SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      alert("Please select a patient.");
      return;
    }
    if (medications.length === 0) {
      alert("Please add at least one medication to the prescription.");
      return;
    }
    setLoading(true);

    try {
      // Calculate end date
      const startDateObj = new Date(startDate);
      const duration = parseInt(durationDays) || 0;
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + duration);

      // This is the new "Prescription Set" object
      const newPrescription: Prescription = {
        id: 'presc_' + Math.random().toString(36).slice(2, 9),
        doctor_id: profile?.id || "temp-doctor-id",
        patient_id: patientId,
        start_date: startDate,
        end_date: endDateObj.toISOString().split('T')[0],
        diagnosis: diagnosis || undefined,
        status: 'pending_ai_check', // New status
        medications: medications,
      };

      // This doesn't save to localStorage here.
      // It passes the object to the Dashboard, which will send it to the AI check page.
      console.log("Draft Prescription created:", newPrescription);
      onSuccess(newPrescription);

    } catch (error: any) {
      alert("Something went wrong: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">New Prescription</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* --- Main Prescription Details --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
                disabled={!!preselectedPatient}
              >
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name} ({patient.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., Bacterial infection"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (days) *</label>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., 7"
                min="1"
                required
              />
            </div>
          </div>

          <hr className="my-6" />

          {/* --- List of Added Medications --- */}
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Medications ({medications.length})</h3>
          <div className="space-y-3 mb-6">
            {medications.length === 0 && (
              <p className="text-gray-500 text-sm">No medications added yet. Use the form below to add one.</p>
            )}
            {medications.map(med => (
              <div key={med.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border">
                <div>
                  <p className="font-semibold">{med.name} - {med.dosage}</p>
                  <p className="text-sm text-gray-600">{med.instructions}</p>
                  <div className="flex gap-2 mt-2">
                    {med.timing.morning && <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">Morning</span>}
                    {med.timing.afternoon && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">Afternoon</span>}
                    {med.timing.night && <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">Night</span>}
                  </div>
                </div>
                <button type="button" onClick={() => handleRemoveMedication(med.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* --- Form to Add a New Medication --- */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-3">Add a Medication</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={currentMed.name}
                onChange={(e) => setCurrentMed({ ...currentMed, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Medication Name *"
              />
              <input
                type="text"
                value={currentMed.dosage}
                onChange={(e) => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Dosage (e.g., 500mg) *"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Time of Day *</label>
              <div className="flex gap-2">
                <TimeOfDayButton
                  icon={<Sunrise className="w-4 h-4" />}
                  label="Morning"
                  active={currentMed.timing.morning}
                  onClick={() => setCurrentMed({ ...currentMed, timing: { ...currentMed.timing, morning: !currentMed.timing.morning }})}
                />
                <TimeOfDayButton
                  icon={<Sun className="w-4 h-4" />}
                  label="Afternoon"
                  active={currentMed.timing.afternoon}
                  onClick={() => setCurrentMed({ ...currentMed, timing: { ...currentMed.timing, afternoon: !currentMed.timing.afternoon }})}
                />
                <TimeOfDayButton
                  icon={<Sunset className="w-4 h-4" />}
                  label="Night"
                  active={currentMed.timing.night}
                  onClick={() => setCurrentMed({ ...currentMed, timing: { ...currentMed.timing, night: !currentMed.timing.night }})}
                />
              </div>
            </div>
            <textarea
              value={currentMed.instructions}
              onChange={(e) => setCurrentMed({ ...currentMed, instructions: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg mt-4"
              rows={2}
              placeholder="Instructions (e.g., Take with food) *"
            />
            <button
              type="button"
              onClick={handleAddMedication}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add This Medication to Prescription
            </button>
          </div>
          
          {/* --- Final Submit Actions --- */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || medications.length === 0}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {/* --- THIS IS THE CHANGE --- */}
              {loading ? "Saving..." : "Analyze"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper component for the time of day buttons
function TimeOfDayButton({ icon, label, active, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition-colors
        ${active
          ? 'bg-blue-50 border-blue-500 text-blue-700'
          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}