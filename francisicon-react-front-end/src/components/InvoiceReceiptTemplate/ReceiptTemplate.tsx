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
  return (
    <div className="w-full max-w-[800px] bg-white p-8 md:p-12 mx-auto text-black font-serif shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div className="flex items-start gap-4">
          {/* Franciscan Logo */}
          <img
            src={PDF_ASSETS.headerImageUrl}
            alt="Franciscan Logo - St. Francis receiving the stigmata"
            className="w-24 h-20 object-contain"
          />
          <div className="flex flex-col justify-center h-20">
            <h1 className="text-3xl font-bold tracking-wide leading-none">
              OFFICIAL
            </h1>
            <h1 className="text-3xl font-bold tracking-wide leading-none">
              RECEIPT
            </h1>
          </div>
        </div>

        <div className="text-right text-sm leading-relaxed">
          <h2 className="font-bold text-lg uppercase mb-1">
           THE ORDER OF FRIARS MINOR (S) LTD
          </h2>
          <p>Co. & GST Reg. No. 201016236M</p>
          <p>Franciscan Columbarium</p>
          <p>5 Bukit Batok East Ave 2, Singapore 659918</p>
          <p>
            Tel: 6560-6361 , HP: 9774-7053
            ,
          </p>
          <p>email:Email:franciscan.columbarium@gmail.com</p>

          <div className="mt-6 grid grid-cols-[auto_100px] gap-x-4 justify-end">
            <span className="text-right">Receipt No:</span>
            <span className="text-right font-medium">{receiptNo}</span>
            <span className="text-right">Date :</span>
            <span className="text-right font-medium">{date}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-8 mb-12">
        <div className="grid grid-cols-[120px_1fr] gap-4">
          <span className="whitespace-nowrap">Received From :</span>
          <span>{receivedFrom}</span>
          <span>Address:</span>
          <span>{address}</span>
        </div>

        {/* Invoice Details Grid */}
        <div className="mt-8">
          <div className="grid grid-cols-[1fr_2fr_1fr] gap-4 mb-4">
            <div className="font-bold underline decoration-1 underline-offset-4">
              Invoice
            </div>
            <div className="font-bold underline decoration-1 underline-offset-4">
              Description
            </div>
            <div className="font-bold underline decoration-1 underline-offset-4 text-right">
              Total Amount
            </div>
          </div>

          {/* Show individual items if available */}
          {items && items.length > 0 ? (
            <>
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_2fr_1fr] gap-4 mb-2">
                  <div>{invoiceNo}</div>
                  <div className="whitespace-pre-line">{item.description}</div>
                  <div className="text-right">
                    ${' '}
                    {typeof item.amount === 'number' ? item.amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    }) : '0.00'}
                  </div>
                </div>
              ))}
              
              {/* Total Line */}
              <div className="flex justify-end items-center gap-8 mb-2 mt-4 pt-2 border-t border-gray-300">
                <span className="font-bold">Total :</span>
                <div className="border-t-2 border-b-2 border-black py-1 min-w-[150px] text-right font-bold">
                  ${' '}
                  {typeof totalAmount === 'number' ? totalAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  }) : '0.00'}
                </div>
              </div>
            </>
          ) : (
            // Fallback to single description if no items
            <>
              <div className="grid grid-cols-[1fr_2fr_1fr] gap-4 mb-8">
                <div>{invoiceNo}</div>
                <div className="whitespace-pre-line">{description}</div>
                <div className="text-right">
                  ${' '}
                  {typeof totalAmount === 'number' ? totalAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  }) : '0.00'}
                </div>
              </div>

              {/* Total Line */}
              <div className="flex justify-end items-center gap-8 mb-2">
                <span className="font-bold">Total :</span>
                <div className="border-t-2 border-b-2 border-black py-1 min-w-[150px] text-right font-bold">
                  ${' '}
                  {typeof totalAmount === 'number' ? totalAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  }) : '0.00'}
                </div>
              </div>
            </>
          )}

          {/* Double line effect for total */}
          <div className="flex justify-end">
            <div className="h-px bg-black w-[150px] -mt-1"></div>
          </div>
        </div>

        <div className="grid grid-cols-[100px_1fr] gap-4 mt-8">
          <span>Dollars :</span>
          <span>{dollarsInWords}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-24 flex justify-between items-end">
        <div className="w-1/3 border-t-2 border-black pt-2">
          {paymentMethod}
        </div>
        <div className="w-1/3 border-t-2 border-black pt-2 text-right text-sm">
          The Order of Friars Minor (S) Ltd
        </div>
      </div>
    </div>
  )
}
