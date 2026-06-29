/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // AH-geïnspireerd design-systeem
        ahBlue: '#00a0e2',
        ahBlueDark: '#0089c3',
        ahBlueSoft: '#e6f6fd',
        bonusOrange: '#f28e00',
        navy: '#21303f', // donkere balk + koppen (allerhande-stijl)
        ink: '#1a1a1a', // primaire tekst
        muted: '#6b7785', // secundaire tekst
        line: '#e6e8eb', // randen
        appBg: '#f5f6f7', // pagina-achtergrond
        surface: '#ffffff',
      },
      borderRadius: {
        card: '12px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)',
        nav: '0 -1px 8px rgba(16,24,40,0.06)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
