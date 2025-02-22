-- Create authenticated role if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END
$$;
/*
  # Task Notifications and Alerts Migration

  1. New Tables
    - task_notifications: Notifications specific to tasks
    - task_alerts: System alerts for task-related events
    - task_subscriptions: User subscriptions to task notifications

  2. Security
    - Enable RLS on all tables
    - Add policies for access control
    - Add functions for notification management
*/

-- Create task_notifications table
CREATE TABLE task_notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('assignment', 'comment', 'status_change', 'due_soon', 'overdue')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_alerts table
CREATE TABLE task_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('due_date', 'dependency', 'blocker', 'progress')),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_subscriptions table
CREATE TABLE task_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  notification_types text[] NOT NULL DEFAULT '{assignment,comment,status_change}'::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Create indexes
CREATE INDEX idx_task_notifications_task_id ON task_notifications(task_id);
CREATE INDEX idx_task_notifications_user_id ON task_notifications(user_id);
CREATE INDEX idx_task_notifications_type ON task_notifications(type);
CREATE INDEX idx_task_alerts_task_id ON task_alerts(task_id);
CREATE INDEX idx_task_alerts_type ON task_alerts(type);
CREATE INDEX idx_task_alerts_severity ON task_alerts(severity);
CREATE INDEX idx_task_subscriptions_task_id ON task_subscriptions(task_id);
CREATE INDEX idx_task_subscriptions_user_id ON task_subscriptions(user_id);

-- Enable RLS
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own task notifications"
  ON task_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own task notifications"
  ON task_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view task alerts"
  ON task_alerts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_id = task_alerts.task_id
      AND employee_id = auth.uid()
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage task alerts"
  ON task_alerts FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can manage own task subscriptions"
  ON task_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Add triggers
CREATE TRIGGER update_task_notifications_updated_at
  BEFORE UPDATE ON task_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_alerts_updated_at
  BEFORE UPDATE ON task_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_subscriptions_updated_at
  BEFORE UPDATE ON task_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create functions
CREATE OR REPLACE FUNCTION notify_task_subscribers(
  p_task_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO task_notifications (
    task_id,
    user_id,
    type,
    title,
    message,
    metadata
  )
  SELECT
    p_task_id,
    user_id,
    p_type,
    p_title,
    p_message,
    p_metadata
  FROM task_subscriptions
  WHERE task_id = p_task_id
  AND p_type = ANY(notification_types);
END;
$$;

CREATE OR REPLACE FUNCTION create_task_alert(
  p_task_id uuid,
  p_type text,
  p_severity text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert_id uuid;
BEGIN
  INSERT INTO task_alerts (
    task_id,
    type,
    severity,
    message,
    metadata
  ) VALUES (
    p_task_id,
    p_type,
    p_severity,
    p_message,
    p_metadata
  ) RETURNING id INTO v_alert_id;

  -- Notify task assignees
  INSERT INTO task_notifications (
    task_id,
    user_id,
    type,
    title,
    message,
    metadata
  )
  SELECT
    p_task_id,
    employee_id,
    'alert',
    CASE p_severity
      WHEN 'critical' THEN 'Critical Task Alert'
      WHEN 'warning' THEN 'Task Warning'
      ELSE 'Task Info'
    END,
    p_message,
    jsonb_build_object(
      'alertId', v_alert_id,
      'type', p_type,
      'severity', p_severity
    )
  FROM task_assignments
  WHERE task_id = p_task_id
  AND status = 'active';

  RETURN v_alert_id;
END;
$$;

CREATE OR REPLACE FUNCTION resolve_task_alert(
  p_alert_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE task_alerts SET
    resolved = true,
    resolved_by = p_user_id,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_alert_id
  AND NOT resolved
  AND EXISTS (
    SELECT 1 FROM tasks t
    INNER JOIN task_assignments ta ON ta.task_id = t.id
    WHERE t.id = task_alerts.task_id
    AND (ta.employee_id = p_user_id OR p_user_id IN (
      SELECT id FROM users WHERE role = 'admin'
    ))
  );
END;
$$;

-- Create trigger function for task status changes
CREATE OR REPLACE FUNCTION notify_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    PERFORM notify_task_subscribers(
      NEW.id,
      'status_change',
      'Task Status Updated',
      'Task status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object(
        'oldStatus', OLD.status,
        'newStatus', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task status changes
CREATE TRIGGER task_status_notification
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_status_change();

-- Create trigger function for due date alerts
CREATE OR REPLACE FUNCTION check_task_due_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if due date is within 24 hours
  IF NEW.due_date IS NOT NULL 
     AND NEW.due_date - NOW() <= interval '24 hours'
     AND NEW.due_date > NOW()
     AND NEW.status NOT IN ('completed', 'cancelled') THEN
    PERFORM create_task_alert(
      NEW.id,
      'due_date',
      'warning',
      'Task is due within 24 hours',
      jsonb_build_object('dueDate', NEW.due_date)
    );
  END IF;

  -- Check if task is overdue
  IF NEW.due_date IS NOT NULL 
     AND NEW.due_date < NOW()
     AND NEW.status NOT IN ('completed', 'cancelled') THEN
    PERFORM create_task_alert(
      NEW.id,
      'due_date',
      'critical',
      'Task is overdue',
      jsonb_build_object('dueDate', NEW.due_date)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for due date alerts
CREATE TRIGGER task_due_date_alert
  AFTER INSERT OR UPDATE OF due_date ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION check_task_due_date();