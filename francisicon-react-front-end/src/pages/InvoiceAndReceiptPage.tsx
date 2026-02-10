import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Layout } from '../components/Layout';
import { useReceipt } from '../hooks/useReceipt';
import { useToast } from '../contexts/ToastContext';
import { useApplicationItems } from '../hooks/useApplicationItems';
import { addressService } from '../services/addressService';
import { parseRawAddress } from '../components/AddressInput';
import api from '../services/api';
import { PrinterIcon, EyeIcon, LoaderIcon, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { InvoiceViewerModal } from '../components/InvoiceViewerModal';
import { ReceiptDetailModal } from '../components/ReceiptDetailModal';
import { AgreementViewerModal } from '../components/AgreementViewerModal';
import authService from '../services/authService';
import { InvoiceTemplateData } from '../services/invoiceTemplateService';
import { receiptService, type Receipt as ReceiptType, type InvoiceDetail } from '../services/receiptService';
import type { AppDispatch, RootState } from '../store';
import {
  fetchInvoiceOrApplication,
  fetchCombinedInvoiceReceiptData,
  clearCurrentData,
  resetCreateStatus,
  createInvoice,
} from '../store/invoiceSlice';

interface InvoiceItem {
  id: string;
  selectItem: string;
  reference: string;
  defaultAmount: number;
  amountPaying: number;
  quantity: number;
  totalNoTax: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
}

// Default fallback items if API fails
const DEFAULT_ITEM_OPTIONS = [
  'Level 3 Niche',
  'Niche Inscription Both Name',
  'Urn (Brass praying hands)',
  'Booking of La Verna Room',
  'Clearing fees',
  'Other'
];

const PAYMENT_MODES = ['Cash', 'Cheque', 'Bank Transfer', 'Credit Card', 'Other'];

export function InvoiceAndReceiptPage() {
  const location = useLocation();
  const { invoiceCode: routeCode } = useParams<{ invoiceCode?: string }>(); // Get code from route parameter
  const navigate = useNavigate(); // For dynamic route updates
  const { showSuccess, showError } = useToast();
  const dispatch = useDispatch<AppDispatch>();
  
  // Application items hook
  const {
    applicationItems,
    loading: applicationItemsLoading,
    error: applicationItemsError,
    fetchApplicationItems,
    clearApplicationItems,
    getItemsByType,
    getTotalAmount,
    getTaxAmount,
    getGrandTotal,
  } = useApplicationItems();

  const {
    currentData,
    loading: invoiceLoading,
    error: invoiceError,
    creatingInvoice,
    createInvoiceSuccess,
    createReceiptSuccess,
    lastCreatedInvoiceCode,
    lastCreatedReceiptCode,
  } = useSelector((state: RootState) => state.invoice);

  const { 
    fetchLastReceiptNumber, 
    fetchReceiptItems,
    lastReceiptNumber,
    receiptItems,
    selectedReceipt,
    setSelectedReceipt,
    loading 
  } = useReceipt();
  
  // Get application number from route state if available
  const routeState = location.state as { applicationNumber?: string } | null;
  const applicationNumberFromRoute = routeState?.applicationNumber || '';

  const [applicationNumber, setApplicationNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiptCode, setReceiptCode] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [receiptStatus] = useState('Active');
  const [payeeName, setPayeeName] = useState('');
  const [viewingInvoiceCode, setViewingInvoiceCode] = useState<string | null>(null);
  const [viewingReceiptCode, setViewingReceiptCode] = useState<string | null>(null);
  const [addressBlock, setAddressBlock] = useState('Block');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressUnit, setAddressUnit] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');
  const [addressCountry, setAddressCountry] = useState('Singapore');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  // Invoice viewer modal state
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
  const [viewerInvoiceData, setViewerInvoiceData] = useState<InvoiceTemplateData | null>(null);

  // Receipt detail modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Agreement viewer modal state
  const [isAgreementViewerOpen, setIsAgreementViewerOpen] = useState(false);
  const [agreementData, setAgreementData] = useState<any | null>(null);
  const [secondNomineeAgreementData, setSecondNomineeAgreementData] = useState<any | null>(null);
  
  // Ref for debouncing postal code lookup
  const postalCodeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get available items for dropdown (from Redux or fallback)
  const availableItems = useMemo(() => 
    receiptItems.length > 0 
      ? receiptItems.map(item => item.itemName || item.description || '').filter(Boolean)
      : DEFAULT_ITEM_OPTIONS,
    [receiptItems]
  );

  // Parse address string into separate fields using common parser
  const applyParsedAddress = useCallback((addressString: string) => {
    if (!addressString || !addressString.trim()) return;

    const parsed = parseRawAddress(addressString);

    if (parsed.block) {
      setAddressBlock(parsed.block);
    }
    if (parsed.blockNo) {
      setAddressNumber(parsed.blockNo);
    }
    if (parsed.streetName) {
      setAddressStreet(parsed.streetName);
    }
    if (parsed.unitNo) {
      setAddressUnit(parsed.unitNo);
    }
    if (parsed.postalCode) {
      setAddressPostalCode(parsed.postalCode);
    }
    if (parsed.country) {
      setAddressCountry(parsed.country);
    }
  }, []);

  // Handle postal code change with auto-fill
  const handlePostalCodeChange = useCallback((value: string) => {
    setAddressPostalCode(value);
    
    // Clear existing debounce
    if (postalCodeDebounceRef.current) {
      clearTimeout(postalCodeDebounceRef.current);
    }
    
    // Debounce the lookup (800ms delay)
    postalCodeDebounceRef.current = setTimeout(async () => {
      const cleanPostalCode = value.replace(/\s+/g, '').trim();
      if (cleanPostalCode.length >= 4) {
        try {
          const result = await addressService.searchByPostalCode(cleanPostalCode);
          if (result) {
            if (result.blockNo) setAddressNumber(result.blockNo);
            if (result.streetName) setAddressStreet(result.streetName);
            if (result.unitNo) setAddressUnit(result.unitNo);
            if (result.postalCode) setAddressPostalCode(result.postalCode);
            if (result.country) setAddressCountry(result.country);
          }
        } catch (error) {
          console.error('Error looking up address by postal code:', error);
        }
      }
    }, 800);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (postalCodeDebounceRef.current) {
        clearTimeout(postalCodeDebounceRef.current);
      }
    };
  }, []);

  const clearFormFields = useCallback(() => {
    setInvoiceNumber('');
    setPayeeName('');
    setPaymentMode('Cash');

    setAddressBlock('Block');
    setAddressNumber('');
    setAddressStreet('');
    setAddressUnit('');
    setAddressPostalCode('');
    setAddressCountry('Singapore');

    setItems([]);
    setTransactionDate(new Date().toLocaleDateString('en-GB'));
  }, []);

  const handleApplicationNumberChange = useCallback(
    (value: string) => {
      setApplicationNumber(value);
      clearFormFields();
      dispatch(clearCurrentData());
      
      // Fetch application items when application code is entered
      if (value.trim()) {
        fetchApplicationItems(value.trim());
      } else {
        clearApplicationItems();
      }
    },
    [clearFormFields, dispatch, fetchApplicationItems, clearApplicationItems]
  );

  // Populate UI from invoiceSlice currentData (invoice OR application fallback)
  useEffect(() => {
    if (!currentData) return;

    // Basic fields - improved mapping with proper type handling
    const currentDataAny: any = currentData;
    setPayeeName(currentData.customerName || currentDataAny.payeeName || '');
    
    // Map payment mode properly - handle different field names
    const paymentModeValue = currentData.paymentMode || 
                           currentDataAny.PaymentMode ||
                           'Cash';
                           
    // Convert backend payment modes to frontend values
    let frontendPaymentMode = 'Cash'; // default
    if (paymentModeValue) {
      const normalizedMode = paymentModeValue.trim().toLowerCase();
      if (normalizedMode === 'cash') {
        frontendPaymentMode = 'Cash';
      } else if (normalizedMode === 'cheque') {
        frontendPaymentMode = 'Cheque';
      } else if (normalizedMode === 'tt' || normalizedMode === 'bank transfer') {
        frontendPaymentMode = 'Bank Transfer';
      } else if (normalizedMode === 'credit card') {
        frontendPaymentMode = 'Credit Card';
      } else if (normalizedMode === 'others' || normalizedMode === 'other') {
        frontendPaymentMode = 'Other';
      } else {
        // Use the original value if it matches our options
        if (PAYMENT_MODES.includes(paymentModeValue)) {
          frontendPaymentMode = paymentModeValue;
        }
      }
    }
    setPaymentMode(frontendPaymentMode);

    // Only set invoice number when it is truly an invoice
    setInvoiceNumber(currentData.isInvoice ? (currentData.code || currentDataAny.invoiceCode || '') : '');

    // Date - improved parsing
    if (currentData.transactionDate || currentDataAny.TransactionDate) {
      const dateValue = currentData.transactionDate || currentDataAny.TransactionDate;
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        setTransactionDate(`${day}-${month}-${year}`);
      }
    }

    // Address mapping - handle both individual fields and combined address
    // Priority: individual address fields > combined address field
    if (currentData.addressNo || currentData.address || currentData.address2 || 
        currentData.addressCity || currentData.country) {
      // Map individual address fields from backend
      if (currentData.addressNo) {
        setAddressNumber(currentData.addressNo);
      }
      if (currentData.address) {
        setAddressStreet(currentData.address);
      }
      if (currentData.address2) {
        setAddressUnit(currentData.address2);
      }
      if (currentData.addressCity) {
        setAddressPostalCode(currentData.addressCity);
      }
      if (currentData.country) {
        setAddressCountry(currentData.country);
      }
    } else if (currentData.address) {
      // Fallback: parse combined address string
      applyParsedAddress(currentData.address);
    }

    // Details → table items mapping - improved handling
    const invoiceDetails = currentData.details || currentDataAny.Details || [];
    const mapped: InvoiceItem[] = Array.isArray(invoiceDetails)
      ? invoiceDetails.map((d: any, idx) => {
          // Find matching receipt item for proper dropdown selection
          const matchedReceiptItem = receiptItems.find((ri) => 
            ri.itemId === d.itemId || 
            ri.itemId === d['ItemId'] ||
            ri.itemName === (d.itemName || d['ItemName']) ||
            ri.description === (d.itemName || d['ItemName'])
          );

          // Match dropdown option - prioritize exact match, then partial match, then default
          const itemName = d.itemName || d['ItemName'] || '';
          const optionMatch = 
            availableItems.find((opt) => 
              opt.trim().toLowerCase() === itemName.trim().toLowerCase()
            ) ||
            (matchedReceiptItem?.itemName as string | undefined) ||
            (matchedReceiptItem?.description as string | undefined) ||
            availableItems[0] ||
            'Other';

          // Extract pricing information with proper fallbacks
          const unitAmount = d.unitAmount ?? d['UnitAmount'] ?? d.itemPrice ?? d['ItemPrice'] ?? d.payingAmount ?? d['PayingAmount'] ?? 0;
          const quantity = d.quantity ?? d['Quantity'] ?? 1;
          const lineTotalAmount = d.lineTotalAmount ?? d['LineTotalAmount'] ?? (unitAmount * quantity);
          const taxPercent = d.lineTaxPercent ?? d['LineTaxPercent'] ?? 9;
          const taxAmount = d.lineTaxAmount ?? d['LineTaxAmount'] ?? (lineTotalAmount * taxPercent / 100);
          const totalAmount = d.totalPayingAmount ?? d['TotalPayingAmount'] ?? (lineTotalAmount + taxAmount);

          return {
            id: `invline-${idx}-${Date.now()}`,
            selectItem: optionMatch,
            reference: d.refDocNumber || d['RefDocNumber'] || d.reference || '',
            defaultAmount: unitAmount,
            amountPaying: unitAmount,
            quantity: quantity,
            totalNoTax: lineTotalAmount,
            taxPercent: taxPercent,
            taxAmount: taxAmount,
            totalAmount: totalAmount,
          };
        })
      : [];

    setItems(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentData, applyParsedAddress, receiptItems]);

  useEffect(() => {
    if (createInvoiceSuccess && lastCreatedInvoiceCode) {
      showSuccess('Success', `Invoice created: ${lastCreatedInvoiceCode}`);
      dispatch(resetCreateStatus());
      // Refresh view with newly created invoice code
      dispatch(fetchInvoiceOrApplication(lastCreatedInvoiceCode));
      
      // Automatically open the invoice viewer after successful creation
      setInvoiceNumber(lastCreatedInvoiceCode);
      
      // Small delay to ensure data is loaded before opening viewer
      setTimeout(() => {
        // Recalculate totals for the current items
        const calculatedTotals = {
          total: items.reduce((sum, item) => sum + item.totalNoTax, 0),
          taxAmount: items.reduce((sum, item) => sum + item.taxAmount, 0),
          totalPayable: items.reduce((sum, item) => sum + item.totalAmount, 0),
        };
        
        // Calculate customer address directly
        const customerAddressParts: string[] = [];
        if (addressBlock && addressNumber) {
          customerAddressParts.push(`${addressBlock} ${addressNumber}`);
        }
        if (addressStreet) {
          customerAddressParts.push(addressStreet);
        }
        if (addressUnit) {
          customerAddressParts.push(addressUnit);
        }
        if (addressPostalCode) {
          customerAddressParts.push(addressPostalCode);
        }
        if (addressCountry) {
          customerAddressParts.push(addressCountry);
        }
        const customerAddress = customerAddressParts.join(', ') || '';
        
        // Format transaction date
        let formattedDate = transactionDate;
        try {
          if (transactionDate && transactionDate.includes('-')) {
            const parts = transactionDate.split('-');
            if (parts.length === 3) {
              const [day, month, year] = parts;
              const dateObj = new Date(`${year}-${month}-${day}`);
              if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toLocaleDateString('en-SG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
              }
            }
          } else if (transactionDate) {
            const dateObj = new Date(transactionDate);
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toLocaleDateString('en-SG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            }
          }
        } catch (error) {
          console.warn('Error formatting date:', error);
        }

        // Map items to template items
        const templateItems = items.map(item => ({
          description: item.selectItem || 'Item',
          quantity: item.quantity || 1,
          unitPrice: item.amountPaying || 0,
          amount: item.totalAmount || 0,
        }));

        const templateData: InvoiceTemplateData = {
          invoiceCode: lastCreatedInvoiceCode,
          invoiceDate: formattedDate,
          customerName: payeeName || 'N/A',
          customerAddress: customerAddress || undefined,
          paymentMode: paymentMode || undefined,
          totalAmount: calculatedTotals.totalPayable || 0,
          taxAmount: calculatedTotals.taxAmount || 0,
          items: templateItems.length > 0 ? templateItems : undefined,
        };

        setViewerInvoiceData(templateData);
        setIsInvoiceViewerOpen(true);
      }, 500); // Delay to allow state updates
    }
  }, [createInvoiceSuccess, lastCreatedInvoiceCode, dispatch, showSuccess, payeeName, paymentMode, items, transactionDate, addressBlock, addressNumber, addressStreet, addressUnit, addressPostalCode, addressCountry]);

  useEffect(() => {
    if (createReceiptSuccess && lastCreatedReceiptCode) {
      showSuccess('Success', `Receipt created: ${lastCreatedReceiptCode}`);
      dispatch(resetCreateStatus());
      
      // Update the receipt code state
      setReceiptCode(lastCreatedReceiptCode);
      
      // Automatically open the receipt viewer after successful creation
      setTimeout(() => {
        // Build receipt data for the viewer
        const parseTransactionDateToIso = (d: string): string | undefined => {
          if (!d) return undefined;
          // common UI format is DD-MM-YYYY
          const m = d.match(/^\d{2}-\d{2}-\d{4}$/);
          if (m) {
            const [dd, mm, yyyy] = d.split('-');
            return `${yyyy}-${mm}-${dd}`;
          }
          // last resort: let Date parse it
          const dateObj = new Date(d);
          if (!isNaN(dateObj.getTime())) return dateObj.toISOString();
          return d;
        };

        // Recalculate totals for the current items
        const calculatedTotals = {
          total: items.reduce((sum, item) => sum + item.totalNoTax, 0),
          taxAmount: items.reduce((sum, item) => sum + item.taxAmount, 0),
          totalPayable: items.reduce((sum, item) => sum + item.totalAmount, 0),
        };

        const invoiceDetails: InvoiceDetail[] = items.map((item) => ({
          description: item.selectItem || 'Item',
          quantity: item.quantity || 1,
          unitPrice: item.amountPaying || 0,
          amount: item.totalAmount || 0,
        }));

        const receipt: ReceiptType = {
          receiptCode: lastCreatedReceiptCode,
          invoiceCode: lastCreatedInvoiceCode || undefined,
          applicationCode: applicationNumber || applicationNumberFromRoute || undefined,
          customerName: payeeName || currentData?.customerName || 'N/A',
          totalAmount: calculatedTotals.totalPayable || 0,
          payingAmount: calculatedTotals.totalPayable || 0,
          paymentMode: paymentMode || 'Cash',
          receiptDate: parseTransactionDateToIso(transactionDate),
          invoiceDetails,
        };

        setSelectedReceipt(receipt);
        setIsDetailModalOpen(true);
      }, 500); // Delay to allow state updates
    }
  }, [createReceiptSuccess, lastCreatedReceiptCode, lastCreatedInvoiceCode, dispatch, showSuccess, payeeName, paymentMode, items, transactionDate, applicationNumber, currentData]);

  useEffect(() => {
    if (invoiceError) {
      showError('Error', invoiceError);
    }
  }, [invoiceError, showError]);

  // Handle application items error
  useEffect(() => {
    if (applicationItemsError) {
      showError('Error', applicationItemsError);
    }
  }, [applicationItemsError, showError]);

  // Handle view invoice by application number
  const handleViewInvoiceByApplication = async (appNumber: string) => {
    if (!appNumber.trim()) {
      return;
    }
    
    try {
      await dispatch(fetchCombinedInvoiceReceiptData(appNumber.trim())).unwrap();
      // UI will populate from `currentData` effect
    } catch (error: any) {
      showError('Error', error?.message || String(error) || 'Failed to load invoice/application');
    }
  };

  // Handle viewing invoice/receipt by code - this handles all code types
  const handleViewByCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      return;
    }
    
    try {
      // Dispatch action to fetch combined data by code
      await dispatch(fetchCombinedInvoiceReceiptData(code.trim())).unwrap();
      
      // Update the URL to reflect the searched code
      navigate(`/1/invoice-receipt/${encodeURIComponent(code.trim())}`, { replace: true });
    } catch (error: any) {
      showError('Error', error?.message || String(error) || 'Failed to load invoice/application');
    }
  }, [dispatch, navigate, showError]);

  // Initialize with sample data or load from backend
  useEffect(() => {
    // Dispatch action to fetch last receipt number (this updates Redux state)
    fetchLastReceiptNumber();

    // Fetch receipt items on component mount - using a default receipt ID
    // This will populate the dropdown with all available items
    // Note: Adjust the default ID based on your requirements, or fetch all items if API supports it
    const defaultReceiptId = '567'; // Default fallback ID
    fetchReceiptItems(defaultReceiptId, true).catch((error) => {
      // Silently fail - will use default items
      console.warn('Failed to fetch receipt items, using defaults:', error);
    });

    // If application number is provided from route state, auto-fetch invoice data
    if (applicationNumberFromRoute) {
      setApplicationNumber(applicationNumberFromRoute);
      // Auto-fetch invoice using application number as invoice code
      handleViewInvoiceByApplication(applicationNumberFromRoute);
    }
    // If code is provided from route parameter, auto-fetch data
    else if (routeCode) {
      setApplicationNumber(routeCode);
      // Auto-fetch data using the route code parameter
      handleViewByCode(routeCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLastReceiptNumber, fetchReceiptItems, applicationNumberFromRoute, routeCode]);

  // Helper function to safely extract string value from lastReceiptNumber
  // It might be a string, null, or an object with {success, data} structure
  const getLastReceiptNumberString = (): string => {
    if (!lastReceiptNumber) return 'N/A';
    if (typeof lastReceiptNumber === 'string') return lastReceiptNumber;
    if (typeof lastReceiptNumber === 'object') {
      const lastReceiptAny = lastReceiptNumber as any;
      // Handle object with data property
      if ('data' in lastReceiptAny && typeof lastReceiptAny.data === 'string') {
        return lastReceiptAny.data;
      }
      // Handle object with lastNumber property
      if ('lastNumber' in lastReceiptAny && typeof lastReceiptAny.lastNumber === 'string') {
        return lastReceiptAny.lastNumber;
      }
      // Handle object with success and data
      if ('success' in lastReceiptAny && 'data' in lastReceiptAny) {
        const data = lastReceiptAny.data;
        if (typeof data === 'string') return data;
        if (typeof data === 'object' && data?.lastNumber) return String(data.lastNumber);
      }
    }
    // Fallback: convert to string
    return String(lastReceiptNumber);
  };

  // Build customer address string from address fields
  const buildCustomerAddress = useCallback(() => {
    const parts: string[] = [];
    if (addressBlock && addressNumber) {
      parts.push(`${addressBlock} ${addressNumber}`);
    }
    if (addressStreet) {
      parts.push(addressStreet);
    }
    if (addressUnit) {
      parts.push(addressUnit);
    }
    if (addressPostalCode) {
      parts.push(addressPostalCode);
    }
    if (addressCountry) {
      parts.push(addressCountry);
    }
    return parts.join(', ') || '';
  }, [addressBlock, addressNumber, addressStreet, addressUnit, addressPostalCode, addressCountry]);

  // Calculate totals
  const totals = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.totalNoTax, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalPayable = items.reduce((sum, item) => sum + item.totalAmount, 0);
    return {
      total,
      taxAmount,
      totalPayable,
      totalDonation: totalPayable // Assuming same as total payable for now
    };
  }, [items]);

  // Handle item calculations
  const updateItemCalculation = useCallback((itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== itemId) return item;
      
      const updated = { ...item, [field]: value };
      
      // When an item is selected from dropdown, set defaultAmount and amountPaying from Price
      if (field === 'selectItem' && typeof value === 'string') {
        // Find the corresponding item in receiptItems by matching itemName
        const selectedReceiptItem = receiptItems.find(
          receiptItem => receiptItem.itemName === value || receiptItem.description === value
        );
        
        if (selectedReceiptItem) {
          // Use unitPrice or defaultAmount (both should be the same as they come from Price in API)
          const itemPrice = selectedReceiptItem.unitPrice ?? selectedReceiptItem.defaultAmount ?? 0;
          
          // Set defaultAmount and amountPaying to the item's Price
          updated.defaultAmount = itemPrice;
          updated.amountPaying = itemPrice;
          
          // Recalculate dependent fields based on the new amountPaying
          updated.totalNoTax = updated.amountPaying * updated.quantity;
          updated.taxAmount = (updated.totalNoTax * updated.taxPercent) / 100;
          updated.totalAmount = updated.totalNoTax + updated.taxAmount;
        }
      }
      
      // Recalculate dependent fields
      if (field === 'amountPaying' || field === 'quantity' || field === 'taxPercent') {
        updated.totalNoTax = updated.amountPaying * updated.quantity;
        updated.taxAmount = (updated.totalNoTax * updated.taxPercent) / 100;
        updated.totalAmount = updated.totalNoTax + updated.taxAmount;
      }
      
      return updated;
    }));
  }, [receiptItems]);

  // Add new item
  const handleAddItem = useCallback(() => {
    const selectedItemName = availableItems[0] || 'Other';
    
    // Find the corresponding item in receiptItems to get its Price
    const selectedReceiptItem = receiptItems.find(
      receiptItem => receiptItem.itemName === selectedItemName || receiptItem.description === selectedItemName
    );
    
    // Get the Price from the selected item, default to 0 if not found
    const itemPrice = selectedReceiptItem?.unitPrice ?? selectedReceiptItem?.defaultAmount ?? 0;
    
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      selectItem: selectedItemName,
      reference: '',
      defaultAmount: itemPrice,
      amountPaying: itemPrice,
      quantity: 1,
      totalNoTax: itemPrice * 1, // amountPaying * quantity
      taxPercent: 9,
      taxAmount: (itemPrice * 1 * 9) / 100, // (totalNoTax * taxPercent) / 100
      totalAmount: itemPrice * 1 + (itemPrice * 1 * 9) / 100 // totalNoTax + taxAmount
    };
    setItems(prevItems => [...prevItems, newItem]);
  }, [availableItems, receiptItems]);

  // Remove item
  const handleRemoveItem = useCallback((itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);

  // Handle view invoice (for manual entry)
  const handleViewInvoice = async () => {
    if (!applicationNumber.trim()) {
      showError('Error', 'Please enter an application number');
      return;
    }
    
    await handleViewInvoiceByApplication(applicationNumber.trim());
  };

  const normalizePaymentModeForBackend = (mode: string): string => {
    const m = (mode || '').trim();
    if (!m) return 'Cash';
    // UI uses "Bank Transfer" etc; backend invoice expects: Cash, Cheque, TT, Credit Card, Others
    if (m === 'Bank Transfer') return 'TT';
    if (m === 'Other') return 'Others';
    return m;
  };

  const handleGenerateInvoice = async (withReceipt: boolean) => {
    // Handle case where user entered application number but hasn't loaded data yet
    if (!currentData && applicationNumber.trim()) {
      try {
        // Load the application data first
        await handleViewInvoiceByApplication(applicationNumber.trim());
        
        // Wait a bit for Redux state to update, then try again
        setTimeout(async () => {
          // Get the updated state
          const updatedState = (await import('../store')).store.getState();
          const updatedCurrentData = updatedState.invoice.currentData;
          const updatedCurrentDataAny: any = updatedCurrentData;
          
          if (!updatedCurrentData) {
            showError('Error', 'Failed to load application data. Please try again.');
            return;
          }
          
          // Check if invoice can be created for this data
          const canCreate = updatedCurrentData.canCreateInvoice || 
                           (!updatedCurrentData.isInvoice && updatedCurrentData.applicationCode);
          
          if (!canCreate) {
            showError('Error', 'Invoice cannot be created for this record');
            return;
          }
          
          // Now proceed with the original logic using the loaded data
          if (!paymentMode.trim()) {
            showError('Error', 'Please select payment mode');
            return;
          }

          // Map the current UI items to invoice details with improved field mapping
          const mappedInvoiceDetails = items.map(item => {
            // Find the corresponding receipt item to get the itemId
            const receiptItem = receiptItems.find(ri => ri.itemName === item.selectItem || ri.description === item.selectItem);
            
            return {
              itemId: receiptItem?.itemId || 0, // Use 0 as fallback if not found
              quantity: item.quantity,
              unitAmount: item.amountPaying,
              payingAmount: item.amountPaying,
              totalPayingAmount: item.totalAmount,
              refDocNumber: item.reference || '',
              refDocName: updatedCurrentData.refDocName || updatedCurrentDataAny.refDocName || 'NAPP',
              lineTotalAmount: item.totalNoTax,
              lineTaxPercent: item.taxPercent,
              lineTaxAmount: item.taxAmount,
            };
          });

          // Handle address fields properly
          const addressData = {
            addressNo: addressNumber || updatedCurrentData.addressNo || updatedCurrentDataAny.addressNo,
            address: addressStreet || updatedCurrentData.address || updatedCurrentDataAny.address,
            address2: addressUnit || updatedCurrentData.address2 || updatedCurrentDataAny.address2,
            addressCity: addressPostalCode || updatedCurrentData.addressCity || updatedCurrentDataAny.addressCity,
            districtCode: updatedCurrentData.districtCode || updatedCurrentDataAny.districtCode,
            country: addressCountry || updatedCurrentData.country || updatedCurrentDataAny.country,
          };

          const invoicePayload = {
            invoice: {
              transactionDate: updatedCurrentData.transactionDate || updatedCurrentDataAny.TransactionDate || new Date().toISOString(),
              refDocNumber: updatedCurrentData.applicationCode || updatedCurrentData.refDocNumber || updatedCurrentDataAny.RefDocNumber || applicationNumber.trim(),
              refDocName: updatedCurrentData.refDocName || updatedCurrentDataAny.RefDocName || 'NAPP',
              customerName: payeeName || updatedCurrentData.customerName || updatedCurrentDataAny.CustomerName,
              totalAmount: totals.totalPayable || updatedCurrentData.totalAmount || updatedCurrentDataAny.TotalAmount || updatedCurrentData.summary?.grandTotal || 0,
              payingAmount: totals.totalPayable || updatedCurrentData.payingAmount || updatedCurrentDataAny.PayingAmount || updatedCurrentData.summary?.grandTotal || 0,
              taxAmount: totals.taxAmount || updatedCurrentData.taxAmount || updatedCurrentDataAny.TaxAmount || updatedCurrentData.summary?.totalTax || 0,
              taxPercentage: updatedCurrentData.taxPercentage || updatedCurrentDataAny.TaxPercentage || 9,
              taxCode: updatedCurrentData.taxCode || updatedCurrentDataAny.TaxCode || null,
              nicheApplicationId: updatedCurrentData.nicheApplicationId || updatedCurrentDataAny.NicheApplicationId,
              ...addressData,
              paymentMode: normalizePaymentModeForBackend(paymentMode),
            },
            invoiceDetails: mappedInvoiceDetails,
            createReceipt: withReceipt,
          };

          try {
            await dispatch(createInvoice(invoicePayload)).unwrap();
          } catch (e: any) {
            showError('Error', e?.message || String(e) || 'Failed to create invoice');
          }
        }, 500);
        
        return;
      } catch (error: any) {
        showError('Error', error?.message || 'Failed to load application data');
        return;
      }
    }
    
    // Original logic for when data is already loaded
    if (!applicationNumber.trim()) {
      showError('Error', 'Application number is required');
      return;
    }
    if (!currentData) {
      showError('Error', 'Please load application data first by clicking "View Data"');
      return;
    }
    // Check if invoice can be created for this data
    const canCreate = currentData.canCreateInvoice || 
                     (!currentData.isInvoice && currentData.applicationCode);
    
    if (!canCreate) {
      showError('Error', 'Invoice cannot be created for this record');
      return;
    }
    if (!paymentMode.trim()) {
      showError('Error', 'Please select payment mode');
      return;
    }

    // Map the current UI items to invoice details with improved field mapping
    const mappedInvoiceDetails = items.map(item => {
      // Find the corresponding receipt item to get the itemId
      const receiptItem = receiptItems.find(ri => ri.itemName === item.selectItem || ri.description === item.selectItem);
      
      return {
        itemId: receiptItem?.itemId || 0, // Use 0 as fallback if not found
        quantity: item.quantity,
        unitAmount: item.amountPaying,
        payingAmount: item.amountPaying,
        totalPayingAmount: item.totalAmount,
        refDocNumber: item.reference || '',
        refDocName: currentData.refDocName || (currentData as any).RefDocName || 'NAPP',
        lineTotalAmount: item.totalNoTax,
        lineTaxPercent: item.taxPercent,
        lineTaxAmount: item.taxAmount,
      };
    });

    // Handle address fields properly
    const currentDataAny: any = currentData;
    const addressData = {
      addressNo: addressNumber || currentData.addressNo || currentDataAny.addressNo,
      address: addressStreet || currentData.address || currentDataAny.address,
      address2: addressUnit || currentData.address2 || currentDataAny.address2,
      addressCity: addressPostalCode || currentData.addressCity || currentDataAny.addressCity,
      districtCode: currentData.districtCode || currentDataAny.districtCode,
      country: addressCountry || currentData.country || currentDataAny.country,
    };

    const invoicePayload = {
      invoice: {
        transactionDate: currentData.transactionDate || currentDataAny.TransactionDate || new Date().toISOString(),
        refDocNumber: currentData.applicationCode || currentData.refDocNumber || currentDataAny.RefDocNumber || applicationNumber.trim(),
        refDocName: currentData.refDocName || currentDataAny.RefDocName || 'NAPP',
        customerName: payeeName || currentData.customerName || currentDataAny.CustomerName,
        totalAmount: totals.totalPayable || currentData.totalAmount || currentDataAny.TotalAmount || currentData.summary?.grandTotal || 0,
        payingAmount: totals.totalPayable || currentData.payingAmount || currentDataAny.PayingAmount || currentData.summary?.grandTotal || 0,
        taxAmount: totals.taxAmount || currentData.taxAmount || currentDataAny.TaxAmount || currentData.summary?.totalTax || 0,
        taxPercentage: currentData.taxPercentage || currentDataAny.TaxPercentage || 9,
        taxCode: currentData.taxCode || currentDataAny.TaxCode || null,
        nicheApplicationId: currentData.nicheApplicationId || currentDataAny.NicheApplicationId,
        ...addressData,
        paymentMode: normalizePaymentModeForBackend(paymentMode),
      },
      invoiceDetails: mappedInvoiceDetails,
      createReceipt: withReceipt,
    };

    try {
      await dispatch(createInvoice(invoicePayload)).unwrap();
    } catch (e: any) {
      showError('Error', e?.message || String(e) || 'Failed to create invoice');
    }
  };

  // Generate receipt from application code directly
  const handleGenerateReceipt = async () => {
    // Handle case where user entered application number but hasn't loaded data yet
    if (!currentData && applicationNumber.trim()) {
      try {
        // Load the application data first
        await handleViewInvoiceByApplication(applicationNumber.trim());
        
        // Wait a bit for Redux state to update, then try again
        setTimeout(async () => {
          // Get the updated state
          const updatedState = (await import('../store')).store.getState();
          const updatedCurrentData = updatedState.invoice.currentData;
          const updatedCurrentDataAny: any = updatedCurrentData;
          
          if (!updatedCurrentData) {
            showError('Error', 'Failed to load application data. Please try again.');
            return;
          }
          
          if (!updatedCurrentData.canCreateReceipt) {
            showError('Error', 'Receipt cannot be created for this record');
            return;
          }
          
          if (!paymentMode.trim()) {
            showError('Error', 'Please select payment mode');
            return;
          }

          // Map the current UI items to receipt details
          const receiptDetails = items.map(item => {
            // Find the corresponding receipt item to get the itemId
            const receiptItem = receiptItems.find(ri => ri.itemName === item.selectItem || ri.description === item.selectItem);
            
            return {
              itemId: receiptItem?.itemId || 0, // Use 0 as fallback if not found
              quantity: item.quantity,
              unitAmount: item.amountPaying,
              payingAmount: item.amountPaying,
              totalPayingAmount: item.totalAmount,
              refDocNumber: item.reference || '',
              refDocName: updatedCurrentData.refDocName || updatedCurrentDataAny.refDocName || 'NAPP',

              outstandingAmount: 0,
              lineTotalAmount: item.totalNoTax,
              lineTaxPercent: item.taxPercent,
              lineTaxAmount: item.taxAmount
            };
          });

          // Prepare receipt data
          const receiptData = {
            transactionDate: updatedCurrentData.transactionDate || updatedCurrentDataAny.TransactionDate || new Date().toISOString(),
            customerName: payeeName || updatedCurrentData.customerName || updatedCurrentDataAny.CustomerName,
            totalAmount: totals.totalPayable || updatedCurrentData.totalAmount || updatedCurrentDataAny.TotalAmount || updatedCurrentData.summary?.grandTotal || 0,
            payingAmount: totals.totalPayable || updatedCurrentData.payingAmount || updatedCurrentDataAny.PayingAmount || updatedCurrentData.summary?.grandTotal || 0,
            paymentMode: normalizePaymentModeForBackend(paymentMode),
            paymentModeDocNo: null, // Assuming no doc number for now
            payeeName: payeeName || updatedCurrentData.customerName || updatedCurrentDataAny.CustomerName,
            addressNo: addressNumber || updatedCurrentData.addressNo || updatedCurrentDataAny.addressNo,
            address: addressStreet || updatedCurrentData.address || updatedCurrentDataAny.address,
            address2: addressUnit || updatedCurrentData.address2 || updatedCurrentDataAny.address2,
            addressCity: addressPostalCode || updatedCurrentData.addressCity || updatedCurrentDataAny.addressCity,
            districtCode: updatedCurrentData.districtCode || updatedCurrentDataAny.districtCode,
            country: addressCountry || updatedCurrentData.country || updatedCurrentDataAny.country,
            outstandingAmount: 0 // Assuming no outstanding amount for now
          };

          try {
            // Create receipt from application
            const result = await receiptService.createReceiptFromApplication(
              applicationNumber.trim(),
              receiptData,
              receiptDetails
            );
            
            // The receiptService.createReceiptFromApplication returns a Receipt object directly
            // Check if we received a valid receipt object
            if (result && result.receiptCode) {
              showSuccess('Success', `Receipt created: ${result.receiptCode}`);
              setReceiptCode(result.receiptCode); // Update the receipt code state
              
              // Set the created receipt for viewing
              setSelectedReceipt(result);
              setIsDetailModalOpen(true);
            } else {
              showError('Error', 'Failed to create receipt - invalid response');
            }
          } catch (e: any) {
            showError('Error', e?.message || 'Failed to create receipt');
          }
        }, 500);
        
        return;
      } catch (error: any) {
        showError('Error', error?.message || 'Failed to load application data');
        return;
      }
    }

    // Original logic for when data is already loaded
    if (!applicationNumber.trim()) {
      showError('Error', 'Application number is required');
      return;
    }
    if (!currentData) {
      showError('Error', 'Please load application data first by clicking "View Data"');
      return;
    }
    if (!currentData.canCreateReceipt) {
      showError('Error', 'Receipt cannot be created for this record');
      return;
    }
    if (!paymentMode.trim()) {
      showError('Error', 'Please select payment mode');
      return;
    }

    // Map the current UI items to receipt details
    const receiptDetails = items.map(item => {
      // Find the corresponding receipt item to get the itemId
      const receiptItem = receiptItems.find(ri => ri.itemName === item.selectItem || ri.description === item.selectItem);
      
      return {
        itemId: receiptItem?.itemId || 0, // Use 0 as fallback if not found
        quantity: item.quantity,
        unitAmount: item.amountPaying,
        payingAmount: item.amountPaying,
        totalPayingAmount: item.totalAmount,
        refDocNumber: item.reference || '',
        refDocName: currentData.refDocName || (currentData as any).RefDocName || 'NAPP',

        outstandingAmount: 0,
        lineTotalAmount: item.totalNoTax,
        lineTaxPercent: item.taxPercent,
        lineTaxAmount: item.taxAmount
      };
    });

    // Prepare receipt data
    const currentDataAny: any = currentData;
    const receiptData = {
      transactionDate: currentData.transactionDate || currentDataAny.TransactionDate || new Date().toISOString(),
      customerName: payeeName || currentData.customerName || currentDataAny.CustomerName,
      totalAmount: totals.totalPayable || currentData.totalAmount || currentDataAny.TotalAmount || currentData.summary?.grandTotal || 0,
      payingAmount: totals.totalPayable || currentData.payingAmount || currentDataAny.PayingAmount || currentData.summary?.grandTotal || 0,
      paymentMode: normalizePaymentModeForBackend(paymentMode),
      paymentModeDocNo: null, // Assuming no doc number for now
      payeeName: payeeName || currentData.customerName || currentDataAny.CustomerName,
      addressNo: addressNumber || currentData.addressNo || currentDataAny.addressNo,
      address: addressStreet || currentData.address || currentDataAny.address,
      address2: addressUnit || currentData.address2 || currentDataAny.address2,
      addressCity: addressPostalCode || currentData.addressCity || currentDataAny.addressCity,
      districtCode: currentData.districtCode || currentDataAny.districtCode,
      country: addressCountry || currentData.country || currentDataAny.country,
      outstandingAmount: 0 // Assuming no outstanding amount for now
    };

    try {
      // Create receipt from application
      const result = await receiptService.createReceiptFromApplication(
        applicationNumber.trim(),
        receiptData,
        receiptDetails
      );
      
      // The receiptService.createReceiptFromApplication returns a Receipt object directly
      // Check if we received a valid receipt object
      if (result && result.receiptCode) {
        showSuccess('Success', `Receipt created: ${result.receiptCode}`);
        setReceiptCode(result.receiptCode); // Update the receipt code state
        
        // Set the created receipt for viewing
        setSelectedReceipt(result);
        setIsDetailModalOpen(true);
      } else {
        showError('Error', 'Failed to create receipt - invalid response');
      }
    } catch (e: any) {
      showError('Error', e?.message || 'Failed to create receipt');
    }
  };

  // Handle print invoice - open InvoiceViewerModal popup
  const handlePrintInvoice = async () => {
    try {
      // Try invoice number first, then receipt code
      const codeToUse = invoiceNumber.trim() || receiptCode.trim();
      
      if (!codeToUse) {
        showError('Error', 'Invoice number or Receipt code is required to print invoice');
        return;
      }

      setViewingInvoiceCode(codeToUse);

      // Build invoice template data from form state
      const customerAddress = buildCustomerAddress();
      
      // Format transaction date (convert from DD-MM-YYYY to proper date format)
      let formattedDate = transactionDate;
      try {
        if (transactionDate && transactionDate.includes('-')) {
          const parts = transactionDate.split('-');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            const dateObj = new Date(`${year}-${month}-${day}`);
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toLocaleDateString('en-SG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            }
          }
        } else if (transactionDate) {
          // Try parsing as ISO date or other formats
          const dateObj = new Date(transactionDate);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toLocaleDateString('en-SG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        }
      } catch (error) {
        console.warn('Error formatting date:', error);
        // Keep original date string if formatting fails
      }

      // Debug: Log items state
      console.log('[handlePrintInvoice] Current items state:', items);
      console.log('[handlePrintInvoice] Items length:', items.length);
      
      // Map items to template items with proper structure for InvoiceTemplate
      const templateItems = items.map(item => ({
        description: item.selectItem || 'Item',
        referenceNo: item.reference || 'N/A',
        gstPercent: item.taxPercent || 9, // default to 9% GST
        qty: item.quantity || 1,
        quantity: item.quantity || 1, // alias for compatibility
        unitPrice: item.amountPaying || 0,
        amount: item.totalAmount || 0,
      }));
      
      // Debug: Log template items
      console.log('[handlePrintInvoice] Generated templateItems:', templateItems);

      const templateData: InvoiceTemplateData = {
        invoiceCode: codeToUse,
        invoiceDate: formattedDate,
        customerName: payeeName || 'N/A',
        customerAddress: customerAddress || undefined,
        paymentMode: paymentMode || undefined,
        totalAmount: totals.totalPayable || 0,
        taxAmount: totals.taxAmount || 0,
        items: templateItems.length > 0 ? templateItems : undefined,
      };

      setViewerInvoiceData(templateData);
      setIsInvoiceViewerOpen(true);
      showSuccess('Success', 'Invoice viewer opened');
    } catch (error: any) {
      console.error('[handlePrintInvoice] Error:', error);
      const errorMessage = error?.message || 'Failed to open invoice viewer';
      showError('Error', errorMessage);
    } finally {
      setViewingInvoiceCode(null);
    }
  };


  // Handle print receipt (enhanced like ReceiptPage)
  const handlePrintReceipt = async () => {
    try {
      // Use receipt code if available, otherwise try invoice number
      const codeToUse = receiptCode.trim() || invoiceNumber.trim();
      
      if (!codeToUse) {
        showError('Error', 'Receipt code or Invoice number is required to print receipt');
        return;
      }

      setViewingReceiptCode(codeToUse);

      // Prefer fetching the real receipt by code (so modal shows exact backend data)
      let receipt: ReceiptType | null = null;
      try {
        receipt = await receiptService.getReceiptByCode(codeToUse);
      } catch (err) {
        // Fallback: build a local receipt from the current screen state
        const parseTransactionDateToIso = (d: string): string | undefined => {
          if (!d) return undefined;
          // common UI format is DD-MM-YYYY
          const m = d.match(/^(\d{2})-(\d{2})-(\d{4})$/);
          if (m) {
            const [, dd, mm, yyyy] = m;
            return `${yyyy}-${mm}-${dd}`;
          }
          // last resort: let Date parse it
          const dateObj = new Date(d);
          if (!isNaN(dateObj.getTime())) return dateObj.toISOString();
          return d;
        };

        const invoiceDetails: InvoiceDetail[] = items.map((item) => ({
          description: item.selectItem || 'Item',
          quantity: item.quantity || 1,
          unitPrice: item.amountPaying || 0,
          amount: item.totalAmount || 0,
        }));

        
        // Debug: Log receipt items
        console.log('[handlePrintReceipt] Generated invoiceDetails:', invoiceDetails);

        receipt = {
          receiptCode: codeToUse,
          invoiceCode: invoiceNumber || undefined,
          applicationCode: (applicationNumber || applicationNumberFromRoute) || undefined,
          customerName: payeeName || currentData?.customerName || 'N/A',
          totalAmount: totals.totalPayable || 0,
          payingAmount: totals.totalPayable || 0,
          paymentMode: paymentMode || 'Cash',
          receiptDate: parseTransactionDateToIso(transactionDate),
          invoiceDetails,
        };
      }

      setSelectedReceipt(receipt);
      setIsDetailModalOpen(true);
      showSuccess('Success', 'Receipt preview opened');
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to print receipt';
      showError('Error', errorMessage);
    } finally {
      setViewingReceiptCode(null);
    }
  };

  return (
    <>
      <Layout title="Invoice and Receipt">
        {/* Main Content - Merged with screen */}
        <div 
          className="min-h-screen p-4 md:p-6 bg-[#e8e2d6]"
          style={{
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/pinstripe.png")'
          }}
        >
          <div className="max-w-[1200px] mx-auto">
            {/* Form Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Application Number / Invoice / Receipt Lookup */}
              <div className="bg-white rounded-lg p-4 shadow-md space-y-4">
                {/* Application Number */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="w-full sm:w-[140px] font-semibold text-gray-700 text-sm">Niche Number:</label>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={applicationNumber}
                      onChange={(e) => setApplicationNumber(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                      placeholder="Enter niche number (e.g., 7980-0) or application number"
                    />
                    <button
                      onClick={() => {
                        handleApplicationNumberChange(applicationNumber);
                        handleViewInvoice();
                      }}
                      disabled={loading || invoiceLoading || !applicationNumber.trim()}
                      className="px-5 py-2 bg-gradient-to-r from-[#4b3621] to-[#5a4730] text-white rounded-lg font-semibold hover:from-[#5a4730] hover:to-[#4b3621] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading || invoiceLoading ? (
                        <>
                          <LoaderIcon className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <EyeIcon className="w-4 h-4" />
                          View Data
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Flags banner - Enhanced to show both invoice and receipt status */}
                {currentData && (
                  <div className="space-y-2">
                    {/* Invoice Status Banner */}
                    {currentData?.isApplicationData && !currentData?.isInvoice && (
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-yellow-800 text-sm">Application Data Loaded</div>
                          <div className="text-yellow-700 text-xs mt-1">
                            {currentData.canCreateInvoice
                              ? `Invoice can be generated. Reference: ${currentData.applicationCode || applicationNumber}`
                              : 'Invoice cannot be generated for this application.'}
                          </div>
                        </div>
                      </div>
                    )}

                    {currentData?.isInvoice && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-green-800 text-sm">Invoice Loaded</div>
                          <div className="text-green-700 text-xs mt-1">
                            Invoice code: {currentData.code || 'N/A'} | 
                            You can print invoice / receipt.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Receipt Status Banner */}
                    {currentData?.hasInvoice && currentData.canCreateReceipt && currentData.isInvoice && (
                      <div className="flex items-start gap-3 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-blue-800 text-sm">Receipt Status</div>
                          <div className="text-blue-700 text-xs mt-1">
                            {receiptCode 
                              ? `Receipt generated: ${receiptCode}` 
                              : 'Receipt can be generated for this invoice.'}
                          </div>
                        </div>
                      </div>
                    )}

                    {receiptCode && (
                      <div className="flex items-start gap-3 p-3 bg-purple-50 border-2 border-purple-300 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-purple-800 text-sm">Receipt Generated</div>
                          <div className="text-purple-700 text-xs mt-1">
                            Receipt code: {receiptCode} | Ready for printing.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Display Invoice Number after data is loaded */}
                {invoiceNumber && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label className="w-full sm:w-[140px] font-semibold text-gray-700 text-sm">Invoice Number:</label>
                      <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium">
                        {invoiceNumber}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payee Name */}
              <div className="bg-white rounded-lg p-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="w-full sm:w-[140px] font-semibold text-gray-700 text-sm">Payee Name:</label>
                  <input
                    type="text"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                    placeholder="Enter payee name"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="bg-white rounded-lg p-4 shadow-md">
                <label className="block font-semibold text-gray-700 text-sm mb-3">Address:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <select
                    value={addressBlock}
                    onChange={(e) => setAddressBlock(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                  >
                    <option>Block</option>
                  </select>
                  <input
                    type="text"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                    placeholder="Number"
                  />
                  <input
                    type="text"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                    placeholder="Street"
                  />
                  <input
                    type="text"
                    value={addressUnit}
                    onChange={(e) => setAddressUnit(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                    placeholder="Unit"
                  />
                  <input
                    type="text"
                    value={addressPostalCode}
                    onChange={(e) => handlePostalCodeChange(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                    placeholder="Postal Code"
                  />
                  <select
                    value={addressCountry}
                    onChange={(e) => setAddressCountry(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                  >
                    <option>Singapore</option>
                    <option>Malaysia</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              {/* Payment Mode and Print Buttons */}
              <div className="bg-white rounded-lg p-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="w-full sm:w-[140px] font-semibold text-gray-700 text-sm">Payment Mode:</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                    >
                      {PAYMENT_MODES.map(mode => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handlePrintInvoice}
                      disabled={!invoiceNumber.trim() || viewingInvoiceCode !== null}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#a52a2a] to-[#c93535] text-white rounded-lg font-semibold hover:from-[#c93535] hover:to-[#a52a2a] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      title="Print Invoice PDF"
                    >
                      {viewingInvoiceCode ? (
                        <>
                          <LoaderIcon className="w-4 h-4 animate-spin" />
                          Opening...
                        </>
                      ) : (
                        <>
                          <PrinterIcon className="w-4 h-4" />
                          Print Invoice
                        </>
                      )}
                    </button>
                    <button
                      onClick={handlePrintReceipt}
                      disabled={!receiptCode.trim() || viewingReceiptCode !== null}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#a52a2a] to-[#c93535] text-white rounded-lg font-semibold hover:from-[#c93535] hover:to-[#a52a2a] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      title="Print Receipt PDF"
                    >
                      {viewingReceiptCode ? (
                        <>
                          <LoaderIcon className="w-4 h-4 animate-spin" />
                          Opening...
                        </>
                      ) : (
                        <>
                          <PrinterIcon className="w-4 h-4" />
                          Print Receipt
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Generate buttons with individual conditions based on flags */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Generate Invoice Button - Show for applications that can create invoice */}
                    {(currentData?.isApplicationData && currentData.canCreateInvoice) && (
                      <button
                        onClick={() => handleGenerateInvoice(false)}
                        disabled={creatingInvoice || !paymentMode.trim() || !currentData || !applicationNumber.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {creatingInvoice ? (
                          <>
                            <LoaderIcon className="w-4 h-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            Generate Invoice
                          </>
                        )}
                      </button>
                    )}

                    {/* Generate Receipt Button - Show for invoices that can create receipt */}
                    {(currentData?.isInvoice && currentData.hasInvoice && currentData.canCreateReceipt) && (
                      <button
                        onClick={handleGenerateReceipt}
                        disabled={creatingInvoice || !paymentMode.trim() || !currentData || !applicationNumber.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {creatingInvoice ? (
                          <>
                            <LoaderIcon className="w-4 h-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            Generate Receipt
                          </>
                        )}
                      </button>
                    )}

                    {/* Invoice + Receipt Button - Show for applications that can create both */}
                    {(currentData?.isApplicationData && currentData.canCreateInvoice) && (
                      <button
                        onClick={() => handleGenerateInvoice(true)}
                        disabled={creatingInvoice || !paymentMode.trim() || !currentData || !applicationNumber.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {creatingInvoice ? (
                          <>
                            <LoaderIcon className="w-4 h-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            Invoice + Receipt
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Show status message when invoice and/or receipt have been created */}
                {(invoiceNumber.trim() || receiptCode.trim()) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">Creation Status:</span>
                      </div>
                      <div className="ml-7 text-blue-700 text-sm mt-1">
                        {invoiceNumber.trim() && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Invoice:</span>
                            <span>{invoiceNumber}</span>
                            <span className="text-green-600">(Generated)</span>
                          </div>
                        )}
                        {receiptCode.trim() && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Receipt:</span>
                            <span>{receiptCode}</span>
                            <span className="text-green-600">(Generated)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Application Items Section */}
              {(applicationItems || applicationItemsLoading) && (
                // <div className="bg-white rounded-lg p-4 shadow-md">
                //   {/* <div className="flex items-center justify-between mb-4">
                //     <h3 className="font-semibold text-gray-800 text-lg">Application Items</h3>
                //     {applicationItemsLoading && (
                //       <div className="flex items-center gap-2 text-blue-600">
                //         <LoaderIcon className="w-4 h-4 animate-spin" />
                //         <span className="text-sm">Loading items...</span>
                //       </div>
                //     )}
                //   </div> */}
                  
                //   {applicationItems && (
                //     <div className="space-y-4">
                //       {/* Summary Cards */}
                //       {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                //         <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                //           <div className="text-blue-800 text-sm font-medium">Total Items</div>
                //           <div className="text-blue-900 text-xl font-bold">{applicationItems.totalItems}</div>
                //         </div>
                //         <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                //           <div className="text-green-800 text-sm font-medium">Subtotal</div>
                //           <div className="text-green-900 text-xl font-bold">${typeof getTotalAmount() === 'number' ? getTotalAmount().toFixed(2) : '0.00'}</div>
                //         </div>
                //         <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                //           <div className="text-yellow-800 text-sm font-medium">Tax Amount</div>
                //           <div className="text-yellow-900 text-xl font-bold">${typeof getTaxAmount() === 'number' ? getTaxAmount().toFixed(2) : '0.00'}</div>
                //         </div>
                //         <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                //           <div className="text-purple-800 text-sm font-medium">Grand Total</div>
                //           <div className="text-purple-900 text-xl font-bold">${typeof getGrandTotal() === 'number' ? getGrandTotal().toFixed(2) : '0.00'}</div>
                //         </div>
                //       </div> */}

                //       {/* References */}
                //       {/* {applicationItems.references && Object.keys(applicationItems.references).length > 0 && (
                //         <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                //           <h4 className="font-medium text-gray-800 mb-2">References:</h4>
                //           <div className="flex flex-wrap gap-2">
                //             {Object.entries(applicationItems.references).map(([type, refs]) => {
                //               // Ensure refs is an array and has content
                //               const refArray = Array.isArray(refs) ? refs : [];
                //               return refArray.length > 0 ? (
                //                 <div key={type} className="bg-white px-3 py-1 rounded-md border text-sm">
                //                   <span className="font-medium text-gray-700">{type}:</span>
                //                   <span className="text-gray-600 ml-1">{refArray.join(', ')}</span>
                //                 </div>
                //               ) : null;
                //             })}
                //           </div>
                //         </div>
                //       )} */}

                //       {/* Items Table */}
                //       {/* <div className="overflow-x-auto">
                //         <table className="w-full border-collapse">
                //           <thead>
                //             <tr className="bg-[#e0d5c5]">
                //               <th className="border border-[#bbaaaa] px-3 py-2 text-left text-xs font-semibold text-[#4b3621]">Item Type</th>
                //               <th className="border border-[#bbaaaa] px-3 py-2 text-left text-xs font-semibold text-[#4b3621]">Description</th>
                //               <th className="border border-[#bbaaaa] px-3 py-2 text-right text-xs font-semibold text-[#4b3621]">Quantity</th>
                //               <th className="border border-[#bbaaaa] px-3 py-2 text-right text-xs font-semibold text-[#4b3621]">Unit Price</th>
                //               <th className="border border-[#bbaaaa] px-3 py-2 text-right text-xs font-semibold text-[#4b3621]">Total Amount</th>
                //               <th className="border border-[#bbaaaa] px-3 py-2 text-right text-xs font-semibold text-[#4b3621]">Tax Amount</th>
                //               <th className="border border-[#bbaaaa] px-3 py-2 text-right text-xs font-semibold text-[#4b3621]">Grand Total</th>
                //               <th className="border border-[#bbaaaa] px-3 py-2 text-left text-xs font-semibold text-[#4b3621]">Reference</th>
                //             </tr>
                //           </thead>
                //           <tbody>
                //             {applicationItems.items.length === 0 ? (
                //               <tr>
                //                 <td colSpan={8} className="border border-[#bbaaaa] px-3 py-4 text-center text-gray-500">
                //                   No items found for this application.
                //                 </td>
                //               </tr>
                //             ) : (
                //               applicationItems.items.map((item, index) => (
                //                 <tr key={`${item.id}-${index}`} className="hover:bg-gray-50 transition-colors">
                //                   <td className="border border-[#bbaaaa] px-3 py-2">
                //                     <span className={`px-2 py-1 rounded text-xs font-medium ${{
                //                       niche: 'bg-blue-100 text-blue-800',
                //                       inscription: 'bg-green-100 text-green-800'
                //                     }[item.itemType] || 'bg-gray-100 text-gray-800'}`}>
                //                       {(item.itemType || '').toUpperCase()}
                //                     </span>
                //                   </td>
                //                   <td className="border border-[#bbaaaa] px-3 py-2 text-sm text-gray-700">
                //                     {item.description}
                //                   </td>
                //                   <td className="border border-[#bbaaaa] px-3 py-2 text-right text-sm text-gray-700">
                //                     {item.quantity}
                //                   </td>
                //                   <td className="border border-[#bbaaaa] px-3 py-2 text-right text-sm font-medium text-gray-700">
                //                     ${typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(2) : '0.00'}
                //                   </td>
                //                   <td className="border border-[#bbaaaa] px-3 py-2 text-right text-sm font-medium text-gray-700">
                //                     ${typeof item.totalAmount === 'number' ? item.totalAmount.toFixed(2) : '0.00'}
                //                   </td>
                //                   <td className="border border-[#bbaaaa] px-3 py-2 text-right text-sm font-medium text-gray-700">
                //                     ${typeof item.taxAmount === 'number' ? item.taxAmount.toFixed(2) : '0.00'}
                //                   </td>
                //                   <td className="border border-[#bbaaaa] px-3 py-2 text-right text-sm font-semibold text-[#4b3621]">
                //                     ${typeof item.grandTotal === 'number' ? item.grandTotal.toFixed(2) : '0.00'}
                //                   </td>
                //                   <td className="border border-[#bbaaaa] px-3 py-2 text-sm text-gray-600">
                //                     {item.reference || 'N/A'}
                //                   </td>
                //                 </tr>
                //               ))
                //             )}
                //           </tbody>
                //         </table>
                //       </div> */}
                //     </div>
                //   )}
                // </div>
                <></>
              )}
            </div>

            {/* Right Side Info */}
            <div className="bg-white rounded-lg p-4 shadow-md h-fit">
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-gray-700 text-sm mb-2">Transaction Date:</label>
                  <input
                    type="text"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 text-sm mb-2">Last Invoice Number:</label>
                  <div className="px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-800 font-medium">
                    {getLastReceiptNumberString()}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 text-sm mb-2">Receipt Status:</label>
                  <div className="px-3 py-2 bg-green-50 border-2 border-green-200 rounded-lg text-green-700 font-semibold">
                    {receiptStatus}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Item Details Section */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#d2b48c] to-[#c4a878] px-6 py-3">
              <h2 className="font-bold text-[#4b3621] text-lg">Item Details</h2>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#e0d5c5]">
                    <th className="border border-[#bbaaaa] px-3 py-3 text-left text-xs font-semibold text-[#4b3621]">Select Item</th>
                    <th className="border border-[#bbaaaa] px-3 py-3 text-left text-xs font-semibold text-[#4b3621]">Reference</th>
                    <th className="border border-[#bbaaaa] px-3 py-3 text-right text-xs font-semibold text-[#4b3621]">Default Amount</th>
                    <th className="border border-[#bbaaaa] px-3 py-3 text-right text-xs font-semibold text-[#4b3621]">Amount Paying</th>
                    <th className="border border-[#bbaaaa] px-3 py-3 text-center text-xs font-semibold text-[#4b3621]">Quantity</th>
                    <th className="border border-[#bbaaaa] px-3 py-3 text-right text-xs font-semibold text-[#4b3621]">Total (No Tax)</th>
                    <th className="border border-[#bbaaaa] px-3 py-3 text-center text-xs font-semibold text-[#4b3621]">Tax %</th>
                    <th className="border border-[#bbaaaa] px-3 py-3 text-right text-xs font-semibold text-[#4b3621]">Tax Amount</th>
                    <th className="border border-[#bbaaaa] px-3 py-3 text-right text-xs font-semibold text-[#4b3621]">Total Amount</th>
                    <th className="border border-[#bbaaaa] px-3 py-3 text-center text-xs font-semibold text-[#4b3621]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="border border-[#bbaaaa] px-3 py-8 text-center text-gray-500">
                        No items added yet. Click "Add Item" to get started.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="border border-[#bbaaaa] px-2 py-2">
                          <select
                            value={item.selectItem}
                            onChange={(e) => updateItemCalculation(item.id, 'selectItem', e.target.value)}
                            className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-md bg-[#f9f2e7] focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all text-sm"
                          >
                            {availableItems.map((option, idx) => (
                              <option key={idx} value={option}>{option}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2">
                          <input
                            type="text"
                            value={item.reference}
                            onChange={(e) => updateItemCalculation(item.id, 'reference', e.target.value)}
                            className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-md bg-[#f9f2e7] focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all text-sm"
                            placeholder="Reference"
                          />
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2 text-right font-medium text-gray-700">
                          ${typeof item.defaultAmount === 'number' ? item.defaultAmount.toFixed(2) : '0.00'}
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.amountPaying}
                            onChange={(e) => updateItemCalculation(item.id, 'amountPaying', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-md bg-[#f9f2e7] focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all text-sm text-right"
                          />
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemCalculation(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-md bg-[#f9f2e7] focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all text-sm text-center"
                          />
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2 text-right font-medium text-gray-700">
                          ${typeof item.totalNoTax === 'number' ? item.totalNoTax.toFixed(2) : '0.00'}
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2">
                          <select
                            value={item.taxPercent}
                            onChange={(e) => updateItemCalculation(item.id, 'taxPercent', parseFloat(e.target.value))}
                            className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-md bg-white focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all text-sm text-center"
                          >
                            <option value={0}>0%</option>
                            <option value={7}>7%</option>
                            <option value={9}>9%</option>
                          </select>
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2 text-right font-medium text-gray-700">
                          ${typeof item.taxAmount === 'number' ? item.taxAmount.toFixed(2) : '0.00'}
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2 text-right font-semibold text-[#4b3621]">
                          ${typeof item.totalAmount === 'number' ? item.totalAmount.toFixed(2) : '0.00'}
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={
                              // ✅ FIX: Disable Remove Item button for existing invoices
                              // New invoice (isApplicationData: true, isInvoice: false) → enabled
                              // Existing invoice (isApplicationData: false, isInvoice: true) → disabled
                              currentData?.isInvoice === true && currentData?.isApplicationData === false
                            }
                            className="px-3 py-1.5 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-all shadow-sm hover:shadow-md text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Button */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={handleAddItem}
                disabled={
                  // ✅ FIX: Disable Add Item button for existing invoices
                  // New invoice (isApplicationData: true, isInvoice: false, canCreateInvoice: true) → enabled
                  // Existing invoice (isApplicationData: false, isInvoice: true, canCreateInvoice: false) → disabled
                  currentData?.isInvoice === true && currentData?.isApplicationData === false && currentData?.canCreateInvoice === false
                }
                className="w-full px-6 py-3 bg-gradient-to-r from-[#4b3621] to-[#5a4730] text-white rounded-lg font-semibold hover:from-[#5a4730] hover:to-[#4b3621] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-[#4b3621] disabled:hover:to-[#5a4730]"
              >
                + Add Item
              </button>
            </div>
          </div>

          {/* Summary Section */}
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-[#4b3621] text-lg mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-2">Total</label>
                <div className="text-xl font-bold text-gray-800">${typeof totals.total === 'number' ? totals.total.toFixed(2) : '0.00'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-2">Tax Amount</label>
                <div className="text-xl font-bold text-gray-800">${typeof totals.taxAmount === 'number' ? totals.taxAmount.toFixed(2) : '0.00'}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <label className="block text-sm font-semibold text-green-700 mb-2">Total Payable</label>
                <div className="text-xl font-bold text-green-800">${typeof totals.totalPayable === 'number' ? totals.totalPayable.toFixed(2) : '0.00'}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <label className="block text-sm font-semibold text-blue-700 mb-2">Total Donation</label>
                <div className="text-xl font-bold text-blue-800">${typeof totals.totalDonation === 'number' ? totals.totalDonation.toFixed(2) : '0.00'}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Franciscan Columbarium Management System
          </div>
        </div>
      </div>
    </Layout>
    </>
  );
}