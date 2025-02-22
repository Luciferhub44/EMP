/*
  # Fix Settings and Notifications Tables

  1. Changes
    - Drop and recreate settings and notifications tables
    - Add proper indexes and constraints
    - Create required functions
    - Set up RLS policies

  2. Security
    - Enable RLS
    - Add proper access policies
    - Ensure data isolation
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Create settings table
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  notifications jsonb NOT NULL DEFAULT '{
    "email": true,
    "orders": true,
    "chat": true
  }',
  appearance jsonb NOT NULL DEFAULT '{
    "theme": "system",
    "compactMode": false
  }',
  security jsonb NOT NULL DEFAULT '{
    "twoFactorEnabled": false
  }',
  profile jsonb NOT NULL DEFAULT '{
    "name": "",
    "email": "",
    "company": ""
  }',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create notifications table
CREATE TABLE notifications (
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

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_settings_user_id ON settings(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Create RLS policies for settings
CREATE POLICY "Users can view own settings"
  ON settings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create RLS policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create function to get user settings
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings jsonb;
BEGIN
  -- Get existing settings or create default
  INSERT INTO settings (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT jsonb_build_object(
    'notifications', notifications,
    'appearance', appearance,
    'security', security,
    'profile', profile
  )
  INTO v_settings
  FROM settings
  WHERE user_id = p_user_id;

  RETURN v_settings;
END;
$$;

-- Create function to update user settings
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

-- Create function to create notification
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
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_action_url,
    p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();