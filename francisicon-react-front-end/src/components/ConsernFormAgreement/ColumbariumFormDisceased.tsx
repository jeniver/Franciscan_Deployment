import React, { useState } from 'react'

interface Beneficiary {
  name: string;
  relationship: string;
}

interface Nominee {
  name: string;
  nric: string;
}

interface FormData {
  date?: string;
  nicheNumber?: string;
  applicantName?: string;
  applicantNric?: string;
  beneficiaries: Beneficiary[];
  nominees: Nominee[];
}

export function ColumbariumFormDeceased({ formData }: { formData: FormData }) {
  const [showBothNominees, setShowBothNominees] = useState(false);

  // Default values if no formData is provided
  const defaultFormData: FormData = {
    date: '10-Feb-2026',
    nicheNumber: 'St Agnes 3795',
    applicantName: 'Gabriella Wong Lye Ying',
    applicantNric: 'S6811601E',
    beneficiaries: [
      { name: 'Monica Pang Oi Moi', relationship: 'NA' }
    ],
    nominees: [
      { name: 'Denis Yu Wen Hui', nric: 'S8524327F' },
      { name: 'Marcus Leong Jun Wen', nric: 'S9716600E' }
    ]
  };

  const data = formData || defaultFormData;

  // Toggle function for showing both nominees
  const toggleNomineeDetails = () => {
    setShowBothNominees(!showBothNominees);
  };

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white p-12 shadow-lg text-black font-serif text-sm leading-relaxed print:shadow-none print:p-0">
      {/* Date */}
      <div className="mb-8 pt-12">{data.date}</div>

      {/* Address Block */}
      <div className="mb-8">
        <p>The Order of Friars Minor (Singapore) Limited</p>
        <p>5 Bukit Batok East Ave 2</p>
        <p>Singapore 659918</p>
      </div>

      {/* Salutation */}
      <div className="mb-8">Dear Sir</div>

      {/* Subject */}
      <div className="mb-8 font-bold">
        AUTHORISATION & CONSENT FOR NICHE NO:{' '}
        <span className="ml-8">{data.nicheNumber}</span>
      </div>

      {/* Body Paragraph 1 */}
      <div className="mb-8 text-justify leading-loose">
        I/We,{' '}
        <span className="border-b border-black px-2 inline-block min-w-[150px] text-center">
          {data.nominees[0]?.name || 'Nominee 1 Name'}
        </span>
        , of NRIC No.{' '}
        <span className="border-b border-black px-2 inline-block min-w-[100px] text-center">
          {data.nominees[0]?.nric || 'NRIC 1'}
        </span>{' '}
        and{' '}
        <span className="border-b border-black px-2 inline-block min-w-[150px] text-center">
          {data.nominees[1]?.name || 'Nominee 2 Name'}
        </span>
        , of NRIC No.{' '}
        <span className="border-b border-black px-2 inline-block min-w-[100px] text-center">
          {data.nominees[1]?.nric || 'NRIC 2'}
        </span>{' '}
        ("Nominees"), agree that{' '}
        <span className="border-b border-black px-2 inline-block min-w-[150px] text-center">
          {data.applicantName || 'Applicant Name'}
        </span>
        , of NRIC No.{' '}
        <span className="border-b border-black px-2 inline-block min-w-[100px] text-center">
          {data.applicantNric || 'Applicant NRIC'}
        </span>{' '}
        ("Applicant"), may be the Applicant to a niche at the Franciscan
        Columbarium for the purpose of interment and storage of the ashes of the
        beneficiary/beneficiaries,
      </div>

      {/* Beneficiary Relationships */}
      <div className="mb-8 space-y-6">
        {/* Nominee 1 - Clickable area to show both nominees */}
        <div 
          className="grid grid-cols-[200px_1fr] gap-4 items-baseline cursor-pointer"
          onClick={toggleNomineeDetails}
        >
          <div className="border-b border-black text-center">
            {data.nominees[0]?.name || 'Nominee 1 Name'}
          </div>
          <div>'s relationship to beneficiary/beneficiaries</div>

          <div className="border-b border-black text-center">
            {data.beneficiaries[0]?.name || 'Beneficiary Name'}
          </div>
          <div>("Beneficiary 1") is my</div>

          <div className="border-b border-black text-center">
            {data.beneficiaries[0]?.relationship || 'Relationship'}
          </div>
          <div></div>
        </div>

        {/* Show second nominee details when clicked */}
        {showBothNominees && data.nominees.length > 1 && (
          <div className="grid grid-cols-[200px_1fr] gap-4 items-baseline">
            <div className="border-b border-black text-center">
              {data.nominees[1]?.name || 'Nominee 2 Name'}
            </div>
            <div>'s relationship to beneficiary/beneficiaries</div>

            <div className="border-b border-black text-center">
              {data.beneficiaries[0]?.name || 'Beneficiary Name'}
            </div>
            <div>("Beneficiary 1") is my</div>

            <div className="border-b border-black text-center">
              {data.beneficiaries[0]?.relationship || 'Relationship'}
            </div>
            <div></div>
          </div>
        )}
      </div>

      {/* Statement */}
      <div className="mb-4 text-justify">
        I/We believe that the beneficiary/beneficiaries will have no objections
        to being interred at the Franciscan Columbarium.
      </div>

      <div className="mb-6">Accordingly, I/we agree that:</div>

      {/* Agreement List */}
      <div className="mb-12 space-y-4 pl-4">
        <div className="flex gap-4">
          <span>(a)</span>
          <div className="text-justify">
            the Beneficiary upon his/her death, may be interred at the
            Franciscan Columbarium in accordance with its Condtions and
            Regulations;
          </div>
        </div>
        <div className="flex gap-4">
          <span>(b)</span>
          <div className="text-justify">
            the Applicant is fully authorised by us to make any decision
            regarding the interment and storage of the ashes of the Beneficiary,
            as well as the manner in which the niche will be used;
          </div>
        </div>
        <div className="flex gap-4">
          <span>(c)</span>
          <div className="text-justify">
            if the Applicant is deceased, incapaciated or untraceable as deemed
            by the columbarium management in its absolute discretion, the
            management shall have the right but not the obligation to deal with
            and take instructions from either nominee.
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-16 mb-16">
        <div>
          <div className="border-b border-black mb-2"></div>
          <div className="flex justify-between font-bold text-xs">
            <span>Nominee 1 Name:</span>
            <span>{data.nominees[0]?.name || 'Nominee 1 Name'}</span>
          </div>
        </div>
        <div>
          <div className="border-b border-black mb-2"></div>
          <div className="flex justify-between font-bold text-xs">
            <span>Nominee 2 Name:</span>
            <span>{data.nominees[1]?.name || 'Nominee 2 Name'}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center font-bold text-xs mt-12">
        [PLEASE TURN OVER FOR THE APPLICANT'S ACKNOWLEDGEMENT]
      </div>
    </div>
  )
}