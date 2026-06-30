// Centrale bron van waarheid voor de thema-keuze in de instellingen.
//
// De volledige set design-tokens leeft als CSS-variabelen in globals.css
// (per `[data-theme]`-blok). Dit bestand bevat alléén de presentatie-metadata
// die de "Template selectie"-UI nodig heeft: een naam, een korte
// merk-omschrijving en een paar representatieve swatches voor de keuzekaarten.
// Zo blijft de selector visueel kloppen met het werkelijke thema, zonder de
// tokens te dupliceren.

export type ThemeId = 'ah' | 'crisp' | 'oda' | 'eataly' | 'riverford';

export interface ThemePreview {
  id: ThemeId;
  /** Supermarkt-naam zoals getoond in de selector. */
  name: string;
  /** Eén regel die de digitale identiteit samenvat. */
  tagline: string;
  /** Korte typografie-omschrijving. */
  typography: string;
  /** Representatieve swatches (CSS-kleuren) voor de mini-preview op de kaart. */
  swatches: {
    primary: string;
    accent: string;
    surface: string;
    heading: string;
  };
  /** Geometrie-hint voor de kaart-hoeken (px). */
  radius: number;
}

export const THEMES: ThemePreview[] = [
  {
    id: 'ah',
    name: 'Albert Heijn',
    tagline: 'Helder Nederlands digitaal-blauw met pop-oranje korting.',
    typography: 'Inter · strak humanistisch',
    swatches: {
      primary: 'rgb(0 160 226)',
      accent: 'rgb(242 142 0)',
      surface: 'rgb(255 255 255)',
      heading: 'rgb(33 48 63)',
    },
    radius: 12,
  },
  {
    id: 'crisp',
    name: 'Crisp',
    tagline: 'Premium biologisch — bosgroen op milky cream.',
    typography: 'Fraunces · elegante serif',
    swatches: {
      primary: 'rgb(47 93 58)',
      accent: 'rgb(210 96 63)',
      surface: 'rgb(255 253 247)',
      heading: 'rgb(37 55 42)',
    },
    radius: 20,
  },
  {
    id: 'oda',
    name: 'Oda',
    tagline: 'Scandinavisch & speels — frisgroen met knalgeel.',
    typography: 'Space Grotesk · tech-sans',
    swatches: {
      primary: 'rgb(26 163 90)',
      accent: 'rgb(255 210 63)',
      surface: 'rgb(255 255 255)',
      heading: 'rgb(20 23 26)',
    },
    radius: 10,
  },
  {
    id: 'eataly',
    name: 'Eataly',
    tagline: 'Italiaanse luxe — houtskool met oker-goud.',
    typography: 'Playfair Display · verfijnde serif',
    swatches: {
      primary: 'rgb(28 28 26)',
      accent: 'rgb(182 134 44)',
      surface: 'rgb(255 254 251)',
      heading: 'rgb(28 28 26)',
    },
    radius: 3,
  },
  {
    id: 'riverford',
    name: 'Riverford',
    tagline: 'Rustiek farm-to-table — modder-groen op beige.',
    typography: 'Bitter · karaktervolle serif',
    swatches: {
      primary: 'rgb(58 90 44)',
      accent: 'rgb(191 90 54)',
      surface: 'rgb(250 245 233)',
      heading: 'rgb(51 64 42)',
    },
    radius: 14,
  },
];

export const THEME_IDS = THEMES.map((t) => t.id) as ThemeId[];
export const DEFAULT_THEME: ThemeId = 'ah';
export const THEME_STORAGE_KEY = 'famapp-theme';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.includes(value as ThemeId);
}
