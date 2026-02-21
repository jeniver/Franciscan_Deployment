import React from 'react'
import { PDF_ASSETS, AGREEMENT_DEFAULTS } from './common/FranciscanLogo'
import addressUtils from '../utils/addressUtils'

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
    code?: string
  }
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

const TableRow = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={'flex border-b border-black last:border-b-0 ' + className}>
    {children}
  </div>
)

const LabelCell = ({ children, width = 'w-32', className = '' }: { children: React.ReactNode; width?: string; className?: string }) => (
  <div className={width + ' border-r border-black p-1 pl-2 text-[10.5px] font-medium flex-shrink-0 flex items-center ' + className}>
    {children}
  </div>
)

const ValueCell = ({ children, className = '', width = 'flex-1' }: { children: React.ReactNode; className?: string; width?: string }) => (
  <div className={width + ' p-1 pl-2 text-[10.5px] flex items-center ' + className}>{children}</div>
)

export function NomineeAgreement({ data, ...legacyProps }: NomineeAgreementProps) {
  // Use data from props or try to map legacy props
  const finalData: NomineeAgreementData = data || {
    application: {
      applicationNumber: legacyProps.nicheNo,
      agreementDate: legacyProps.agreementDate
    },
    applicant: legacyProps.applicant,
    nominee2: legacyProps.nominee, // Map legacy nominee to nominee2 for insertion view
    niche: {
      number: legacyProps.nicheNo,
      chapelName: legacyProps.chapelName
    }
  }

  const {
    application,
    applicant,
    nominee2: dataNominee2,
    niche
  } = finalData

  // Fallback to nominee1 if nominee2 is missing (for flexibility)
  const nominee2 = dataNominee2 || (finalData as any).nominee1 || (finalData as any).nominee;

  const applicantAddressLines = addressUtils.buildAddressLines(applicant || {})
  const nominee2AddressLines = addressUtils.buildAddressLines(nominee2 || {})

  const applicationNumber = application?.applicationNumber || finalData.applicationNumber || ''
  const agreementDate = application?.agreementDate || application?.appliedDate || ''

  const chapelName = niche?.chapelName || ''
  const nicheNumber = niche?.code || niche?.number || ''

  return (
    <div className="min-h-screen bg-gray-100 py-8 font-serif text-gray-900 print:bg-white print:py-0">
      <div data-pdf-page className="max-w-[210mm] mx-auto bg-white shadow-lg p-12 mb-8 min-h-[297mm] print:shadow-none print:mb-0">

        {/* Header Section */}
        <header className="relative flex justify-center items-center mb-8 h-24">
          <div className="flex-1 text-center">
            <h1 className="text-3xl tracking-[0.1em] font-bold uppercase mb-2">
              Franciscan Columbarium
            </h1>
            <div className="flex items-center justify-center gap-2">
              <div
                dangerouslySetInnerHTML={{
                  __html: `
                  <svg width="24" height="20" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 15C10 10 15 5 20 15C25 25 30 20 30 15" stroke="black" stroke-width="2" />
                    <path d="M10 15C10 20 5 25 0 15" stroke="black" stroke-width="2" />
                    <path d="M30 15C30 10 35 5 40 15" stroke="black" stroke-width="2" />
                  </svg>
                `}}
              />
              <span className="text-xl italic uppercase tracking-widest ml-2">Agreement</span>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-28 h-28 border border-black p-1 bg-white overflow-hidden">
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

        {/* Title */}
        <div className="mb-6">
          <h2 className="font-bold uppercase tracking-wide text-base">
            Insertion of 2nd Nominee
          </h2>
        </div>

        {/* Between Section */}
        <div className="mb-6 text-[10.5px] leading-snug">
          <div className="flex mb-1">
            <span className="w-20 font-bold">Between</span>
            <span className="mr-4">:</span>
            <p className="flex-1 text-justify">
              The Order of Friars Minor (Singapore) Limited, a company limited by guarantee of {AGREEMENT_DEFAULTS.orderAddress} ("The Order").
              Telephone : {AGREEMENT_DEFAULTS.orderTel}, Fax : 6566-2852, E-mail : {AGREEMENT_DEFAULTS.orderEmail}
            </p>
          </div>
        </div>

        {/* And Section with Niche No */}
        <div className="flex items-center justify-between mb-4 text-[10.5px]">
          <div className="flex items-center font-bold">
            <span className="w-20">And</span>
            <span className="mr-1">:</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold mr-2 uppercase tracking-tight">Niche No:</span>
            <span className="font-bold">{applicationNumber}</span>
          </div>
        </div>

        {/* Applicant Table */}
        <div className="border border-black mb-0 text-[10.5px]">
          <TableRow>
            <LabelCell width="w-32">Name</LabelCell>
            <ValueCell>{applicant?.name || ''}</ValueCell>
            <LabelCell width="w-40" className="border-l border-black">NRIC/Passport No.</LabelCell>
            <ValueCell width="w-40" className="border-l border-black">{applicant?.idNo || ''}</ValueCell>
          </TableRow>
          <div className="flex border-b border-black">
            <LabelCell className="h-[78px] border-b-0" width="w-32">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-[26px]">
                <ValueCell className="flex-1">{applicantAddressLines[0] || ''}</ValueCell>
                <LabelCell width="w-40" className="border-l border-black border-r-0">Mobile No.</LabelCell>
                <ValueCell width="w-40" className="border-l border-black">{applicant?.mobileNo || ''}</ValueCell>
              </div>
              <div className="flex border-b border-black h-[26px]">
                <ValueCell className="flex-1">{applicantAddressLines[1] || ''}</ValueCell>
                <LabelCell width="w-40" className="border-l border-black border-r-0">Home Tel.</LabelCell>
                <ValueCell width="w-40" className="border-l border-black">{applicant?.homeTelNo || ''}</ValueCell>
              </div>
              <div className="flex h-[26px]">
                <ValueCell className="flex-1">{applicantAddressLines[2] || ''}</ValueCell>
                <LabelCell width="w-40" className="border-l border-black border-r-0">Office Tel.</LabelCell>
                <ValueCell width="w-40" className="border-l border-black">{applicant?.officeTelNo || ''}</ValueCell>
              </div>
            </div>
          </div>
          <TableRow>
            <LabelCell width="w-32">E-mail</LabelCell>
            <ValueCell>{applicant?.email || ''}</ValueCell>
            <LabelCell width="w-40" className="border-l border-black">Catholic</LabelCell>
            <ValueCell width="w-40" className="border-l border-black">{applicant?.isCatholic ? 'Yes' : 'No'}</ValueCell>
          </TableRow>
        </div>
        <div className="border border-black border-t-0 p-1 text-[9px] mb-8">
          ("The Applicant/ Nominee")
        </div>

        {/* Change Nominee Section Header */}
        <div className="mb-4">
          <h2 className="font-bold uppercase tracking-wide text-base">
            Insertion/Change of Nominee Details
          </h2>
          <div className="flex items-center gap-4 text-[10.5px] mt-2 mb-4">
            <span>In the Chapel of</span>
            <span className="w-40 border-b border-black text-center font-bold pb-0.5">{chapelName}</span>
            <span>Niche No</span>
            <span className="w-40 border-b border-black text-center font-bold pb-0.5">{nicheNumber}</span>
          </div>
          <p className="text-[10.5px]">
            The Applicant's 2nd nominee for contact purposes ("Nominee") is :
          </p>
        </div>

        {/* Nominee Table */}
        <div className="border border-black mb-8 text-[10.5px]">
          <TableRow>
            <LabelCell width="w-32">Name</LabelCell>
            <ValueCell>{nominee2?.name || ''}</ValueCell>
            <LabelCell width="w-40" className="border-l border-black">NRIC/Passport No.</LabelCell>
            <ValueCell width="w-40" className="border-l border-black">{nominee2?.idNo || ''}</ValueCell>
          </TableRow>
          <div className="flex border-b border-black">
            <LabelCell className="h-[78px] border-b-0" width="w-32">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-[26px]">
                <ValueCell className="flex-1">{nominee2AddressLines[0] || ''}</ValueCell>
                <LabelCell width="w-40" className="border-l border-black border-r-0">Mobile No.</LabelCell>
                <ValueCell width="w-40" className="border-l border-black">{nominee2?.mobileNo || ''}</ValueCell>
              </div>
              <div className="flex border-b border-black h-[26px]">
                <ValueCell className="flex-1">{nominee2AddressLines[1] || ''}</ValueCell>
                <LabelCell width="w-40" className="border-l border-black border-r-0">Home Tel.</LabelCell>
                <ValueCell width="w-40" className="border-l border-black">{nominee2?.homeTelNo || ''}</ValueCell>
              </div>
              <div className="flex h-[26px]">
                <ValueCell className="flex-1">{nominee2AddressLines[2] || ''}</ValueCell>
                <LabelCell width="w-40" className="border-l border-black border-r-0">Office Tel.</LabelCell>
                <ValueCell width="w-40" className="border-l border-black">{nominee2?.officeTelNo || ''}</ValueCell>
              </div>
            </div>
          </div>
          <TableRow>
            <LabelCell width="w-32">E-mail</LabelCell>
            <ValueCell>{nominee2?.email || ''}</ValueCell>
            <LabelCell width="w-40" className="border-l border-black">Relationship to Applicant</LabelCell>
            <ValueCell width="w-40" className="border-l border-black">{nominee2?.relationship || ''}</ValueCell>
          </TableRow>
        </div>

        {/* Consent Text */}
        <div className="text-[10px] text-justify leading-relaxed mb-6">
          <p className="mb-2 italic">
            By submitting this form, I consent to any my personal data being collected, used or disclosed by the Order of Friars Minor (S) Ltd in
            accordance with its Personal Data Protection Policy statement which may be found at <span className="underline">www.franciscans.sg</span>.
            Additionally, where personal data of any third party is provided by you to OFMS you represent and warrant that:
          </p>
          <ul className="list-disc pl-10 mb-4 space-y-1">
            <li>you have the authority of that third party to disclose the said personal data to OFMS</li>
            <li>the third party is aware that his/her personal data is being disclosed to OFMS</li>
            <li>such personal data is true, current and accurate</li>
          </ul>
          <p className="italic">
            The Conditions and the Regulations attached form an integral part of this Agreement .
          </p>
        </div>

        {/* Signatures */}
        <div className="border border-black p-6 mt-8">
          <div className="grid grid-cols-2 gap-20">
            <div className="flex flex-col">
              <div className="flex-1 min-h-[60px]">
                <p className="text-[10.5px] font-bold">The Applicant/Nominee Personally :</p>
              </div>
              <div className="border-b border-black mb-4"></div>
              <div className="text-[10.5px] space-y-2">
                <div className="flex">
                  <span className="w-32">Name :</span>
                  <span className="font-bold">{applicant?.name || ''}</span>
                </div>
                <div className="flex">
                  <span className="w-32">Agreement Date :</span>
                  <span>{agreementDate}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex-1 min-h-[60px]">
                <p className="text-[10.5px] italic mb-1">For and on Behalf of</p>
                <p className="text-[10.5px] font-bold">The Order of Friars Minor (Singapore) Limited</p>
              </div>
              <div className="border-b border-black mb-4"></div>
              <div className="text-[10.5px] space-y-1">
                <p className="font-bold">Fr Justin Lim</p>
                <p className="italic">Friar - Manager</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
