'use client';

import { useEffect, useRef, useState } from 'react';
import { useTracker } from '../hooks/useTracker';
import { formatEuro } from '@/lib/format';
import type { Deal, TrackedProduct } from '@/lib/types';

export function TrackerTab() {
  const {
    products,
    deals,
    isSearching,
    isLoadingProducts,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    searchDeals,
  } = useTracker();

  const [showProducts, setShowProducts] = useState(false);

  const hasProducts = products.length > 0;
  const hasSearched = deals.length > 0 || (!isSearching && error !== null);

  return (
    <div className="space-y-5">
      {/* Zoek-knop */}
      <SearchButton
        onClick={searchDeals}
        isSearching={isSearching}
        disabled={!hasProducts || isLoadingProducts}
      />

      {/* Voortgang */}
      {isSearching && (
        <div className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card text-sm text-muted">
          <i className="ph ph-circle-notch animate-spin text-xl text-ahBlue shrink-0" aria-hidden="true" />
          <span>Aanbiedingen zoeken bij jouw supermarkten…</span>
        </div>
      )}

      {/* Foutmelding */}
      {error && !isSearching && (
        <div className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <i className="ph-fill ph-warning-circle mt-0.5 shrink-0 text-base" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Lege staat — geen producten */}
      {!hasProducts && !isLoadingProducts && (
        <div className="flex flex-col items-center gap-3 rounded-card bg-surface p-8 shadow-card text-center">
          <i className="ph ph-bell-slash text-4xl text-muted" aria-hidden="true" />
          <p className="text-sm font-semibold text-navy">Nog geen producten</p>
          <p className="text-xs text-muted max-w-xs">
            Voeg producten toe via "Mijn producten" en ontdek wanneer ze in de aanbieding zijn.
          </p>
        </div>
      )}

      {/* Resultaten — gevonden deals */}
      {deals.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-1 text-lg font-bold text-navy">
            In de aanbieding
            <span className="ml-2 text-sm font-normal text-muted">
              ({deals.length} {deals.length === 1 ? 'product' : 'producten'})
            </span>
          </h2>
          <ul className="space-y-3">
            {deals.map((deal, idx) => (
              <TrackerDealCard key={`${deal.product_name}-${deal.supermarket}-${idx}`} deal={deal} />
            ))}
          </ul>
        </section>
      )}

      {/* Lege staat — gezocht maar niets gevonden */}
      {!isSearching && !error && hasSearched && deals.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-card bg-surface p-8 shadow-card text-center">
          <i className="ph ph-magnifying-glass text-4xl text-muted" aria-hidden="true" />
          <p className="text-sm font-semibold text-navy">Geen aanbiedingen gevonden</p>
          <p className="text-xs text-muted max-w-xs">
            Geen van jouw producten staat deze week in de aanbieding. Kom later terug!
          </p>
        </div>
      )}

      {/* Sticky "Mijn producten" knop */}
      <div className="fixed inset-x-0 z-30 px-4 pb-3 pointer-events-none"
           style={{ bottom: 'calc(3.75rem + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-2xl pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowProducts(true)}
            className="flex w-full items-center justify-between rounded-pill bg-surface border border-line px-5 py-3 text-sm font-semibold text-ink shadow-card hover:bg-appBg transition-colors"
          >
            <span className="flex items-center gap-2">
              <i className="ph-fill ph-list-bullets text-lg text-ahBlue" aria-hidden="true" />
              Mijn producten
              {products.length > 0 && (
                <span className="rounded-full bg-ahBlueSoft px-2 py-0.5 text-[11px] font-bold text-ahBlue">
                  {products.length}
                </span>
              )}
            </span>
            <i className="ph ph-arrow-right text-muted" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mijn Producten overlay */}
      {showProducts && (
        <ProductsOverlay
          products={products}
          onClose={() => setShowProducts(false)}
          onAdd={addProduct}
          onUpdate={updateProduct}
          onDelete={deleteProduct}
        />
      )}
    </div>
  );
}

// --- Zoek-knop ---------------------------------------------------------------

function SearchButton({
  onClick,
  isSearching,
  disabled,
}: {
  onClick: () => void;
  isSearching: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSearching}
      className={`flex w-full items-center justify-center gap-2 rounded-pill py-3.5 text-sm font-semibold transition-colors ${
        disabled || isSearching
          ? 'bg-appBg text-muted cursor-not-allowed'
          : 'bg-ahBlue text-white hover:bg-ahBlueDark'
      }`}
    >
      {isSearching ? (
        <>
          <i className="ph ph-circle-notch animate-spin text-lg" aria-hidden="true" />
          Zoeken…
        </>
      ) : (
        <>
          <i className="ph-fill ph-bell text-lg" aria-hidden="true" />
          Aanbiedingen zoeken
        </>
      )}
    </button>
  );
}

// --- Deal-kaart --------------------------------------------------------------

function TrackerDealCard({ deal }: { deal: Deal }) {
  return (
    <li className="rounded-card bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {deal.deal_description && (
              <span className="inline-flex items-center gap-1 rounded-md bg-kortingOrange px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                <i className="ph-fill ph-tag text-[10px]" aria-hidden="true" />
                {deal.deal_description}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ahBlue">
              <i className="ph ph-storefront text-[10px]" aria-hidden="true" />
              {deal.supermarket}
            </span>
          </div>
          <p className="text-sm font-semibold text-navy">
            {deal.product_name}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-extrabold text-ink">
            {formatEuro(deal.deal_price)}
          </p>
          {deal.original_price && deal.original_price > deal.deal_price && (
            <p className="text-xs text-muted line-through">
              {formatEuro(deal.original_price)}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

// --- Mijn Producten overlay --------------------------------------------------

interface ProductsOverlayProps {
  products: TrackedProduct[];
  onClose: () => void;
  onAdd: (name: string) => Promise<TrackedProduct>;
  onUpdate: (id: string, name: string) => Promise<TrackedProduct>;
  onDelete: (id: string) => Promise<void>;
}

function ProductsOverlay({
  products,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: ProductsOverlayProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Sluit met Escape-toets.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const startEdit = (product: TrackedProduct) => {
    setEditingId(product.id);
    setEditValue(product.product_name);
  };

  const saveEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(editingId, editValue.trim());
    } finally {
      setIsSaving(false);
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAdd = async () => {
    if (!newProduct.trim()) return;
    setIsAdding(true);
    try {
      await onAdd(newProduct.trim());
      setNewProduct('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (editingId === id) setEditingId(null);
    await onDelete(id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-appBg">
      {/* Topbalk */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-3"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          aria-label="Terug"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-appBg"
        >
          <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
        </button>
        <span className="text-sm font-semibold text-navy">Mijn producten</span>
        <div className="w-10" />
      </header>

      <main className="mx-auto max-w-2xl p-4 pb-40 space-y-4">
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card bg-surface p-8 shadow-card text-center mt-4">
            <i className="ph ph-list-plus text-4xl text-muted" aria-hidden="true" />
            <p className="text-sm font-semibold text-navy">Nog geen producten</p>
            <p className="text-xs text-muted">
              Voeg hieronder je eerste product toe om te beginnen met tracken.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-card bg-surface shadow-card">
            <div className="px-4 py-2.5 border-b border-line text-[11px] font-semibold uppercase tracking-wide text-muted">
              {products.length} {products.length === 1 ? 'product' : 'producten'}
            </div>
            <ul className="divide-y divide-line">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  isEditing={editingId === product.id}
                  editValue={editValue}
                  isSaving={isSaving}
                  onEditValueChange={setEditValue}
                  onStartEdit={() => startEdit(product)}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  onDelete={() => handleDelete(product.id)}
                />
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Sticky voettekst: product toevoegen */}
      <div
        className="fixed inset-x-0 bottom-0 border-t border-line bg-surface p-3 z-10"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-2xl flex gap-2">
          <input
            ref={addInputRef}
            type="text"
            value={newProduct}
            onChange={(e) => setNewProduct(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Productnaam, bv. kipfilet"
            className="flex-1 rounded-card border border-line px-3 py-2.5 text-sm text-ink placeholder:text-muted outline-none focus:border-ahBlue transition-colors"
            disabled={isAdding}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newProduct.trim() || isAdding}
            className="flex items-center gap-1.5 rounded-pill bg-ahBlue px-4 py-2.5 text-sm font-semibold text-white hover:bg-ahBlueDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isAdding ? (
              <i className="ph ph-circle-notch animate-spin text-base" aria-hidden="true" />
            ) : (
              <i className="ph ph-plus text-base" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Product toevoegen</span>
            <span className="sm:hidden">Toevoegen</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Product-rij -------------------------------------------------------------

interface ProductRowProps {
  product: TrackedProduct;
  isEditing: boolean;
  editValue: string;
  isSaving: boolean;
  onEditValueChange: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

function ProductRow({
  product,
  isEditing,
  editValue,
  isSaving,
  onEditValueChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: ProductRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  return (
    <li className="flex items-center gap-2 px-4 py-3">
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="flex-1 rounded-card border border-ahBlue px-3 py-1.5 text-sm text-ink outline-none"
            disabled={isSaving}
          />
          <button
            type="button"
            onClick={onSaveEdit}
            disabled={isSaving || !editValue.trim()}
            aria-label="Opslaan"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ahBlueSoft text-ahBlue hover:bg-ahBlue hover:text-white transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <i className="ph ph-circle-notch animate-spin text-sm" aria-hidden="true" />
            ) : (
              <i className="ph-fill ph-check text-sm" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            aria-label="Annuleren"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-appBg transition-colors"
          >
            <i className="ph ph-x text-sm" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <p className="flex-1 text-sm font-medium text-ink capitalize truncate">
            {product.product_name}
          </p>
          <button
            type="button"
            onClick={onStartEdit}
            aria-label={`${product.product_name} bewerken`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-appBg hover:text-ink transition-colors"
          >
            <i className="ph ph-pencil text-base" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`${product.product_name} verwijderen`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <i className="ph ph-trash text-base" aria-hidden="true" />
          </button>
        </>
      )}
    </li>
  );
}
