-- Create authenticated role if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END
$$;

/*
  # Task Templates and Metrics Migration

  1. New Tables
    - task_templates: Reusable task templates with predefined settings
    - task_metrics: Track task performance and completion metrics
    - task_checklists: Checklist items for tasks
    - task_time_logs: Time tracking for tasks

  2. Security
    - Enable RLS on all tables
    - Add policies for access control
    - Add functions for managing tasks and metrics
*/

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

-- Create task_metrics table
CREATE TABLE task_metrics (
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

-- Create indexes
CREATE INDEX idx_task_templates_category ON task_templates(category);
CREATE INDEX idx_task_templates_created_by ON task_templates(created_by);
CREATE INDEX idx_task_metrics_task_id ON task_metrics(task_id);

-- Enable RLS
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view task templates"
  ON task_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage task templates"
  ON task_templates FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view task metrics"
  ON task_metrics FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_id = task_metrics.task_id
      AND employee_id = auth.uid()
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage task metrics"
  ON task_metrics FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add triggers
CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_metrics_updated_at
  BEFORE UPDATE ON task_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create functions
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
  v_employee uuid;
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

      -- Create notification
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
        'You have been assigned a new task: ' || v_template.name,
        '/tasks/' || v_task_id,
        jsonb_build_object(
          'taskId', v_task_id,
          'priority', v_template.priority
        )
      );
    END LOOP;
  END IF;

  RETURN v_task_id;
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

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