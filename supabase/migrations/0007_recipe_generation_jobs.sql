-- Achtergrond-jobs voor het genereren van recepten.
--
-- Reden: de pipeline liep voorheen volledig binnen de SSE-request. Zodra een
-- mobiele browser de verbinding verbrak (scherm op slot, app naar de achtergrond)
-- ging het resultaat verloren en kreeg de gebruiker "Verbinding verbroken".
-- Nu draait de pipeline server-side los van de client en wordt de voortgang +
-- het eindresultaat hier vastgelegd. De client pollt deze tabel en pikt het
-- resultaat op zodra hij terugkomt — ongeacht of de verbinding tussendoor wegviel.
CREATE TABLE public.recipe_generation_jobs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'running',  -- 'running' | 'done' | 'error'
  step         int         NOT NULL DEFAULT 0,
  -- Volledige lijst statusregels ({step, message}) zodat de UI de hele
  -- voortgang kan tonen, ook als hij pas later (bij terugkomst) gaat pollen.
  status_lines jsonb       NOT NULL DEFAULT '[]'::jsonb,
  result_json  jsonb,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recipe_generation_jobs_user_idx
  ON public.recipe_generation_jobs (user_id, created_at DESC);

-- RLS aan: de gebruiker mag uitsluitend zijn eigen jobs lezen (de client pollt
-- met zijn JWT). Schrijven (insert/update vanuit de pipeline) gebeurt server-side
-- via de service-role key, die RLS omzeilt — vandaar geen insert/update-policy.
ALTER TABLE public.recipe_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_generation_jobs_select_own"
  ON public.recipe_generation_jobs FOR SELECT
  USING (auth.uid() = user_id);
