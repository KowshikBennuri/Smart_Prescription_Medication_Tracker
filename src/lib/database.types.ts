export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'patient' | 'doctor'
          phone: string | null
          date_of_birth: string | null
          license_number: string | null
          specialization: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'patient' | 'doctor'
          phone?: string | null
          date_of_birth?: string | null
          license_number?: string | null
          specialization?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'patient' | 'doctor'
          phone?: string | null
          date_of_birth?: string | null
          license_number?: string | null
          specialization?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prescriptions: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string
          medication_name: string
          dosage: string
          frequency: string
          duration_days: number
          instructions: string
          diagnosis: string | null
          status: 'active' | 'completed' | 'cancelled'
          start_date: string
          end_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id: string
          medication_name: string
          dosage: string
          frequency: string
          duration_days: number
          instructions: string
          diagnosis?: string | null
          status?: 'active' | 'completed' | 'cancelled'
          start_date: string
          end_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string
          medication_name?: string
          dosage?: string
          frequency?: string
          duration_days?: number
          instructions?: string
          diagnosis?: string | null
          status?: 'active' | 'completed' | 'cancelled'
          start_date?: string
          end_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      medication_logs: {
        Row: {
          id: string
          prescription_id: string
          patient_id: string
          scheduled_time: string
          taken_at: string | null
          status: 'pending' | 'taken' | 'missed' | 'skipped'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prescription_id: string
          patient_id: string
          scheduled_time: string
          taken_at?: string | null
          status?: 'pending' | 'taken' | 'missed' | 'skipped'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prescription_id?: string
          patient_id?: string
          scheduled_time?: string
          taken_at?: string | null
          status?: 'pending' | 'taken' | 'missed' | 'skipped'
          notes?: string | null
          created_at?: string
        }
      }
      doctor_patient_relationships: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string
          status: 'active' | 'inactive'
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id: string
          status?: 'active' | 'inactive'
          created_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string
          status?: 'active' | 'inactive'
          created_at?: string
        }
      }
    }
  }
}
