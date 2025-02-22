-- Create authenticated role if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END
$$;
-- Create message_threads table
CREATE TABLE message_threads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  department text NOT NULL CHECK (department IN ('support', 'fulfillment', 'billing', 'management')),
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message_participants table
CREATE TABLE message_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('creator', 'participant', 'admin')),
  last_read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Create indexes
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_message_participants_thread_id ON message_participants(thread_id);
CREATE INDEX idx_message_participants_user_id ON message_participants(user_id);

-- Enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Add triggers
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