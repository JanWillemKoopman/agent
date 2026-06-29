'use client';

import { useEffect, useState } from 'react';
import { SUPPORTED_STORES } from '@/lib/types';
import { fetchSettings, saveSettings } from '@/lib/api';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [stores, setStores] = useState<string[]>(['Albert Heijn']);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetchSettings()
      .then((s) => {
        setStores(s.selected_stores?.length ? s.selected_stores : ['Albert Heijn']);
        setMinPrice(s.min_price_pp ?? 0);
        setMaxPrice(s.max_price_pp ?? 10);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const toggleStore = (store: string) => {
    setStores((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveSettings({
        selected_stores: stores,
        min_price_pp: minPrice,
        max_price_pp: maxPrice,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-card bg-surface p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dark">Instellingen</h2>
          <button
            type="button"
            aria-label="Sluiten"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-pill hover:bg-appBg"
          >
            <i className="ph ph-x text-xl" aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-gray-500">Laden...</p>
        ) : (
          <div className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-dark">
                Supermarkten
              </legend>
              <div className="space-y-2">
                {SUPPORTED_STORES.map((store) => (
                  <label
                    key={store}
                    className="flex items-center gap-3 rounded-card bg-appBg px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={stores.includes(store)}
                      onChange={() => toggleStore(store)}
                      className="h-4 w-4 accent-ahBlue"
                    />
                    <span className="text-sm text-dark">{store}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-dark">
                Prijs per persoon (€)
              </legend>
              <div className="flex items-center gap-3">
                <label className="flex-1 text-sm">
                  <span className="mb-1 block text-gray-500">Min</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={minPrice}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                    className="w-full rounded-card border border-gray-200 px-3 py-2"
                  />
                </label>
                <label className="flex-1 text-sm">
                  <span className="mb-1 block text-gray-500">Max</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full rounded-card border border-gray-200 px-3 py-2"
                  />
                </label>
              </div>
            </fieldset>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-pill bg-ahBlue px-6 py-3 font-semibold text-white transition-all hover:brightness-95 disabled:opacity-60"
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
