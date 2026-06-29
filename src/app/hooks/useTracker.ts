'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchTrackedProducts,
  addTrackedProduct,
  updateTrackedProduct,
  deleteTrackedProduct,
  searchTrackerDeals,
} from '@/lib/api';
import type { TrackedProduct, Deal } from '@/lib/types';

export function useTracker() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const data = await fetchTrackedProducts();
      setProducts(data);
    } catch (e) {
      console.error('Producten laden mislukt:', e);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const addProduct = useCallback(async (name: string) => {
    const product = await addTrackedProduct(name);
    setProducts((prev) => [product, ...prev]);
    return product;
  }, []);

  const updateProduct = useCallback(async (id: string, name: string) => {
    const updated = await updateTrackedProduct(id, name);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await deleteTrackedProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeals((prev) => prev.filter((d) => {
      // Verwijder deals die matchen met het verwijderde product
      const deleted = products.find((p) => p.id === id);
      if (!deleted) return true;
      return !d.product_name.toLowerCase().includes(deleted.product_name.toLowerCase()) &&
             !deleted.product_name.toLowerCase().includes(d.product_name.toLowerCase());
    }));
  }, [products]);

  const searchDeals = useCallback(async () => {
    setIsSearching(true);
    setError(null);
    try {
      const found = await searchTrackerDeals();
      setDeals(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er ging iets mis bij het zoeken.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  return {
    products,
    deals,
    isSearching,
    isLoadingProducts,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    searchDeals,
  };
}
