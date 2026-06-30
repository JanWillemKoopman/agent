import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'FamApp — Goedkoop & Gezond koken',
  description:
    'Genereer gezonde, goedkope recepten op basis van de actuele supermarktaanbiedingen.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FamApp',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" data-theme="ah">
      <head>
        {/* Anti-FOUC: zet het opgeslagen thema synchroon op <html> vóór de
            eerste paint, zodat de gebruiker nooit een flits van het
            default-thema ziet bij een reload. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('famapp-theme');var allowed=['ah','crisp','oda','eataly','riverford'];if(allowed.indexOf(t)>-1){document.documentElement.dataset.theme=t;}}catch(e){}})();`,
          }}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* black-translucent laat de status-bar over de app heen vallen (edge-to-edge) */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FamApp" />
        {/* Icoon dat iOS gebruikt voor het beginscherm */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        {/* Lettertypen voor alle thema's:
            Inter (body/AH), Fraunces (Crisp), Space Grotesk (Oda),
            Playfair Display (Eataly), Bitter (Riverford). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,900&family=Space+Grotesk:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800;900&family=Bitter:wght@400;500;600;700;800&display=swap"
        />
        {/* Phosphor Icons (Regular / outline-stijl) via CDN */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
