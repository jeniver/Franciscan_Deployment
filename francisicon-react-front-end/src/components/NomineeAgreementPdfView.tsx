import React from 'react'
import { PDF_ASSETS } from './common/FranciscanLogo'

interface NomineeAgreementData {
  type?: string
  documentTitle?: string
  applicationNumber?: string
  application?: {
    applicationNumber?: string
    appliedDate?: string
    agreementDate?: string
  }
  applicant?: {
    name?: string
    idNo?: string
    address?: string
    addressNo?: string
    addressLine1?: string
    addressLine2?: string
    addressCity?: string
    addressState?: string
    addressCountry?: string
    mobileNo?: string
    email?: string
    homeTelNo?: string
    officeTelNo?: string
    isCatholic?: boolean
  }
  nominee1?: {
    name?: string
    idNo?: string
    address?: string
    addressNo?: string
    addressLine1?: string
    addressLine2?: string
    addressCity?: string
    addressState?: string
    addressCountry?: string
    mobileNo?: string
    email?: string
    relationship?: string
    homeTelNo?: string
    officeTelNo?: string
  }
  nominee2?: {
    name?: string
    idNo?: string
    address?: string
    addressNo?: string
    addressLine1?: string
    addressLine2?: string
    addressCity?: string
    addressState?: string
    addressCountry?: string
    mobileNo?: string
    email?: string
    relationship?: string
    homeTelNo?: string
    officeTelNo?: string
  }
  niche?: {
    number?: string
    rowNumber?: string
    wallName?: string
    chapelName?: string
  }
  beneficiaries?: Array<{
    name?: string
    idNo?: string
    isCatholic?: boolean
    isMale?: boolean
    relationshipToApplicant?: string
    dateOfBirth?: string | null
    birthYear?: number
    relationshipToNominee1?: string
    relationshipToNominee2?: string
    status?: string
    sex?: string
  }>
}

interface NomineeAgreementProps {
  data?: NomineeAgreementData
  // Optional legacy props for compatibility
  nicheNo?: string
  chapelName?: string
  applicant?: any
  nominee?: any
  agreementDate?: string
}

const buildAddressLinesFromEntity = (entity: any): string[] => {
  const addressNo = entity.addressNo || ''
  const addressLine1 = entity.addressLine1 || ''
  const addressLine2 = entity.addressLine2 || ''
  const addressCity = entity.addressCity || ''
  const addressState = entity.addressState || ''
  const addressCountry = entity.addressCountry || ''

  if (addressNo || addressLine1 || addressLine2 || addressCity || addressState || addressCountry) {
    const line1Parts: string[] = []
    if (addressNo) line1Parts.push(addressNo.trim())
    if (addressLine1) line1Parts.push(addressLine1.trim())
    if (addressLine2) line1Parts.push(addressLine2.trim())
    const line1 = line1Parts.join(' ').trim()

    const line2 = addressCity || ''
    const line3 = [addressCountry, addressState].filter(Boolean).join(' ').trim()

    return [line1, line2, line3]
  }

  const rawAddress = entity?.address || ''
  if (rawAddress) {
    // If it looks like a formatted address with newlines or commas, we could split it
    // But for now, just return as single line
    return [rawAddress.trim(), '', '']
  }

  return ['', '', '']
}

const TableRow = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={'flex border-b border-black last:border-b-0 ' + className}>
    {children}
  </div>
)

const LabelCell = ({ children, width = 'w-32', className = '' }: { children: React.ReactNode; width?: string; className?: string }) => (
  <div className={width + ' border-r border-black p-1 pl-2 text-[11px] font-medium flex-shrink-0 ' + className}>
    {children}
  </div>
)

const ValueCell = ({ children, className = '', width = 'flex-1' }: { children: React.ReactNode; className?: string; width?: string }) => (
  <div className={width + ' p-1 pl-2 text-[11px] ' + className}>{children}</div>
)

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-black border-t-0 px-2 py-0.5 text-[10px] font-bold bg-gray-50 text-center">
    {children}
  </div>
)

export function NomineeAgreement({ data, ...legacyProps }: NomineeAgreementProps) {
  // Use data from props or try to map legacy props
  const finalData: NomineeAgreementData = data || {
    application: {
      applicationNumber: legacyProps.nicheNo, // Rough mapping for legacy
      agreementDate: legacyProps.agreementDate
    },
    applicant: legacyProps.applicant,
    nominee1: legacyProps.nominee, // Assuming legacy 'nominee' maps to nominee1
    niche: {
      number: legacyProps.nicheNo,
      chapelName: legacyProps.chapelName
    }
  }

  const {
    application,
    applicant,
    nominee1,
    nominee2,
    beneficiaries,
    niche
  } = finalData

  const applicantAddressLines = buildAddressLinesFromEntity(applicant || {})
  const nominee1AddressLines = buildAddressLinesFromEntity(nominee1 || {})
  const nominee2AddressLines = buildAddressLinesFromEntity(nominee2 || {})

  const applicationNumber = application?.applicationNumber || finalData.applicationNumber || ''
  const appliedDate = application?.appliedDate || ''
  const agreementDate = application?.agreementDate || ''

  const chapelName = niche?.chapelName || ''
  const nicheNumber = niche?.number || ''

  const beneficiary1 = (beneficiaries && beneficiaries[0]) || null
  const beneficiary2 = (beneficiaries && beneficiaries[1]) || null

  return (
    <div className="min-h-screen bg-gray-100 py-8 font-sans text-gray-900 print:bg-white print:py-0">
      {/* Page 1 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-10 mb-8 min-h-[297mm] print:shadow-none print:mb-0 print:p-12">
        {/* Header */}
        <header className="flex justify-between items-start mb-6">
          <div className="flex-1 text-center pt-2">
            <h1 className="text-2xl tracking-[0.2em] mb-1 uppercase font-serif">
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
          <div className="w-24 h-24 flex-shrink-0">
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
        {/* Header for Niche Info */}
        <div className="mt-8 mb-4 border-b border-black pb-1">
          <h2 className="text-center font-bold uppercase tracking-widest text-sm">
            Insertion of 2nd Beneficiary
          </h2>
        </div>

        {/* Between Section */}
        <div className="mb-4 text-xs">
          <div className="flex mb-1">
            <span className="w-16 font-semibold">Between</span>
            <span>:</span>
          </div>
          <p className="text-justify leading-snug mb-2">
            The Order of Friars Minor (Singapore) Limited, a company limited by
            guarantee of 5 Bukit Batok East Ave 2, Singapore 659918 ("The
            Order"). Co & GST Reg No. 201016323M. Tel: 6560-6361, HP: 9774-7053,
            e-mail: franciscan.columbarium@gmail.com
          </p>
        </div>

        {/* And Section with Application Code */}
        <div className="flex justify-between items-end mb-2 text-xs">
          <div className="flex gap-1">
            <span className="font-semibold">And :</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <div className="font-semibold">
              Application Number :
              <span className="font-normal ml-1">
                {applicationNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Applicant Table */}
        <div className="border border-black mb-0 text-xs">
          <TableRow>
            <LabelCell>Name</LabelCell>
            <ValueCell className="font-bold">{applicant?.name || ''}</ValueCell>
            <LabelCell width="w-32" className="border-l border-black">
              NRIC/Passport No.
            </LabelCell>
            <ValueCell width="w-40" className="border-l border-black font-bold">
              {applicant?.idNo || ''}
            </ValueCell>
          </TableRow>
          <div className="flex border-b border-black">
            <LabelCell className="h-16 border-b-0">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-[22px]">
                <ValueCell className="flex-1">
                  {applicantAddressLines[0]}
                </ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Mobile No.
                </LabelCell>
                <ValueCell width="w-40" className="border-l border-black font-bold">
                  {applicant?.mobileNo || ''}
                </ValueCell>
              </div>
              <div className="flex border-b border-black h-[22px]">
                <ValueCell className="flex-1">
                  {applicantAddressLines[1]}
                </ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Home Tel.
                </LabelCell>
                <ValueCell width="w-40" className="border-l border-black">
                  {applicant?.homeTelNo || ''}
                </ValueCell>
              </div>
              <div className="flex h-[22px]">
                <ValueCell className="flex-1">
                  {applicantAddressLines[2]}
                </ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Office Tel.
                </LabelCell>
                <ValueCell width="w-40" className="border-l border-black">
                  {applicant?.officeTelNo || ''}
                </ValueCell>
              </div>
            </div>
          </div>
          <TableRow>
            <LabelCell>e-mail</LabelCell>
            <ValueCell>{applicant?.email || ''}</ValueCell>
            <LabelCell width="w-32" className="border-l border-black">
              Catholic
            </LabelCell>
            <ValueCell width="w-40" className="border-l border-black">
              {applicant?.isCatholic ? 'Yes' : 'No'}
            </ValueCell>
          </TableRow>
        </div>
        <SectionLabel>("The Applicant")</SectionLabel>



        {/* Chapel Info */}
        <div className="flex items-center gap-2 text-xs mb-6">
          <span>In the Chapel of :</span>
          <span className="flex-1 border-b border-black px-1 font-bold">
            {chapelName}
          </span>
          <span className="ml-4">Niche No :</span>
          <span className="w-24 border-b border-black px-1 text-center font-bold">
            {nicheNumber}
          </span>
          <span className="ml-4">of an urn(s) containing the ashes of</span>
        </div>

        {/* Beneficiary Table */}
        <div className="flex border border-black mb-0 text-xs">
          <div className="w-8 border-r border-black flex items-center justify-center font-bold bg-gray-50">
            1
          </div>
          <div className="flex-1">
            <TableRow>
              <LabelCell width="w-36">Name</LabelCell>
              <ValueCell className="font-bold">{beneficiary1?.name || ''}</ValueCell>
              <LabelCell width="w-32" className="border-l border-black">
                NRIC/Passport No.
              </LabelCell>
              <ValueCell width="w-36" className="border-l border-black font-bold">
                {beneficiary1?.idNo || ''}
              </ValueCell>
            </TableRow>
            <TableRow>
              <LabelCell width="w-36">Date of Birth</LabelCell>
              <ValueCell>{beneficiary1?.dateOfBirth || beneficiary1?.birthYear || ''}</ValueCell>
              <LabelCell width="w-32" className="border-l border-black">
                Sex
              </LabelCell>
              <ValueCell width="w-36" className="border-l border-black">
                {beneficiary1?.sex || beneficiary1?.isMale === true ? 'Male' : (beneficiary1?.isMale === false ? 'Female' : '')}
              </ValueCell>
            </TableRow>
            <TableRow>
              <LabelCell width="w-36">Relationship to Applicant</LabelCell>
              <ValueCell>
                {beneficiary1?.relationshipToApplicant || ''}
              </ValueCell>
              <LabelCell width="w-32" className="border-l border-black">
                Catholic
              </LabelCell>
              <ValueCell width="w-36" className="border-l border-black">
                {beneficiary1?.isCatholic ? 'Yes' : 'No'}
              </ValueCell>
            </TableRow>
            <div className="flex">
              <LabelCell width="w-36" className="text-[10px] text-gray-500">
                Relationship to Nominee 1
              </LabelCell>
              <ValueCell className="bg-gray-50 italic">
                {beneficiary1?.relationshipToNominee1 || ''}
              </ValueCell>
              <LabelCell
                width="w-32"
                className="border-l border-black text-[10px] text-gray-500"
              >
                Relationship to Nominee 2
              </LabelCell>
              <ValueCell
                width="w-36"
                className="border-l border-black bg-gray-50 italic"
              >
                {beneficiary1?.relationshipToNominee2 || ''}
              </ValueCell>
            </div>
          </div>
        </div>
        <SectionLabel>("The Beneficiary")</SectionLabel>

        {/* Consent Text */}
        <div className="mt-8 text-[11px] text-justify mb-8 leading-relaxed">
          <p className="mb-3">
            By submitting this form, I consent to any my personal data being
            collected, used or disclosed by the Order of Friars Minor (S) Ltd in
            accordance with its Personal Data Protection Policy statement which
            may be found at{' '}
            <span className="underline font-bold text-blue-800">www.franciscans.sg</span>. Additionally,
            where personal data of any third party is provided by you to OFMS
            you represent and warrant that:
          </p>
          <ul className="list-disc pl-8 space-y-1 mb-3">
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
          <p className="mt-4">
            The Conditions and the Regulations attached form an integral part of this Agreement.
          </p>
        </div>

        {/* Signatures */}
        <div className="border border-black p-4 mt-12 text-xs">
          <div className="grid grid-cols-2 gap-12">
            <div>
              <p className="mb-12 font-semibold">The Applicant Personally :</p>
              <div className="border-b border-black mb-3"></div>
              <div className="flex mb-2">
                <span className="w-32 font-medium">Name :</span>
                <span className="font-bold">{applicant?.name || ''}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-medium">Agreement Date :</span>
                <span>{agreementDate || appliedDate}</span>
              </div>
            </div>
            <div>
              <p className="mb-2 italic text-gray-600">For and on Behalf of</p>
              <p className="mb-10 font-bold">
                The Order of Friars Minor (Singapore) Limited
              </p>
              <div className="border-b border-black mb-3"></div>
              <div className="mb-1 font-bold">Fr Gerard Victor</div>
              <div className="text-gray-600 italic">Friar - Manager</div>
            </div>
          </div>
        </div>
      </div>

      {/* Page 2 - Nominees */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-10 min-h-[297mm] print:shadow-none print:p-12">
        <h2 className="text-lg font-bold uppercase mb-6 border-b-2 border-black pb-2">Nominee Contact Details</h2>

        {/* Nominee 1 */}
        <p className="mb-2 text-xs font-semibold">
          The Applicant's 1st nominee for contact purposes ("Nominee") is :
        </p>
        <div className="border border-black mb-8 text-xs">
          <TableRow>
            <LabelCell>Name</LabelCell>
            <ValueCell className="font-bold">{nominee1?.name || ''}</ValueCell>
            <LabelCell width="w-32" className="border-l border-black">
              NRIC/Passport No.
            </LabelCell>
            <ValueCell width="w-36" className="border-l border-black font-bold">
              {nominee1?.idNo || ''}
            </ValueCell>
          </TableRow>
          <div className="flex border-b border-black">
            <LabelCell className="h-16 border-b-0">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-[22px]">
                <ValueCell className="flex-1">
                  {nominee1AddressLines[0]}
                </ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Mobile No.
                </LabelCell>
                <ValueCell width="w-36" className="border-l border-black font-bold">
                  {nominee1?.mobileNo || ''}
                </ValueCell>
              </div>
              <div className="flex border-b border-black h-[22px]">
                <ValueCell className="flex-1">
                  {nominee1AddressLines[1]}
                </ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Home Tel.
                </LabelCell>
                <ValueCell width="w-36" className="border-l border-black">
                  {nominee1?.homeTelNo || ''}
                </ValueCell>
              </div>
              <div className="flex h-[22px]">
                <ValueCell className="flex-1">
                  {nominee1AddressLines[2]}
                </ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Office Tel.
                </LabelCell>
                <ValueCell width="w-36" className="border-l border-black">
                  {nominee1?.officeTelNo || ''}
                </ValueCell>
              </div>
            </div>
          </div>
          <TableRow>
            <LabelCell>e-mail</LabelCell>
            <ValueCell className="underline">{nominee1?.email || ''}</ValueCell>
            <LabelCell width="w-40" className="border-l border-black">
              Relationship to Applicant
            </LabelCell>
            <ValueCell width="w-28" className="border-l border-black">
              {nominee1?.relationship || ''}
            </ValueCell>
          </TableRow>
        </div>

        {/* Nominee 2 */}
        <p className="mb-2 text-xs font-semibold">
          The Applicant's 2nd nominee for contact purposes ("Nominee") is :
        </p>
        <div className="border border-black mb-8 text-xs">
          <TableRow>
            <LabelCell>Name</LabelCell>
            <ValueCell className="font-bold">{nominee2?.name || ''}</ValueCell>
            <LabelCell width="w-32" className="border-l border-black">
              NRIC/Passport No.
            </LabelCell>
            <ValueCell width="w-36" className="border-l border-black font-bold">
              {nominee2?.idNo || ''}
            </ValueCell>
          </TableRow>
          <div className="flex border-b border-black">
            <LabelCell className="h-16 border-b-0">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-[22px]">
                <ValueCell className="flex-1">
                  {nominee2AddressLines[0]}
                </ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Mobile No.
                </LabelCell>
                <ValueCell width="w-36" className="border-l border-black font-bold">
                  {nominee2?.mobileNo || ''}
                </ValueCell>
              </div>
              <div className="flex border-b border-black h-[22px]">
                <ValueCell className="flex-1">
                  {nominee2AddressLines[1]}
                </ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Home Tel.
                </LabelCell>
                <ValueCell width="w-36" className="border-l border-black">
                  {nominee2?.homeTelNo || ''}
                </ValueCell>
              </div>
              <div className="flex h-[22px]">
                <ValueCell className="flex-1">
                  {nominee2AddressLines[2]}
                </ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Office Tel.
                </LabelCell>
                <ValueCell width="w-36" className="border-l border-black">
                  {nominee2?.officeTelNo || ''}
                </ValueCell>
              </div>
            </div>
          </div>
          <TableRow>
            <LabelCell>e-mail</LabelCell>
            <ValueCell className="underline">{nominee2?.email || ''}</ValueCell>
            <LabelCell width="w-40" className="border-l border-black">
              Relationship to Applicant
            </LabelCell>
            <ValueCell width="w-28" className="border-l border-black">
              {nominee2?.relationship || ''}
            </ValueCell>
          </TableRow>
        </div>

        <div className="mt-auto pt-20 flex justify-between text-[10px] text-gray-400 font-serif">
          <span>Franciscan Columbarium - 2nd Beneficiary Agreement</span>
          <span>Application Number: {applicationNumber}</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    </div>
  )
}
