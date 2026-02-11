import React from 'react'
import { PDF_ASSETS } from './../common/FranciscanLogo'

interface BeneficiaryData {
  name: string
  nric: string
  relationship?: string
}

interface ColumbariumFormData {
  applicantName: string
  applicantNric: string
  nominee1Name: string
  nominee1Nric: string
  nominee2Name?: string
  nominee2Nric?: string
  chapelName: string
  nicheNumber: string
  beneficiary1: BeneficiaryData
  beneficiary2?: BeneficiaryData
  formType?: string
}

interface ColumbariumFormLostCapacityProps {
  data?: ColumbariumFormData
}

// Helper components for standardized layout
const TableRow = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={'flex border-b border-black last:border-b-0 ' + className}>
    {children}
  </div>
)

const LabelCell = ({ children, width = 'w-32', className = '' }: { children: React.ReactNode; width?: string; className?: string }) => (
  <div className={width + ' border-r border-black p-1 pl-2 text-xs font-medium flex-shrink-0 ' + className}>
    {children}
  </div>
)

const ValueCell = ({ children, className = '', width = 'flex-1' }: { children: React.ReactNode; className?: string; width?: string }) => (
  <div className={width + ' p-1 pl-2 text-xs ' + className}>{children}</div>
)

const FilledField = ({
  children,
  width = 'auto',
  className = '',
}: {
  children: React.ReactNode
  width?: string
  className?: string
}) => (
  <span
    className={`inline-block border-b border-black px-1 font-bold ${className}`}
    style={{
      minWidth: width,
    }}
  >
    {children}
  </span>
)

export function ColumbariumFormLostCapacity({ data }: ColumbariumFormLostCapacityProps) {
  // Extract data with defaults
  const {
    applicantName = '',
    applicantNric = '',
    nominee1Name = '',
    nominee1Nric = '',
    nominee2Name = '',
    nominee2Nric = '',
    chapelName = '',
    nicheNumber = '',
    beneficiary1 = { name: '', nric: '', relationship: '' },
    beneficiary2 = null
  } = data || {}

  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')

  return (
    <div className="min-h-screen bg-gray-100 py-8 font-sans text-gray-900 print:bg-white print:py-0">
      {/* Page 1 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-10 mb-8 min-h-[297mm] print:shadow-none print:mb-0 print:p-12 relative overflow-hidden">
        {/* Stamp */}
        <div className="absolute top-40 right-16 rotate-[-15deg] border-4 border-amber-600 text-amber-600 px-6 py-2 text-3xl font-black opacity-30 tracking-[0.3em] uppercase pointer-events-none select-none z-0">
          Lost Capacity
        </div>

        {/* Header */}
        <header className="flex justify-between items-start mb-8">
          <div className="flex-1 text-center pt-2">
            <h1 className="text-2xl tracking-[0.2em] mb-1 uppercase font-serif">
              Franciscan Columbarium
            </h1>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-sm font-serif">❧</span>
              <span className="text-sm tracking-[0.1em] uppercase font-serif">
                Consent Form
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

        {/* Date and Address Section */}
        <div className="flex justify-between mb-8 text-xs">
          <div className="space-y-1">
            <p className="font-semibold">{dateStr}</p>
            <div className="mt-4 space-y-0.5">
              <p className="font-bold">The Order of Friars Minor (Singapore) Limited</p>
              <p>5 Bukit Batok East Ave 2</p>
              <p>Singapore 659918</p>
            </div>
          </div>
          <div className="text-right">
            <div className="border border-black p-2 bg-gray-50 inline-block min-w-[200px]">
              <p className="font-bold uppercase mb-1">Authorization & Consent</p>
              <p className="text-[10px] text-gray-600 font-medium">Niche No: {chapelName} {nicheNumber}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold">Dear Sir,</p>
        </div>

        {/* Title Block */}
        <div className="mb-8 border-b-2 border-black pb-1">
          <h2 className="text-sm font-bold uppercase tracking-wider">
            AUTHORISATION & CONSENT FOR NICHE NO: {chapelName} {nicheNumber}
          </h2>
        </div>

        {/* Body Paragraph 1 */}
        <div className="mb-8 text-[13px] leading-relaxed text-justify">
          I/We, <FilledField>{nominee1Name}</FilledField> (NRIC: <FilledField>{nominee1Nric}</FilledField>)
          {nominee2Name && nominee2Name !== 'NA' && (
            <> and <FilledField>{nominee2Name}</FilledField> (NRIC: <FilledField>{nominee2Nric}</FilledField>)</>
          )}
          {' '}("The Nominees"), hereby confirm and agree that <FilledField>{applicantName}</FilledField> (NRIC: <FilledField>{applicantNric}</FilledField>)
          ("The Applicant"), is authorized to be the Applicant for a niche at the Franciscan Columbarium
          for the purpose of interment and storage of the ashes of the beneficiary/beneficiaries listed below:
        </div>

        {/* Beneficiary Info Table */}
        <div className="border border-black mb-1">
          <TableRow>
            <LabelCell width="w-40">Name of Beneficiary</LabelCell>
            <ValueCell className="font-bold">{beneficiary1.name}</ValueCell>
            <LabelCell width="w-32" className="border-l border-black text-[10px]">Relationship to Nominee 1</LabelCell>
            <ValueCell width="w-36" className="border-l border-black font-medium">{beneficiary1.relationship || 'NA'}</ValueCell>
          </TableRow>
          {beneficiary2 && beneficiary2.name && (
            <TableRow>
              <LabelCell width="w-40">Name of Beneficiary (2)</LabelCell>
              <ValueCell className="font-bold">{beneficiary2.name}</ValueCell>
              <LabelCell width="w-32" className="border-l border-black text-[10px]">Relationship to Nominee 1</LabelCell>
              <ValueCell width="w-36" className="border-l border-black font-medium">{beneficiary2.relationship || 'NA'}</ValueCell>
            </TableRow>
          )}
        </div>
        <div className="text-[10px] italic text-gray-500 mb-6 px-2 text-center">
          ("The Beneficiary")
        </div>

        {/* New Paragraph for Lost Capacity */}
        <div className="mb-6 text-sm text-justify italic font-medium text-gray-700 bg-amber-50 p-3 rounded-r-lg border-l-4 border-amber-400">
          I/We believe that the beneficiary/beneficiaries will have no
          objections to being interred at the Franciscan Columbarium.
        </div>

        <div className="mb-4 text-xs font-semibold uppercase tracking-tight">Accordingly, I/we agree that:</div>

        {/* Clauses */}
        <div className="space-y-4 mb-12 pl-4 text-[13px] leading-relaxed">
          <div className="flex gap-4">
            <span className="font-bold">(a)</span>
            <p className="text-justify">
              the Beneficiary upon his/her death, may be interred at the
              Franciscan Columbarium in accordance with its Conditions and
              Regulations;
            </p>
          </div>
          <div className="flex gap-4">
            <span className="font-bold">(b)</span>
            <p className="text-justify">
              the Applicant is fully authorised by us to make any decision
              regarding the interment and storage of the ashes of the
              Beneficiary, as well as the manner in which the niche will be
              used;
            </p>
          </div>
          <div className="flex gap-4">
            <span className="font-bold">(c)</span>
            <p className="text-justify">
              if the Applicant is deceased, incapacitated or untraceable as
              deemed by the columbarium management in its absolute discretion,
              the management shall have the right but not the obligation to deal
              with and take instructions from either nominee.
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-16 pt-8">
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-6">
              <div>
                <div className="border-b border-black mb-1"></div>
                <p className="text-[10px] font-bold">Signature of Nominee 1</p>
                <p className="text-xs mt-1">Name: {nominee1Name}</p>
              </div>
            </div>
            <div className="space-y-6">
              {nominee2Name && nominee2Name !== 'NA' && (
                <div>
                  <div className="border-b border-black mb-1"></div>
                  <p className="text-[10px] font-bold">Signature of Nominee 2</p>
                  <p className="text-xs mt-1">Name: {nominee2Name}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] font-bold tracking-widest uppercase bg-gray-50 border border-dashed border-gray-300 py-2">
            [ Please turn over for the Applicant's Acknowledgement ]
          </p>
        </div>
      </div>

      {/* Page 2 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-10 min-h-[297mm] print:shadow-none print:p-12 relative flex flex-col justify-between">
        <div>
          <div className="mb-10 pb-4 border-b border-black">
            <h3 className="text-center font-bold uppercase tracking-widest text-sm">Applicant's Acknowledgement</h3>
          </div>

          <div className="mb-16 text-[14px] leading-loose text-justify">
            I, <FilledField>{applicantName}</FilledField> (NRIC: <FilledField>{applicantNric}</FilledField>),
            as the Applicant of a niche at the Franciscan Columbarium ("Columbarium") acting on the wishes of the
            Beneficiary, and the consent of the family members, agree and hereby
            instructs the Columbarium that if there is any request from any of the
            above-named Nominees or any immediate family member of Beneficiary for
            the return of the Beneficiary's ashes, the Columbarium may disinter
            the urn containing the ashes and return the same to the requesting
            Nominee and/or family member. I agree that in this event, the Fee paid
            to the Columbarium will not be refunded to me, in part or in whole.
          </div>

          <div className="max-w-md mt-20">
            <div className="border-b border-black mb-3"></div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase">Signature of Applicant</p>
              <div className="flex gap-2 text-sm mt-1">
                <span className="font-semibold">Name:</span>
                <span>{applicantName}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-20 flex justify-between text-[10px] text-gray-400 font-serif border-t border-gray-100">
          <span>Franciscan Columbarium - Consent Form (Lost Capacity)</span>
          <span>Niche: {chapelName} {nicheNumber}</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    </div>
  )
}
