// src/components/MedicalHistoryCheck.tsx

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, CheckCircle, Shield, ArrowLeft } from 'lucide-react';

// --- (Types) ---
type Profile = {
  id: string;
  full_name?: string;
  email?: string;
  // --- ADD NEW FIELDS ---
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
// --- (End Types) ---

interface MedicalHistoryCheckProps {
  patient: Profile; // This object will now contain the history
  prescription: Prescription;
  onFinalSave: (prescription: Prescription) => void;
  onCancel: () => void;
}

type AIResult = {
  status: 'safe' | 'warning' | 'error';
  message: string;
  suggestions: string[];
};

export function MedicalHistoryCheck({ patient, prescription, onFinalSave, onCancel }: MedicalHistoryCheckProps) {
  const { profile: doctor } = useAuth();
  
  // --- REMOVED: history state is no longer needed ---
  // const [history, setHistory] = useState('');
  
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAiCheck = async () => {
    setLoading(true);
    setAiResult(null);

    // --- MODIFIED: Use patient data from props ---
    const patientHistory = {
      ongoingMedications: patient.ongoing_medications || "None provided",
      medicalHistory: patient.medical_history || [],
    };
    
    // In a real app, send `prescription` & `patientHistory` to your backend
    console.log("Sending to AI for analysis:", { prescription, patientHistory });

    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate a response
    const mockResponse: AIResult = {
      status: 'warning',
      message: `Potential cross-reaction detected. Patient history shows: ${patientHistory.medicalHistory[0]?.complication || 'Allergy'}.`,
      suggestions: ['Consider replacing Amoxicillin with Azithromycin 500mg, once daily for 3 days.']
    };
    
    setAiResult(mockResponse);
    setLoading(false);
  };

  const handleSave = () => {
    const finalPrescription = {
      ...prescription,
      status: 'active' as const,
    };
    onFinalSave(finalPrescription);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={onCancel} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Safety Check</h1>
          <p className="text-gray-600 mb-6">
            Analyzing prescription for <span className="font-semibold">{patient.full_name}</span>
            {" "}by <span className="font-semibold">Dr. {doctor?.full_name}</span>.
          </p>

          {/* --- MODIFIED: Display Patient History (Read-Only) --- */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Patient's Existing Medical Profile</h3>
            
            <div className="space-y-4">
              {/* Ongoing Medications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ongoing Medications
                </label>
                <div className="w-full px-4 py-3 bg-gray-50 text-gray-700 rounded-lg border min-h-[40px]">
                  {patient.ongoing_medications || <span className="text-gray-400">No ongoing medications listed.</span>}
                </div>
              </div>

              {/* Medical History */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical History
                </label>
                <div className="w-full p-4 bg-gray-50 rounded-lg border space-y-2 min-h-[60px]">
                  {!patient.medical_history || patient.medical_history.length === 0 ? (
                    <span className="text-gray-400">No medical history items listed.</span>
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
          {/* --- END OF MODIFICATION --- */}

          {/* --- Step 2: AI Check (Button modified) --- */}
          <button
            onClick={handleAiCheck}
            disabled={loading} // No longer depends on history.trim()
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            <Shield className="w-5 h-5" />
            {loading ? 'Analyzing...' : 'Analyze Prescription Against Profile'}
          </button>

          {/* --- (AI Result display is unchanged) --- */}
          {aiResult && (
            <div className={`mt-6 p-4 rounded-lg border ${
              aiResult.status === 'safe' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {aiResult.status === 'safe' ?
                  <CheckCircle className="w-6 h-6 text-green-600" /> :
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                }
                <h3 className="text-lg font-semibold">
                  {aiResult.status === 'safe' ? 'AI Check Clear' : 'AI Warning Detected'}
                </h3>
              </div>
              <p className="text-gray-700 mt-2">{aiResult.message}</p>
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
          
          {/* --- (Final Save button is unchanged) --- */}
          <p className="text-xs text-gray-500 text-center mt-6">
            The doctor has the final decision on all modifications.
          </p>
          <button
            onClick={handleSave}
            className="w-full mt-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Save Final Prescription
          </button>
        </div>
      </div>
    </div>
  );
}