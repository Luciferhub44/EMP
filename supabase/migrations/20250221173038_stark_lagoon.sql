/*
  # Notifications and Messaging System

  1. New Tables
    - notifications: Store user notifications
    - messages: Store internal messages
    - message_threads: Group messages into conversations
    - message_participants: Track thread participants
    
  2. Functions
    - create_notification: Create user notifications
    - mark_notification_read: Mark notifications as read
    - create_message_thread: Create new message threads
    - send_message: Send messages in threads
    
  3. Security
    - RLS policies for all tables
    - Function security settings
*/

-- Create notifications table
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

-- Create message_threads table
CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject text NOT NULL,
  department text NOT NULL CHECK (department IN ('support', 'fulfillment', 'billing', 'management')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message_participants table
CREATE TABLE IF NOT EXISTS message_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('creator', 'participant', 'admin')),
  last_read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view threads they participate in"
  ON message_threads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM message_participants
      WHERE thread_id = id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages in their threads"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM message_participants
      WHERE thread_id = messages.thread_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their threads"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM message_participants
      WHERE thread_id = messages.thread_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own thread participation"
  ON message_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Create create_notification function
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

-- Create mark_notification_read function
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

-- Create create_message_thread function
CREATE OR REPLACE FUNCTION create_message_thread(
  p_subject text,
  p_department text,
  p_creator_id uuid,
  p_initial_message text,
  p_participants uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_thread_id uuid;
  v_participant uuid;
BEGIN
  -- Create thread
  INSERT INTO message_threads (subject, department)
  VALUES (p_subject, p_department)
  RETURNING id INTO v_thread_id;

  -- Add creator as participant
  INSERT INTO message_participants (thread_id, user_id, role)
  VALUES (v_thread_id, p_creator_id, 'creator');

  -- Add other participants
  FOREACH v_participant IN ARRAY p_participants
  LOOP
    INSERT INTO message_participants (thread_id, user_id, role)
    VALUES (v_thread_id, v_participant, 'participant');
  END LOOP;

  -- Add initial message
  IF p_initial_message IS NOT NULL THEN
    INSERT INTO messages (thread_id, sender_id, content)
    VALUES (v_thread_id, p_creator_id, p_initial_message);
  END IF;

  RETURN v_thread_id;
END;
$$;

-- Create send_message function
CREATE OR REPLACE FUNCTION send_message(
  p_thread_id uuid,
  p_sender_id uuid,
  p_content text,
  p_attachments jsonb DEFAULT '[]'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id uuid;
BEGIN
  -- Verify sender is a participant
  IF NOT EXISTS (
    SELECT 1 FROM message_participants
    WHERE thread_id = p_thread_id
    AND user_id = p_sender_id
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this thread';
  END IF;

  -- Create message
  INSERT INTO messages (
    thread_id,
    sender_id,
    content,
    attachments
  ) VALUES (
    p_thread_id,
    p_sender_id,
    p_content,
    p_attachments
  ) RETURNING id INTO v_message_id;

  -- Update thread
  UPDATE message_threads SET
    updated_at = now()
  WHERE id = p_thread_id;

  -- Create notifications for other participants
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    metadata
  )
  SELECT
    mp.user_id,
    'chat',
    'New Message',
    p_content,
    '/messages/' || p_thread_id,
    jsonb_build_object(
      'threadId', p_thread_id,
      'messageId', v_message_id,
      'senderId', p_sender_id
    )
  FROM message_participants mp
  WHERE mp.thread_id = p_thread_id
  AND mp.user_id != p_sender_id;

  RETURN v_message_id;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_threads_updated_at
  BEFORE UPDATE ON message_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_participants_updated_at
  BEFORE UPDATE ON message_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();