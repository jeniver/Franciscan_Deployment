import React from 'react'
import { formatDate } from '../utils/dateUtils'
import { PDF_ASSETS } from './common/FranciscanLogo';

interface GatesOfLifeAgreementTemplateProps {
    data: any;
}

export function GatesOfLifeAgreementTemplate({ data }: GatesOfLifeAgreementTemplateProps) {
    if (!data) return null;

    const application = data.application ?? {};
    const applicant = data.applicant ?? {};
    const engraving = data.engraving ?? { entries: [] };
    const invoice = data.invoice ?? {};
    const receipt = data.receipt ?? {};
    const payment = data.payment ?? {};

    const addr = applicant.addressDetails || {};

    // For the names to be engraved section
    const engravingEntries = engraving.entries && engraving.entries.length > 0
        ? engraving.entries
        : [{ name: '' }, { name: '' }];

    // Format date helper
    const fDate = (d: any) => d ? formatDate(d) : '';

    return (
        <div
            data-pdf-page
            className="w-full max-w-[210mm] mx-auto bg-white p-[15mm] text-black print:p-0"
            style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: '12pt',
                lineHeight: '1.2'
            }}
            id="gol-agreement-template"
        >
            {/* Header */}
            <div className="flex items-start gap-4 mb-2">
                <div className="w-[100px] h-[100px] flex-shrink-0">
                    <img
                        src={PDF_ASSETS.headerImageUrl}
                        alt="Franciscan Columbarium Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = PDF_ASSETS.headerImageBase64
                        }}
                    />
                </div>
                <div className="flex-1 pt-0">
                    <p className="font-extrabold text-[14pt] m-0 p-0 leading-tight">
                        FRANCISCAN COLUMBARIUM <span className="text-[11pt] font-bold">A Ministry of</span>
                    </p>
                    <p className="text-[11pt] m-0">The Order of Friars Minor (S) Ltd Co & GST Reg No.</p>
                    <p className="text-[11pt] font-bold m-0">2010163236M</p>
                    <p className="text-[10pt] m-0">5 Bukit Batok East Ave 2, Singapore 659918</p>
                    <p className="text-[10pt] m-0">Tel: 6560-6361  Fax : 6566-2852</p>
                    <p className="text-[10pt] m-0">Email:franciscan.columbarium@gmail.com</p>
                </div>
            </div>

            {/* Title Row */}
            <div className="flex justify-between items-baseline mb-4">
                <h1 className="text-[20pt] font-bold ml-12">"Gates of Life" Application Form</h1>
                <div className="text-[12pt] flex gap-2">
                    <span className="font-bold">Reference No :</span>
                    <span className="font-bold">{application.code || 'GOL-95'}</span>
                </div>
            </div>

            {/* Instruction Text */}
            <div className="space-y-4 text-[11pt] mb-4">
                <p>
                    For a minimum donation of $300 per name and prevailing GST, you can have the name(s) of your deceased
                    relatives and friends engraved onto the "Gates of Life" at the main entrance of the Columbarium at St Mary of
                    the Angels. They will be remembered in the prayers and masses of the Franciscan Community.
                </p>
                <p>
                    If you would like to remember your deceased relatives and friends in this special way, please complete and
                    return this form, together with your donation, to the Franciscan columbarium office.
                </p>
                <div className="border-t border-black pt-2">
                    <p>
                        Please note that each brick can hold <strong>two (2) names.</strong> Where the deceased are husband & wife, the two names can be
                        engraved on the same brick if requested by the applicant. In this case, please use one form for both names and tick the
                        'request' box. In all other cases, the position and combination of names are entirely at the discretion of the Friar in
                        charge of columbarium and a separate form must be completed for each name.
                    </p>
                </div>
            </div>

            {/* Engraving Section */}
            <div className="mb-6">
                <p className="font-bold mb-0">Name(s) to be engraved on <span className="underline italic">Gates of Life</span>:</p>
                <p className="text-[10pt] ml-4 mb-2">Please write clearly in block letters and underline surname(s)</p>

                <div className="space-y-2 ml-4">
                    {engravingEntries.slice(0, 2).map((entry: any, i: number) => (
                        <div key={i} className="flex items-end gap-2">
                            <span className="w-4">{i + 1}.</span>
                            <div className="flex-1 border-b border-black font-bold text-[13pt] h-6">
                                {entry.name || ''}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 mt-4">
                    <div className="w-6 h-6 border-2 border-black flex items-center justify-center">
                        {application.requestSameBrick && <span className="text-[14pt] font-bold">✓</span>}
                    </div>
                    <p className="text-[10pt] font-bold">
                        I confirm that the abovenamed are husband and wife and request that the names be engraved on the
                        same brick (please tick if applicable).
                    </p>
                </div>
            </div>

            {/* Applicant Details */}
            <div className="mb-4">
                <p className="font-bold mb-4">Details of Applicant :</p>

                <div className="space-y-2">
                    <div className="flex items-end gap-2">
                        <span className="w-24">Name :</span>
                        <div className="flex-1 border-b border-black font-semibold text-[12pt] h-6 px-2">
                            {applicant.name || ''}
                        </div>
                    </div>

                    <div className="flex items-end gap-2 text-[11pt]">
                        <span className="w-24">Address :</span>
                        <div className="flex-1 flex border-b border-black h-6 px-1">
                            <span className="mr-2 uppercase">Block</span>
                            <span className="font-bold mr-8">{addr.line1 || addr.no || ''}</span>
                            <span className="font-bold mr-6">{addr.line2 || ''}</span>
                            <span className="font-bold">
                                {addr.city ? (addr.city.toString().startsWith('#') ? addr.city : `# ${addr.city}`) : ''}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-end gap-2 text-[11pt]">
                        <span className="w-24"></span>
                        <div className="flex-1 flex border-b border-black h-6 px-1">
                            <span className="w-1/2 font-bold italic">Singapore</span>
                            <div className="flex gap-4 ml-auto">
                                <span>Postal :</span>
                                <span className="w-24 font-bold">{addr.state || ''}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-end gap-4">
                        <div className="flex-1 flex items-end gap-2">
                            <span className="whitespace-nowrap">Tel No (HP):</span>
                            <div className="flex-1 border-b border-black h-6 px-2 font-semibold">{applicant.mobileNo || ''}</div>
                        </div>
                        <div className="flex-1 flex items-end gap-2">
                            <span>Home :</span>
                            <div className="flex-1 border-b border-black h-6 px-2 font-semibold">{applicant.homeTelNo || ''}</div>
                        </div>
                        <div className="flex-1 flex items-end gap-2">
                            <span>Office :</span>
                            <div className="flex-1 border-b border-black h-6 px-2 font-semibold">{applicant.officeTelNo || ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Donation Note Box */}
            <div className="border border-black p-2 mb-4">
                <p className="m-0 font-bold text-[11pt]">Enclosed is my donation of:</p>
                <div className="flex justify-between items-baseline">
                    <p className="m-0 text-[10pt]">(Cheques to be crossed and payable to:</p>
                    <p className="m-0 font-bold text-[11pt] flex-1 text-center">The Order of Friars Minor (S) Ltd - Columbarium)</p>
                    <p className="m-0 text-[10pt]">)</p>
                </div>
            </div>

            {/* Payment Table */}
            <table className="w-full border-collapse border border-black mb-1">
                <thead>
                    <tr className="border-b border-black">
                        <th className="border-r border-black p-1 text-[11pt] font-bold w-[12%]">Date</th>
                        <th className="border-r border-black p-1 text-[11pt] font-bold w-[15%]">Inv / Receipt</th>
                        <th className="border-r border-black p-1 text-[11pt] font-bold w-[35%]">Description</th>
                        <th className="border-r border-black p-1 text-[11pt] font-bold w-[13%]">Amount</th>
                        <th className="border-r border-black p-1 text-[11pt] font-bold w-[10%]">GST</th>
                        <th className="p-1 text-[11pt] font-bold w-[15%]">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-black h-9">
                        <td className="border-r border-black px-2 py-1 text-[11pt]">{fDate(invoice.invoiceDate)}</td>
                        <td className="border-r border-black px-2 py-1 text-[11pt] font-bold">{invoice.invoiceNo}</td>
                        <td className="border-r border-black px-2 py-1 text-[11pt] font-bold uppercase">{application.code}</td>
                        <td className="border-r border-black px-2 py-1 text-right text-[11pt]">$ {normalizeAmount(invoice.lineTotalAmount || (invoice.invoiceTotalAmount ? invoice.invoiceTotalAmount - invoice.taxAmount : null) || payment.subtotal)}</td>
                        <td className="border-r border-black px-2 py-1 text-right text-[11pt]">$ {normalizeAmount(invoice.taxAmount || payment.taxAmount)}</td>
                        <td className="px-2 py-1 text-right text-[11pt] font-bold">$ {normalizeAmount(invoice.invoiceTotalAmount || payment.totalAmount)}</td>
                    </tr>
                    <tr className="h-9">
                        <td className="border-r border-black px-2 py-1 text-[11pt]">{fDate(receipt.receiptDate)}</td>
                        <td className="border-r border-black px-2 py-1 text-[11pt] font-bold">{receipt.receiptNo}</td>
                        <td className="border-r border-black px-2 py-1 flex justify-between">
                            <span className="text-[11pt]">Payment - {receipt.paymentModeLabel || 'Cash'}</span>
                            {receipt.paymentModeDocNo && <span className="text-[11pt] italic mr-2">Ref: {receipt.paymentModeDocNo}</span>}
                        </td>
                        <td className="border-r border-black px-2 py-1"></td>
                        <td className="border-r border-black px-2 py-1"></td>
                        <td className="px-2 py-1 text-right text-[11pt] font-bold">
                            {(receipt.payingAmount || invoice.invoiceTotalAmount || payment.paidAmount || payment.totalAmount) ? '- ' : ''}$ {normalizeAmount(receipt.payingAmount || invoice.invoiceTotalAmount || payment.paidAmount || payment.totalAmount)}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* PDPA Consent */}
            <div className="text-[10pt] leading-none mb-8">
                <p className="m-0">By submitting this form, I consent to my personal data being collected, used or disclosed by the Order of Friars Minor</p>
                <p className="m-0">(S) Ltd in accordance with its Personal Data Protection Policy Statement which may be found at</p>
                <p className="m-0">www.franciscans.sg</p>
            </div>

            {/* Signature Footer */}
            <div className="mt-8 space-y-2">
                <div className="flex gap-2 items-end">
                    <span className="font-bold">Name :</span>
                    <div className="w-[300px] border-b border-black h-5 font-bold px-2">{applicant.name}</div>
                </div>
                <div className="flex gap-2 items-end">
                    <span className="font-bold">Date:</span>
                    <div className="w-[150px] border-b border-black h-5 px-2 font-bold">{fDate(application.bookingDate)}</div>
                </div>
            </div>
        </div>
    )
}

function normalizeAmount(val: any): string {
    if (val === undefined || val === null) return '0.00';
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
