// App-versie en build-/deploy-tijdstip. BUILD_TIME wordt vastgelegd op het moment
// dat Vercel `next build` draait — dat is het deploy-moment. Beide worden als
// NEXT_PUBLIC_-variabele in de client-bundle geïnlined, zodat de app kan tonen
// hoe recent hij is bijgewerkt.
const APP_VERSION = '0.02';
const BUILD_TIME = new Date().toISOString();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
  },
  headers: async () => [
    {
      // Service worker nooit cachen — browser moet altijd controleren op updates.
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
      ],
    },
    {
      source: '/manifest.json',
      headers: [
        { key: 'Content-Type', value: 'application/manifest+json' },
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
      ],
    },
    {
      // Next.js static assets hebben content-hashes in hun bestandsnaam —
      // veilig om een jaar te cachen (browser haalt nooit een verouderde versie op).
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
};

module.exports = nextConfig;
