// Gedeelde datatypes voor de recepten-pipeline en frontend.

export const SUPPORTED_STORES = ['Albert Heijn', 'Jumbo', 'Aldi', 'Plus', 'Lidl'] as const;
export type Store = (typeof SUPPORTED_STORES)[number];

export interface UserSettings {
  user_id: string;
  selected_stores: string[];
  min_price_pp: number;
  max_price_pp: number;
  excluded_ingredients: string[];
  updated_at: string;
}

// Stap 1 — Foragers: een gevonden aanbieding.
export interface Deal {
  product_name: string;
  /** Effectieve prijs per eenheid = kassaprijs / min_quantity. */
  deal_price: number;
  original_price: number | null;
  supermarket: string;
  /** Soort aanbieding: single = losse korting, bogo = 2e gratis, multi_buy = bv "2 voor €5", percentage_off = % korting. */
  deal_type: 'single' | 'bogo' | 'multi_buy' | 'percentage_off';
  /** Minimale hoeveelheid te kopen voor de deal (1 bij single/percentage_off, 2+ bij bogo/multi_buy). */
  min_quantity: number;
  /** Totale kassaprijs voor min_quantity eenheden (null bij single/percentage_off). */
  bundle_price: number | null;
  /** Leesbare omschrijving, bv. "2e gratis", "2 voor €5,00", "50% korting". */
  deal_description: string | null;
}

// Stap 2 — Chefs: een receptconcept.
export interface RecipeConcept {
  recipe_name: string;
  description: string;
  base_deal_ingredients: string[];
  required_standard_ingredients: string[];
  // Stap-voor-stap bereiding (uitgeschreven recept).
  instructions: string[];
}

// Stap 4 — Shoppers: prijs + afbeelding van een standaardingrediënt.
export interface IngredientPrice {
  price: number;
  image_url: string | null;
}
export type PriceMap = Record<string, IngredientPrice>;

// Stap 5 — Calculator: een definitief, doorgerekend recept.
export interface PricedIngredient {
  name: string;
  price: number;
  is_deal: boolean;
  is_pantry?: boolean;
  original_price?: number | null;
  supermarket?: string;
  image_url?: string | null;
  deal_description?: string | null;
  min_quantity?: number;
}

export interface FinalRecipe {
  recipe_name: string;
  description: string;
  ingredients: PricedIngredient[];
  instructions: string[];
  servings: number;
  supermarkets: string[];
  korting_deal_count: number;
  total_price: number;
  price_per_person: number;
  image_url: string | null;
}

// Tracker: een bijgehouden product.
export interface TrackedProduct {
  id: string;
  user_id: string;
  product_name: string;
  created_at: string;
}

// SSE-statusupdates richting de frontend.
export interface StatusEvent {
  step: number;
  message: string;
}
