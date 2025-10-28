// src/components/MedicalHistoryCheck.tsx

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, CheckCircle, Shield, ArrowLeft } from 'lucide-react';

// --- (Types) ---
type Profile = {
  id: string;
  full_name?: string;
  email?: string;
  date_of_birth?: string; // For calculating age
  gender?: string; // Needed for backend model
  ongoing_medications?: string;
  medical_history?: { complication: string; description: string }[];
};

type Prescription = {
  id: string;
  doctor_id: string;
  patient_id: string;
  start_date: string;
  end_date: string;
  diagnosis?: string;
  status: 'active' | 'pending_ai_check';
  medications: {
    id: string;
    name: string;
    dosage: string;
    timing: { morning: boolean; afternoon: boolean; night: boolean };
    instructions: string;
  }[];
};

interface MedicalHistoryCheckProps {
  patient: Profile; // This object will now contain the history
  prescription: Prescription;
  onFinalSave: (prescription: Prescription) => void;
  onCancel: () => void;
}

// Type for the backend's expected response structure
type SafetyCheckOutput = {
  overall_assessment: string;
  flags: {
    problematic_drug: string;
    issue: string;
    explanation: string;
    suggested_alternative: string;
  }[];
};


// Type for displaying results in UI (includes error state)
type AIResult = {
  status: 'safe' | 'warning' | 'error' | 'high-risk'; // Match backend assessment + error
  message: string;
  suggestions: string[];
};

// --- Function to calculate age ---
function calculateAge(dateOfBirth?: string): number {
  if (!dateOfBirth) return 0; // Or handle as unknown
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? age : 0; // Ensure age is not negative
}
// ---

export function MedicalHistoryCheck({ patient, prescription, onFinalSave, onCancel }: MedicalHistoryCheckProps) {
  const { profile: doctor } = useAuth();
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAiCheck = async () => {
    setLoading(true);
    setAiResult(null);

    // --- 1. GATHER AND TRANSFORM DATA ---
    const patientAge = calculateAge(patient.date_of_birth);
    const knownComplicationsText = patient.medical_history?.map(h => `${h.complication}${h.description ? `: ${h.description}` : ''}`).join('; ') || "None provided"; // Use semicolon for clarity
    const pastMedicationsText = patient.ongoing_medications || "None provided";

    const newPrescriptionsFormatted = prescription.medications.map(med => {
      // Convert timing object to a frequency string
      const times = [];
      if (med.timing.morning) times.push("Morning");
      if (med.timing.afternoon) times.push("Afternoon");
      if (med.timing.night) times.push("Night");
      const frequency = times.join(', ') || "As directed";

      return {
        drug_name: med.name,
        dosage: med.dosage,
        frequency: frequency,
      };
    });

    // --- 2. CONSTRUCT THE PAYLOAD FOR THE BACKEND ---
    const payload = {
      patient: {
        age: patientAge,
        gender: patient.gender || "Not specified",
        consultation_reason: prescription.diagnosis || "Not specified",
      },
      history: {
        known_complications: knownComplicationsText,
        past_medications: pastMedicationsText,
      },
      new_prescriptions: newPrescriptionsFormatted,
    };

    console.log("Sending to AI backend:", JSON.stringify(payload, null, 2));

    try {
      // --- 3. MAKE THE ACTUAL FETCH CALL ---
      // Replace with your actual backend URL if different
      const response = await fetch('http://127.0.0.1:8000/run-safety-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown API error" }));
        throw new Error(`API Error ${response.status}: ${errorData.detail || response.statusText}`);
      }

      const backendResult: SafetyCheckOutput = await response.json();

      // --- 4. MAP BACKEND RESULT TO UI STATE ---
      let uiStatus: AIResult['status'] = 'safe';
      if (backendResult.overall_assessment?.toLowerCase() === 'caution') uiStatus = 'warning';
      if (backendResult.overall_assessment?.toLowerCase() === 'high-risk') uiStatus = 'high-risk'; // Or map to 'error' if preferred

      // Combine explanations and suggestions into UI fields
      const message = backendResult.flags.length > 0
        ? backendResult.flags.map(f => `${f.issue} with ${f.problematic_drug}: ${f.explanation}`).join('\n')
        : "AI analysis found no major issues.";
      const suggestions = backendResult.flags.map(f => f.suggested_alternative).filter(Boolean); // Filter out empty suggestions

      setAiResult({
         status: uiStatus,
         message: message,
         suggestions: suggestions
      });

    } catch (error: any) {
      console.error("Error calling AI Safety Check:", error);
      setAiResult({
         status: 'error', // Use 'error' status for fetch/network issues
         message: `Failed to get AI analysis: ${error.message}`,
         suggestions: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    // Save prescription with 'active' status
    const finalPrescription = {
      ...prescription,
      status: 'active' as const,
    };
    onFinalSave(finalPrescription);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button onClick={onCancel} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow-xl p-8">
          {/* Header */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Safety Check</h1>
          <p className="text-gray-600 mb-6">
            Analyzing prescription for <span className="font-semibold">{patient.full_name}</span>
            {" "}by <span className="font-semibold">Dr. {doctor?.full_name}</span>.
          </p>

          {/* Display Patient History (Read-Only) */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Patient's Medical Profile</h3>
            <div className="space-y-4">
              {/* Basic Info */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   Basic Info
                 </label>
                 <div className="w-full px-4 py-3 bg-gray-50 text-gray-700 text-sm rounded-lg border min-h-[40px]">
                   Age: {calculateAge(patient.date_of_birth) || 'N/A'}, Gender: {patient.gender || 'N/A'}
                 </div>
               </div>
              {/* Ongoing Meds */}
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ongoing Medications
                  </label>
                 <div className="w-full px-4 py-3 bg-gray-50 text-gray-700 text-sm rounded-lg border min-h-[40px]">
                    {patient.ongoing_medications || <span className="text-gray-400">None listed.</span>}
                  </div>
                </div>
              {/* Medical History */}
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical History
                  </label>
                  <div className="w-full p-3 bg-gray-50 rounded-lg border space-y-2 min-h-[60px]">
                    {!patient.medical_history || patient.medical_history.length === 0 ? (
                      <span className="text-sm text-gray-400">No medical history items listed.</span>
                    ) : (
                      patient.medical_history.map((item, index) => (
                        <div key={index} className="p-2 bg-white rounded border shadow-sm">
                          <p className="font-semibold text-sm">{item.complication}</p>
                          {item.description && (
                            <p className="text-xs text-gray-600">{item.description}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
            </div>
          </div>

          {/* AI Check Button */}
          <button
            onClick={handleAiCheck}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
          >
            <Shield className="w-5 h-5" />
            {loading ? 'Analyzing...' : 'Analyze Prescription Against Profile'}
          </button>

          {/* AI Result Display */}
          {aiResult && (
            <div className={`mt-6 p-4 rounded-lg border ${
              aiResult.status === 'safe' ? 'bg-green-50 border-green-200' :
              aiResult.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200' // error or high-risk
            }`}>
              <div className="flex items-center gap-3">
                {aiResult.status === 'safe' ? <CheckCircle className="w-6 h-6 text-green-600" /> :
                 aiResult.status === 'warning' ? <AlertTriangle className="w-6 h-6 text-yellow-600" /> :
                 <AlertTriangle className="w-6 h-6 text-red-600" /> // error or high-risk
                }
                <h3 className={`text-lg font-semibold ${
                  aiResult.status === 'safe' ? 'text-green-800' :
                  aiResult.status === 'warning' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>
                  {aiResult.status === 'safe' ? 'AI Check Clear' :
                   aiResult.status === 'warning' ? 'AI Potential Issue Found' :
                   aiResult.status === 'high-risk' ? 'AI High-Risk Warning' :
                   'Analysis Error'}
                </h3>
              </div>
              {/* Display message using pre-wrap to preserve newlines */}
              <p className="text-gray-700 mt-2 text-sm whitespace-pre-wrap">{aiResult.message}</p>
              {aiResult.suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold text-sm">Suggestions:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {aiResult.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Final Save Button */}
          <p className="text-xs text-gray-500 text-center mt-6">
            The doctor retains full clinical responsibility and makes the final decision.
          </p>
          <button
            onClick={handleSave}
            // Optionally disable if AI check hasn't run or if there's an error
            // disabled={!aiResult || aiResult.status === 'error'}
            className="w-full mt-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
          >
            Save Final Prescription
          </button>
        </div>
      </div>
    </div>
  );
}