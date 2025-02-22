/*
  # Fix Context Errors Migration

  1. New Tables
    - `settings` - Store user settings and preferences
    - `audit_logs` - Track system events and changes
    - `system_settings` - Global system configuration
    - `user_sessions` - Track active user sessions

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Add audit logging triggers

  3. Functions
    - Add settings management functions
    - Add session management functions
    - Add audit logging functions
*/

-- Create settings table
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

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  ip_address text,
  user_agent text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
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

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Create functions
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

CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id uuid,
  p_action text,
  p_details jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_action,
    p_details,
    p_ip_address,
    p_user_agent
  );
END;
$$;

-- Add triggers
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_event(
      auth.uid(),
      TG_TABLE_NAME || '_update',
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'id', NEW.id,
        'old_data', to_jsonb(OLD),
        'new_data', to_jsonb(NEW)
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      auth.uid(),
      TG_TABLE_NAME || '_delete',
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'id', OLD.id,
        'data', to_jsonb(OLD)
      )
    );
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_settings_changes
  AFTER UPDATE OR DELETE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION audit_changes();

CREATE TRIGGER audit_system_settings_changes
  AFTER UPDATE OR DELETE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION audit_changes();

-- Add default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('email_notifications', '{"enabled":true,"from":"noreply@example.com"}', 'Email notification settings'),
  ('security', '{"session_timeout":3600,"max_login_attempts":5}', 'Security settings'),
  ('maintenance', '{"enabled":false,"message":""}', 'Maintenance mode settings')
ON CONFLICT (key) DO NOTHING;