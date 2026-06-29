import { Type } from '@google/genai';

// Structured-output schema's voor de calls zónder search-tool (Chefs, Critic).
// De agents geven hiermee altijd valide JSON terug — de "failsafe structuur".

// Eén receptconcept (gebruikt door Chefs en Critic).
const recipeConceptSchema = {
  type: Type.OBJECT,
  properties: {
    recipe_name: { type: Type.STRING },
    description: { type: Type.STRING },
    base_deal_ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    required_standard_ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    instructions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'recipe_name',
    'description',
    'base_deal_ingredients',
    'required_standard_ingredients',
    'instructions',
  ],
  propertyOrdering: [
    'recipe_name',
    'description',
    'base_deal_ingredients',
    'required_standard_ingredients',
    'instructions',
  ],
};

// Chef-output: een lijst van receptconcepten.
export const chefResponseSchema = {
  type: Type.OBJECT,
  properties: {
    recipes: { type: Type.ARRAY, items: recipeConceptSchema },
  },
  required: ['recipes'],
};

// Critic-output: de behouden (beste) receptconcepten.
export const criticResponseSchema = {
  type: Type.OBJECT,
  properties: {
    recipes: { type: Type.ARRAY, items: recipeConceptSchema },
  },
  required: ['recipes'],
};
