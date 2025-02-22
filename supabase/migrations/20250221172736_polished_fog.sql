/*
  # Employee Management and Commission System

  1. New Tables
    - employee_commissions: Track commission rates and earnings
    - employee_performance: Track employee performance metrics
    - employee_schedules: Track employee work schedules
    
  2. Functions
    - calculate_commission: Calculate commission for an order
    - update_employee_performance: Update performance metrics
    - get_employee_earnings: Get total earnings for period
    
  3. Security
    - RLS policies for all new tables
    - Function security settings
*/

-- Create employee_commissions table
CREATE TABLE IF NOT EXISTS employee_commissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  rate numeric NOT NULL CHECK (rate >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, order_id)
);

-- Create employee_performance table
CREATE TABLE IF NOT EXISTS employee_performance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  orders_completed integer DEFAULT 0,
  orders_value numeric DEFAULT 0,
  commission_earned numeric DEFAULT 0,
  rating numeric CHECK (rating >= 0 AND rating <= 5),
  notes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, period_start, period_end)
);

-- Create employee_schedules table
CREATE TABLE IF NOT EXISTS employee_schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift_start time NOT NULL,
  shift_end time NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'absent')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Enable RLS
ALTER TABLE employee_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees can view own commissions"
  ON employee_commissions FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage commissions"
  ON employee_commissions FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Employees can view own performance"
  ON employee_performance FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage performance"
  ON employee_performance FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Employees can view own schedules"
  ON employee_schedules FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage schedules"
  ON employee_schedules FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create calculate_commission function
CREATE OR REPLACE FUNCTION calculate_commission(
  p_order_id uuid,
  p_employee_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_total numeric;
  v_commission_rate numeric;
  v_commission_amount numeric;
BEGIN
  -- Get order total
  SELECT total INTO v_order_total
  FROM orders
  WHERE id = p_order_id;

  -- Get employee commission rate
  SELECT (payroll_info->>'commissionRate')::numeric INTO v_commission_rate
  FROM users
  WHERE id = p_employee_id;

  -- Calculate commission
  v_commission_amount := v_order_total * (v_commission_rate / 100);

  -- Create commission record
  INSERT INTO employee_commissions (
    employee_id,
    order_id,
    amount,
    rate,
    status
  ) VALUES (
    p_employee_id,
    p_order_id,
    v_commission_amount,
    v_commission_rate,
    'pending'
  );

  RETURN v_commission_amount;
END;
$$;

-- Create update_employee_performance function
CREATE OR REPLACE FUNCTION update_employee_performance(
  p_employee_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_orders_completed integer;
  v_orders_value numeric;
  v_commission_earned numeric;
BEGIN
  -- Calculate metrics
  SELECT 
    COUNT(*),
    COALESCE(SUM(total), 0),
    COALESCE(SUM(ec.amount), 0)
  INTO 
    v_orders_completed,
    v_orders_value,
    v_commission_earned
  FROM orders o
  LEFT JOIN employee_commissions ec ON o.id = ec.order_id
  WHERE o.assigned_to = p_employee_id
  AND o.status = 'delivered'
  AND o.created_at >= p_period_start
  AND o.created_at < p_period_end + interval '1 day';

  -- Update or insert performance record
  INSERT INTO employee_performance (
    employee_id,
    period_start,
    period_end,
    orders_completed,
    orders_value,
    commission_earned
  ) VALUES (
    p_employee_id,
    p_period_start,
    p_period_end,
    v_orders_completed,
    v_orders_value,
    v_commission_earned
  )
  ON CONFLICT (employee_id, period_start, period_end)
  DO UPDATE SET
    orders_completed = EXCLUDED.orders_completed,
    orders_value = EXCLUDED.orders_value,
    commission_earned = EXCLUDED.commission_earned,
    updated_at = now();
END;
$$;

-- Create get_employee_earnings function
CREATE OR REPLACE FUNCTION get_employee_earnings(
  p_employee_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  base_pay numeric,
  commission numeric,
  total_earnings numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base_rate numeric;
  v_payment_frequency text;
  v_periods integer;
BEGIN
  -- Get employee payment info
  SELECT 
    (payroll_info->>'baseRate')::numeric,
    payroll_info->>'paymentFrequency'
  INTO v_base_rate, v_payment_frequency
  FROM users
  WHERE id = p_employee_id;

  -- Calculate number of pay periods
  v_periods := CASE v_payment_frequency
    WHEN 'weekly' THEN CEIL(DATE_PART('day', p_end_date::timestamp - p_start_date::timestamp) / 7)
    WHEN 'biweekly' THEN CEIL(DATE_PART('day', p_end_date::timestamp - p_start_date::timestamp) / 14)
    ELSE CEIL(DATE_PART('month', p_end_date::timestamp - p_start_date::timestamp))
  END;

  RETURN QUERY
  SELECT 
    v_base_rate * v_periods as base_pay,
    COALESCE(SUM(ec.amount), 0) as commission,
    (v_base_rate * v_periods) + COALESCE(SUM(ec.amount), 0) as total_earnings
  FROM employee_commissions ec
  WHERE ec.employee_id = p_employee_id
  AND ec.created_at >= p_start_date
  AND ec.created_at < p_end_date + interval '1 day'
  AND ec.status = 'paid';
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_employee_commissions_updated_at
  BEFORE UPDATE ON employee_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_performance_updated_at
  BEFORE UPDATE ON employee_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_schedules_updated_at
  BEFORE UPDATE ON employee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();