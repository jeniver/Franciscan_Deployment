import { PDF_ASSETS } from '../common/FranciscanLogo'

interface ReceiptTemplateProps {
  receiptNo?: string
  date?: string
  receivedFrom?: string
  address?: string
  invoiceNo?: string
  refDocNo?: string
  description?: string
  totalAmount?: number
  dollarsInWords?: string
  paymentMethod?: string
  paymentModeDocNo?: string
  churchInfo?: {
    name?: string
    address?: string
    phone?: string
    email?: string
    registrationNo?: string
  }
}

export function ReceiptTemplate({
  receiptNo = '',
  date = '',
  receivedFrom = '',
  address = '',
  invoiceNo = '',
  refDocNo = '',
  description = '',
  totalAmount = 0,
  dollarsInWords = '',
  paymentMethod = 'Cash',
  paymentModeDocNo = '',
  churchInfo,
}: ReceiptTemplateProps) {
  const formattedAmount = (amt: number) =>
    amt.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  // Fallback church information if not provided
  const church = {
    name: churchInfo?.name || 'THE ORDER OF FRIARS MINOR (S) LTD',
    registrationNo: churchInfo?.registrationNo || '201016236M',
    address: churchInfo?.address || '5 Bukit Batok East Avenue 2, Singapore 659918',
    phone: churchInfo?.phone || '6560-6361, HP: 9774-7053',
    email: churchInfo?.email || 'franciscan.columbarium@gmail.com'
  };

  return (
    <div className="w-full max-w-[800px] bg-white p-4 md:p-6 pb-12 mx-auto text-black font-sans leading-tight">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-start gap-5">
          <img
            src={PDF_ASSETS.headerImageUrl}
            alt="Franciscan Logo"
            className="w-20 h-20 object-contain"
          />
          <div className="flex flex-col pt-1">
            <h1 className="text-3xl font-bold tracking-[0.1em] leading-none text-gray-900">OFFICIAL</h1>
            <h1 className="text-3xl font-bold tracking-[0.1em] leading-none mt-1 text-gray-900">RECEIPT</h1>
          </div>
        </div>

        <div className="text-right text-[12px] leading-tight max-w-[400px]">
          <h2 className="text-[15px] font-bold mb-1 tracking-tight uppercase">THE ORDER OF FRIARS MINOR (S) LTD</h2>
          <p className="mb-0.5">Co & GST Reg No. 201016236M</p>
          <p className="mb-0.5 mt-2 font-semibold">Franciscan Columbarium</p>
          <p className="mb-0.5">5 Bukit Batok East Avenue 2 Singapore 659918</p>
          <p className="mb-0.5">Tel: 6560-6361, HP: 9774-7053,</p>
          <p className="mb-0.5">email:Franciscan.columbarium@gmail.com</p>

          <div className="mt-4 flex flex-col items-end text-[12px]">
            <div className="grid grid-cols-[auto_110px] gap-y-0.5">
              <span className="pr-4">Receipt No:</span>
              <span className="text-right font-bold">{receiptNo}</span>
              <span className="pr-4">Date :</span>
              <span className="text-right font-medium">{date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Received From and Address */}
      <div className="space-y-3 mb-8 text-[14px]">
        <div className="flex gap-2 items-baseline">
          <span className="w-[110px] shrink-0 font-bold">Received From :</span>
          <span className="font-semibold flex-1 uppercase">{receivedFrom}</span>
        </div>
        <div className="flex gap-2 items-start">
          <span className="w-[110px] shrink-0 font-bold">Address :</span>
          <div className="flex-1 text-[14px] leading-normal whitespace-pre-wrap">
            {address}
          </div>
        </div>
      </div>

      {/* Invoice Details Table */}
      <div className="mb-4">
        <div className="grid grid-cols-[140px_1fr_150px] gap-4 mb-2 pb-1  ">
          <div className="font-bold text-[13px] underline underline-offset-2">Invoice</div>
          <div className="font-bold text-[13px] underline underline-offset-2 pl-2">Description</div>
          <div className="font-bold text-[13px] underline underline-offset-2 text-right">Total Amount</div>
        </div>

        <div className="space-y-2 min-h-[50px]">
          {/* Always show only summary row as per user requirement to "exclude items" */}
          <div className="grid grid-cols-[140px_1fr_150px] gap-4 text-[13px] items-start uppercase">
            <div className="py-1 font-medium">{invoiceNo}</div>
            <div className="pl-2 py-1 whitespace-pre-line leading-relaxed">
              {description}
              {refDocNo && description.indexOf(refDocNo) === -1 && (
                <div className="text-[11px] font-normal lowercase mt-0.5 opacity-80">
                  Ref: {refDocNo}
                </div>
              )}
            </div>
            <div className="text-right py-1 font-bold text-[14px]">
              $ {formattedAmount(totalAmount)}
            </div>
          </div>
        </div>

        {/* Total Row */}
        <div className="flex justify-end mt-4">
          <div className="flex items-start gap-4 font-bold text-[15px]">
            <span className="pt-2">Total:</span>
            <div className="w-[150px] text-right">
              <div className="border-t-2 border-black pt-2 pb-1 font-extrabold text-[16px]">
                $ {formattedAmount(totalAmount)}
              </div>
              <div className="border-t-4 border-double border-black h-[1px] mt-0.5"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="mb-10 text-[14px] flex gap-4 border-t border-gray-100 pt-6">
        <span className="font-bold italic shrink-0">Dollars :</span>
        <span className="italic font-medium border-b border-gray-300 flex-1 pb-1.5 uppercase">{dollarsInWords}</span>
      </div>

      {/* Footer / Signature lines */}
      <div className="flex justify-between items-end text-[12px] mt-24">
        <div className="w-[300px]">
          <div className="border-t border-black pt-2 font-bold uppercase tracking-wide">
            {paymentMethod}{paymentModeDocNo ? ` (${paymentModeDocNo})` : ''}
          </div>
        </div>
        <div className="w-[350px] text-center">
          <div className="font-bold uppercase mb-12">
            For {church.name}
          </div>
          <div className="border-t border-black pt-2 font-bold tracking-wide">
            Authorised Signature
          </div>
        </div>
      </div>
    </div>
  )
}
