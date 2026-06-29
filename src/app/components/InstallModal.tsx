'use client';

interface InstallModalProps {
  onDone: () => void;
  onLater: () => void;
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

export function InstallModal({ onDone, onLater }: InstallModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-appBg/95 px-6 backdrop-blur-sm">
      <div className="w-full max-w-sm">
        {/* Logo + header */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ahBlue text-white shadow-card">
            <i className="ph-fill ph-cooking-pot text-3xl" aria-hidden="true" />
          </div>
          <h1 className="text-center text-2xl font-extrabold tracking-tight text-navy">
            Voeg FamApp toe aan je beginscherm
          </h1>
          <p className="text-center text-sm text-muted">
            Installeer de app voor een snellere, volledigere ervaring — direct
            vanuit Safari.
          </p>
        </div>

        {/* Stappen */}
        <div className="mb-5 rounded-card bg-surface p-4 shadow-card">
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
        </div>

        {/* Acties */}
        <button
          type="button"
          onClick={onDone}
          className="flex w-full items-center justify-center gap-2 rounded-pill bg-ahBlue py-3 text-sm font-semibold text-white transition-colors hover:bg-ahBlueDark"
        >
          <i className="ph-fill ph-check text-base" aria-hidden="true" />
          Begrepen, ik ga het doen
        </button>

        <button
          type="button"
          onClick={onLater}
          className="mt-3 w-full text-center text-xs text-muted transition-colors hover:text-ink"
        >
          Misschien later
        </button>
      </div>
    </div>
  );
}
