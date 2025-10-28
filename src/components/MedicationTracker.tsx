import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, Plus, Calendar } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Prescription = Database['public']['Tables']['prescriptions']['Row'];
type MedicationLog = Database['public']['Tables']['medication_logs']['Row'];

interface MedicationTrackerProps {
  prescriptions: Prescription[];
  onRefresh: () => void;
}

export function MedicationTracker({ prescriptions, onRefresh }: MedicationTrackerProps) {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [selectedDate]);

  const loadLogs = async () => {
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('patient_id', profile?.id)
        .gte('scheduled_time', startOfDay.toISOString())
        .lte('scheduled_time', endOfDay.toISOString())
        .order('scheduled_time', { ascending: true });

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const addMedicationLog = async (prescriptionId: string, scheduledTime: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('medication_logs')
        .insert({
          prescription_id: prescriptionId,
          patient_id: profile?.id!,
          scheduled_time: scheduledTime,
          status: 'pending',
        });

      if (error) throw error;
      await loadLogs();
      onRefresh();
    } catch (error: any) {
      alert('Error adding medication log: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateLogStatus = async (logId: string, status: 'taken' | 'missed' | 'skipped') => {
    try {
      const updateData: any = { status };
      if (status === 'taken') {
        updateData.taken_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('medication_logs')
        .update(updateData)
        .eq('id', logId);

      if (error) throw error;
      await loadLogs();
      onRefresh();
    } catch (error: any) {
      alert('Error updating medication log: ' + error.message);
    }
  };

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

  const getMedicationName = (prescriptionId: string) => {
    const prescription = prescriptions.find(p => p.id === prescriptionId);
    return prescription ? `${prescription.medication_name} - ${prescription.dosage}` : 'Unknown';
  };

  const handleQuickLog = (prescription: Prescription) => {
    const now = new Date();
    const scheduledTime = now.toISOString();
    addMedicationLog(prescription.id, scheduledTime);
  };

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

      {prescriptions.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No active prescriptions to track.</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Log Medication</h3>
            <div className="space-y-2">
              {prescriptions.map((prescription) => (
                <button
                  key={prescription.id}
                  onClick={() => handleQuickLog(prescription)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {prescription.medication_name} - {prescription.dosage}
                  </span>
                  <Plus className="w-4 h-4 text-teal-600" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Logs for {new Date(selectedDate).toLocaleDateString()}
            </h3>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No medication logs for this date.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${getStatusColor(log.status)}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(log.status)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {getMedicationName(log.prescription_id)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(log.scheduled_time).toLocaleTimeString([], {
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
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                        >
                          Taken
                        </button>
                        <button
                          onClick={() => updateLogStatus(log.id, 'missed')}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          Missed
                        </button>
                      </div>
                    )}
                    {log.status === 'taken' && log.taken_at && (
                      <span className="text-xs text-gray-600">
                        Taken at {new Date(log.taken_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
