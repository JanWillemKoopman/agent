'use client';

import { useEffect, useState } from 'react';
import { SUPPORTED_STORES } from '@/lib/types';
import { fetchSettings, saveSettings } from '@/lib/api';

export function SettingsPage() {
  const [stores, setStores] = useState<string[]>(['Albert Heijn']);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
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
  }, []);

  const toggleStore = (store: string) => {
    setSavedOk(false);
    setStores((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedOk(false);
    try {
      await saveSettings({
        selected_stores: stores,
        min_price_pp: minPrice,
        max_price_pp: maxPrice,
      });
      setSavedOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">Laden…</p>;
  }

  return (
    <div className="space-y-5">
      <h1 className="px-1 text-xl font-extrabold text-navy">Instellingen</h1>

      <section className="space-y-3 rounded-card bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Supermarkten</h2>
        <p className="text-xs text-muted">
          Kies bij welke winkels we naar aanbiedingen zoeken.
        </p>
        <div className="space-y-2">
          {SUPPORTED_STORES.map((store) => {
            const active = stores.includes(store);
            return (
              <label
                key={store}
                className={`flex cursor-pointer items-center gap-3 rounded-card border px-3 py-3 transition-colors ${
                  active
                    ? 'border-ahBlue bg-ahBlueSoft'
                    : 'border-line bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleStore(store)}
                  className="h-4 w-4 accent-ahBlue"
                />
                <span className="text-sm font-medium text-ink">{store}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-card bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Prijs per persoon (€)</h2>
        <p className="text-xs text-muted">
          We tonen alleen recepten binnen dit budget per persoon.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-muted">Minimaal</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={minPrice}
              onChange={(e) => {
                setSavedOk(false);
                setMinPrice(Number(e.target.value));
              }}
              className="w-full rounded-card border border-line px-3 py-2.5 text-sm outline-none focus:border-ahBlue"
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-muted">Maximaal</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={maxPrice}
              onChange={(e) => {
                setSavedOk(false);
                setMaxPrice(Number(e.target.value));
              }}
              className="w-full rounded-card border border-line px-3 py-2.5 text-sm outline-none focus:border-ahBlue"
            />
          </label>
        </div>
      </section>

      {error && <p className="px-1 text-sm text-red-600">{error}</p>}
      {savedOk && (
        <p className="flex items-center gap-1.5 px-1 text-sm text-ahBlueDark">
          <i className="ph-fill ph-check-circle" aria-hidden="true" />
          Instellingen opgeslagen.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-pill bg-ahBlue py-3 text-sm font-semibold text-white transition-colors hover:bg-ahBlueDark disabled:opacity-60"
      >
        {saving ? 'Opslaan…' : 'Instellingen opslaan'}
      </button>
    </div>
  );
}
