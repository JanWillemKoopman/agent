'use client';

export type TabKey = 'recepten' | 'instellingen' | 'account';

interface NavItem {
  key: TabKey;
  label: string;
  icon: string;
  activeIcon: string;
}

// Eén plek om tabs te definiëren — eenvoudig uit te breiden met nieuwe pagina's.
const ITEMS: NavItem[] = [
  {
    key: 'recepten',
    label: 'Recepten',
    icon: 'ph ph-cooking-pot',
    activeIcon: 'ph-fill ph-cooking-pot',
  },
  {
    key: 'instellingen',
    label: 'Instellingen',
    icon: 'ph ph-sliders-horizontal',
    activeIcon: 'ph-fill ph-sliders-horizontal',
  },
  {
    key: 'account',
    label: 'Account',
    icon: 'ph ph-user-circle',
    activeIcon: 'ph-fill ph-user-circle',
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
