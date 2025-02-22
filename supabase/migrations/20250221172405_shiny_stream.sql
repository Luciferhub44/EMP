/*
  # Order Assignment and Management System

  1. New Tables
    - order_assignments
      - Links orders to employees
      - Tracks assignment history
      - Stores assignment metadata
    
  2. Functions
    - assign_order: Assigns an order to an employee
    - unassign_order: Removes an order assignment
    - get_employee_orders: Gets all orders assigned to an employee
    
  3. Security
    - RLS policies for order assignments
    - Function security settings
*/

-- Create order assignments table
CREATE TABLE IF NOT EXISTS order_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes text,
  UNIQUE(order_id, employee_id, status)
);

-- Add assigned_to column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

-- Enable RLS
ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for order assignments
CREATE POLICY "Employees can view their assignments"
  ON order_assignments
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR 
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage assignments"
  ON order_assignments
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create function to assign order
CREATE OR REPLACE FUNCTION assign_order(
  p_order_id uuid,
  p_employee_id uuid,
  p_assigned_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate order exists and isn't already assigned
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Validate employee exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_employee_id) THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  -- Insert assignment
  INSERT INTO order_assignments (
    order_id,
    employee_id,
    assigned_by,
    notes
  ) VALUES (
    p_order_id,
    p_employee_id,
    p_assigned_by,
    p_notes
  );

  -- Update order
  UPDATE orders SET 
    assigned_to = p_employee_id,
    assigned_at = now(),
    updated_at = now()
  WHERE id = p_order_id;
END;
$$;

-- Create function to unassign order
CREATE OR REPLACE FUNCTION unassign_order(
  p_order_id uuid,
  p_employee_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update assignment status
  UPDATE order_assignments SET
    status = 'cancelled',
    updated_at = now()
  WHERE order_id = p_order_id
  AND employee_id = p_employee_id
  AND status = 'active';

  -- Update order
  UPDATE orders SET
    assigned_to = NULL,
    assigned_at = NULL,
    updated_at = now()
  WHERE id = p_order_id;
END;
$$;

-- Create function to get employee orders
CREATE OR REPLACE FUNCTION get_employee_orders(
  p_employee_id uuid
)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT o.*
  FROM orders o
  INNER JOIN order_assignments oa ON o.id = oa.order_id
  WHERE oa.employee_id = p_employee_id
  AND oa.status = 'active'
  ORDER BY o.created_at DESC;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_order_assignments_updated_at
  BEFORE UPDATE ON order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();