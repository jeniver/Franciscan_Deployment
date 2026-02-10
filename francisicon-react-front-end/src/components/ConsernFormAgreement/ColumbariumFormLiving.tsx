import React from 'react'

interface BeneficiaryData {
  name: string
  nric: string
  relationship?: string
}

interface ColumbariumFormLivingProps {
  applicantName: string
  applicantNric: string
  chapelName: string
  nicheNumber: string
  beneficiary1: BeneficiaryData
  beneficiary2?: BeneficiaryData
}

// Helper component for filled fields (reused pattern)
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
    className={`inline-block border-b border-black px-1 font-medium ${className}`}
    style={{
      minWidth: width,
    }}
  >
    {children}
  </span>
)

export function ColumbariumFormLiving({
  applicantName,
  applicantNric,
  chapelName,
  nicheNumber,
  beneficiary1,
  beneficiary2
}: ColumbariumFormLivingProps) {
  return (
    <div className="min-h-screen bg-gray-800 py-12 px-4 flex flex-col items-center gap-8 font-serif text-gray-900">
      {/* SINGLE PAGE */}
      <div className="bg-white w-full max-w-[800px] shadow-2xl p-12 md:p-16 relative text-[15px] leading-relaxed min-h-[1123px]">
        {/* Stamp - LIVING Variant */}
        <div className="absolute top-32 right-16 transform -rotate-12 border-4 border-teal-600 text-teal-600 px-4 py-2 text-2xl font-bold italic opacity-80 tracking-widest uppercase pointer-events-none select-none">
          Living
        </div>

        {/* Date */}
        <div className="mb-8">
          <p>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</p>
        </div>

        {/* Address */}
        <div className="mb-8 max-w-sm">
          <p>The Order of Friars Minor (Singapore) Limited</p>
          <p>5 Bukit Batok East Ave 2</p>
          <p>Singapore 659918</p>
        </div>

        {/* Salutation */}
        <div className="mb-8">
          <p>Dear Sir</p>
        </div>

        {/* Title */}
        <div className="mb-8 flex gap-2 font-bold">
          <span>AUTHORISATION & CONSENT FOR NICHE NO:</span>
          <span>{chapelName} {nicheNumber}</span>
        </div>

        {/* SECTION 1: Authorization */}
        <div className="space-y-6 mb-12">
          <div className="text-justify leading-loose">
            I, <FilledField>{beneficiary1.name}</FilledField>, of NRIC No.{' '}
            <FilledField>{beneficiary1.nric}</FilledField> ("Beneficiary 1") and
            <br className="my-4 block" />
            I, <FilledField width="100px">{beneficiary2?.name || 'NA'}</FilledField>, of NRIC No.{' '}
            <FilledField width="100px">{beneficiary2?.nric || 'NA'}</FilledField> ("Beneficiary 2")
            confirm that I/we have authorised{' '}
            <FilledField>{applicantName}</FilledField>, of NRIC No.{' '}
            <FilledField>{applicantNric}</FilledField> to be the Applicant for a niche
            at the
            <br className="my-2 block" />
            Franciscan Columbarium on my behalf.
          </div>

          <div className="text-justify mt-8">
            It is my/our wish that my/our ashes be interred at a niche at the
            Franciscan Columbarium. I/We agree that the Order of Friars Minor
            (S) Ltd shall not be held responsible for any disputes that may
            arise from my/our decision.
          </div>
        </div>

        {/* Beneficiary Signatures */}
        <div className="flex justify-between items-end mt-16 mb-16 gap-8">
          <div className="flex-1">
            <div className="border-b border-black mb-2"></div>
            <div className="flex gap-2">
              <span className="font-bold text-sm">Beneficiary 1 Name:</span>
              <span className="text-sm">{beneficiary1.name}</span>
            </div>
          </div>
          <div className="flex-1 relative">
            <span className="absolute -top-6 left-0 text-sm">{beneficiary2?.name || 'NA'}</span>
            <div className="border-b border-black mb-2"></div>
            <div className="flex gap-2">
              <span className="font-bold text-sm">Beneficiary 2 Name:</span>
              <span className="text-sm">{beneficiary2?.name || 'NA'}</span>
            </div>
          </div>
        </div>

        {/* Divider Line */}
        <hr className="border-t-2 border-gray-300 my-12" />

        {/* SECTION 2: Applicant's Acknowledgement */}
        <div className="mb-16 text-justify leading-loose">
          I, <FilledField>{applicantName}</FilledField>, of NRIC No.{' '}
          <FilledField>{applicantNric}</FilledField> as the Applicant of a niche at
          the Franciscan Columbarium ("Columbarium") acting on the wishes of the
          Beneficiary/Beneficiaries, agrees and hereby instructs the Columbarium
          that if there is any request from an immediate family member of the
          Beneficiary, or any named Nominees, for the return of the
          Beneficiary's ashes, the Columbarium may disinter the urn containing
          the ashes and return the same to the requesting family member and/or
          Nominee. I agree that in this event, the Fee paid to the Columbarium
          will not be refunded to me, in part or in whole.
        </div>

        {/* Applicant Signature */}
        <div className="max-w-md mt-12">
          <div className="border-b border-black mb-2"></div>
          <div className="flex gap-2 items-baseline">
            <span className="font-bold text-sm">Applicant Name:</span>
            <span className="text-sm">{applicantName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
