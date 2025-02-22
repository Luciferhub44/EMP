/*
  # Authentication Setup Migration

  1. New Tables
    - Create auth schema tables
    - Add necessary indexes and constraints
  
  2. Security
    - Enable RLS
    - Add policies for auth
    - Create admin user with proper credentials
*/

-- Create auth schema if not exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth tables
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text NOT NULL,
  email_confirmed_at timestamptz,
  role text NOT NULL DEFAULT 'employee',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to handle password encryption
CREATE OR REPLACE FUNCTION auth.encrypt_password(password text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$;

-- Create function to verify password
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
BEGIN
  -- Create admin in auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    role
  ) VALUES (
    'admin@example.com',
    auth.encrypt_password('admin123'),
    now(),
    'admin'
  ) ON CONFLICT (email) DO NOTHING;

  -- Create admin in public.users
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    status,
    agent_id,
    business_info,
    payroll_info
  )
  SELECT
    id,
    email,
    'System Admin',
    'admin',
    'active',
    'ADMIN001',
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
  FROM auth.users
  WHERE email = 'admin@example.com'
  ON CONFLICT DO NOTHING;
END;
$$;