'use client';

export type TabKey = 'home' | 'recepten' | 'tracker' | 'instellingen' | 'account';

interface NavItem {
  key: TabKey;
  label: string;
  icon: string;
  activeIcon: string;
}

const ITEMS: NavItem[] = [
  {
    key: 'home',
    label: 'Home',
    icon: 'ph ph-house',
    activeIcon: 'ph-fill ph-house',
  },
  {
    key: 'recepten',
    label: 'Recepten',
    icon: 'ph ph-cooking-pot',
    activeIcon: 'ph-fill ph-cooking-pot',
  },
  {
    key: 'tracker',
    label: 'Tracker',
    icon: 'ph ph-bell',
    activeIcon: 'ph-fill ph-bell',
  },
];

interface BottomNavProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface shadow-nav">
      <ul
        className="mx-auto flex max-w-2xl items-stretch justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <li key={item.key} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(item.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-ahBlue' : 'text-muted'
                }`}
              >
                <i
                  className={`${isActive ? item.activeIcon : item.icon} text-2xl`}
                  aria-hidden="true"
                />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
