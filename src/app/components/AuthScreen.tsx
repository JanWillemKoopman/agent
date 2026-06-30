'use client';

import { useState } from 'react';
import { useAuth } from '../auth-context';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setInfo(
            'Account aangemaakt! Check je e-mail om je adres te bevestigen en log daarna in.'
          );
          setMode('signin');
        }
      }
    } catch (err) {
      setError(translateError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-appBg px-6">
      <div className="w-full max-w-sm">
        {/* Logo / merk */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-tile bg-ahBlue text-onPrimary shadow-card">
            <i className="ph-fill ph-cooking-pot text-3xl" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-navy">
            FamApp
          </h1>
          <p className="text-center text-sm text-muted">
            Gezond en goedkoop koken met de aanbiedingen van deze week.
          </p>
        </div>

        <div className="rounded-card bg-surface p-6 shadow-card">
          {/* Tabs */}
          <div className="mb-5 flex rounded-pill bg-appBg p-1">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setInfo(null);
                }}
                className={`flex-1 rounded-pill py-2 text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'bg-ahBlue text-onPrimary shadow-card'
                    : 'text-muted'
                }`}
              >
                {m === 'signin' ? 'Inloggen' : 'Registreren'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                E-mailadres
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@voorbeeld.nl"
                className="w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-ahBlue"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Wachtwoord
              </span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimaal 6 tekens"
                className="w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-ahBlue"
              />
            </label>

            {error && (
              <p className="rounded-card bg-dangerSoft px-3 py-2 text-sm text-dangerInk">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-card bg-ahBlueSoft px-3 py-2 text-sm text-ahBlueDark">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-pill bg-ahBlue py-3 text-sm font-semibold text-onPrimary transition-colors hover:bg-ahBlueDark disabled:opacity-60"
            >
              {busy && (
                <i
                  className="ph ph-circle-notch animate-spin text-base"
                  aria-hidden="true"
                />
              )}
              {mode === 'signin' ? 'Inloggen' : 'Account aanmaken'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function translateError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(msg))
    return 'Onjuist e-mailadres of wachtwoord.';
  if (/already registered/i.test(msg))
    return 'Dit e-mailadres is al geregistreerd. Log in.';
  if (/email not confirmed/i.test(msg))
    return 'Bevestig eerst je e-mailadres via de link in je mailbox.';
  if (/password should be at least/i.test(msg))
    return 'Wachtwoord moet minimaal 6 tekens zijn.';
  return msg;
}
