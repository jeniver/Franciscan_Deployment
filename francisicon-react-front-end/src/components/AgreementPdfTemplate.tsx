import React from 'react';

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

  return (
    <div className="w-full h-full bg-white" style={{ width: '51em', height: '66em', fontSize: '1em' }}>
      {/* Header Image */}
      <div className="relative w-full" style={{ height: '6.6em' }}>
        <img 
          src="/logo.png" 
          alt="Header" 
          className="absolute object-contain"
          style={{
            clip: 'rect(5.958333em, 47.93333em, 63.04167em, 3.145833em)',
            width: '100%',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Content Area */}
      <div className="relative" style={{ width: '51em' }}>
        {/* Title */}
        <div className="absolute whitespace-nowrap" style={{ left: '8.7833em', top: '6.2977em' }}>
          <span className="text-2xl font-bold text-black leading-none tracking-tight">F</span>
          <span className="text-xl font-bold text-black leading-none tracking-tight" style={{ wordSpacing: '0.0245em' }}>RANCISCAN </span>
          <span className="text-2xl font-bold text-black leading-none" style={{ letterSpacing: '0.0004em' }}>C</span>
          <span className="text-xl font-bold text-black leading-none">OLUMBARIUM &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '22.4833em', top: '9.1587em' }}>
          <span className="text-lg italic text-black leading-none">AGREEMENT &nbsp;</span>
        </div>

        {/* Between Section */}
        <div className="absolute whitespace-nowrap" style={{ left: '3.0833em', top: '12.5357em' }}>
          <span className="text-sm font-bold text-black leading-none">Between &nbsp;</span>
        </div>
        <div className="absolute whitespace-nowrap" style={{ left: '12.0833em', top: '12.5357em' }}>
          <span className="text-sm font-bold text-black leading-none">:</span>
        </div>

        {/* Order Information */}
        <div className="absolute" style={{ left: '3.1875em', top: '13.6998em', width: '44.7458em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0068em' }}>
            The Order of Friars Minor (Singapore) Limited, a company limited by guarantee of 5 Bukit Batok East Ave 2, Singapore 659918 &nbsp;
          </span>
        </div>
        <div className="absolute" style={{ left: '3.1875em', top: '14.6998em', width: '44.7458em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0053em' }}>
            ("The Order"). Co & GST Reg No. 2010163236M. Tel:6560-6361, HP:9774-7053, e-mail:franciscan.columbarium@gmail.com &nbsp;
          </span>
        </div>

        {/* Applicant Section */}
        <div className="absolute whitespace-nowrap" style={{ left: '3.3292em', top: '16.1373em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0002em' }}>And : &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '3.8125em', top: '17.554em' }}>
          <span className="text-sm leading-relaxed">Name &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '40.9458em', top: '16.1441em' }}>
          <span className="text-sm font-bold text-black leading-none">{applicationCode || ''} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '34.2417em', top: '16.2207em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0002em' }}>Application Code : &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '35.9958em', top: '17.5107em' }}>
          <span className="text-sm font-bold text-black leading-none">{applicantIdNo} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '10.3125em', top: '17.6107em' }}>
          <span className="text-sm font-bold text-black leading-none" style={{ wordSpacing: '0.0064em' }}>{applicantName} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '28.1958em', top: '17.5873em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0005em' }}>NRIC/Passport No. &nbsp;</span>
        </div>

        {/* Address */}
        <div className="absolute whitespace-nowrap" style={{ left: '10.3792em', top: '19.1191em' }}>
          <span className="text-sm font-bold text-black leading-none" style={{ wordSpacing: '0.0001em' }}>{applicantAddressLines[0] || ''} &nbsp;</span>
        </div>
        <div className="absolute whitespace-nowrap" style={{ left: '10.3792em', top: '20.1191em' }}>
          <span className="text-sm font-bold text-black leading-none">{applicantAddressLines[1] || ''} &nbsp;</span>
        </div>
        <div className="absolute whitespace-nowrap" style={{ left: '10.3792em', top: '21.1191em' }}>
          <span className="text-sm font-bold text-black leading-none" style={{ wordSpacing: '0.0001em' }}>{applicantAddressLines[2] || ''} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '3.8125em', top: '19.304em' }}>
          <span className="text-sm leading-relaxed">Address &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '35.9958em', top: '19.4441em' }}>
          <span className="text-sm font-bold text-black leading-none">{applicantMobileNo} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '28.1958em', top: '19.754em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0003em' }}>Mobile No. &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '28.1958em', top: '21.254em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '-0.0168em' }}>Home Tel. &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '28.1958em', top: '23.004em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '-0.0103em' }}>Office Tel. &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '28.1958em', top: '24.554em' }}>
          <span className="text-sm leading-relaxed">Catholic &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '3.75em', top: '24.3248em' }}>
          <span className="text-sm leading-relaxed">e-mail &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '10.25em', top: '24.3607em' }}>
          <a href={applicantEmail ? `mailto:${applicantEmail}` : '#'} target="_blank" className="no-underline">
            <span className="text-sm font-bold text-black leading-none">{applicantEmail || ''} &nbsp;</span>
          </a>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '36.1625em', top: '24.4941em' }}>
          <span className="text-sm font-bold text-black leading-none" style={{ letterSpacing: '-0.0286em' }}>{applicantIsCatholicText} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '4.4292em', top: '25.654em' }}>
          <span className="text-sm italic leading-relaxed" style={{ wordSpacing: '-0.0424em' }}>("The Applicant") &nbsp;</span>
        </div>

        {/* Consideration Section */}
        <div className="absolute whitespace-nowrap" style={{ left: '1.6292em', top: '27.0207em', width: '46.3042em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0003em' }}>
            In consideration of the sum of <span className="text-sm leading-relaxed">SGD{formatCurrency(considerationSum)}</span> from the Applicant as the fee ("fee"), for which the Order acknowledges receipt, &nbsp;
          </span>
        </div>

        <div className="absolute" style={{ left: '3.6292em', top: '28.0707em', width: '44.3042em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0003em' }}>
            the Order agrees to the interment and storage at the Franciscan Columbarium located at 5&nbsp;
            <span style={{ wordSpacing: '0.1725em' }}>&nbsp;</span>
            <span style={{ wordSpacing: '-0.0071em' }}>Bukit East Ave 2, Singapore &nbsp;</span>
          </span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '3.6292em', top: '29.0707em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0002em' }}>659918 ("The Columbarium") &nbsp;</span>
        </div>

        {/* Chapel and Niche */}
        <div className="absolute whitespace-nowrap" style={{ left: '14.7375em', top: '30.2607em' }}>
          <span className="text-sm font-bold text-black leading-none" style={{ wordSpacing: '-0.0398em' }}>{chapelName} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '29.2708em', top: '30.4441em' }}>
          <span className="text-sm font-bold text-black leading-none">{nicheNumber} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '3.8125em', top: '30.4707em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0003em' }}>In the Chapel of : &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '23.3125em', top: '30.4707em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0003em' }}>Niche No: &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '33.3125em', top: '30.4707em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0003em' }}>of an urn(s) containing the ashes of &nbsp;</span>
        </div>

        {/* Beneficiaries */}
        <div className="absolute whitespace-nowrap" style={{ left: '13.2292em', top: '31.6774em' }}>
          <span className="text-sm font-bold text-black leading-none" style={{ wordSpacing: '0.0001em' }}>{beneficiary1?.name || ''} &nbsp;</span>
        </div>

        {/* Storage Dates */}
        <div className="absolute whitespace-nowrap" style={{ left: '15.0792em', top: '31.1524em' }}>
          <span className="text-sm font-bold text-black leading-none">{storageFrom || ''} &nbsp;</span>
        </div>
        <div className="absolute whitespace-nowrap" style={{ left: '38.3125em', top: '31.1524em' }}>
          <span className="text-sm font-bold text-black leading-none">{storageTo || ''} &nbsp;</span>
        </div>

        {/* Invoice Section */}
        <div className="absolute whitespace-nowrap" style={{ left: '3.7125em', top: '33.9191em' }}>
          <span className="text-sm font-bold text-black leading-none">Date &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '32.025em', top: '33.904em' }}>
          <span className="text-sm leading-relaxed">Amount &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '31.675em', top: '35.2748em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0001em' }}>$ {formatCurrency(nicheAmount)} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '35.9em', top: '33.904em' }}>
          <span className="text-sm italic leading-relaxed">GST &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '13.525em', top: '33.9816em' }}>
          <span className="text-sm font-bold text-black leading-none" style={{ wordSpacing: '0.0004em' }}>Inv/ Receipt &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '20.5875em', top: '33.9816em' }}>
          <span className="text-sm font-bold text-black leading-none">Description &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '44.8292em', top: '34.029em' }}>
          <span className="text-sm leading-relaxed">Total &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '3.5875em', top: '35.3149em' }}>
          <span className="text-sm font-bold text-black leading-none">{invoiceDate1 || ''} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '3.775em', top: '36.9399em' }}>
          <span className="text-sm font-bold text-black leading-none">{invoiceDate2 || ''} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '42.7333em', top: '35.3373em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0001em' }}>$ {formatCurrency(totalAmount)} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '13.4625em', top: '35.3774em' }}>
          <span className="text-sm font-bold text-black leading-none">{invoiceNo1 || ''} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '36.1083em', top: '35.3998em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0002em' }}>$ {formatCurrency(taxAmount)} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '37.7542em', top: '40.154em' }}>
          <span className="text-sm leading-relaxed">Total &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '20.5875em', top: '35.5248em' }}>
          <span className="text-sm leading-relaxed">{nicheNumber || ''}-1 &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '27.4625em', top: '36.7748em' }}>
          <span className="text-sm leading-relaxed">{paymentMethod || 'Cash'} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '40.9917em', top: '36.8415em' }}>
          <span className="text-sm leading-relaxed">-</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '43.1083em', top: '36.8373em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0002em' }}>$ {formatCurrency(totalAmount)} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '44.2958em', top: '39.8373em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0001em' }}>$ {formatCurrency(balance)} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '13.525em', top: '37.0024em' }}>
          <span className="text-sm font-bold text-black leading-none">{invoiceNo2 || ''} &nbsp;</span>
        </div>

        {/* Deceased Information */}
        <div className="absolute whitespace-nowrap" style={{ left: '5.125em', top: '46.8123em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0004em' }}>Name of Deceased &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '28.25em', top: '46.8123em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0001em' }}>Death Certificate No. &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '38.6875em', top: '46.8123em' }}>
          <span className="text-sm leading-relaxed" style={{ wordSpacing: '0.0004em' }}>Date of Deceased &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '39.25em', top: '48.2857em' }}>
          <span className="text-sm font-bold text-black leading-none">{firstDeceasedDate || ''} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '39.3125em', top: '49.5982em' }}>
          <span className="text-sm font-bold text-black leading-none">{secondDeceasedDate || ''} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '5.125em', top: '48.3482em' }}>
          <span className="text-sm font-bold text-black leading-none" style={{ wordSpacing: '0.0025em' }}>{firstDeceasedName || ''} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '28.2583em', top: '48.3482em' }}>
          <span className="text-sm font-bold text-black leading-none">{firstDeceasedDeathCert || ''} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '5.25em', top: '49.5982em' }}>
          <span className="text-sm font-bold text-black leading-none" style={{ wordSpacing: '0.0001em' }}>{secondDeceasedName || ''} &nbsp;</span>
        </div>

        <div className="absolute whitespace-nowrap" style={{ left: '28.2583em', top: '49.5982em' }}>
          <span className="text-sm font-bold text-black leading-none">{secondDeceasedDeathCert || ''} &nbsp;</span>
        </div>
      </div>
    </div>
  );
};


