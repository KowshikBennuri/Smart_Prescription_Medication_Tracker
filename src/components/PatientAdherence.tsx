import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabaseClient'; // NEW IMPORT

// Type must match the one in PatientDashboard
type MedicationLog = {
  id: string;
  prescription_id: string;
  patient_id: string;
  medication_id: string;
  medication_name: string;
  dosage: string;
  scheduled_time: string; // ISO string
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  taken_at?: string | null;
};

interface MedicationTrackerProps {
  logs: MedicationLog[]; // Receives all logs from dashboard
  onRefresh: () => void;
}

export function MedicationTracker({ logs, onRefresh }: MedicationTrackerProps) {
  const { profile } = useAuth();
  const [filteredLogs, setFilteredLogs] = useState<MedicationLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // This useEffect now *filters* the logs prop, it doesn't fetch
  useEffect(() => {
    if (!profile?.id) return;

    setLoading(true);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filtered = logs.filter((l) => {
      const t = new Date(l.scheduled_time).getTime();
      return t >= startOfDay.getTime() && t <= endOfDay.getTime();
    });

    // Sort by scheduled_time ascending
    filtered.sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

    setFilteredLogs(filtered);
    setLoading(false);
  }, [selectedDate, logs, profile?.id]);

  // --- MODIFIED: This function now updates Supabase ---
  const updateLogStatus = async (logId: string, status: 'taken' | 'missed' | 'skipped') => {
    setLoading(true);
    try {
      const updateData: any = {
        status: status,
        taken_at: status === 'taken' ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('medication_logs')
        .update(updateData)
        .eq('id', logId);

      if (error) throw error;
      
      onRefresh(); // Trigger the dashboard to re-fetch all data
    } catch (err: any) {
      alert('Error updating medication log: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // --- (Helper functions getStatusIcon, getStatusColor are unchanged) ---
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'missed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'skipped':
        return <XCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken':
        return 'bg-green-50 border-green-200';
      case 'missed':
        return 'bg-red-50 border-red-200';
      case 'skipped':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-white border-gray-200';
    }
  };
  
  // --- Quick Log is removed, as logs are now auto-generated ---
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="w-5 h-5 text-gray-400" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* --- Main Logs View --- */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Logs for {new Date(selectedDate).toLocaleDateString()}
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500 py-4">Loading logs...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No medication logs for this date.</p>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${getStatusColor(log.status)}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(log.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {log.medication_name} - {log.dosage}
                    </p>
                    <p className="text-xs text-gray-600">
                      Scheduled for {new Date(log.scheduled_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {log.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateLogStatus(log.id, 'taken')}
                      disabled={loading}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Taken
                    </button>
                    <button
                      onClick={() => updateLogStatus(log.id, 'missed')}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Missed
                    </button>
                  </div>
                )}

                {log.status === 'taken' && log.taken_at && (
                  <span className="text-xs text-gray-600">
                    Taken at {new Date(log.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {log.status === 'missed' && (
                  <span className="text-xs font-medium text-red-600">Missed</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}