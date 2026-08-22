ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2);
COMMENT ON COLUMN public.markets.review_count IS 'Aggregated public review count across external sources';
COMMENT ON COLUMN public.markets.rating_avg IS 'Weighted average rating on a 5-point scale from external sources';
