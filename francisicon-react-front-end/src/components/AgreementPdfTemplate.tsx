import React from 'react'
import { PDF_ASSETS } from '../components/common/FranciscanLogo'
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
      status?: string
      sex?: string
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
const buildAddressLinesFromEntity = (entity: any): string[] => {
  const addressNo = entity.addressNo || entity.address?.no || ''
  const addressLine1 = entity.addressLine1 || entity.address?.line1 || ''
  const addressLine2 = entity.addressLine2 || entity.address?.line2 || ''
  const addressCity = entity.addressCity || entity.address?.city || ''
  const addressState = entity.addressState || entity.address?.state || ''
  const addressCountry = entity.addressCountry || entity.address?.country || ''
  if (
    addressNo ||
    addressLine1 ||
    addressLine2 ||
    addressCity ||
    addressState ||
    addressCountry
  ) {
    const line1Parts: string[] = []
    if (addressNo) line1Parts.push(addressNo.trim())
    if (addressLine1) line1Parts.push(addressLine1.trim())
    if (addressLine2) line1Parts.push(addressLine2.trim())
    const line1 = line1Parts.join(' ').trim()
    const line2 = addressCity || ''
    const line3 = [addressCountry, addressState]
      .filter(Boolean)
      .join(' ')
      .trim()
    return [line1, line2, line3]
  }
  const rawAddress = entity?.address || ''
  if (rawAddress) {
    return [rawAddress.trim(), '', '']
  }
  return ['', '', '']
}
const formatDate = (dateStr: string | null | undefined): string => {
  return dateStr || ''
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
  const applicantAddressLines = buildAddressLinesFromEntity(applicant || {})
  const considerationSum =
    invoice?.totalAmount ||
    invoice?.invoicePayingAmount ||
    niche?.totalAmount ||
    7000
  const chapelName =
    niche?.chapelName || niche?.location?.chapel?.chapelName || ''
  const nicheNumber = niche?.number || ''
  const wallName = niche?.wallName || niche?.location?.wall?.wallName || ''
  const wallPrice = niche?.location?.row?.rowPrice || niche?.rowPrice || niche?.wallPrice || niche?.totalAmount || 0
  const footerAgreementDate = formatDate(agreementDate || appliedDate)
  const statusText = data.statusText || ''
  const applicantName = applicant?.name || ''
  const applicantIdNo = applicant?.idNo || ''
  const applicantMobileNo = applicant?.mobileNo || ''
  const applicantHomeTelNo = applicant?.homeTelNo || ''
  const applicantOfficeTelNo = applicant?.officeTelNo || ''
  const applicantEmail = applicant?.email || ''
  const applicantIsCatholicText = applicant?.isCatholic ? 'Yes' : 'No'
  const beneficiary1 = (beneficiaries && beneficiaries[0]) || null
  const beneficiary2 = (beneficiaries && beneficiaries[1]) || null
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
  const storageFrom = formatDate(storage?.storageFrom)
  const storageTo = formatDate(storage?.storageTo)
  const invoiceNo = invoice?.invoiceNo || ''
  const invoiceDate = formatDate(invoice?.invoiceDate)
  const nicheAmount = invoice?.receiptAmount || invoice?.totalAmount || 0
  const taxAmount = invoice?.taxAmount || 0
  const totalAmount = invoice?.totalAmount || invoice?.invoicePayingAmount || 0
  const paymentMethod = invoice?.paymentMode || 'Cash'
  const balance = invoice?.receiptPayingAmount || 0
  const TableRow = ({
    children,
    className = '',
  }: {
    children: React.ReactNode
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
    children: React.ReactNode
    width?: string
    className?: string
  }) => (
    <div
      className={
        width +
        ' border-r border-black p-1 pl-2 text-xs font-medium flex-shrink-0 ' +
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
    children: React.ReactNode
    className?: string
    width?: string
  }) => (
    <div className={width + ' p-1 pl-2 text-xs ' + className}>{children}</div>
  )
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="border border-black border-t-0 px-2 py-1 text-xs font-bold bg-gray-50">
      {children}
    </div>
  )
  return (
    <div className="min-h-screen bg-gray-100 py-4 font-sans text-gray-900 print:bg-white print:py-0">
      {/* Page 1 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-6 mb-4 min-h-[297mm] print:shadow-none print:mb-0 print:p-8">
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
            <div className="text-[10px]">
              Applied Date :{' '}
              <span className="font-normal ml-1">{appliedDate || ''}</span>
            </div>
            <div className="text-[10px]">
              Status :{' '}
              <span className="font-normal ml-1">{statusText || ''}</span>
            </div>
          </div>
        </div>

        {/* Applicant Table */}
        <div className="border border-black mb-0 text-xs">
          <TableRow>
            <LabelCell>Name</LabelCell>
            <ValueCell>{applicantName}</ValueCell>
            <LabelCell width="w-28" className="border-l border-black">
              NRIC/Passport No.
            </LabelCell>
            <ValueCell width="w-36" className="border-l border-black">
              {applicantIdNo}
            </ValueCell>
          </TableRow>
          <div className="flex border-b border-black">
            <LabelCell className="h-16 border-b-0">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-5">
                <ValueCell className="flex-1">
                  {applicantAddressLines[0]}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Mobile No.
                </LabelCell>
                <ValueCell width="w-36" className="border-l border-black">
                  {applicantMobileNo}
                </ValueCell>
              </div>
              <div className="flex border-b border-black h-5">
                <ValueCell className="flex-1">
                  {applicantAddressLines[1]}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Home Tel.
                </LabelCell>
                <ValueCell width="w-36" className="border-l border-black">
                  {applicantHomeTelNo}
                </ValueCell>
              </div>
              <div className="flex h-5">
                <ValueCell className="flex-1">
                  {applicantAddressLines[2]}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Office Tel.
                </LabelCell>
                <ValueCell width="w-36" className="border-l border-black">
                  {applicantOfficeTelNo}
                </ValueCell>
              </div>
            </div>
          </div>
          <TableRow>
            <LabelCell>e-mail</LabelCell>
            <ValueCell>{applicantEmail}</ValueCell>
            <LabelCell width="w-28" className="border-l border-black">
              Catholic
            </LabelCell>
            <ValueCell width="w-36" className="border-l border-black">
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
          <span>Niche No:</span>
          <span className="w-16 border-b border-black px-1 text-center">
            {nicheNumber}
          </span>
          <span>of an urn(s) containing the ashes of</span>
        </div>

     

        {/* Beneficiary 1 */}
        <div className="flex border border-black mb-1 text-xs">
          <div className="w-6 border-r border-black flex items-center justify-center font-bold bg-gray-50">
            1
          </div>
          <div className="flex-1">
            <TableRow>
              <LabelCell width="w-36">Name</LabelCell>
              <ValueCell>{beneficiary1?.name || ''}</ValueCell>
              <LabelCell width="w-28" className="border-l border-black">
                NRIC/Passport No.
              </LabelCell>
              <ValueCell width="w-32" className="border-l border-black">
                {beneficiary1?.idNo || ''}
              </ValueCell>
            </TableRow>
            <TableRow>
              <LabelCell width="w-36">Date of Birth</LabelCell>
              <ValueCell>{beneficiary1?.dateOfBirth ||beneficiary1?.birthYear || ''}</ValueCell>
              <LabelCell width="w-28" className="border-l border-black">
                Sex
              </LabelCell>
              <ValueCell width="w-32" className="border-l border-black">
                {beneficiary1?.sex || ''}
              </ValueCell>
            </TableRow>
            <TableRow>
              <LabelCell width="w-36">Relationship to Applicant</LabelCell>
              <ValueCell>
                {beneficiary1?.relationshipToApplicant || ''}
              </ValueCell>
              <LabelCell width="w-28" className="border-l border-black">
                Catholic
              </LabelCell>
              <ValueCell width="w-32" className="border-l border-black">
                {beneficiary1?.isCatholic ? 'Yes' : 'No'}
              </ValueCell>
            </TableRow>
            <div className="flex">
              <LabelCell width="w-36" className="text-[9px] text-gray-500">
                Relationship to Nominee1
              </LabelCell>
              <ValueCell className="bg-gray-100">
                {beneficiary1?.relationshipToNominee1 || ''}
              </ValueCell>
              <LabelCell
                width="w-28"
                className="border-l border-black text-[9px] text-gray-500"
              >
                Relationship to Nominee2
              </LabelCell>
              <ValueCell
                width="w-32"
                className="border-l border-black bg-gray-100"
              >
                {beneficiary1?.relationshipToNominee2 || ''}
              </ValueCell>
            </div>
          </div>
        </div>

        {/* Beneficiary 2 */}
        <div className="flex border border-black mb-0 text-xs">
          <div className="w-6 border-r border-black flex items-center justify-center font-bold bg-gray-50">
            2
          </div>
          <div className="flex-1">
            <TableRow>
              <LabelCell width="w-36">Name</LabelCell>
              <ValueCell>{beneficiary2?.name || ''}</ValueCell>
              <LabelCell width="w-28" className="border-l border-black">
                NRIC/Passport No.
              </LabelCell>
              <ValueCell width="w-32" className="border-l border-black">
                {beneficiary2?.idNo || ''}
              </ValueCell>
            </TableRow>
            <TableRow>
              <LabelCell width="w-36">Date of Birth</LabelCell>
              <ValueCell>{beneficiary2?.dateOfBirth || ''}</ValueCell>
              <LabelCell width="w-28" className="border-l border-black">
                Sex
              </LabelCell>
              <ValueCell width="w-32" className="border-l border-black">
                {beneficiary2?.sex || ''}
              </ValueCell>
            </TableRow>
            <TableRow>
              <LabelCell width="w-36">Relationship to Applicant</LabelCell>
              <ValueCell>
                {beneficiary2?.relationshipToApplicant || ''}
              </ValueCell>
              <LabelCell width="w-28" className="border-l border-black">
                Catholic
              </LabelCell>
              <ValueCell width="w-32" className="border-l border-black">
                {beneficiary2?.isCatholic ? 'Yes' : 'No'}
              </ValueCell>
            </TableRow>
            <div className="flex">
              <LabelCell width="w-36" className="text-[9px] text-gray-500">
                Relationship to Nominee1
              </LabelCell>
              <ValueCell className="bg-gray-100">
                {beneficiary2?.relationshipToNominee1 || ''}
              </ValueCell>
              <LabelCell
                width="w-28"
                className="border-l border-black text-[9px] text-gray-500"
              >
                Relationship to Nominee2
              </LabelCell>
              <ValueCell
                width="w-32"
                className="border-l border-black bg-gray-100"
              >
                {beneficiary2?.relationshipToNominee2 || ''}
              </ValueCell>
            </div>
          </div>
        </div>
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
              <p className="mb-8 font-medium">The Applicant Personally :</p>
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
              <p className="mb-1">For and on Behalf of</p>
              <p className="mb-8 font-medium">
                The Order of Friars Minor (Singapore) Limited
              </p>
              <div className="border-b border-black mb-2"></div>
              <div className="mb-1">FrGerard Victor</div>
              <div>Friar - Manager</div>
            </div>
          </div>
        </div>
      </div>

      {/* Page 2 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-6 min-h-[297mm] print:shadow-none print:p-8">
        {/* Nominee 1 */}
        <p className="mb-1 text-xs font-medium">
          The Applicant's 1st nominee for contact purposes ("Nominee") is :
        </p>
        <div className="border border-black mb-4 text-xs">
          <TableRow>
            <LabelCell>Name</LabelCell>
            <ValueCell>{nominee?.name || ''}</ValueCell>
            <LabelCell width="w-28" className="border-l border-black">
              NRIC/Passport No.
            </LabelCell>
            <ValueCell width="w-32" className="border-l border-black">
              {nominee?.idNo || ''}
            </ValueCell>
          </TableRow>
          <div className="flex border-b border-black">
            <LabelCell className="h-16 border-b-0">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-5">
                <ValueCell className="flex-1">
                  {buildAddressLinesFromEntity(nominee || {})[0]}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Mobile No.
                </LabelCell>
                <ValueCell width="w-32" className="border-l border-black">
                  {nominee?.mobileNo || ''}
                </ValueCell>
              </div>
              <div className="flex border-b border-black h-5">
                <ValueCell className="flex-1">
                  {buildAddressLinesFromEntity(nominee || {})[1]}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Home Tel.
                </LabelCell>
                <ValueCell width="w-32" className="border-l border-black">
                  {nominee?.homeTelNo || ''}
                </ValueCell>
              </div>
              <div className="flex h-5">
                <ValueCell className="flex-1">
                  {buildAddressLinesFromEntity(nominee || {})[2]}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Office Tel.
                </LabelCell>
                <ValueCell width="w-32" className="border-l border-black">
                  {nominee?.officeTelNo || ''}
                </ValueCell>
              </div>
            </div>
          </div>
          <TableRow>
            <LabelCell>e-mail</LabelCell>
            <ValueCell>{nominee?.email || ''}</ValueCell>
            <LabelCell width="w-36" className="border-l border-black">
              Relationship to Applicant
            </LabelCell>
            <ValueCell width="w-24" className="border-l border-black">
              {nominee?.relationship || ''}
            </ValueCell>
          </TableRow>
        </div>

        {/* Nominee 2 */}
        <p className="mb-1 text-xs font-medium">
          The Applicant's 2nd nominee for contact purposes ("Nominee") is :
        </p>
        <div className="border border-black mb-4 text-xs">
          <TableRow>
            <LabelCell>Name</LabelCell>
            <ValueCell>{nominee2?.name || ''}</ValueCell>
            <LabelCell width="w-28" className="border-l border-black">
              NRIC/Passport No.
            </LabelCell>
            <ValueCell width="w-32" className="border-l border-black">
              {nominee2?.idNo || ''}
            </ValueCell>
          </TableRow>
          <div className="flex border-b border-black">
            <LabelCell className="h-16 border-b-0">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-5">
                <ValueCell className="flex-1">
                  {buildAddressLinesFromEntity(nominee2 || {})[0]}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Mobile No.
                </LabelCell>
                <ValueCell width="w-32" className="border-l border-black">
                  {nominee2?.mobileNo || ''}
                </ValueCell>
              </div>
              <div className="flex border-b border-black h-5">
                <ValueCell className="flex-1">
                  {buildAddressLinesFromEntity(nominee2 || {})[1]}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Home Tel.
                </LabelCell>
                <ValueCell width="w-32" className="border-l border-black">
                  {nominee2?.homeTelNo || ''}
                </ValueCell>
              </div>
              <div className="flex h-5">
                <ValueCell className="flex-1">
                  {buildAddressLinesFromEntity(nominee2 || {})[2]}
                </ValueCell>
                <LabelCell
                  width="w-28"
                  className="border-l border-black border-r-0"
                >
                  Office Tel.
                </LabelCell>
                <ValueCell width="w-32" className="border-l border-black">
                  {nominee2?.officeTelNo || ''}
                </ValueCell>
              </div>
            </div>
          </div>
          <TableRow>
            <LabelCell>e-mail</LabelCell>
            <ValueCell>{nominee2?.email || ''}</ValueCell>
            <LabelCell width="w-36" className="border-l border-black">
              Relationship to Applicant
            </LabelCell>
            <ValueCell width="w-24" className="border-l border-black">
              {nominee2?.relationship || ''}
            </ValueCell>
          </TableRow>
        </div>

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
            <div className="w-32 p-1 pl-2">{nicheNumber}</div>
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
          <div className="flex border-b border-black h-6">
            <div className="w-24 p-1 pl-2 border-r border-black">
              {invoiceDate}
            </div>
            <div className="w-24 p-1 pl-2 border-r border-black">
              {invoiceNo}
            </div>
            <div className="flex-1 p-1 pl-2 border-r border-black text-right pr-2">
              Niche Fee
            </div>
            <div className="w-20 p-1 pl-2 border-r border-black text-right pr-2">
              $ {formatCurrency(nicheAmount)}
            </div>
            <div className="w-16 p-1 pl-2 border-r border-black text-right pr-2">
              $ {formatCurrency(taxAmount)}
            </div>
            <div className="w-20 p-1 pl-2 text-right pr-2">
              $ {formatCurrency(totalAmount)}
            </div>
          </div>
          <div className="flex border-b border-black h-6">
            <div className="w-24 p-1 pl-2 border-r border-black">
              {invoiceDate}
            </div>
            <div className="w-24 p-1 pl-2 border-r border-black">
              {invoiceNo}
            </div>
            <div className="flex-1 p-1 pl-2 border-r border-black text-right pr-2">
              {paymentMethod}
            </div>
            <div className="w-20 p-1 pl-2 border-r border-black bg-gray-100"></div>
            <div className="w-16 p-1 pl-2 border-r border-black text-center">
              -
            </div>
            <div className="w-20 p-1 pl-2 text-right pr-2">
              $ {formatCurrency(balance)}
            </div>
          </div>
          <div className="flex border-b border-black h-6">
            <div className="w-24 border-r border-black"></div>
            <div className="w-24 border-r border-black"></div>
            <div className="flex-1 border-r border-black"></div>
            <div className="w-20 border-r border-black"></div>
            <div className="w-16 border-r border-black"></div>
            <div className="w-20"></div>
          </div>
          <div className="flex h-6">
            <div className="w-24"></div>
            <div className="w-24"></div>
            <div className="flex-1"></div>
            <div className="w-20"></div>
            <div className="w-16 p-1 pr-2 text-right font-medium">Total</div>
            <div className="w-20 p-1 pl-2 text-right pr-2 border-l border-black">
              $ {formatCurrency(totalAmount)}
            </div>
          </div>
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
          <div className="flex border-b border-black h-6">
            <div className="flex-1 p-1 pl-2 border-r border-black">
              {firstDeceasedName}
            </div>
            <div className="w-40 p-1 pl-2 border-r border-black">
              {firstDeceasedDeathCert}
            </div>
            <div className="w-40 p-1 pl-2">{firstDeceasedDate}</div>
          </div>
          <div className="flex h-6">
            <div className="flex-1 p-1 pl-2 border-r border-black">
              {secondDeceasedName}
            </div>
            <div className="w-40 p-1 pl-2 border-r border-black">
              {secondDeceasedDeathCert}
            </div>
            <div className="w-40 p-1 pl-2">{secondDeceasedDate}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
