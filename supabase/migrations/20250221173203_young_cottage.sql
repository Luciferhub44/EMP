/*
  # Employee Task Management System

  1. New Tables
    - tasks: Store employee tasks
    - task_assignments: Track task assignments
    - task_dependencies: Track task dependencies
    - task_comments: Store task comments
    
  2. Functions
    - create_task: Create new tasks
    - assign_task: Assign tasks to employees
    - update_task_status: Update task status
    - add_task_comment: Add comments to tasks
    
  3. Security
    - RLS policies for all tables
    - Function security settings
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  estimated_hours numeric,
  actual_hours numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_assignments table
CREATE TABLE IF NOT EXISTS task_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(task_id, employee_id, status)
);

-- Create task_dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on uuid REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, depends_on)
);

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees can view assigned tasks"
  ON tasks FOR SELECT TO authenticated
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

CREATE POLICY "Employees can view own assignments"
  ON task_assignments FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage assignments"
  ON task_assignments FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can view task dependencies"
  ON task_dependencies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage dependencies"
  ON task_dependencies FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can view task comments"
  ON task_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can add comments"
  ON task_comments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own comments"
  ON task_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Create create_task function
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
      PERFORM create_notification(
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

-- Create update_task_status function
CREATE OR REPLACE FUNCTION update_task_status(
  p_task_id uuid,
  p_status text,
  p_actual_hours numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task tasks%ROWTYPE;
BEGIN
  -- Get task details
  SELECT * INTO v_task
  FROM tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Update task status
  UPDATE tasks SET
    status = p_status,
    actual_hours = COALESCE(p_actual_hours, actual_hours),
    updated_at = now()
  WHERE id = p_task_id;

  -- Update assignment status if task is completed
  IF p_status = 'completed' THEN
    UPDATE task_assignments SET
      status = 'completed',
      notes = COALESCE(p_notes, notes),
      updated_at = now()
    WHERE task_id = p_task_id
    AND status = 'active';

    -- Notify task creator
    IF v_task.created_by IS NOT NULL THEN
      PERFORM create_notification(
        v_task.created_by,
        'system',
        'Task Completed',
        'Task "' || v_task.title || '" has been completed',
        '/tasks/' || p_task_id,
        jsonb_build_object(
          'taskId', p_task_id,
          'status', p_status
        )
      );
    END IF;
  END IF;
END;
$$;

-- Create add_task_comment function
CREATE OR REPLACE FUNCTION add_task_comment(
  p_task_id uuid,
  p_user_id uuid,
  p_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comment_id uuid;
  v_task tasks%ROWTYPE;
BEGIN
  -- Get task details
  SELECT * INTO v_task
  FROM tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Create comment
  INSERT INTO task_comments (
    task_id,
    user_id,
    content
  ) VALUES (
    p_task_id,
    p_user_id,
    p_content
  ) RETURNING id INTO v_comment_id;

  -- Notify task creator and assignees
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    metadata
  )
  SELECT
    u.id,
    'system',
    'New Task Comment',
    'New comment on task "' || v_task.title || '"',
    '/tasks/' || p_task_id,
    jsonb_build_object(
      'taskId', p_task_id,
      'commentId', v_comment_id
    )
  FROM (
    SELECT DISTINCT id
    FROM users
    WHERE id = v_task.created_by
    OR id IN (
      SELECT employee_id
      FROM task_assignments
      WHERE task_id = p_task_id
    )
  ) u
  WHERE u.id != p_user_id;

  RETURN v_comment_id;
END;
$$;

-- Add triggers for updated_at
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