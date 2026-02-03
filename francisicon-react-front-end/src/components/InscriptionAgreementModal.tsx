import React, { useState, useEffect } from 'react';
import { XIcon } from 'lucide-react';
import { inscriptionAgreementService, InscriptionAgreementError } from '../services/inscriptionAgreementService';
import { LoadingSpinner } from './common/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';

interface InscriptionAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  inscriptionCode: string | null;
}

type TabType = 'general' | 'financial' | 'attachments';

export function InscriptionAgreementModal({
  isOpen,
  onClose,
  inscriptionCode
}: InscriptionAgreementModalProps) {
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(false);
  const [agreementData, setAgreementData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAgreementData = React.useCallback(async () => {
    if (!inscriptionCode) return;

    setLoading(true);
    setError(null);

    try {
      const response = await inscriptionAgreementService.getAgreementDetails(inscriptionCode);
      setAgreementData(response);
    } catch (err: any) {
      if (err instanceof InscriptionAgreementError) {
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
  }, [inscriptionCode, showError]);

  useEffect(() => {
    if (isOpen && inscriptionCode) {
      fetchAgreementData();
    } else {
      setAgreementData(null);
      setError(null);
      setActiveTab('general');
    }
  }, [isOpen, inscriptionCode, fetchAgreementData]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-SG', {
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
                    {agreementData.ChapelName || 'Niche'} — {agreementData.NicheCode}
                  </div>
                  <div className="text-white text-sm opacity-80 mt-1">
                    Application Code: {agreementData.ApplicationCode} | Created: {formatDate(agreementData.InscriptionCreatedOn)}
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
                  className={`px-6 py-4 font-semibold transition-colors border-b-3 ${
                    activeTab === 'general'
                      ? 'text-[#802429] border-b-[#802429]'
                      : 'text-gray-600 border-transparent hover:text-[#802429]'
                  }`}
                  style={{ borderBottomWidth: activeTab === 'general' ? '3px' : '0' }}
                >
                  General ({agreementData.deceasedDetails?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('financial')}
                  className={`px-6 py-4 font-semibold transition-colors border-b-3 ${
                    activeTab === 'financial'
                      ? 'text-[#802429] border-b-[#802429]'
                      : 'text-gray-600 border-transparent hover:text-[#802429]'
                  }`}
                  style={{ borderBottomWidth: activeTab === 'financial' ? '3px' : '0' }}
                >
                  Financial (0)
                </button>
                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`px-6 py-4 font-semibold transition-colors border-b-3 ${
                    activeTab === 'attachments'
                      ? 'text-[#802429] border-b-[#802429]'
                      : 'text-gray-600 border-transparent hover:text-[#802429]'
                  }`}
                  style={{ borderBottomWidth: activeTab === 'attachments' ? '3px' : '0' }}
                >
                  Attachments (0)
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
                          <span className="font-semibold text-sm">{agreementData.ApplicantName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">NRIC/Passport</span>
                          <span className="font-semibold text-sm">{agreementData.ApplicantIDNo || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Mobile</span>
                          <span className="font-semibold text-sm">{agreementData.ApplicantMobileNo || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Phone</span>
                          <span className="font-semibold text-sm">{agreementData.ApplicantHomeTelNo || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Email</span>
                          <span className="font-semibold text-sm">{agreementData.ApplicantEmailID || 'N/A'}</span>
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
                          <span className="font-semibold text-sm">{agreementData.ChapelName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Wall</span>
                          <span className="font-semibold text-sm">{agreementData.WallName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Row</span>
                          <span className="font-semibold text-sm">{agreementData.RowCode || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Niche</span>
                          <span className="font-semibold text-sm">{agreementData.NicheCode || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Description</span>
                          <span className="font-semibold text-sm">{agreementData.AppearanceDescription || 'N/A'}</span>
                        </div>
                      </div>
                    </section>

                    {/* Contact Person */}
                    <section className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                      <div className="text-xs uppercase tracking-widest text-[#b2945e] font-bold mb-4 flex items-center gap-2">
                        ● Contact Person
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Name</span>
                          <span className="font-semibold text-sm">{agreementData.ContactPersonName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">NRIC/Passport</span>
                          <span className="font-semibold text-sm">{agreementData.ContactPersonIDNo || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Mobile</span>
                          <span className="font-semibold text-sm">{agreementData.ContactPersonMobile || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Email</span>
                          <span className="font-semibold text-sm">{agreementData.ContactPersonEmail || 'N/A'}</span>
                        </div>
                      </div>
                    </section>

                    {/* Nominees */}
                    <section className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                      <div className="text-xs uppercase tracking-widest text-[#b2945e] font-bold mb-4 flex items-center gap-2">
                        ● Nominees
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Nominee 1</span>
                          <span className="font-semibold text-sm">{agreementData.NomineeName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">NRIC/Passport</span>
                          <span className="font-semibold text-sm">{agreementData.NomineeIDNo || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">Nominee 2</span>
                          <span className="font-semibold text-sm">{agreementData.Nominee2Name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 text-sm">NRIC/Passport</span>
                          <span className="font-semibold text-sm">{agreementData.Nominee2IDNo || 'N/A'}</span>
                        </div>
                      </div>
                    </section>

                    {/* Deceased Details */}
                    <section className="border-t-4 border-[#b2945e] border border-gray-200 rounded-xl p-5 bg-gray-50 col-span-2">
                      <div className="text-xs uppercase tracking-widest text-[#b2945e] font-bold mb-4 flex items-center gap-2">
                        ● Deceased Details
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date of Birth</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date of Death</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Internment Date</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Death Certificate</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Inscription Text</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agreementData.deceasedDetails && agreementData.deceasedDetails.length > 0 ? (
                              agreementData.deceasedDetails.map((deceased: any, index: number) => (
                                <tr key={index} className="border-b border-gray-100">
                                  <td className="px-3 py-3 text-sm">{deceased.name || 'N/A'}</td>
                                  <td className="px-3 py-3 text-sm">{formatDate(deceased.dateOfBirth) || 'N/A'}</td>
                                  <td className="px-3 py-3 text-sm">{formatDate(deceased.dateOfDeath) || 'N/A'}</td>
                                  <td className="px-3 py-3 text-sm">{formatDate(deceased.internmentDate) || 'N/A'}</td>
                                  <td className="px-3 py-3 text-sm">{deceased.deathCertificateNo || 'N/A'}</td>
                                  <td className="px-3 py-3 text-sm">{deceased.inscriptionText || 'N/A'}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-3 py-3 text-sm text-center text-gray-500">
                                  No deceased details found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Inscription Details */}
                    <section className="border-t-4 border-[#b2945e] border border-gray-200 rounded-xl p-5 bg-gray-50 col-span-2">
                      <div className="text-xs uppercase tracking-widest text-[#b2945e] font-bold mb-4 flex items-center gap-2">
                        ● Inscription Details
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-gray-600 text-sm">Bible Choice</div>
                          <div className="font-semibold text-sm">{agreementData.BibleInscriptionChoiceNoValue || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-600 text-sm">Bible Text</div>
                          <div className="font-semibold text-sm">{agreementData.BibleInscriptionText || 'N/A'}</div>
                        </div>
                        <div className="md:col-span-2">
                          <div className="text-gray-600 text-sm">Additional Phrase</div>
                          <div className="font-semibold text-sm">{agreementData.AdditionalInscriptionPhrase || 'N/A'}</div>
                        </div>
                        <div className="md:col-span-2">
                          <div className="text-gray-600 text-sm">Remarks</div>
                          <div className="font-semibold text-sm">{agreementData.InscriptionRemarks || 'N/A'}</div>
                        </div>
                      </div>
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