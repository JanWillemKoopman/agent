CREATE TABLE public.tracked_products (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tracked_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rows only"
  ON public.tracked_products
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX tracked_products_user_idx
  ON public.tracked_products (user_id, created_at DESC);
