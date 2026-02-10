import React from 'react'
// Helper component for filled fields
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
export function ColumbariumFormDisceased() {
  return (
    <div className="min-h-screen bg-gray-800 py-12 px-4 flex flex-col items-center gap-8 font-serif text-gray-900">
      {/* PAGE 1 */}
      <div className="bg-white w-full max-w-[800px] shadow-2xl p-12 md:p-16 relative text-[15px] leading-relaxed">
        {/* Stamp */}
        <div className="absolute top-32 right-16 transform -rotate-12 border-4 border-teal-600 text-teal-600 px-4 py-1 text-xl font-bold opacity-80 tracking-widest uppercase pointer-events-none select-none">
          Deceased
        </div>

        {/* Date */}
        <div className="mb-8">
          <p>09-Feb-2026</p>
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
          <span>St Agnes 3736</span>
        </div>

        {/* Body Paragraph 1 */}
        <div className="mb-6 text-justify">
          I/We, <FilledField>Geremy Wong Jun Wai</FilledField>, of NRIC No.{' '}
          <FilledField>T0505805D</FilledField> and{' '}
          <FilledField width="50px">NA</FilledField>, of NRIC No.{' '}
          <FilledField width="50px">NA</FilledField> ("Nominees"), agree that{' '}
          <FilledField>Nicholas Wong Hoong Yang</FilledField>, of NRIC No.{' '}
          <FilledField>S7012110G</FilledField> ("Applicant"), may be the
          Applicant to a niche at the Franciscan Columbarium for the purpose of
          interment and storage of the ashes of the deceased,
        </div>

        {/* Relationship Section */}
        <div className="mb-8 ml-8 space-y-2">
          <div className="flex items-end gap-2">
            <FilledField className="min-w-[200px]">
              Geremy Wong Jun Wai
            </FilledField>
            <span>'s relationship to beneficiary/beneficiaries</span>
          </div>
          <div className="flex items-end gap-2">
            <span>Augustine Wong Chuan S("Beneficiary 1") is my</span>
            <FilledField className="min-w-[100px]">Grandfather</FilledField>
          </div>
          <div>
            <FilledField width="100px">NA</FilledField>
          </div>
          <div>
            <FilledField width="100px">NA</FilledField>
          </div>
        </div>

        {/* Agreement Intro */}
        <div className="mb-4">and I/we agree that:</div>

        {/* Clauses */}
        <div className="space-y-4 mb-16 pl-4">
          <div className="flex gap-4">
            <span>(a)</span>
            <p className="text-justify">
              the Beneficiary may be interred at the Franciscan Columbarium in
              accordance with its Conditions and Regulations
            </p>
          </div>
          <div className="flex gap-4">
            <span>(b)</span>
            <p className="text-justify">
              the Applicant is fully authorised by us to make any decision
              regarding the interment and storage of the ashes of the
              Beneficiary, as well as the manner in which the niche will be
              used;
            </p>
          </div>
          <div className="flex gap-4">
            <span>(c)</span>
            <p className="text-justify">
              if the Applicant is deceased, incapacitated or untraceable as
              deemed by the columbarium management in its absolute discretion,
              the management shall have the right but not the obligation to deal
              with and take instructions from any one Nominee.
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end mt-20 gap-8">
          <div className="flex-1">
            <div className="border-b border-black mb-2"></div>
            <div className="flex gap-2">
              <span className="font-bold text-sm">Nominee Name:</span>
              <span className="text-sm">Geremy Wong Jun Wai</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="border-b border-black mb-2"></div>
            <div className="flex gap-2">
              <span className="font-bold text-sm">Nominee Name:</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center font-bold text-sm">
          [PLEASE TURN OVER FOR THE APPLICANT'S ACKNOWLEDGEMENT]
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white w-full max-w-[800px] shadow-2xl p-12 md:p-16 relative text-[15px] leading-relaxed min-h-[600px]">
        {/* Body Paragraph */}
        <div className="mb-24 text-justify leading-loose">
          I, <FilledField>Nicholas Wong Hoong Yang</FilledField>, of NRIC No.{' '}
          <FilledField>S7012110G</FilledField>, as the Applicant of a niche at
          the Franciscan Columbarium ("Columbarium") acting on the wishes of the
          Beneficiary, agrees and hereby instructs the Columbarium that if there
          is any request from any of the above-named Nominees, or any immediate
          family member of Beneficiary for the return of the Beneficiary's
          ashes, the Columbarium may disinter the urn containing the ashes and
          return the same to the requesting Nominee and/or family member. I
          agree that in this event, the Fee paid to the Columbarium will not be
          refunded to me, in part or in whole.
        </div>

        {/* Signature */}
        <div className="max-w-md">
          <div className="border-b border-black mb-2"></div>
          <div className="flex gap-2 items-baseline">
            <span className="font-bold text-sm">Applicant Name:</span>
            <span className="text-sm">Nicholas Wong Hoong Yang</span>
          </div>
        </div>
      </div>
    </div>
  )
}
