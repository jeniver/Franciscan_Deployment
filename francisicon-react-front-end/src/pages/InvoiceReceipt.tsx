import React, { useEffect, useState, useMemo, useRef } from 'react';
import { ReceiptIcon, DownloadIcon, PrinterIcon } from 'lucide-react';
import { normalizeFormData } from '../types/nicheApplication';
import { useNiche } from '../hooks/useNiche';
import { invoicePdfService } from '../services/invoicePdfService';
import { InvoiceViewerModal } from '../components/InvoiceViewerModal';
import { InvoiceTemplateData } from '../services/invoiceTemplateService';
import { nicheAgreementService } from '../services/nicheAgreementService';
import { invoiceService } from '../services/invoiceService';

interface InvoiceReceiptProps {
  formData: any;
  setFormData: (data: any) => void;
  isReadOnly?: boolean;
}

export function InvoiceReceipt({
  formData,
  setFormData,
  isReadOnly = false
}: InvoiceReceiptProps) {
  const [invoiceData, setInvoiceData] = useState<any>({});
  const [hasBackendInvoice, setHasBackendInvoice] = useState(false);
  const invoiceNoRef = useRef<string | null>(null);
  const invoiceDateRef = useRef<string | null>(null);
  
  // Get niches data for pricing calculation
  const { niches } = useNiche();
  
  // Normalize form data to get proper structure
  const normalizedData = normalizeFormData(formData);
  
  // Memoize invoice number and date - only generate once per application
  const stableInvoiceNo = useMemo(() => {
    if (!invoiceNoRef.current) {
      invoiceNoRef.current = `INV-${Date.now()}`;
    }
    return invoiceNoRef.current;
  }, [normalizedData.applicationNumber]); // Reset when application number changes
  
  const stableInvoiceDate = useMemo(() => {
    if (!invoiceDateRef.current) {
      invoiceDateRef.current = new Date().toLocaleDateString();
    }
    return invoiceDateRef.current;
  }, [normalizedData.applicationNumber]);
  
  // Reset invoice refs when application number changes (new application)
  useEffect(() => {
    invoiceNoRef.current = null;
    invoiceDateRef.current = null;
    // When switching applications, clear backend flag so we can refetch
    setHasBackendInvoice(false);
  }, [normalizedData.applicationNumber]);

  // Try to load invoice from backend agreement so view & download use same data
  useEffect(() => {
    const appNumber = (normalizedData.applicationNumber || '').trim();
    if (!appNumber) {
      return;
    }

    let isCancelled = false;

    const loadAgreementInvoice = async () => {
      try {
        // Check if it's an inscription code (starts with 'I-')
        const isInspectionCode = appNumber.startsWith('I-') || 
                                /^I-\d+-\d+$/.test(appNumber) || 
                                appNumber.startsWith('INCR-');
        
        let response;
        if (isInspectionCode) {
          // For inscription codes, use the invoice service which handles both niche and inscription data
          response = await invoiceService.getInvoiceByCode(appNumber);
        } else {
          // For niche application codes, use the niche agreement service
          response = await nicheAgreementService.getNicheAgreement(appNumber);
        }

        // Handle response based on whether it's from inscription or niche service
        let agreementInvoice, applicant, niche, metadata, backendInvoice;
        
        if (isInspectionCode) {
          // Handle inscription response format
          const data = response;
          
          if (data.isApplicationData && data.items) {
            // This is application data (no invoice exists yet)
            backendInvoice = {
              invoiceNo: invoiceNoRef.current || `INV-${appNumber}`,
              invoiceDate: invoiceDateRef.current || new Date().toLocaleDateString(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
              totalAmount: Number(data.summary?.grandTotal ?? 0) || 0,
              nicheAmount: 0, // No niche amount for inscriptions
              serviceAmount: 0, // No service fee for inscriptions
              taxAmount: Number(data.summary?.totalTax ?? 0) || 0,
              status: 'Pending',
              // Applicant details (from backend)
              applicantName: data.customerName || normalizedData.applicantName,
              applicantIDNo: normalizedData.applicantIDNo, // Not available in inscription data
              applicantEmail: normalizedData.applicantEmail, // Not available in inscription data
              applicantPhone: normalizedData.applicantPhone, // Not available in inscription data
              applicantAddress: normalizedData.applicantAddress, // Not available in inscription data
              // Niche details (not applicable for inscriptions)
              nicheDetails: {
                nicheId: null,
                nicheCode: normalizedData.nicheCode, // Use from form data
                nicheNumber: normalizedData.nicheNumber, // Use from form data
                chapel: normalizedData.chapel, // Use from form data
                chapelCode: normalizedData.chapelCode, // Use from form data
                wallName: normalizedData.wallName, // Use from form data
                wallCode: normalizedData.wallCode, // Use from form data
                rowNumber: normalizedData.rowNumber, // Use from form data
                rowLevel: normalizedData.rowLevel, // Use from form data
                nichePrice: 0, // No niche price for inscriptions
              },
              beneficiaries: (data.beneficiaries || []).map((b: any) => ({
                name: b.name || '',
                relationshipToApplicant: b.relationshipToApplicant || '',
                nric: b.idNo || '',
              })),
              nominees: [data.nominee, data.nominee2]
                .filter(Boolean)
                .map((n: any) => ({
                  name: n.name || '',
                  relationship: n.relationship || '',
                  nric: n.idNo || '',
                })),
              metadata: {
                applicationNumber: data.applicationCode || appNumber,
              },
            };
          } else {
            // This is actual invoice data
            backendInvoice = {
              invoiceNo: data.code || data.invoiceCode || invoiceNoRef.current || `INV-${appNumber}`,
              invoiceDate: data.transactionDate ? new Date(data.transactionDate).toLocaleDateString() : invoiceDateRef.current || new Date().toLocaleDateString(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
              totalAmount: Number(data.totalAmount ?? data.payingAmount ?? 0) || 0,
              nicheAmount: 0, // No niche amount for inscriptions
              serviceAmount: 0, // No service fee for inscriptions
              taxAmount: Number(data.taxAmount ?? 0) || 0,
              status: data.status ? (data.status === 1 ? 'Active' : 'Inactive') : 'Pending',
              // Applicant details
              applicantName: data.customerName || normalizedData.applicantName,
              applicantIDNo: normalizedData.applicantIDNo,
              applicantEmail: normalizedData.applicantEmail,
              applicantPhone: normalizedData.applicantPhone,
              applicantAddress: normalizedData.applicantAddress,
              // Niche details (not applicable for inscriptions)
              nicheDetails: {
                nicheId: null,
                nicheCode: normalizedData.nicheCode,
                nicheNumber: normalizedData.nicheNumber,
                chapel: normalizedData.chapel,
                chapelCode: normalizedData.chapelCode,
                wallName: normalizedData.wallName,
                wallCode: normalizedData.wallCode,
                rowNumber: normalizedData.rowNumber,
                rowLevel: normalizedData.rowLevel,
                nichePrice: 0,
              },
              beneficiaries: [],
              nominees: [],
              metadata: {
                applicationNumber: data.refDocNumber || appNumber,
              },
              // Store inscription-specific details
              details: data.details || [],
              summary: data.summary || {}
            };
          }
        } else {
          // Handle niche agreement response format (existing logic)
          const data = response?.data;
          if (!data || isCancelled) return;

          agreementInvoice = data.invoice || {};
          applicant = data.applicant || {};
          niche = data.niche || {};
          metadata = data.metadata || {};

          backendInvoice = {
            invoiceNo: agreementInvoice.invoiceNo || invoiceNoRef.current || `INV-${appNumber}`,
            invoiceDate: agreementInvoice.invoiceDate || invoiceDateRef.current || new Date().toLocaleDateString(),
            dueDate:
              agreementInvoice.invoiceDate ||
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            totalAmount: Number(agreementInvoice.invoicePayingAmount ?? niche.totalAmount ?? 0) || 0,
            nicheAmount: Number(niche.totalAmount ?? 0) || 0,
            serviceAmount: 300, // Updated service fee (Setting of tables + Sealing of niche: 20 + 20 = 40, but using 300 as per standard practice)
            taxAmount: Number(agreementInvoice.taxAmount ?? 0) || 0,
            status: (data.agreement?.status || 'Pending') as string,
            // Applicant details (from backend)
            applicantName: applicant.name || normalizedData.applicantName,
            applicantIDNo: applicant.idNo || normalizedData.applicantIDNo,
            applicantEmail: applicant.email || normalizedData.applicantEmail,
            applicantPhone: applicant.mobileNo || normalizedData.applicantPhone,
            applicantAddress: applicant.address || normalizedData.applicantAddress,
            // Niche details (from backend)
            nicheDetails: {
              nicheId: null,
              nicheCode: niche.code || normalizedData.nicheCode,
              nicheNumber: niche.number || normalizedData.nicheNumber,
              chapel:
                niche.location?.chapel?.chapelName ||
                niche.chapelName ||
                normalizedData.chapel,
              chapelCode: niche.location?.chapel?.chapelCode || normalizedData.chapelCode,
              wallName:
                niche.location?.wall?.wallName ||
                niche.wallName ||
                normalizedData.wallName,
              wallCode: niche.location?.wall?.wallCode || normalizedData.wallCode,
              rowNumber:
                niche.rowNumber ||
                niche.location?.row?.rowCode ||
                normalizedData.rowNumber,
              rowLevel: niche.location?.row?.level ?? normalizedData.rowLevel,
              nichePrice: Number(niche.totalAmount ?? 0) || 0,
            },
            beneficiaries: (data.beneficiaries || []).map((b: any) => ({
              name: b.name || '',
              relationshipToApplicant: b.relationshipToApplicant || '',
              nric: b.idNo || '',
            })),
            nominees: [data.nominee, data.nominee2]
              .filter(Boolean)
              .map((n: any) => ({
                name: n.name || '',
                relationship: n.relationship || '',
                nric: n.idNo || '',
              })),
            metadata: {
              applicationNumber: metadata.applicationNumber || appNumber,
            },
          };
        }

        setInvoiceData(backendInvoice);
        setHasBackendInvoice(true);
      } catch (error) {
        console.error('Error loading agreement invoice:', error);
        // If backend agreement is not available, fall back to local calculation
        setHasBackendInvoice(false);
      }
    };

    void loadAgreementInvoice();

    return () => {
      isCancelled = true;
    };
  }, [normalizedData.applicationNumber, normalizedData.applicantName, normalizedData.applicantIDNo, normalizedData.applicantEmail, normalizedData.applicantPhone, normalizedData.applicantAddress, normalizedData.nicheCode, normalizedData.nicheNumber, normalizedData.chapel, normalizedData.chapelCode, normalizedData.wallName, normalizedData.wallCode, normalizedData.rowNumber, normalizedData.rowLevel]);

  // Local calculation used when backend invoice is not (yet) available
  useEffect(() => {
    if (hasBackendInvoice) {
      // When we already have backend data, don't override it with local calculation
      return;
    }

    // Calculate pricing based on selected niche
    const selectedNiche = normalizedData.nicheId ? 
      // Try to find niche in current niches or use default pricing
      niches.find(n => n.nicheId === normalizedData.nicheId) || 
      { defaultAmount: 1000 } // Default amount if niche not found
      : { defaultAmount: 0 };

    const nicheAmount = selectedNiche.defaultAmount || 0;
    const serviceAmount = 300; // Updated service fee (Setting of tables + Sealing of niche: 20 + 20 = 40, but using 300 as per standard practice)
    const taxAmount = Math.round((nicheAmount + serviceAmount) * 0.09); // 9% GST (updated from 7%)
    const totalAmount = nicheAmount + serviceAmount + taxAmount;

    // Generate invoice data based on form data - use stable invoice number
    const generatedInvoice = {
      invoiceNo: stableInvoiceNo,
      invoiceDate: stableInvoiceDate,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 30 days from now
      totalAmount: totalAmount,
      nicheAmount: nicheAmount,
      serviceAmount: serviceAmount,
      taxAmount: taxAmount,
      status: 'Pending',
      // Applicant details
      applicantName: normalizedData.applicantName,
      applicantIDNo: normalizedData.applicantIDNo,
      applicantEmail: normalizedData.applicantEmail,
      applicantPhone: normalizedData.applicantPhone,
      applicantAddress: normalizedData.applicantAddress,
      // Niche details
      nicheDetails: {
        nicheId: normalizedData.nicheId,
        nicheCode: normalizedData.nicheCode,
        nicheNumber: normalizedData.nicheNumber,
        chapel: normalizedData.chapel,
        chapelCode: normalizedData.chapelCode,
        wallName: normalizedData.wallName,
        wallCode: normalizedData.wallCode,
        rowNumber: normalizedData.rowNumber,
        rowLevel: normalizedData.rowLevel,
        nichePrice: nicheAmount
      },
      // Beneficiary details
      beneficiaries: normalizedData.beneficiaries,
      // Nominee details
      nominees: normalizedData.nominees
    };
    
    setInvoiceData(generatedInvoice);
  }, [hasBackendInvoice, normalizedData.nicheId, normalizedData.applicantName, normalizedData.applicantIDNo, normalizedData.applicantEmail, normalizedData.applicantPhone, normalizedData.applicantAddress, normalizedData.nicheCode, normalizedData.nicheNumber, normalizedData.chapel, normalizedData.chapelCode, normalizedData.wallName, normalizedData.wallCode, normalizedData.rowNumber, normalizedData.rowLevel, normalizedData.beneficiaries, normalizedData.nominees, stableInvoiceNo, stableInvoiceDate]); // Use stable values
  
  const applicationNumber = normalizedData.applicationNumber || '';
  
  const handleDownloadPdf = async () => {
    try {
      await invoicePdfService.generateInvoicePdf({
        invoiceNo: invoiceData.invoiceNo || `INV-${Date.now()}`,
        invoiceDate: invoiceData.invoiceDate || new Date().toLocaleDateString(),
        dueDate:
          invoiceData.dueDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        applicationNumber:
          (invoiceData.metadata && invoiceData.metadata.applicationNumber) ||
          applicationNumber,
        applicantName: invoiceData.applicantName || normalizedData.applicantName || '',
        applicantIDNo: invoiceData.applicantIDNo || normalizedData.applicantIDNo || '',
        applicantEmail: invoiceData.applicantEmail || normalizedData.applicantEmail || '',
        applicantPhone: invoiceData.applicantPhone || normalizedData.applicantPhone || '',
        applicantAddress:
          invoiceData.applicantAddress || normalizedData.applicantAddress || '',
        nicheDetails: {
          nicheId: invoiceData.nicheDetails?.nicheId ?? normalizedData.nicheId,
          nicheCode: invoiceData.nicheDetails?.nicheCode || normalizedData.nicheCode || '',
          chapel: invoiceData.nicheDetails?.chapel || normalizedData.chapel || '',
          wallName: invoiceData.nicheDetails?.wallName || normalizedData.wallName || '',
          rowNumber: invoiceData.nicheDetails?.rowNumber || normalizedData.rowNumber || '',
          rowLevel:
            invoiceData.nicheDetails?.rowLevel !== undefined
              ? invoiceData.nicheDetails.rowLevel
              : normalizedData.rowLevel,
        },
        beneficiaries: (invoiceData.beneficiaries && invoiceData.beneficiaries.length
          ? invoiceData.beneficiaries
          : normalizedData.beneficiaries || []
        ).map((b: any) => ({
          name: b.name || b.fullName || '',
          relationship: b.relationshipToApplicant || b.relationship || '',
          nric: b.nric || b.idNo || '',
        })),
        nominees: (invoiceData.nominees && invoiceData.nominees.length
          ? invoiceData.nominees
          : normalizedData.nominees || []
        ).map((n: any) => ({
          name: n.name || n.fullName || '',
          nric: n.nric || n.idNo || '',
          relationship: n.relationship || '',
        })),
        pricing: {
          nicheAmount: invoiceData.nicheAmount || 0,
          serviceAmount: invoiceData.serviceAmount || 0,
          taxAmount: invoiceData.taxAmount || 0,
          totalAmount: invoiceData.totalAmount || 0
        }
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Popup invoice viewer state
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
  const [viewerInvoiceData, setViewerInvoiceData] = useState<InvoiceTemplateData | null>(null);

  const handlePrint = async () => {
    // Open HTML popup viewer instead of direct PDF print
    const tmpl: InvoiceTemplateData = {
      invoiceCode: invoiceData.invoiceNo || stableInvoiceNo,
      invoiceDate: invoiceData.invoiceDate || stableInvoiceDate,
      customerName: invoiceData.applicantName || normalizedData.applicantName || '',
      customerAddress: invoiceData.applicantAddress || normalizedData.applicantAddress || '',
      paymentMode: invoiceData.paymentMode || '',
      totalAmount: invoiceData.totalAmount || 0,
      taxAmount: invoiceData.taxAmount || 0,
      items: [], // Could be populated from backend invoice details in future
    };
    setViewerInvoiceData(tmpl);
    setIsInvoiceViewerOpen(true);
  };
  
  return <div>
      <div className="flex items-center gap-3 mb-6">
        <ReceiptIcon className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Invoice & Receipt
        </h2>
      </div>
      
      {/* Application Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Application Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800">Application Number:</span>
            <span className="ml-2 text-blue-700">{applicationNumber || 'Not assigned'}</span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Applicant:</span>
            <span className="ml-2 text-blue-700">{normalizedData.applicantName || 'Not specified'}</span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Niche ID:</span>
            <span className="ml-2 text-blue-700">{normalizedData.nicheId || 'Not selected'}</span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Chapel:</span>
            <span className="ml-2 text-blue-700">{normalizedData.chapel || 'Not specified'}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Invoice Summary
              </h3>
              <p className="text-sm text-gray-600">
                Application #{applicationNumber || 'Pending'}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                <DownloadIcon className="w-4 h-4" />
                Download PDF
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                <PrinterIcon className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-300">
              <span className="text-sm text-gray-600">Invoice Number</span>
              <span className="text-sm font-medium text-gray-900">
                {invoiceData.invoiceNo || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-300">
              <span className="text-sm text-gray-600">Invoice Date</span>
              <span className="text-sm font-medium text-gray-900">
                {invoiceData.invoiceDate || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-300">
              <span className="text-sm text-gray-600">Due Date</span>
              <span className="text-sm font-medium text-gray-900">
                {invoiceData.dueDate || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-300">
              <span className="text-sm text-gray-600">Status</span>
              <span className="text-sm font-medium text-gray-900">
                {invoiceData.status || 'Pending'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Niche Details Section */}
        {invoiceData.nicheDetails && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Niche Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-800">Niche ID:</span>
                <span className="ml-2 text-green-700">{invoiceData.nicheDetails.nicheId || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Niche Code:</span>
                <span className="ml-2 text-green-700">{invoiceData.nicheDetails.nicheCode || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Chapel:</span>
                <span className="ml-2 text-green-700">{invoiceData.nicheDetails.chapel || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Wall:</span>
                <span className="ml-2 text-green-700">{invoiceData.nicheDetails.wallName || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Row:</span>
                <span className="ml-2 text-green-700">{invoiceData.nicheDetails.rowNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Level:</span>
                <span className="ml-2 text-green-700">{invoiceData.nicheDetails.rowLevel || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Beneficiary Details Section */}
        {invoiceData.beneficiaries && invoiceData.beneficiaries.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Beneficiary Details</h3>
            <div className="space-y-3">
              {invoiceData.beneficiaries.map((beneficiary: any, index: number) => (
                <div key={index} className="text-sm">
                  <span className="font-medium text-purple-800">Beneficiary {index + 1}:</span>
                  <span className="ml-2 text-purple-700">
                    {beneficiary.name} ({beneficiary.relationshipToApplicant})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Nominee Details Section */}
        {invoiceData.nominees && invoiceData.nominees.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-orange-900 mb-4">Nominee Details</h3>
            <div className="space-y-3">
              {invoiceData.nominees.map((nominee: any, index: number) => (
                <div key={index} className="text-sm">
                  <span className="font-medium text-orange-800">Nominee {index + 1}:</span>
                  <span className="ml-2 text-orange-700">
                    {nominee.name} ({nominee.relationship}) - {nominee.nric}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Pricing Details Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">Pricing Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-yellow-300">
              <span className="text-sm font-medium text-yellow-800">Niche Amount:</span>
              <span className="text-sm font-medium text-yellow-800">${invoiceData.nicheAmount?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-yellow-300">
              <span className="text-sm font-medium text-yellow-800">Service Fee:</span>
              <span className="text-sm font-medium text-yellow-800">${invoiceData.serviceAmount?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-yellow-300">
              <span className="text-sm font-medium text-yellow-800">GST (9%):</span>
              <span className="text-sm font-medium text-yellow-800">${invoiceData.taxAmount?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-yellow-400 pt-3">
              <span className="text-lg font-bold text-yellow-900">Total Amount:</span>
              <span className="text-lg font-bold text-yellow-900">${invoiceData.totalAmount?.toLocaleString() || '0'}</span>
            </div>
          </div>
        </div>
      </div>
      <InvoiceViewerModal
        isOpen={isInvoiceViewerOpen}
        onClose={() => setIsInvoiceViewerOpen(false)}
        invoiceData={viewerInvoiceData}
      />
    </div>;
}