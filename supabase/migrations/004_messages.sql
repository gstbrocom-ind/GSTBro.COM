CREATE TABLE IF NOT EXISTS client_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_client_messages_client ON client_messages(client_user_id, created_at DESC);
