import React from 'react'
import { PDF_ASSETS, AGREEMENT_DEFAULTS } from '../common/FranciscanLogo'
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
  total?: number
  dollarsInWords?: string
}
export function TaxInvoice({
  invoiceNo = '53206',
  date = '06-Oct-2025',
  name = 'Sergio Ordonez',
  address = 'Blk:.., , Singapore',
  items = [
    {
      description: 'Level 3 Niche',
      referenceNo: 'St Agnes 3791 -',
      gstPercent: 9.0,
      qty: 1.0,
      unitPrice: 5500.0,
      amount: 5500.0,
    },
    {
      description: 'Niche Inscription 1st Name',
      referenceNo: 'St Agnes 3791 -',
      gstPercent: 9.0,
      qty: 1.0,
      unitPrice: 400.0,
      amount: 400.0,
    },
    {
      description: 'Setting of tables',
      referenceNo: 'St Agnes 3791 -',
      gstPercent: 9.0,
      qty: 1.0,
      unitPrice: 20.0,
      amount: 20.0,
    },
    {
      description: 'Sealing of niche',
      referenceNo: 'St Agnes 3791 -',
      gstPercent: 9.0,
      qty: 1.0,
      unitPrice: 20.0,
      amount: 20.0,
    },
  ],
  subTotal = 5940.0,
  gstTotal = 534.6,
  total = 6474.6,
  dollarsInWords = 'Six Thousand Four Hundred Seventy-Five Only',
}: InvoiceTemplateProps) {
  return (
    <div className="w-full max-w-[800px] bg-white p-8 md:p-12 mx-auto text-black font-serif shadow-sm border border-gray-200">
      {/* Header */}
      <>{console.log("address", address)}</>
      <div className="flex justify-between items-start mb-8">
        {/* Franciscan Logo */}
        <img
          src={PDF_ASSETS.headerImageUrl}
          alt="Franciscan Logo - St. Francis receiving the stigmata"
          className="w-24 h-20 object-contain"
        />

        <div className="text-right text-sm leading-relaxed flex-1 ml-8">
          <h2 className="font-bold text-lg uppercase mb-1">
            THE ORDER OF FRIARS MINOR (S) LTD
          </h2>
          <p>Co. & GST Reg. No. 201016236M</p>
          <p>Franciscan Columbarium</p>
          <p>5 Bukit Batok East Ave 2, Singapore 659918</p>
          <p>Tel: 6560-6361 , HP: 9774-7053</p>
          <p>Email: franciscan.columbarium@gmail.com</p>
        </div>
      </div>

      {/* Tax Invoice Badge */}
      <div className="flex justify-end mb-8">
        <div className="bg-black text-white px-6 py-2 font-bold text-xl tracking-wider uppercase">
          TAX INVOICE
        </div>
      </div>

      {/* Customer & Invoice Details */}
      <div className="flex justify-between items-start mb-8 text-sm">
        <div className="w-1/2 grid grid-cols-[80px_1fr] gap-y-2">
          <span className="font-bold">Name :</span>
          <span>{name}</span>
          <span className="font-bold">Address :</span>
          <div className="flex flex-col">
            {address}
          </div>
        </div>
        <div className="w-1/3 grid grid-cols-[100px_1fr] gap-y-2 text-right">
          <span className="text-left">Invoice No :</span>
          <span>{invoiceNo}</span>
          <span className="text-left">Date :</span>
          <span>{date}</span>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="border border-black px-2 py-1 text-left font-bold">
                Description
              </th>
              <th className="border border-black px-2 py-1 text-left font-bold">
                Reference No.
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold">
                GST %
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold">
                Qty
              </th>
              <th className="border border-black px-2 py-1 text-right font-bold">
                Unit Price
              </th>
              <th className="border border-black px-2 py-1 text-right font-bold">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="border border-black px-2 py-3">
                  {item.description}
                </td>
                <td className="border border-black px-2 py-3">
                  {item.referenceNo || 'N/A'}
                </td>
                <td className="border border-black px-2 py-3 text-center">
                  {(typeof item.gstPercent !== 'undefined' && item.gstPercent !== null) ? item.gstPercent.toFixed(2) : '0.00'}
                </td>
                <td className="border border-black px-2 py-3 text-center">
                  {typeof item.qty === 'number' ? item.qty.toFixed(2) : '0.00'}
                </td>
                <td className="border border-black px-2 py-3 text-right">
                  ${' '}
                  {typeof item.unitPrice === 'number' ? item.unitPrice.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  }) : '0.00'}
                </td>
                <td className="border border-black px-2 py-3 text-right">
                  ${' '}
                  {typeof item.amount === 'number' ? item.amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  }) : '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-64">
          <div className="flex justify-between mb-2">
            <span>Sub Total :</span>
            <span className="font-bold">
              ${' '}
              {typeof subTotal === 'number' ? subTotal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              }) : '0.00'}
            </span>
          </div>
          <div className="flex justify-between mb-4">
            <span>GST Total :</span>
            <span>
              ${' '}
              {typeof gstTotal === 'number' ? gstTotal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              }) : '0.00'}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total :</span>
            <span>
              ${' '}
              {typeof total === 'number' ? total.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              }) : '0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="mb-2 text-sm">
        <div className="grid grid-cols-[80px_1fr] gap-4">
          <span>Dollars</span>
          <span>{dollarsInWords}</span>
        </div>
      </div>

      <div className="text-xs text-gray-600 mb-16">
        This is a system generated invoice. No signature is required
      </div>

      {/* Payment Footer */}
      <div className="text-xs font-bold space-y-1">
        <p>Payment by:</p>
        <ol className="list-decimal list-inside space-y-1 pl-2">
          <li>Cash</li>
          <li>
            Cheque payable to:{' '}
            <span className="ml-4">
              The Order of Friars Minor (S) Ltd - Columbarium
            </span>
          </li>
          <li>
            Internet transfer:{' '}
            <span className="ml-5">OFM - Col, Standard Chartered Bank</span>
          </li>
        </ol>
        <p className="pl-6 pt-1">A/c 07-1-006455-1</p>
        <p className="pt-2">
          Please quote the invoice no. in the reference field
        </p>
      </div>
    </div>
  )
}
