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
    const metadata = data.metadata ?? {};
    const hasInvoice = Boolean((metadata.hasInvoice ?? true) && invoice?.invoiceNo);
    const hasReceipt = Boolean((metadata.hasReceipt ?? true) && receipt?.receiptNo);

    // Format date helper
    const fDate = (d: any) => d ? formatDate(d) : '';

    return (
        <div className="w-full max-w-[210mm] mx-auto bg-white p-12 shadow-lg text-black font-serif print:shadow-none print:p-0" id="gol-agreement-template">
            {/* Increased font size for visibility for older persons */}
            <div className="text-[14px] leading-snug">

                {/* Header */}
                <div className="flex items-start gap-6 mb-8">
                    <div className="w-32 h-32 flex-shrink-0 border border-black p-1 bg-white">
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
                    <div className="flex-1 pt-2">
                        <h1 className="font-bold text-xl uppercase leading-tight">
                            FRANCISCAN COLUMBARIUM A Ministry of
                        </h1>
                        <p className="text-base">The Order of Friars Minor (S) Ltd Co & GST Reg No.</p>
                        <p className="text-base font-bold">2010163236M</p>
                        <p className="text-base">5 Bukit Batok East Ave 2, Singapore 659918</p>
                        <p className="text-base">Tel: 6560-6361 Fax : 6566-2852</p>
                        <p className="text-base">Email: franciscan.columbarium@gmail.com</p>
                    </div>
                </div>

                {/* Title and Ref No */}
                <div className="flex items-end justify-between mb-8 border-b-2 border-black pb-2">
                    <h2 className="text-2xl font-bold text-center flex-1">
                        "Gates of Life" Application Form
                    </h2>
                    <div className="text-lg">
                        <span className="font-bold mr-2">Reference No :</span>
                        <span className="font-bold border-b border-black px-2">{application.code || 'N/A'}</span>
                    </div>
                </div>

                {/* Body Text - Slightly larger for readability */}
                <div className="space-y-4 text-justify mb-8 text-base">
                    <p>
                        For a minimum donation of $300 per name and prevailing GST, you can
                        have the name(s) of your deceased relatives and friends engraved onto
                        the "Gates of Life" at the main entrance of the Columbarium at St Mary
                        of the Angels. They will be remembered in the prayers and masses of
                        the Franciscan Community.
                    </p>
                    <p>
                        If you would like to remember your deceased relatives and friends in
                        this special way, please complete and return this form, together with
                        your donation, to the Franciscan columbarium office.
                    </p>
                    <p>
                        Please note that each brick can hold <strong>two</strong> (2) names.
                        Where the deceased are husband & wife, the two names can be engraved
                        on the same brick if requested by the applicant. In this case, please
                        use one form for both names and tick the "request" box. In all other
                        cases, the position and combination of names are entirely at the
                        discretion of the Friar in charge of columbarium and a separate form
                        must be completed for each name.
                    </p>
                </div>

                <div className="border-b border-black mb-8"></div>

                {/* Names Section */}
                <div className="mb-8 p-4 border border-gray-200 rounded-lg">
                    <div className="mb-4">
                        <span className="font-bold text-lg">
                            Name(s) to be engraved on <em className="italic">Gates of Life</em>:
                        </span>
                        <div className="text-sm font-bold text-gray-600">
                            Please write clearly in block letters and underline surname(s)
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        {(engraving.entries && engraving.entries.length > 0 ? engraving.entries : [{ name: '' }, { name: '' }]).map((entry: any, idx: number) => (
                            <div key={idx} className="flex items-end">
                                <span className="w-8 font-bold text-lg">{idx + 1}.</span>
                                <div className="flex-1 border-b-2 border-black px-2 py-1 text-xl font-bold uppercase tracking-wide">
                                    {entry.name || ''}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-start gap-4 p-2 bg-gray-50 rounded">
                        <div className="w-6 h-6 border-2 border-black flex-shrink-0 mt-0.5 flex items-center justify-center bg-white">
                            {application.requestSameBrick && <span className="text-black font-bold">X</span>}
                        </div>
                        <p className="text-base leading-snug">
                            I confirm that the abovenamed are husband and wife and request that
                            the names be engraved on the{' '}
                            <span className="font-bold">
                                same brick (please tick if applicable).
                            </span>
                        </p>
                    </div>
                </div>

                {/* Details of Applicant */}
                <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-white">
                    <h3 className="font-bold text-lg mb-4 border-b border-gray-300 pb-1">Details of Applicant :</h3>

                    <div className="space-y-4">
                        <div className="flex items-baseline">
                            <span className="w-40 font-bold text-base">Name :</span>
                            <div className="flex-1 border-b border-black px-2 text-lg font-semibold">
                                {applicant.name || 'N/A'}
                            </div>
                        </div>

                        <div className="flex items-baseline">
                            <span className="w-40 font-bold text-base">Address :</span>
                            <div className="flex-1 border-b border-black px-2 flex justify-between text-base">
                                <span className="font-bold mr-2">Block:</span>
                                <span className="flex-1">{applicant.addressDetails?.no || '-'}</span>
                                <span className="mx-2 font-bold">No:</span>
                                <span className="flex-1">{applicant.addressDetails?.line1 || '-'}</span>
                                <span className="mx-2 font-bold">Street:</span>
                                <span className="flex-[3]">{applicant.addressDetails?.line2 || '-'}</span>
                                <span className="mx-2 font-bold">Unit:</span>
                                <span className="flex-1">{applicant.addressDetails?.city || '-'}</span>
                            </div>
                        </div>

                        <div className="flex items-baseline">
                            <span className="w-40"></span>
                            <div className="flex-1 border-b border-black px-2 flex text-base">
                                <span className="flex-1 font-semibold">{applicant.addressDetails?.country || 'Singapore'}</span>
                                <span className="mr-2 font-bold">Postal :</span>
                                <span className="w-32 font-bold border-l border-black pl-2 tracking-widest">{applicant.addressDetails?.state || '-'}</span>
                            </div>
                        </div>

                        <div className="flex items-baseline">
                            <span className="w-40 font-bold text-base">Tel No (HP):</span>
                            <div className="w-48 border-b border-black px-2 text-center font-bold text-lg">
                                {applicant.mobileNo || '-'}
                            </div>
                            <span className="mx-4 font-bold text-base">Home :</span>
                            <div className="w-40 border-b border-black text-center text-lg">{applicant.homeTelNo || '-'}</div>
                            <span className="mx-4 font-bold text-base">Office :</span>
                            <div className="flex-1 border-b border-black text-center text-lg">{applicant.officeTelNo || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Payment Section */}
                <div className="border-2 border-black mb-6 rounded-sm">
                    <div className="p-3 border-b-2 border-black bg-gray-50">
                        <p className="text-base italic">Enclosed is my donation of:</p>
                        <p className="text-sm">
                            (Cheques to be crossed and payable to:{' '}
                            <span className="font-bold ml-4 text-base">
                                The Order of Friars Minor (S) Ltd - Columbarium)
                            </span>
                        </p>
                    </div>

                    <table className="w-full text-base border-collapse">
                        <thead>
                            <tr className="border-b-2 border-black bg-gray-100">
                                <th className="border-r border-black p-2 text-left w-32 font-bold">
                                    Date
                                </th>
                                <th className="border-r border-black p-2 text-left w-32 font-bold">
                                    Inv / Receipt
                                </th>
                                <th className="border-r border-black p-2 text-left font-bold">
                                    Description
                                </th>
                                <th className="border-r border-black p-2 text-right w-32 font-bold">
                                    Amount
                                </th>
                                <th className="border-r border-black p-2 text-right w-24 font-bold">
                                    GST
                                </th>
                                <th className="p-2 text-right w-32 font-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Row 1: Invoice */}
                            <tr className="border-b border-black">
                                <td className="border-r border-black p-2 font-mono">{hasInvoice ? fDate(invoice.invoiceDate) : ''}</td>
                                <td className="border-r border-black p-2 font-bold">{hasInvoice ? (invoice.invoiceNo || '') : ''}</td>
                                <td className="border-r border-black p-2">{hasInvoice ? (application.code || '') : ''}</td>
                                <td className="border-r border-black p-2 text-right font-mono">{hasInvoice ? `$ ${normalizeAmount(invoice.lineTotalAmount)}` : ''}</td>
                                <td className="border-r border-black p-2 text-right font-mono">{hasInvoice ? `$ ${normalizeAmount(invoice.taxAmount)}` : ''}</td>
                                <td className="p-2 text-right font-bold font-mono">{hasInvoice ? `$ ${normalizeAmount(invoice.invoiceTotalAmount)}` : ''}</td>
                            </tr>
                            {/* Row 2: Receipt/Payment */}
                            <tr>
                                <td className="border-r border-black p-2 font-mono">{hasReceipt ? fDate(receipt.receiptDate) : ''}</td>
                                <td className="border-r border-black p-2 font-bold">{hasReceipt ? (receipt.receiptNo || '') : ''}</td>
                                <td className="border-r border-black p-2 relative h-16">
                                    <div className="absolute inset-0 p-2 flex flex-col justify-between">
                                        <span className="text-xs text-gray-500 uppercase">Payment Mode</span>
                                        <span className="font-bold text-center border border-black rounded px-1 self-end bg-yellow-50">{hasReceipt ? (receipt.paymentModeLabel || '') : ''}</span>
                                    </div>
                                </td>
                                <td className="border-r border-black p-2"></td>
                                <td className="border-r border-black p-2"></td>
                                <td className="p-2 text-right flex flex-col justify-end h-full">
                                    <div className="text-[10px] text-gray-500 uppercase text-right">Paid Amount</div>
                                    <span className="font-black text-lg font-mono tracking-tighter">{hasReceipt ? `$ ${normalizeAmount(receipt.payingAmount)}` : ''}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Consent and Signature */}
                <div className="space-y-10">
                    <p className="text-sm text-justify italic font-serif leading-tight text-gray-700">
                        By submitting this form, I consent to my personal data being
                        collected, used or disclosed by the Order of Friars Minor (S) Ltd in
                        accordance with its Personal Data Protection Policy Statement which
                        may be found at www.franciscans.sg
                    </p>

                    <div className="max-w-md ml-auto">
                        <div className="border-b-2 border-black w-full mb-4"></div>

                        <div className="grid grid-cols-[100px_1fr] gap-4 text-lg">
                            <span className="font-bold">Name :</span>
                            <span className="font-bold border-b border-dotted border-gray-400">{applicant.name || ''}</span>

                            <span className="font-bold">Date:</span>
                            <span className="border-b border-dotted border-gray-400">{new Date().toLocaleDateString('en-GB')}</span>
                        </div>
                    </div>
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
