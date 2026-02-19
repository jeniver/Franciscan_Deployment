import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  XIcon,
  UserIcon,
  FileTextIcon,
  UsersIcon,
  CalendarIcon,
  DollarSignIcon,
  CheckCircleIcon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  CreditCardIcon,
  InfoIcon,
  ClockIcon,
  XCircleIcon,
  PrinterIcon,
  HomeIcon,
  LayoutGridIcon,
  HeartIcon,
  ArchiveIcon,
  CrossIcon,
} from 'lucide-react'
interface NicheApplicationDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  application: any
  onConfirmBooking: () => Promise<void>
  isConfirming: boolean
}
export function NicheApplicationDetailsModal({
  isOpen,
  onClose,
  application,
  onConfirmBooking,
  isConfirming,
}: NicheApplicationDetailsModalProps) {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200)
      document.body.style.overflow = 'unset'
      return () => clearTimeout(timer)
    }
  }, [isOpen])
  if (!isVisible && !isOpen) return null
  if (!application) return null
  // --- HELPERS ---
  const formatDate = (dateString: string) => {
    if (!dateString) return '—'

    // If it's just a 4-digit year, return it as-is
    const str = String(dateString).trim();
    if (/^\d{4}$/.test(str)) return str;

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString

      return date.toLocaleDateString('en-SG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }
  const formatCurrency = (amount: any) => {
    if (amount === undefined || amount === null) return '—'
    return `$${Number(amount).toLocaleString('en-SG', {
      minimumFractionDigits: 2,
    })}`
  }
  const formatStatus = (status: number) => {
    const statusMap: Record<
      number,
      {
        text: string
        className: string
        dotColor: string
      }
    > = {
      0: {
        text: 'Deleted',
        className: 'bg-red-50 text-red-700 border-red-200',
        dotColor: 'bg-red-500',
      },
      1: {
        text: 'Draft',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
      },
      2: {
        text: 'Pending',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500',
      },
      3: {
        text: 'Booked',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
      },
      4: {
        text: 'Completed',
        className: 'bg-purple-50 text-purple-700 border-purple-200',
        dotColor: 'bg-purple-500',
      },
    }
    return (
      statusMap[status] || {
        text: `Status ${status}`,
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        dotColor: 'bg-gray-500',
      }
    )
  }
  // --- GETTERS ---
  const getStatus = () => {
    if (application.status !== undefined) return application.status
    if (application.applicationStatus !== undefined)
      return application.applicationStatus
    if (application.agreement?.status === 'completed') return 3
    if (application.consentForm?.status === 'completed') return 3
    return 1
  }
  const statusInfo = formatStatus(getStatus())
  const getAppCode = () =>
    application.code ||
    application.applicationCode ||
    application.applicationNumber ||
    '—'
  const getApplicant = () => application.applicant || {}
  const getNominee = () => application.nominee || {}
  const getNominee2 = () => application.nominee2 || {}
  const getNiche = () => application.niche || {}
  const getBeneficiaries = () => application.beneficiaries || []
  const getAppliedDate = () =>
    application.appliedDate || application.createdDate || ''
  const getInvoice = () => application.invoice || {}
  const getDeceased = () => application.deceased || {}
  const getStorage = () => application.storage || {}
  const getConsentForm = () => application.consentForm || {}
  const getAgreement = () => application.agreement || {}
  const getPrintReady = () => application.printReady || {}
  const formatAddress = (obj: any) => {
    return (
      obj.address?.formatted ||
      obj.address ||
      `${obj.addressNo || ''} ${obj.addressLine1 || ''} ${obj.addressLine2 || ''} ${obj.addressCity || ''} ${obj.addressState || ''} ${obj.addressCountry || ''}`.trim() ||
      null
    )
  }
  // --- UI COMPONENTS ---
  const SectionHeader = ({
    icon: Icon,
    title,
  }: {
    icon: any
    title: string
  }) => (
    <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-100">
      <div className="p-2 bg-red-50 rounded-lg">
        <Icon className="w-5 h-5 text-[#801818]" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
    </div>
  )
  const InfoItem = ({
    label,
    value,
    icon: Icon,
    fullWidth = false,
    className = '',
  }: {
    label: string
    value: React.ReactNode
    icon?: any
    fullWidth?: boolean
    className?: string
  }) => (
    <div className={`${fullWidth ? 'col-span-full' : ''} group ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#801818] transition-colors" />
        )}
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-sm font-medium text-gray-900 break-words">
        {value || <span className="text-gray-300 italic">Not provided</span>}
      </div>
    </div>
  )
  const Badge = ({
    children,
    color = 'gray',
    icon: Icon,
  }: {
    children: React.ReactNode
    color?: 'gray' | 'green' | 'red' | 'blue' | 'amber'
    icon?: any
  }) => {
    const colors = {
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
      green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}
      >
        {Icon && <Icon className="w-3 h-3" />}
        {children}
      </span>
    )
  }
  const PrintStatusBadge = ({
    label,
    isReady,
  }: {
    label: string
    isReady: boolean
  }) => (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isReady ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}
    >
      {isReady ? (
        <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
      ) : (
        <XCircleIcon className="w-4 h-4 text-gray-400" />
      )}
      <span
        className={`text-sm font-medium ${isReady ? 'text-emerald-700' : 'text-gray-500'}`}
      >
        {label}
      </span>
    </div>
  )
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        className={`bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#801818] to-[#9a2020] px-6 py-5 flex items-start justify-between shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <h2
                id="modal-title"
                className="text-white text-2xl font-bold tracking-tight"
              >
                Application Details
              </h2>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20 backdrop-blur-md shadow-sm`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`}
                ></span>
                {statusInfo.text}
              </div>
            </div>
            <p className="text-red-100 text-sm flex items-center gap-2">
              <span className="opacity-70">Reference ID:</span>
              <span className="font-mono bg-black/20 px-2 py-0.5 rounded text-white font-medium tracking-wide">
                {getAppCode()}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 custom-scrollbar">
          <div className="space-y-6">
            {/* Top Row: Basic Info & Niche Location */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <SectionHeader icon={FileTextIcon} title="Basic Information" />
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem
                    label="Applied Date"
                    value={formatDate(getAppliedDate())}
                    icon={CalendarIcon}
                  />
                  <InfoItem
                    label="Agreement Date"
                    value={formatDate(application.agreementDate)}
                    icon={CalendarIcon}
                  />
                  <InfoItem
                    label="Niche Code"
                    value={getNiche().code}
                    icon={MapPinIcon}
                  />
                  <InfoItem
                    label="Niche Number"
                    value={getNiche().number}
                    icon={MapPinIcon}
                  />
                </div>
              </div>

              {/* Niche Location */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <SectionHeader icon={HomeIcon} title="Niche Location Details" />
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem
                    label="Chapel"
                    value={`${getNiche().location?.chapel?.chapelName || ''} (${getNiche().location?.chapel?.chapelCode || ''})`}
                    icon={HomeIcon}
                  />
                  <InfoItem
                    label="Wall"
                    value={`${getNiche().location?.wall?.wallName || ''} (${getNiche().location?.wall?.wallCode || ''})`}
                    icon={LayoutGridIcon}
                  />
                  <InfoItem
                    label="Row"
                    value={`${getNiche().location?.row?.rowCode || ''} (Level ${getNiche().location?.row?.level || ''})`}
                    icon={LayoutGridIcon}
                  />
                  <InfoItem
                    label="Line Amount"
                    value={formatCurrency(getNiche().lineAmount)}
                    icon={DollarSignIcon}
                  />
                </div>
              </div>
            </div>

            {/* Applicant */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <UserIcon className="w-5 h-5 text-[#801818]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Applicant Details
                  </h3>
                </div>
                {getApplicant().isCatholic && (
                  <Badge color="blue" icon={CrossIcon}>
                    Catholic
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <InfoItem label="Full Name" value={getApplicant().name} />
                  <InfoItem
                    label="NRIC / ID"
                    value={getApplicant().idNo}
                    icon={CreditCardIcon}
                  />
                  <InfoItem
                    label="Email"
                    value={getApplicant().email}
                    icon={MailIcon}
                  />
                </div>
                <div className="space-y-4">
                  <InfoItem
                    label="Mobile"
                    value={getApplicant().mobileNo}
                    icon={PhoneIcon}
                  />
                  <InfoItem
                    label="Home Tel"
                    value={getApplicant().homeTelNo}
                    icon={PhoneIcon}
                  />
                  <InfoItem
                    label="Office Tel"
                    value={getApplicant().officeTelNo}
                    icon={PhoneIcon}
                  />
                </div>
                <div className="space-y-4">
                  <InfoItem
                    label="Address"
                    value={formatAddress(getApplicant())}
                    icon={MapPinIcon}
                  />
                </div>
              </div>
            </div>

            {/* Nominees Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Nominee 1 */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 h-full">
                <SectionHeader icon={UserIcon} title="Nominee 1 Details" />
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Name" value={getNominee().name} />
                    <InfoItem
                      label="Relationship"
                      value={getNominee().relationship}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem
                      label="Mobile"
                      value={getNominee().mobileNo}
                      icon={PhoneIcon}
                    />
                    <InfoItem
                      label="Home Tel"
                      value={getNominee().homeTelNo}
                      icon={PhoneIcon}
                    />
                  </div>
                  <InfoItem
                    label="Address"
                    value={formatAddress(getNominee())}
                    icon={MapPinIcon}
                    fullWidth
                  />
                </div>
              </div>

              {/* Nominee 2 */}
              {getNominee2().name && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 h-full">
                  <SectionHeader icon={UserIcon} title="Nominee 2 Details" />
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Name" value={getNominee2().name} />
                      <InfoItem
                        label="Relationship"
                        value={getNominee2().relationship}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem
                        label="Mobile"
                        value={getNominee2().mobileNo}
                        icon={PhoneIcon}
                      />
                      <InfoItem
                        label="Home Tel"
                        value={getNominee2().homeTelNo}
                        icon={PhoneIcon}
                      />
                    </div>
                    <InfoItem
                      label="Address"
                      value={formatAddress(getNominee2())}
                      icon={MapPinIcon}
                      fullWidth
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Section */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4 pb-2 border-b border-gray-100">
                <SectionHeader
                  icon={DollarSignIcon}
                  title="Invoice & Payment Details"
                />
                {(getInvoice().invoiceNo || getAppCode() !== '—') && (
                  <button
                    onClick={() => {
                      const code = getAppCode();
                      if (code && code !== '—') {
                        onClose();
                        navigate(`/create-invoice/${code}?type=NAPP`);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all text-sm font-semibold border border-blue-200"
                  >
                    <FileTextIcon className="w-4 h-4" />
                    Go to Invoice
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-4">
                  <InfoItem label="Invoice No" value={getInvoice().invoiceNo} />
                  <InfoItem
                    label="Invoice Date"
                    value={formatDate(getInvoice().invoiceDate)}
                    icon={CalendarIcon}
                  />
                </div>
                <div className="space-y-4">
                  <InfoItem label="Receipt No" value={getInvoice().receiptNo} />
                  <InfoItem
                    label="Receipt Date"
                    value={formatDate(getInvoice().receiptDate)}
                    icon={CalendarIcon}
                  />
                </div>
                <div className="space-y-4">
                  <InfoItem
                    label="Invoice Amount"
                    value={formatCurrency(getInvoice().invoicePayingAmount)}
                  />
                  <InfoItem
                    label="Receipt Amount"
                    value={formatCurrency(getInvoice().receiptPayingAmount)}
                  />
                </div>
                <div className="space-y-4">
                  <InfoItem
                    label="Total Amount"
                    value={
                      <span className="text-[#801818] font-bold">
                        {formatCurrency(getInvoice().totalAmount)}
                      </span>
                    }
                  />
                  <InfoItem
                    label="Ref Doc No"
                    value={getInvoice().refDocNumber}
                  />
                </div>
              </div>
            </div>

            {/* Beneficiaries */}
            {getBeneficiaries().length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <UsersIcon className="w-5 h-5 text-[#801818]" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Beneficiaries
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                    {getBeneficiaries().length} Total
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getBeneficiaries().map((beneficiary: any, index: number) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-red-100 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-xs font-bold text-gray-500 border border-gray-200">
                            {index + 1}
                          </span>
                          <span className="font-bold text-gray-900">
                            {beneficiary.name}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {beneficiary.isCatholic && (
                            <Badge color="blue" icon={CrossIcon}>
                              Catholic
                            </Badge>
                          )}
                          {beneficiary.sex && (
                            <Badge color="gray">{beneficiary.sex}</Badge>
                          )}
                          {beneficiary.status && (
                            <Badge color="amber">{beneficiary.status}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <InfoItem
                          label="Relationship"
                          value={beneficiary.relationshipToApplicant}
                        />
                        <InfoItem
                          label="DOB"
                          value={formatDate(beneficiary.dateOfBirth || beneficiary.birthYear)}
                        />
                        <InfoItem label="ID No" value={beneficiary.idNo} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deceased & Storage Grid */}
            {(getDeceased().deceased1?.name || getStorage().storageFrom) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Deceased Info */}
                {getDeceased().deceased1?.name && (
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 lg:col-span-2">
                    <SectionHeader
                      icon={HeartIcon}
                      title="Deceased Information"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {getDeceased().deceased1?.name && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Deceased 1
                          </h4>
                          <div className="space-y-2">
                            <InfoItem
                              label="Name"
                              value={getDeceased().deceased1.name}
                            />
                            <InfoItem
                              label="Date Died"
                              value={formatDate(
                                getDeceased().deceased1.dateDied,
                              )}
                            />
                            <InfoItem
                              label="Internment"
                              value={formatDate(
                                getDeceased().deceased1.internmentDate,
                              )}
                            />
                          </div>
                        </div>
                      )}
                      {getDeceased().deceased2?.name && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Deceased 2
                          </h4>
                          <div className="space-y-2">
                            <InfoItem
                              label="Name"
                              value={getDeceased().deceased2.name}
                            />
                            <InfoItem
                              label="Date Died"
                              value={formatDate(
                                getDeceased().deceased2.dateDied,
                              )}
                            />
                            <InfoItem
                              label="Internment"
                              value={formatDate(
                                getDeceased().deceased2.internmentDate,
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Storage Info */}
                {getStorage().storageFrom && (
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <SectionHeader icon={ArchiveIcon} title="Storage Details" />
                    <div className="space-y-4">
                      <InfoItem
                        label="Storage From"
                        value={formatDate(getStorage().storageFrom)}
                        icon={CalendarIcon}
                      />
                      <InfoItem
                        label="Storage To"
                        value={formatDate(getStorage().storageTo)}
                        icon={CalendarIcon}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Document Status & Print Ready */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Document Status */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <SectionHeader icon={FileTextIcon} title="Document Status" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">
                      Consent Form
                    </span>
                    <Badge
                      color={
                        getConsentForm().status === 'completed'
                          ? 'green'
                          : 'amber'
                      }
                      icon={
                        getConsentForm().status === 'completed'
                          ? CheckCircleIcon
                          : ClockIcon
                      }
                    >
                      {getConsentForm().status || 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Agreement</span>
                    <Badge
                      color={
                        getAgreement().status === 'completed'
                          ? 'green'
                          : 'amber'
                      }
                      icon={
                        getAgreement().status === 'completed'
                          ? CheckCircleIcon
                          : ClockIcon
                      }
                    >
                      {getAgreement().status || 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Print Ready */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <SectionHeader
                  icon={PrinterIcon}
                  title="Print Ready Documents"
                />
                <div className="grid grid-cols-2 gap-3">
                  <PrintStatusBadge
                    label="Agreement"
                    isReady={getPrintReady().agreementReady}
                  />
                  <PrintStatusBadge
                    label="Invoice"
                    isReady={getPrintReady().invoiceReady}
                  />
                  <PrintStatusBadge
                    label="Receipt"
                    isReady={getPrintReady().receiptReady}
                  />
                  <PrintStatusBadge
                    label="Consent Form"
                    isReady={getPrintReady().consentFormReady}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <div className="text-xs text-gray-500 font-medium">
            Record created on{' '}
            <span className="text-gray-700">
              {formatDate(getAppliedDate())}
            </span>
          </div>

          <div className="flex w-full sm:w-auto gap-3">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 transition-all font-medium text-sm focus:ring-2 focus:ring-gray-200 outline-none"
            >
              Close
            </button>
            {getStatus() === 1 && (
              <button
                onClick={onConfirmBooking}
                disabled={isConfirming}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#801818] text-white rounded-lg hover:bg-[#9a2020] active:bg-[#6b1414] transition-all font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-[#801818] focus:ring-2 focus:ring-red-200 outline-none"
              >
                {isConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Confirm Booking</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
