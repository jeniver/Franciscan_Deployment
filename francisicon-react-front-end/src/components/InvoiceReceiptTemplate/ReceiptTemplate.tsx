import React from 'react'
import { PDF_ASSETS } from '../common/FranciscanLogo'

interface ReceiptTemplateProps {
  receiptNo?: string
  date?: string
  receivedFrom?: string
  address?: string
  invoiceNo?: string
  description?: string
  totalAmount?: number
  dollarsInWords?: string
  paymentMethod?: string
  items?: Array<{
    description: string
    quantity: number
    unitPrice: number
    amount: number
  }>
}

export function ReceiptTemplate({
  receiptNo = '003762',
  date = '03-Oct-25',
  receivedFrom = 'Jacqueline Lim Poh Choo',
  address = 'Blk:,,,Singapore,undefined',
  invoiceNo = '53204',
  description = 'St Bernadine 5585',
  totalAmount = 8305.8,
  dollarsInWords = 'Eight Thousand Three Hundred Five, And Eighty Cents Only',
  paymentMethod = 'Cash',
  items = [],
}: ReceiptTemplateProps) {
  const formattedAmount = (amt: number) =>
    amt.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="w-full max-w-[950px] bg-white p-12 mx-auto text-black font-sans leading-relaxed shadow-lg border border-gray-200">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-start gap-6">
          <img
            src={PDF_ASSETS.headerImageUrl}
            alt="Franciscan Logo"
            className="w-28 h-28 object-contain"
          />
          <div className="flex flex-col pt-2">
            <h1 className="text-4xl font-bold tracking-wider leading-none">OFFICIAL</h1>
            <h1 className="text-4xl font-bold tracking-wider leading-none mt-1">RECEIPT</h1>
          </div>
        </div>

        <div className="text-right text-[12px] leading-tight max-w-[450px]">
          <h2 className="text-[22px] font-bold mb-1 tracking-tight">THE ORDER OF FRIARS MINOR (S) LTD</h2>
          <p className="mb-0.5">Co & GST Reg No. 201016236M</p>
          <p className="mb-0.5">Franciscan Columbarium</p>
          <p className="mb-0.5">5 Bukit Batok East Avenue 2 Singapore 659918</p>
          <p className="mb-0.5">Tel: 6560-6361, HP: 9774-7053,</p>
          <p className="mb-0.5">email: Franciscan.columbarium@gmail.com</p>

          <div className="mt-8 flex flex-col items-end text-[14px]">
            <div className="grid grid-cols-[auto_140px] gap-y-1">
              <span className="pr-4">Receipt No:</span>
              <span className="text-right font-medium">{receiptNo}</span>
              <span className="pr-4">Date :</span>
              <span className="text-right font-medium">{date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Received From and Address */}
      <div className="space-y-4 mb-12 text-[15px]">
        <div className="flex gap-1">
          <span className="w-[140px] shrink-0">Received From :</span>
          <span className="font-medium underline decoration-gray-300 underline-offset-4">{receivedFrom}</span>
        </div>
        <div className="flex gap-1">
          <span className="w-[140px] shrink-0">Address:</span>
          <span className="font-medium flex-1 underline decoration-gray-300 underline-offset-4">{address}</span>
        </div>
      </div>

      {/* Invoice Details Table */}
      <div className="mb-10">
        <div className="grid grid-cols-[120px_1fr_180px] gap-4 mb-4">
          <div className="font-bold underline underline-offset-8 decoration-1">Invoice</div>
          <div className="font-bold underline underline-offset-8 decoration-1 pl-4">Description</div>
          <div className="font-bold underline underline-offset-8 decoration-1 text-right">Total Amount</div>
        </div>

        <div className="space-y-3 min-h-[100px]">
          {items && items.length > 0 ? (
            items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[120px_1fr_180px] gap-4 text-[15px]">
                <div className="py-1">{invoiceNo}</div>
                <div className="pl-4 py-1 whitespace-pre-line">{item.description}</div>
                <div className="text-right py-1 font-medium">
                  $ {formattedAmount(item.amount)}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-[120px_1fr_180px] gap-4 text-[15px]">
              <div className="py-1">{invoiceNo}</div>
              <div className="pl-4 py-1 whitespace-pre-line">{description}</div>
              <div className="text-right py-1 font-medium">
                $ {formattedAmount(totalAmount)}
              </div>
            </div>
          )}
        </div>

        {/* Total Row */}
        <div className="flex justify-end mt-8">
          <div className="flex items-center gap-16 font-bold text-[16px]">
            <span>Total :</span>
            <div className="min-w-[180px] text-right">
              <div className="border-t-2 border-black pt-2 pb-1">
                $ {formattedAmount(totalAmount)}
              </div>
              <div className="border-t-2 border-b border-black h-1 -mt-0.5"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="flex gap-4 mb-32 text-[15px]">
        <span className="w-[100px] shrink-0">Dollars :</span>
        <span className="flex-1 font-medium italic underline decoration-gray-300 underline-offset-4 leading-relaxed">
          {dollarsInWords}
        </span>
      </div>

      {/* Footer / Signature lines */}
      <div className="flex justify-between items-end">
        <div className="w-[350px] border-t border-black pt-3">
          <span className="text-[14px] uppercase tracking-wide">{paymentMethod}</span>
        </div>
        <div className="w-[350px] border-t border-black pt-3 text-right">
          <span className="text-[14px]">The Order of Friars Minor (S) Ltd</span>
        </div>
      </div>
    </div>
  )
}
