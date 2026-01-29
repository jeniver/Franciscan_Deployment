import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useReceipt } from '../hooks/useReceipt';
import { useToast } from '../contexts/ToastContext';
import { addressService } from '../services/addressService';
import { parseRawAddress } from '../components/AddressInput';
import { PrinterIcon, EyeIcon, LoaderIcon } from 'lucide-react';
import { InvoiceViewerModal } from '../components/InvoiceViewerModal';
import { InvoiceTemplateData } from '../services/invoiceTemplateService';

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
  const { showSuccess, showError } = useToast();
  const { 
    fetchLastReceiptNumber, 
    getReceiptPdfLink,
    fetchInvoiceByCode,
    fetchReceiptItems,
    selectedInvoice,
    lastReceiptNumber,
    receiptItems,
    loading 
  } = useReceipt();
  
  // Get application number from route state if available
  const routeState = location.state as { applicationNumber?: string } | null;
  const applicationNumberFromRoute = routeState?.applicationNumber || '';

  const [applicationNumber, setApplicationNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiptCode] = useState('');
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
  
  // Ref for debouncing postal code lookup
  const postalCodeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get available items for dropdown (from Redux or fallback)
  const availableItems = receiptItems.length > 0 
    ? receiptItems.map(item => item.itemName || item.description || '').filter(Boolean)
    : DEFAULT_ITEM_OPTIONS;

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

  // Handle view invoice by application number
  const handleViewInvoiceByApplication = async (appNumber: string) => {
    if (!appNumber.trim()) {
      return;
    }
    
    try {
      // Try to fetch invoice using application number as invoice code
      const result = await fetchInvoiceByCode(appNumber.trim());
      
      // Check if the dispatch was successful
      if (result.type.endsWith('/fulfilled')) {
        const invoice = selectedInvoice || (result.payload as any);
        
        if (!invoice) {
          showError('Error', 'Invoice not found');
          return;
        }
        
        // Map invoice data to form fields
        // Use code from invoice API response (invoiceCode already contains Code from API)
        setInvoiceNumber(invoice.invoiceCode || invoiceNumber || '');
        setPayeeName(invoice.customerName || '');
        setPaymentMode(invoice.paymentMode || 'Cash');
        
        // Parse and set transaction date (format as DD-MM-YYYY)
        if (invoice.invoiceDate) {
          const date = new Date(invoice.invoiceDate);
          if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            setTransactionDate(`${day}-${month}-${year}`);
          }
        }
        
        // Parse address from invoice API (if available)
        const invoiceData = invoice as any;
        if (invoiceData.address || invoiceData.customerAddress) {
          const addressString = invoiceData.address || invoiceData.customerAddress || '';
          applyParsedAddress(addressString);
        } else if (invoiceData.addressBlock || invoiceData.addressNumber || invoiceData.addressStreet) {
          // Handle individual address fields if provided
          if (invoiceData.addressBlock) setAddressBlock(invoiceData.addressBlock);
          if (invoiceData.addressNumber) setAddressNumber(invoiceData.addressNumber);
          if (invoiceData.addressStreet) setAddressStreet(invoiceData.addressStreet);
          if (invoiceData.addressUnit) setAddressUnit(invoiceData.addressUnit);
          if (invoiceData.addressPostalCode) setAddressPostalCode(invoiceData.addressPostalCode);
          if (invoiceData.addressCountry) setAddressCountry(invoiceData.addressCountry);
        }
        
        // Map invoice details to items
        if (invoice.invoiceDetails && invoice.invoiceDetails.length > 0) {
          const mappedItems: InvoiceItem[] = invoice.invoiceDetails.map((detail: any, index: number) => {
            // Get values directly from API response
            const itemName = detail.itemName || detail.ItemName || detail.description || detail.Item || '';
            const quantity = detail.quantity || detail.Quantity || 1;
            const payingAmount = detail.payingAmount || detail.PayingAmount || detail.unitPrice || detail.UnitAmount || 0;
            const lineTaxPercent = detail.lineTaxPercent || detail.LineTaxPercent || detail.taxPercent || detail.TaxPercent || 9;
            const lineTaxAmount = detail.lineTaxAmount || detail.LineTaxAmount || detail.taxAmount || detail.TaxAmount || 0;
            const totalPayingAmount = detail.totalPayingAmount || detail.TotalPayingAmount || detail.amount || detail.Amount || 0;
            const lineTotalAmount = detail.lineTotalAmount || detail.LineTotalAmount || detail.unitPrice || detail.UnitAmount || 0;
            const refDocNumber = detail.refDocNumber || detail.RefDocNumber || '';
            
            // Select item from dropdown based on itemName from API
            let selectItem = availableItems[0] || 'Other';
            
            if (itemName) {
              // First try to match with receiptItems using itemId or itemName
              const matchedReceiptItem = receiptItems.find(
                receiptItem => 
                  (detail.itemId && receiptItem.itemId === detail.itemId) ||
                  receiptItem.itemName?.trim().toLowerCase() === itemName.trim().toLowerCase() ||
                  receiptItem.description?.trim().toLowerCase() === itemName.trim().toLowerCase()
              );
              
              if (matchedReceiptItem) {
                // Use the itemName from receiptItems to ensure exact match
                selectItem = matchedReceiptItem.itemName || selectItem;
              } else {
                // Try to find exact match in availableItems (case-insensitive)
                const exactMatch = availableItems.find(item => 
                  item.trim().toLowerCase() === itemName.trim().toLowerCase()
                );
                
                if (exactMatch) {
                  selectItem = exactMatch;
                } else {
                  // Try partial match
                  const partialMatch = availableItems.find(item => 
                    item.toLowerCase().includes(itemName.toLowerCase()) || 
                    itemName.toLowerCase().includes(item.toLowerCase())
                  );
                  
                  if (partialMatch) {
                    selectItem = partialMatch;
                  } else {
                    // Fallback to keyword matching
                    const lowerItemName = itemName.toLowerCase();
                    if (lowerItemName.includes('niche')) {
                      const nicheItem = availableItems.find(item => item.toLowerCase().includes('niche'));
                      selectItem = nicheItem || 'Level 3 Niche';
                    } else if (lowerItemName.includes('inscription')) {
                      const inscriptionItem = availableItems.find(item => item.toLowerCase().includes('inscription'));
                      selectItem = inscriptionItem || 'Niche Inscription Both Name';
                    } else if (lowerItemName.includes('urn')) {
                      const urnItem = availableItems.find(item => item.toLowerCase().includes('urn'));
                      selectItem = urnItem || 'Urn (Brass praying hands)';
                    } else if (lowerItemName.includes('room') || lowerItemName.includes('verna')) {
                      const roomItem = availableItems.find(item => item.toLowerCase().includes('room') || item.toLowerCase().includes('verna'));
                      selectItem = roomItem || 'Booking of La Verna Room';
                    } else if (lowerItemName.includes('clearing') || lowerItemName.includes('fee')) {
                      const feeItem = availableItems.find(item => item.toLowerCase().includes('clearing') || item.toLowerCase().includes('fee'));
                      selectItem = feeItem || 'Clearing fees';
                    }
                  }
                }
              }
            }
            
            // Find the corresponding item in receiptItems to get its default Price
            const matchedReceiptItem = receiptItems.find(
              receiptItem => 
                (detail.itemId && receiptItem.itemId === detail.itemId) ||
                receiptItem.itemName?.trim() === selectItem.trim() || 
                receiptItem.description?.trim() === selectItem.trim() ||
                receiptItem.itemName?.trim().toLowerCase() === selectItem.trim().toLowerCase()
            );
            
            // Get default amount from receiptItems (the base Price from item catalog)
            const defaultAmount = matchedReceiptItem?.unitPrice ?? matchedReceiptItem?.defaultAmount ?? payingAmount;
            
            // Use values directly from API for calculations
            // Total (No Tax) = lineTotalAmount or payingAmount * quantity
            const totalNoTax = lineTotalAmount || (payingAmount * quantity);
            
            // Map directly from API response
            const amountPaying = payingAmount;
            const taxPercent = lineTaxPercent;
            const taxAmount = lineTaxAmount;
            const totalAmount = totalPayingAmount || (totalNoTax + taxAmount);
            
            return {
              id: `item-${index}-${Date.now()}`,
              selectItem,
              reference: refDocNumber,
              defaultAmount, // Default price from item catalog
              amountPaying, // From API: payingAmount
              quantity,
              totalNoTax, // From API: lineTotalAmount or calculated
              taxPercent, // From API: lineTaxPercent
              taxAmount, // From API: lineTaxAmount
              totalAmount // From API: totalPayingAmount
            };
          });
          
          setItems(mappedItems);
        } else {
          // Clear items if no details
          setItems([]);
        }
        
        // Optionally refetch items for this specific receipt/invoice if we have a receipt ID
        // This ensures we have the latest items for this specific receipt
        if (invoice.invoiceId) {
          fetchReceiptItems(invoice.invoiceId.toString(), true).catch((err) => {
            console.warn('Failed to refetch items for invoice:', err);
            // Continue with existing items
          });
        }
        
        showSuccess('Success', 'Invoice loaded successfully');
      } else if (result.type.endsWith('/rejected')) {
        const errorPayload = result.payload as { message?: string };
        showError('Error', errorPayload?.message || 'Failed to load invoice');
      }
    } catch (error: any) {
      console.error('Error loading invoice:', error);
      showError('Error', error.message || 'Failed to load invoice');
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

    // If application number is provided from route, auto-fetch invoice data
    if (applicationNumberFromRoute) {
      setApplicationNumber(applicationNumberFromRoute);
      // Auto-fetch invoice using application number as invoice code
      handleViewInvoiceByApplication(applicationNumberFromRoute);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLastReceiptNumber, fetchReceiptItems, applicationNumberFromRoute]);

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
  const updateItemCalculation = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
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
  };

  // Add new item
  const handleAddItem = () => {
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
    setItems([...items, newItem]);
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Handle view invoice (for manual entry)
  const handleViewInvoice = async () => {
    if (!applicationNumber.trim()) {
      showError('Error', 'Please enter an application number');
      return;
    }
    
    await handleViewInvoiceByApplication(applicationNumber.trim());
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

      // Map items to template items
      const templateItems = items.map(item => ({
        description: item.selectItem || 'Item',
        quantity: item.quantity || 1,
        unitPrice: item.amountPaying || 0,
        amount: item.totalAmount || 0,
      }));

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

      // Get receipt PDF URL - the service already opens it in a new tab
      await getReceiptPdfLink(codeToUse, true, applicationNumber || applicationNumberFromRoute);
      showSuccess('Success', 'Receipt PDF opened in a new tab');
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
                  <label className="w-full sm:w-[140px] font-semibold text-gray-700 text-sm">Application Number:</label>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={applicationNumber}
                      onChange={(e) => setApplicationNumber(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all"
                      placeholder="Enter application number"
                    />
                    <button
                      onClick={handleViewInvoice}
                      disabled={loading || !applicationNumber.trim()}
                      className="px-5 py-2 bg-gradient-to-r from-[#4b3621] to-[#5a4730] text-white rounded-lg font-semibold hover:from-[#5a4730] hover:to-[#4b3621] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <LoaderIcon className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <EyeIcon className="w-4 h-4" />
                          View Invoice
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
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
                      disabled={!invoiceNumber.trim() && !receiptCode.trim() || viewingInvoiceCode !== null}
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
                      disabled={!invoiceNumber.trim() && !receiptCode.trim() || viewingReceiptCode !== null}
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
              </div>
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
                          ${item.defaultAmount.toFixed(2)}
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
                          ${item.totalNoTax.toFixed(2)}
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
                          ${item.taxAmount.toFixed(2)}
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2 text-right font-semibold text-[#4b3621]">
                          ${item.totalAmount.toFixed(2)}
                        </td>
                        <td className="border border-[#bbaaaa] px-2 py-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-all shadow-sm hover:shadow-md text-xs"
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
                className="w-full px-6 py-3 bg-gradient-to-r from-[#4b3621] to-[#5a4730] text-white rounded-lg font-semibold hover:from-[#5a4730] hover:to-[#4b3621] transition-all shadow-md hover:shadow-lg"
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
                <div className="text-xl font-bold text-gray-800">${totals.total.toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-600 mb-2">Tax Amount</label>
                <div className="text-xl font-bold text-gray-800">${totals.taxAmount.toFixed(2)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <label className="block text-sm font-semibold text-green-700 mb-2">Total Payable</label>
                <div className="text-xl font-bold text-green-800">${totals.totalPayable.toFixed(2)}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <label className="block text-sm font-semibold text-blue-700 mb-2">Total Donation</label>
                <div className="text-xl font-bold text-blue-800">${totals.totalDonation.toFixed(2)}</div>
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
    </Layout>
  );
}

