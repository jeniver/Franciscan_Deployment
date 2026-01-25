import { NicheAgreementError } from './nicheAgreementService';
import jsPDF from 'jspdf';

// PDF Template Service for generating attractive agreement and invoice templates
export const pdfTemplateService = {
    // Generate Agreement PDF Template
    generateAgreementTemplate: (data: any, baseUrl?: string): string => {
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

        // Helper function to format currency
        const formatCurrency = (amount: any) => {
            const num = parseFloat(amount || 0);
            return num.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        // Helper function to format address into lines
        const formatAddressLines = (address: string | null | undefined): string[] => {
            if (!address) return ['', '', ''];
            
            // Try to parse Singapore address format: "Blk XXX Street Name #XX-XX Singapore XXXXXX"
            const addressStr = address.trim();
            
            // Pattern 1: "Blk 343 Choa Chu Kang Loop #06-43, Singapore 680343" (handle "Blk" or "Bik" typos)
            const pattern1 = addressStr.match(/B[il]k\s+(\d+[A-Z]?)\s+(.+?)(?:,\s*Singapore\s+(\d+))?/i);
            if (pattern1) {
                // Normalize "Bik" to "Blk" for display
                const blockPart = `Blk ${pattern1[1]}`;
                const rest = pattern1[2].trim();
                const postalCode = pattern1[3] || '';
                
                // Check for unit number pattern #XX-XX
                const unitMatch = rest.match(/#(\d+-\d+)/);
                if (unitMatch) {
                    const unitPart = `#${unitMatch[1]}`;
                    const streetPart = rest.replace(/#\d+-\d+/, '').trim();
                    return [
                        `${blockPart} ${streetPart}`,
                        unitPart,
                        postalCode ? `Singapore ${postalCode}` : ''
                    ];
                } else {
                    // No unit number
                    return [
                        `${blockPart} ${rest}`,
                        '',
                        postalCode ? `Singapore ${postalCode}` : ''
                    ];
                }
            }
            
            // Pattern 2: Split by commas
            const parts = addressStr.split(',').map(p => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
                return [parts[0] || '', parts[1] || '', parts.slice(2).join(', ') || ''];
            } else if (parts.length === 2) {
                return [parts[0] || '', parts[1] || '', ''];
            } else {
                // Single line - try to split by common delimiters
                const line1 = addressStr;
                return [line1, '', ''];
            }
        };

        // Format address for display
        const applicantAddressLines = formatAddressLines(applicant?.address);
        const nominee1AddressLines = formatAddressLines(nominee?.address);
        const nominee2AddressLines = formatAddressLines(nominee2?.address);
        
        // Get consideration sum (total amount)
        const considerationSum = niche?.totalAmount || invoice?.totalAmount || invoice?.invoicePayingAmount || 0;
        
        // Get chapel name and niche number
        const chapelName = niche?.chapelName || niche?.location?.chapel?.chapelName || '';
        const nicheNumber = niche?.number || '';
        
        // Format dates (API returns in dd-MMM-yyyy format, keep as is)
        const formatDate = (dateStr: string | null | undefined): string => {
            return dateStr || '';
        };

        // Get interment dates from deceased data
        const firstIntermentDate = deceased?.deceased1?.internmentDate || '';
        const secondIntermentDate = deceased?.deceased2?.internmentDate || '';
        
        // Get storage period
        const storageFrom = storage?.storageFrom || '';
        const storageTo = storage?.storageTo || '';

        // Build beneficiaries HTML with numbering
        const beneficiariesHtml = (beneficiaries || []).map((ben: any, index: number) => {
            return `
    <table>
        <tr>
            <td style="width: 20px;">${index + 1}</td>
            <td class="label">Name</td>
            <td class="bold">${ben.name || ''}</td>
            <td class="label">NRIC/Passport No.</td>
            <td class="bold">${ben.idNo || ''}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label">Date of Birth</td>
            <td class="bold">${formatDate(ben.dateOfBirth)}</td>
            <td class="label">Sex</td>
            <td class="bold">${ben.sex || ''}</td>
        </tr>
        <tr>
            <td></td>
            <td class="label">Relationship to Applicant</td>
            <td class="bold">${ben.relationshipToApplicant || ''}</td>
            <td class="label">Catholic</td>
            <td class="bold">${ben.isCatholic ? 'Yes' : 'No'}</td>
        </tr>
    </table>`;
        }).join('');

        // Build nominees HTML with full address tables
        let nomineesHtml = '';
        if (nominee?.name) {
            nomineesHtml += `
    <div class="section-title">The Applicant's 1st nominee for contact purposes ("Nominee") is:</div>
    <table>
        <tr>
            <td class="label">Name</td>
            <td class="bold">${nominee.name}</td>
            <td class="label">NRIC/Passport No.</td>
            <td class="bold">${nominee.idNo || ''}</td>
        </tr>
        <tr>
            <td class="label" rowspan="2">Address</td>
            <td rowspan="2" class="bold">${nominee1AddressLines[0]}<br>${nominee1AddressLines[1]}<br>${nominee1AddressLines[2]}</td>
            <td class="label">Mobile No.</td>
            <td class="bold">${nominee.mobileNo || ''}</td>
        </tr>
        <tr>
            <td class="label">Relationship to Applicant</td>
            <td class="bold">${nominee.relationship || ''}</td>
        </tr>
        <tr>
            <td class="label">e-mail</td>
            <td class="bold">${nominee.email || ''}</td>
            <td class="label">Home/Office Tel.</td>
            <td>${nominee.homeTelNo || nominee.officeTelNo || ''}</td>
        </tr>
    </table>`;
        }
        
        if (nominee2?.name) {
            nomineesHtml += `
    <div class="section-title">The Applicant's 2nd nominee for contact purposes ("Nominee") is:</div>
    <table>
        <tr>
            <td class="label">Name</td>
            <td class="bold">${nominee2.name}</td>
            <td class="label">NRIC/Passport No.</td>
            <td class="bold">${nominee2.idNo || ''}</td>
        </tr>
        <tr>
            <td class="label" rowspan="2">Address</td>
            <td rowspan="2" class="bold">${nominee2AddressLines[0]}<br>${nominee2AddressLines[1]}<br>${nominee2AddressLines[2]}</td>
            <td class="label">Mobile No.</td>
            <td class="bold">${nominee2.mobileNo || ''}</td>
        </tr>
        <tr>
            <td class="label">Relationship to Applicant</td>
            <td class="bold">${nominee2.relationship || ''}</td>
        </tr>
        <tr>
            <td class="label">e-mail</td>
            <td class="bold">${nominee2.email || ''}</td>
            <td class="label">Home/Office Tel.</td>
            <td>${nominee2.homeTelNo || nominee2.officeTelNo || ''}</td>
        </tr>
    </table>`;
        }

        // Build Chapel/Niche/Interment/Storage table
        const chapelNicheTable = `
    <table>
        <tr>
            <td class="label">Chapel Name</td>
            <td class="bold">${chapelName}</td>
            <td class="label">Niche No</td>
            <td class="bold">${nicheNumber}</td>
        </tr>
        <tr>
            <td class="label">1st Interment Date</td>
            <td class="bold">${formatDate(firstIntermentDate)}</td>
            <td class="label">2nd Interment Date</td>
            <td class="bold">${formatDate(secondIntermentDate)}</td>
        </tr>
        <tr>
            <td class="label">Storage Period From</td>
            <td class="bold">${formatDate(storageFrom)}</td>
            <td class="label">Storage Period To</td>
            <td class="bold">${formatDate(storageTo)}</td>
        </tr>
    </table>`;

        // Build Deceased information table
        let deceasedTable = '';
        if (deceased?.deceased1?.name || deceased?.deceased2?.name) {
            deceasedTable = `
    <table>
        <tr class="label">
            <td>Name of Deceased</td>
            <td>Death Certificate No.</td>
            <td>Date of Deceased</td>
        </tr>
        ${deceased?.deceased1?.name ? `
        <tr>
            <td class="bold">${deceased.deceased1.name}</td>
            <td class="bold">${deceased.deceased1.deathCertificateNo || ''}</td>
            <td class="bold">${formatDate(deceased.deceased1.dateDied)}</td>
        </tr>` : ''}
        ${deceased?.deceased2?.name ? `
        <tr>
            <td class="bold">${deceased.deceased2.name}</td>
            <td class="bold">${deceased.deceased2.deathCertificateNo || ''}</td>
            <td class="bold">${formatDate(deceased.deceased2.dateDied)}</td>
        </tr>` : ''}
    </table>`;
        }

        // Build payment summary HTML with Total row
        let paymentSummaryHtml = '';
        if (invoice) {
            const invoiceDate = formatDate(invoice.invoiceDate);
            const receiptDate = formatDate(invoice.receiptDate);
            const invoiceNo = invoice.invoiceNo || '';
            const receiptNo = invoice.receiptNo || '';
            const amount = invoice.totalAmount || invoice.invoicePayingAmount || 0;
            const gst = invoice.taxAmount || 0;
            const total = invoice.receiptAmount || (amount + gst);
            const paymentMode = invoice.paymentMode || '';
            const refDocNumber = invoice.refDocNumber || applicationCode || '';

            paymentSummaryHtml = `
    <table>
        <tr class="label">
            <td>Date</td>
            <td>Inv/Receipt</td>
            <td>Description</td>
            <td>Amount</td>
            <td>GST</td>
            <td>Total</td>
        </tr>
        ${invoiceNo ? `
        <tr>
            <td>${invoiceDate}</td>
            <td>${invoiceNo}</td>
            <td>${refDocNumber}</td>
            <td>$ ${formatCurrency(amount)}</td>
            <td>$ ${formatCurrency(gst)}</td>
            <td class="bold">$ ${formatCurrency(total)}</td>
        </tr>` : ''}
        ${receiptNo ? `
        <tr>
            <td>${receiptDate}</td>
            <td>${receiptNo}</td>
            <td>${paymentMode}</td>
            <td></td>
            <td>-</td>
            <td class="bold">$ ${formatCurrency(total)}</td>
        </tr>` : ''}
        <tr>
            <td colspan="4" style="border:none;"></td>
            <td class="label">Total</td>
            <td class="bold">$ ${formatCurrency(total)}</td>
        </tr>
    </table>`;
        }

        // Get agreement date for signature
        const footerAgreementDate = formatDate(agreementDate || appliedDate);

        const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Franciscan Columbarium Agreement</title>
    <style>
        @page {
            size: A4;
            margin: 15mm 20mm;
        }

        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.2; 
            font-size: 11px; 
            color: #000; 
            margin: 0;
            padding: 15mm 20mm;
        }
        .header { text-align: center; margin-bottom: 10px; }
        .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
        .header h2 { margin: 0; font-style: italic; font-weight: normal; font-size: 16px; }
        .info-line { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th, td { border: 1px solid black; padding: 3px 5px; text-align: left; vertical-align: top; }
        .label { background-color: #f0f0f0; width: 20%; }
        .bold { font-weight: bold; }
        .no-border { border: none; }
        .section-title { font-weight: bold; text-decoration: underline; margin: 10px 0 5px 0; }
        .signature-section { margin-top: 20px; display: flex; justify-content: space-between; }
        .sig-box { width: 45%; }
        .underline { border-bottom: 1px solid black; min-height: 20px; margin-bottom: 5px; }
    </style>
</head>
<body>

    <div class="header">
        <h1>FRANCISCAN COLUMBARIUM</h1>
        <h2>AGREEMENT</h2>
    </div>

    <div class="info-line"><strong>Between:</strong> The Order of Friars Minor (Singapore) Limited, a company limited by guarantee of 5 Bukit Batok East Ave 2, Singapore 659918 ("The Order"). Co & GST Reg No. 2010163236M. Tel:6560-6361, HP:9774-7053, e-mail:franciscan.columbarium@gmail.com</div>
    <div class="info-line"><strong>And:</strong> <span style="float: right;">Application Code: <strong>${applicationCode || ''}</strong></span></div>

    <table>
        <tr>
            <td class="label">Name</td>
            <td class="bold">${applicant?.name || ''}</td>
            <td class="label">NRIC/Passport No.</td>
            <td class="bold">${applicant?.idNo || ''}</td>
        </tr>
        <tr>
            <td class="label" rowspan="3">Address</td>
            <td rowspan="3" class="bold">${applicantAddressLines[0]}<br>${applicantAddressLines[1]}<br>${applicantAddressLines[2]}</td>
            <td class="label">Mobile No.</td>
            <td class="bold">${applicant?.mobileNo || ''}</td>
        </tr>
        <tr>
            <td class="label">Home Tel.</td>
            <td>${applicant?.homeTelNo || ''}</td>
        </tr>
        <tr>
            <td class="label">Office Tel.</td>
            <td>${applicant?.officeTelNo || ''}</td>
        </tr>
        <tr>
            <td class="label">e-mail</td>
            <td class="bold">${applicant?.email || ''}</td>
            <td class="label">Catholic</td>
            <td class="bold">${applicant?.isCatholic ? 'Yes' : 'No'}</td>
        </tr>
    </table>
    <p>("The Applicant")</p>

    <p>In consideration of the sum of <strong>$ ${formatCurrency(considerationSum)}</strong> from the Applicant as the fee ("fee"), for which the Order acknowledges receipt, the Order agrees to the interment and storage at the Franciscan Columbarium located at 5 Bukit East Ave 2, Singapore 659918 ("The Columbarium") in the Chapel of: <strong>${chapelName}</strong>, Niche No: <strong>${nicheNumber}</strong> of an urn(s) containing the ashes of:</p>

    <div class="section-title">("The Beneficiary")</div>
    ${beneficiariesHtml}

    ${nomineesHtml}
    ${chapelNicheTable}
    ${deceasedTable}
    ${paymentSummaryHtml}

    <div class="signature-section">
        <div class="sig-box">
            <p>The Applicant Personally:</p>
            <div class="underline"></div>
            <p>Name: <strong>${applicant?.name || ''}</strong></p>
            <p>Agreement Date: <strong>${footerAgreementDate}</strong></p>
        </div>
        <div class="sig-box">
            <p>For and on Behalf of<br><strong>The Order of Friars Minor (Singapore) Limited</strong></p>
            <div class="underline"></div>
            <p><strong>Fr. Justin Lim</strong></p>
            <p>Friar - Manager</p>
        </div>
    </div>

</body>
</html>`;

        return template;
    },

    // Generate Invoice PDF Template
    generateInvoiceTemplate: (data: any): string => {
        const {
            applicationNumber,
            applicant,
            niche,
            invoice,
            printReady
        } = data;

        // Helper to format currency
        const formatCurrency = (amount: any) => {
            const num = parseFloat(amount || 0);
            return num.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        // Helper to format date
        const formatDate = (dateString: string) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
        };

        // Derived values
        const subTotal = invoice?.receiptAmount ? parseFloat(invoice.receiptAmount) : 0;
        const gstTotal = invoice?.taxAmount ? parseFloat(invoice.taxAmount) : 0;
        const totalAmount = invoice?.invoicePayingAmount ? parseFloat(invoice.invoicePayingAmount) : 0;

        // Calculate GST Rate
        const calculatedGstRate = subTotal > 0 ? (gstTotal / subTotal) * 100 : 9.0;
        const gstRateDisplay = calculatedGstRate.toFixed(1);

        // Construct Reference String (e.g. "St Agnes 3791 -")
        const referenceInfo = [niche?.wallName, niche?.number].filter(Boolean).join(' ');

        // Number to words converter
        const numberToWords = (n: any): string => {
            const num = Math.floor(parseFloat(n || 0));
            if (num === 0) return "Zero";

            const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
            const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

            const convertGroup = (val: number): string => {
                if (val >= 100) {
                    return a[Math.floor(val / 100)] + "Hundred " + (val % 100 !== 0 ? convertGroup(val % 100) : "");
                } else if (val >= 20) {
                    return b[Math.floor(val / 10)] + (val % 10 !== 0 ? "-" + a[val % 10].trim() + " " : " ");
                } else {
                    return a[val];
                }
            };

            const toWords = (amount: number): string => {
                if (amount === 0) return "";
                let str = "";
                if (amount >= 1000000) {
                    str += convertGroup(Math.floor(amount / 1000000)) + "Million ";
                    amount %= 1000000;
                }
                if (amount >= 1000) {
                    str += convertGroup(Math.floor(amount / 1000)) + "Thousand ";
                    amount %= 1000;
                }
                str += convertGroup(amount);
                return str.trim();
            };

            return toWords(num);
        };

        const amountInWords = numberToWords(totalAmount);

        const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${applicationNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            line-height: 1.3;
            color: #000;
            background: #fff;
            padding: 40px;
            max-width: 210mm;
            margin: 0 auto;
        }

        /* Utility for PDF layout */
        .layout-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-bottom: 20px;
        }
        .layout-table td {
            border: none;
            padding: 0;
            vertical-align: top;
        }

        /* Header Styles */
        .logo-box {
            width: 150px;
            height: 120px;
        }
        .logo-box img {
            max-width: 100%;
            height: auto;
        }
        
        .company-info {
            text-align: right;
            font-size: 9pt;
            line-height: 1.4;
        }
        .company-name {
            font-weight: bold;
            font-size: 11pt;
            text-transform: uppercase;
        }

        /* Tax Invoice Label */
        .tax-invoice-label {
            background-color: #000;
            color: #fff;
            padding: 8px 30px;
            font-weight: bold;
            font-size: 14pt;
            text-transform: uppercase;
            display: inline-block;
            margin-top: 20px;
            /* Ensure background prints */
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* Info Section Styles */
        .info-label {
            width: 80px;
            padding-right: 10px;
        }
        .info-colon {
            width: 10px;
            text-align: center;
        }
        .info-value {
            font-weight: normal;
        }
        
        .meta-label {
            width: 100px;
            text-align: left;
        }
        .meta-value {
            text-align: right;
            font-weight: bold;
        }

        /* Main Data Table */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            margin-top: 30px;
        }
        .data-table th {
            background-color: #000;
            color: #fff;
            padding: 8px 5px;
            text-align: center;
            font-weight: normal;
            font-size: 9pt;
            border: 1px solid #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .data-table td {
            padding: 8px 5px;
            border: 1px solid #000;
            font-size: 9pt;
            vertical-align: top;
            text-align: right;
        }
        
        .data-table td.align-left { text-align: left; padding-left: 10px; }
        .data-table td.align-center { text-align: center; }

        /* Totals Section */
        .totals-table {
            width: 300px;
            float: right;
            margin-top: 0px;
            margin-bottom: 30px;
            border-collapse: collapse;
        }
        .totals-table td {
            padding: 3px 0;
            text-align: right;
            border: none;
        }
        .totals-table .total-label {
            padding-right: 20px;
        }
        .totals-table .total-amount {
            font-weight: bold;
            width: 120px;
        }
        .totals-table .grand-total {
            font-weight: bold;
            font-size: 11pt;
            padding-top: 10px;
        }

        /* Words and Footer */
        .amount-words-section {
            clear: both;
            margin-top: 60px;
            margin-bottom: 40px;
        }
        .amount-words-section span {
            margin-left: 50px;
        }
        
        .system-text {
            font-size: 8pt;
            margin-top: 10px;
        }

        .footer {
            margin-top: 30px;
            font-size: 9pt;
        }
        .footer p { margin-bottom: 5px; }
        .bold { font-weight: bold; }
        
        .print-ready-banner {
            background-color: #d4edda;
            color: #155724;
            text-align: center;
            padding: 10px;
            margin-bottom: 20px;
            border: 1px solid #c3e6cb;
            border-radius: 4px;
        }

        @media print {
            body { padding: 0; margin: 0; }
            .print-ready-banner { display: none; }
        }
    </style>
</head>
<body>
    ${printReady?.invoiceReady ? '<div class="print-ready-banner">✓ Invoice Ready for Printing</div>' : ''}

    <!-- Header Layout Table -->
    <table class="layout-table">
        <tr>
            <td style="width: 40%;">
                <div class="logo-box">
                    <!-- Placeholder SVG Logo -->
                    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                       <rect width="100" height="100" fill="none" stroke="#000" stroke-width="2"/>
                       <path d="M20,80 L50,20 L80,80" fill="none" stroke="#000" stroke-width="2"/>
                       <circle cx="50" cy="50" r="10" fill="#000"/>
                    </svg>
                </div>
            </td>
            <td style="width: 60%;">
                <div class="company-info">
                    <div class="company-name">THE ORDER OF FRIARS MINOR (S) LTD</div>
                    <div>Co. & GST Reg. No. 201018236M</div>
                    <div>Franciscan Columbarium</div>
                    <div>5 Bukit Batok East Avenue 2, Singapore 659918</div>
                    <div>Tel: 6560-6361 HP: 9774-7053</div>
                    <div>Email: franciscan.columbarium@gmail.com</div>
                    
                    <div class="tax-invoice-label">TAX INVOICE</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Info Layout Table -->
    <table class="layout-table" style="margin-top: 20px;">
        <tr>
            <td style="width: 55%;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td class="info-label">Name</td>
                        <td class="info-colon">:</td>
                        <td class="info-value"><strong>${applicant?.name || ''}</strong></td>
                    </tr>
                    <tr>
                        <td class="info-label">Address</td>
                        <td class="info-colon">:</td>
                        <td class="info-value" style="white-space: pre-wrap;">${applicant?.address || ''}</td>
                    </tr>
                </table>
            </td>
            <td style="width: 45%;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="text-align: right; padding-right: 15px;">Invoice No :</td>
                        <td style="text-align: right; width: 100px;"><strong>${invoice?.invoiceNo || ''}</strong></td>
                    </tr>
                    <tr>
                        <td style="text-align: right; padding-right: 15px;">Date :</td>
                        <td style="text-align: right;"><strong>${formatDate(invoice?.invoiceDate)}</strong></td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Data Table -->
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 30%; text-align: left; padding-left: 10px;">Description</th>
                <th style="width: 25%; text-align: left; padding-left: 10px;">Reference No.</th>
                <th style="width: 10%">GST %</th>
                <th style="width: 10%">Qty</th>
                <th style="width: 15%">Unit Price</th>
                <th style="width: 15%">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="align-left">Level 3 Niche</td>
                <td class="align-left">${referenceInfo}</td>
                <td class="align-center">${gstRateDisplay}</td>
                <td class="align-center">1.00</td>
                <td>$ ${formatCurrency(subTotal)}</td>
                <td>$ ${formatCurrency(subTotal)}</td>
            </tr>
            <!-- Filler Rows -->
            <tr><td style="height: 25px;"></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td style="height: 25px;"></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td style="height: 25px;"></td><td></td><td></td><td></td><td></td><td></td></tr>
        </tbody>
    </table>

    <!-- Totals -->
    <table class="totals-table">
        <tr>
            <td class="total-label">Sub Total :</td>
            <td class="total-amount">$ ${formatCurrency(subTotal)}</td>
        </tr>
        <tr>
            <td class="total-label">GST Total :</td>
            <td class="total-amount">$ ${formatCurrency(gstTotal)}</td>
        </tr>
        <tr>
            <td class="total-label grand-total">Total :</td>
            <td class="total-amount grand-total">$ ${formatCurrency(totalAmount)}</td>
        </tr>
    </table>

    <div class="amount-words-section">
        <div>Dollars <span>${amountInWords} Only</span></div>
        <div class="system-text">This is a system generated invoice. No signature is required</div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p class="bold">Payment by:</p>
        <p>1. Cash</p>
        <p>2. Cheque payable to: <span class="bold" style="margin-left: 10px;">The Order of Friars Minor (S) Ltd - Columbarium</span></p>
        <p>3. Internet transfer: <span class="bold" style="margin-left: 20px;">OFM - Col, Standard Chartered Bank</span></p>
        <p><span class="bold" style="margin-left: 130px;">A/c 07-1-006465-1</span></p>
        <p style="margin-top: 10px;">Please quote the invoice no. in the reference field</p>
    </div>

</body>
</html>`;

        return template;
    },

    // Generate PDF blob from agreement template (using html2canvas + jsPDF)
    generateAgreementPdfBlob: async (data: any, baseUrl?: string): Promise<Blob> => {
        let element: HTMLIFrameElement | null = null;
        let container: HTMLDivElement | null = null;
        
        try {
            console.log('[generateAgreementPdfBlob] Starting PDF generation...');
            const startTime = Date.now();
            
            // Generate HTML template
            const htmlContent = pdfTemplateService.generateAgreementTemplate(data, baseUrl);
            console.log('[generateAgreementPdfBlob] HTML template generated, length:', htmlContent.length);
            
            // Create a container for the iframe
            container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-10000px';
            container.style.top = '0';
            container.style.width = '794px'; // 210mm = 794px at 96 DPI
            container.style.height = '1123px'; // 297mm = 1123px at 96 DPI
            container.style.backgroundColor = '#fff';
            container.style.overflow = 'hidden';
            
            // Create an iframe to render the full HTML document
            element = document.createElement('iframe');
            element.style.width = '794px';
            element.style.height = '1123px';
            element.style.border = 'none';
            element.style.margin = '0';
            element.style.padding = '0';
            
            container.appendChild(element);
            document.body.appendChild(container);
            
            console.log('[generateAgreementPdfBlob] Iframe created, writing HTML content...');
            
            // Write the full HTML to the iframe
            const iframeDoc = element.contentDocument || element.contentWindow?.document;
            if (!iframeDoc) {
                throw new Error('Cannot access iframe document');
            }
            
            iframeDoc.open();
            iframeDoc.write(htmlContent);
            iframeDoc.close();
            
            console.log('[generateAgreementPdfBlob] HTML written to iframe, waiting for render...');
            
            // Wait for iframe to load and render
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    console.warn('[generateAgreementPdfBlob] Iframe load timeout, proceeding anyway...');
                    resolve(true);
                }, 5000);
                
                element!.onload = () => {
                    clearTimeout(timeout);
                    console.log('[generateAgreementPdfBlob] Iframe loaded');
                    resolve(true);
                };
                
                element!.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('[generateAgreementPdfBlob] Iframe load error:', error);
                    reject(new Error('Iframe failed to load'));
                };
                
                // Also wait a bit for content to render
                setTimeout(() => {
                    clearTimeout(timeout);
                    resolve(true);
                }, 2000);
            });
            
            // Additional wait for styles and layout
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify iframe content
            const iframeBody = iframeDoc.body;
            if (!iframeBody || iframeBody.innerHTML.trim().length === 0) {
                console.error('[generateAgreementPdfBlob] Iframe body is empty:', iframeBody?.innerHTML);
                throw new Error('Iframe content is empty');
            }
            
            console.log('[generateAgreementPdfBlob] Iframe body content length:', iframeBody.innerHTML.length);
            console.log('[generateAgreementPdfBlob] Iframe body preview:', iframeBody.innerHTML.substring(0, 200));
            
            // Get iframe body dimensions
            const height = iframeBody.scrollHeight || iframeBody.offsetHeight;
            const width = iframeBody.scrollWidth || iframeBody.offsetWidth;
            console.log('[generateAgreementPdfBlob] Iframe body dimensions:', { width, height });
            
            if (height === 0 || width === 0) {
                throw new Error(`Iframe content did not render properly - dimensions are zero (width: ${width}, height: ${height})`);
            }
            
            // Update iframe height to match content
            element.style.height = `${Math.max(height, 1123)}px`;
            container.style.height = `${Math.max(height, 1123)}px`;
            
            // Wait for logo image to load in iframe
            const logoImg = iframeDoc.querySelector('.header-logo') as HTMLImageElement;
            if (logoImg && logoImg.src) {
                console.log('[generateAgreementPdfBlob] Waiting for logo to load...');
                await new Promise((resolve) => {
                    if (logoImg.complete && logoImg.naturalHeight > 0) {
                        console.log('[generateAgreementPdfBlob] Logo already loaded');
                        resolve(true);
                    } else {
                        let resolved = false;
                        const timeout = setTimeout(() => {
                            if (!resolved) {
                                console.warn('[generateAgreementPdfBlob] Logo load timeout, continuing...');
                                resolved = true;
                                resolve(true);
                            }
                        }, 5000); // 5 second timeout
                        
                        logoImg.onload = () => {
                            if (!resolved) {
                                console.log('[generateAgreementPdfBlob] Logo loaded successfully');
                                resolved = true;
                                clearTimeout(timeout);
                                resolve(true);
                            }
                        };
                        logoImg.onerror = () => {
                            if (!resolved) {
                                console.warn('[generateAgreementPdfBlob] Logo failed to load, continuing...');
                                resolved = true;
                                clearTimeout(timeout);
                                resolve(true); // Continue even if logo fails
                            }
                        };
                    }
                });
            }
            
            // Use html2canvas to convert iframe body to canvas
            const html2canvas = (await import('html2canvas')).default;
            console.log('[generateAgreementPdfBlob] Starting html2canvas conversion on iframe body...');
            console.log('[generateAgreementPdfBlob] Iframe body dimensions:', {
                width: iframeBody.scrollWidth || iframeBody.offsetWidth,
                height: iframeBody.scrollHeight || iframeBody.offsetHeight
            });
            
            const canvas = await html2canvas(iframeBody, {
                scale: 2,
                useCORS: true,
                logging: true, // Enable logging to debug
                width: iframeBody.scrollWidth || 794,
                height: iframeBody.scrollHeight || 1123,
                windowWidth: iframeBody.scrollWidth || 794,
                windowHeight: iframeBody.scrollHeight || 1123,
                backgroundColor: '#ffffff',
                removeContainer: false,
                allowTaint: false,
                imageTimeout: 30000,
                foreignObjectRendering: true, // Better for iframes
                onclone: (clonedDoc, clonedElement) => {
                    console.log('[generateAgreementPdfBlob] Cloned element:', clonedElement);
                    // Ensure all images are loaded in cloned document
                    const clonedImgs = clonedDoc.querySelectorAll('img');
                    console.log('[generateAgreementPdfBlob] Found images in clone:', clonedImgs.length);
                    clonedImgs.forEach((img: HTMLImageElement) => {
                        if (img.src && !img.complete) {
                            // Force reload if not complete
                            const src = img.src;
                            img.src = '';
                            img.src = src;
                        }
                    });
                }
            });
            
            console.log('[generateAgreementPdfBlob] Canvas created:', {
                width: canvas.width,
                height: canvas.height
            });
            
            // Validate canvas
            if (!canvas || canvas.width === 0 || canvas.height === 0) {
                throw new Error(`Canvas is invalid: width=${canvas.width}, height=${canvas.height}`);
            }
            
            // Check if canvas has content (not blank)
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
                const hasContent = imageData.data.some((pixel, index) => {
                    // Check if pixel is not white (RGB 255,255,255)
                    if (index % 4 === 3) return false; // Skip alpha channel
                    return pixel < 255;
                });
                
                if (!hasContent) {
                    console.warn('[generateAgreementPdfBlob] Canvas appears to be blank/white, but continuing...');
                }
            }
            
            console.log('[generateAgreementPdfBlob] Canvas validated, converting to PDF...');
            const canvasTime = Date.now() - startTime;
            
            // Convert canvas to image
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            if (!imgData || imgData.length < 100) {
                throw new Error('Canvas to image conversion failed - image data is too small');
            }
            
            console.log('[generateAgreementPdfBlob] Image data created, length:', imgData.length);
            
            // Create PDF document
            const pdfDoc = new jsPDF({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            });
            
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            
            // Add first page
            pdfDoc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            // Add additional pages if needed
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdfDoc.addPage();
                pdfDoc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            const blob = pdfDoc.output('blob');
            const totalTime = Date.now() - startTime;
            
            // Validate PDF blob
            if (!blob || blob.size === 0) {
                throw new Error('Generated PDF blob is empty');
            }
            
            // Check if blob is actually a PDF (should start with %PDF)
            const blobArrayBuffer = await blob.arrayBuffer();
            const blobStart = new Uint8Array(blobArrayBuffer.slice(0, 4));
            const pdfHeader = String.fromCharCode(...blobStart);
            
            if (!pdfHeader.startsWith('%PDF')) {
                console.warn('[generateAgreementPdfBlob] PDF header check failed, but continuing...');
                // This might be okay if jsPDF uses a different format
            }
            
            console.log(`[generateAgreementPdfBlob] PDF generated successfully in ${totalTime}ms (canvas: ${canvasTime}ms, blob size: ${(blob.size / 1024).toFixed(2)}KB)`);
            console.log(`[generateAgreementPdfBlob] PDF blob validation:`, {
                size: blob.size,
                type: blob.type,
                header: pdfHeader.substring(0, 10)
            });
            
            // Clean up temporary elements
            if (container && container.parentNode) {
                try {
                    document.body.removeChild(container);
                } catch (cleanupError) {
                    console.warn('[generateAgreementPdfBlob] Error removing container:', cleanupError);
                }
            }
            container = null;
            element = null;
            
            return blob;
        } catch (error: any) {
            // Clean up on error
            if (container && container.parentNode) {
                try {
                    document.body.removeChild(container);
                } catch (cleanupError) {
                    console.warn('[generateAgreementPdfBlob] Error during cleanup:', cleanupError);
                }
            }
            container = null;
            element = null;
            console.error('[generateAgreementPdfBlob] Error generating PDF:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            throw new NicheAgreementError(`Failed to generate PDF: ${error.message || 'Unknown error'}. Please check console for details.`);
        }
    },

    // Open PDF in new tab with generated template (HTML view with print/download options)
    openPdfInNewTab: (template: string, title: string = 'Document', enablePdfGeneration: boolean = false, data?: any, baseUrl?: string): void => {
        try {
            const blob = new Blob([template], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const newWindow = window.open(url, '_blank', 'noopener,noreferrer');

            if (!newWindow) {
                throw new Error('Popup blocked. Please allow popups for this site.');
            }

            // Set the title
            newWindow.document.title = title;
            
            // Add print and download buttons if PDF generation is enabled
            if (enablePdfGeneration && data) {
                // Wait for window to load
                newWindow.onload = () => {
                    try {
                        const style = newWindow.document.createElement('style');
                        style.textContent = `
                            .pdf-controls {
                                position: fixed;
                                top: 10px;
                                right: 10px;
                                z-index: 10000;
                                background: white;
                                padding: 10px;
                                border-radius: 5px;
                                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                                display: flex;
                                gap: 10px;
                            }
                            .pdf-btn {
                                padding: 8px 16px;
                                border: 1px solid #ccc;
                                background: #f5f5f5;
                                cursor: pointer;
                                border-radius: 4px;
                                font-size: 12px;
                            }
                            .pdf-btn:hover {
                                background: #e0e0e0;
                            }
                            @media print {
                                .pdf-controls { display: none; }
                            }
                        `;
                        newWindow.document.head.appendChild(style);
                        
                        const controls = newWindow.document.createElement('div');
                        controls.className = 'pdf-controls';
                        
                        const printBtn = newWindow.document.createElement('button');
                        printBtn.className = 'pdf-btn';
                        printBtn.textContent = 'Print';
                        printBtn.onclick = () => newWindow.print();
                        
                        const downloadBtn = newWindow.document.createElement('button');
                        downloadBtn.className = 'pdf-btn';
                        downloadBtn.textContent = 'Download PDF';
                        downloadBtn.onclick = async () => {
                            try {
                                downloadBtn.textContent = 'Generating...';
                                downloadBtn.disabled = true;
                                const pdfBlob = await pdfTemplateService.generateAgreementPdfBlob(data, baseUrl);
                                const pdfUrl = URL.createObjectURL(pdfBlob);
                                const link = newWindow.document.createElement('a');
                                link.href = pdfUrl;
                                link.download = `${title.replace(/\s+/g, '_')}.pdf`;
                                link.click();
                                URL.revokeObjectURL(pdfUrl);
                                downloadBtn.textContent = 'Download PDF';
                                downloadBtn.disabled = false;
                            } catch (err: any) {
                                alert(`Failed to generate PDF: ${err.message}`);
                                downloadBtn.textContent = 'Download PDF';
                                downloadBtn.disabled = false;
                            }
                        };
                        
                        controls.appendChild(printBtn);
                        controls.appendChild(downloadBtn);
                        newWindow.document.body.appendChild(controls);
                    } catch (err) {
                        console.error('Error adding PDF controls:', err);
                    }
                };
            }

            // Clean up the URL after a delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);

        } catch (error) {
            throw new NicheAgreementError('Failed to open PDF. Please check if popups are blocked.');
        }
    }
};

export default pdfTemplateService;
