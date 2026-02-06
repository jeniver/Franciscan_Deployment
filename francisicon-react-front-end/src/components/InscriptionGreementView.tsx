import React from 'react'
import { AGREEMENT_DEFAULTS } from '../components/common/FranciscanLogo'
interface DeceasedDetails {
  name: string
  deathCertNo: string
  dateBorn: string
  dateDied: string
}
interface PaymentItem {
  date: string
  invReceipt: string
  description: string
  amount: number
  gst: string
  totalAmount: number
}
interface InscriptionGreementViewProps {
  inscriptionNo?: string
  chapelName?: string
  nicheNo?: string
  applicantName?: string
  address?: string
  telOff?: string
  telRes?: string
  telHP?: string
  crossType?: string
  deceased1?: DeceasedDetails
  deceased2?: DeceasedDetails
  bibleInscriptionNumber?: string
  dateOfInterment?: string
  timeOfInterment?: string
  bibleInscriptionText?: string
  payments?: PaymentItem[]
  signatureName?: string
  signatureDate?: string
}
export function InscriptionGreementView({
  inscriptionNo = 'I-5674-0',
  chapelName = 'St Margaret',
  nicheNo = '5674',
  applicantName = 'Jamus Yuen Yee Cheong',
  address = 'Block 63, Bishan Street 21 #06-04 Tower A1\nSingapore 574045',
  telOff = '',
  telRes = '',
  telHP = '9688-1841',
  crossType = 'Crucifix',
  deceased1 = {
    name: 'Jimmy Yuen Yu Jim',
    deathCertNo: '903257F',
    dateBorn: '30-Jun-1950',
    dateDied: '25-Jan-2026',
  },
  deceased2 = {
    name: '',
    deathCertNo: '',
    dateBorn: '',
    dateDied: '',
  },
  bibleInscriptionNumber = '',
  dateOfInterment = '30-Jan-2026',
  timeOfInterment = '11:00AM',
  bibleInscriptionText = 'Come, O blessed of my Father, inherit the kingdom prepared for you from the foundation of',
  payments = [
    {
      date: '27-January-2026',
      invReceipt: '53299',
      description: 'Inscription',
      amount: 400.0,
      gst: '$ 36.00',
      totalAmount: 436.0,
    },
    {
      date: '27-Jan-2026',
      invReceipt: '005194',
      description: 'od 26/1/26\nBRT7962693',
      amount: 0,
      gst: '-',
      totalAmount: 436.0,
    },
    {
      date: '27-January-2026',
      invReceipt: '53299',
      description: 'Urn',
      amount: 150.0,
      gst: '$ 13.50',
      totalAmount: 163.5,
    },
    {
      date: '27-Jan-2026',
      invReceipt: '005194',
      description: 'od 26/1/26\nBRT7962693',
      amount: 0,
      gst: '-',
      totalAmount: 163.5,
    },
  ],
  signatureName = 'Jamus Yuen Yee Cheong',
  signatureDate = '02-02-2026',
}: InscriptionGreementViewProps) {
  return (
    <div className="w-full max-w-[800px] bg-white p-6 md:p-8 mx-auto text-black font-sans text-[11px] leading-tight">
      {/* Header */}
      <div className="mb-4">
        <p className="text-xs">Franciscan Columbarium a ministry of</p>
        <p className="font-bold text-sm mt-1">
          The Order of Friars Minor (Singapore) Ltd Co & GST Reg No.{' '}
          {AGREEMENT_DEFAULTS.orderRegNo}
        </p>
        <p className="text-[10px] text-gray-600">(Co. Reg.No.201016323M)</p>
        <p className="text-[10px]">{AGREEMENT_DEFAULTS.orderAddress}</p>
        <p className="text-[10px]">
          Telephone : {AGREEMENT_DEFAULTS.orderTel}, &nbsp; Fax : 6566-2852,
          &nbsp; E-mail : {AGREEMENT_DEFAULTS.orderEmail}
        </p>
      </div>

      {/* Title */}
      <h1 className="text-center text-xl italic font-serif mb-4">
        "Request for inscription plaque"
      </h1>

      {/* Inscription No */}
      <div className="flex justify-end mb-4 text-xs">
        <span>Inscription No :</span>
        <span className="ml-4 font-medium">{inscriptionNo}</span>
      </div>

      {/* Chapel and Niche */}
      <table className="w-full border-collapse border border-black text-[10px] mb-3">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1.5 w-24 bg-gray-100 font-medium">
              Name of Chapel
            </td>
            <td className="border border-black px-2 py-1.5">{chapelName}</td>
            <td className="border border-black px-2 py-1.5 w-20 bg-gray-100 font-medium">
              Niche No
            </td>
            <td className="border border-black px-2 py-1.5 w-20">{nicheNo}</td>
          </tr>
        </tbody>
      </table>

      {/* Applicant Details */}
      <table className="w-full border-collapse border border-black text-[10px] mb-3">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1.5 w-28 bg-gray-100 font-medium">
              Name of Applicant
            </td>
            <td className="border border-black px-2 py-1.5" colSpan={3}>
              {applicantName}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Address
            </td>
            <td
              className="border border-black px-2 py-1.5 whitespace-pre-line"
              colSpan={3}
            >
              {address}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Tel(Off)
            </td>
            <td className="border border-black px-2 py-1.5 w-28">{telOff}</td>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium w-16">
              Tel(Res)
            </td>
            <td className="border border-black px-2 py-1.5 w-28">{telRes}</td>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium w-16">
              Tel(HP)
            </td>
            <td className="border border-black px-2 py-1.5 w-24">{telHP}</td>
          </tr>
        </tbody>
      </table>

      {/* Details of Deceased No.1 */}
      <div className="mb-1">
        <div className="flex items-center gap-4 mb-1">
          <span className="font-bold text-[10px] bg-gray-100 px-2 py-0.5 border border-black">
            Details of Deceased No.1
          </span>
          <span className="text-[10px]">Cross Type :</span>
          <span className="text-[10px] font-medium">{crossType}</span>
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-[10px] mb-3">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1.5 w-36 bg-gray-100 font-medium">
              Name Of Deceased No.1
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased1.name}
            </td>
            <td className="border border-black px-2 py-1.5 w-24 bg-gray-100 font-medium">
              Death Cert No:
            </td>
            <td className="border border-black px-2 py-1.5 w-24">
              {deceased1.deathCertNo}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Date Born
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased1.dateBorn}
            </td>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Date Died
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased1.dateDied}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Details of Deceased No.2 */}
      <div className="mb-1">
        <span className="font-bold text-[10px] bg-gray-100 px-2 py-0.5 border border-black">
          Details of Deceased No.2
        </span>
      </div>

      <table className="w-full border-collapse border border-black text-[10px] mb-3">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1.5 w-36 bg-gray-100 font-medium">
              Name Of Deceased No.2
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased2.name}
            </td>
            <td className="border border-black px-2 py-1.5 w-24 bg-gray-100 font-medium">
              Death Cert No:
            </td>
            <td className="border border-black px-2 py-1.5 w-24">
              {deceased2.deathCertNo}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Date Born
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased2.dateBorn}
            </td>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Date Died
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased2.dateDied}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bible Inscription and Interment */}
      <div className="flex gap-4 mb-3">
        <div className="border border-black p-2 w-48">
          <p className="text-[9px] text-gray-600 mb-1">
            Bible Inscription of choice number
          </p>
          <p className="text-[10px]">{bibleInscriptionNumber}</p>
        </div>
        <div className="flex-1">
          <table className="w-full border-collapse border border-black text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 bg-gray-100 font-medium w-28">
                  Date of Interment :
                </td>
                <td className="border border-black px-2 py-1">
                  {dateOfInterment}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 bg-gray-100 font-medium">
                  Time:
                </td>
                <td className="border border-black px-2 py-1">
                  {timeOfInterment}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bible Inscription Text */}
      <p className="text-[9px] text-gray-600 mb-1">
        Bible Inscription or phrases of your choice(max 80 chars)
      </p>
      <p className="text-[9px] text-gray-500 mb-1">
        This is subject to the approval of our Franciscan Friars Custos
      </p>
      <p className="text-[10px] italic mb-4">{bibleInscriptionText}</p>

      {/* Payment Details */}
      <div className="border border-black mb-6">
        <div className="bg-gray-100 px-2 py-1.5 border-b border-black">
          <p className="font-bold text-[10px]">
            Payment Details: Cheque made payable to' The Order of Friars Minor
            (S) Ltd-Columbarium"
          </p>
          <p className="text-[9px]">
            (1st name = $400, 2nd name = $300, 2 names together = $650)
          </p>
          <p className="text-[9px] font-medium">
            Prices subject to change without notice)
          </p>
        </div>

        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black px-2 py-1 text-left font-bold">
                Date
              </th>
              <th className="border border-black px-2 py-1 text-left font-bold">
                Inv/ Receipt
              </th>
              <th className="border border-black px-2 py-1 text-left font-bold">
                Description
              </th>
              <th className="border border-black px-2 py-1 text-right font-bold">
                Amount
              </th>
              <th className="border border-black px-2 py-1 text-right font-bold">
                GST
              </th>
              <th className="border border-black px-2 py-1 text-right font-bold">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, index) => (
              <tr key={index}>
                <td className="border border-black px-2 py-1.5">
                  {payment.date}
                </td>
                <td className="border border-black px-2 py-1.5">
                  {payment.invReceipt}
                </td>
                <td className="border border-black px-2 py-1.5 whitespace-pre-line">
                  {payment.description}
                </td>
                <td className="border border-black px-2 py-1.5 text-right">
                  {payment.amount > 0 ? `$ ${payment.amount.toFixed(2)}` : ''}
                </td>
                <td className="border border-black px-2 py-1.5 text-right">
                  {payment.gst}
                </td>
                <td className="border border-black px-2 py-1.5 text-right">
                  $ {payment.totalAmount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Consent Text */}
      <div className="border-t border-black pt-4 mt-8">
        <p className="text-[9px] leading-relaxed mb-6">
          By submitting this form I consent to my personal data being collected,
          used or disclosed by the Order of Friars Minor (S) Ltd in accordance
          with its Personal Data Protection Policy Statement which may be found
          at
          <span className="underline ml-1">www.franciscans.sg</span>. We have
          checked and confirmed that the information given above is correct.
        </p>
      </div>

      {/* Signature */}
      <div className="mt-8">
        <div className="w-64 border-t border-black mb-4"></div>
        <div className="grid grid-cols-[60px_1fr] gap-y-1 text-[10px]">
          <span className="font-medium">Name:</span>
          <span>{signatureName}</span>
          <span className="font-medium">Date :</span>
          <span>{signatureDate}</span>
        </div>
      </div>
    </div>
  )
}
