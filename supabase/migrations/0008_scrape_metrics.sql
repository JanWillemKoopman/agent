-- Voeg metrics-kolommen toe aan deal_scrape_runs zodat we per scrape kunnen
-- bijhouden hoe volledig de dataset was. Na een paar weken zijn gemiddeldes
-- per winkel zichtbaar en kan de kwaliteit van de Forager worden geëvalueerd.

ALTER TABLE public.deal_scrape_runs
  ADD COLUMN IF NOT EXISTS products_found    int,
  ADD COLUMN IF NOT EXISTS categories_found  int,
  ADD COLUMN IF NOT EXISTS confidence_score  int,
  ADD COLUMN IF NOT EXISTS ai_calls_made     int,
  ADD COLUMN IF NOT EXISTS duration_ms       int,
  ADD COLUMN IF NOT EXISTS duplicates_removed int;
