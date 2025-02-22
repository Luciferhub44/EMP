/*
  # Fix Policy Conflicts Migration

  1. Changes
    - Drop conflicting policies
    - Recreate policies with proper names and conditions
    - Add missing indexes for performance

  2. Security
    - Maintain RLS security
    - Ensure proper access control
*/

-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
DROP POLICY IF EXISTS "Users can update own settings" ON settings;

-- Recreate policies with unique names
CREATE POLICY "notifications_select_policy"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_policy"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "settings_select_policy"
  ON settings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "settings_update_policy"
  ON settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Add missing RLS policies for INSERT
CREATE POLICY "notifications_insert_policy"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "settings_insert_policy"
  ON settings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Add missing RLS policies for DELETE
CREATE POLICY "notifications_delete_policy"
  ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "settings_delete_policy"
  ON settings FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');