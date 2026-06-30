'use client';

import { useEffect, useRef, useState } from 'react';
import { SUPPORTED_STORES } from '@/lib/types';
import { fetchSettings, saveSettings } from '@/lib/api';

export function SettingsPage() {
  const [stores, setStores] = useState<string[]>(['Albert Heijn']);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchSettings()
      .then((s) => {
        setStores(s.selected_stores?.length ? s.selected_stores : ['Albert Heijn']);
        setExcludedIngredients(s.excluded_ingredients ?? []);
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

  const addIngredient = () => {
    const value = ingredientInput.trim();
    if (!value) return;
    const lower = value.toLowerCase();
    if (excludedIngredients.some((i) => i.toLowerCase() === lower)) {
      setIngredientInput('');
      return;
    }
    setSavedOk(false);
    setExcludedIngredients((prev) => [...prev, value]);
    setIngredientInput('');
    inputRef.current?.focus();
  };

  const removeIngredient = (ingredient: string) => {
    setSavedOk(false);
    setExcludedIngredients((prev) => prev.filter((i) => i !== ingredient));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedOk(false);
    try {
      await saveSettings({
        selected_stores: stores,
        excluded_ingredients: excludedIngredients,
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
      <h1 className="px-1 font-heading text-xl font-extrabold text-navy">Instellingen</h1>

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
                    : 'border-line bg-surface'
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
        <h2 className="text-sm font-semibold text-ink">Lust ik niet</h2>
        <p className="text-xs text-muted">
          Recepten met deze ingrediënten worden niet voorgesteld.
        </p>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addIngredient();
              }
            }}
            placeholder="Bijv. champignons"
            className="min-w-0 flex-1 rounded-card border border-line px-3 py-2.5 text-sm outline-none focus:border-ahBlue"
          />
          <button
            type="button"
            onClick={addIngredient}
            className="rounded-card bg-ahBlue px-4 py-2.5 text-sm font-semibold text-onPrimary transition-colors hover:bg-ahBlueDark"
          >
            Toevoegen
          </button>
        </div>

        {excludedIngredients.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {excludedIngredients.map((ingredient) => (
              <li
                key={ingredient}
                className="flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1 text-sm text-ink"
              >
                {ingredient}
                <button
                  type="button"
                  onClick={() => removeIngredient(ingredient)}
                  aria-label={`Verwijder ${ingredient}`}
                  className="ml-0.5 text-muted transition-colors hover:text-danger"
                >
                  <i className="ph ph-x" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="px-1 text-sm text-danger">{error}</p>}
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
        className="flex w-full items-center justify-center gap-2 rounded-pill bg-ahBlue py-3 text-sm font-semibold text-onPrimary transition-colors hover:bg-ahBlueDark disabled:opacity-60"
      >
        {saving ? 'Opslaan…' : 'Instellingen opslaan'}
      </button>
    </div>
  );
}
