# Technisch Overdrachtsdocument — FamApp Recepten-PWA

**Versie:** 1.0  
**Datum:** 30 juni 2026  
**Opgesteld door:** Senior Software Architect (analyse van de volledige codebase)  
**Bestemd voor:** Inkomend IT-team

---

## Inhoudsopgave

1. [Product Visie & Functionele Doelen](#1-product-visie--functionele-doelen)
2. [Systeemarchitectuur & Tech Stack](#2-systeemarchitectuur--tech-stack)
3. [Authenticatie & Gebruikersbeheer](#3-authenticatie--gebruikersbeheer)
4. [Core Logica & Gemini API Prompt Pipeline](#4-core-logica--gemini-api-prompt-pipeline)
5. [Datamodel & Database Relaties](#5-datamodel--database-relaties)
6. [API Endpoints & Routes](#6-api-endpoints--routes)
7. [Concrete Roadmap & Verbeterpunten](#7-concrete-roadmap--verbeterpunten)

---

## 1. Product Visie & Functionele Doelen

### 1.1 Kernmissie

FamApp is een Progressive Web App (PWA) met als primair doel: gebruikers voorzien van **gezonde dinerrecepten voor 4 personen tegen een zo laag mogelijke prijs**, waarbij maximaal gebruik wordt gemaakt van **actuele supermarktaanbiedingen**. Het kortingsproduct staat centraal; basis-ingrediënten zonder korting vullen het recept aan.

### 1.2 Hoe de functionele doelen in de code zijn vertaald

#### Gebruikersprofiel & Voorkeuren

Elke ingelogde gebruiker heeft een eigen rij in `user_settings` (zie §5). Via de **Instellingen-tab** (`src/app/components/SettingsPage.tsx`) beheert de gebruiker:

- **Supermarkten:** aanvinken welke winkels (Albert Heijn, Jumbo, Aldi, Plus, Lidl) doorzocht worden. Standaard alleen Albert Heijn.
- **Budget p.p.:** een minimum- en maximumprijs per persoon (`min_price_pp` / `max_price_pp`). De calculator (`src/lib/recipes/calculator.ts`) filtert recepten die buiten dit bereik vallen eruit en sorteert op prijs oplopend.
- **Lust ik niet:** een vrije lijst met uit te sluiten ingrediënten (`excluded_ingredients`). De chefs ontvangen deze lijst expliciet in hun prompt en de calculator voert achteraf een definitieve controle uit.

#### Aanbiedingen & Receptgeneratie

De pipeline verloopt in 5 stappen ("Kitchen Brigade"). De deals die bij geselecteerde winkels gevonden worden, vormen de basis; standaardingrediënten vullen aan. Prijstransparantie is ingebakken: elk recept geeft per ingrediënt `deal_price`, `original_price`, `deal_description` en `supermarket` mee.

#### De 6-staps Prompt Pipeline (Chef-koks)

In `src/lib/gemini/agents.ts` zijn **8 chef-persona's** gedefinieerd (de code bevat er 8; de productvisie spreekt van 6 — dit is een discrepantie die het team moet beslissen):

| Chef-naam | Specialisatie |
|---|---|
| Chef Snel | Klaar in ≤ 20 minuten |
| Chef Vega | Vegetarisch |
| Chef Wereldkeuken | Internationale keukens |
| Chef Gezond | Macro-gebalanceerd (eiwitten/koolhydraten/vetten) |
| Chef Budget | Maximale kortingbenutting, minimale kosten |
| Chef Familie | Kindvriendelijk (6–12 jaar) |
| Chef Gourmet | Restaurantniveau thuis |
| Chef Slow | Oven / slowcooker |

Elke chef heeft een `id` (de naam) en een `systemInstruction` (zijn persoonlijkheid/focusgebied). **Belangrijk:** de prompts zijn momenteel hardcoded in de broncode. De productvisie wil dat gebruikers deze zelf kunnen aanpassen — dat is nog **niet** geïmplementeerd (zie §7).

De naam van de chef die een recept bedacht heeft, is momenteel **niet** zichtbaar voor de gebruiker in de receptenweergave. Dit is eveneens een openstaand punt.

#### Handmatige Productencheck (Tracker)

Via de **Tracker-tab** (`src/app/components/TrackerTab.tsx`) beheert de gebruiker een eigen productenlijst. Met de knop "Aanbiedingen zoeken" controleert Gemini (via Google Search grounding) of die producten deze week in de aanbieding zijn bij de ingestelde supermarkten. De resultaten worden direct in de UI getoond.

---

## 2. Systeemarchitectuur & Tech Stack

### 2.1 Overzicht

```
┌─────────────────────────────────────────────────────┐
│                  Browser / PWA                       │
│   Next.js 15 App Router (React 18, TypeScript)       │
│   Tailwind CSS + Phosphor Icons                      │
│   Service Worker (src/public/sw.js)                  │
└────────────────────┬────────────────────────────────┘
                     │  HTTPS (fetch / SSE)
┌────────────────────▼────────────────────────────────┐
│            Next.js API Routes (Edge Runtime)         │
│   /api/generate-recipes   /api/deals/refresh         │
│   /api/recipes            /api/settings              │
│   /api/tracker/*          /api/push/subscribe        │
│   /api/version                                       │
└───────────┬───────────────────────┬─────────────────┘
            │                       │
┌───────────▼──────────┐  ┌────────▼──────────────────┐
│   Supabase           │  │   Google Gemini API        │
│   PostgreSQL         │  │   @google/genai ^2.10.0    │
│   Auth (JWT/RLS)     │  │   Modellen:                │
│   Storage (avatars)  │  │   - gemini-3.1-flash-lite  │
│   Push-abonnementen  │  │     (Foragers + Shoppers)  │
└──────────────────────┘  │   - gemini-3.5-flash       │
                          │     (Chefs + Critic)       │
                          └───────────────────────────┘
```

### 2.2 Tech Stack — details

| Laag | Technologie | Versie | Rol |
|---|---|---|---|
| Framework | Next.js (App Router) | ^15.0.0 | Full-stack React-framework, SSR + Edge API |
| UI | React | ^18.2.0 | Component-based frontend |
| Taal | TypeScript | ^5.3.3 | Strikt getypeerd door de hele codebase |
| Styling | Tailwind CSS | ^3.4.1 | Utility-first CSS, custom design tokens |
| Iconen | Phosphor Icons | (CDN) | Consistente icoonset via `ph` CSS classes |
| Backend-as-a-Service | Supabase | ^2.108 | Auth, PostgreSQL, Storage, RLS |
| AI | Google Gemini via `@google/genai` | ^2.10.0 | Deals scrapen, recepten genereren |
| Push-notificaties | web-push | ^3.6.7 | Web Push Protocol voor PWA-notificaties |
| PWA | Service Worker | (custom) | Offline caching, installatie |

### 2.3 Deployment-model

De app is een Next.js-project dat bedoeld is voor deployment op **Vercel** (edge-functies, `after()` voor achtergrondtaken). De Edge Runtime is expliciet ingesteld op de zware API-routes (`export const runtime = 'edge'`).

### 2.4 Communicatiepatroon

- **Generatie-stroom:** POST → direct `jobId` terug → client pollt elke 1,5 seconde GET `?jobId=...` totdat status `done` of `error` is. De `jobId` wordt opgeslagen in `localStorage` zodat na een refresh of het sluiten van de PWA automatisch herverbonden wordt.
- **Deal-refresh:** POST-aanroep die een SSE-stream openhoudt (keep-alive via ping elke 12 s) terwijl de scrape draait in de achtergrond.
- **Tracker-search:** enkelvoudige POST, directe JSON-respons.

---

## 3. Authenticatie & Gebruikersbeheer

### 3.1 Supabase Auth

Authenticatie is volledig uitbesteed aan **Supabase Auth** (e-mail + wachtwoord). De auth-context (`src/app/auth-context.tsx`) biedt drie acties:

- `signUp(email, password)` — registratie, geeft `{ needsConfirmation: boolean }` terug afhankelijk van of e-mailbevestiging aanstaat in Supabase.
- `signIn(email, password)` — inloggen.
- `signOut()` — uitloggen en sessie wissen.

De `AuthProvider` wikkelt de hele app in (`src/app/providers.tsx`) en luistert via `onAuthStateChange` op sessiewijzigingen.

### 3.2 Sessiebeheer & Token-doorgifte

- De browser-client (`src/lib/supabase/client.ts`) levert `getAccessToken()` — een JWT-bearer token.
- Alle API-calls sturen dit token als `Authorization: Bearer <token>` header.
- De server-client (`src/lib/supabase/server.ts`) pakt het token uit de request-header en verifieert de gebruiker via `supabase.auth.getUser()`.
- Een aparte **service-role client** (`getSupabaseServiceClient`) wordt gebruikt voor operaties die RLS moeten omzeilen (deals-cache, jobs). De service-role key mag **nooit** naar de browser lekken.

### 3.3 Row Level Security (RLS)

Alle gebruikersgebonden tabellen hebben RLS ingeschakeld. Policies zorgen dat elke gebruiker uitsluitend zijn eigen rijen kan lezen/schrijven:

| Tabel | Policy |
|---|---|
| `user_settings` | SELECT/INSERT/UPDATE/DELETE: `auth.uid() = user_id` |
| `saved_recipes` | SELECT/INSERT/DELETE: `auth.uid() = user_id` |
| `tracked_products` | ALL: `auth.uid() = user_id` |
| `recipe_generation_jobs` | SELECT: `auth.uid() = user_id` (schrijven via service-role) |
| `daily_deals` | RLS aan, geen policy → alleen service-role |
| `deal_scrape_runs` | RLS aan, geen policy → alleen service-role |

### 3.4 Gebruikersinstellingen — aanmaak

Bij de eerste GET op `/api/settings` wordt gecheckt of er al een rij bestaat. Zo niet, dan maakt de server automatisch een default-rij aan:

```
selected_stores: ['Albert Heijn']
min_price_pp: 0
max_price_pp: 10
excluded_ingredients: []
```

### 3.5 Profielafbeelding

Nieuwe gebruikers die jonger dan 5 minuten zijn en nog geen avatar hebben, krijgen een foto-onboarding te zien (`PhotoOnboarding`). Avatars worden opgeslagen in een Supabase Storage bucket (`avatars`), de publieke URL wordt in `user.user_metadata.avatar_url` gezet. De header toont vervolgens de avatar of de eerste letter van het e-mailadres.

---

## 4. Core Logica & Gemini API Prompt Pipeline

### 4.1 Architectuurprincipe

De pipeline volgt een "Kitchen Brigade"-metafoor met 4 soorten AI-agenten en 1 deterministisch narekenstap:

```
Stap 1 — Foragers   →  Stap 2 — Chefs   →  Stap 3 — Critic
(deals ophalen)        (recepten maken)      (kwaliteitsfilter)
        ↓
Stap 4 — Shoppers   →  Stap 5 — Calculator
(standaard-           (prijzen doorrekenen
 ingrediëntprijzen)    + budgetfilter)
```

### 4.2 Gemini-modellen en hun rollen

Er zijn twee Gemini-modellen in gebruik (`src/lib/gemini/client.ts`):

- **`gemini-3.1-flash-lite`** (`GEMINI_FLASH_LITE`): snel en goedkoop. Gebruikt voor Foragers (stap 1) en Shoppers (stap 4) — veel parallelle calls, minder culinaire diepgang nodig.
- **`gemini-3.5-flash`** (`GEMINI_CHEF`): hogere kwaliteit. Gebruikt voor Chefs (stap 2) en Critic (stap 3) — culinaire creativiteit en kwaliteitscontrole.

Er zijn twee Gemini-aanroeppatronen:

| Functie | Beschrijving | Wanneer gebruikt |
|---|---|---|
| `generateStructured` | Forced JSON-schema output (`responseMimeType: application/json`), **zonder** Google Search | Chefs, Critic |
| `generateGroundedJson` | Google Search grounding ingeschakeld, JSON gevraagd via prompt en defensief geparset | Foragers, Shoppers |

### 4.3 Stap 1 — The Foragers (deals ophalen)

**Bestand:** `src/lib/gemini/agents.ts` — `forageDeals(store)`

De Forager werkt per winkel in een iteratieve lus (max. 5 iteraties). Elke iteratie vraagt een nieuwe batch van top-15 deals. Al gevonden producten worden in de volgende iteratie uitgesloten om duplicaten te voorkomen. De prompt specificeert exact het gewenste JSON-formaat:

```typescript
{
  product_name: string,    // Officiële naam incl. merk + gewicht
  deal_type: 'single' | 'bogo' | 'multi_buy' | 'percentage_off',
  min_quantity: number,    // Minimaal te kopen voor de deal
  bundle_price: number | null,
  deal_price: number,      // Effectieve prijs per eenheid
  original_price: number | null,
  deal_description: string | null,
  supermarket: string
}
```

Voor AH, Jumbo en Aldi geeft de prompt een directe URL-hint mee. Voor Plus en Lidl (die directe scraping blokkeren) wordt via `STORE_SEARCH_HINTS` een Google-zoekstrategie meegegeven.

**Dagcache:** Na afloop worden de deals opgeslagen in de `daily_deals`-tabel via `src/app/api/deals/refresh/route.ts`. Atomische claim-coördinatie via `deal_scrape_runs` voorkomt dat meerdere gebruikers/tabs tegelijk dezelfde winkel scrapen.

### 4.4 Stap 2 — The Chefs (recepten bedenken)

**Bestand:** `src/lib/gemini/agents.ts` — `chefRecipes(persona, deals, excludedIngredients)`

Alle 8 chef-persona's draaien **parallel** (`Promise.allSettled`). Elke chef ontvangt:

1. De volledige deals-lijst als compacte JSON (inclusief `min_quantity` zodat de chef weet hoeveel eenheden nodig zijn voor bogo/multi_buy-deals).
2. Een expliciete uitsluitingslijst van de gebruiker.
3. De instruc om `base_deal_ingredients` te gebruiken met exacte productnamen uit de deals-lijst en `required_standard_ingredients` op te geven in de juiste hoeveelheid voor 4 personen.

Het verwachte outputformaat wordt via `chefResponseSchema` afgedwongen (zie `src/lib/gemini/schemas.ts`).

### 4.5 Stap 3 — The Critic (kwaliteitsfilter)

**Bestand:** `src/lib/gemini/agents.ts` — `criticFilter(concepts)`

De Critic verdeelt alle receptconcepten in 3 gelijke groepen en filtert elke groep in een parallelle call terug naar de beste concepten. Criteria: culinaire kwaliteit, gezondheid, haalbaarheid voor thuiskoks én diversiteit over supermarkten. Maximaal 16 recepten passeren de filter.

### 4.6 Stap 4 — The Shoppers (standaard-ingrediëntprijzen)

**Bestand:** `src/lib/gemini/agents.ts` — `shopPrices()` en `shopMissingPrices()`

De Shoppers halen via Google Search grounding de reguliere (niet-aanbieding) prijzen op van `required_standard_ingredients`. Ze werken per recept (chunk van 1), maximaal 16 parallelle calls. Een tweede ronde (`shopMissingPrices`) haalt alsnog ontbrekende prijzen op voor ingrediënten die in de eerste ronde geen geldige prijs kregen.

### 4.7 Stap 5 — The Calculator (deterministisch)

**Bestand:** `src/lib/recipes/calculator.ts`

Geen AI. De calculator:

1. Koppelt `base_deal_ingredients` aan de deals-lijst (case-insensitieve substring-match).
2. Herkent pantry-basisproducten (olie, zout, peper, knoflook, ui etc.) via `PANTRY_KEYWORDS` en stelt die op €0.
3. Berekent de totaalprijs en prijs per persoon (4 porties).
4. Markeert het recept als `price_complete: false` als van een niet-pantry ingrediënt de prijs ontbreekt — zulke recepten worden **niet** getoond om een kunstmatig te laag totaal te voorkomen.
5. Filtert op `min_price_pp` / `max_price_pp` en `excluded_ingredients`.
6. Sorteert oplopend op prijs per persoon.

### 4.8 Tracker — handmatige productencheck

**Bestand:** `src/lib/gemini/agents.ts` — `searchTrackerDealsForStore(productNames, store)`

Controleert per winkel of de opgegeven producten in de aanbieding zijn. Gebruikt dezelfde URL-hints als de Forager. Probeert eerst de dagcache (`searchTrackerDealsFromCache`); als die nog niet klaar is, valt het terug op een live Gemini-call. De resultaten worden direct in de Tracker-tab getoond.

### 4.9 Caching-strategie voor deals

```
Eerste gebruiker van de dag (bij sessie-start)
        ↓
POST /api/deals/refresh
        ↓
claimRun() — atomaire INSERT op deal_scrape_runs
  ✓ Gewonnen → forageDeals() → sla op in daily_deals → status='done'
  ✗ Verloren (conflict 23505)
       ↓ status='running' → wacht (poll elke 2s, max 40s)
       ↓ status='done'    → lees daily_deals
       ↓ timeout of 'failed' → live foraging als fallback
```

---

## 5. Datamodel & Database Relaties

### 5.1 Entiteit-Relatiediagram

```
auth.users (Supabase intern)
    │
    ├──1:1──▶ user_settings
    │           selected_stores (text[])
    │           min_price_pp, max_price_pp (numeric)
    │           excluded_ingredients (text[])
    │
    ├──1:N──▶ saved_recipes
    │           title (text)
    │           recipe_json (jsonb) ← volledig FinalRecipe-object
    │
    ├──1:N──▶ tracked_products
    │           product_name (text)
    │
    └──1:N──▶ recipe_generation_jobs
                status: 'running' | 'done' | 'error'
                step (int) — voortgangsindicator
                status_lines (jsonb[]) — volledige voortgangslog
                result_json (jsonb) — FinalRecipe[]
                error (text)

daily_deals (gedeeld, geen user_id)
    store, deal_date, product_name, deal_type,
    min_quantity, bundle_price, deal_price,
    original_price, deal_description, supermarket

deal_scrape_runs (coördinatie, PK: store + deal_date)
    status: 'running' | 'done' | 'failed'
    started_at, finished_at

push_subscriptions (per user)
    endpoint, p256dh, auth
```

### 5.2 Migratie-overzicht

| Bestand | Inhoud |
|---|---|
| `0001_init.sql` | `user_settings` + `saved_recipes` + RLS |
| `0002_avatars_storage.sql` | Supabase Storage bucket voor profielfoto's |
| `0003_push_subscriptions.sql` | Web Push abonnementstabel |
| `0004_tracker_products.sql` | `tracked_products` + RLS |
| `0005_daily_deals.sql` | `daily_deals` + `deal_scrape_runs` |
| `0006_excluded_ingredients.sql` | Kolom `excluded_ingredients` toevoegen aan `user_settings` |
| `0007_recipe_generation_jobs.sql` | `recipe_generation_jobs` + RLS |

### 5.3 Opslag van recepten

Gegenereerde recepten worden **niet** automatisch opgeslagen. De gebruiker kan een recept handmatig bewaren via het hart-icoontje. Het volledige `FinalRecipe`-object (inclusief alle prijzen, ingrediënten en bereidingsstappen) wordt als JSONB opgeslagen in `saved_recipes.recipe_json`. Bewaren werkt op titelnaam: hetzelfde recept kan niet twee keer bewaard worden.

---

## 6. API Endpoints & Routes

### 6.1 Overzicht

| Methode | Route | Runtime | Auth | Beschrijving |
|---|---|---|---|---|
| `GET` | `/api/settings` | nodejs | JWT | Gebruikersinstellingen ophalen (maakt default aan als nieuw) |
| `PUT` | `/api/settings` | nodejs | JWT | Instellingen opslaan (upsert) |
| `POST` | `/api/generate-recipes` | edge | JWT | Pipeline starten → `{ jobId }` terug |
| `GET` | `/api/generate-recipes?jobId=` | edge | JWT | Job-status pollen |
| `POST` | `/api/deals/refresh` | edge | JWT | Achtergrond-scrape starten (SSE stream) |
| `GET` | `/api/recipes` | — | JWT | Bewaarde recepten ophalen |
| `POST` | `/api/recipes` | — | JWT | Recept bewaren |
| `DELETE` | `/api/recipes?id=` | — | JWT | Bewaard recept verwijderen |
| `GET` | `/api/tracker/products` | — | JWT | Bijgehouden productenlijst ophalen |
| `POST` | `/api/tracker/products` | — | JWT | Product toevoegen |
| `PATCH` | `/api/tracker/products?id=` | — | JWT | Product bijwerken |
| `DELETE` | `/api/tracker/products?id=` | — | JWT | Product verwijderen |
| `POST` | `/api/tracker/search` | — | JWT | Aanbiedingen zoeken voor bijgehouden producten |
| `POST` | `/api/push/subscribe` | — | JWT | Web Push abonnement registreren |
| `GET` | `/api/version` | — | — | App-versie (voor Service Worker update-check) |

### 6.2 Authenticatiepatroon (alle beveiligde routes)

```typescript
const accessToken = getAccessTokenFromRequest(req);
if (!accessToken) return new Response('Niet geautoriseerd', { status: 401 });
const supabase = getSupabaseServerClient(accessToken);
const { data: { user } } = await supabase.auth.getUser();
if (!user) return new Response('Niet geautoriseerd', { status: 401 });
```

### 6.3 Achtergrond-generatie via `after()`

De generate-route gebruikt `next/server`'s `after()` om de pipeline **na** de HTTP-response te draaien. Dit is cruciaal: de pipeline duurt 1–3 minuten en een mobiele browser kan de verbinding verbreken (scherm op slot). Door het resultaat in `recipe_generation_jobs` op te slaan en de client te laten pollen, gaat geen enkel resultaat verloren.

---

## 7. Concrete Roadmap & Verbeterpunten

### 7.1 Prioriteit 1 — Directe Aanpassing: Deal-refresh naar handmatige knop verplaatsen

**Huidige situatie:**  
Bij sessie-start roept `useDealRefresh` (`src/app/hooks/useDealRefresh.ts`) automatisch `refreshDailyDeals()` aan vanuit `page.tsx` (regel 73). Dit gebeurt onzichtbaar op de achtergrond.

**Gewenste situatie:**  
De refresh wordt getriggerd door een knop in de **header** (`src/app/components/Header.tsx`).

**Implementatieplan (stap voor stap):**

**Stap A — `useDealRefresh.ts` aanpassen**

De hook moet niet meer automatisch bij mount aanroepen, maar een handmatige `refresh`-functie blootstellen:

```typescript
// src/app/hooks/useDealRefresh.ts (nieuw)
'use client';
import { useCallback, useState } from 'react';
import { refreshDailyDeals } from '@/lib/api';

export function useDealRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await refreshDailyDeals();
    } catch {
      setRefreshError('Aanbiedingen vernieuwen mislukt.');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  return { refresh, isRefreshing, refreshError };
}
```

**Stap B — `page.tsx` aanpassen**

In `AppShell`: verwijder de automatische `useDealRefresh()` aanroep en verbind de `refresh`-functie via props aan de Header:

```typescript
// In AppShell (page.tsx):
const { refresh: refreshDeals, isRefreshing } = useDealRefresh();
// Verwijder: useDealRefresh(); (de oude automatische aanroep)

// Geef door aan Header:
<Header
  onNavigateAccount={() => setTab('account')}
  onAppDownload={() => setShowAppDownload(true)}
  onSettingsClick={() => setTab('instellingen')}
  onRefreshDeals={refreshDeals}
  isRefreshingDeals={isRefreshing}
/>
```

**Stap C — `Header.tsx` aanpassen**

Voeg een refresh-knop toe naast de instellingen-knop:

```typescript
// HeaderProps uitbreiden:
interface HeaderProps {
  onNavigateAccount?: () => void;
  onAppDownload?: () => void;
  onSettingsClick?: () => void;
  onRefreshDeals?: () => void;    // nieuw
  isRefreshingDeals?: boolean;    // nieuw
}

// Knop toevoegen in de header (naast de instellingen-knop):
<button
  type="button"
  onClick={onRefreshDeals}
  disabled={isRefreshingDeals}
  aria-label="Aanbiedingen vernieuwen"
  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line hover:text-navy disabled:opacity-40"
>
  <i
    className={`ph ph-arrows-clockwise text-xl ${isRefreshingDeals ? 'animate-spin' : ''}`}
    aria-hidden="true"
  />
</button>
```

**Wat te verwijderen:**
- De `useEffect` + `started` ref in `useDealRefresh.ts` (de auto-trigger logica).
- De `useDealRefresh()` aanroep zonder toewijzing op regel 73 van `page.tsx`.

**Geen andere wijzigingen nodig** — de API-route (`/api/deals/refresh`) en de caching-logica (`deals-cache.ts`) blijven ongewijzigd.

---

### 7.2 Prioriteit 2 — Chef-naam zichtbaar in receptenoverzicht

**Status:** Nog niet geïmplementeerd. De chef-naam (`ChefPersona.id`) wordt momenteel niet meegestuurd vanuit de pipeline naar het `FinalRecipe`-type.

**Implementatieplan:**
1. Voeg `chef_id?: string` toe aan `RecipeConcept` en `FinalRecipe` in `src/lib/types.ts`.
2. Pas `chefRecipes()` in `agents.ts` aan om de `persona.id` in elk recept te plaatsen.
3. Pas `priceRecipe()` in `calculator.ts` aan om `chef_id` door te sturen naar `FinalRecipe`.
4. Toon de chef-naam in `RecipeCard.tsx` als badge of subtitel.

---

### 7.3 Prioriteit 3 — Aanpasbare chef-prompts door de gebruiker

**Status:** De chef-prompts zijn hardcoded in `CHEF_PERSONAS` in `agents.ts`. De productvisie wil dat gebruikers ze zelf kunnen aanpassen.

**Implementatieplan:**
1. Maak een nieuwe tabel `chef_personas` in Supabase met kolommen: `user_id`, `chef_id` (text), `system_instruction` (text).
2. Voeg een migratie toe (bijv. `0008_chef_personas.sql`) met RLS zodat elke gebruiker alleen zijn eigen persona's ziet.
3. Voeg een sectie "Chef-koks" toe aan `SettingsPage.tsx` met een textarea per chef.
4. Pas `runKitchenBrigade()` in `pipeline.ts` aan om de persona's eerst uit de database te lezen en te mergen met de defaults (fallback als de gebruiker niets heeft ingesteld).

---

### 7.4 Prioriteit 4 — Technische schuld & codekwaliteit

#### Aantal chefs (8 vs. 6)

De code bevat 8 chef-persona's maar de productvisie spreekt van 6. Het team moet beslissen welke 6 behouden blijven, of dat 8 het nieuwe getal is. Aanbeveling: dit afstemmen met de product owner vóór de chef-aanpassing-feature.

#### Model-ID's hardcoded

`gemini-3.1-flash-lite` en `gemini-3.5-flash` staan hard in `client.ts`. Als Google model-namen wijzigt, breekt de app. Aanbeveling: verplaats naar omgevingsvariabelen (`GEMINI_MODEL_FLASH_LITE`, `GEMINI_MODEL_CHEF`).

#### Geen retry-logica op Gemini-calls

De `generateGroundedJson` en `generateStructured` functies hebben geen retry-mechanisme. Een tijdelijke API-fout laat een complete chef-call mislukken. `Promise.allSettled` vangt dit op zodat één mislukking de pipeline niet crasht, maar er is geen automatische herpoging. Aanbeveling: voeg exponential backoff toe voor HTTP 429 (rate limit) en 5xx fouten.

#### `extractJson` is kwetsbaar

De JSON-parser in `client.ts` valt terug op een regex-match als directe parse mislukt. Dit werkt voor de meeste gevallen maar kan falen bij geneste structuren die Gemini in onverwacht formaat teruggeeft. Aanbeveling: upgrade naar een robuustere JSON-extractie of forceer via `responseMimeType: 'application/json'` ook voor grounded calls (als Gemini dit ondersteunt).

#### `maxPricePp` default inconsistentie

In `SettingsPage.tsx` staat de UI-default op `10`, maar in `api/settings/route.ts` is de database-default ook `10`. Echter in `pipeline.ts` wordt als fallback `100` gebruikt als er geen instellingen zijn: `const maxPricePp = settings?.max_price_pp ?? 100`. Dit kan leiden tot het tonen van dure recepten als de settings-call faalt. Aanbeveling: maak de fallback consistent met de database-default (`10`).

#### Geen gebruikersfeedback bij achtergrond-refresh

De huidige (automatische) deal-refresh geeft geen enkele terugkoppeling aan de gebruiker. Na de overgang naar een handmatige knop (zie §7.1) is een laad-indicator toegevoegd, maar het is ook wenselijk om te communiceren wanneer de cache al vers is (bijv. "Aanbiedingen zijn al bijgewerkt vandaag").

---

### 7.5 Prioriteit 5 — Performance & schaalbaarheid

#### Dagcache deelt kosten

De `daily_deals`-tabel is **gedeeld over alle gebruikers**. De eerste gebruiker van de dag betaalt de scrape-kosten (Gemini API-calls); alle volgende gebruikers profiteren van de cache. Dit is een goede architectuurkeuze die schaalbaar is.

#### Gemini-kosten per generatie

Per klik op "Genereren" worden gemaakt:
- 1 Forager-run per winkel (max 5 × aantal winkels calls, maar gevangen door dagcache)
- 8 Chef-calls (parallel)
- 3 Critic-calls (parallel)
- Tot 16 Shopper-calls (parallel)
- 1 extra Shopper-call voor ontbrekende prijzen

Totaal: tot ~28 Gemini-calls per generatie (exclusief de gecachte foraging). Bij schaal naar veel gebruikers is het verstandig om ook gegenereerde recepten te cachen (bijv. per dag/winkels-combinatie).

#### Push-notificaties

De `push_subscriptions`-tabel en `web-push`-integratie zijn aanwezig maar er is geen cron-job of trigger die notificaties daadwerkelijk verstuurt. Dit is infrastructuur voor een toekomstige feature.

---

### 7.6 Aanbevelingen voor het inkomende team

1. **Begin met de deal-refresh knop** (§7.1) — kleine, geïsoleerde wijziging met hoge zichtbaarheid voor de gebruiker.
2. **Maak chef-naam zichtbaar** (§7.2) — kleine toevoeging, grote impact op de UX-belofte.
3. **Voeg een CLAUDE.md of README-dev toe** met lokale setup-instructies (vereiste `.env.local` variabelen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
4. **Schrijf integratietests** voor de calculator (`src/lib/recipes/calculator.ts`) — dit is deterministisch en kritisch voor correcte prijsberekeningen.
5. **Stel model-ID's in als env-variabelen** voordat Google Gemini model-namen herziet.

---

*Einde overdrachtsdocument*
