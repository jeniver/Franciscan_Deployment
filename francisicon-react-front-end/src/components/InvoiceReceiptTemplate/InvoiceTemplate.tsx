import { PDF_ASSETS } from '../common/FranciscanLogo'
interface InvoiceTemplate {
  description: string
  referenceNo: string
  gstPercent: number
  qty: number
  quantity?: number
  unitPrice: number
  amount: number
}
interface InvoiceTemplateProps {
  invoiceNo?: string
  date?: string
  name?: string
  address?: string
  items?: InvoiceTemplate[]
  subTotal?: number
  gstTotal?: number
  total?: number;
  dollarsInWords?: string;
  paymentMode?: string;
  paymentModeDocNo?: string;
}
export function TaxInvoice({
  invoiceNo = '53206',
  date = '06-Oct-2025',
  name = 'Sergio Ordonez',
  address = 'Blk:.., , Singapore',
  items = [],
  subTotal = 5940.0,
  gstTotal = 534.6,
  total = 6474.6,
  dollarsInWords = 'Six Thousand Four Hundred Seventy-Five Only',
  paymentMode = 'Cash',
  paymentModeDocNo = '',
}: InvoiceTemplateProps) {
  return (
    <div className="w-full max-w-[800px] bg-white p-8 md:p-12 pb-12 mx-auto text-black font-sans shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        {/* Franciscan Logo */}
        <img
          src={PDF_ASSETS.headerImageUrl}
          alt="Franciscan Logo"
          className="w-24 h-20 object-contain"
        />

        <div className="text-right text-sm leading-tight flex-1 ml-8">
          <h2 className="font-bold text-lg uppercase mb-1">
            THE ORDER OF FRIARS MINOR (S) LTD
          </h2>
          <p className="mb-0.5">Co. & GST Reg. No. 201016236M</p>
          <p className="mb-0.5">Franciscan Columbarium</p>
          <p className="mb-0.5">5 Bukit Batok East Ave 2, Singapore 659918</p>
          <p className="mb-0.5">Tel: 6560-6361 , HP: 9774-7053</p>
          <p className="mb-0.5">Email: franciscan.columbarium@gmail.com</p>
        </div>
      </div>

      {/* Tax Invoice Badge */}
      <div className="flex justify-end mb-8">
        <div className="bg-black text-white px-8 py-2 font-bold text-xl tracking-wider uppercase">
          TAX INVOICE
        </div>
      </div>

      {/* Customer & Invoice Details */}
      <div className="flex justify-between items-start mb-10 text-[14px]">
        <div className="w-1/2 flex flex-col gap-2">
          <div className="flex gap-2">
            <span className="font-bold w-[110px]">Name :</span>
            <span className="font-semibold">{name}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-[110px]">Address :</span>
            <div className="flex-1 leading-normal whitespace-pre-wrap">
              {address}
            </div>
          </div>
        </div>
        <div className="w-[200px] text-right space-y-2">
          <div className="flex justify-between">
            <span className="font-bold">Invoice No :</span>
            <span>{invoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Date :</span>
            <span>{date}</span>
          </div>
          {/* <div className="flex justify-between">
            <span className="font-bold">Payment:</span>
            <span>{paymentMode}{paymentModeDocNo ? ` (${paymentModeDocNo})` : ''}</span>
          </div> */}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse border border-black text-[13px]">
          <thead>
            <tr className="bg-black text-white">
              <th className="border border-black px-3 py-2 text-left font-bold uppercase tracking-wide">
                Description
              </th>
              <th className="border border-black px-3 py-2 text-left font-bold uppercase tracking-wide">
                Ref No.
              </th>
              <th className="border border-black px-3 py-2 text-center font-bold uppercase tracking-wide">
                GST %
              </th>
              <th className="border border-black px-3 py-2 text-center font-bold uppercase tracking-wide">
                Qty
              </th>
              <th className="border border-black px-3 py-2 text-right font-bold uppercase tracking-wide">
                Price
              </th>
              {/* <th className="border border-black px-3 py-2 text-right font-bold uppercase tracking-wide">
                Amount
              </th> */}
            </tr>
          </thead>
          <tbody>
            {(items.length > 0 ? items : [
              { description: 'Service Charges', referenceNo: 'N/A', gstPercent: 9, qty: 1, unitPrice: total / 1.09, amount: total / 1.09 }
            ]).map((item, index) => (
              <tr key={index} className="even:bg-gray-50">
                <td className="border border-black px-3 py-3 leading-relaxed">
                  {item.description}
                </td>
                <td className="border border-black px-3 py-3 font-medium">
                  {item.referenceNo || 'N/A'}
                </td>
                <td className="border border-black px-3 py-3 text-center">
                  {(item.gstPercent || 0).toFixed(1)}%
                </td>
                <td className="border border-black px-3 py-3 text-center">
                  {(item.qty || 0).toFixed(2)}
                </td>
                <td className="border border-black px-3 py-3 text-right">
                  ${(item.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                {/* <td className="border border-black px-3 py-3 text-right font-medium">
                  ${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Sub Total :</span>
            <span className="font-medium">
              ${(subTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>GST Total :</span>
            <span>
              ${(gstTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t-2 border-black pt-2">
            <span>Total :</span>
            <span>
              ${(total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="mb-10 text-[14px] flex gap-4">
        <span className="font-bold">Dollars:</span>
        <span className="italic font-medium border-b border-gray-300 flex-1 pb-1">{dollarsInWords}</span>
      </div>

      <div className="text-[11px] text-gray-500 mb-12 italic">
        * This is a computer generated invoice. No signature is required.
      </div>

      {/* Payment Footer */}
      <div className="text-[13px] border-t border-gray-200 pt-6">
        <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-wider">Payment Information:</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-[140px_1fr] gap-x-4">
            <span className="font-semibold text-gray-700">Cash:</span>
            <span>Payable at Franciscan Columbarium office</span>

            <span className="font-semibold text-gray-700 mt-2">Cheque:</span>
            <span className="mt-2">Payable to: <strong className="text-black">The Order of Friars Minor (S) Ltd - Columbarium</strong></span>

            <span className="font-semibold text-gray-700 mt-2">Internet Transfer:</span>
            <div className="mt-2 text-black">
              <p className="font-bold">OFM - Col, Standard Chartered Bank</p>
              <p className="font-bold mt-1">A/c 07-1-006455-1</p>
            </div>
          </div>

          <div className="mt-8 bg-gray-50 p-4 rounded-md border-l-4 border-black">
            <p className="font-bold text-black italic">
              * Please quote the invoice no. in the reference field to ensure correct allocation of your payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
