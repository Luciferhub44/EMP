/*
  # Task Management System

  1. New Tables
    - task_metrics: Track task completion metrics
    - task_templates: Store reusable task templates
    - task_checklists: Store task completion checklists
    - task_time_logs: Track time spent on tasks
    
  2. Functions
    - create_task_from_template: Create tasks from templates
    - log_task_time: Log time spent on tasks
    - calculate_task_metrics: Calculate task performance metrics
    
  3. Security
    - RLS policies for all tables
    - Function security settings
*/

-- Create task_metrics table
CREATE TABLE IF NOT EXISTS task_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  completion_time interval,
  estimated_vs_actual numeric,
  on_time_completion boolean,
  complexity_score integer CHECK (complexity_score BETWEEN 1 AND 5),
  quality_score integer CHECK (quality_score BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_templates table
CREATE TABLE IF NOT EXISTS task_templates (
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

-- Create task_checklists table
CREATE TABLE IF NOT EXISTS task_checklists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  item text NOT NULL,
  completed boolean DEFAULT false,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_time_logs table
CREATE TABLE IF NOT EXISTS task_time_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration interval,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view task metrics"
  ON task_metrics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage task metrics"
  ON task_metrics FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can view task templates"
  ON task_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage task templates"
  ON task_templates FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can view task checklists"
  ON task_checklists FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Assigned users can update checklists"
  ON task_checklists FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.task_id = task_checklists.task_id
      AND ta.employee_id = auth.uid()
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Anyone can view time logs"
  ON task_time_logs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own time logs"
  ON task_time_logs FOR ALL TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Create create_task_from_template function
CREATE OR REPLACE FUNCTION create_task_from_template(
  p_template_id uuid,
  p_created_by uuid,
  p_order_id uuid DEFAULT NULL,
  p_assigned_to uuid[] DEFAULT NULL,
  p_due_date timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template task_templates%ROWTYPE;
  v_task_id uuid;
  v_checklist_item jsonb;
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM task_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

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
    v_template.name,
    v_template.description,
    v_template.priority,
    p_due_date,
    p_created_by,
    p_order_id,
    v_template.estimated_hours
  ) RETURNING id INTO v_task_id;

  -- Create checklist items
  FOR v_checklist_item IN SELECT * FROM jsonb_array_elements(v_template.checklist)
  LOOP
    INSERT INTO task_checklists (
      task_id,
      item
    ) VALUES (
      v_task_id,
      v_checklist_item->>'item'
    );
  END LOOP;

  -- Assign task if employees specified
  IF p_assigned_to IS NOT NULL THEN
    INSERT INTO task_assignments (
      task_id,
      employee_id,
      assigned_by
    )
    SELECT
      v_task_id,
      employee_id,
      p_created_by
    FROM unnest(p_assigned_to) AS employee_id;

    -- Create notifications
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      metadata
    )
    SELECT
      employee_id,
      'system',
      'New Task Assigned',
      'You have been assigned a new task: ' || v_template.name,
      '/tasks/' || v_task_id,
      jsonb_build_object(
        'taskId', v_task_id,
        'priority', v_template.priority
      )
    FROM unnest(p_assigned_to) AS employee_id;
  END IF;

  RETURN v_task_id;
END;
$$;

-- Create log_task_time function
CREATE OR REPLACE FUNCTION log_task_time(
  p_task_id uuid,
  p_user_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_duration interval;
BEGIN
  -- Calculate duration if end time provided
  IF p_end_time IS NOT NULL THEN
    v_duration := p_end_time - p_start_time;
  END IF;

  -- Create time log
  INSERT INTO task_time_logs (
    task_id,
    user_id,
    start_time,
    end_time,
    duration,
    description
  ) VALUES (
    p_task_id,
    p_user_id,
    p_start_time,
    p_end_time,
    v_duration,
    p_description
  ) RETURNING id INTO v_log_id;

  -- Update task actual hours if log is complete
  IF p_end_time IS NOT NULL THEN
    UPDATE tasks SET
      actual_hours = COALESCE(actual_hours, 0) + EXTRACT(epoch FROM v_duration) / 3600,
      updated_at = now()
    WHERE id = p_task_id;
  END IF;

  RETURN v_log_id;
END;
$$;

-- Create calculate_task_metrics function
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Calculate metrics
  SELECT
    MAX(end_time) - MIN(start_time)
  INTO v_completion_time
  FROM task_time_logs
  WHERE task_id = p_task_id;

  IF v_task.estimated_hours IS NOT NULL AND v_task.actual_hours IS NOT NULL THEN
    v_estimated_vs_actual := v_task.actual_hours / v_task.estimated_hours;
  END IF;

  IF v_task.due_date IS NOT NULL AND v_task.status = 'completed' THEN
    v_on_time := v_task.updated_at <= v_task.due_date;
  END IF;

  -- Update or insert metrics
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
  ON CONFLICT (task_id)
  DO UPDATE SET
    completion_time = EXCLUDED.completion_time,
    estimated_vs_actual = EXCLUDED.estimated_vs_actual,
    on_time_completion = EXCLUDED.on_time_completion,
    updated_at = now();
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_task_metrics_updated_at
  BEFORE UPDATE ON task_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_checklists_updated_at
  BEFORE UPDATE ON task_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_time_logs_updated_at
  BEFORE UPDATE ON task_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to calculate metrics on task completion
CREATE OR REPLACE FUNCTION calculate_metrics_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM calculate_task_metrics(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_completion_metrics
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION calculate_metrics_on_completion();