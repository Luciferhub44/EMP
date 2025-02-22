/*
  # Fix Auth User Creation
  
  1. Drop existing tables
  2. Create admin user with proper UUID
  3. Insert into public.users table
*/

-- Drop all existing tables
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payroll_adjustments CASCADE;
DROP TABLE IF EXISTS employee_schedules CASCADE;
DROP TABLE IF EXISTS transport_assignments CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS transport_routes CASCADE;
DROP TABLE IF EXISTS transport_vehicles CASCADE;
DROP TABLE IF EXISTS commission_rates CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS transport_quotes CASCADE;
DROP TABLE IF EXISTS transport_providers CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Reset the auth schema
DELETE FROM auth.users;

-- Create admin user with explicit UUID
DO $$
DECLARE
  admin_uuid uuid := gen_random_uuid();
BEGIN
  -- Insert into auth.users with explicit UUID
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    role,
    aud,
    created_at
  ) VALUES (
    admin_uuid,
    '00000000-0000-0000-0000-000000000000',
    'admin@example.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    'authenticated',
    'authenticated',
    now()
  );

  -- Insert into public.users with the same UUID
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
    'admin@example.com',
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
  );
END $$;