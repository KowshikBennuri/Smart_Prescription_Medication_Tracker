import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
// MODIFIED: Added Pill to imports
import { CheckCircle, XCircle, Clock, Pill } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// Type must match the one in PatientDashboard
type MedicationLog = {
  id: string; prescription_id: string; patient_id: string; medication_id: string;
  medication_name: string; dosage: string; scheduled_time: string;
  status: 'pending' | 'taken' | 'missed' | 'skipped'; taken_at?: string | null;
};

interface MedicationTrackerProps {
  logs: MedicationLog[]; // Receives ONLY the logs for the selected date
  onRefresh: () => void;
}

export function MedicationTracker({ logs, onRefresh }: MedicationTrackerProps) {
  const [loading, setLoading] = useState(false);

  // --- No longer needs internal filtering or selectedDate state ---

  const updateLogStatus = async (logId: string, status: 'taken' | 'missed' | 'skipped') => {
    setLoading(true);
    try {
      const updateData: any = {
        status: status,
        taken_at: status === 'taken' ? new Date().toISOString() : null,
      };
      const { error } = await supabase
        .from('medication_logs').update(updateData).eq('id', logId);
      if (error) throw error;
      onRefresh(); // Trigger dashboard refresh
    } catch (err: any) { alert('Error updating medication log: ' + (err?.message || err)); }
    finally { setLoading(false); }
  };

  // --- MODIFIED: getStatusIcon function ---
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'missed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'skipped':
        return <XCircle className="w-5 h-5 text-orange-600" />; // Or adjust icon/color for skipped
      default: // 'pending'
        // CHANGED Clock to Pill
        return <Pill className="w-5 h-5 text-gray-500" />;
    }
  };
  // --- END MODIFICATION ---

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken':
        return 'bg-green-50 border-green-200';
      case 'missed':
        return 'bg-red-50 border-red-200';
      case 'skipped':
        return 'bg-orange-50 border-orange-200'; // Or adjust color for skipped
      default: // 'pending'
        return 'bg-white border-gray-200';
    }
  };
  // --- End Helper Functions ---

  // Sort logs by time for display
  const sortedLogs = [...logs].sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  return (
    <div className="space-y-3">
      {/* Date input removed - handled by parent */}

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-4">Updating...</p>
      ) : sortedLogs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No medications scheduled for this date.</p>
      ) : (
        sortedLogs.map((log) => (
          <div
            key={log.id}
            className={`flex items-center justify-between p-4 border rounded-lg shadow-sm transition-colors ${getStatusColor(log.status)}`}
          >
            {/* Medication Info */}
            <div className="flex items-center gap-4 flex-1 mr-4">
              {getStatusIcon(log.status)} {/* This will now render the Pill icon for pending */}
              <div className="flex-1">
                <p className="font-semibold text-gray-800">
                  {log.medication_name} - {log.dosage}
                </p>
                <p className="text-sm text-gray-600">
                  Scheduled for{' '}
                  {new Date(log.scheduled_time).toLocaleTimeString([], {
                    hour: 'numeric', minute: '2-digit', hour12: true
                  })}
                </p>
              </div>
            </div>

            {/* Actions / Status */}
            <div className="flex-shrink-0">
              {log.status === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => updateLogStatus(log.id, 'taken')}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors disabled:opacity-50"
                  >
                    Mark Taken
                  </button>
                  <button
                    onClick={() => updateLogStatus(log.id, 'missed')}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors disabled:opacity-50"
                  >
                    Mark Missed
                  </button>
                </div>
              )}

              {log.status === 'taken' && log.taken_at && (
                <div className="text-right">
                   <span className="text-xs font-medium text-green-700 flex items-center gap-1 justify-end">
                     <CheckCircle className="w-4 h-4"/> Taken
                   </span>
                   <span className="text-xs text-gray-500 block mt-0.5">
                     at {new Date(log.taken_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                   </span>
                </div>
              )}
              {log.status === 'missed' && (
                <span className="text-xs font-medium text-red-700 flex items-center gap-1 justify-end">
                  <XCircle className="w-4 h-4"/> Missed
                </span>
              )}
               {log.status === 'skipped' && (
                <span className="text-xs font-medium text-orange-700 flex items-center gap-1 justify-end">
                   <XCircle className="w-4 h-4"/> Skipped
                 </span>
               )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}