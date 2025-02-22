-- Create fulfillments table
CREATE TABLE fulfillments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'shipped', 'delivered', 'failed')
  ),
  carrier text,
  tracking_number text,
  estimated_delivery timestamptz,
  actual_delivery timestamptz,
  notes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_fulfillments_order_id ON fulfillments(order_id);
CREATE INDEX idx_fulfillments_status ON fulfillments(status);
CREATE INDEX idx_fulfillments_created_at ON fulfillments(created_at);

-- Enable RLS
ALTER TABLE fulfillments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view assigned fulfillments"
  ON fulfillments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = fulfillments.order_id
      AND (orders.assigned_to = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
  );

CREATE POLICY "Users can update assigned fulfillments"
  ON fulfillments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = fulfillments.order_id
      AND (orders.assigned_to = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
  );

CREATE POLICY "Admins can manage fulfillments"
  ON fulfillments FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add trigger for updated_at
CREATE TRIGGER update_fulfillments_updated_at
  BEFORE UPDATE ON fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();