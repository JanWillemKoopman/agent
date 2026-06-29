// Gedeelde datatypes voor de recepten-pipeline en frontend.

export const SUPPORTED_STORES = ['Albert Heijn', 'Jumbo', 'Aldi'] as const;
export type Store = (typeof SUPPORTED_STORES)[number];

export interface UserSettings {
  user_id: string;
  selected_stores: string[];
  min_price_pp: number;
  max_price_pp: number;
  updated_at: string;
}

// Stap 1 — Foragers: een gevonden aanbieding.
export interface Deal {
  product_name: string;
  deal_price: number;
  original_price: number | null;
  supermarket: string;
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
  // Reguliere prijs vóór de aanbieding (alleen bij deals, indien bekend).
  original_price?: number | null;
  supermarket?: string;
  image_url?: string | null;
}

export interface FinalRecipe {
  recipe_name: string;
  description: string;
  ingredients: PricedIngredient[];
  instructions: string[];
  servings: number;
  supermarkets: string[];
  bonus_deal_count: number;
  total_price: number;
  price_per_person: number;
  image_url: string | null;
}

// SSE-statusupdates richting de frontend.
export interface StatusEvent {
  step: number;
  message: string;
}
