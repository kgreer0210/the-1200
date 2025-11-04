-- Enable replication for habit_sessions table
-- This allows real-time updates when sessions are inserted/updated/deleted
DO $$
BEGIN
  -- Check if the table exists in the publication, if not add it
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'habit_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE habit_sessions;
  END IF;
END $$;