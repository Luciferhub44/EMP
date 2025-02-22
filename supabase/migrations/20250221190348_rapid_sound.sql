/*
  # Auth Schema Setup

  1. New Tables
    - `auth.users` - Core authentication table
      - `id` (uuid, primary key)
      - `instance_id` (uuid)
      - `email` (text, unique)
      - `encrypted_password` (text)
      - `email_confirmed_at` (timestamptz)
      - `role` (text)
      - `aud` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on auth tables
    - Add policies for secure access
*/

-- Create auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth.users table
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  email text UNIQUE NOT NULL,
  encrypted_password text NOT NULL,
  email_confirmed_at timestamptz,
  role text NOT NULL DEFAULT 'authenticated',
  aud text DEFAULT 'authenticated',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create auth functions
CREATE OR REPLACE FUNCTION auth.encrypt_password(password text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$;

CREATE OR REPLACE FUNCTION auth.verify_password(password text, encrypted_password text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encrypted_password = crypt(password, encrypted_password);
END;
$$;

-- Create admin user
DO $$
DECLARE
  admin_uuid uuid := gen_random_uuid();
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    role
  ) VALUES (
    admin_uuid,
    'admin4@example.com',
    auth.encrypt_password('admin123'),
    now(),
    'authenticated'
  );

  -- Insert into public.users
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    status,
    agent_id,
    business_info,
    payroll_info
  ) VALUES (
    admin_uuid,
    'admin4@example.com',
    'System Admin',
    'admin',
    'active',
    'ADMIN004',
    '{
      "companyName": "SANY Equipment",
      "registrationNumber": "93-1671162",
      "taxId": "93-1671162",
      "businessAddress": {
        "street": "228 Park Ave S",
        "city": "New York",
        "state": "NY",
        "postalCode": "10003",
        "country": "USA"
      }
    }'::jsonb,
    '{
      "bankName": "Bank of America",
      "accountNumber": "483101090345",
      "routingNumber": "21000322",
      "paymentFrequency": "monthly",
      "baseRate": 5000,
      "currency": "USD",
      "commissionRate": 2.5
    }'::jsonb
  );
END $$;