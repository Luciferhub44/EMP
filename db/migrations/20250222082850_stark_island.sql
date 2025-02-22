-- Create authenticated role if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
-- Create task_checklists table
CREATE TABLE task_checklists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  item text NOT NULL,
  completed boolean DEFAULT false,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_time_logs table
CREATE TABLE task_time_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration interval GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL THEN end_time - start_time
      ELSE NULL
    END
  ) STORED,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_task_checklists_task_id ON task_checklists(task_id);
CREATE INDEX idx_task_checklists_completed ON task_checklists(completed);
CREATE INDEX idx_task_time_logs_task_id ON task_time_logs(task_id);
CREATE INDEX idx_task_time_logs_user_id ON task_time_logs(user_id);
CREATE INDEX idx_task_time_logs_start_time ON task_time_logs(start_time);

-- Enable RLS
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view task checklists"
  ON task_checklists FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_id = task_checklists.task_id
      AND employee_id = auth.uid()
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can update assigned task checklists"
  ON task_checklists FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_id = task_checklists.task_id
      AND employee_id = auth.uid()
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can manage own time logs"
  ON task_time_logs FOR ALL TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Add triggers
CREATE TRIGGER update_task_checklists_updated_at
  BEFORE UPDATE ON task_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_time_logs_updated_at
  BEFORE UPDATE ON task_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create functions
CREATE OR REPLACE FUNCTION complete_checklist_item(
  p_item_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE task_checklists SET
    completed = true,
    completed_by = p_user_id,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_item_id
  AND EXISTS (
    SELECT 1 FROM task_assignments
    WHERE task_id = task_checklists.task_id
    AND employee_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION start_time_log(
  p_task_id uuid,
  p_user_id uuid,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Verify user is assigned to task
  IF NOT EXISTS (
    SELECT 1 FROM task_assignments
    WHERE task_id = p_task_id
    AND employee_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not assigned to this task';
  END IF;

  -- Create time log
  INSERT INTO task_time_logs (
    task_id,
    user_id,
    start_time,
    description
  ) VALUES (
    p_task_id,
    p_user_id,
    NOW(),
    p_description
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION end_time_log(
  p_log_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update time log
  UPDATE task_time_logs SET
    end_time = NOW(),
    updated_at = NOW()
  WHERE id = p_log_id
  AND user_id = p_user_id;

  -- Update task actual hours
  UPDATE tasks t SET
    actual_hours = COALESCE(actual_hours, 0) + 
      EXTRACT(epoch FROM (
        SELECT duration FROM task_time_logs
        WHERE id = p_log_id
      )) / 3600,
    updated_at = NOW()
  WHERE id = (
    SELECT task_id FROM task_time_logs
    WHERE id = p_log_id
  );
END;
$$;