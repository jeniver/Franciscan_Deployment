import React from 'react';
import { PDF_ASSETS } from '../constants/pdfConstants';

interface AgreementPdfTemplateProps {
  data: {
    applicationCode?: string;
    appliedDate?: string;
    agreementDate?: string;
    applicant?: {
      name?: string;
      idNo?: string;
      mobileNo?: string;
      email?: string;
      isCatholic?: boolean;
      address?: string;
      addressNo?: string;
      addressLine1?: string;
      addressLine2?: string;
      addressCity?: string;
      addressState?: string;
      addressCountry?: string;
    };
    nominee?: any;
    nominee2?: any;
    beneficiaries?: Array<{ name?: string }>;
    niche?: {
      chapelName?: string;
      number?: string;
      totalAmount?: number;
      location?: {
        chapel?: {
          chapelName?: string;
        };
      };
    };
    invoice?: {
      invoiceNo?: string;
      invoiceDate?: string;
      nicheAmount?: number;
      taxAmount?: number;
      totalAmount?: number;
      invoicePayingAmount?: number;
      paymentMethod?: string;
      balance?: number;
      description?: string;
    };
    deceased?: {
      deceased1?: {
        name?: string;
        deathCertificateNo?: string;
        dateOfDeath?: string;
        internmentDate?: string;
      };
      deceased2?: {
        name?: string;
        deathCertificateNo?: string;
        dateOfDeath?: string;
        internmentDate?: string;
      };
    };
    storage?: {
      fromDate?: string;
      toDate?: string;
    };
  };
}

// Helper function to format currency
const formatCurrency = (amount: any) => {
  const num = parseFloat(amount || 0);
  return num.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Build address lines from entity - direct mapping without conversion
const buildAddressLinesFromEntity = (entity: any): string[] => {
  // Check for structured address fields first
  const addressNo = entity.addressNo || entity.address?.no || '';
  const addressLine1 = entity.addressLine1 || entity.address?.line1 || '';
  const addressLine2 = entity.addressLine2 || entity.address?.line2 || '';
  const addressCity = entity.addressCity || entity.address?.city || '';
  const addressState = entity.addressState || entity.address?.state || '';
  const addressCountry = entity.addressCountry || entity.address?.country || '';

  // If structured fields exist, map them directly
  if (addressNo || addressLine1 || addressLine2 || addressCity || addressState || addressCountry) {
    const line1Parts: string[] = [];
    if (addressNo) {
      line1Parts.push(addressNo.trim());
    }
    if (addressLine1) {
      line1Parts.push(addressLine1.trim());
    }
    if (addressLine2) {
      line1Parts.push(addressLine2.trim());
    }
    const line1 = line1Parts.join(' ').trim();
    const line2 = addressCity || '';
    const line3 = [addressCountry, addressState].filter(Boolean).join(' ').trim();
    return [line1, line2, line3];
  }

  // If only raw address string exists, use it as-is (no parsing/conversion)
  const rawAddress = entity?.address || '';
  if (rawAddress) {
    // Return raw address as first line, empty for others
    return [rawAddress.trim(), '', ''];
  }

  return ['', '', ''];
};

// Format date
const formatDate = (dateStr: string | null | undefined): string => {
  return dateStr || '';
};

export const AgreementPdfTemplate: React.FC<AgreementPdfTemplateProps> = ({ data }) => {
  const {
    applicationCode,
    appliedDate,
    agreementDate,
    applicant,
    nominee,
    nominee2,
    beneficiaries,
    niche,
    invoice,
    deceased,
    storage
  } = data;

  // Format address for display
  const applicantAddressLines = buildAddressLinesFromEntity(applicant || {});
  
  // Get consideration sum
  const considerationSum = invoice?.totalAmount || invoice?.invoicePayingAmount || niche?.totalAmount || 7000;
  
  // Get chapel name and niche number
  const chapelName = niche?.chapelName || niche?.location?.chapel?.chapelName || '';
  const nicheNumber = niche?.number || '';
  
  // Get agreement date for signature
  const footerAgreementDate = formatDate(agreementDate || appliedDate);

  // Convenience variables for main parties
  const applicantName = applicant?.name || '';
  const applicantIdNo = applicant?.idNo || '';
  const applicantMobileNo = applicant?.mobileNo || '';
  const applicantEmail = applicant?.email || '';
  const applicantIsCatholicText = applicant?.isCatholic ? 'Yes' : 'No';

  // Beneficiaries shown in the header block (up to 2)
  const beneficiary1 = (beneficiaries && beneficiaries[0]) || null;
  const beneficiary2 = (beneficiaries && beneficiaries[1]) || null;

  // Deceased information
  const deceased1 = deceased?.deceased1 || null;
  const deceased2 = deceased?.deceased2 || null;
  const firstIntermentDate = formatDate(deceased1?.internmentDate);
  const secondIntermentDate = formatDate(deceased2?.internmentDate);
  const firstDeceasedName = deceased1?.name || '';
  const secondDeceasedName = deceased2?.name || '';
  const firstDeceasedDeathCert = deceased1?.deathCertificateNo || '';
  const secondDeceasedDeathCert = deceased2?.deathCertificateNo || '';
  const firstDeceasedDate = formatDate(deceased1?.dateOfDeath);
  const secondDeceasedDate = formatDate(deceased2?.dateOfDeath);

  // Storage information
  const storageFrom = formatDate(storage?.fromDate);
  const storageTo = formatDate(storage?.toDate);

  // Payment/Invoice information
  const invoiceNo1 = invoice?.invoiceNo || '';
  const invoiceNo2 = invoice?.invoiceNo || '';
  const invoiceDate1 = formatDate(invoice?.invoiceDate);
  const invoiceDate2 = formatDate(invoice?.invoiceDate);
  const nicheAmount = invoice?.nicheAmount || invoice?.totalAmount || 0;
  const taxAmount = invoice?.taxAmount || 0;
  const totalAmount = invoice?.totalAmount || invoice?.invoicePayingAmount || 0;
  const paymentMethod = invoice?.paymentMethod || 'Cash';
  const balance = invoice?.balance || 0;


  const TableRow = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => (
  <div className={`flex border-b border-black last:border-b-0 ${className}`}>
    {children}
  </div>
)
const LabelCell = ({
  children,
  width = 'w-32',
  className = '',
}: {
  children: React.ReactNode
  width?: string
  className?: string
}) => (
  <div
    className={`${width} border-r border-black p-1 pl-2 text-sm font-medium flex-shrink-0 ${className}`}
  >
    {children}
  </div>
)
const ValueCell = ({
  children,
  className = '',
  width = 'flex-1',
}: {
  children: React.ReactNode
  className?: string
  width?: string
}) => (
  <div className={`${width} p-1 pl-2 text-sm font-serif ${className}`}>
    {children}
  </div>
)
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-black border-t-0 px-2 py-1 text-sm font-bold bg-gray-50">
    {children}
  </div>
)

  return (
    <div className="min-h-screen bg-gray-100 py-8 font-sans text-gray-900">
      {/* Page 1 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-8 mb-8 min-h-[297mm]">
        {/* Header */}
        <header className="flex justify-between items-start mb-6">
          <div className="flex-1 text-center pt-2">
            <h1
              className="text-2xl tracking-[0.25em] mb-1 uppercase"
              style={{
                fontFamily: 'Times New Roman, Georgia, serif',
                fontVariant: 'small-caps',
              }}
            >
              Franciscan Columbarium
            </h1>
            <div className="flex items-center justify-center gap-3 mb-2">
              <span
                className="text-lg"
                style={{
                  fontFamily: 'Times New Roman, Georgia, serif',
                }}
              >
                ❧
              </span>
              <span
                className="text-base tracking-[0.15em] uppercase"
                style={{
                  fontFamily: 'Times New Roman, Georgia, serif',
                }}
              >
                Agreement
              </span>
              <span
                className="text-lg"
                style={{
                  fontFamily: 'Times New Roman, Georgia, serif',
                }}
              >
                ❧
              </span>
            </div>
          </div>
          <div className="w-32 h-32 flex-shrink-0">
            <img
              src={PDF_ASSETS.headerImageBase64}
              alt="Franciscan Columbarium Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </header>

        {/* Between Section */}
        <div className="mb-4 text-sm">
          <div className="flex mb-1">
            <span className="w-24 font-medium">Between</span>
            <span>:</span>
          </div>
          <p className="text-justify leading-snug mb-2">
            The Order of Friars Minor (Singapore) Limited, a company limited by
            guarantee of 5 Bukit Batok East Ave 2, Singapore 659918 ("The
            Order"). Co & GST Reg No. 201016323M. Tel:6560-6361, HP:9774-7053,
            e-mail:franciscan.columbarium@gmail.com
          </p>
        </div>

        {/* Applicant Section */}
        <div className="flex justify-between items-end mb-1 text-sm">
          <div className="flex gap-2">
            <span className="font-medium">And :</span>
          </div>
          <div className="font-medium">
            Application Code :{' '}
            <span className="font-normal font-serif ml-2">{applicationCode || '0000-0'}</span>
          </div>
        </div>

        <div className="border border-black mb-0">
          <TableRow>
            <LabelCell>Name</LabelCell>
            <ValueCell>{applicantName}</ValueCell>
            <LabelCell width="w-32" className="border-l border-black">
              NRIC/Passport No.
            </LabelCell>
            <ValueCell width="w-48" className="border-l border-black">
              {applicantIdNo}
            </ValueCell>
          </TableRow>

          <div className="flex border-b border-black">
            <LabelCell className="h-24 border-b-0">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-8">
                <ValueCell className="flex-1">{applicantAddressLines[0]}</ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Mobile No.
                </LabelCell>
                <ValueCell width="w-48" className="border-l border-black">
                  {applicantMobileNo}
                </ValueCell>
              </div>
              <div className="flex border-b border-black h-8">
                <ValueCell className="flex-1">{applicantAddressLines[1]}</ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Home Tel.
                </LabelCell>
                <ValueCell
                  width="w-48"
                  className="border-l border-black"
                >{applicantAddressLines[2]}</ValueCell>
              </div>
              <div className="flex h-8">
                <ValueCell className="flex-1">{applicantAddressLines[2]}</ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Office Tel.
                </LabelCell>
                <ValueCell
                  width="w-48"
                  className="border-l border-black"
                >
                  {' '}
                </ValueCell>
              </div>
            </div>
          </div>

          <TableRow>
            <LabelCell>e-mail</LabelCell>
            <ValueCell>{applicantEmail}</ValueCell>
            <LabelCell width="w-32" className="border-l border-black">
              Catholic
            </LabelCell>
            <ValueCell width="w-48" className="border-l border-black">
              {applicantIsCatholicText}
            </ValueCell>
          </TableRow>
        </div>
        <SectionLabel>("The Applicant")</SectionLabel>

        {/* Consideration Text */}
        <div className="my-4 text-sm text-justify leading-relaxed">
          In consideration of the sum of{' '}
          <span className="inline-block w-32 border-b border-black text-center font-serif">
            $ {formatCurrency(considerationSum)}
          </span>{' '}
          from the Applicant as the fee ("fee"), for which the Order
          acknowledges receipt, the Order agrees to the interment and storage at
          the Franciscan Columbarium located at 5 Bukit East Ave 2, Singapore
          659918 ("The Columbarium")
        </div>

        {/* Chapel Info */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <span>In the Chapel of :</span>
          <span className="flex-1 border-b-2 border-black font-serif px-2 text-center">
            {chapelName}
          </span>
          <span>Niche No:</span>
          <span className="w-24 border-b-2 border-black font-serif px-2 text-center">
            {nicheNumber}
          </span>
          <span>of an urn(s) containing the ashes of</span>
        </div>

        {/* Nominee 1 */}
        <div className="flex border border-black mb-0">
          <div className="w-8 border-r border-black flex items-center justify-center font-bold bg-gray-50">
            1
          </div>
          <div className="flex-1">
            <TableRow>
              <LabelCell width="w-40">Name</LabelCell>
              <ValueCell>{nominee?.name || ''}</ValueCell>
              <LabelCell width="w-32" className="border-l border-black">
                NRIC/Passport No.
              </LabelCell>
              <ValueCell width="w-40" className="border-l border-black">
                {nominee?.idNo || ''}
              </ValueCell>
            </TableRow>
            <TableRow>
              <LabelCell width="w-40">Date of Birth</LabelCell>
              <ValueCell>{nominee?.dateOfBirth || ''}</ValueCell>
              <LabelCell width="w-32" className="border-l border-black">
                Sex
              </LabelCell>
              <ValueCell width="w-40" className="border-l border-black">
                {nominee?.sex || ''}
              </ValueCell>
            </TableRow>
            <TableRow>
              <LabelCell width="w-40">Relationship to Applicant</LabelCell>
              <ValueCell>{nominee?.relationshipToApplicant || ''}</ValueCell>
              <LabelCell width="w-32" className="border-l border-black">
                Catholic
              </LabelCell>
              <ValueCell width="w-40" className="border-l border-black">
                {nominee?.isCatholic ? 'Yes' : 'No'}
              </ValueCell>
            </TableRow>
            <div className="flex">
              <LabelCell width="w-40" className="text-xs text-gray-500">
                Relationship to Nominee1
              </LabelCell>
              <ValueCell className="bg-gray-100">
                {' '}
              </ValueCell>
              <LabelCell
                width="w-32"
                className="border-l border-black text-xs text-gray-500"
              >
                Relationship to Nominee2
              </LabelCell>
              <ValueCell
                width="w-40"
                className="border-l border-black bg-gray-100"
              >
                {' '}
              </ValueCell>
            </div>
          </div>
        </div>
        <div className="h-2"></div>

        {/* Nominee 2 */}
        <div className="flex border border-black mb-4">
          <div className="w-8 border-r border-black flex items-center justify-center font-bold bg-gray-50">
            2
          </div>
          <div className="flex-1">
            <TableRow>
              <LabelCell width="w-40">Name</LabelCell>
              <ValueCell>{nominee2?.name || ''}</ValueCell>
              <LabelCell width="w-32" className="border-l border-black">
                NRIC/Passport No.
              </LabelCell>
              <ValueCell width="w-40" className="border-l border-black">
                {nominee2?.idNo || ''}
              </ValueCell>
            </TableRow>
            <TableRow>
              <LabelCell width="w-40">Date of Birth</LabelCell>
              <ValueCell>{nominee2?.dateOfBirth || ''}</ValueCell>
              <LabelCell width="w-32" className="border-l border-black">
                Sex
              </LabelCell>
              <ValueCell width="w-40" className="border-l border-black">
                {nominee2?.sex || ''}
              </ValueCell>
            </TableRow>
            <TableRow>
              <LabelCell width="w-40">Relationship to Applicant</LabelCell>
              <ValueCell>{nominee2?.relationshipToApplicant || ''}</ValueCell>
              <LabelCell width="w-32" className="border-l border-black">
                Catholic
              </LabelCell>
              <ValueCell width="w-40" className="border-l border-black">
                {nominee2?.isCatholic ? 'Yes' : 'No'}
              </ValueCell>
            </TableRow>
            <div className="flex">
              <LabelCell width="w-40" className="text-xs text-gray-500">
                Relationship to Nominee1
              </LabelCell>
              <ValueCell className="bg-gray-100">
                {' '}
              </ValueCell>
              <LabelCell
                width="w-32"
                className="border-l border-black text-xs text-gray-500"
              >
                Relationship to Nominee2
              </LabelCell>
              <ValueCell
                width="w-40"
                className="border-l border-black bg-gray-100"
              >
                {' '}
              </ValueCell>
            </div>
          </div>
        </div>

        <SectionLabel>("The Beneficiary")</SectionLabel>

        {/* Consent Text */}
        <div className="mt-4 text-sm text-justify mb-6">
          <p className="mb-2">
            By submitting this form, I consent to any my personal data being
            collected, used or disclosed by the Order of Friars Minor (S) Ltd in
            accordance with its Personal Data Protection Policy statement which
            may be found at{' '}
            <span className="underline">www.franciscans.sg</span>. Additionally,
            where personal data of any third party is provided by you to OFMS
            you represent and warrant that:
          </p>
          <ul className="list-disc pl-8 space-y-1">
            <li>
              you have the authority of that third party to disclose the said
              personal data to OFMS
            </li>
            <li>
              the third party is aware that his/her personal data is being
              disclosed to OFMS
            </li>
            <li>such personal data is true, current and accurate</li>
          </ul>
          <p className="mt-2">
            The form overleaf, the Conditions and the Regulations attached form
            an integral part of this Agreement.
          </p>
        </div>

        {/* Signatures */}
        <div className="border border-black p-4 mt-auto">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="mb-12 font-medium">The Applicant Personally :</p>
              <div className="border-b border-black mb-2"></div>
              <div className="flex mb-2">
                <span className="w-24">Name :</span>
                <span className="font-serif">{applicantName}</span>
              </div>
              <div className="flex">
                <span className="w-24">Agreement Date :</span>
                <span className="font-serif">{footerAgreementDate}</span>
              </div>
            </div>
            <div>
              <p className="mb-1">For and on Behalf of</p>
              <p className="mb-12 font-medium">
                The Order of Friars Minor (Singapore) Limited
              </p>
              <div className="border-b border-black mb-2"></div>
              <div className="mb-2">
                <span className="font-serif">Fr Justin Lim</span>
              </div>
              <div>
                <span>Friar - Manager</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page 2 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-8 min-h-[297mm]">
        {/* Contact Nominee 1 */}
        <p className="mb-2 text-sm font-medium">
          The Applicant's 1st nominee for contact purposes ("Nominee") is :
        </p>
        <div className="border border-black mb-6">
          <TableRow>
            <LabelCell>Name</LabelCell>
            <ValueCell>{nominee?.name || ''}</ValueCell>
            <LabelCell width="w-32" className="border-l border-black">
              NRIC/Passport No.
            </LabelCell>
            <ValueCell width="w-40" className="border-l border-black">
              {nominee?.idNo || ''}
            </ValueCell>
          </TableRow>

          <div className="flex border-b border-black">
            <LabelCell className="h-24 border-b-0">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-8">
                <ValueCell className="flex-1">
                  {buildAddressLinesFromEntity(nominee || {})[0]}
                </ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Mobile No.
                </LabelCell>
                <ValueCell width="w-40" className="border-l border-black">
                  {nominee?.mobileNo || ''}
                </ValueCell>
              </div>
              <div className="flex border-b border-black h-8">
                <ValueCell className="flex-1">{buildAddressLinesFromEntity(nominee || {})[1]}</ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Home Tel.
                </LabelCell>
                <ValueCell
                  width="w-40"
                  className="border-l border-black"
                >{buildAddressLinesFromEntity(nominee || {})[2]}</ValueCell>
              </div>
              <div className="flex h-8">
                <ValueCell className="flex-1">{buildAddressLinesFromEntity(nominee || {})[2]}</ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Office Tel.
                </LabelCell>
                <ValueCell
                  width="w-40"
                  className="border-l border-black"
                >
                  {' '}
                </ValueCell>
              </div>
            </div>
          </div>

          <TableRow>
            <LabelCell>e-mail</LabelCell>
            <ValueCell>{nominee?.email || ''}</ValueCell>
            <LabelCell width="w-40" className="border-l border-black">
              Relationship to Applicant
            </LabelCell>
            <ValueCell width="w-32" className="border-l border-black">
              {nominee?.relationshipToApplicant || ''}
            </ValueCell>
          </TableRow>
        </div>

        {/* Contact Nominee 2 */}
        <p className="mb-2 text-sm font-medium">
          The Applicant's 2nd nominee for contact purposes ("Nominee") is
        </p>
        <div className="border border-black mb-6">
          <TableRow>
            <LabelCell>Name</LabelCell>
            <ValueCell>{nominee2?.name || ''}</ValueCell>
            <LabelCell width="w-32" className="border-l border-black">
              NRIC/Passport No.
            </LabelCell>
            <ValueCell width="w-40" className="border-l border-black">
              {nominee2?.idNo || ''}
            </ValueCell>
          </TableRow>

          <div className="flex border-b border-black">
            <LabelCell className="h-24 border-b-0">Address</LabelCell>
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-black h-8">
                <ValueCell className="flex-1">
                  {buildAddressLinesFromEntity(nominee2 || {})[0]}
                </ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Mobile No.
                </LabelCell>
                <ValueCell width="w-40" className="border-l border-black">
                  {nominee2?.mobileNo || ''}
                </ValueCell>
              </div>
              <div className="flex border-b border-black h-8">
                <ValueCell className="flex-1">{buildAddressLinesFromEntity(nominee2 || {})[1]}</ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Home Tel.
                </LabelCell>
                <ValueCell
                  width="w-40"
                  className="border-l border-black"
                >{buildAddressLinesFromEntity(nominee2 || {})[2]}</ValueCell>
              </div>
              <div className="flex h-8">
                <ValueCell className="flex-1">{buildAddressLinesFromEntity(nominee2 || {})[2]}</ValueCell>
                <LabelCell
                  width="w-32"
                  className="border-l border-black border-r-0"
                >
                  Office Tel.
                </LabelCell>
                <ValueCell
                  width="w-40"
                  className="border-l border-black"
                >
                  {' '}
                </ValueCell>
              </div>
            </div>
          </div>

          <TableRow>
            <LabelCell>e-mail</LabelCell>
            <ValueCell>{nominee2?.email || ''}</ValueCell>
            <LabelCell width="w-40" className="border-l border-black">
              Relationship to Applicant
            </LabelCell>
            <ValueCell width="w-32" className="border-l border-black">
              {nominee2?.relationshipToApplicant || ''}
            </ValueCell>
          </TableRow>
        </div>

        {/* Chapel Details Table */}
        <div className="border border-black mb-8">
          <div className="flex border-b border-black">
            <div className="w-40 p-1 pl-2 text-sm font-medium border-r border-black">
              Chapel Name
            </div>
            <div className="flex-1 p-1 pl-2 text-sm font-serif border-r border-black">
              {chapelName}
            </div>
            <div className="w-40 p-1 pl-2 text-sm font-medium border-r border-black">
              Niche No
            </div>
            <div className="w-40 p-1 pl-2 text-sm font-serif">{nicheNumber}</div>
          </div>
          <div className="flex border-b border-black">
            <div className="w-40 p-1 pl-2 text-sm font-medium border-r border-black">
              1st Interment Date
            </div>
            <div className="flex-1 p-1 pl-2 text-sm font-serif border-r border-black">
              {firstIntermentDate}
            </div>
            <div className="w-40 p-1 pl-2 text-sm font-medium border-r border-black">
              2nd Interment Date
            </div>
            <div className="w-40 p-1 pl-2 text-sm font-serif">{secondIntermentDate}</div>
          </div>
          <div className="flex">
            <div className="w-40 p-1 pl-2 text-sm font-medium border-r border-black">
              Storage Period From
            </div>
            <div className="flex-1 p-1 pl-2 text-sm font-serif border-r border-black">
              {storageFrom}
            </div>
            <div className="w-40 p-1 pl-2 text-sm font-medium border-r border-black">
              Storage Period To
            </div>
            <div className="w-40 p-1 pl-2 text-sm font-serif">{storageTo}</div>
          </div>
        </div>

        {/* Payment Table */}
        <div className="border border-black mb-12">
          {/* Header */}
          <div className="flex border-b border-black bg-gray-50 font-medium text-sm">
            <div className="w-32 p-1 pl-2 border-r border-black">Date</div>
            <div className="w-32 p-1 pl-2 border-r border-black">
              Inv/ Receipt
            </div>
            <div className="flex-1 p-1 pl-2 border-r border-black">
              Description
            </div>
            <div className="w-24 p-1 pl-2 border-r border-black text-right">
              Amount
            </div>
            <div className="w-24 p-1 pl-2 border-r border-black">GST</div>
            <div className="w-24 p-1 pl-2 text-right pr-2">Total</div>
          </div>

          {/* Row 1 */}
          <div className="flex border-b border-black text-sm h-8">
            <div className="w-32 p-1 pl-2 border-r border-black">
              {invoiceDate1}
            </div>
            <div className="w-32 p-1 pl-2 border-r border-black">{invoiceNo1}</div>
            <div className="flex-1 p-1 pl-2 border-r border-black flex justify-end pr-2">
              {invoice?.description || 'Niche Fee'}
            </div>
            <div className="w-24 p-1 pl-2 border-r border-black text-right">
              $ {formatCurrency(nicheAmount)}
            </div>
            <div className="w-24 p-1 pl-2 border-r border-black text-right">
              $ {formatCurrency(taxAmount)}
            </div>
            <div className="w-24 p-1 pl-2 text-right pr-2">$ {formatCurrency(totalAmount)}</div>
          </div>

          {/* Row 2 */}
          <div className="flex border-b border-black text-sm h-8">
            <div className="w-32 p-1 pl-2 border-r border-black">
              {invoiceDate2}
            </div>
            <div className="w-32 p-1 pl-2 border-r border-black">{invoiceNo2}</div>
            <div className="flex-1 p-1 pl-2 border-r border-black flex justify-end pr-2">
              {paymentMethod}
            </div>
            <div className="w-24 p-1 pl-2 border-r border-black bg-gray-100">
              {' '}
            </div>
            <div className="w-24 p-1 pl-2 border-r border-black flex items-center justify-center">
              -
            </div>
            <div className="w-24 p-1 pl-2 text-right pr-2">$ {formatCurrency(balance)}</div>
          </div>

          {/* Empty Row */}
          <div className="flex border-b border-black text-sm h-8">
            <div className="w-32 border-r border-black"></div>
            <div className="w-32 border-r border-black"></div>
            <div className="flex-1 border-r border-black"></div>
            <div className="w-24 border-r border-black"></div>
            <div className="w-24 border-r border-black"></div>
            <div className="w-24"></div>
          </div>

          {/* Total Row */}
          <div className="flex text-sm h-8">
            <div className="w-32"></div>
            <div className="w-32"></div>
            <div className="flex-1"></div>
            <div className="w-24"></div>
            <div className="w-24 p-1 pr-4 text-right font-medium">Total</div>
            <div className="w-24 p-1 pl-2 text-right pr-2 border border-black border-t-0 border-r-0 border-b-0">
              $ {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>

        {/* Deceased Table */}
        <div className="border border-black">
          <div className="flex border-b border-black bg-gray-50 font-medium text-sm">
            <div className="flex-1 p-1 pl-2 border-r border-black">
              Name of Deceased
            </div>
            <div className="w-48 p-1 pl-2 border-r border-black">
              Death Certificate No.
            </div>
            <div className="w-48 p-1 pl-2">Date of Deceased</div>
          </div>
          <div className="flex border-b border-black text-sm h-8">
            <div className="flex-1 p-1 pl-2 border-r border-black">
              {firstDeceasedName}
            </div>
            <div className="w-48 p-1 pl-2 border-r border-black">{firstDeceasedDeathCert}</div>
            <div className="w-48 p-1 pl-2">{firstDeceasedDate}</div>
          </div>
          <div className="flex text-sm h-8">
            <div className="flex-1 p-1 pl-2 border-r border-black">
              {secondDeceasedName}
            </div>
            <div className="w-48 p-1 pl-2 border-r border-black">{secondDeceasedDeathCert}</div>
            <div className="w-48 p-1 pl-2">{secondDeceasedDate}</div>
          </div>
        </div>
      </div>
    </div>
  );
};