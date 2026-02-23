import React from 'react'
import { PDF_ASSETS } from '../components/common/FranciscanLogo'
import addressUtils from '../utils/addressUtils'
import { paymentModeToLabel } from '../utils/paymentMode'
interface AgreementPdfTemplateProps {
  data: {
    applicationCode?: string
    appliedDate?: string
    agreementDate?: string
    status?: number
    statusText?: string
    applicant?: {
      name?: string
      address?: string
      addressNo?: string
      addressLine1?: string
      addressLine2?: string
      addressCity?: string
      addressState?: string
      addressCountry?: string
      email?: string
      idNo?: string
      mobileNo?: string
      homeTelNo?: string
      officeTelNo?: string
      isCatholic?: boolean
    }
    nominee?: {
      name?: string
      address?: string
      addressNo?: string
      addressLine1?: string
      addressLine2?: string
      addressCity?: string
      addressState?: string
      addressCountry?: string
      email?: string
      idNo?: string
      mobileNo?: string
      homeTelNo?: string
      officeTelNo?: string
      relationship?: string
    }
    nominee2?: any
    beneficiaries?: Array<{
      name?: string
      idNo?: string
      isCatholic?: boolean
      isMale?: boolean
      relationshipToApplicant?: string
      dateOfBirth?: string
      birthYear?: number
      relationshipToNominee1?: string
      relationshipToNominee2?: string
      status?: string;
      sex?: string;
      lifeStatus?: string;
    }>
    niche?: {
      number?: string
      code?: string
      rowNumber?: string
      wallName?: string
      chapelName?: string
      totalAmount?: number
      lineAmount?: number
      wallPrice?: number
      rowPrice?: number
      location?: {
        chapel?: {
          chapelId?: number
          chapelCode?: string
          chapelName?: string
          description?: string
        }
        wall?: {
          wallId?: number
          wallCode?: string
          wallName?: string
        }
        row?: {
          rowId?: number
          rowCode?: string
          level?: number
          rowPrice?: number
        }
      }
    }
    invoice?: {
      invoiceNo?: string
      invoiceDate?: string
      receiptNo?: string
      receiptDate?: string
      receiptAmount?: number
      taxAmount?: number
      invoicePayingAmount?: number
      receiptPayingAmount?: number
      totalAmount?: number
      paymentMode?: string
      paymentModeDocNo?: string
      refDocNumber?: string
      invoiceDetails?: Array<{
        itemId?: number
        itemName?: string
        itemCode?: string
        description?: string
        quantity?: number
        unitPrice?: number
        taxAmount?: number
        lineTotal?: number
        lineNet?: number
      }>
    }
    deceased?: {
      deceased1?: {
        name?: string
        dateDied?: string
        internmentDate?: string
        deathCertificateNo?: string
      }
      deceased2?: {
        name?: string
        dateDied?: string
        internmentDate?: string
        deathCertificateNo?: string
      }
    }
    storage?: {
      storageFrom?: string
      storageTo?: string
    }
    consentForm?: {
      status?: string
      timestamp?: string
      submittedBy?: string
      notes?: string
    }
    agreement?: {
      status?: string
      timestamp?: string
      signedBy?: string
      notes?: string
    }
    metadata?: {
      generatedAt?: string
      applicationNumber?: string
      hasInvoice?: boolean
      hasReceipt?: boolean
      beneficiaryCount?: number
      nomineeCount?: number
    }
  }
}
const formatCurrency = (amount: any) => {
  const num = parseFloat(amount || 0)
  return num.toLocaleString('en-SG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr || '';

  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day < 10 ? '0' + day : day}-${month}-${year}`;
}
export const AgreementPdfTemplate: React.FC<AgreementPdfTemplateProps> = ({
  data,
}) => {
  const {
    applicationCode,
    appliedDate,
    agreementDate,
    applicant,
    nominee,
    nominee2,
    beneficiaries,
    niche,
    invoice,
    deceased,
    storage,
  } = data
  const chapelName =
    niche?.chapelName || niche?.location?.chapel?.chapelName || ''
  const nicheNo = niche?.code || niche?.number || ''
  const nicheLevel = niche?.location?.row?.level || ''
  const wallPrice = niche?.location?.row?.rowPrice || niche?.totalAmount || niche?.lineAmount || niche?.rowPrice || 0

  // Robust address mapping matching InscriptionAgreementViewerModal
  const applicantAddressEntity = {
    addressNo: applicant?.addressNo || '',
    addressLine1: applicant?.addressLine1 || '',
    addressLine2: applicant?.addressLine2 || '',
    addressCity: applicant?.addressCity || '',
    addressState: applicant?.addressState || '',
    addressCountry: applicant?.addressCountry || '',
  }
  const applicantAddressLines = addressUtils.buildAddressLines(applicantAddressEntity)
  const footerAgreementDate = formatDate(agreementDate || appliedDate)
  const statusText = data.statusText || ''
  const applicantName = applicant?.name || ''
  const applicantIdNo = applicant?.idNo || ''
  const applicantMobileNo = applicant?.mobileNo || ''
  const applicantHomeTelNo = applicant?.homeTelNo || ''
  const applicantOfficeTelNo = applicant?.officeTelNo || ''
  const applicantEmail = applicant?.email || ''
  const applicantIsCatholicText = applicant?.isCatholic ? 'Yes' : 'No'
  const beneficiary1 = beneficiaries?.[0] || null
  const beneficiary2 = beneficiaries?.[1] || null
  const deceased1 = deceased?.deceased1 || null
  const deceased2 = deceased?.deceased2 || null
  const firstIntermentDate = formatDate(deceased1?.internmentDate)
  const secondIntermentDate = formatDate(deceased2?.internmentDate)
  const firstDeceasedName = deceased1?.name || ''
  const secondDeceasedName = deceased2?.name || ''
  const firstDeceasedDeathCert = deceased1?.deathCertificateNo || ''
  const secondDeceasedDeathCert = deceased2?.deathCertificateNo || ''
  const firstDeceasedDate = formatDate(deceased1?.dateDied)
  const secondDeceasedDate = formatDate(deceased2?.dateDied)
  // Storage Period calculation:
  // StorageFrom = 1 Jan of the NEXT year after 1st Interment Date
  // StorageTo = 31 Dec, 30 years after StorageFrom
  // Example: Interment 24 June 2025 → StorageFrom = 01-Jan-2026, StorageTo = 31-Dec-2055
  const rawIntermentDate = deceased1?.internmentDate;
  let storageFrom = '';
  let storageTo = formatDate(storage?.storageTo);

  if (storage?.storageFrom) {
    storageFrom = formatDate(storage.storageFrom);
  } else if (rawIntermentDate) {
    const fromDate = new Date(rawIntermentDate);
    if (!isNaN(fromDate.getTime())) {
      // Jan 1st of the next year
      const storageFromDate = new Date(fromDate.getFullYear() + 1, 0, 1); // Month 0 = Jan, Day 1
      storageFrom = formatDate(storageFromDate.toISOString());

      if (!storage?.storageTo) {
        // 31 Dec, 30 years from StorageFrom
        const storageToDate = new Date(storageFromDate.getFullYear() + 30 - 1, 11, 31); // Month 11 = Dec, Day 31
        storageTo = formatDate(storageToDate.toISOString());
      }
    }
  }
  const invoiceNo = invoice?.invoiceNo || (invoice as any)?.code || ''
  const invoiceDate = formatDate(invoice?.invoiceDate || (invoice as any)?.transactionDate)
  const receiptNo = invoice?.receiptNo || (invoice as any)?.receiptCode || ''
  const receiptDate = formatDate(invoice?.receiptDate || (invoice as any)?.receipt?.receiptDate)
  const nicheAmount = invoice?.receiptAmount || invoice?.totalAmount || (invoice as any)?.payingAmount || 0
  const taxAmount = invoice?.taxAmount || 0
  const totalAmount = invoice?.totalAmount || invoice?.invoicePayingAmount || (invoice as any)?.payingAmount || 0
  const paymentMethod = paymentModeToLabel(invoice?.paymentMode || (invoice as any)?.receipt?.receiptPaymentMode)
  const invoiceDetails = invoice?.invoiceDetails || (invoice as any)?.details || []
  const TableRow = ({
    children,
    className = '',
  }: {
    children?: React.ReactNode
    className?: string
  }) => (
    <div className={'flex border-b border-black last:border-b-0 ' + className}>
      {children}
    </div>
  )
  const LabelCell = ({
    children,
    width = 'w-32',
    className = '',
  }: {
    children?: React.ReactNode
    width?: string
    className?: string
  }) => (
    <div
      className={
        width +
        ' border-r border-black p-1 pl-2 text-xs font-medium flex-shrink-0 flex items-center ' +
        className
      }
    >
      {children}
    </div>
  )
  const ValueCell = ({
    children,
    className = '',
    width = 'flex-1',
  }: {
    children?: React.ReactNode
    className?: string
    width?: string
  }) => (
    <div className={width + ' p-1 pl-2 text-xs flex items-center ' + className}>{children}</div>
  )
  const SectionLabel = ({ children }: { children?: React.ReactNode }) => (
    <div className="border border-black border-t-0 px-2 py-1 text-xs font-bold bg-gray-50">
      {children}
    </div>
  )
  return (
    <div className="min-h-screen bg-gray-100 py-4 font-sans text-gray-900 print:bg-white print:py-0">
      <style>
        {`
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            @page {
              size: A4;
              margin: 10mm 8mm;
            }
            [data-pdf-page] {
              margin: 0 !important;
              padding: 6mm 8mm !important;
              box-shadow: none !important;
              min-height: 297mm !important;
              page-break-after: always;
            }
            [data-pdf-page]:last-child {
              page-break-after: auto;
            }
          }
        `}
      </style>
      {/* Page 1 */}
      <div data-pdf-page className="max-w-[210mm] mx-auto bg-white shadow-lg p-6 mb-4 min-h-[297mm] print:shadow-none print:mb-0 print:p-8">
        {/* Header */}
        <header className="flex justify-between items-start mb-4">
          <div className="flex-1 text-center pt-2">
            <h1 className="text-xl tracking-[0.2em] mb-1 uppercase font-serif">
              Franciscan Columbarium
            </h1>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-sm font-serif">❧</span>
              <span className="text-sm tracking-[0.1em] uppercase font-serif">
                Agreement
              </span>
              <span className="text-sm font-serif">❧</span>
            </div>
          </div>
          <div className="w-24 h-20 flex-shrink-0">
            <img
              src={PDF_ASSETS.headerImageUrl}
              alt="Franciscan Columbarium Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = PDF_ASSETS.headerImageBase64
              }}
            />
          </div>
        </header>

        {/* Between Section */}
        <div className="mb-3 text-xs">
          <div className="flex mb-1">
            <span className="w-16 font-medium">Between</span>
            <span>:</span>
          </div>
          <p className="text-justify leading-snug mb-2">
            The Order of Friars Minor (Singapore) Limited, a company limited by
            guarantee of 5 Bukit Batok East Ave 2, Singapore 659918 ("The
            Order"). Co & GST Reg No. 201016323M. Tel:6560-6361, HP:9774-7053,
            e-mail:franciscan.columbarium@gmail.com
          </p>
        </div>

        {/* And Section with Application Code */}
        <div className="flex justify-between items-end mb-1 text-xs">
          <div className="flex gap-1">
            <span className="font-medium">And :</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <div className="font-medium">
              Application Code :{' '}
              <span className="font-normal ml-1">
                {applicationCode || '0000-0'}
              </span>
            </div>
          </div>
        </div>

        {/* Applicant Table */}
        <div className="border border-black mb-0 text-xs">
          <TableRow>
            <LabelCell>Name</LabelCell>
            <ValueCell className="font-bold">{applicantName}</ValueCell>
            <LabelCell width="w-28" className="border-l border-black">
              NRIC/Passport No.
            </LabelCell>
            <ValueCell width="w-36" className="font-bold border-l border-black">
              {applicantIdNo}
            </ValueCell>
          </TableRow>
          <div className="flex border-b border-black">
            <LabelCell className="h-[78px] border-b-0">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-[26px]">
                <ValueCell className="font-bold flex-1">
                  {applicantAddressLines[0] || ''}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Mobile No.
                </LabelCell>
                <ValueCell width="w-36" className="font-bold border-l border-black">
                  {applicantMobileNo}
                </ValueCell>
              </div>
              <div className="flex border-b border-black h-[26px]">
                <ValueCell className="font-bold flex-1">
                  {applicantAddressLines[1] || ''}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Home Tel.
                </LabelCell>
                <ValueCell width="w-36" className="font-bold border-l border-black">
                  {applicantHomeTelNo}
                </ValueCell>
              </div>
              <div className="flex h-[26px]">
                <ValueCell className="font-bold flex-1">
                  {applicantAddressLines[2] || ''}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Office Tel.
                </LabelCell>
                <ValueCell width="w-36" className="font-bold border-l border-black">
                  {applicantOfficeTelNo}
                </ValueCell>
              </div>
            </div>
          </div>
          <TableRow>
            <LabelCell>e-mail</LabelCell>
            <ValueCell className="font-bold">{applicantEmail}</ValueCell>
            <LabelCell width="w-28" className="border-l border-black">
              Catholic
            </LabelCell>
            <ValueCell width="w-36" className="font-bold border-l border-black">
              {applicantIsCatholicText}
            </ValueCell>
          </TableRow>
        </div>
        <SectionLabel>("The Applicant")</SectionLabel>

        {/* Consideration Text */}
        <div className="my-3 text-xs text-justify leading-relaxed">
          In consideration of the sum of{' '}
          <span className="inline-block w-24 border-b border-black text-center">
            $ {formatCurrency(wallPrice)}
          </span>{' '}
          from the Applicant as the fee ("fee"), for which the Order
          acknowledges receipt, the Order agrees to the interment and storage at
          the Franciscan Columbarium located at 5 Bukit East Ave 2, Singapore
          659918 ("The Columbarium")
        </div>

        {/* Chapel Info */}
        <div className="flex items-center gap-1 text-xs mb-3">
          <span>In the Chapel of :</span>
          <span className="flex-1 border-b border-black px-1 text-center">
            {chapelName}
          </span>
          {/* <span className="w-16 border-b border-black px-1 text-center">
            {nicheNo}
          </span> */}
          {nicheLevel && (
            <>
              <span className="ml-1">Niche No :</span>
              <span className="w-12 border-b border-black px-1 text-center">
                {nicheNo}
              </span>
            </>
          )}
          <span>of an urn(s) containing the ashes of</span>
        </div>



        {/* Beneficiary 1 */}
        {beneficiary1 && (beneficiary1.name || beneficiary1.idNo) && (
          <div className="flex border border-black mb-1 text-xs">
            <div className="w-8 border-r border-black flex items-center justify-center font-bold bg-gray-50">
              1
            </div>
            <div className="flex-1">
              <TableRow>
                <LabelCell width="w-44">Name</LabelCell>
                <ValueCell className="font-bold border-r border-black">{beneficiary1?.name || ''}</ValueCell>
                <LabelCell width="w-44">NRIC/Passport No.</LabelCell>
                <ValueCell className="font-bold">{beneficiary1?.idNo || ''}</ValueCell>
              </TableRow>
              <TableRow>
                <LabelCell width="w-44">Date of Birth</LabelCell>
                <ValueCell className="font-bold border-r border-black">{beneficiary1?.dateOfBirth ? formatDate(beneficiary1.dateOfBirth) : (beneficiary1?.birthYear || '')}</ValueCell>
                <LabelCell width="w-44">Sex</LabelCell>
                <ValueCell className="font-bold">{beneficiary1?.sex || ''}</ValueCell>
              </TableRow>
              <TableRow>
                <LabelCell width="w-44">Relationship to Applicant</LabelCell>
                <ValueCell className="font-bold border-r border-black">{beneficiary1?.relationshipToApplicant || ''}</ValueCell>
                <LabelCell width="w-44">Catholic</LabelCell>
                <ValueCell className="font-bold">{beneficiary1.isCatholic ? 'Yes' : 'No'}</ValueCell>
              </TableRow>
              <TableRow className="border-b-0">
                <LabelCell width="w-44" className="text-[9px] text-gray-600 leading-tight">Relationship to Nominee1</LabelCell>
                <ValueCell className="font-bold border-r border-black">{beneficiary1?.relationshipToNominee1 || ''}</ValueCell>
                <LabelCell width="w-44" className="text-[9px] text-gray-600 leading-tight">Relationship to Nominee2</LabelCell>
                <ValueCell className="font-bold">{beneficiary1?.relationshipToNominee2 || ''}</ValueCell>
              </TableRow>
            </div>
          </div>
        )}

        {/* Beneficiary 2 */}
        {beneficiary2 && (beneficiary2.name || beneficiary2.idNo) && (
          <div className="flex border border-black mb-1 text-xs">
            <div className="w-8 border-r border-black flex items-center justify-center font-bold bg-gray-50">
              2
            </div>
            <div className="flex-1">
              <TableRow>
                <LabelCell width="w-44">Name</LabelCell>
                <ValueCell className="font-bold border-r border-black">{beneficiary2?.name || ''}</ValueCell>
                <LabelCell width="w-44">NRIC/Passport No.</LabelCell>
                <ValueCell className="font-bold">{beneficiary2?.idNo || ''}</ValueCell>
              </TableRow>
              <TableRow>
                <LabelCell width="w-44">Date of Birth</LabelCell>
                <ValueCell className="font-bold border-r border-black">{beneficiary2?.dateOfBirth ? formatDate(beneficiary2.dateOfBirth) : (beneficiary2?.birthYear || '')}</ValueCell>
                <LabelCell width="w-44">Sex</LabelCell>
                <ValueCell className="font-bold">{beneficiary2?.sex || ''}</ValueCell>
              </TableRow>
              <TableRow>
                <LabelCell width="w-44">Relationship to Applicant</LabelCell>
                <ValueCell className="font-bold border-r border-black">{beneficiary2?.relationshipToApplicant || ''}</ValueCell>
                <LabelCell width="w-44">Catholic</LabelCell>
                <ValueCell className="font-bold">{beneficiary2.isCatholic ? 'Yes' : 'No'}</ValueCell>
              </TableRow>
              <TableRow className="border-b-0">
                <LabelCell width="w-44" className="text-[9px] text-gray-600 leading-tight">Relationship to Nominee1</LabelCell>
                <ValueCell className="font-bold border-r border-black">{beneficiary2?.relationshipToNominee1 || ''}</ValueCell>
                <LabelCell width="w-44" className="text-[9px] text-gray-600 leading-tight">Relationship to Nominee2</LabelCell>
                <ValueCell className="font-bold">{beneficiary2?.relationshipToNominee2 || ''}</ValueCell>
              </TableRow>
            </div>
          </div>
        )}
        <SectionLabel>("The Beneficiary")</SectionLabel>

        {/* Consent Text */}
        <div className="mt-3 text-xs text-justify mb-4">
          <p className="mb-2">
            By submitting this form, I consent to any my personal data being
            collected, used or disclosed by the Order of Friars Minor (S) Ltd in
            accordance with its Personal Data Protection Policy statement which
            may be found at{' '}
            <span className="underline">www.franciscans.sg</span>. Additionally,
            where personal data of any third party is provided by you to OFMS
            you represent and warrant that:
          </p>
          <ul className="list-disc pl-6 space-y-0.5 text-[10px]">
            <li>
              you have the authority of that third party to disclose the said
              personal data to OFMS
            </li>
            <li>
              the third party is aware that his/her personal data is being
              disclosed to OFMS
            </li>
            <li>such personal data is true, current and accurate</li>
          </ul>
          <p className="mt-2">
            The form overleaf, the Conditions and the Regulations attached form
            an integral part of this Agreement.
          </p>
        </div>

        {/* Signatures */}
        <div className="border border-black p-3 mt-auto text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="min-h-[2.5rem] flex items-end mb-9">
                <p className="mb-2 font-medium">The Applicant Personally :</p>
              </div>
              <div className="border-b border-black mb-2"></div>
              <div className="flex mb-1">
                <span className="w-24">Name :</span>
                <span>{applicantName}</span>
              </div>
              <div className="flex">
                <span className="w-24">Agreement Date :</span>
                <span>{footerAgreementDate}</span>
              </div>
            </div>
            <div>
              <div className="min-h-[2.5rem] flex flex-col justify-end mb-9">
                <p className="mb-0">For and on Behalf of</p>
                <p className="mb-2 font-medium">
                  The Order of Friars Minor (Singapore) Limited
                </p>
              </div>
              <div className="border-b border-black mb-2"></div>
              <div className="mb-1">{statusText.includes('Signed') || data.agreement?.status === 'signed' ? (data.agreement?.signedBy || 'Fr Gerard Victor') : 'Fr Gerard Victor'}</div>
              <div>Friar - Manager</div>
            </div>
          </div>
        </div>
      </div>

      {/* Page 2 */}
      <div data-pdf-page className="max-w-[210mm] mx-auto bg-white shadow-lg p-6 min-h-[297mm] print:shadow-none print:p-8">
        {/* Nominee 1 */}
        <p className="mb-1 text-xs font-medium">
          The Applicant's 1st nominee for contact purposes ("Nominee") is :
        </p>
        <div className="border border-black mb-4 text-xs">
          <TableRow>
            <LabelCell>Name</LabelCell>
            <ValueCell className="font-bold">{nominee?.name || ''}</ValueCell>
            <LabelCell width="w-28" className="border-l border-black">
              NRIC/Passport No.
            </LabelCell>
            <ValueCell width="w-32" className="font-bold border-l border-black">
              {nominee?.idNo || ''}
            </ValueCell>
          </TableRow>
          <div className="flex border-b border-black">
            <LabelCell className="h-[78px] border-b-0">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              {(() => {
                const nl = addressUtils.buildAddressLines({
                  addressNo: nominee?.addressNo || '',
                  addressLine1: nominee?.addressLine1 || '',
                  addressLine2: nominee?.addressLine2 || '',
                  addressCity: nominee?.addressCity || '',
                  addressState: nominee?.addressState || '',
                  addressCountry: nominee?.addressCountry || '',
                }); return (<>
                  <div className="flex border-b border-black h-[26px]">
                    <ValueCell className="font-bold flex-1">{nl[0] || ''}</ValueCell>
                    <LabelCell width="w-28" className="border-l border-black border-r-0">Mobile No.</LabelCell>
                    <ValueCell width="w-32" className="font-bold border-l border-black">{nominee?.mobileNo || ''}</ValueCell>
                  </div>
                  <div className="flex border-b border-black h-[26px]">
                    <ValueCell className="font-bold flex-1">{nl[1] || ''}</ValueCell>
                    <LabelCell width="w-28" className="border-l border-black border-r-0">Home Tel.</LabelCell>
                    <ValueCell width="w-32" className="font-bold border-l border-black">{nominee?.homeTelNo || ''}</ValueCell>
                  </div>
                  <div className="flex h-[26px]">
                    <ValueCell className="font-bold flex-1">{nl[2] || ''}</ValueCell>
                    <LabelCell width="w-28" className="border-l border-black border-r-0">Office Tel.</LabelCell>
                    <ValueCell width="w-32" className="font-bold border-l border-black">{nominee?.officeTelNo || ''}</ValueCell>
                  </div>
                </>);
              })()}
            </div>
          </div>
          <TableRow>
            <LabelCell>e-mail</LabelCell>
            <ValueCell className="font-bold">{nominee?.email || ''}</ValueCell>
            <LabelCell width="w-36" className="border-l border-black">
              Relationship to Applicant
            </LabelCell>
            <ValueCell width="w-24" className="font-bold border-l border-black">
              {nominee?.relationship || ''}
            </ValueCell>
          </TableRow>
        </div>

        {/* Nominee 2 */}
        {nominee2 && nominee2.name && (
          <>
            <p className="mb-1 text-xs font-medium">
              The Applicant's 2nd nominee for contact purposes ("Nominee") is :
            </p>
            <div className="border border-black mb-4 text-xs">
              <TableRow>
                <LabelCell>Name</LabelCell>
                <ValueCell className="font-bold">{nominee2?.name || ''}</ValueCell>
                <LabelCell width="w-28" className="border-l border-black">
                  NRIC/Passport No.
                </LabelCell>
                <ValueCell width="w-32" className="font-bold border-l border-black">
                  {nominee2?.idNo || ''}
                </ValueCell>
              </TableRow>
              <div className="flex border-b border-black">
                <LabelCell className="h-[78px] border-b-0">Address</LabelCell>
                <div className="flex-1 flex flex-col">
                  {(() => {
                    const n2l = addressUtils.buildAddressLines(nominee2 || {});
                    return (
                      <>
                        <div className="flex border-b border-black h-[26px]">
                          <ValueCell className="font-bold flex-1">{n2l[0] || ''}</ValueCell>
                          <LabelCell width="w-28" className="border-l border-black border-r-0">Mobile No.</LabelCell>
                          <ValueCell width="w-32" className="font-bold border-l border-black">{nominee2?.mobileNo || ''}</ValueCell>
                        </div>
                        <div className="flex border-b border-black h-[26px]">
                          <ValueCell className="font-bold flex-1">{n2l[1] || ''}</ValueCell>
                          <LabelCell width="w-28" className="border-l border-black border-r-0">Home Tel.</LabelCell>
                          <ValueCell width="w-32" className="font-bold border-l border-black">{nominee2?.homeTelNo || ''}</ValueCell>
                        </div>
                        <div className="flex h-[26px]">
                          <ValueCell className="font-bold flex-1">{n2l[2] || ''}</ValueCell>
                          <LabelCell width="w-28" className="border-l border-black border-r-0">Office Tel.</LabelCell>
                          <ValueCell width="w-32" className="font-bold border-l border-black">{nominee2?.officeTelNo || ''}</ValueCell>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <TableRow>
                <LabelCell>e-mail</LabelCell>
                <ValueCell className="font-bold">{nominee2?.email || ''}</ValueCell>
                <LabelCell width="w-36" className="border-l border-black">
                  Relationship to Applicant
                </LabelCell>
                <ValueCell width="w-24" className="font-bold border-l border-black">
                  {nominee2?.relationship || ''}
                </ValueCell>
              </TableRow>
            </div>
          </>
        )}

        {/* Chapel Details Table */}
        <div className="border border-black mb-6 text-xs">
          <div className="flex border-b border-black">
            <div className="w-32 p-1 pl-2 font-medium border-r border-black">
              Chapel Name
            </div>
            <div className="flex-1 p-1 pl-2 border-r border-black">
              {chapelName}
            </div>
            <div className="w-32 p-1 pl-2 font-medium border-r border-black">
              Niche No
            </div>
            <div className="w-32 p-1 pl-2">{nicheNo}</div>
          </div>
          <div className="flex border-b border-black">
            <div className="w-32 p-1 pl-2 font-medium border-r border-black">
              1st Interment Date
            </div>
            <div className="flex-1 p-1 pl-2 border-r border-black">
              {firstIntermentDate}
            </div>
            <div className="w-32 p-1 pl-2 font-medium border-r border-black">
              2nd Interment Date
            </div>
            <div className="w-32 p-1 pl-2">{secondIntermentDate}</div>
          </div>
          {rawIntermentDate && (
            <div className="flex">
              <div className="w-32 p-1 pl-2 font-medium border-r border-black">
                Storage Period From
              </div>
              <div className="flex-1 p-1 pl-2 border-r border-black">
                {storageFrom}
              </div>
              <div className="w-32 p-1 pl-2 font-medium border-r border-black">
                Storage Period To
              </div>
              <div className="w-32 p-1 pl-2">{storageTo}</div>
            </div>
          )}
        </div>

        {/* Payment Table */}
        <div className="border border-black mb-8 text-xs">
          <div className="flex border-b border-black bg-gray-50 font-medium">
            <div className="w-24 p-1 pl-2 border-r border-black">Date</div>
            <div className="w-24 p-1 pl-2 border-r border-black">
              Inv/ Receipt
            </div>
            <div className="flex-1 p-1 pl-2 border-r border-black">
              Description
            </div>
            <div className="w-20 p-1 pl-2 border-r border-black text-right pr-2">
              Amount
            </div>
            <div className="w-16 p-1 pl-2 border-r border-black text-right pr-2">
              GST
            </div>
            <div className="w-20 p-1 pl-2 text-right pr-2">Total</div>
          </div>
          {(() => {
            // Filter out inscription items — only show niche-related items (typically ItemId <= 7)
            const nicheItems = invoiceDetails && invoiceDetails.length > 0
              ? invoiceDetails.filter((item: any) => {
                const name = (item.itemName || item.description || '').toLowerCase();
                const code = (item.itemCode || '').toLowerCase();
                // Exclude inscription items
                const isInscription = name.includes('inscription') || name.includes('engrav') || code.includes('inscr') || code.includes('engr');
                return !isInscription;
              })
              : [];

            const nicheItemCount = nicheItems.length;

            const nicheNetTotal = nicheItems.reduce((sum: any, item: any) => sum + (item.lineTotalAmount || item.lineNet || item.payingAmount || 0), 0);
            const nicheTaxTotal = nicheItems.reduce((sum: any, item: any) => sum + (item.lineTaxAmount || item.taxAmount || 0), 0);
            const nicheGrossTotal = nicheItems.reduce((sum: any, item: any) => sum + (item.totalPayingAmount || item.lineTotal || 0), 0);

            // Build niche description: Chapel Name - Niche Code (count items)
            const nicheDesc = `${chapelName || 'Niche Fee'}${(nicheNo) ? ` - ${nicheNo}` : ''}${nicheItemCount > 1 ? ` (${nicheItemCount} items)` : ''}`;

            // Receipt payment description
            const receiptDesc = [
              paymentMethod,
              (invoice?.paymentModeDocNo || (invoice as any)?.receipt?.receiptPaymentModeDocNo) ? `Ref: ${invoice?.paymentModeDocNo || (invoice as any).receipt.receiptPaymentModeDocNo}` : ''
            ].filter(Boolean).join(' - ');

            // Balance = invoice total - receipt amount
            const invoiceTotal = nicheGrossTotal || totalAmount;
            const receiptPaid = (invoice as any)?.receiptPayingAmount || (invoice as any)?.receiptAmount || (invoice as any)?.payingAmount || ((invoice as any)?.receipt?.receiptPayingAmount || 0);
            const outstandingBalance = Math.max(0, invoiceTotal - receiptPaid);

            return (
              <>
                {/* Invoice line — single consolidated row for niche items */}
                <div className="flex border-b border-black min-h-[26px]">
                  <div className="w-24 p-1 pl-2 border-r border-black truncate">
                    {invoiceDate}
                  </div>
                  <div className="w-24 p-1 pl-2 border-r border-black truncate">
                    {invoiceNo}
                  </div>
                  <div className="flex-1 p-1 pl-2 border-r border-black">
                    {nicheDesc}
                  </div>
                  <div className="w-20 p-1 pl-2 border-r border-black text-right pr-2">
                    $ {formatCurrency(nicheNetTotal || nicheAmount)}
                  </div>
                  <div className="w-16 p-1 pl-2 border-r border-black text-right pr-2">
                    $ {formatCurrency(nicheTaxTotal || taxAmount)}
                  </div>
                  <div className="w-20 p-1 pl-2 text-right pr-2">
                    $ {formatCurrency(nicheGrossTotal || totalAmount)}
                  </div>
                </div>

                {/* Receipt line */}
                <div className="flex border-b border-black h-[26px]">
                  <div className="w-24 p-1 pl-2 border-r border-black">
                    {receiptDate}
                  </div>
                  <div className="w-24 p-1 pl-2 border-r border-black">
                    {receiptNo}
                  </div>
                  <div className="flex-1 p-1 pl-2 border-r border-black">
                    {receiptDesc || paymentMethod}
                  </div>
                  <div className="w-20 p-1 pl-2 border-r border-black bg-gray-100"></div>
                  <div className="w-16 p-1 pl-2 border-r border-black text-center">
                    -
                  </div>
                  <div className="w-20 p-1 pl-2 text-right pr-2">
                    $ {formatCurrency(receiptPaid)}
                  </div>
                </div>

                {/* Empty row */}
                <div className="flex border-b border-black h-[26px]">
                  <div className="w-24 border-r border-black"></div>
                  <div className="w-24 border-r border-black"></div>
                  <div className="flex-1 border-r border-black"></div>
                  <div className="w-20 border-r border-black"></div>
                  <div className="w-16 border-r border-black"></div>
                  <div className="w-20"></div>
                </div>

                {/* Total row */}
                <div className="flex h-[26px]">
                  <div className="w-24"></div>
                  <div className="w-24"></div>
                  <div className="flex-1"></div>
                  <div className="w-20"></div>
                  <div className="w-16 p-1 pr-2 text-right font-medium">Total</div>
                  <div className="w-20 p-1 pl-2 text-right pr-2 border-l border-black">
                    $ {formatCurrency(outstandingBalance)}
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Deceased Table */}
        <div className="border border-black text-xs">
          <div className="flex border-b border-black bg-gray-50 font-medium">
            <div className="flex-1 p-1 pl-2 border-r border-black">
              Name of Deceased
            </div>
            <div className="w-40 p-1 pl-2 border-r border-black">
              Death Certificate No.
            </div>
            <div className="w-40 p-1 pl-2">Date of Deceased</div>
          </div>
          <div className="flex border-b border-black h-[26px]">
            <div className="w-52 p-1 pl-2 border-r border-black font-bold">
              {firstDeceasedName}
            </div>
            <div className="w-40 p-1 pl-2 border-r border-black font-bold">
              {firstDeceasedDeathCert}
            </div>
            <div className="w-40 p-1 pl-2 font-bold">{firstDeceasedDate}</div>
          </div>
          <div className="flex h-[26px]">
            <div className="w-52 p-1 pl-2 border-r border-black font-bold">
              {secondDeceasedName}
            </div>
            <div className="w-40 p-1 pl-2 border-r border-black font-bold">
              {secondDeceasedDeathCert}
            </div>
            <div className="w-40 p-1 pl-2 font-bold">{secondDeceasedDate}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
