/** @type {import('tailwindcss').Config} */

// Elke kleur-token wordt teruggebracht naar een CSS-variabele met losse RGB-
// kanalen (bijv. `--c-primary: 0 160 226`). Door ze als
// `rgb(var(--token) / <alpha-value>)` te registreren blijven Tailwind-opacity-
// modifiers (`bg-ahBlue/30`, `text-onNavy/80`) gewoon werken én kan elk thema
// de variabele overschrijven via een `data-theme`-attribuut (zie globals.css).
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // — Merk / primaire actie —
        ahBlue: withAlpha('--c-primary'),
        ahBlueDark: withAlpha('--c-primary-dark'),
        ahBlueSoft: withAlpha('--c-primary-soft'),
        onPrimary: withAlpha('--c-on-primary'), // tekst/iconen óp een primair vlak

        // — Korting / accent —
        kortingOrange: withAlpha('--c-accent'),
        kortingOrangeDark: withAlpha('--c-accent-dark'),
        onAccent: withAlpha('--c-on-accent'), // tekst óp een accent-badge

        // — Donkere koppen / navigatie —
        navy: withAlpha('--c-heading'),
        navyDark: withAlpha('--c-heading-dark'),
        onNavy: withAlpha('--c-on-heading'), // tekst óp een navy vlak

        // — Tekst & oppervlakken —
        ink: withAlpha('--c-ink'),
        muted: withAlpha('--c-muted'),
        line: withAlpha('--c-line'),
        appBg: withAlpha('--c-bg'),
        surface: withAlpha('--c-surface'),

        // — Semantische staten —
        success: withAlpha('--c-success'),
        successSoft: withAlpha('--c-success-soft'),
        successInk: withAlpha('--c-success-ink'),
        danger: withAlpha('--c-danger'),
        dangerSoft: withAlpha('--c-danger-soft'),
        dangerInk: withAlpha('--c-danger-ink'),
        warning: withAlpha('--c-warning'),
      },
      borderRadius: {
        card: 'var(--r-card)',
        tile: 'var(--r-tile)',
        badge: 'var(--r-badge)',
        pill: '9999px',
      },
      boxShadow: {
        card: 'var(--s-card)',
        nav: 'var(--s-nav)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['var(--font-heading)', 'var(--font-sans)', 'serif'],
      },
    },
  },
  plugins: [],
};
