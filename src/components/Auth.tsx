import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, LogIn, Stethoscope, User, Plus, X } from 'lucide-react';

// New type for history items
type HistoryItem = {
  id: string;
  complication: string;
  description: string;
};

export function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Doctor-specific fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('');

  // Patient-specific fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ongoingMedications, setOngoingMedications] = useState('');
  const [medicalHistory, setMedicalHistory] = useState<HistoryItem[]>([]);

  // State for the temporary history item being added
  const [currentComplication, setCurrentComplication] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');

  const { signUp, signIn } = useAuth();

  const handleAddHistoryItem = () => {
    if (!currentComplication) {
      alert("Please enter a complication name (e.g., 'Surgery', 'Allergy').");
      return;
    }
    setMedicalHistory([
      ...medicalHistory,
      {
        id: 'hist_' + Math.random().toString(36).slice(2, 9),
        complication: currentComplication,
        description: currentDescription,
      },
    ]);
    setCurrentComplication('');
    setCurrentDescription('');
  };

  const handleRemoveHistoryItem = (id: string) => {
    setMedicalHistory(medicalHistory.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const signUpData: any = {
          email,
          password,
          full_name: fullName,
          role,
        };

        if (role === 'doctor') {
          if (licenseNumber) signUpData.license_number = licenseNumber;
          if (specialization) signUpData.specialization = specialization;
        } else {
          // Add new patient data
          if (dateOfBirth) signUpData.date_of_birth = dateOfBirth;
          if (ongoingMedications) signUpData.ongoing_medications = ongoingMedications;
          // Send medical history, but remove the temporary client-side 'id'
          signUpData.medical_history = medicalHistory.map(({ id, ...rest }) => rest);
        }

        await signUp(signUpData);
        // MODIFICATION: Removed the alert below
        // alert("User created successfully");
      } else {
        await signIn({ email, password });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Stethoscope className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MediTrack</h1>
            <p className="text-gray-600">Smart Prescription & Medication Tracker</p>
          </div>

          {/* Sign In / Sign Up Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                !isSignUp
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                isSignUp
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Sign Up
            </button>
          </div>

          {/* Role Selector (only shown on Sign Up) */}
          {isSignUp && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setRole('patient')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  role === 'patient'
                    ? 'bg-teal-50 text-teal-700 border-2 border-teal-500'
                    : 'bg-gray-50 text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className="w-5 h-5 inline mr-2" />
                Patient
              </button>
              <button
                onClick={() => setRole('doctor')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  role === 'doctor'
                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-500'
                    : 'bg-gray-50 text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Stethoscope className="w-5 h-5 inline mr-2" />
                Doctor
              </button>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (only shown on Sign Up) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg" required
                />
              </div>
            )}
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg" required
              />
            </div>
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg" required minLength={6}
              />
            </div>

            {/* Doctor Fields (only shown on Sign Up as Doctor) */}
            {isSignUp && role === 'doctor' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  <input
                    type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <input
                    type="text" value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Cardiology, General Practice"
                  />
                </div>
              </>
            )}

            {/* Patient Fields (only shown on Sign Up as Patient) */}
            {isSignUp && role === 'patient' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ongoing Medications (if any)
                  </label>
                  <textarea
                    value={ongoingMedications}
                    onChange={(e) => setOngoingMedications(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="e.g., Metformin 500mg, Lisinopril 10mg"
                  />
                </div>

                {/* Medical History Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical History (Major complications, allergies, etc.)
                  </label>

                  {/* List of added items */}
                  <div className="space-y-2 mb-2">
                    {medicalHistory.map(item => (
                      <div key={item.id} className="flex items-start justify-between p-2 bg-gray-50 rounded-lg border">
                        <div>
                          <p className="font-semibold text-sm">{item.complication}</p>
                          <p className="text-xs text-gray-600">{item.description}</p>
                        </div>
                        <button type="button" onClick={() => handleRemoveHistoryItem(item.id)} className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Form to add a new item */}
                  <div className="p-2 border rounded-lg space-y-2">
                    <input
                      type="text"
                      value={currentComplication}
                      onChange={(e) => setCurrentComplication(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      placeholder="Complication (e.g., Penicillin Allergy)"
                    />
                    <textarea
                      value={currentDescription}
                      onChange={(e) => setCurrentDescription(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      rows={2}
                      placeholder="Description (optional)"
                    />
                    <button
                      type="button"
                      onClick={handleAddHistoryItem}
                      className="w-full flex items-center justify-center gap-1 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                    >
                      <Plus className="w-4 h-4" /> Add to History
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}