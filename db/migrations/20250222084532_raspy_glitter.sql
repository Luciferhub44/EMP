-- Create authenticated role if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END
$$;

/*
  # Create remaining tables for the application

  1. New Tables
    - `audit_logs` - For tracking system activity
    - `storage` - For key-value storage
    - `system_settings` - For global application settings
    - `transport_providers` - For managing transport companies
    - `transport_vehicles` - For managing transport fleet
    - `transport_assignments` - For tracking vehicle assignments
    - `payment_methods` - For storing payment method configurations
    - `commission_rates` - For managing employee commission rates
    - `payroll_periods` - For tracking payroll periods
    - `payroll_adjustments` - For tracking salary adjustments

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for access control
    - Add audit logging triggers

  3. Indexes
    - Add performance-optimized indexes
*/

-- Create audit_logs table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create storage table
CREATE TABLE storage (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create system_settings table
CREATE TABLE system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transport_providers table
CREATE TABLE transport_providers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  contact_info jsonb NOT NULL,
  service_areas text[],
  rates jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transport_vehicles table
CREATE TABLE transport_vehicles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid REFERENCES transport_providers(id) ON DELETE CASCADE,
  type text NOT NULL,
  capacity numeric NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (
    status IN ('available', 'in_use', 'maintenance', 'retired')
  ),
  specifications jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transport_assignments table
CREATE TABLE transport_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES transport_vehicles(id) ON DELETE SET NULL,
  driver_info jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'cancelled')
  ),
  pickup_time timestamptz,
  delivery_time timestamptz,
  notes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_methods table
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL CHECK (
    type IN ('bank_transfer', 'credit_card', 'crypto', 'financing')
  ),
  config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create commission_rates table
CREATE TABLE commission_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  rate numeric NOT NULL CHECK (rate >= 0),
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payroll_periods table
CREATE TABLE payroll_periods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'error')
  ),
  processed_at timestamptz,
  processed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (start_date < end_date)
);

-- Create payroll_adjustments table
CREATE TABLE payroll_adjustments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  period_id uuid REFERENCES payroll_periods(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (
    type IN ('bonus', 'deduction', 'correction', 'other')
  ),
  amount numeric NOT NULL,
  reason text NOT NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_transport_providers_status ON transport_providers(status);
CREATE INDEX idx_transport_vehicles_provider_id ON transport_vehicles(provider_id);
CREATE INDEX idx_transport_vehicles_status ON transport_vehicles(status);
CREATE INDEX idx_transport_assignments_order_id ON transport_assignments(order_id);
CREATE INDEX idx_transport_assignments_status ON transport_assignments(status);

CREATE INDEX idx_commission_rates_employee_id ON commission_rates(employee_id);
CREATE INDEX idx_commission_rates_effective_from ON commission_rates(effective_from);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);
CREATE INDEX idx_payroll_adjustments_employee_id ON payroll_adjustments(employee_id);
CREATE INDEX idx_payroll_adjustments_period_id ON payroll_adjustments(period_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can view transport providers"
  ON transport_providers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage transport providers"
  ON transport_providers FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can view transport vehicles"
  ON transport_vehicles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage transport vehicles"
  ON transport_vehicles FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view assigned transport assignments"
  ON transport_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = transport_assignments.order_id
      AND (orders.assigned_to = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
  );

CREATE POLICY "Admins can manage transport assignments"
  ON transport_assignments FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can view payment methods"
  ON payment_methods FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage payment methods"
  ON payment_methods FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view own commission rates"
  ON commission_rates FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage commission rates"
  ON commission_rates FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view payroll periods"
  ON payroll_periods FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage payroll periods"
  ON payroll_periods FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view own payroll adjustments"
  ON payroll_adjustments FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage payroll adjustments"
  ON payroll_adjustments FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add triggers
CREATE TRIGGER update_storage_updated_at
  BEFORE UPDATE ON storage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transport_providers_updated_at
  BEFORE UPDATE ON transport_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transport_vehicles_updated_at
  BEFORE UPDATE ON transport_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transport_assignments_updated_at
  BEFORE UPDATE ON transport_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_rates_updated_at
  BEFORE UPDATE ON commission_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at
  BEFORE UPDATE ON payroll_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_adjustments_updated_at
  BEFORE UPDATE ON payroll_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('email_notifications', 
   '{"enabled":true,"from":"noreply@example.com"}',
   'Email notification settings'),
  ('security',
   '{"session_timeout":3600,"max_login_attempts":5}',
   'Security settings'),
  ('maintenance',
   '{"enabled":false,"message":""}',
   'Maintenance mode settings')
ON CONFLICT (key) DO NOTHING;

-- Insert default payment methods
INSERT INTO payment_methods (name, type, config, is_active) VALUES
  ('Bank Transfer',
   'bank_transfer',
   '{
     "bankName": "Example Bank",
     "accountNumber": "1234567890",
     "routingNumber": "987654321",
     "swiftCode": "EXAMPLEBK"
   }',
   true),
  ('Credit Card',
   'credit_card',
   '{
     "processor": "stripe",
     "supportedCards": ["visa", "mastercard", "amex"]
   }',
   true),
  ('Cryptocurrency',
   'crypto',
   '{
     "networks": [
       {
         "name": "Bitcoin",
         "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
       },
       {
         "name": "Ethereum",
         "address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
       }
     ]
   }',
   true)
ON CONFLICT DO NOTHING;