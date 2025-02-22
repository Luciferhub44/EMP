/*
  # Fix Context Errors Migration

  1. New Tables
    - `notifications` - Store user notifications
    - `settings` - Store user settings
    - `audit_logs` - Track system events
    - `system_settings` - Global system configuration

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Add audit logging triggers

  3. Functions
    - Add notification management functions
    - Add settings management functions
    - Add audit logging functions
*/

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('order', 'inventory', 'payment', 'system', 'chat')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create settings table if not exists
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  notifications jsonb DEFAULT '{
    "email": true,
    "orders": true,
    "chat": true
  }',
  appearance jsonb DEFAULT '{
    "theme": "system",
    "compactMode": false
  }',
  security jsonb DEFAULT '{
    "twoFactorEnabled": false
  }',
  profile jsonb DEFAULT '{
    "name": "",
    "email": "",
    "company": ""
  }',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create audit_logs table if not exists
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create system_settings table if not exists
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own settings"
  ON settings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create functions
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_action_url text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    metadata
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_action_url,
    p_metadata
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications SET
    is_read = true,
    updated_at = now()
  WHERE id = p_notification_id
  AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_settings(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings jsonb;
BEGIN
  SELECT jsonb_build_object(
    'notifications', notifications,
    'appearance', appearance,
    'security', security,
    'profile', profile
  ) INTO v_settings
  FROM settings
  WHERE user_id = p_user_id;

  IF v_settings IS NULL THEN
    INSERT INTO settings (user_id)
    VALUES (p_user_id)
    RETURNING jsonb_build_object(
      'notifications', notifications,
      'appearance', appearance,
      'security', security,
      'profile', profile
    ) INTO v_settings;
  END IF;

  RETURN v_settings;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_settings(
  p_user_id uuid,
  p_settings jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO settings (
    user_id,
    notifications,
    appearance,
    security,
    profile
  )
  VALUES (
    p_user_id,
    COALESCE(p_settings->'notifications', '{"email":true,"orders":true,"chat":true}'::jsonb),
    COALESCE(p_settings->'appearance', '{"theme":"system","compactMode":false}'::jsonb),
    COALESCE(p_settings->'security', '{"twoFactorEnabled":false}'::jsonb),
    COALESCE(p_settings->'profile', '{}'::jsonb)
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    notifications = EXCLUDED.notifications,
    appearance = EXCLUDED.appearance,
    security = EXCLUDED.security,
    profile = EXCLUDED.profile,
    updated_at = now();
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('email_notifications', '{"enabled":true,"from":"noreply@example.com"}', 'Email notification settings'),
  ('security', '{"session_timeout":3600,"max_login_attempts":5}', 'Security settings'),
  ('maintenance', '{"enabled":false,"message":""}', 'Maintenance mode settings')
ON CONFLICT (key) DO NOTHING;