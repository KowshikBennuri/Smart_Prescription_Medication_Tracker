/*
  # Smart Prescription and Medication Tracker Schema

  ## Overview
  This migration creates a comprehensive prescription and medication tracking system for both patients and doctors.

  ## New Tables

  ### 1. `profiles`
  User profiles extending Supabase auth.users
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - Either 'patient' or 'doctor'
  - `phone` (text, optional) - Contact number
  - `date_of_birth` (date, optional) - For patients
  - `license_number` (text, optional) - For doctors
  - `specialization` (text, optional) - For doctors
  - `created_at` (timestamptz) - Account creation time
  - `updated_at` (timestamptz) - Last update time

  ### 2. `prescriptions`
  Prescriptions created by doctors for patients
  - `id` (uuid, primary key)
  - `doctor_id` (uuid) - References profiles (doctor)
  - `patient_id` (uuid) - References profiles (patient)
  - `medication_name` (text) - Name of medication
  - `dosage` (text) - Dosage instructions (e.g., "500mg")
  - `frequency` (text) - How often to take (e.g., "twice daily")
  - `duration_days` (integer) - Treatment duration in days
  - `instructions` (text) - Additional instructions
  - `diagnosis` (text, optional) - Related diagnosis
  - `status` (text) - 'active', 'completed', or 'cancelled'
  - `start_date` (date) - When to start medication
  - `end_date` (date) - When to end medication
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `medication_logs`
  Tracks when patients take their medications
  - `id` (uuid, primary key)
  - `prescription_id` (uuid) - References prescriptions
  - `patient_id` (uuid) - References profiles (patient)
  - `scheduled_time` (timestamptz) - When medication should be taken
  - `taken_at` (timestamptz, optional) - When actually taken
  - `status` (text) - 'pending', 'taken', 'missed', or 'skipped'
  - `notes` (text, optional) - Patient notes
  - `created_at` (timestamptz)

  ### 4. `doctor_patient_relationships`
  Manages doctor-patient relationships
  - `id` (uuid, primary key)
  - `doctor_id` (uuid) - References profiles (doctor)
  - `patient_id` (uuid) - References profiles (patient)
  - `status` (text) - 'active' or 'inactive'
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Profiles: Users can read/update their own profile, doctors can read their patients' profiles
  - Prescriptions: Doctors can create/manage prescriptions for their patients, patients can view their own
  - Medication logs: Patients can create/update their own logs, doctors can view their patients' logs
  - Relationships: Doctors and patients can view their own relationships

  ## Indexes
  - Index on prescription status and dates for efficient querying
  - Index on medication logs for tracking and reporting
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('patient', 'doctor')),
  phone text,
  date_of_birth date,
  license_number text,
  specialization text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration_days integer NOT NULL,
  instructions text NOT NULL,
  diagnosis text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create medication logs table
CREATE TABLE IF NOT EXISTS medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_time timestamptz NOT NULL,
  taken_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed', 'skipped')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create doctor-patient relationships table
CREATE TABLE IF NOT EXISTS doctor_patient_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(doctor_id, patient_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_dates ON prescriptions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_medication_logs_patient ON medication_logs(patient_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_medication_logs_prescription ON medication_logs(prescription_id, status);
CREATE INDEX IF NOT EXISTS idx_relationships_doctor ON doctor_patient_relationships(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_relationships_patient ON doctor_patient_relationships(patient_id, status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_patient_relationships ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Doctors can view their patients' profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_relationships
      WHERE doctor_patient_relationships.patient_id = profiles.id
      AND doctor_patient_relationships.doctor_id = auth.uid()
      AND doctor_patient_relationships.status = 'active'
    )
  );

CREATE POLICY "Patients can view their doctors' profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_relationships
      WHERE doctor_patient_relationships.doctor_id = profiles.id
      AND doctor_patient_relationships.patient_id = auth.uid()
      AND doctor_patient_relationships.status = 'active'
    )
  );

-- Prescriptions policies
CREATE POLICY "Patients can view own prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view prescriptions they created"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can create prescriptions for their patients"
  ON prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    doctor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM doctor_patient_relationships
      WHERE doctor_patient_relationships.doctor_id = auth.uid()
      AND doctor_patient_relationships.patient_id = prescriptions.patient_id
      AND doctor_patient_relationships.status = 'active'
    )
  );

CREATE POLICY "Doctors can update their own prescriptions"
  ON prescriptions FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can delete their own prescriptions"
  ON prescriptions FOR DELETE
  TO authenticated
  USING (doctor_id = auth.uid());

-- Medication logs policies
CREATE POLICY "Patients can view own medication logs"
  ON medication_logs FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view their patients' medication logs"
  ON medication_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_relationships
      WHERE doctor_patient_relationships.doctor_id = auth.uid()
      AND doctor_patient_relationships.patient_id = medication_logs.patient_id
      AND doctor_patient_relationships.status = 'active'
    )
  );

CREATE POLICY "Patients can create own medication logs"
  ON medication_logs FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own medication logs"
  ON medication_logs FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Doctor-patient relationships policies
CREATE POLICY "Doctors can view their relationships"
  ON doctor_patient_relationships FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Patients can view their relationships"
  ON doctor_patient_relationships FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can create relationships"
  ON doctor_patient_relationships FOR INSERT
  TO authenticated
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can update their relationships"
  ON doctor_patient_relationships FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();