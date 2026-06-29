'use client';

import { useNotifications } from '../hooks/useNotifications';

interface AppDownloadPageProps {
  onClose: () => void;
}

const STEPS = [
  {
    icon: 'ph-export',
    title: 'Tik op het Delen-icoon',
    description: 'Tik op het vierkantje met pijl onderin Safari.',
  },
  {
    icon: 'ph-plus-square',
    title: "Kies 'Zet op beginscherm'",
    description: "Scroll naar beneden en tik op 'Zet op beginscherm'.",
  },
  {
    icon: 'ph-rocket-launch',
    title: 'Open FamApp',
    description: 'Tik op FamApp op je beginscherm voor de beste ervaring.',
  },
];

export function AppDownloadPage({ onClose }: AppDownloadPageProps) {
  const { permission, subscribed, isSupported, busy, subscribe } = useNotifications();

  const notifLabel = () => {
    if (subscribed || permission === 'granted') return 'Meldingen zijn ingeschakeld';
    if (permission === 'denied') return 'Meldingen geblokkeerd in browserinstellingen';
    if (!isSupported) return 'Installeer de app eerst om meldingen te ontvangen';
    return 'Meldingen inschakelen';
  };

  const notifDisabled = !isSupported || subscribed || permission === 'denied' || busy;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-appBg">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <h1 className="text-base font-extrabold text-navy">App downloaden</h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-appBg hover:text-ink"
        >
          <i className="ph ph-x text-xl" aria-hidden="true" />
        </button>
      </div>

      <div className="mx-auto max-w-sm space-y-5 p-4">
        {/* Intro */}
        <div className="flex flex-col items-center gap-3 pt-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ahBlue text-white shadow-card">
            <i className="ph-fill ph-cooking-pot text-3xl" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-navy">FamApp op je telefoon</h2>
            <p className="mt-1 text-sm text-muted">
              Zet de app op je beginscherm voor directe toegang en de beste ervaring.
            </p>
          </div>
        </div>

        {/* Installatie-stappen */}
        <section className="rounded-card bg-surface p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-ink">
            Installeren in 3 stappen (iOS Safari)
          </h3>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ahBlueSoft text-ahBlue">
                  <i className={`ph ${step.icon} text-lg`} aria-hidden="true" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-ink">{step.title}</p>
                  <p className="text-xs text-muted">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Push-meldingen */}
        <section className="rounded-card bg-surface p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <i className="ph-fill ph-bell text-lg text-ahBlue" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-ink">Meldingen</h3>
          </div>
          <p className="mb-4 text-xs text-muted">
            Ontvang meldingen over nieuwe aanbiedingen en recepten. Werkt alleen
            vanuit de geïnstalleerde app (iOS 16.4+).
          </p>

          {subscribed || permission === 'granted' ? (
            <p className="flex items-center gap-2 text-sm font-medium text-ahBlueDark">
              <i className="ph-fill ph-check-circle text-base" aria-hidden="true" />
              {notifLabel()}
            </p>
          ) : (
            <button
              type="button"
              onClick={subscribe}
              disabled={notifDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-pill bg-ahBlue py-3 text-sm font-semibold text-white transition-colors hover:bg-ahBlueDark disabled:opacity-60"
            >
              {busy ? (
                <i className="ph ph-circle-notch animate-spin text-base" aria-hidden="true" />
              ) : (
                <i className="ph-fill ph-bell text-base" aria-hidden="true" />
              )}
              {notifLabel()}
            </button>
          )}
        </section>

        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center justify-center rounded-pill border border-line bg-surface py-3 text-sm font-semibold text-ink transition-colors hover:bg-appBg"
        >
          Sluiten
        </button>
      </div>
    </div>
  );
}
