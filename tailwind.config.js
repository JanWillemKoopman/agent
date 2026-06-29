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
        // AH-Inspired Design System
        ahBlue: '#00a0e2',
        bonusOrange: '#f28e00',
        dark: '#1b1b1b',
        appBg: '#f4f5f7',
        surface: '#ffffff',
      },
      borderRadius: {
        card: '8px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.05)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
