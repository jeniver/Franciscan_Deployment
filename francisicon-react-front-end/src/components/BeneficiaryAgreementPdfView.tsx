import React from 'react'
import { PDF_ASSETS, AGREEMENT_DEFAULTS } from './common/FranciscanLogo'
import addressUtils from '../utils/addressUtils'

interface BeneficiaryAgreementData {
    applicationNumber?: string
    application?: {
        applicationNumber?: string
        agreementDate?: string
    }
    applicant?: {
        name?: string
        idNo?: string
        address?: string
        addressNo?: string
        addressLine1?: string
        addressLine2?: string
        addressCity?: string
        addressState?: string
        addressCountry?: string
        mobileNo?: string
        email?: string
        homeTelNo?: string
        officeTelNo?: string
        isCatholic?: boolean
    }
    beneficiary?: {
        name?: string
        idNo?: string
        dateOfBirth?: string
        sex?: string
        relationshipToApplicant?: string
        isCatholic?: boolean
    }
    niche?: {
        number?: string
        chapelName?: string
    }
}

interface BeneficiaryAgreementProps {
    data: BeneficiaryAgreementData
    title?: string
    footerLabel?: string
    beneficiaryIndex?: number
}

const TableRow = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={'flex border-b border-black last:border-b-0 ' + className}>
        {children}
    </div>
)

const LabelCell = ({ children, width = 'w-32', className = '' }: { children?: React.ReactNode; width?: string; className?: string }) => (
    <div className={width + ' border-r border-black p-1 pl-2 text-[10.5px] font-medium flex-shrink-0 flex items-center ' + className}>
        {children}
    </div>
)

const ValueCell = ({ children, className = '', width = 'flex-1' }: { children?: React.ReactNode; className?: string; width?: string }) => (
    <div className={width + ' p-1 pl-2 text-[10.5px] flex items-center ' + className}>{children}</div>
)

export function BeneficiaryAgreement({
    data,
    title = "Insertion of 2nd Beneficiary",
    footerLabel = '("*The 2nd Beneficiary")',
    beneficiaryIndex = 1
}: BeneficiaryAgreementProps) {
    const {
        application,
        applicant,
        beneficiary: dataBeneficiary,
        niche
    } = data

    // Support both passed beneficiary and array-indexed beneficiary
    const beneficiaries = (data as any).beneficiaries || []
    const beneficiary = dataBeneficiary || (beneficiaryIndex < beneficiaries.length ? beneficiaries[beneficiaryIndex] : beneficiaries[0])

    const applicantAddressLines = addressUtils.buildAddressLines(applicant || {})
    const applicationNumber = application?.applicationNumber || data.applicationNumber || ''
    const agreementDate = application?.agreementDate || ''
    const chapelName = niche?.chapelName || ''
    const nicheNumber = niche?.number || ''

    // Format date of birth to match image (e.g., 03-Nov-1932)
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return ''
        try {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) return dateStr
            const day = date.getDate().toString().padStart(2, '0')
            const month = date.toLocaleString('en-GB', { month: 'short' })
            const year = date.getFullYear()
            return `${day}-${month}-${year}`
        } catch {
            return dateStr
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 font-serif text-gray-900 print:bg-white print:py-0">
            <div data-pdf-page className="max-w-[210mm] mx-auto bg-white shadow-lg p-12 mb-8 min-h-[297mm] print:shadow-none print:mb-0">

                {/* Header Section */}
                <header className="relative flex justify-center items-center mb-8 h-24">
                    <div className="flex-1 text-center">
                        <h1 className="text-3xl tracking-[0.1em] font-bold uppercase mb-2">
                            Franciscan Columbarium
                        </h1>
                        <div className="flex items-center justify-center gap-2">
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: `
                  <svg width="24" height="20" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 15C10 10 15 5 20 15C25 25 30 20 30 15" stroke="black" stroke-width="2" />
                    <path d="M10 15C10 20 5 25 0 15" stroke="black" stroke-width="2" />
                    <path d="M30 15C30 10 35 5 40 15" stroke="black" stroke-width="2" />
                  </svg>
                `}}
                            />
                            <span className="text-xl italic uppercase tracking-widest ml-2">Agreement</span>
                        </div>
                    </div>
                    <div className="w-24 h-20 flex-shrink-0">
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
                </header>

                {/* Title */}
                <div className="mb-6">
                    <h2 className="font-bold uppercase tracking-wide text-base">
                        {title}
                    </h2>
                </div>

                {/* Between Section */}
                <div className="mb-6 text-[10.5px] leading-snug">
                    <div className="flex mb-1">
                        <span className="w-20 font-bold">Between</span>
                        <span className="mr-8">:</span>
                        <p className="flex-1 text-justify">
                            The Order of Friars Minor (Singapore) Limited, a company limited by guarantee of {AGREEMENT_DEFAULTS.orderAddress} ("The Order").
                            Telephone : {AGREEMENT_DEFAULTS.orderTel}, Fax : 6566-2852, E-mail : {AGREEMENT_DEFAULTS.orderEmail}
                        </p>
                    </div>
                </div>

                {/* And Section with Application Code */}
                <div className="flex items-center justify-between mb-4 text-[10.5px]">
                    <div className="flex items-center font-bold">
                        <span className="w-20">And</span>
                        <span className="mr-1">:</span>
                    </div>
                    <div className="flex items-center">
                        <span className="font-bold mr-2 uppercase tracking-tight">Application Code :</span>
                        <span className="font-bold">{applicationNumber}</span>
                    </div>
                </div>

                {/* Applicant Table */}
                <div className="border border-black mb-0 text-[10.5px]">
                    <TableRow>
                        <LabelCell width="w-32">Name</LabelCell>
                        <ValueCell>{applicant?.name || ''}</ValueCell>
                        <LabelCell width="w-40" className="border-l border-black">NRIC/Passport No.</LabelCell>
                        <ValueCell width="w-40" className="border-l border-black">{applicant?.idNo || ''}</ValueCell>
                    </TableRow>
                    <div className="flex border-b border-black">
                        <LabelCell className="h-[78px] border-b-0" width="w-32">Address</LabelCell>
                        <div className="flex-1 flex flex-col">
                            <div className="flex border-b border-black h-[26px]">
                                <ValueCell className="flex-1">{applicantAddressLines[0] || ''}</ValueCell>
                                <LabelCell width="w-40" className="border-l border-black border-r-0">Mobile No.</LabelCell>
                                <ValueCell width="w-40" className="border-l border-black">{applicant?.mobileNo || ''}</ValueCell>
                            </div>
                            <div className="flex border-b border-black h-[26px]">
                                <ValueCell className="flex-1">{applicantAddressLines[1] || ''}</ValueCell>
                                <LabelCell width="w-40" className="border-l border-black border-r-0">Home Tel.</LabelCell>
                                <ValueCell width="w-40" className="border-l border-black">{applicant?.homeTelNo || ''}</ValueCell>
                            </div>
                            <div className="flex h-[26px]">
                                <ValueCell className="flex-1">{applicantAddressLines[2] || ''}</ValueCell>
                                <LabelCell width="w-40" className="border-l border-black border-r-0">Office Tel.</LabelCell>
                                <ValueCell width="w-40" className="border-l border-black">{applicant?.officeTelNo || ''}</ValueCell>
                            </div>
                        </div>
                    </div>
                    <TableRow>
                        <LabelCell width="w-32">e-mail</LabelCell>
                        <ValueCell>{applicant?.email || ''}</ValueCell>
                        <LabelCell width="w-40" className="border-l border-black">Catholic</LabelCell>
                        <ValueCell width="w-40" className="border-l border-black">{applicant?.isCatholic ? 'Yes' : 'No'}</ValueCell>
                    </TableRow>
                </div>
                <div className="border border-black border-t-0 p-1 text-[9px] mb-8 italic">
                    ("*The Applicant/Nominee")
                </div>

                {/* Location Details Header */}
                <div className="mb-4">
                    <div className="flex items-center gap-4 text-[10.5px] mt-2 mb-4">
                        <span>In the Chapel of :</span>
                        <span className="min-w-[150px] border-b border-black text-center font-bold pb-0.5">{chapelName}</span>
                        <span>Niche No:</span>
                        <span className="min-w-[100px] border-b border-black text-center font-bold pb-0.5">{nicheNumber}</span>
                        <span className="flex-1">of an urn(s) containing the ashes of</span>
                    </div>
                </div>

                {/* Beneficiary Table */}
                <div className="border border-black mb-0 text-[10.5px]">
                    <TableRow>
                        <LabelCell width="w-12" className="justify-center border-r border-black font-bold">1</LabelCell>
                        <LabelCell width="w-32">Name</LabelCell>
                        <ValueCell>{beneficiary?.name || ''}</ValueCell>
                        <LabelCell width="w-40" className="border-l border-black">NRIC/Passport No.</LabelCell>
                        <ValueCell width="w-40" className="border-l border-black">{beneficiary?.idNo || ''}</ValueCell>
                    </TableRow>
                    <TableRow>
                        <LabelCell width="w-12" className="border-r border-black"></LabelCell>
                        <LabelCell width="w-32">Date of Birth</LabelCell>
                        <ValueCell>{formatDate(beneficiary?.dateOfBirth)}</ValueCell>
                        <LabelCell width="w-40" className="border-l border-black">Sex</LabelCell>
                        <ValueCell width="w-40" className="border-l border-black">{beneficiary?.sex || ''}</ValueCell>
                    </TableRow>
                    <TableRow>
                        <LabelCell width="w-12" className="border-r border-black"></LabelCell>
                        <LabelCell width="w-32">Relationship to Applicant</LabelCell>
                        <ValueCell>{beneficiary?.relationshipToApplicant || ''}</ValueCell>
                        <LabelCell width="w-40" className="border-l border-black">Catholic</LabelCell>
                        <ValueCell width="w-40" className="border-l border-black">{beneficiary?.isCatholic ? 'Yes' : 'No'}</ValueCell>
                    </TableRow>
                </div>
                <div className="border border-black border-t-0 p-1 text-[9px] mb-8 italic">
                    {footerLabel}
                </div>

                {/* Consent Text */}
                <div className="text-[10px] text-justify leading-relaxed mb-6">
                    <p className="mb-2 italic">
                        By submitting this form, I consent to any my personal data being collected, used or disclosed by the Order of Friars Minor (S) Ltd in
                        accordance with its Personal Data Protection Policy statement which may be found at <span className="underline">www.franciscans.sg</span>.
                        Additionally, where personal data of any third party is provided by you to OFMS you represent and warrant that:
                    </p>
                    <ul className="list-disc pl-10 mb-4 space-y-1">
                        <li>you have the authority of that third party to disclose the said personal data to OFMS</li>
                        <li>the third party is aware that his/her personal data is being disclosed to OFMS</li>
                        <li>such personal data is true, current and accurate</li>
                    </ul>
                    <p className="italic">
                        The Conditions and the Regulations attached form an integral part of this Agreement .
                    </p>
                </div>

                {/* Signatures */}
                <div className="border border-black p-6 mt-8">
                    <div className="grid grid-cols-2 gap-20">
                        <div className="flex flex-col">
                            <div className="flex-1 min-h-[60px]">
                                <p className="text-[10.5px] font-bold">The Applicant /Nominee Personally :</p>
                            </div>
                            <div className="border-b border-black mb-4"></div>
                            <div className="text-[10.5px] space-y-2">
                                <div className="flex">
                                    <span className="w-32">Name :</span>
                                    <span className="font-bold">{applicant?.name || ''}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-32">Agreement Date :</span>
                                    <span>{agreementDate}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex-1 min-h-[60px]">
                                <p className="text-[10.5px] italic mb-1">For and on Behalf of</p>
                                <p className="text-[10.5px] font-bold">The Order of Friars Minor (Singapore) Limited</p>
                            </div>
                            <div className="border-b border-black mb-4"></div>
                            <div className="text-[10.5px] space-y-1">
                                <p className="font-bold">Fr Justin Lim</p>
                                <p className="italic">Friar - Manager</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
