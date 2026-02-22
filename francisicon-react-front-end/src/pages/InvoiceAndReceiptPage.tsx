import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Layout } from '../components/Layout';
import { useReceipt } from '../hooks/useReceipt';
import { useToast } from '../contexts/ToastContext';
import { useApplicationItems } from '../hooks/useApplicationItems';
import { addressService } from '../services/addressService';
import { parseRawAddress } from '../utils/addressMapper';
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
  clearCurrentData,
  resetCreateStatus,
  createInvoice
} from '../store/invoiceSlice';
import { createIndividualInvoice } from '../store/invoiceSlice';
import { createIndividualReceipt } from '../store/receiptSlice';

interface InvoiceItem {
  id: string;
  itemId?: number;
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

  // Check if we're on the /invoice-receipt/new route
  const isNewRoute = location.pathname.endsWith('/new');

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

  const { isCreating: creatingReceipt } = useSelector((state: RootState) => state.receipt);

  const { user } = useSelector((state: RootState) => state.auth);
  const churchId = user?.churchId || 1;

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
  const [refDocumentNo, setRefDocumentNo] = useState('');

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
  const applyParsedAddress = useCallback((addressString: any) => {
    if (!addressString || typeof addressString !== 'string' || !addressString.trim()) return;

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

      // Only clear other fields when NOT on new route
      if (!isNewRoute) {
        clearFormFields();
        dispatch(clearCurrentData());
      }

      // Fetch application items when application code is entered
      if (value.trim()) {
        fetchApplicationItems(value.trim());

      } else {
        clearApplicationItems();
      }
    },
    [clearFormFields, dispatch, fetchApplicationItems, clearApplicationItems, isNewRoute]
  );

  // Populate UI from invoiceSlice currentData (invoice OR application fallback)
  useEffect(() => {
    if (!currentData) return;

    // Basic fields - improved mapping with proper type handling
    const currentDataAny: any = currentData;
    const resolvedName = currentData.customerName || currentDataAny.payeeName || currentDataAny.applicant?.name || '';
    setPayeeName(resolvedName);

    // Map payment mode properly - handle different field names
    const paymentModeValue = currentData.paymentMode ||
      currentDataAny.PaymentMode ||
      'Cash';

    // Convert backend payment modes to frontend values
    // Backend can return: string names ("Cash", "Cheque", "TT"), or numeric values (1, 2, 3, 4) as number or string
    let frontendPaymentMode = 'Cash'; // default
    if (paymentModeValue) {
      // First, check if it's a numeric value (number type or numeric string like "3")
      const numericMode = typeof paymentModeValue === 'number' ? paymentModeValue : parseInt(String(paymentModeValue), 10);
      if (!isNaN(numericMode) && String(numericMode) === String(paymentModeValue).trim()) {
        // Numeric payment mode mapping: 1=Cash, 2=Cheque, 3=Bank Transfer, 4=Credit Card, 5=Other
        const numericModeMap: Record<number, string> = {
          1: 'Cash',
          2: 'Cheque',
          3: 'Bank Transfer',
          4: 'Credit Card',
          5: 'Other',
        };
        frontendPaymentMode = numericModeMap[numericMode] || 'Cash';
      } else {
        // String-based payment mode normalization
        const normalizedMode = String(paymentModeValue).trim().toLowerCase();
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
          if (PAYMENT_MODES.includes(String(paymentModeValue))) {
            frontendPaymentMode = String(paymentModeValue);
          }
        }
      }
    }
    setPaymentMode(frontendPaymentMode);

    // Set reference document number from backend
    const paymentModeDocNo = currentDataAny.paymentModeDocNo || currentDataAny.PaymentModeDocNo || currentDataAny.refDocumentNo || '';
    setRefDocumentNo(paymentModeDocNo);

    // Only set invoice number when it is truly an invoice
    setInvoiceNumber(currentData.isInvoice ? (currentData.code || currentDataAny.invoiceCode || '') : '');

    // Set receipt code if available
    if (currentData.receipt && currentData.receipt.receiptCode) {
      setReceiptCode(currentData.receipt.receiptCode);
    } else if (currentDataAny.receiptCode) {
      setReceiptCode(currentDataAny.receiptCode);
    } else {
      setReceiptCode('');
    }

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
    // DB convention: addressNo=block number, address=street, address2=unit,
    // addressCity=unused, districtCode=postal, country=country.
    // addressNo may also be a keyword (Blk/Block/No).
    if (currentData.addressNo || currentData.address || currentData.address2 ||
      currentData.addressCity || currentData.country) {
      const rawNo = (currentData.addressNo || '').toString().trim();
      const rawAddr = (currentData.address || '').toString().trim();
      const rawAddr2 = (currentData.address2 || '').toString().trim();
      const rawCity = (currentData.addressCity || '').toString().trim();
      const rawPostal = (currentData.districtCode || '').toString().trim();
      const rawCountry = (currentData.country || 'Singapore').toString().trim();

      const upperNo = rawNo.toUpperCase();
      const isKw = ['BLOCK', 'BLK', 'NO', 'NO.'].includes(upperNo);
      if (isKw) {
        setAddressBlock(upperNo === 'BLK' || upperNo === 'BLOCK' ? 'Block' : 'No');
        setAddressNumber(rawAddr);
        setAddressStreet(rawAddr2);
        setAddressUnit(rawCity);
      } else {
        setAddressBlock('Block');
        setAddressNumber(rawNo);
        setAddressStreet(rawAddr);
        setAddressUnit(rawAddr2 || rawCity);
      }
      setAddressPostalCode(rawPostal);
      setAddressCountry(rawCountry);
    } else if (currentData.address) {
      applyParsedAddress(currentData.address);
    } else if (currentDataAny.applicant?.address) {
      applyParsedAddress(currentDataAny.applicant.address);
    }

    // Details → table items mapping - improved handling
    let invoiceDetails = currentData.details || currentDataAny.Details || [];

    // Wake Room Fallback
    if (invoiceDetails.length === 0 && (currentDataAny.booking || currentDataAny.wakeRoomId)) {
      invoiceDetails = [{
        itemId: 0,
        itemName: currentDataAny.wakeRoom?.name ? `Wake Room Rental - ${currentDataAny.wakeRoom.name}` : 'Wake Room Rental',
        itemCode: 'WAKE',
        itemPrice: currentDataAny.financial?.defaultDonationAmount || (currentDataAny as any).defaultDonationAmount || 0,
        quantity: currentDataAny.booking?.noOfDays || (currentDataAny as any).noOfDays || 1,
        unitAmount: currentDataAny.financial?.defaultDonationAmount || (currentDataAny as any).defaultDonationAmount || 0,
        payingAmount: currentDataAny.financial?.donationAmount || (currentDataAny as any).donationAmount || 0,
        lineTotalAmount: currentDataAny.financial?.donationAmount || (currentDataAny as any).donationAmount || 0,
        lineTaxPercent: 0,
        lineTaxAmount: 0,
        totalPayingAmount: currentDataAny.financial?.donationAmount || (currentDataAny as any).donationAmount || 0,
        refDocNumber: currentData.applicationCode || currentData.code || '',
        refDocName: 'WAKE',
        refType: 'WAKE'
      }];
    }
    // Gate of Life Fallback
    else if (invoiceDetails.length === 0 && currentDataAny.code?.startsWith('GOL')) {
      invoiceDetails = [{
        itemId: 0,
        itemName: 'Gate of Life Donation',
        itemCode: 'GOL',
        itemPrice: currentDataAny.defaultDonationAmount || 0,
        quantity: 1,
        unitAmount: currentDataAny.defaultDonationAmount || 0,
        payingAmount: currentDataAny.donationAmount || 0,
        lineTotalAmount: currentDataAny.donationAmount || 0,
        lineTaxPercent: 0,
        lineTaxAmount: 0,
        totalPayingAmount: currentDataAny.donationAmount || 0,
        refDocNumber: currentDataAny.code || '',
        refDocName: 'GOL',
        refType: 'GOL'
      }];
    }
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
          itemId: d.itemId || d['ItemId'] || matchedReceiptItem?.itemId || undefined,
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

      // Re-fetch using the ORIGINAL application number so receipt can be created
      // This is critical - we must keep the application number to allow receipt creation
      const codeToRefetch = applicationNumber || lastCreatedInvoiceCode;
      dispatch(fetchInvoiceOrApplication(codeToRefetch));

      // Set the invoice number to the created invoice code
      setInvoiceNumber(lastCreatedInvoiceCode);

      // DO NOT clear applicationNumber - it's needed for receipt creation
      // Only clear the form fields
      clearFormFields();
    }
  }, [createInvoiceSuccess, lastCreatedInvoiceCode, dispatch, showSuccess, clearFormFields, applicationNumber]);

  useEffect(() => {
    if (createReceiptSuccess && lastCreatedReceiptCode) {
      showSuccess('Success', `Receipt created: ${lastCreatedReceiptCode}`);
      dispatch(resetCreateStatus());

      // Refresh data using the application number if available
      const codeToRefetch = applicationNumber || lastCreatedInvoiceCode || lastCreatedReceiptCode;
      dispatch(fetchInvoiceOrApplication(codeToRefetch));

      // Clear form fields
      clearFormFields();

      // Only clear application number if both invoice and receipt now exist
      // This allows for potential additional operations
      if (currentData?.hasInvoice && currentData?.hasReceipt) {
        setApplicationNumber('');
        setInvoiceNumber('');
        setReceiptCode('');
      }
    }
  }, [createReceiptSuccess, lastCreatedReceiptCode, lastCreatedInvoiceCode, dispatch, showSuccess, applicationNumber, clearFormFields, currentData]);

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
      await dispatch(fetchInvoiceOrApplication(appNumber.trim())).unwrap();
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
      // Dispatch action to fetch data by code
      await dispatch(fetchInvoiceOrApplication(code.trim())).unwrap();

      // Also fetch application items for the detailed view
      fetchApplicationItems(code.trim());

      // Update the URL to reflect the searched code
      navigate(`/${churchId}/invoice-receipt/${encodeURIComponent(code.trim())}`, { replace: true });
    } catch (error: any) {
      showError('Error', error?.message || String(error) || 'Failed to load invoice/application');
    }
  }, [churchId, dispatch, fetchApplicationItems, navigate, showError]);

  // Handle individual invoice creation
  const handleCreateInvoice = async () => {
    // For new route, allow creating invoice without application number
    if (!isNewRoute && !applicationNumber) {
      showError('Error', 'Application number is required to create invoice');
      return;
    }

    try {
      // Map the current UI items to invoice details
      const mappedInvoiceDetails = items.map(item => {
        const receiptItem = receiptItems.find(ri => ri.itemName === item.selectItem || ri.description === item.selectItem);

        return {
          itemId: item.itemId || receiptItem?.itemId || 1,
          quantity: item.quantity,
          unitAmount: item.amountPaying,
          payingAmount: item.amountPaying,
          totalPayingAmount: item.totalAmount,
          refDocNumber: item.reference || applicationNumber || '',
          refDocName: applicationNumber ? 'NAPP' : 'OTHERS',
          lineTotalAmount: item.totalNoTax,
          lineTaxPercent: item.taxPercent,
          lineTaxAmount: item.taxAmount,
          refType: applicationNumber ? 'NAPP' : 'OTHERS',
          outstandingAmount: 0,
        };
      });

      const createData = {
        applicationCode: applicationNumber || '', // Pass empty string for new route
        customerName: payeeName || 'N/A',
        totalAmount: totals.totalPayable || 0,
        payingAmount: totals.totalPayable || 0,
        paymentMode: normalizePaymentModeForBackend(paymentMode),
        paymentModeDocNo: refDocumentNo || '',
        addressNo: addressBlock === 'Block' ? 'Blk' : addressBlock,
        address: addressNumber || '',
        address2: addressStreet || '',
        addressCity: addressUnit || '',
        districtCode: addressPostalCode || '',
        country: addressCountry || 'Singapore',
        invoiceDetails: mappedInvoiceDetails,
      };

      await dispatch(createIndividualInvoice(createData)).unwrap();
      showSuccess('Success', 'Invoice created successfully');
      // Refresh view with newly created invoice
      if (applicationNumber) handleViewInvoice();


    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      showError('Error', error?.message || 'Failed to create invoice');
    }
  };

  // Handle individual receipt creation
  const handleCreateReceipt = async () => {
    // For new route, allow creating receipt without application number
    if (!isNewRoute && !applicationNumber) {
      showError('Error', 'Application number is required to create receipt');
      return;
    }

    try {
      // Map the current UI items to receipt details (similar to invoice details)
      const receiptDetails = items.map(item => {
        const receiptItem = receiptItems.find(ri => ri.itemName === item.selectItem || ri.description === item.selectItem);

        return {
          itemId: item.itemId || receiptItem?.itemId || 1,
          quantity: item.quantity,
          unitAmount: item.amountPaying,
          payingAmount: item.amountPaying,
          totalPayingAmount: item.totalAmount,
          refDocNumber: item.reference || applicationNumber || '',
          refDocName: applicationNumber ? 'NAPP' : 'OTHERS',
          lineTotalAmount: item.totalNoTax,
          lineTaxPercent: item.taxPercent,
          lineTaxAmount: item.taxAmount,
          refType: applicationNumber ? 'NAPP' : 'OTHERS',
          outstandingAmount: 0,
        };
      });

      const createData = {
        applicationCode: applicationNumber || '', // Pass empty string for new route
        customerName: payeeName || 'N/A',
        payingAmount: totals.totalPayable || 0,
        paymentMode: normalizePaymentModeForBackend(paymentMode),
        paymentModeDocNo: refDocumentNo || '',
        addressNo: addressBlock === 'Block' ? 'Blk' : addressBlock,
        address: addressNumber || '',
        address2: addressStreet || '',
        addressCity: addressUnit || '',
        districtCode: addressPostalCode || '',
        country: addressCountry || 'Singapore',
        receiptDetails: receiptDetails,
      };

      await dispatch(createIndividualReceipt(createData)).unwrap();
      showSuccess('Success', 'Receipt created successfully');
      // Refresh view with newly created receipt
      if (applicationNumber) handleViewInvoice();


    } catch (error: any) {
      console.error('Failed to create receipt:', error);
      showError('Error', error?.message || 'Failed to create receipt');
    }
  };

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

    // Handle the /invoice-receipt/new route - clear all fields for new entry
    if (isNewRoute) {
      clearFormFields();
      dispatch(clearCurrentData());
      dispatch(resetCreateStatus());
      setApplicationNumber('');
      return;
    }

    // Only initialize with route data on initial mount to avoid infinite loops
    if ((applicationNumberFromRoute && applicationNumberFromRoute !== applicationNumber) ||
      (routeCode && routeCode !== applicationNumber)) {
      // If application number is provided from route state, auto-fetch invoice data
      if (applicationNumberFromRoute && applicationNumberFromRoute !== applicationNumber) {
        setApplicationNumber(applicationNumberFromRoute);
        // Auto-fetch invoice using application number as invoice code
        handleViewInvoiceByApplication(applicationNumberFromRoute);
      }
      // If code is provided from route parameter, auto-fetch data
      else if (routeCode && routeCode !== applicationNumber) {
        setApplicationNumber(routeCode);
        // Auto-fetch data using the route code parameter
        handleViewByCode(routeCode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLastReceiptNumber, fetchReceiptItems, applicationNumberFromRoute, routeCode, isNewRoute]);

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
    // For new route, allow creating invoice without application number
    if (!isNewRoute && !applicationNumber.trim()) {
      showError('Error', 'Application number is required');
      return;
    }

    // Payment mode validation - skip on new route if not provided
    if (!isNewRoute && !paymentMode.trim()) {
      showError('Error', 'Please select payment mode');
      return;
    }

    // If on new route and payment mode is empty, default to Cash
    const effectivePaymentMode = isNewRoute && !paymentMode.trim() ? 'Cash' : paymentMode;

    // Handle case where user entered application number but hasn't loaded data yet
    if (!currentData && !isNewRoute) {
      try {
        // Load the application data first
        await handleViewInvoiceByApplication(applicationNumber.trim());

        // Wait for state to update
        await new Promise(resolve => setTimeout(resolve, 300));

        // Check if currentData is now available
        if (!currentData) {
          showError('Error', 'Failed to load application data. Please try again.');
          return;
        }
      } catch (error: any) {
        showError('Error', error?.message || 'Failed to load application data');
        return;
      }
    }

    // Check if invoice can be created (if currentData exists and not on new route)
    if (!isNewRoute && currentData && !currentData.canCreateInvoice) {
      showError('Error', 'Invoice cannot be created for this record');
      return;
    }

    // Map the current UI items to invoice details with improved field mapping
    const mappedInvoiceDetails = items.map(item => {
      const receiptItem = receiptItems.find(ri => ri.itemName === item.selectItem || ri.description === item.selectItem);

      return {
        itemId: item.itemId || receiptItem?.itemId || 0,
        quantity: item.quantity,
        unitAmount: item.amountPaying,
        payingAmount: item.amountPaying,
        totalPayingAmount: item.totalAmount,
        refDocNumber: item.reference || '',
        refDocName: currentData?.refDocName || (currentData as any)?.RefDocName || 'NAPP',
        lineTotalAmount: item.totalNoTax,
        lineTaxPercent: item.taxPercent,
        lineTaxAmount: item.taxAmount,
      };
    });

    const currentDataAny: any = currentData || {};
    const addressData = {
      addressNo: addressBlock === 'Block' ? 'Blk' : addressBlock,
      address: addressNumber || currentData?.addressNo || currentDataAny.addressNo,
      address2: addressStreet || currentData?.address || currentDataAny.address,
      addressCity: addressUnit || currentData?.address2 || currentDataAny.address2,
      districtCode: addressPostalCode || currentData?.districtCode || currentDataAny.districtCode,
      country: addressCountry || currentData?.country || currentDataAny.country || 'Singapore',
    };

    const invoicePayload = {
      invoice: {
        transactionDate: currentData?.transactionDate || currentDataAny.TransactionDate || new Date().toISOString(),
        refDocNumber: currentData?.applicationCode || currentData?.refDocNumber || currentDataAny.RefDocNumber || (isNewRoute ? '' : applicationNumber.trim()),
        refDocName: currentData?.refDocName || currentDataAny.RefDocName || 'NAPP',
        customerName: payeeName || currentData?.customerName || currentDataAny.CustomerName,
        totalAmount: totals.totalPayable || currentData?.totalAmount || currentDataAny.TotalAmount || currentData?.summary?.grandTotal || 0,
        payingAmount: totals.totalPayable || currentData?.payingAmount || currentDataAny.PayingAmount || currentData?.summary?.grandTotal || 0,
        taxAmount: totals.taxAmount || currentData?.taxAmount || currentDataAny.TaxAmount || currentData?.summary?.totalTax || 0,
        taxPercentage: currentData?.taxPercentage || currentDataAny.TaxPercentage || 9,
        taxCode: currentData?.taxCode || currentDataAny.TaxCode || null,
        nicheApplicationId: currentData?.nicheApplicationId || currentDataAny.NicheApplicationId,
        ...addressData,
        paymentMode: normalizePaymentModeForBackend(effectivePaymentMode),
        paymentModeDocNo: refDocumentNo, // Add the reference document number for payment verification
      },
      invoiceDetails: mappedInvoiceDetails,
      createReceipt: withReceipt,
    };

    try {
      await dispatch(createInvoice(invoicePayload)).unwrap();
    } catch (e: any) {
      console.error('Failed to create invoice:', e);
      showError('Error', e?.message || String(e) || 'Failed to create invoice');
    }
  };

  // Receipt table requires InvoiceId NOT NULL. So "receipt only" is implemented
  // as "create invoice + receipt" when the record is still an application.
  // const handleGenerateReceipt = async () => {
  //   await handleGenerateInvoice(true);
  // };

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
      // Build customer address string - prioritize form state, fallback to currentData
      const customerAddressParts: string[] = [];

      // Try to build from form state first
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

      // Also add any missing address fields from currentData to complement form state
      if (currentData) {
        // Add addressNo if not already in form state
        if (!addressNumber && currentData.addressNo) customerAddressParts.push(currentData.addressNo);
        // Add address if not already in form state
        if (!addressStreet && currentData.address) customerAddressParts.push(currentData.address);
        // Add address2 if not already in form state
        if (!addressUnit && currentData.address2) customerAddressParts.push(currentData.address2);
        // Add addressCity if not already in form state
        if (!addressPostalCode && currentData.addressCity) customerAddressParts.push(currentData.addressCity);
        // Add country if not already in form state
        if (!addressCountry && currentData.country) customerAddressParts.push(currentData.country);
      }

      const customerAddress = customerAddressParts.join(', ') || '';

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


      console.log('Address formmmmmmm', customerAddress,);


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
        receipt = await receiptService.getReceiptByCode(receiptCode);
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
          addressNo: addressBlock === 'Block' ? 'Blk' : addressBlock,
          address: addressNumber || currentData?.addressNo || undefined,
          address2: addressStreet || currentData?.address || undefined,
          addressCity: addressUnit || currentData?.address2 || undefined,
          districtCode: addressPostalCode || currentData?.districtCode || undefined,
          country: addressCountry || currentData?.country || 'Singapore',
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
                  <label className="w-full sm:w-[140px] font-semibold text-gray-700 text-sm">code:</label>
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

                {/* Flags banner */}
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
                      <div className="text-green-700 text-xs mt-1">You can print invoice / receipt.</div>
                    </div>
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

              {/* Payment Mode and Ref Document No and Print Buttons */}
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
                  <>{console.log("Payment Mode:", paymentMode)}</>
                  {(paymentMode == 'Cheque' || paymentMode == 'Bank Transfer') && (
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                      <label className="w-full sm:w-[140px] font-semibold text-gray-700 text-sm">Ref Document No:</label>
                      <input
                        type="text"
                        value={refDocumentNo}
                        onChange={(e) => setRefDocumentNo(e.target.value)}
                        placeholder="Enter reference document number"
                        className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                      />
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handlePrintInvoice}
                      disabled={
                        (!invoiceNumber.trim() && !currentData?.code) ||
                        viewingInvoiceCode !== null ||
                        !!(currentData && currentData.hasInvoice === false && !isNewRoute)
                      }
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
                      disabled={
                        (!receiptCode.trim() && !currentData?.receipt?.receiptCode) ||
                        viewingReceiptCode !== null ||
                        !!(currentData && currentData.hasReceipt === false && !isNewRoute)
                      }
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

                {/* Generate buttons (match design; show when creating new invoice or when backend allows) */}
                {(isNewRoute || (!invoiceNumber.trim() && !receiptCode.trim()) || (currentData && (currentData.canCreateInvoice || currentData.canCreateReceipt))) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Individual Invoice Creation Button */}
                      <button
                        onClick={handleCreateInvoice}
                        disabled={
                          creatingInvoice ||
                          (currentData?.hasInvoice === true) ||
                          (currentData?.canCreateInvoice === false && !isNewRoute && !!applicationNumber)
                        }
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
                            Create Invoice
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleCreateReceipt}
                        disabled={
                          creatingReceipt ||
                          (currentData?.hasReceipt === true && !isNewRoute)
                        }
                        className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {creatingReceipt ? (
                          <>
                            <LoaderIcon className="w-4 h-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            Create Receipt
                          </>
                        )}
                      </button>

                      {/* Combined Invoice + Receipt Button */}
                      <button
                        onClick={() => handleGenerateInvoice(true)}
                        disabled={
                          creatingInvoice ||
                          (!isNewRoute && !paymentMode.trim()) ||
                          (!isNewRoute && !applicationNumber.trim()) ||
                          (currentData?.hasInvoice === true) ||
                          (currentData?.canCreateInvoice === false && !isNewRoute)
                        }
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
                    </div>

                    {/* Status indicators */}


                    {/* Helper message when no data loaded but user wants to create */}
                    {!currentData && applicationNumber.trim() && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                        <AlertTriangle className="w-4 h-4 inline mr-2" />
                        Enter application data above and click "View Data" to load details, then you can create invoice/receipt.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Application Items Section */}

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
                            value={item.amountPaying === 0 ? '' : item.amountPaying}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                updateItemCalculation(item.id, 'amountPaying', 0);
                              } else {
                                updateItemCalculation(item.id, 'amountPaying', parseFloat(val) || 0);
                              }
                            }}
                            className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-md bg-[#f9f2e7] focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all text-sm text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d+$/.test(val)) {
                                updateItemCalculation(item.id, 'quantity', parseInt(val) || 0);
                              }
                            }}
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
                disabled={false}
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

      {/* Invoice Viewer Modal */}
      <InvoiceViewerModal
        isOpen={isInvoiceViewerOpen}
        onClose={() => {
          setIsInvoiceViewerOpen(false);
          setViewerInvoiceData(null);
        }}
        invoiceData={viewerInvoiceData}
        loading={viewingInvoiceCode !== null}
      />

      <ReceiptDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        receipt={selectedReceipt}
      />

      {/* Agreement Viewer Modal */}
      <AgreementViewerModal
        isOpen={isAgreementViewerOpen}
        onClose={() => {
          setIsAgreementViewerOpen(false);
          setAgreementData(null);
          setSecondNomineeAgreementData(null);
        }}
        agreementData={agreementData}
        secoundNomineeAgreement={secondNomineeAgreementData}
        applicationNumber={applicationNumber}
        loading={false}
      />
    </Layout>
  );
}