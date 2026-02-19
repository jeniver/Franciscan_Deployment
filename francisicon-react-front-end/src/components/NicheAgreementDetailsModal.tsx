import React, { useState, useEffect } from 'react';
import { XIcon } from 'lucide-react';
import { nicheAgreementService, NicheAgreementResponse, NicheAgreementError } from '../services/nicheAgreementService';
import { LoadingSpinner } from './common/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';


interface NicheAgreementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationCode: string | null;
}

type TabType = 'general' | 'financial' | 'attachments';

export function NicheAgreementDetailsModal({
  isOpen,
  onClose,
  applicationCode
}: NicheAgreementDetailsModalProps) {
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(false);
  const [agreementData, setAgreementData] = useState<NicheAgreementResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAgreementData = React.useCallback(async () => {
    if (!applicationCode) return;

    setLoading(true);
    setError(null);

    try {
      const response = await nicheAgreementService.getNicheAgreement(applicationCode);
      setAgreementData(response.data);
    } catch (err: any) {
      if (err instanceof NicheAgreementError) {
        setError(err.message);
        showError('Error', err.message);
      } else {
        const errorMsg = err.message || 'Failed to load agreement details';
        setError(errorMsg);
        showError('Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [applicationCode, showError]);

  useEffect(() => {
    if (isOpen && applicationCode) {
      fetchAgreementData();
    } else {
      setAgreementData(null);
      setError(null);
      setActiveTab('general');
    }
  }, [isOpen, applicationCode, fetchAgreementData]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';

    // If it's just a 4-digit year, return it as-is
    const str = String(dateString).trim();
    if (/^\d{4}$/.test(str)) return str;

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      return date.toLocaleDateString('en-SG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const hasInvoice = Boolean(agreementData?.invoice?.invoiceNo);
  const hasReceipt = Boolean(agreementData?.invoice?.receiptNo);



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          {loading ? (
            <div className="bg-gradient-to-r from-[#802429] to-[#7d1f1f] px-6 py-6 flex items-center justify-center min-h-[120px]">
              <LoadingSpinner size="md" text="Loading agreement details..." />
            </div>
          ) : error ? (
            <div className="bg-gradient-to-r from-[#802429] to-[#7d1f1f] px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white text-xl font-bold">Error Loading Agreement</div>
                  <div className="text-white text-sm opacity-80 mt-1">{error}</div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : agreementData ? (
            <>
              <div className="bg-gradient-to-r from-[#802429] to-[#7d1f1f] px-8 py-6 flex items-center justify-between">
                <div>
                  <div className="text-white text-2xl font-bold">
                    {agreementData.niche.location?.chapel?.chapelName || agreementData.niche.chapelName || 'Niche'} — {agreementData.niche.code}
                  </div>
                  <div className="text-white text-sm opacity-80 mt-1">
                    Application Code: {agreementData.applicationCode} | Created: {formatDate(agreementData.appliedDate)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <nav className="flex bg-gray-50 border-b border-gray-200 px-6">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`px-6 py-4 font-semibold transition-colors border-b-3 ${activeTab === 'general'
                    ? 'text-[#802429] border-b-[#802429]'
                    : 'text-gray-600 border-transparent hover:text-[#802429]'
                    }`}
                  style={{ borderBottomWidth: activeTab === 'general' ? '3px' : '0' }}
                >
                  General Details
                </button>
                <button
                  onClick={() => setActiveTab('financial')}
                  className={`px-6 py-4 font-semibold transition-colors border-b-3 ${activeTab === 'financial'
                    ? 'text-[#802429] border-b-[#802429]'
                    : 'text-gray-600 border-transparent hover:text-[#802429]'
                    }`}
                  style={{ borderBottomWidth: activeTab === 'financial' ? '3px' : '0' }}
                >
                  Financials & Billing
                </button>
                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`px-6 py-4 font-semibold transition-colors border-b-3 ${activeTab === 'attachments'
                    ? 'text-[#802429] border-b-[#802429]'
                    : 'text-gray-600 border-transparent hover:text-[#802429]'
                    }`}
                  style={{ borderBottomWidth: activeTab === 'attachments' ? '3px' : '0' }}
                >
                  Attachments ({agreementData.metadata.beneficiaryCount || 0})
                </button>
              </nav>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'general' && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Applicant Information */}
                    <section className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                      <div className="text-xs uppercase tracking-widest text-[#b2945e] font-bold mb-4 flex items-center gap-2">
                        ● Applicant Information
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Name</span>
                          <span className="font-semibold text-sm">{agreementData.applicant.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">NRIC/ID</span>
                          <span className="font-semibold text-sm">{agreementData.applicant.idNo || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Phone</span>
                          <span className="font-semibold text-sm">{agreementData.applicant.mobileNo || agreementData.applicant.homeTelNo || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Email</span>
                          <span className="font-semibold text-sm">{agreementData.applicant.email || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 text-sm">Catholic</span>
                          <span className="font-semibold text-sm">{agreementData.applicant.isCatholic ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </section>

                    {/* Location Details */}
                    <section className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                      <div className="text-xs uppercase tracking-widest text-[#b2945e] font-bold mb-4 flex items-center gap-2">
                        ● Location Details
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Chapel</span>
                          <span className="font-semibold text-sm">{agreementData.niche.location?.chapel?.chapelName || agreementData.niche.chapelName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Level</span>
                          <span className="font-semibold text-sm">{agreementData.niche.location?.row?.level ? `Level ${agreementData.niche.location.row.level}` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Type</span>
                          <span className="font-semibold text-sm">{agreementData.beneficiaries.length > 1 ? 'Double Niche' : 'Single Niche'}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 text-sm">Agreed Date</span>
                          <span className="font-semibold text-sm">{formatDate(agreementData.agreementDate || agreementData.appliedDate)}</span>
                        </div>
                      </div>
                    </section>

                    {/* Beneficiary Records */}
                    {agreementData.beneficiaries && agreementData.beneficiaries.length > 0 && (
                      <section className="border border-gray-200 rounded-xl p-5 bg-gray-50 col-span-2">
                        <div className="text-xs uppercase tracking-widest text-[#b2945e] font-bold mb-4 flex items-center gap-2">
                          ● Beneficiary Records
                        </div>
                        <div className={`grid gap-5 ${agreementData.beneficiaries.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {agreementData.beneficiaries.map((beneficiary, index) => (
                            <div key={index} className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                              <div className="font-bold text-[#802429] mb-2">
                                {index === 0 ? 'First Beneficiary' : index === 1 ? 'Second Beneficiary' : `Beneficiary ${index + 1}`}
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between py-2 border-b border-pink-100">
                                  <span className="text-gray-600 text-sm">Name</span>
                                  <span className="font-semibold text-sm">{beneficiary.name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-pink-100">
                                  <span className="text-gray-600 text-sm">Relation</span>
                                  <span className="font-semibold text-sm">{beneficiary.relationshipToApplicant || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-pink-100">
                                  <span className="text-gray-600 text-sm">Date of Birth</span>
                                  <span className="font-semibold text-sm">
                                    {beneficiary.dateOfBirth || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-pink-100">
                                  <span className="text-gray-600 text-sm">Birth Year</span>
                                  <span className="font-semibold text-sm">
                                    {beneficiary.birthYear || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-pink-100">
                                  <span className="text-gray-600 text-sm">ID Number</span>
                                  <span className="font-semibold text-sm">
                                    {beneficiary.idNo || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-pink-100">
                                  <span className="text-gray-600 text-sm">Gender</span>
                                  <span className="font-semibold text-sm">
                                    {beneficiary.sex || (beneficiary.isMale ? 'Male' : 'Female') || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-pink-100">
                                  <span className="text-gray-600 text-sm">Catholic</span>
                                  <span className="font-semibold text-sm">
                                    {beneficiary.isCatholic !== undefined ? (beneficiary.isCatholic ? 'Yes' : 'No') : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-pink-100">
                                  <span className="text-gray-600 text-sm">Status</span>
                                  <span className="font-semibold text-sm capitalize">
                                    {beneficiary.lifeStatus || beneficiary.status || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-pink-100">
                                  <span className="text-gray-600 text-sm">Relationship to Nominee 1</span>
                                  <span className="font-semibold text-sm">
                                    {beneficiary.relationshipToNominee1 || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                  <span className="text-gray-600 text-sm">Relationship to Nominee 2</span>
                                  <span className="font-semibold text-sm">
                                    {beneficiary.relationshipToNominee2 || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Latest Billing Status */}
                    <section className="border-t-4 border-[#b2945e] border border-gray-200 rounded-xl p-5 bg-gray-50 col-span-2">
                      <div className="text-xs uppercase tracking-widest text-[#b2945e] font-bold mb-4 flex items-center gap-2">
                        ● Latest Billing Status
                      </div>
                      <table className="w-full mt-2">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Item Description</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Invoice #</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-3 text-sm border-b border-gray-100">
                              Niche Fee ({agreementData.niche.location?.chapel?.chapelName || agreementData.niche.chapelName} {agreementData.niche.code})
                            </td>
                            <td className="px-3 py-3 text-sm border-b border-gray-100">{hasInvoice ? agreementData.invoice.invoiceNo : ''}</td>
                            <td className="px-3 py-3 text-sm border-b border-gray-100">
                              {hasInvoice ? (
                                <span className="text-green-600 font-bold">
                                  {agreementData.invoice.invoicePayingAmount > 0 ? 'PAID' : 'PENDING'}
                                </span>
                              ) : (
                                <span className="text-gray-400 font-bold">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm font-bold text-right border-b border-gray-100">
                              {hasInvoice ? formatCurrency(agreementData.niche.totalAmount || 0) : ''}
                            </td>
                          </tr>
                          {agreementData.invoice.taxAmount > 0 && (
                            <tr>
                              <td className="px-3 py-3 text-sm border-b border-gray-100">GST (9%)</td>
                              <td className="px-3 py-3 text-sm border-b border-gray-100">{agreementData.invoice.invoiceNo || 'N/A'}</td>
                              <td className="px-3 py-3 text-sm border-b border-gray-100">
                                <span className="text-green-600 font-bold">
                                  {agreementData.invoice.taxAmount > 0 ? 'PAID' : 'PENDING'}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-sm font-bold text-right border-b border-gray-100">
                                {formatCurrency(agreementData.invoice.taxAmount || 0)}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td className="px-3 py-3 text-sm border-b border-gray-100">
                              Receipt
                            </td>
                            <td className="px-3 py-3 text-sm border-b border-gray-100">{hasReceipt ? agreementData.invoice.receiptNo : ''}</td>
                            <td className="px-3 py-3 text-sm border-b border-gray-100">
                              {hasReceipt ? (
                                <span className="text-green-600 font-bold">PAID</span>
                              ) : (
                                <span className="text-gray-400 font-bold">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm font-bold text-right border-b border-gray-100">
                              {hasReceipt ? formatCurrency(agreementData.invoice.receiptPayingAmount || agreementData.invoice.receiptAmount || 0) : ''}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      {(() => {
                        const totalDue = Math.max(0, (agreementData.niche.totalAmount || 0) + (agreementData.invoice.taxAmount || 0) - (agreementData.invoice.invoicePayingAmount || 0));
                        return totalDue > 0 ? (
                          <div className="text-2xl text-[#802429] font-extrabold text-right mt-5">
                            Total Due: {formatCurrency(totalDue)}
                          </div>
                        ) : null;
                      })()}
                    </section>
                  </div>
                )}

                {activeTab === 'financial' && (
                  <div className="space-y-6">
                    <p className="text-gray-600">Financial details tab - Coming soon</p>
                  </div>
                )}

                {activeTab === 'attachments' && (
                  <div className="space-y-6">
                    <p className="text-gray-600">Attachments tab - Coming soon</p>
                  </div>
                )}
              </div>

            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

