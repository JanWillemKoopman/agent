# Progressive Web App (PWA)

Een moderne Progressive Web App gebouwd met Next.js, TypeScript en Tailwind CSS.

## Features

✅ **Installeerbaar** - Kan als native app op home screen worden geïnstalleerd
✅ **Offline-modus** - Werkt zonder internetverbinding dankzij Service Worker
✅ **Push-notificaties** - Kan push-notificaties ontvangen
✅ **Responsive Design** - Werkt op alle schermformaten
✅ **Fast** - Geoptimaliseerd voor prestatie

## Requirements

- Node.js 18+ 
- npm of yarn

## Installatie

```bash
npm install
```

## Ontwikkeling

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

## Build

```bash
npm run build
npm start
```

## Gebruikte technologieën

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Service Worker** - Offline & push notifications

## PWA Features

### Service Worker
- Offline caching met network-first strategy
- Automatische cache invalidatie
- Push notification handling

### Manifest
- App-informatie (naam, iconen, beschrijving)
- Installatie instellingen
- Maskable icons voor adaptive icons

### Installation Prompt
- Native installatie-dialoog op ondersteunde browsers
- Aangepaste installatie-button

## Push Notifications

Om push-notificaties in te schakelen:

1. Klik op "🔔 Notificaties Inschakelen"
2. Sta notificatiepermissies toe
3. Ontvang push-meldingen via de Service Worker

## Icons

Voeg de volgende iconen toe aan `/public`:
- `icon-192x192.png` (192x192px)
- `icon-512x512.png` (512x512px)
- `icon-192x192-maskable.png` (192x192px, maskable)
- `icon-512x512-maskable.png` (512x512px, maskable)
- `screenshot-540x720.png` (540x720px, voor app stores)

## Deployment

### Vercel (Aanbevolen)

```bash
npm i -g vercel
vercel
```

### Andere hosts

De app kan overal worden gedeployed waar HTTPS ondersteund wordt (vereist voor Service Workers).

## License

MIT
