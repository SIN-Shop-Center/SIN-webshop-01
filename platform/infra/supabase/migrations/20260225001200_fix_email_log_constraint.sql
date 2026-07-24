-- Fix missing unique constraint for worker ON CONFLICT clauses
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'email_log_order_id_email_type_key'
  ) THEN
    ALTER TABLE public.email_log ADD CONSTRAINT email_log_order_id_email_type_key UNIQUE (order_id, email_type);
  END IF;
END $$;
