-- Dagelijkse cache van supermarktaanbiedingen, gedeeld over alle gebruikers.
-- Per (winkel, dag) worden de aanbiedingen één keer gescrapet en hergebruikt.

-- Gecachte aanbiedingen: één rij per deal per winkel per dag. Kolommen spiegelen
-- het Deal-type in src/lib/types.ts.
CREATE TABLE public.daily_deals (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store            text        NOT NULL,
  deal_date        date        NOT NULL,
  product_name     text        NOT NULL,
  deal_type        text        NOT NULL,
  min_quantity     int         NOT NULL DEFAULT 1,
  bundle_price     numeric,
  deal_price       numeric     NOT NULL,
  original_price   numeric,
  deal_description text,
  supermarket      text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX daily_deals_store_date_idx
  ON public.daily_deals (store, deal_date);

-- Coördinatie / anti-dubbelwerk: één rij per winkel per dag. De unieke sleutel
-- op (store, deal_date) maakt het claimen van een scrape atomair — wie de rij als
-- eerste insert wint en voert de scrape uit; een conflict betekent dat een ander
-- de scrape al doet (of al gedaan heeft).
CREATE TABLE public.deal_scrape_runs (
  store       text        NOT NULL,
  deal_date   date        NOT NULL,
  status      text        NOT NULL DEFAULT 'running',  -- 'running' | 'done' | 'failed'
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  PRIMARY KEY (store, deal_date)
);

-- RLS aan op beide tabellen, zonder policies: directe toegang via de anon/auth
-- client wordt geweigerd. Alle lees- en schrijfacties lopen server-side via de
-- service-role key (die RLS omzeilt) in de API-routes.
ALTER TABLE public.daily_deals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_scrape_runs ENABLE ROW LEVEL SECURITY;
