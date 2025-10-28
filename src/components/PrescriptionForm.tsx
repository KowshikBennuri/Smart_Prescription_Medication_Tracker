import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { X } from "lucide-react";

type Profile = {
  id: string;
  full_name?: string;
  email?: string;
};

interface PrescriptionFormProps {
  patients: Profile[];
  preselectedPatient?: Profile | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PrescriptionForm({
  patients,
  preselectedPatient,
  onClose,
  onSuccess,
}: PrescriptionFormProps) {
  const { profile } = useAuth();
  const [patientId, setPatientId] = useState(preselectedPatient?.id || "");
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [instructions, setInstructions] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        doctor_id: profile?.id || "temp-doctor-id",
        patient_id: patientId,
        medication_name: medicationName,
        dosage,
        frequency,
        duration_days: parseInt(durationDays),
        instructions,
        diagnosis: diagnosis || null,
        start_date: startDate,
      };

      console.log("Prescription form submitted:", dataToSend);

      // Here we will later call API → Gemini safety check → Firebase save

      onSuccess();
    } catch (error: any) {
      alert("Something went wrong: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">New Prescription</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient *
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medication Name *
            </label>
            <input
              type="text"
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="e.g., Amoxicillin"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Dosage *</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., 500mg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Frequency *
              </label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., Twice daily"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Duration (days) *
              </label>
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

            <div>
              <label className="block text-sm font-medium mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Diagnosis</label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="e.g., Bacterial infection"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Instructions *
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
              placeholder="e.g., Take with food, avoid alcohol"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              {loading ? "Saving..." : "Save Prescription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
