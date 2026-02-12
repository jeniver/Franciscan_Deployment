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
    className={`inline-block border-b border-black px-1 ${className}`}
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

  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-100 py-8 font-sans text-black print:bg-white print:py-0">
      {/* Page 1 */}
      <div data-pdf-page className="max-w-[210mm] mx-auto bg-white shadow-lg p-[1in] mb-8 min-h-[297mm] print:shadow-none print:mb-0 relative overflow-hidden flex flex-col text-[11pt] leading-relaxed">
        {/* Date */}
        <div className="mb-6">
          <p className="text-[11pt]">{dateStr}</p>
        </div>

        {/* Address Block */}
        <div className="mb-6 text-[11pt]">
          <p>The Order of Friars Minor (Singapore) Limited</p>
          <p>5 Bukit Batok East Ave 2</p>
          <p>Singapore 659918</p>
        </div>

        <div className="mb-6">
          <p className="text-[11pt]">Dear Sir</p>
        </div>

        {/* Title */}
        <div className="mb-6 font-bold text-[11pt]">
          <p>AUTHORISATION & CONSENT FOR NICHE NO: {chapelName} {nicheNumber}</p>
        </div>

        {/* Main Body - First Paragraph */}
        <div className="mb-4 text-[11pt] leading-relaxed">
          <p className="mb-0">
            I/We, <FilledField width="150px">{nominee1Name}</FilledField>, of NRIC No. <FilledField width="120px">{nominee1Nric}</FilledField> and <FilledField width="150px">{nominee2Name || ''}</FilledField>, of NRIC No.
          </p>
          <p className="mb-0">
            <FilledField width="120px">{nominee2Nric || ''}</FilledField> ("Nominees"), agree that <FilledField width="180px">{applicantName}</FilledField>, of NRIC No. <FilledField width="120px">{applicantNric}</FilledField> ("Applicant"),
          </p>
          <p className="mb-0">
            may be the Applicant to a niche at the Franciscan Columbarium for the purpose of interment and storage of
          </p>
          <p>the ashes of the beneficiary/beneficiaries,</p>
        </div>

        {/* Nominee 1 Relationships */}
        <div className="mb-4 text-[11pt] ml-12">
          <p className="mb-2">
            <FilledField width="180px">{nominee1Name}</FilledField> 's relationship to beneficiary/beneficiaries
          </p>
          {beneficiaries.map((b, idx) => (
            <div key={idx} className="mb-1">
              <p className="mb-0">
                {b.name} ("Beneficiary {idx + 1}") is my
              </p>
              <p>{b.relationshipToNominee1 || 'NA'}</p>
            </div>
          ))}
          {beneficiaries.length === 0 && (
            <>
              <p className="mb-0">Monica Pang Oi Moi ("Beneficiary 1") is my</p>
              <p>NA</p>
            </>
          )}
        </div>

        {/* Nominee 2 Relationships */}
        <div className="mb-4 text-[11pt] ml-12">
          <p className="mb-2">
            <FilledField width="180px">{nominee2Name || ''}</FilledField> 's relationship to beneficiary/beneficiaries
          </p>
          {beneficiaries.map((b, idx) => (
            <div key={idx} className="mb-1">
              <p className="mb-0">
                {b.name} ("Beneficiary {idx + 1}") is my
              </p>
              <p>{b.relationshipToNominee2 || 'NA'}</p>
            </div>
          ))}
          {beneficiaries.length === 0 && (
            <>
              <p className="mb-0">Monica Pang Oi Moi ("Beneficiary 1") is my</p>
              <p>NA</p>
            </>
          )}
        </div>

        {/* Consent Statement */}
        <div className="mb-4 text-[11pt]">
          <p>I/We believe that the beneficiary/beneficiaries will have no objections to being interred at the Franciscan Columbarium.</p>
        </div>

        <div className="mb-4 text-[11pt]">
          <p>Accordingly, I/we agree that:</p>
        </div>

        {/* Clauses */}
        <div className="mb-6 text-[11pt] leading-relaxed ml-12">
          <div className="mb-4">
            <p className="mb-1">
              (a) the Beneficiary upon his/her death, may be interred at the Franciscan Columbarium in accordance with its Conditions and Regulations;
            </p>
          </div>

          <div className="mb-4">
            <p className="mb-1">
              (b) the Applicant is fully authorised by us to make any decision regarding the interment and storage of the ashes of the Beneficiary, as well as the manner in which the niche will be used;
            </p>
          </div>

          <div className="mb-4">
            <p className="mb-1">
              (c) if the Applicant is deceased, incapacitated or untraceable as deemed by the columbarium management in its absolute discretion, the management shall have the right but not the obligation to deal with and take instructions from either nominee.
            </p>
          </div>
        </div>

        {/* Signature Lines */}
        <div className="mt-auto mb-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-black pb-1 mb-1">
                <span className="text-[11pt]">Nominee 1 Name: {nominee1Name}</span>
              </div>
            </div>
            <div>
              <div className="border-b border-black pb-1 mb-1">
                <span className="text-[11pt]">Nominee 2 Name: {nominee2Name || ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center font-bold text-[11pt] mt-8">
          <p>[PLEASE TURN OVER FOR THE APPLICANT'S ACKNOWLEDGEMENT]</p>
        </div>
      </div>

      {/* Page 2 */}
      <div data-pdf-page className="max-w-[210mm] mx-auto bg-white shadow-lg p-[1in] min-h-[297mm] print:shadow-none relative flex flex-col text-[11pt] leading-relaxed">
        <div className="mb-8">
          <p className="mb-0">
            I, <FilledField width="180px">{applicantName}</FilledField>, of NRIC No. <FilledField width="120px">{applicantNric}</FilledField> as the Applicant of a niche at the
          </p>
          <p className="mb-0">
            Franciscan Columbarium ("Columbarium") acting on the wishes of the Beneficiary, and the consent of the
          </p>
          <p className="mb-0">
            family members, agree and hereby instructs the Columbarium that if there is any request from any of the
          </p>
          <p className="mb-0">
            above-named Nominees or any immediate family member of Beneficiary for the return of the Beneficiary's
          </p>
          <p className="mb-0">
            ashes, the Columbarium may disinter the urn containing the ashes and return the same to the requesting
          </p>
          <p className="mb-0">
            Nominee and/or family member. I agree that in this event, the Fee paid to the Columbarium will not be
          </p>
          <p>refunded to me, in part or in whole.</p>
        </div>

        {/* Applicant Signature */}
        <div className="mt-16">
          <div className="border-b border-black pb-1 mb-1 inline-block min-w-[300px]">
            <span className="text-[11pt]">Applicant Name: {applicantName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}