import React from 'react'
import { PDF_ASSETS, AGREEMENT_DEFAULTS } from './common/FranciscanLogo'
interface PersonDetails {
  name: string
  address: string
  email: string
  nricPassport: string
  mobileNo: string
  homeTel: string
  officeTel: string
  catholic?: 'Yes' | 'No'
  relationshipToApplicant?: string
}
interface NomineeAgreementProps {
  nicheNo?: string
  chapelName?: string
  applicant?: PersonDetails
  nominee?: PersonDetails
  agreementDate?: string
  friarName?: string
  friarTitle?: string
}
export function NomineeAgreement({
  nicheNo = 'S786-1',
  chapelName = 'St Agnes',
  applicant = {
    name: 'Gabriella Wong Lye Ying',
    address: 'Blk 343 Choa Chu Kang Loop\n#06-43\nSingapore 680343',
    email: 'gabby.wong88@gmail.com',
    nricPassport: 'S6811601E',
    mobileNo: '9650-4551',
    homeTel: '',
    officeTel: '',
    catholic: 'Yes',
  },
  nominee = {
    name: 'Marcus Leong Jun Wen',
    address: 'Blk 343 Choa Chu Kang Loop\n#06-43\nSingapore, 680343',
    email: 'marcusgerard97@gmail.com',
    nricPassport: 'S9716600E',
    mobileNo: '8977-4876',
    homeTel: '',
    officeTel: '',
    relationshipToApplicant: 'Son',
  },
  agreementDate = '02-Feb-2026',
  friarName = 'Fr Justin Lim',
  friarTitle = 'Friar - Manager',
}: NomineeAgreementProps) {
  return (
    <div className="w-full max-w-[800px] bg-white p-8 md:p-10 mx-auto text-black font-serif text-sm leading-relaxed">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <h1 className="text-2xl tracking-[0.3em] font-normal mb-1">
            FRANCISCAN COLUMBARIUM
          </h1>
          <div className="flex items-center gap-2 text-lg">
            <span className="text-xl">☙</span>
            <span className="font-bold tracking-wider">AGREEMENT</span>
          </div>
        </div>
        <img
          src={PDF_ASSETS.headerImageUrl}
          alt="Franciscan Logo"
          className="w-20 h-16 object-contain"
        />
      </div>

      {/* Title */}
      <h2 className="font-bold text-base mb-4 underline decoration-1 underline-offset-2">
        INSERTION OF 2ND NOMINEE
      </h2>

      {/* Between Section */}
      <div className="mb-4">
        <div className="flex gap-2 mb-2">
          <span className="font-bold w-16">Between</span>
          <span>:</span>
        </div>
        <p className="ml-0 text-xs leading-relaxed">
          {AGREEMENT_DEFAULTS.orderName}, a company limited by guarantee of{' '}
          {AGREEMENT_DEFAULTS.orderAddress} ("The Order").
        </p>
        <p className="text-xs mt-1">
          Telephone : {AGREEMENT_DEFAULTS.orderTel}, &nbsp;&nbsp;&nbsp; Fax :
          6566-2852, &nbsp;&nbsp;&nbsp; E-mail : {AGREEMENT_DEFAULTS.orderEmail}
        </p>
      </div>

      {/* And Section */}
      <div className="mb-4">
        <div className="flex gap-2 mb-2">
          <span className="font-bold w-16">And</span>
          <span>:</span>
        </div>
        <div className="flex justify-end mb-2">
          <div className="flex gap-4 text-xs">
            <span>Niche No:</span>
            <span className="font-bold underline">{nicheNo}</span>
          </div>
        </div>
      </div>

      {/* Applicant Table */}
      <table className="w-full border-collapse border border-black text-xs mb-2">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1.5 w-16 font-medium">
              Name
            </td>
            <td className="border border-black px-2 py-1.5 w-40">
              {applicant.name}
            </td>
            <td className="border border-black px-2 py-1.5 w-28 font-medium">
              NRIC/Passport No.
            </td>
            <td className="border border-black px-2 py-1.5">
              {applicant.nricPassport}
            </td>
          </tr>
          <tr>
            <td
              className="border border-black px-2 py-1.5 font-medium"
              rowSpan={3}
            >
              Address
            </td>
            <td
              className="border border-black px-2 py-1.5 whitespace-pre-line"
              rowSpan={3}
            >
              {applicant.address}
            </td>
            <td className="border border-black px-2 py-1.5 font-medium">
              Mobile No.
            </td>
            <td className="border border-black px-2 py-1.5">
              {applicant.mobileNo}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 font-medium">
              Home Tel.
            </td>
            <td className="border border-black px-2 py-1.5">
              {applicant.homeTel}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 font-medium">
              Office Tel.
            </td>
            <td className="border border-black px-2 py-1.5">
              {applicant.officeTel}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 font-medium">
              E-mail
            </td>
            <td className="border border-black px-2 py-1.5">
              {applicant.email}
            </td>
            <td className="border border-black px-2 py-1.5 font-medium">
              Catholic
            </td>
            <td className="border border-black px-2 py-1.5">
              {applicant.catholic}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs mb-6">("The Applicant/ Nominee")</p>

      {/* Insertion/Change Section */}
      <h3 className="font-bold text-sm mb-3 underline decoration-1 underline-offset-2">
        INSERTION/CHANGE OF NOMINEE DETAILS
      </h3>

      <div className="flex gap-8 mb-3 text-xs">
        <div className="flex gap-2">
          <span>In the Chapel of</span>
          <span className="border-b border-black px-4 font-medium">
            {chapelName}
          </span>
        </div>
        <div className="flex gap-2">
          <span>Niche No</span>
          <span className="border-b border-black px-4 font-medium">
            {nicheNo.split('-')[0]}
          </span>
        </div>
      </div>

      <p className="text-xs mb-3">
        The Applicant's 2nd nominee for contact purposes ("Nominee") is :
      </p>

      {/* Nominee Table */}
      <table className="w-full border-collapse border border-black text-xs mb-6">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1.5 w-16 font-medium">
              Name
            </td>
            <td className="border border-black px-2 py-1.5 w-40">
              {nominee.name}
            </td>
            <td className="border border-black px-2 py-1.5 w-28 font-medium">
              NRIC/Passport No.
            </td>
            <td className="border border-black px-2 py-1.5">
              {nominee.nricPassport}
            </td>
          </tr>
          <tr>
            <td
              className="border border-black px-2 py-1.5 font-medium"
              rowSpan={3}
            >
              Address
            </td>
            <td
              className="border border-black px-2 py-1.5 whitespace-pre-line"
              rowSpan={3}
            >
              {nominee.address}
            </td>
            <td className="border border-black px-2 py-1.5 font-medium">
              Mobile No.
            </td>
            <td className="border border-black px-2 py-1.5">
              {nominee.mobileNo}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 font-medium">
              Home Tel.
            </td>
            <td className="border border-black px-2 py-1.5">
              {nominee.homeTel}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 font-medium">
              Office Tel.
            </td>
            <td className="border border-black px-2 py-1.5">
              {nominee.officeTel}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 font-medium">
              E-mail
            </td>
            <td className="border border-black px-2 py-1.5">{nominee.email}</td>
            <td className="border border-black px-2 py-1.5 font-medium">
              Relationship to Applicant
            </td>
            <td className="border border-black px-2 py-1.5">
              {nominee.relationshipToApplicant}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Legal Text */}
      <div className="text-[10px] leading-relaxed mb-4">
        <p className="mb-3">
          By submitting this form, I consent to any my personal data being
          collected, used or disclosed by the Order of Friars Minor (S) Ltd in
          accordance with its Personal Data Protection Policy statement which
          may be found at
          <span className="underline ml-1">www.franciscans.sg</span>.
          Additionally, where personal data of any third party is provided by
          you to OFM9 you represent and warrant that:
        </p>
        <ul className="list-disc ml-6 space-y-1">
          <li>
            you have the authority of that third party to disclose the said
            personal data to OFM9
          </li>
          <li>
            the third party is aware that his/her personal data is being
            disclosed to OFM9
          </li>
          <li>such personal data is true, current and accurate</li>
        </ul>
      </div>

      <p className="text-[10px] mb-8">
        The Conditions and the Regulations attached form an integral part of
        this Agreement.
      </p>

      {/* Signature Section */}
      <div className="flex justify-between gap-8 mt-12">
        {/* Left - Applicant */}
        <div className="flex-1">
          <div className="border-t border-black pt-2 mb-8">
            <p className="text-xs font-medium">
              The Applicant/Nominee Personally :
            </p>
          </div>

          <div className="border-t border-black pt-2 mb-4 w-3/4"></div>

          <div className="grid grid-cols-[100px_1fr] gap-y-2 text-xs">
            <span className="font-medium">Name:</span>
            <span className="border-b border-black">{applicant.name}</span>
            <span className="font-medium">Agreement Date:</span>
            <span className="border-b border-black">{agreementDate}</span>
          </div>
        </div>

        {/* Right - Order Representative */}
        <div className="flex-1">
          <div className="border-t border-black pt-2 mb-2">
            <p className="text-xs font-medium">For and on Behalf of</p>
            <p className="text-xs font-bold">{AGREEMENT_DEFAULTS.orderName}</p>
          </div>

          <div className="border-t border-black pt-2 mb-4 w-3/4 mt-6"></div>

          <div className="grid grid-cols-[100px_1fr] gap-y-2 text-xs">
            <span className="font-medium">Name:</span>
            <span>{friarName}</span>
            <span></span>
            <span className="text-xs">{friarTitle}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
