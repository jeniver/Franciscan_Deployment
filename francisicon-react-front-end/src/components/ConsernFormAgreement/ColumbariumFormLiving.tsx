import React from 'react'
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

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

interface ColumbariumFormLivingProps {
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
    className={`inline-block border-b border-gray-400 px-2 font-normal mx-1 ${className}`}
    style={{
      minWidth: width,
    }}
  >
    {children}
  </span>
)

export function ColumbariumFormLiving({ data }: ColumbariumFormLivingProps) {
  // Use passed data if available, otherwise fall back to Redux store
  const agreementModalData = useSelector((state: RootState) => state.application.agreementModalData);

  // Extract data from passed props or Redux state
  const formData = data || agreementModalData;

  const {
    applicantName = '',
    applicantNric = '',
    nominee1Name = '',
    nominee1Nric = '',
    nominee2Name = '',
    nominee2Nric = '',
    chapelName = '',
    nicheNumber = '',
    beneficiary1 = { name: '', nric: '' },
    beneficiary2 = null
  } = formData || {};

  // Extract beneficiary data
  const beneficiary1Name = beneficiary1.name || '';
  const beneficiary1Nric = beneficiary1.nric || '';
  const beneficiary2Name = (beneficiary2 && beneficiary2.name && beneficiary2.name !== 'NA' && beneficiary2.name !== '') ? beneficiary2.name : 'NA';
  const beneficiary2Nric = (beneficiary2 && (beneficiary2.nric || beneficiary2.nric) !== 'NA' && (beneficiary2.nric || beneficiary2.nric) !== '') ? (beneficiary2.nric || beneficiary2.nric) : 'NA';

  // Use nominee data from props if available, otherwise from Redux
  const finalApplicantName = applicantName || (formData?.applicant?.name || formData?.nominee?.name || '');
  const finalApplicantNric = applicantNric || (formData?.applicant?.idNo || formData?.nominee?.idNo || '');

  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')

  return (
    <div className="min-h-screen bg-gray-100 py-8 font-sans text-gray-900 print:bg-white print:py-0">
      <div data-pdf-page className="max-w-[210mm] mx-auto bg-white shadow-lg p-16 mb-8 min-h-[297mm] print:shadow-none print:mb-0 print:p-16 relative">
        <>{console.log("gggggggggggggggggggg", data)}</>
        {/* Date Row */}
        <div className="mb-6">
          <p className="text-sm">{dateStr}</p>
        </div>

        {/* Company Address Row */}
        <div className="mb-8 space-y-0.5 text-sm">
          <p>The Order of Friars Minor (Singapore) Limited</p>
          <p>5 Bukit Batok East Ave 2</p>
          <p>Singapore 659918</p>
        </div>

        {/* Salutation */}
        <div className="mb-8 font-normal text-sm">
          <p>Dear Sir</p>
        </div>

        {/* Title Block */}
        <div className="mb-8 font-bold text-sm uppercase">
          AUTHORISATION & CONSENT FOR NICHE NO: <span className="ml-8 uppercase">{chapelName} {nicheNumber}</span>
        </div>

        {/* Section 1 Paragraph */}
        <div className="mb-10 text-[14px] leading-[2.2] font-normal">
          <div className="flex flex-wrap items-baseline">
            <span>I,</span>
            <FilledField width="200px">{beneficiary1Name}</FilledField>
            <span>, of NRIC No.</span>
            <FilledField width="130px" className="text-center">{beneficiary1Nric}</FilledField>
            <span>("Beneficiary 1") and</span>
          </div>

          <div className="flex flex-wrap items-baseline mt-1">
            <span>I,</span>
            <FilledField width="200px">{beneficiary2Name}</FilledField>
            <span>, of NRIC No.</span>
            <FilledField width="130px" className="text-center">{beneficiary2Nric}</FilledField>
            <span>("Beneficiary 2") confirm that I/we have authorised</span>
          </div>

          <div className="flex flex-wrap items-baseline mt-1">
            <FilledField width="250px">{finalApplicantName}</FilledField>
            <span>, of NRIC No.</span>
            <FilledField width="130px" className="text-center">{finalApplicantNric}</FilledField>
            <span>to be the Applicant for a niche at the</span>
          </div>

          <div className="mt-1">
            Franciscan Columbarium on my behalf.
          </div>
        </div>

        {/* Wish Section */}
        <div className="mb-12 text-[14px] leading-[2.2] font-normal">
          <p>It is my/our wish that my/our ashes be interred at a niche at the Franciscan Columbarium. I/We agree that</p>
          <p>the Order of Friars Minor (S) Ltd shall not be held responsible for any disputes that may arise from my/our</p>
          <p>decision.</p>
        </div>

        {/* Beneficiary Signature Section */}
        <div className="grid grid-cols-2 gap-12 mt-20 mb-16">
          <div>
            <div className="w-full border-b border-gray-400 mb-2 h-8"></div>
            <div className="flex gap-4 text-[13px] items-center">
              <span className="font-bold whitespace-nowrap">Beneficiary 1 Name:</span>
              <span>{beneficiary1Name}</span>
            </div>
          </div>
          <div>
            <div className="w-full border-b border-gray-400 mb-2 h-8 relative">
              {beneficiary2Name === 'NA' && <span className="absolute -top-6 left-1/2 transform -translate-x-1/2">{beneficiary2Name}</span>}
            </div>
            <div className="flex gap-4 text-[13px] items-center">
              <span className="font-bold whitespace-nowrap">Beneficiary 2 Name:</span>
              <span>{beneficiary2Name}</span>
            </div>
          </div>
        </div>

        {/* Page Divider */}
        <div className="border-t border-gray-300 my-10 w-full"></div>

        {/* Applicant Acknowledgement Section */}
        <div className="mb-12 text-[14px] leading-[2] font-normal">
          <div className="flex flex-wrap items-baseline">
            <span>I,</span>
            <FilledField width="250px">{finalApplicantName}</FilledField>
            <span>, of NRIC No.</span>
            <FilledField width="130px" className="text-center">{finalApplicantNric}</FilledField>
            <span>as the Applicant of a niche at</span>
          </div>
          <p className="mt-2 text-justify">
            the Franciscan Columbarium ("Columbarium") acting on the wishes of the Beneficiary/Beneficiaries, agrees
          </p>
          <p className="mt-2 text-justify">
            and hereby instructs the Columbarium that if there is any request from an immediate family member of the
          </p>
          <p className="mt-2 text-justify">
            Beneficiary, or any named Nominees, for the return of the Beneficiary's ashes, the Columbarium may
          </p>
          <p className="mt-2 text-justify">
            disinter the urn containing the ashes and return the same to the requesting family member and/or Nominee.
          </p>
          <p className="mt-2 text-justify">
            I agree that in this event, the Fee paid to the Columbarium will not be refunded to me, in part or in whole.
          </p>
        </div>

        {/* Applicant Signature Section */}
        <div className="mt-16">
          <div className="w-[300px] border-b border-gray-400 mb-2 h-8"></div>
          <div className="flex gap-4 text-[13px] items-center">
            <span className="font-bold">Applicant Name:</span>
            <span>{finalApplicantName}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
