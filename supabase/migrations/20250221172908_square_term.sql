/*
  # Order Analytics and Tracking System

  1. New Tables
    - order_history: Track order status changes
    - order_metrics: Store order performance metrics
    - order_analytics: Store aggregated analytics data
    
  2. Functions
    - track_order_status: Track order status changes
    - calculate_order_metrics: Calculate order performance metrics
    - generate_analytics: Generate aggregated analytics
    
  3. Security
    - RLS policies for all new tables
    - Function security settings
*/

-- Create order_history table
CREATE TABLE IF NOT EXISTS order_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  previous_status text,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create order_metrics table
CREATE TABLE IF NOT EXISTS order_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  processing_time interval,
  fulfillment_time interval,
  delivery_time interval,
  total_time interval,
  customer_rating numeric CHECK (customer_rating >= 0 AND customer_rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_analytics table
CREATE TABLE IF NOT EXISTS order_analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_orders integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  average_order_value numeric DEFAULT 0,
  processing_time_avg interval,
  fulfillment_time_avg interval,
  delivery_time_avg interval,
  customer_rating_avg numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(period_start, period_end)
);

-- Enable RLS
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view order history"
  ON order_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage order history"
  ON order_history FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can view order metrics"
  ON order_metrics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage order metrics"
  ON order_metrics FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can view order analytics"
  ON order_analytics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage order analytics"
  ON order_analytics FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create track_order_status function
CREATE OR REPLACE FUNCTION track_order_status(
  p_order_id uuid,
  p_status text,
  p_changed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_status text;
BEGIN
  -- Get current status
  SELECT status INTO v_previous_status
  FROM orders
  WHERE id = p_order_id;

  -- Update order status
  UPDATE orders SET
    status = p_status,
    updated_at = now()
  WHERE id = p_order_id;

  -- Record status change
  INSERT INTO order_history (
    order_id,
    status,
    previous_status,
    changed_by,
    notes
  ) VALUES (
    p_order_id,
    p_status,
    v_previous_status,
    p_changed_by,
    p_notes
  );
END;
$$;

-- Create calculate_order_metrics function
CREATE OR REPLACE FUNCTION calculate_order_metrics(
  p_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_processing_time interval;
  v_fulfillment_time interval;
  v_delivery_time interval;
  v_total_time interval;
BEGIN
  -- Get order details
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;

  -- Calculate times from order history
  WITH status_times AS (
    SELECT 
      status,
      created_at,
      LEAD(created_at) OVER (ORDER BY created_at) as next_status_time
    FROM order_history
    WHERE order_id = p_order_id
  )
  SELECT
    MAX(CASE WHEN status = 'processing' THEN next_status_time - created_at END),
    MAX(CASE WHEN status = 'shipped' THEN next_status_time - created_at END),
    MAX(CASE WHEN status = 'delivered' THEN next_status_time - created_at END),
    MAX(created_at) - MIN(created_at)
  INTO
    v_processing_time,
    v_fulfillment_time,
    v_delivery_time,
    v_total_time
  FROM status_times;

  -- Update or insert metrics
  INSERT INTO order_metrics (
    order_id,
    processing_time,
    fulfillment_time,
    delivery_time,
    total_time
  ) VALUES (
    p_order_id,
    v_processing_time,
    v_fulfillment_time,
    v_delivery_time,
    v_total_time
  )
  ON CONFLICT (order_id)
  DO UPDATE SET
    processing_time = EXCLUDED.processing_time,
    fulfillment_time = EXCLUDED.fulfillment_time,
    delivery_time = EXCLUDED.delivery_time,
    total_time = EXCLUDED.total_time,
    updated_at = now();
END;
$$;

-- Create generate_analytics function
CREATE OR REPLACE FUNCTION generate_analytics(
  p_start_date date,
  p_end_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_orders integer;
  v_total_revenue numeric;
  v_avg_order_value numeric;
  v_processing_time_avg interval;
  v_fulfillment_time_avg interval;
  v_delivery_time_avg interval;
  v_customer_rating_avg numeric;
BEGIN
  -- Calculate metrics
  SELECT
    COUNT(*),
    COALESCE(SUM(total), 0),
    COALESCE(AVG(total), 0),
    COALESCE(AVG(m.processing_time), '0'::interval),
    COALESCE(AVG(m.fulfillment_time), '0'::interval),
    COALESCE(AVG(m.delivery_time), '0'::interval),
    COALESCE(AVG(m.customer_rating), 0)
  INTO
    v_total_orders,
    v_total_revenue,
    v_avg_order_value,
    v_processing_time_avg,
    v_fulfillment_time_avg,
    v_delivery_time_avg,
    v_customer_rating_avg
  FROM orders o
  LEFT JOIN order_metrics m ON o.id = m.order_id
  WHERE o.created_at >= p_start_date
  AND o.created_at < p_end_date + interval '1 day';

  -- Update or insert analytics
  INSERT INTO order_analytics (
    period_start,
    period_end,
    total_orders,
    total_revenue,
    average_order_value,
    processing_time_avg,
    fulfillment_time_avg,
    delivery_time_avg,
    customer_rating_avg
  ) VALUES (
    p_start_date,
    p_end_date,
    v_total_orders,
    v_total_revenue,
    v_avg_order_value,
    v_processing_time_avg,
    v_fulfillment_time_avg,
    v_delivery_time_avg,
    v_customer_rating_avg
  )
  ON CONFLICT (period_start, period_end)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_revenue = EXCLUDED.total_revenue,
    average_order_value = EXCLUDED.average_order_value,
    processing_time_avg = EXCLUDED.processing_time_avg,
    fulfillment_time_avg = EXCLUDED.fulfillment_time_avg,
    delivery_time_avg = EXCLUDED.delivery_time_avg,
    customer_rating_avg = EXCLUDED.customer_rating_avg,
    updated_at = now();
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_order_metrics_updated_at
  BEFORE UPDATE ON order_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_analytics_updated_at
  BEFORE UPDATE ON order_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically track status changes
CREATE OR REPLACE FUNCTION track_order_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM track_order_status(
      NEW.id,
      NEW.status,
      auth.uid(),
      'Status changed via trigger'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_tracking
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION track_order_status_changes();