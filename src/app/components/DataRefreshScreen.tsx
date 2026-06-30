'use client';

import { useEffect } from 'react';
import type { DealStatus } from '@/lib/api';
import type { StoreProgress } from '../hooks/useDealRefreshStream';

interface DataRefreshScreenProps {
  onClose: () => void;
  // Stream-state (van useDealRefreshStream)
  isRunning: boolean;
  isDone: boolean;
  error: string | null;
  storeProgress: StoreProgress[];
  onTrigger: () => void;
  // Status-state (van useDealStatus)
  dealStatus: DealStatus | null;
  onStatusRefetch: () => void;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function StoreCard({ store, progress, dbStatus }: {
  store: string;
  progress?: StoreProgress;
  dbStatus?: DealStatus['stores'][number];
}) {
  const liveStatus = progress?.status;

  // Bepaal weergavestatus: live stream heeft voorrang boven DB-status.
  const isRunning = liveStatus === 'running';
  const isDone = liveStatus === 'done';
  const isFailed = liveStatus === 'failed';
  const isIdle = !liveStatus || liveStatus === 'idle';

  const dbDone = dbStatus?.status === 'done';
  const showDbData = isIdle && dbDone;

  const productsFound =
    isDone ? (progress?.productsFound ?? dbStatus?.productsFound)
    : showDbData ? dbStatus?.productsFound
    : undefined;

  const lastUpdate = showDbData ? dbStatus?.finishedAt : isDone ? new Date().toISOString() : null;

  return (
    <div className="flex items-center gap-3 rounded-card bg-surface border border-line p-4 shadow-card">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile bg-ahBlueSoft">
        <i className="ph-fill ph-storefront text-lg text-ahBlue" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy truncate">{store}</p>
        <p className="text-xs text-muted mt-0.5">
          {isRunning && 'Aanbiedingen ophalen…'}
          {isDone && productsFound != null && `${productsFound} producten gevonden`}
          {isDone && productsFound == null && 'Klaar'}
          {isFailed && 'Mislukt — probeer opnieuw'}
          {showDbData && productsFound != null && `${productsFound} producten · bijgewerkt ${formatDateTime(lastUpdate ?? null)}`}
          {showDbData && productsFound == null && `Bijgewerkt ${formatDateTime(lastUpdate ?? null)}`}
          {isIdle && !showDbData && 'Wacht op start…'}
        </p>
      </div>

      <div className="shrink-0">
        {isRunning && (
          <i className="ph ph-circle-notch animate-spin text-xl text-ahBlue" aria-hidden="true" />
        )}
        {isDone && (
          <i className="ph-fill ph-check-circle text-xl text-success" aria-hidden="true" />
        )}
        {isFailed && (
          <i className="ph-fill ph-warning-circle text-xl text-danger" aria-hidden="true" />
        )}
        {(isIdle && !showDbData) && (
          <i className="ph ph-clock text-xl text-muted" aria-hidden="true" />
        )}
        {showDbData && (
          <i className="ph-fill ph-check-circle text-xl text-success" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

export function DataRefreshScreen({
  onClose,
  isRunning,
  isDone,
  error,
  storeProgress,
  onTrigger,
  dealStatus,
  onStatusRefetch,
}: DataRefreshScreenProps) {
  // Herlaad DB-status zodra de stream klaar is (done) of de verbinding verbreekt
  // (error). Na een iOS-network-drop loopt de scrape door op de server — de
  // status-poll pikt het resultaat op zodra de run 'done' is.
  useEffect(() => {
    if (isDone || error) onStatusRefetch();
  }, [isDone, error, onStatusRefetch]);

  // Stel de lijst samen: neem stores uit de stream-state of uit de DB-status.
  const streamStores = storeProgress.map((s) => s.store);
  const dbStores = (dealStatus?.stores ?? []).map((s) => s.store);
  const allStores = streamStores.length > 0 ? streamStores : dbStores;

  const hasAnyData = (dealStatus?.stores ?? []).some((s) => s.status === 'done');
  const isAnyRunningInDb = (dealStatus?.stores ?? []).some((s) => s.status === 'running');

  const buttonDisabled = isRunning;
  const buttonLabel = isRunning
    ? 'Bezig met ophalen…'
    : hasAnyData
    ? 'Opnieuw ophalen'
    : 'Aanbiedingen ophalen';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-appBg">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-tile bg-ahBlue text-onPrimary">
            <i className="ph-fill ph-database text-base" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-navy leading-tight">Aanbiedingen</p>
            <p className="text-[11px] text-muted">Data van je supermarkten</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="flex h-9 w-9 items-center justify-center rounded-tile text-muted hover:bg-line hover:text-navy transition-colors"
        >
          <i className="ph ph-x text-xl" aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-5 space-y-5">

          {/* Succesmelding */}
          {isDone && !error && (
            <div className="flex items-center gap-3 rounded-card bg-successSoft border border-success/30 p-4">
              <i className="ph-fill ph-check-circle text-2xl text-success shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-successInk">Klaar!</p>
                <p className="text-xs text-successInk/80 mt-0.5">
                  Alle aanbiedingen zijn opgehaald en opgeslagen. Je kunt nu recepten genereren.
                </p>
              </div>
            </div>
          )}

          {/* Foutmelding */}
          {error && (
            <div className="flex items-center gap-3 rounded-card bg-dangerSoft border border-danger/30 p-4">
              <i className="ph-fill ph-warning-circle text-2xl text-danger shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-dangerInk">Er ging iets mis</p>
                <p className="text-xs text-dangerInk/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Uitleg (alleen als er nog niets loopt of klaar is) */}
          {!isRunning && !isDone && !isAnyRunningInDb && (
            <div className="rounded-card bg-surface border border-line p-4 shadow-card">
              <p className="text-sm font-semibold text-navy mb-1">Wat doet dit?</p>
              <p className="text-xs text-muted leading-relaxed">
                FamApp haalt alle weekaanbiedingen op bij jouw geselecteerde supermarkten.
                Druk op de knop om de meest actuele deals in te laden. Dit duurt ongeveer
                1–3 minuten per winkel.
              </p>
            </div>
          )}

          {/* Store-voortgang */}
          {allStores.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted px-0.5">
                Winkels
              </p>
              {allStores.map((store) => (
                <StoreCard
                  key={store}
                  store={store}
                  progress={storeProgress.find((s) => s.store === store)}
                  dbStatus={dealStatus?.stores.find((s) => s.store === store)}
                />
              ))}
            </div>
          )}

          {/* Lege staat: nog nooit gedraaid */}
          {allStores.length === 0 && !isRunning && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <i className="ph ph-database text-4xl text-muted" aria-hidden="true" />
              <p className="text-sm text-muted max-w-xs">
                Er zijn nog geen aanbiedingen opgehaald. Druk hieronder op de knop om te starten.
              </p>
            </div>
          )}

          {/* DB-statistieken als er data is en de stream niet bezig is */}
          {hasAnyData && !isRunning && dealStatus && (
            <div className="rounded-card bg-surface border border-line p-4 shadow-card space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Samenvatting</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Totaal producten vandaag</span>
                <span className="font-bold text-navy">
                  {dealStatus.stores.reduce((sum, s) => sum + (s.productsFound ?? 0), 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Datum</span>
                <span className="font-medium text-navy">{dealStatus.date}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vaste knop onderaan */}
      <div className="shrink-0 border-t border-line bg-surface px-4 py-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
        <button
          type="button"
          onClick={onTrigger}
          disabled={buttonDisabled}
          className={`
            flex w-full items-center justify-center gap-2.5 rounded-pill py-3.5 text-sm font-bold
            transition-all
            ${buttonDisabled
              ? 'bg-line text-muted cursor-not-allowed'
              : 'bg-ahBlue text-onPrimary hover:bg-ahBlueDark active:scale-[0.98]'
            }
          `}
        >
          {isRunning ? (
            <>
              <i className="ph ph-circle-notch animate-spin text-base" aria-hidden="true" />
              {buttonLabel}
            </>
          ) : (
            <>
              <i className="ph ph-cloud-arrow-down text-base" aria-hidden="true" />
              {buttonLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
