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
  items?: Array<{
    description: string
    quantity: number
    unitPrice: number
    amount: number
    referenceNo?: string
  }>
}

export function ReceiptTemplate({
  receiptNo = '003762',
  date = '03-Oct-25',
  receivedFrom = 'Jacqueline Lim Poh Choo',
  address = 'Blk:,,,Singapore,undefined',
  invoiceNo = '53204',
  refDocNo = '',
  description = 'St Bernadine 5585',
  totalAmount = 8305.8,
  dollarsInWords = 'Eight Thousand Three Hundred Five, And Eighty Cents Only',
  paymentMethod = 'Cash',
  paymentModeDocNo = '',
  items = [],
}: ReceiptTemplateProps) {
  const formattedAmount = (amt: number) =>
    amt.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

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

        <div className="text-right text-[10px] leading-tight max-w-[400px]">
          <h2 className="text-[15px] font-bold mb-0.5 tracking-tight">THE ORDER OF FRIARS MINOR (S) LTD</h2>
          <p className="mb-0.5 font-medium">Co & GST Reg No. 201016236M</p>
          <p className="mb-0.5 font-medium">Franciscan Columbarium</p>
          <p className="mb-0.5 font-medium">5 Bukit Batok East Avenue 2 Singapore 659918</p>
          <p className="mb-0.5 font-medium">Tel: 6560-6361, HP: 9774-7053</p>
          <p className="mb-0.5 font-medium">email: franciscan.columbarium@gmail.com</p>

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
          <div className="font-medium flex-1 text-[13px] leading-snug whitespace-pre-wrap">
            {address}
          </div>
        </div>
      </div>

      {/* Invoice Details Table */}
      <div className="mb-4">
        <div className="grid grid-cols-[110px_1fr_150px] gap-4 mb-2 pb-1 border-b-2 border-black">
          <div className="font-bold text-[13px] underline underline-offset-2">Invoice</div>
          <div className="font-bold text-[13px] underline underline-offset-2 pl-2">Description</div>
          <div className="font-bold text-[13px] underline underline-offset-2 text-right">Total Amount</div>
        </div>

        <div className="space-y-2 min-h-[50px]">
          {items && items.length > 0 ? (
            items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[110px_1fr_150px] gap-4 text-[13px] items-start">
                <div className="py-0.5">{invoiceNo}</div>
                <div className="pl-2 py-0.5 whitespace-pre-line leading-relaxed uppercase">
                  {item.description}
                </div>
                <div className="text-right py-0.5 font-medium">
                  $ {formattedAmount(item.amount)}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-[110px_1fr_150px] gap-4 text-[13px] items-start uppercase">
              <div className="py-0.5">{invoiceNo}</div>
              <div className="pl-2 py-0.5 whitespace-pre-line leading-relaxed">{description}</div>
              <div className="text-right py-0.5 font-medium">
                $ {formattedAmount(totalAmount)}
              </div>
            </div>
          )}
        </div>

        {/* Total Row */}
        <div className="flex justify-end mt-4">
          <div className="flex items-start gap-10 font-bold text-[15px]">
            <span className="pt-1">Total :</span>
            <div className="min-w-[150px] text-right">
              <div className="border-t-2 border-black pt-2 pb-1 pr-1 font-extrabold">
                $ {formattedAmount(totalAmount)}
              </div>
              <div className="border-t border-b border-black h-[4px] mt-0.5"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="mb-10 text-[14px] flex gap-4 border-t border-gray-100 pt-4">
        <span className="font-bold italic">Dollars :</span>
        <span className="italic font-medium border-b border-gray-300 flex-1 pb-1.5">{dollarsInWords}</span>
      </div>

      {/* Footer / Signature lines */}
      <div className="flex justify-between items-start text-[12px] mt-12">
        <div className="w-[300px]">
          <div className="border-t border-black pt-2 font-bold uppercase tracking-wide">
            {paymentMethod}{paymentModeDocNo ? ` (${paymentModeDocNo})` : ''}
          </div>
          {refDocNo && (
            <div className="mt-1">
              <span className="pr-4 italic text-gray-600">Ref Doc No:</span>
              <span className="font-medium">{refDocNo}</span>
            </div>
          )}
        </div>
        <div className="w-[300px] text-right">
          <div className="border-t border-black pt-2 font-bold">
            The Order of Friars Minor (S) Ltd
          </div>
          <div className="text-[9px] text-gray-500 mt-1 italic font-medium">Computer Generated Receipt - No Signature Required</div>
        </div>
      </div>
    </div>
  )
}
