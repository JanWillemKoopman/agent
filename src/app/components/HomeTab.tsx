'use client';

import type { TabKey } from './BottomNav';

interface FeatureCard {
  key: TabKey;
  title: string;
  tagline: string;
  icon: string;
  variant: 'blue' | 'navy';
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    key: 'recepten',
    title: 'Recepten',
    tagline: 'Prijsbewuste en gezonde diner recepten',
    icon: 'ph-fill ph-cooking-pot',
    variant: 'blue',
  },
  {
    key: 'tracker',
    title: 'Tracker',
    tagline: 'Zijn mijn producten in de aanbieding?',
    icon: 'ph-fill ph-bell',
    variant: 'blue',
  },
];

const UTILITY_CARDS: FeatureCard[] = [
  {
    key: 'instellingen',
    title: 'Instellingen',
    tagline: 'Beheer je voorkeuren en gezin',
    icon: 'ph-fill ph-sliders-horizontal',
    variant: 'navy',
  },
  {
    key: 'account',
    title: 'Mijn profiel',
    tagline: 'Jouw account en profielfoto',
    icon: 'ph-fill ph-user-circle',
    variant: 'navy',
  },
];

interface HomeTabProps {
  onNavigate: (tab: TabKey) => void;
}

function AppCard({ card, onNavigate }: { card: FeatureCard; onNavigate: (tab: TabKey) => void }) {
  const isBlue = card.variant === 'blue';

  return (
    <button
      type="button"
      onClick={() => onNavigate(card.key)}
      className={`
        group relative flex flex-col justify-between w-full rounded-card p-4
        transition-all duration-200 active:scale-[0.97]
        ${isBlue
          ? 'bg-ahBlue hover:bg-ahBlueDark'
          : 'bg-navy hover:bg-[#1a2733]'
        }
      `}
      style={{ minHeight: '140px' }}
    >
      <div className="flex flex-col gap-1.5">
        <i className={`${card.icon} text-2xl text-white/80`} aria-hidden="true" />
        <h2 className="text-left text-base font-extrabold uppercase tracking-wide text-white leading-tight">
          {card.title}
        </h2>
        <p className="text-left text-xs font-medium text-white/80 leading-snug">
          {card.tagline}
        </p>
      </div>

      <div className="flex justify-end mt-3">
        <span className={`
          flex h-7 w-7 items-center justify-center rounded-full
          ${isBlue ? 'bg-white/20 group-hover:bg-white/30' : 'bg-white/15 group-hover:bg-white/25'}
          transition-colors
        `}>
          <i className="ph ph-arrow-right text-sm text-white" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
}

export function HomeTab({ onNavigate }: HomeTabProps) {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <div>
        <h1 className="text-xl font-extrabold text-navy tracking-tight mb-4">
          Wat wil je doen?
        </h1>
        <div className="grid grid-cols-2 gap-3">
          {FEATURE_CARDS.map((card) => (
            <AppCard key={card.key} card={card} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Mijn account
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {UTILITY_CARDS.map((card) => (
            <AppCard key={card.key} card={card} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}
