-- Stock notification subscriptions for back-in-stock emails
CREATE TABLE IF NOT EXISTS public.stock_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES shop.products(id) ON DELETE CASCADE,
  email text NOT NULL,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, email)
);

ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_notifications_public_insert" ON public.stock_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "stock_notifications_public_select" ON public.stock_notifications
  FOR SELECT USING (true);
