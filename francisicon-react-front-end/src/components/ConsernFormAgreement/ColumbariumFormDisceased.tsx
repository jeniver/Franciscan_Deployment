import React from 'react'
import { PDF_ASSETS } from './../common/FranciscanLogo'

interface BeneficiaryData {
  name: string
  nric: string
  relationshipToNominee1?: string
  relationshipToNominee2?: string
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
  beneficiaries?: BeneficiaryData[]
}

interface ColumbariumFormDisceasedProps {
  data?: ColumbariumFormData
}

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

export function ColumbariumFormDisceased({ data }: ColumbariumFormDisceasedProps) {
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
    beneficiaries = []
  } = data || {}

  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')

  return (
    <div className="min-h-screen bg-gray-100 py-8 font-sans text-[11pt] text-gray-900 print:bg-white print:py-0">
      {/* Page 1 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-[1.5in] mb-8 min-h-[297mm] print:shadow-none print:mb-0 relative overflow-hidden flex flex-col">
        {/* Date and Office Info */}
        <div className="mb-10">
          <p className="mb-6">{dateStr}</p>
          <div className="space-y-0.5">
            <p>The Order of Friars Minor (Singapore) Limited</p>
            <p>5 Bukit Batok East Ave 2</p>
            <p>Singapore 659918</p>
          </div>
          <p className="mt-8">Dear Sir</p>
        </div>

        {/* Title Block */}
        <div className="mb-8 font-bold">
          AUTHORISATION & CONSENT FOR NICHE NO: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {chapelName} {nicheNumber}
        </div>

        {/* Body Paragraph 1 */}
        <div className="mb-8 leading-relaxed">
          I/We, <FilledField width="130px">{nominee1Name}</FilledField>, of NRIC No. <FilledField width="80px">{nominee1Nric}</FilledField>
          {nominee2Name && nominee2Name !== 'NA' && (
            <> and <FilledField width="130px">{nominee2Name}</FilledField>, of NRIC No. <FilledField width="80px">{nominee2Nric}</FilledField></>
          )}
          {" "}("Nominees"), agree that <FilledField width="160px">{applicantName}</FilledField>, of NRIC No. <FilledField width="80px">{applicantNric}</FilledField> ("Applicant"),
          may be the Applicant to a niche at the Franciscan Columbarium for the purpose of interment and storage of
          the ashes of the beneficiary/beneficiaries.
        </div>

        {/* Relationships Section */}
        <div className="space-y-8 mb-10">
          <div>
            <div className="flex items-end">
              <span className="min-w-[150px] border-b border-black font-bold text-center px-2">{nominee1Name}</span>
              <span className="ml-1">'s relationship to beneficiary/beneficiaries</span>
            </div>
            <div className="mt-1 flex flex-col gap-1">
              {beneficiaries.map((b, idx) => (
                <div key={idx} className="flex items-end pl-4">
                  <span className="min-w-[130px] border-b border-black text-center px-1">{b.name}</span>
                  <span className="mx-2">("Beneficiary {idx + 1}") is my</span>
                  <span className="min-w-[100px] border-b border-black font-bold text-center px-1">{b.relationshipToNominee1 || 'NA'}</span>
                </div>
              ))}
              {beneficiaries.length === 0 && <p className="italic text-gray-400">No beneficiaries listed</p>}
            </div>
          </div>

          {nominee2Name && nominee2Name !== 'NA' && (
            <div>
              <div className="flex items-end">
                <span className="min-w-[150px] border-b border-black font-bold text-center px-2">{nominee2Name}</span>
                <span className="ml-1">'s relationship to beneficiary/beneficiaries</span>
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {beneficiaries.map((b, idx) => (
                  <div key={idx} className="flex items-end pl-4">
                    <span className="min-w-[130px] border-b border-black text-center px-1">{b.name}</span>
                    <span className="mx-2">("Beneficiary {idx + 1}") is my</span>
                    <span className="min-w-[100px] border-b border-black font-bold text-center px-1">{b.relationshipToNominee2 || 'NA'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* OBJECTION TEXT */}
        <div className="mb-6 text-[13px]">
          I/We believe that the beneficiary/beneficiaries will have no objections to being interred at the Franciscan
          Columbarium.
        </div>

        <div className="mb-4">Accordingly, I/we agree that:</div>

        {/* Clauses */}
        <div className="space-y-4 mb-auto pl-6 leading-relaxed">
          <div className="flex gap-2">
            <span className="w-8 font-bold">(a)</span>
            <p className="flex-1">
              the Beneficiary upon his/her death, may be interred at the Franciscan Columbarium in accordance
              with its Conditions and Regulations;
            </p>
          </div>
          <div className="flex gap-2">
            <span className="w-8 font-bold">(b)</span>
            <p className="flex-1">
              the Applicant is fully authorised by us to make any decision regarding the interment and storage of
              the ashes of the Beneficiary, as well as the manner in which the niche will be used;
            </p>
          </div>
          <div className="flex gap-2">
            <span className="w-8 font-bold">(c)</span>
            <p className="flex-1 text-justify">
              if the Applicant is deceased, incapacitated or untraceable as deemed by the columbarium
              management in its absolute discretion, the management shall have the right but not the obligation to
              deal with and take instructions from either nominee.
            </p>
          </div>
        </div>

        {/* Signatures Page 1 */}
        <div className="mt-12 flex justify-between items-baseline gap-10">
          <div className="flex flex-1 items-baseline">
            <span className="font-bold whitespace-nowrap">Nominee 1 Name:</span>
            <span className="ml-2 flex-1 border-b border-black font-bold px-2">{nominee1Name}</span>
          </div>
          {nominee2Name && nominee2Name !== 'NA' && (
            <div className="flex flex-1 items-baseline">
              <span className="font-bold whitespace-nowrap">Nominee 2 Name:</span>
              <span className="ml-2 flex-1 border-b border-black font-bold px-2">{nominee2Name}</span>
            </div>
          )}
        </div>

        <div className="mt-8 text-center font-bold uppercase tracking-wider text-[11px]">
          [PLEASE TURN OVER FOR THE APPLICANT'S ACKNOWLEDGEMENT]
        </div>
      </div>

      {/* Page 2 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-[1.5in] min-h-[297mm] print:shadow-none relative flex flex-col">
        <div className="mb-12 leading-loose text-justify text-[14px]">
          I, <FilledField width="160px">{applicantName}</FilledField>, of NRIC No. <FilledField width="100px">{applicantNric}</FilledField> as the Applicant of a niche at the
          Franciscan Columbarium ("Columbarium") acting on the wishes of the Beneficiary, and the consent of the
          family members, agree and hereby instructs the Columbarium that if there is any request from any of the
          above-named Nominees or any immediate family member of Beneficiary for the return of the Beneficiary's
          ashes, the Columbarium may disinter the urn containing the ashes and return the same to the requesting
          Nominee and/or family member. I agree that in this event, the Fee paid to the Columbarium will not be
          refunded to me, in part or in whole.
        </div>

        <div className="mt-4 flex items-baseline">
          <p className="font-bold whitespace-nowrap">Applicant Name:</p>
          <span className="ml-2 border-b border-black font-bold px-2 inline-block min-w-[200px]">{applicantName}</span>
        </div>
      </div>
    </div>
  )
}
