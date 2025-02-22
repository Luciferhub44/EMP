-- Create authenticated role if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END
$$;
-- Create tasks table
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'cancelled')
  ),
  due_date timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  estimated_hours numeric,
  actual_hours numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_assignments table
CREATE TABLE task_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'completed', 'cancelled')
  ),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(task_id, employee_id, status)
);

-- Create task_dependencies table
CREATE TABLE task_dependencies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, depends_on)
);

-- Create task_comments table
CREATE TABLE task_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content text NOT NULL,
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

-- Create task_metrics table
CREATE TABLE task_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completion_time interval,
  estimated_vs_actual numeric,
  on_time_completion boolean,
  complexity_score integer CHECK (complexity_score BETWEEN 1 AND 5),
  quality_score integer CHECK (quality_score BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_templates table
CREATE TABLE task_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_hours numeric,
  checklist jsonb DEFAULT '[]',
  dependencies jsonb DEFAULT '[]',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_order_id ON tasks(order_id);
CREATE INDEX idx_task_assignments_employee_id ON task_assignments(employee_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_time_logs_task_id ON task_time_logs(task_id);
CREATE INDEX idx_task_time_logs_user_id ON task_time_logs(user_id);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view assigned tasks"
  ON tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_id = id
      AND employee_id = auth.uid()
    ) OR created_by = auth.uid() OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can update assigned tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_id = id
      AND employee_id = auth.uid()
    ) OR created_by = auth.uid() OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage tasks"
  ON tasks FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view own assignments"
  ON task_assignments FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view task dependencies"
  ON task_dependencies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE (task_id = task_dependencies.task_id OR task_id = task_dependencies.depends_on)
      AND employee_id = auth.uid()
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can view task comments"
  ON task_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_id = task_comments.task_id
      AND employee_id = auth.uid()
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can add comments"
  ON task_comments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_id = task_comments.task_id
      AND employee_id = auth.uid()
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can manage own time logs"
  ON task_time_logs FOR ALL TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view task metrics"
  ON task_metrics FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_id = task_metrics.task_id
      AND employee_id = auth.uid()
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage task templates"
  ON task_templates FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view task templates"
  ON task_templates FOR SELECT TO authenticated
  USING (true);

-- Add triggers
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_assignments_updated_at
  BEFORE UPDATE ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_time_logs_updated_at
  BEFORE UPDATE ON task_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_metrics_updated_at
  BEFORE UPDATE ON task_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create functions
CREATE OR REPLACE FUNCTION create_task(
  p_title text,
  p_description text,
  p_priority text,
  p_due_date timestamptz,
  p_created_by uuid,
  p_order_id uuid DEFAULT NULL,
  p_estimated_hours numeric DEFAULT NULL,
  p_assigned_to uuid[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id uuid;
  v_employee uuid;
BEGIN
  -- Create task
  INSERT INTO tasks (
    title,
    description,
    priority,
    due_date,
    created_by,
    order_id,
    estimated_hours
  ) VALUES (
    p_title,
    p_description,
    p_priority,
    p_due_date,
    p_created_by,
    p_order_id,
    p_estimated_hours
  ) RETURNING id INTO v_task_id;

  -- Assign task if employees specified
  IF p_assigned_to IS NOT NULL THEN
    FOREACH v_employee IN ARRAY p_assigned_to
    LOOP
      INSERT INTO task_assignments (
        task_id,
        employee_id,
        assigned_by
      ) VALUES (
        v_task_id,
        v_employee,
        p_created_by
      );

      -- Create notification for assigned employee
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        action_url,
        metadata
      ) VALUES (
        v_employee,
        'system',
        'New Task Assigned',
        'You have been assigned a new task: ' || p_title,
        '/tasks/' || v_task_id,
        jsonb_build_object(
          'taskId', v_task_id,
          'priority', p_priority
        )
      );
    END LOOP;
  END IF;

  RETURN v_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION log_task_time(
  p_task_id uuid,
  p_user_id uuid,
  p_start_time timestamptz,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Create time log
  INSERT INTO task_time_logs (
    task_id,
    user_id,
    start_time,
    description
  ) VALUES (
    p_task_id,
    p_user_id,
    p_start_time,
    p_description
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION end_task_time_log(
  p_log_id uuid,
  p_end_time timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update time log
  UPDATE task_time_logs SET
    end_time = p_end_time,
    updated_at = NOW()
  WHERE id = p_log_id;

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

CREATE OR REPLACE FUNCTION calculate_task_metrics(
  p_task_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_completion_time interval;
  v_estimated_vs_actual numeric;
  v_on_time boolean;
BEGIN
  -- Get task details
  SELECT * INTO v_task
  FROM tasks
  WHERE id = p_task_id;

  -- Calculate metrics
  SELECT
    MAX(end_time) - MIN(start_time),
    CASE
      WHEN v_task.estimated_hours > 0 AND v_task.actual_hours > 0
      THEN v_task.actual_hours / v_task.estimated_hours
      ELSE NULL
    END,
    CASE
      WHEN v_task.due_date IS NOT NULL AND v_task.status = 'completed'
      THEN v_task.updated_at <= v_task.due_date
      ELSE NULL
    END
  INTO
    v_completion_time,
    v_estimated_vs_actual,
    v_on_time
  FROM task_time_logs
  WHERE task_id = p_task_id;

  -- Update metrics
  INSERT INTO task_metrics (
    task_id,
    completion_time,
    estimated_vs_actual,
    on_time_completion
  ) VALUES (
    p_task_id,
    v_completion_time,
    v_estimated_vs_actual,
    v_on_time
  )
  ON CONFLICT (task_id) DO UPDATE
  SET
    completion_time = EXCLUDED.completion_time,
    estimated_vs_actual = EXCLUDED.estimated_vs_actual,
    on_time_completion = EXCLUDED.on_time_completion,
    updated_at = NOW();
END;
$$;