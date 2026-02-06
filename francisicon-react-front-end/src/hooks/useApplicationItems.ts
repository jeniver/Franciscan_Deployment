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
      // ✅ FIX: Use getInvoiceByCode instead of getApplicationItems for inscription codes
      // The getInvoiceByCode endpoint can handle both invoices and applications including inscription codes
      const invoiceData = await invoiceService.getInvoiceByCode(applicationCode.trim());
      
      // Transform invoice data to application items format if it's application data
      if (invoiceData.isApplicationData) {
        const transformedItems: ApplicationItemsResponse = {
          applicationCode: invoiceData.applicationCode || applicationCode,
          items: invoiceData.details?.map((detail, index) => ({
            id: index + 1,
            itemType: detail.refDocName === 'INCR' ? 'inscription' : 'niche',
            description: detail.itemName || 'Item',
            quantity: detail.quantity || 1,
            unitPrice: detail.unitAmount || 0,
            totalAmount: detail.lineTotalAmount || 0,
            taxAmount: detail.lineTaxAmount || 0,
            grandTotal: detail.totalPayingAmount || 0,
            reference: detail.refDocNumber || '',
            refType: detail.refType || '',
            itemId: detail.itemId || undefined,
            applicationCode: invoiceData.applicationCode || applicationCode
          })) || [],
          summary: {
            subtotal: invoiceData.totalAmount || 0,
            totalTax: invoiceData.taxAmount || 0,
            grandTotal: invoiceData.payingAmount || 0,
            totalItems: invoiceData.details?.length || 0
          },
          references: {
            NAPP: invoiceData.details?.filter(d => d.refDocName === 'NAPP').map(d => d.refDocNumber || '') || [],
            INCR: invoiceData.details?.filter(d => d.refDocName === 'INCR').map(d => d.refDocNumber || '') || []
          },
          totalItems: invoiceData.details?.length || 0
        };
        
        setApplicationItems(transformedItems);
      } else {
        // If it's an invoice, we can still extract items from it
        const transformedItems: ApplicationItemsResponse = {
          applicationCode: invoiceData.refDocNumber || applicationCode,
          items: invoiceData.details?.map((detail, index) => ({
            id: index + 1,
            itemType: detail.refDocName === 'INCR' ? 'inscription' : 'niche',
            description: detail.itemName || 'Item',
            quantity: detail.quantity || 1,
            unitPrice: detail.unitAmount || 0,
            totalAmount: detail.lineTotalAmount || 0,
            taxAmount: detail.lineTaxAmount || 0,
            grandTotal: detail.totalPayingAmount || 0,
            reference: detail.refDocNumber || '',
            refType: detail.refType || '',
            itemId: detail.itemId || undefined,
            applicationCode: invoiceData.refDocNumber || applicationCode
          })) || [],
          summary: {
            subtotal: invoiceData.totalAmount || 0,
            totalTax: invoiceData.taxAmount || 0,
            grandTotal: invoiceData.payingAmount || 0,
            totalItems: invoiceData.details?.length || 0
          },
          references: {
            NAPP: invoiceData.details?.filter(d => d.refDocName === 'NAPP').map(d => d.refDocNumber || '') || [],
            INCR: invoiceData.details?.filter(d => d.refDocName === 'INCR').map(d => d.refDocNumber || '') || []
          },
          totalItems: invoiceData.details?.length || 0
        };
        
        setApplicationItems(transformedItems);
      }
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
    return typeof applicationItems.summary?.subtotal === 'number' ? applicationItems.summary.subtotal : 0;
  }, [applicationItems]);

  const getTaxAmount = useCallback((): number => {
    if (!applicationItems) return 0;
    return typeof applicationItems.summary?.totalTax === 'number' ? applicationItems.summary.totalTax : 0;
  }, [applicationItems]);

  const getGrandTotal = useCallback((): number => {
    if (!applicationItems) return 0;
    return typeof applicationItems.summary?.grandTotal === 'number' ? applicationItems.summary.grandTotal : 0;
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