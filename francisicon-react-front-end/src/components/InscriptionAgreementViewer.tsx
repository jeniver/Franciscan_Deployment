import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useToast } from '../contexts/ToastContext';
import inscriptionAgreementService, { 
  InscriptionAgreementDetails, 
  PdfData, 
  ValidationResult 
} from '../services/inscriptionAgreementService';
import { 
  FileTextIcon, 
  PrinterIcon, 
  DownloadIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon,
  EyeIcon,
  XIcon,
  RefreshCwIcon
} from 'lucide-react';

interface InscriptionAgreementViewerProps {
  inscriptionCode?: string;
  onClose?: () => void;
}

export function InscriptionAgreementViewer({ inscriptionCode: propInscriptionCode, onClose }: InscriptionAgreementViewerProps) {
  const { inscriptionCode: routeInscriptionCode } = useParams<{ inscriptionCode: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const inscriptionCode = propInscriptionCode || routeInscriptionCode;
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agreementData, setAgreementData] = useState<PdfData | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Load agreement data
  useEffect(() => {
    if (!inscriptionCode) {
      setError('Inscription code is required');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get PDF data - force fresh fetch by adding timestamp to bypass any caching
        const pdfData = await inscriptionAgreementService.getPdfData(inscriptionCode);
        setAgreementData(pdfData);

        // Validate the agreement
        await handleValidate();
      } catch (err: any) {
        console.error('Error loading inscription agreement:', err);
        setError(err.message || 'Failed to load inscription agreement data');
        showError('Error', err.message || 'Failed to load inscription agreement data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [inscriptionCode, showError]);

  // Add refresh handler to force reload data
  const handleRefresh = async () => {
    if (!inscriptionCode) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Force fresh fetch by adding cache-busting parameter
      const pdfData = await inscriptionAgreementService.getPdfData(inscriptionCode);
      setAgreementData(pdfData);
      
      // Re-validate
      await handleValidate();
      
      showSuccess('Success', 'Agreement data refreshed successfully');
    } catch (err: any) {
      console.error('Error refreshing inscription agreement:', err);
      setError(err.message || 'Failed to refresh inscription agreement data');
      showError('Error', err.message || 'Failed to refresh inscription agreement data');
    } finally {
      setLoading(false);
    }
  };

  // Validate agreement
  const handleValidate = async () => {
    if (!inscriptionCode) return;

    setIsValidating(true);
    try {
      const result = await inscriptionAgreementService.validateAgreement(inscriptionCode);
      setValidationResult(result);
      
      if (result.isValid) {
        showSuccess('Validation Successful', 'Agreement is valid for generation');
      } else {
        showError('Validation Warning', 'Agreement has some issues that need attention');
      }
    } catch (err: any) {
      console.error('Validation error:', err);
      showError('Validation Error', err.message || 'Failed to validate agreement');
    } finally {
      setIsValidating(false);
    }
  };

  // Print handler
  const handlePrint = () => {
    if (agreementData) {
      // Create a new window with the HTML template
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Generate HTML content
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Inscription Agreement</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { margin: 0; font-size: 24px; }
              .header h2 { margin: 5px 0; font-size: 18px; color: #666; }
              .header p { margin: 5px 0; color: #888; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 16px; font-weight: bold; border-bottom: 2px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; }
              .field { margin-bottom: 8px; }
              .field-label { font-weight: bold; display: inline-block; width: 150px; }
              .deceased-item { margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 4px; }
              .footer { margin-top: 40px; text-align: center; color: #888; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${agreementData.document.title}</h1>
              <h2>${agreementData.document.subtitle}</h2>
              <p>Date: ${agreementData.document.date}</p>
              <p>Reference: ${agreementData.document.reference}</p>
            </div>
            
            <div class="section">
              <div class="section-title">APPLICANT INFORMATION</div>
              <div class="field"><span class="field-label">Name:</span> ${agreementData.applicant.name}</div>
              <div class="field"><span class="field-label">NRIC/Passport:</span> ${agreementData.applicant.nric}</div>
              <div class="field"><span class="field-label">Contact:</span> ${agreementData.applicant.fullContact}</div>
              <div class="field"><span class="field-label">Address:</span> ${agreementData.applicant.address}</div>
            </div>
            
            <div class="section">
              <div class="section-title">NICHE DETAILS</div>
              <div class="field"><span class="field-label">Location:</span> ${agreementData.niche.fullLocation}</div>
              <div class="field"><span class="field-label">Description:</span> ${agreementData.niche.description}</div>
            </div>
            
            <div class="section">
              <div class="section-title">DECEASED INFORMATION</div>
              ${agreementData.deceased.map((person: any, index: number) => `
                <div class="deceased-item">
                  <div><strong>${person.fullName}</strong></div>
                  <div class="field"><span class="field-label">Date of Birth:</span> ${person.formattedDates.birth}</div>
                  <div class="field"><span class="field-label">Date of Death:</span> ${person.formattedDates.death}</div>
                  <div class="field"><span class="field-label">Internment Date:</span> ${person.formattedDates.internment}</div>
                  <div class="field"><span class="field-label">Certificate No:</span> ${person.deathCertificateNo}</div>
                  ${person.inscriptionText ? `<div class="field"><span class="field-label">Inscription:</span> ${person.inscriptionText}</div>` : ''}
                </div>
              `).join('')}
            </div>
            
            ${agreementData.inscription.fullInscription ? `
              <div class="section">
                <div class="section-title">INSCRIPTION TEXT</div>
                <div style="white-space: pre-line;">${agreementData.inscription.fullInscription}</div>
              </div>
            ` : ''}
            
            ${agreementData.inscription.remarks ? `
              <div class="section">
                <div class="section-title">REMARKS</div>
                <div>${agreementData.inscription.remarks}</div>
              </div>
            ` : ''}
            
            <div class="footer">
              <p>This is an official inscription agreement document.</p>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
          </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  // Download handler
  const handleDownload = () => {
    if (agreementData) {
      // Create a new window with the HTML template
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Generate HTML content
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Inscription Agreement</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { margin: 0; font-size: 24px; }
              .header h2 { margin: 5px 0; font-size: 18px; color: #666; }
              .header p { margin: 5px 0; color: #888; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 16px; font-weight: bold; border-bottom: 2px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; }
              .field { margin-bottom: 8px; }
              .field-label { font-weight: bold; display: inline-block; width: 150px; }
              .deceased-item { margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 4px; }
              .footer { margin-top: 40px; text-align: center; color: #888; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${agreementData.document.title}</h1>
              <h2>${agreementData.document.subtitle}</h2>
              <p>Date: ${agreementData.document.date}</p>
              <p>Reference: ${agreementData.document.reference}</p>
            </div>
            
            <div class="section">
              <div class="section-title">APPLICANT INFORMATION</div>
              <div class="field"><span class="field-label">Name:</span> ${agreementData.applicant.name}</div>
              <div class="field"><span class="field-label">NRIC/Passport:</span> ${agreementData.applicant.nric}</div>
              <div class="field"><span class="field-label">Contact:</span> ${agreementData.applicant.fullContact}</div>
              <div class="field"><span class="field-label">Address:</span> ${agreementData.applicant.address}</div>
            </div>
            
            <div class="section">
              <div class="section-title">NICHE DETAILS</div>
              <div class="field"><span class="field-label">Location:</span> ${agreementData.niche.fullLocation}</div>
              <div class="field"><span class="field-label">Description:</span> ${agreementData.niche.description}</div>
            </div>
            
            <div class="section">
              <div class="section-title">DECEASED INFORMATION</div>
              ${agreementData.deceased.map((person: any, index: number) => `
                <div class="deceased-item">
                  <div><strong>${person.fullName}</strong></div>
                  <div class="field"><span class="field-label">Date of Birth:</span> ${person.formattedDates.birth}</div>
                  <div class="field"><span class="field-label">Date of Death:</span> ${person.formattedDates.death}</div>
                  <div class="field"><span class="field-label">Internment Date:</span> ${person.formattedDates.internment}</div>
                  <div class="field"><span class="field-label">Certificate No:</span> ${person.deathCertificateNo}</div>
                  ${person.inscriptionText ? `<div class="field"><span class="field-label">Inscription:</span> ${person.inscriptionText}</div>` : ''}
                </div>
              `).join('')}
            </div>
            
            ${agreementData.inscription.fullInscription ? `
              <div class="section">
                <div class="section-title">INSCRIPTION TEXT</div>
                <div style="white-space: pre-line;">${agreementData.inscription.fullInscription}</div>
              </div>
            ` : ''}
            
            ${agreementData.inscription.remarks ? `
              <div class="section">
                <div class="section-title">REMARKS</div>
                <div>${agreementData.inscription.remarks}</div>
              </div>
            ` : ''}
            
            <div class="footer">
              <p>This is an official inscription agreement document.</p>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
          </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Trigger save as PDF
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  // Close handler
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  if (loading) {
    return (
      <Layout title="Inscription Agreement Viewer">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading inscription agreement...</div>
        </div>
      </Layout>
    );
  }

  if (error || !agreementData) {
    return (
      <Layout title="Inscription Agreement Viewer">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
              <h3 className="text-lg font-medium text-red-800">Error Loading Agreement</h3>
            </div>
            <div className="mt-2 text-red-700">
              {error || 'Failed to load inscription agreement data'}
            </div>
            <div className="mt-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Inscription Agreement Viewer">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {agreementData.document.title}
            </h1>
            <p className="text-gray-600">{agreementData.document.subtitle}</p>
            <p className="text-sm text-gray-500 mt-1">
              Reference: {agreementData.document.reference} | Date: {agreementData.document.date}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Validation Banner */}
        {validationResult && (
          <div className={`mb-6 p-4 rounded-lg border ${
            validationResult.isValid 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start">
              {validationResult.isValid ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              ) : (
                <AlertTriangleIcon className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {validationResult.isValid ? 'Agreement is valid' : 'Validation issues found'}
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  {validationResult.isValid 
                    ? 'The agreement is ready for processing.' 
                    : 'The agreement has some issues that need attention.'}
                </div>
                
                {validationResult.errors.length > 0 && (
                  <div className="mt-2">
                    <strong>Errors:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validationResult.warnings.length > 0 && (
                  <div className="mt-2">
                    <strong>Warnings:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {validationResult.warnings.map((warning: string, index: number) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            {isValidating ? 'Validating...' : 'Validate'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print Agreement
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Download PDF
          </button>
        </div>

        {/* Agreement Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Applicant Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              APPLICANT INFORMATION
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                <div className="text-gray-900">{agreementData.applicant.name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">NRIC/Passport</label>
                <div className="text-gray-900">{agreementData.applicant.nric}</div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Contact Information</label>
                <div className="text-gray-900">{agreementData.applicant.fullContact}</div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                <div className="text-gray-900">{agreementData.applicant.address}</div>
              </div>
            </div>
          </div>

          {/* Niche Details */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              NICHE DETAILS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                <div className="text-gray-900">{agreementData.niche.fullLocation}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                <div className="text-gray-900">{agreementData.niche.description}</div>
              </div>
            </div>
          </div>

          {/* Deceased Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              DECEASED INFORMATION ({agreementData.summary.totalDeceased} person{agreementData.summary.totalDeceased !== 1 ? 's' : ''})
            </h2>
            <div className="space-y-4">
              {agreementData.deceased.map((person: any) => (
                <div key={person.index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-3">{person.fullName}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Date of Birth</label>
                      <div className="text-gray-900">{person.formattedDates.birth}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Date of Death</label>
                      <div className="text-gray-900">{person.formattedDates.death}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Internment Date</label>
                      <div className="text-gray-900">{person.formattedDates.internment}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Death Certificate No</label>
                      <div className="text-gray-900">{person.deathCertificateNo || 'N/A'}</div>
                    </div>
                    {person.inscriptionText && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Inscription Text</label>
                        <div className="text-gray-900 bg-gray-50 p-2 rounded">{person.inscriptionText}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inscription Text */}
          {agreementData.inscription.fullInscription && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                INSCRIPTION TEXT
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line">
                {agreementData.inscription.fullInscription}
              </div>
            </div>
          )}

          {/* Remarks */}
          {agreementData.inscription.remarks && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                REMARKS
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                {agreementData.inscription.remarks}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>This is an official inscription agreement document.</p>
            <p>Generated on {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
