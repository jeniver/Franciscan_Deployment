import { useState, useCallback } from 'react';
import { invoiceService, ApplicationItemsResponse, ApplicationItem } from '../services/invoiceService';

interface UseApplicationItemsReturn {
  applicationItems: ApplicationItemsResponse | null;
  loading: boolean;
  error: string | null;
  fetchApplicationItems: (applicationCode: string) => Promise<void>;
  clearApplicationItems: () => void;
  getItemsByType: (type: 'niche' | 'inscription') => ApplicationItem[];
  getTotalAmount: () => number;
  getTaxAmount: () => number;
  getGrandTotal: () => number;
}

export const useApplicationItems = (): UseApplicationItemsReturn => {
  const [applicationItems, setApplicationItems] = useState<ApplicationItemsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplicationItems = useCallback(async (applicationCode: string) => {
    if (!applicationCode.trim()) {
      clearApplicationItems();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = await invoiceService.getApplicationItems(applicationCode.trim());
      setApplicationItems(items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch application items');
      setApplicationItems(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearApplicationItems = useCallback(() => {
    setApplicationItems(null);
    setError(null);
    setLoading(false);
  }, []);

  const getItemsByType = useCallback((type: 'niche' | 'inscription'): ApplicationItem[] => {
    if (!applicationItems) return [];
    return applicationItems.items.filter(item => item.itemType === type);
  }, [applicationItems]);

  const getTotalAmount = useCallback((): number => {
    if (!applicationItems) return 0;
    return applicationItems.summary.subtotal;
  }, [applicationItems]);

  const getTaxAmount = useCallback((): number => {
    if (!applicationItems) return 0;
    return applicationItems.summary.totalTax;
  }, [applicationItems]);

  const getGrandTotal = useCallback((): number => {
    if (!applicationItems) return 0;
    return applicationItems.summary.grandTotal;
  }, [applicationItems]);

  return {
    applicationItems,
    loading,
    error,
    fetchApplicationItems,
    clearApplicationItems,
    getItemsByType,
    getTotalAmount,
    getTaxAmount,
    getGrandTotal,
  };
};