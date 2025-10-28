import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { X, Plus, Save } from 'lucide-react';

// Type for a single history item
type HistoryItem = {
  id: string; // Client-side ID
  complication: string;
  description: string;
};

interface EditProfileModalProps {
  onClose: () => void;
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state, initialized from the profile
  const [ongoingMedications, setOngoingMedications] = useState('');
  const [medicalHistory, setMedicalHistory] = useState<HistoryItem[]>([]);
  
  // State for the temporary history item being added
  const [currentComplication, setCurrentComplication] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');

  // When the modal opens, populate the state from the context
  useEffect(() => {
    if (profile) {
      setOngoingMedications(profile.ongoing_medications || '');
      // Add client-side IDs to the history items for editing/deleting
      const historyWithIds = (profile.medical_history || []).map((item, index) => ({
        ...item,
        id: `hist_${index}_${Math.random()}`,
      }));
      setMedicalHistory(historyWithIds);
    }
  }, [profile]);

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
    setLoading(true);

    try {
      if (!profile) throw new Error("No profile found.");

      // Prepare data for Supabase (remove client-side IDs)
      const historyToSave = medicalHistory.map(({ id, ...rest }) => rest);

      const { error } = await supabase
        .from('profiles')
        .update({
          ongoing_medications: ongoingMedications,
          medical_history: historyToSave,
        })
        .eq('id', profile.id); // Update *this* user's profile

      if (error) throw error;

      // Manually refresh the profile in our app's context
      await refreshProfile();
      alert("Profile updated successfully!");
      onClose();

    } catch (error: any) {
      alert("Error updating profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Edit Medical Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Ongoing Medications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ongoing Medications
            </label>
            <textarea
              value={ongoingMedications}
              onChange={(e) => setOngoingMedications(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="e.g., Metformin 500mg, Lisinopril 10mg"
            />
          </div>

          {/* Medical History */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medical History
            </label>
            
            {/* List of added items */}
            <div className="space-y-2 mb-2">
              {medicalHistory.length === 0 && <p className="text-sm text-gray-400">No history items added.</p>}
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

          {/* Save/Cancel Buttons */}
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}