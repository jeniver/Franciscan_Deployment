import { NicheAgreementError } from './nicheAgreementService';
import jsPDF from 'jspdf';
import { PDF_ASSETS } from '../constants/pdfConstants';

// PDF Template Service for generating attractive agreement and invoice templates
export const pdfTemplateService = {
    // Generate Agreement PDF Template
    generateAgreementTemplate: (data: any, _baseUrl?: string): string => {
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
            storage,
            consentForm,
            agreement,
            metadata,
            crystalReports,
            printReady
        } = data;

        // Helper function to format currency
        const formatCurrency = (amount: any) => {
            const num = parseFloat(amount || 0);
            return num.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        // Helper function to format date/time
        const formatDateTime = (dateStr: string | null | undefined): string => {
            if (!dateStr) return '';
            try {
                const date = new Date(dateStr);
                return date.toLocaleString();
            } catch {
                return dateStr || '';
            }
        };

        // Helper function to format address into lines from a single string
        const formatAddressLinesFromString = (address: string | null | undefined): string[] => {
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
            
            // Pattern 2: "1010 EAST COAST PARKWAY, Singapore 449892" (Address, Country PostalCode)
            const pattern2 = addressStr.match(/^(.+?),\s*Singapore\s+(\d+)$/i);
            if (pattern2) {
                const mainAddress = pattern2[1].trim();
                const postalCode = pattern2[2];
                return [
                    mainAddress,
                    '',
                    `Singapore ${postalCode}`
                ];
            }
            
            // Pattern 3: Split by commas (general case)
            const parts = addressStr.split(',').map(p => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
                return [parts[0] || '', parts[1] || '', parts.slice(2).join(', ') || ''];
            } else if (parts.length === 2) {
                // Check if second part starts with "Singapore" - likely country + postal
                if (parts[1].toLowerCase().startsWith('singapore')) {
                    return [parts[0] || '', '', parts[1] || ''];
                }
                return [parts[0] || '', parts[1] || '', ''];
            } else {
                // Single line - try to extract street, unit, and Singapore postal if present
                const singaporeMatch = addressStr.match(/^(.+?)\s+(Singapore\s+\d+)$/i);
                if (singaporeMatch) {
                    return [singaporeMatch[1].trim(), '', singaporeMatch[2].trim()];
                }
                const line1 = addressStr;
                return [line1, '', ''];
            }
        };

        // Prefer structured address parts when available (addressNo / addressLine1 / addressLine2 / addressCity / addressState / addressCountry)
        // Mapping: addressNo → No (if "No", then empty, otherwise "Block"), addressLine1 → Block No, addressLine2 → Street Name, 
        // addressCity → Unit No, addressState → Postal Code, addressCountry → Country
        const buildAddressLinesFromEntity = (entity: any): string[] => {
            // Check for structured address fields (can be at entity level or nested in entity.address)
            const addressNo = entity.addressNo || entity.address?.no || '';
            const addressLine1 = entity.addressLine1 || entity.address?.line1 || '';
            const addressLine2 = entity.addressLine2 || entity.address?.line2 || '';
            const addressCity = entity.addressCity || entity.address?.city || '';
            const addressState = entity.addressState || entity.address?.state || '';
            const addressCountry = entity.addressCountry || entity.address?.country || '';

            if (addressNo || addressLine1 || addressLine2 || addressCity || addressState || addressCountry) {
                // Line 1: No/Block + Block No + Street Name
                const line1Parts: string[] = [];
                // If addressNo is "No", leave empty; otherwise use it as "Block"
                if (addressNo && addressNo.trim().toUpperCase() !== 'NO') {
                    line1Parts.push(addressNo.trim());
                }
                if (addressLine1) {
                    line1Parts.push(addressLine1.trim());
                }
                if (addressLine2) {
                    line1Parts.push(addressLine2.trim());
                }
                const line1 = line1Parts.join(' ').trim();

                // Line 2: Unit No (from addressCity)
                const line2 = addressCity.trim();

                // Line 3: Country + Postal Code (from addressState)
                const line3Parts: string[] = [];
                if (addressCountry) {
                    line3Parts.push(addressCountry.trim());
                }
                if (addressState) {
                    line3Parts.push(addressState.trim());
                }
                const line3 = line3Parts.join(' ').trim();

                return [line1, line2, line3];
            }

            // Fallback to parsing the combined address string
            return formatAddressLinesFromString(entity?.address);
        };

        // Format address for display (applicant and nominees)
        const applicantAddressLines = buildAddressLinesFromEntity(applicant || {});
        const nominee1AddressLines = buildAddressLinesFromEntity(nominee || {});
        const nominee2AddressLines = buildAddressLinesFromEntity(nominee2 || {});
        
        // Get consideration sum (total amount) from invoice or niche
        const considerationSum =  niche?.totalAmount || 7000;
        
        // Get chapel name and niche number
        const chapelName = niche?.chapelName || niche?.location?.chapel?.chapelName || '';
        const nicheNumber = niche?.number || '';
        
        // Format dates (API returns in dd-MMM-yyyy format, keep as is)
        const formatDate = (dateStr: string | null | undefined): string => {
            return dateStr || '';
        };

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
        // Backend sends 'dateDied', not 'dateOfDeath'
        const firstDeceasedDate = formatDate(deceased1?.dateDied || deceased1?.dateOfDeath);
        const secondDeceasedDate = formatDate(deceased2?.dateDied || deceased2?.dateOfDeath);

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
        const paymentMethod = invoice?.paymentMethod || '';
        const balance = invoice?.balance || 0;

        const template = `<html>
<STYLE> 
 .pdf24_ sup {
	vertical-align: baseline;
	position: relative;
	top: -0.4em;
}
.pdf24_ sub {
	vertical-align: baseline;
	position: relative;
	top: 0.4em;
}
.pdf24_ a:link {text-decoration:none;}
.pdf24_ a:visited {text-decoration:none;}
@media screen and (min-device-pixel-ratio:0), (-webkit-min-device-pixel-ratio:0), (min--moz-device-pixel-ratio: 0) {.pdf24_view{ font-size:10em; transform:scale(0.1); -moz-transform:scale(0.1); -webkit-transform:scale(0.1); -moz-transform-origin:top left; -webkit-transform-origin:top left; } }
.pdf24_layer { }.pdf24_ie { font-size: 1pt; }
.pdf24_ie body { font-size: 12em; }
@media print{.pdf24_view {font-size:1em; transform:scale(1);}}
.pdf24_grlink { position:relative;width:100%;height:100%;z-index:1000000; }
.pdf24_01 {
	position: absolute;
	white-space: nowrap;
}
.pdf24_02 {
	font-size: 1em;
	line-height: 0.0em;
	width: 51em;
	height: 66em;
	border-style: none;
	display: block;
	margin: 0em;
}

@supports(-ms-ime-align:auto) { .pdf24_02 {overflow: hidden;}}
.pdf24_03 {
	position: relative;
}
.pdf24_04 {
	position: absolute;
	pointer-events: none;
	clip: rect(5.958333em,47.93333em,63.04167em,3.145833em);
	width: 100%;
}
.pdf24_05 {
	position: relative;
	width: 51em;
}
.pdf24_06 {
	height: 6.6em;
}
.pdf24_ie .pdf24_06 {
	height: 66em;
}
/* Responsive enhancements for tables and content wrapping */
.table, .layout-table, .data-table, .totals-table { width: 100%; table-layout: fixed; border-collapse: collapse; }
.table th, .table td, .layout-table th, .layout-table td, .data-table th, .data-table td, .totals-table th, .totals-table td { white-space: normal; word-break: break-word; hyphens: auto; }
img { max-width: 100%; height: auto; }
@media (max-width: 1024px) { .table th, .table td, .layout-table th, .layout-table td, .data-table th, .data-table td, .totals-table th, .totals-table td { padding: 6px 8px; font-size: 0.95em; } }
@media (max-width: 768px) { .pdf24_02 { width: 100%; height: auto; } .table, .layout-table, .data-table, .totals-table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; } }
@media print { .table, .layout-table, .data-table, .totals-table { display: table; overflow: visible; } }
@font-face {
	font-family:"KBJFOG+Arial,Bold";
	src:url("data:application/octet-stream;base64,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") format("woff");
}
.pdf24_07 {
	font-size: 2.0875em;
	font-family: "KBJFOG+Arial,Bold";
	color: #000000;
}
.pdf24_08 {
	line-height: 1.117187em;
}
.pdf24_09 {
	letter-spacing: -0.0001em;
}

.pdf24_ie .pdf24_09 {
	letter-spacing: -0.002px;
}
.pdf24_10 {
	font-size: 1.341667em;
	font-family: "KBJFOG+Arial,Bold";
	color: #000000;
}
.pdf24_11 {
	line-height: 1.117188em;
}
.pdf24_12 {
	font-size: 1.9375em;
	font-family: "KBJFOG+Arial,Bold";
	color: #000000;
}
.pdf24_13 {
	letter-spacing: 0.0004em;
}

.pdf24_ie .pdf24_13 {
	letter-spacing: 0.0128px;
}
.pdf24_14 {
	letter-spacing: 0em;
}

.pdf24_ie .pdf24_14 {
	letter-spacing: -0.0008px;
}
@font-face {
	font-family:"TUDIIJ+Arial,Italic";
	src:url("data:application/octet-stream;base64,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") format("woff");
}
.pdf24_15 {
	font-size: 1.191667em;
	font-family: "TUDIIJ+Arial,Italic";
	color: #000000;
}
.pdf24_16 {
	font-size: 0.729167em;
	font-family: "KBJFOG+Arial,Bold";
	color: #000000;
}
@font-face {
	font-family:"DEMFBD+Arial";
	src:url("data:application/octet-stream;base64,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") format("woff");
}
.pdf24_17 {
	font-size: 0.745833em;
	font-family: "DEMFBD+Arial";
	color: #000000;
}
.pdf24_18 {
	letter-spacing: -0.0003em;
}

.pdf24_ie .pdf24_18 {
	letter-spacing: -0.0035px;
}
.pdf24_19 {
	letter-spacing: -0.1058em;
}

.pdf24_ie .pdf24_19 {
	letter-spacing: -1.263px;
}
.pdf24_20 {
	letter-spacing: -0.0002em;
}

.pdf24_ie .pdf24_20 {
	letter-spacing: -0.0018px;
}
.pdf24_21 {
	letter-spacing: -0.0065em;
}

.pdf24_ie .pdf24_21 {
	letter-spacing: -0.0759px;
}
.pdf24_22 {
	letter-spacing: -0.006em;
}

.pdf24_ie .pdf24_22 {
	letter-spacing: -0.0699px;
}
.pdf24_23 {
	letter-spacing: 0.0067em;
}

.pdf24_ie .pdf24_23 {
	letter-spacing: 0.0801px;
}
.pdf24_24 {
	letter-spacing: -0.0033em;
}

.pdf24_ie .pdf24_24 {
	letter-spacing: -0.0398px;
}
.pdf24_25 {
	letter-spacing: 0.0117em;
}

.pdf24_ie .pdf24_25 {
	letter-spacing: 0.1393px;
}
.pdf24_26 {
	letter-spacing: -0.0286em;
}

.pdf24_ie .pdf24_26 {
	letter-spacing: -0.3334px;
}
.pdf24_27 {
	font-size: 0.745833em;
	font-family: "TUDIIJ+Arial,Italic";
	color: #000000;
}
.pdf24_28 {
	letter-spacing: 0.0017em;
}

.pdf24_ie .pdf24_28 {
	letter-spacing: 0.0204px;
}
.pdf24_29 {
	letter-spacing: -0.001em;
}

.pdf24_ie .pdf24_29 {
	letter-spacing: -0.0123px;
}
.pdf24_30 {
	letter-spacing: 0.0001em;
}

.pdf24_ie .pdf24_30 {
	letter-spacing: 0.0007px;
}
.pdf24_31 {
	font-size: 0.595833em;
	font-family: "DEMFBD+Arial";
	color: #000000;
}
.pdf24_32 {
	letter-spacing: -0.0012em;
}

.pdf24_ie .pdf24_32 {
	letter-spacing: -0.0139px;
}
.pdf24_33 {
	letter-spacing: 0.1601em;
}

.pdf24_ie .pdf24_33 {
	letter-spacing: 1.9102px;
}
.pdf24_34 {
	position: absolute;
	pointer-events: none;
	clip: rect(7.600001em,47.75833em,50.75417em,3.116667em);
	width: 100%;
}
.pdf24_35 {
	letter-spacing: -0.0082em;
}

.pdf24_ie .pdf24_35 {
	letter-spacing: -0.0959px;
}
.pdf24_36 {
	letter-spacing: -0.0014em;
}

.pdf24_ie .pdf24_36 {
	letter-spacing: -0.0165px;
}
.pdf24_37 {
	font-size: 0.675em;
	font-family: "DEMFBD+Arial";
	color: #000000;
}
.pdf24_38 {
	letter-spacing: -0.0013em;
}

.pdf24_ie .pdf24_38 {
	letter-spacing: -0.0152px;
}

 body > div {
	box-shadow: 0 0 5px rgba(0,0,0,0.3) !important;
	margin: 20px auto !important;
}

</STYLE> 
<head></head>
<body class="m-4 p-4">
  <div class="pdf24_ pdf24_02" id="page_0">
    <div class="pdf24_03">
      <img class="pdf24_04" alt=""
   src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAzAAAAQgCAYAAAA5ebkOAAAACXBIWXMAAA7DAAAOwwHHb6hkAABW3ElEQVR4nOzdCZguVXku7D4nf0xMgkYjRiMqQYNKjCYaJcYBJEYUFXEOIkIUEUEBFfAgs4iggggIIiAgAgoCokwyiYAyKKAMgjIIMsu8GSLgUH8/i67m27U3/vBfp3avsu77ut5r9+7++uvq7FBVj+96V01NAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD9vvf//7Ri1Yc/3vAgAALMT/n5v73/3ud6W6f3+o6r7mod6r/fi3v/3tH3zvhR3Dwz3Gh/O9AgwAAFSqvWH/h3/4h+bP/uzPmr/6q79qHvOYxzR//ud/XmrVVVdtnvrUpzaPetSjSv3FX/xFed2jH/3o8trFFlus+dM//dPmsY99bPPa1762ede73tU885nPbP7yL/+yvD6vycft9z372c8ur8/r8h75WfnZT37yk8tr8j55XV6TP9uf+brXva78+aQnPal8Lsf2uMc9rrxH3v85z3lOs+222zavfOUrmw996EPNGmusUd47x9f+/Hxf3ndhla/ntRtssIEAAwAAtcrN+l133dW85z3vaVZbbbXmr//6r5t11lmnWXbZZcsNfQJCbvBz85+P99prr+bxj398+dy//Mu/NP/2b/9WAsuvf/3r2e7F8ccf3+y///7NDjvssEBn45e//GWz0UYblXqo7sf//M//NM997nOb9dZbb/Z4Vlhhhebf//3fy7H+oc7Jmmuu2Zx00knNhRde2Nxyyy3zfW3rrbdujjjiiOamm26arwPzvOc9r7z3pptu2rzmNa8RYAAAoFa5Wf/5z3/eLLnkks0//uM/lq7Fm970puYFL3jBbHdi5ZVXLt2O9u/5OIHmb//2b5t99tmndDjuv//+cuN//fXXN5/97Geb//zP/2x23XXXBQLGtdde22y44YbNpz71qYUGkHw977vUUkuV911uueWal7zkJc1b3vKWEjQSom6//faHDDDf+c53mm222aaEl7vvvnu+r6VD88Y3vrG85vzzz5/9/Mte9rLmne98Z7PiiiuWLpIAAwAAlcrN+s0339wsvfTSJbRkKdX666/fvOIVr5gNLAtbepWgkxCSQJDgMxkUbrzxxuYLX/hCs8ceeyy0u/KVr3yl2WWXXRYaQLJELEvK2k5Lji3Lx57+9KfPHkcCzUPNsJx88snN29/+9mbevHkLvCaBKoHolFNOKV9vP5/PvfCFLywdqAQvAQYAACqVm/XLL7+8dDwSDLJsLMuwsjTsGc94RlnC1YaWzJ1kRiUdkr/7u78rXZunPe1pzYtf/OLZMJAB/GOOOaYElISYh1rmtfHGGy/0a094whNKCGn/fuuttzbHHXdcs/nmm5cAk6Vl6cJceeWVC/3+7bffvnRrfvrTny4QYLbbbrsSVLIkbTLAZClc5m1e9KIXlTAjwAAAQKVys37ppZc2yyyzTLmBT2BZa621mle/+tWlG5NOS8JLOwvzr//6r6VT8da3vrXZaqutmp122qm8Jp2VvNd9993XHH744c3nPve5Mky/sJCR72mXanXrox/9aAk+6bxk0D/LyP7+7/++hJLMtrRL184666yF7jyWWZYc4yGHHLLA11dfffXye33pS1+a7/P53fO7Jbzk/wYCDAAAVCo361dccUVZPvbP//zPpcOSsDA5AzNZmUNJ96RdWrbEEkuU7sVtt902GwgyQL/nnnuWkLOwkHLYYYc1iy++eHPPPfcs9OtPecpTynvmOLKr2Ac/+MHy+euuu678zHRpPv/5zy90fiYbDBxwwAHNb37zmwW+nmPPe+XYJj+fTlN2WkswyjyMAAMAAJXKzXp25cqSsczBpAOzyiqrLDTAJDy8/OUvL0uxMveSkPHud7+73PxnI4A2EOT99ttvv2allVZaaED52c9+Vpae7b777gv9eron3/zmN0vQyFK0djexNsC8733vK8vQukvEdtxxx9K1ueqqqxZ4z4Sl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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==">
    </div>
    <div class="pdf24_view">
      <div class="pdf24_05 pdf24_06">
        <div style="left:8.7833em;top:6.2977em;" class="pdf24_01">
          <span class="pdf24_07 pdf24_08 pdf24_09">F</span><span
            style="word-spacing:0.0245em;"
            class="pdf24_10 pdf24_11 pdf24_09">RANCISCAN </span><span
            class="pdf24_12 pdf24_11 pdf24_13">C</span><span
            class="pdf24_10 pdf24_11 pdf24_14">OLUMBARIUM
            &nbsp;</span></div>
        <div style="left:22.4833em;top:9.1587em;" class="pdf24_01">
          <span class="pdf24_15 pdf24_11 pdf24_14">AGREEMENT
            &nbsp;</span></div>
        <div style="left:3.0833em;top:12.5357em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">Between
            &nbsp;</span></div>
        <div style="left:12.0833em;top:12.5357em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_14">:</span></div>
        <div style="left:3.1875em;top:13.6998em;" class="pdf24_01">
          <span style="word-spacing:0.0068em;"
            class="pdf24_17 pdf24_08 pdf24_18">The Order of Friars
            Minor (Singapore) Limited, a company limited by guarantee
            of 5 Bukit Batok East Ave 2, Singapore 659918
            &nbsp;</span></div>
        <div style="left:3.1875em;top:14.6998em;" class="pdf24_01">
          <span style="word-spacing:0.0053em;"
            class="pdf24_17 pdf24_08 pdf24_14">("The Order"). Co &amp;
            GST Reg No. 2010163236M. </span><span
            class="pdf24_17 pdf24_08 pdf24_19">T</span><span
            class="pdf24_17 pdf24_08 pdf24_20">e</span><span
            style="word-spacing:0.0004em;"
            class="pdf24_17 pdf24_08 pdf24_09">l:6560-6361,
            HP:9774-7053, e-mail:franciscan.columbarium@gmail.com
            &nbsp;</span></div>
        <div style="left:3.3292em;top:16.1373em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_17 pdf24_08 pdf24_09">And : &nbsp;</span>
        </div>
        <div style="left:3.8125em;top:17.554em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Name &nbsp;</span>
        </div>
        <div style="left:40.9458em;top:16.1441em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${applicationCode || ''}
            &nbsp;</span></div>
        <div style="left:34.2417em;top:16.2207em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_17 pdf24_08 pdf24_09">Application Code :
            &nbsp;</span></div>
        <div style="left:35.9958em;top:17.5107em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_21">${applicantIdNo}
            &nbsp;</span></div>
        <div style="left:10.3125em;top:17.6107em;" class="pdf24_01">
          <span style="word-spacing:0.0064em;"
            class="pdf24_16 pdf24_11 pdf24_22">${applicantName}
            &nbsp;</span></div>
        <div style="left:28.1958em;top:17.5873em;" class="pdf24_01">
          <span style="word-spacing:0.0005em;"
            class="pdf24_17 pdf24_08 pdf24_09">NRIC/Passport No.
            &nbsp;</span></div>
        <div style="left:10.3792em;top:19.1191em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_16 pdf24_11 pdf24_14">${applicantAddressLines[0]}
            &nbsp;</span></div>
        <div style="left:10.3792em;top:20.1191em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${applicantAddressLines[1]}
            &nbsp;</span></div>
        <div style="left:3.8125em;top:19.304em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Address
            &nbsp;</span></div>
        <div style="left:35.9958em;top:19.4441em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${applicantMobileNo}
            &nbsp;</span></div>
        <div style="left:28.1958em;top:19.754em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">Mobile No.
            &nbsp;</span></div>
        <div style="left:28.1958em;top:21.254em;" class="pdf24_01">
          <span style="word-spacing:-0.0168em;"
            class="pdf24_17 pdf24_08 pdf24_09">Home </span><span
            class="pdf24_17 pdf24_08 pdf24_19">T</span><span
            class="pdf24_17 pdf24_08 pdf24_20">e</span><span
            class="pdf24_17 pdf24_08 pdf24_23">l. &nbsp;</span></div>
        <div style="left:10.3792em;top:21.1191em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_16 pdf24_11 pdf24_14">${applicantAddressLines[2]}
            &nbsp;</span></div>
        <div style="left:28.1958em;top:23.004em;" class="pdf24_01">
          <span style="word-spacing:-0.0103em;"
            class="pdf24_17 pdf24_08 pdf24_24">Office </span><span
            class="pdf24_17 pdf24_08 pdf24_19">T</span><span
            class="pdf24_17 pdf24_08 pdf24_20">e</span><span
            class="pdf24_17 pdf24_08 pdf24_25">l. &nbsp;</span></div>
        <div style="left:28.1958em;top:24.554em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Catholic
            &nbsp;</span></div>
        <div style="left:3.75em;top:24.3248em;" class="pdf24_01"><span
            class="pdf24_17 pdf24_08 pdf24_09">e-mail &nbsp;</span>
        </div>
        <div style="left:10.25em;top:24.3607em;" class="pdf24_01"><a
            href="mailto:${applicantEmail}"><span
              class="pdf24_16 pdf24_11 pdf24_14">${applicantEmail}
              &nbsp;</span></a></div>
        <div style="left:36.1625em;top:24.4941em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_26">${applicantIsCatholicText} &nbsp;</span>
        </div>
        <div style="left:4.4292em;top:25.654em;" class="pdf24_01">
          <span style="word-spacing:-0.0424em;"
            class="pdf24_27 pdf24_08 pdf24_28">("The Applicant")
            &nbsp;</span></div>
        <div style="left:15.5532em;top:26.929em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">${formatCurrency(considerationSum)}
            &nbsp;</span></div>
        <div style="left:3.6292em;top:27.0207em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">In consideration of the
            sum of &nbsp;</span></div>
        <div style="left:14.4458em;top:27.0207em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_14">$</span></div>
        <div style="left:18.9792em;top:27.0207em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_17 pdf24_08 pdf24_09">from the Applicant as
            the fee ("fee"), for which the Order acknowledges receipt,
            &nbsp;</span></div>
        <div style="left:3.6292em;top:28.0707em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">the Order agrees to the
            interment and storage at the Franciscan Columbarium
            located at 5</span><span style="word-spacing:0.1725em;"
            class="pdf24_17 pdf24_08 pdf24_14">&nbsp;</span><span
            style="word-spacing:-0.0071em;"
            class="pdf24_17 pdf24_08 pdf24_29">Bukit East Ave 2,
            Singapore &nbsp;</span></div>
        <div style="left:3.6292em;top:29.0707em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_17 pdf24_08 pdf24_09">659918 ("The
            Columbarium") &nbsp;</span></div>
        <div style="left:14.7375em;top:30.2607em;" class="pdf24_01">
          <span style="word-spacing:-0.0398em;"
            class="pdf24_16 pdf24_11 pdf24_14">${chapelName} &nbsp;</span>
        </div>
        <div style="left:29.2708em;top:30.4441em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_20">${nicheNumber} &nbsp;</span>
        </div>
        <div style="left:3.8125em;top:30.4707em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">In the Chapel of :
            &nbsp;</span></div>
        <div style="left:23.3125em;top:30.4707em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">Niche No: &nbsp;</span>
        </div>
        <div style="left:33.3125em;top:30.4707em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">of an urn(s) containing
            the ashes of &nbsp;</span></div>
        <div style="left:13.2292em;top:31.6774em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_16 pdf24_11 pdf24_30">${beneficiary1?.name || ''}
            &nbsp;</span></div>
        <div style="left:36.3958em;top:31.7774em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${beneficiary1?.idNo || ''}
            &nbsp;</span></div>
        <div style="left:3.8125em;top:31.9707em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_14">1</span></div>
        <div style="left:5.8125em;top:31.9707em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Name &nbsp;</span>
        </div>
        <div style="left:28.3958em;top:31.9707em;" class="pdf24_01">
          <span style="word-spacing:0.0005em;"
            class="pdf24_17 pdf24_08 pdf24_09">NRIC/Passport No.
            &nbsp;</span></div>
        <div style="left:13.3458em;top:34.2607em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${formatDate(beneficiary1?.dateOfBirth)}
            &nbsp;</span></div>
        <div style="left:13.3042em;top:35.9607em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_14">${beneficiary1?.relationshipToApplicant || ''}
            &nbsp;</span></div>
        <div style="left:28.3125em;top:34.3248em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Sex &nbsp;</span>
        </div>
        <div style="left:36.3458em;top:34.3274em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_14">${beneficiary1?.sex || ''}
            &nbsp;</span></div>
        <div style="left:36.2542em;top:35.8607em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_26">${beneficiary1?.isCatholic ? 'Yes' : 'No'} &nbsp;</span>
        </div>
        <div style="left:5.625em;top:34.3457em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_14">Date of Birth
            &nbsp;</span></div>
        <div style="left:5.2708em;top:35.8981em;" class="pdf24_01">
          <span style="word-spacing:-0.0278em;"
            class="pdf24_31 pdf24_11 pdf24_09">Relationship to
            Applicant &nbsp;</span></div>
        <div style="left:5.325em;top:37.3814em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_31 pdf24_11 pdf24_09">Relationship to
            Nominee1 &nbsp;</span></div>
        <div style="left:28.3542em;top:35.8873em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Catholic
            &nbsp;</span></div>
        <div style="left:27.7417em;top:37.3481em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_31 pdf24_11 pdf24_09">Relationship to
            Nominee2 &nbsp;</span></div>
        <div style="left:13.25em;top:39.0482em;" class="pdf24_01">
          <span style="word-spacing:0.0025em;"
            class="pdf24_16 pdf24_11 pdf24_32">${beneficiary2?.name || ''}
            &nbsp;</span></div>
        <div style="left:36.3458em;top:39.0941em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${beneficiary2?.idNo || ''}
            &nbsp;</span></div>
        <div style="left:36.2125em;top:40.7566em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_14">${beneficiary2?.sex || ''} &nbsp;</span>
        </div>
        <div style="left:5.8125em;top:39.1373em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Name &nbsp;</span>
        </div>
        <div style="left:28.5em;top:39.1582em;" class="pdf24_01"><span
            style="word-spacing:0.0005em;"
            class="pdf24_17 pdf24_08 pdf24_09">NRIC/Passport No.
            &nbsp;</span></div>
        <div style="left:28.3125em;top:40.8248em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Sex &nbsp;</span>
        </div>
        <div style="left:3.8125em;top:39.3873em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_14">2</span></div>
        <div style="left:13.3458em;top:40.7774em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${formatDate(beneficiary2?.dateOfBirth)}
            &nbsp;</span></div>
        <div style="left:13.3958em;top:42.3107em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_14">${beneficiary2?.relationshipToApplicant || ''}
            &nbsp;</span></div>
        <div style="left:5.8125em;top:40.8873em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_14">Date of Birth
            &nbsp;</span></div>
        <div style="left:5.3125em;top:42.3148em;" class="pdf24_01">
          <span style="word-spacing:-0.0278em;"
            class="pdf24_31 pdf24_11 pdf24_09">Relationship to
            Applicant &nbsp;</span></div>
        <div style="left:5.3167em;top:43.6731em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_31 pdf24_11 pdf24_09">Relationship to
            Nominee1 &nbsp;</span></div>
        <div style="left:28.3958em;top:42.304em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Catholic
            &nbsp;</span></div>
        <div style="left:36.4875em;top:42.3607em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_26">${beneficiary2?.isCatholic ? 'Yes' : 'No'} &nbsp;</span>
        </div>
        <div style="left:27.7917em;top:43.7648em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_31 pdf24_11 pdf24_09">Relationship to
            Nominee2 &nbsp;</span></div>
        <div style="left:5.2792em;top:45.3873em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_27 pdf24_08 pdf24_14">("The Beneficiary")
            &nbsp;</span></div>
        <div style="left:3.5542em;top:46.6373em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">By submitting this
            form, I consent to any my personal data being collected,
            used or disclosed by the Order of Friars &nbsp;</span>
        </div>
        <div style="left:3.5542em;top:47.6373em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_17 pdf24_08 pdf24_09">Minor (S) Ltd in
            accordance with its Personal Data Protection Policy
            statement which may be found at &nbsp;</span></div>
        <div style="left:3.5542em;top:48.6373em;" class="pdf24_01"><a
            href="http://www.franciscans.sg"><span
              style="word-spacing:0.0022em;"
              class="pdf24_17 pdf24_08 pdf24_09">www.franciscans.sg.
              Additionally, where personal data of any third party is
              provided by you to OFMS you represent and
              &nbsp;</span></a></div>
        <div style="left:3.5542em;top:49.6373em;" class="pdf24_01">
          <span style="word-spacing:0.0005em;"
            class="pdf24_17 pdf24_08 pdf24_09">warrant that:
            &nbsp;</span></div>
        <div style="left:4.5909em;top:50.6373em;" class="pdf24_01">
          <span style="word-spacing:0.2782em;"
            class="pdf24_17 pdf24_08 pdf24_09">• you</span><span
            style="word-spacing:0.0001em;"
            class="pdf24_17 pdf24_08 pdf24_14">&nbsp;</span><span
            style="word-spacing:0.0002em;"
            class="pdf24_17 pdf24_08 pdf24_14">have the authority of
            that third party to disclose the said personal data to
            OFMS &nbsp;</span></div>
        <div style="left:4.5909em;top:51.6373em;" class="pdf24_01">
          <span style="word-spacing:0.2781em;"
            class="pdf24_17 pdf24_08 pdf24_14">• the</span><span
            style="word-spacing:0em;"
            class="pdf24_17 pdf24_08 pdf24_14">&nbsp;</span><span
            style="word-spacing:0.0002em;"
            class="pdf24_17 pdf24_08 pdf24_09">third party is aware
            that his/her personal data is being disclosed to OFMS
            &nbsp;</span></div>
        <div style="left:4.5909em;top:52.6373em;" class="pdf24_01">
          <span style="word-spacing:0.2782em;"
            class="pdf24_17 pdf24_08 pdf24_09">• such</span><span
            style="word-spacing:0.0001em;"
            class="pdf24_17 pdf24_08 pdf24_14">&nbsp;</span><span
            style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">personal data is true,
            current and accurate &nbsp;</span></div>
        <div style="left:3.1875em;top:53.904em;" class="pdf24_01">
          <span style="word-spacing:-0.0013em;"
            class="pdf24_17 pdf24_08 pdf24_09">The form overleaf, the
            Conditions and the Regulations attached form an integral
            part of this Agreemen</span><span
            class="pdf24_17 pdf24_08 pdf24_33">t</span><span
            class="pdf24_17 pdf24_08 pdf24_33">. &nbsp;</span></div>
        <div style="left:28.1875em;top:55.7373em;" class="pdf24_01">
          <span style="word-spacing:0.0004em;"
            class="pdf24_17 pdf24_08 pdf24_09">For and on Behalf of
            &nbsp;</span></div>
        <div style="left:3.6042em;top:55.9873em;" class="pdf24_01">
          <span style="word-spacing:-0.0043em;"
            class="pdf24_17 pdf24_08 pdf24_09">The Applicant
            Personally : &nbsp;</span></div>
        <div style="left:28.2542em;top:56.9191em;" class="pdf24_01">
          <span style="word-spacing:0em;"
            class="pdf24_16 pdf24_11 pdf24_14">The Order of Friars
            Minor (Singapore) Limited &nbsp;</span></div>
        <div style="left:3.6125em;top:60.404em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_17 pdf24_08 pdf24_09">Name : &nbsp;</span>
        </div>
        <div style="left:12.2708em;top:60.4274em;" class="pdf24_01">
          <span style="word-spacing:0.0064em;"
            class="pdf24_16 pdf24_11 pdf24_22">${applicantName}
            &nbsp;</span></div>
        <div style="left:12.25em;top:61.7982em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${footerAgreementDate}
            &nbsp;</span></div>
        <div style="left:28.1875em;top:60.654em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_17 pdf24_08 pdf24_14">Fr Gerard Victore
            &nbsp;</span></div>
        <div style="left:3.625em;top:61.7623em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">Agreement Date :
            &nbsp;</span></div>
        <div style="left:28.25em;top:61.8248em;" class="pdf24_01">
          <span style="word-spacing:0.0004em;"
            class="pdf24_17 pdf24_08 pdf24_09">Friar - Manager
            &nbsp;</span></div>
      </div>
    </div>
  </div>
  <div class="pdf24_ pdf24_02" id="page_1">
    <div class="pdf24_03">
      <img class="pdf24_34" alt=""
        src="data:image/png;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwS/8bipO04f4JE38AAAAASUVORK5CYIIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=">
    </div>
    <div class="pdf24_view">
      <div class="pdf24_05 pdf24_06">
        <div style="left:3.0625em;top:6.5623em;" class="pdf24_01">
          <span style="word-spacing:-0.0068em;"
            class="pdf24_17 pdf24_08 pdf24_13">The Applicant's 1st
            nominee for contact purposes ("Nominee") is :
            &nbsp;</span></div>
        <div style="left:10.6458em;top:7.9524em;" class="pdf24_01">
          <span style="word-spacing:0.011em;"
            class="pdf24_16 pdf24_11 pdf24_35">${nominee?.name || ''}
            &nbsp;</span></div>
        <div style="left:38.6458em;top:8.0524em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${nominee?.idNo || ''}
            &nbsp;</span></div>
        <div style="left:38.6958em;top:10.0524em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${nominee?.mobileNo || ''}
            &nbsp;</span></div>
        <div style="left:4.1792em;top:8.0623em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Name &nbsp;</span>
        </div>
        <div style="left:28.5125em;top:8.0623em;" class="pdf24_01">
          <span style="word-spacing:0.0005em;"
            class="pdf24_17 pdf24_08 pdf24_09">NRIC/Passport No.
            &nbsp;</span></div>
        <div style="left:28.5em;top:9.8748em;" class="pdf24_01"><span
            style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">Mobile No.
            &nbsp;</span></div>
        <div style="left:10.8458em;top:9.5941em;" class="pdf24_01 widh:8000px">
          <span style="word-spacing:0.003em;"
            class="pdf24_16 pdf24_11 pdf24_36">${nominee1AddressLines[0]}
            &nbsp;</span></div>
        <div style="left:4.1792em;top:10.229em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Address
            &nbsp;</span></div>
        <div style="left:10.8458em;top:10.5941em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${nominee1AddressLines[1]}
            &nbsp;</span></div>
        <div style="left:10.8458em;top:11.5941em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_16 pdf24_11 pdf24_14">${nominee1AddressLines[2]}
            &nbsp;</span></div>
        <div style="left:28.5625em;top:11.7498em;" class="pdf24_01">
          <span style="word-spacing:-0.0168em;"
            class="pdf24_17 pdf24_08 pdf24_09">Home </span><span
            class="pdf24_17 pdf24_08 pdf24_19">T</span><span
            class="pdf24_17 pdf24_08 pdf24_20">e</span><span
            class="pdf24_17 pdf24_08 pdf24_23">l. &nbsp;</span></div>
        <div style="left:28.5125em;top:13.5623em;" class="pdf24_01">
          <span style="word-spacing:-0.0103em;"
            class="pdf24_17 pdf24_08 pdf24_24">Office </span><span
            class="pdf24_17 pdf24_08 pdf24_19">T</span><span
            class="pdf24_17 pdf24_08 pdf24_20">e</span><span
            class="pdf24_17 pdf24_08 pdf24_25">l. &nbsp;</span></div>
        <div style="left:4.1875em;top:14.9998em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">e-mail
            &nbsp;</span></div>
        <div style="left:11.0458em;top:15.0024em;" class="pdf24_01"><a
            href="mailto:${nominee?.email || ''}"><span
              class="pdf24_16 pdf24_11 pdf24_14">${nominee?.email || ''}
              &nbsp;</span></a></div>
        <div style="left:38.7625em;top:15.1024em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_14">${nominee?.relationship || ''}
            &nbsp;</span></div>
        <div style="left:28.425em;top:15.1931em;" class="pdf24_01">
          <span style="word-spacing:-0.0278em;"
            class="pdf24_37 pdf24_11 pdf24_09">Relationship to
            Applicant &nbsp;</span></div>
        <div style="left:3.25em;top:17.3748em;" class="pdf24_01"><span
            style="word-spacing:-0.0076em;"
            class="pdf24_17 pdf24_08 pdf24_13">The Applicant's 2nd
            nominee for contact purposes ("Nominee") is &nbsp;</span>
        </div>
        <div style="left:11.1125em;top:19.1857em;" class="pdf24_01">
          <span style="word-spacing:0.0028em;"
            class="pdf24_16 pdf24_11 pdf24_38">${nominee2?.name || ''}
            &nbsp;</span></div>
        <div style="left:4.2792em;top:19.229em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Name &nbsp;</span>
        </div>
        <div style="left:28.6125em;top:19.229em;" class="pdf24_01">
          <span style="word-spacing:0.0005em;"
            class="pdf24_17 pdf24_08 pdf24_09">NRIC/Passport No.
            &nbsp;</span></div>
        <div style="left:38.75em;top:19.4732em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${nominee2?.idNo || ''}
            &nbsp;</span></div>
        <div style="left:38.7625em;top:21.2857em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${nominee2?.mobileNo || ''}
            &nbsp;</span></div>
        <div style="left:11.1625em;top:21.2274em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_16 pdf24_11 pdf24_14">${nominee2AddressLines[0]}
            
            &nbsp;</span></div>
        <div style="left:11.1625em;top:22.2274em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${nominee2AddressLines[1]}
            &nbsp;</span></div>
        <div style="left:28.5625em;top:21.2498em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">Mobile No.
            &nbsp;</span></div>
        <div style="left:28.625em;top:22.9998em;" class="pdf24_01">
          <span style="word-spacing:-0.0168em;"
            class="pdf24_17 pdf24_08 pdf24_09">Home </span><span
            class="pdf24_17 pdf24_08 pdf24_19">T</span><span
            class="pdf24_17 pdf24_08 pdf24_20">e</span><span
            class="pdf24_17 pdf24_08 pdf24_23">l. &nbsp;</span></div>
        <div style="left:4.2792em;top:21.3957em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Address
            &nbsp;</span></div>
        <div style="left:11.1625em;top:23.2274em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_16 pdf24_11 pdf24_14">${nominee2AddressLines[2]}
            &nbsp;</span></div>
        <div style="left:28.75em;top:24.8123em;" class="pdf24_01">
          <span style="word-spacing:-0.0103em;"
            class="pdf24_17 pdf24_08 pdf24_24">Office </span><span
            class="pdf24_17 pdf24_08 pdf24_19">T</span><span
            class="pdf24_17 pdf24_08 pdf24_20">e</span><span
            class="pdf24_17 pdf24_08 pdf24_25">l. &nbsp;</span></div>
        <div style="left:4.1875em;top:25.9998em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">e-mail
            &nbsp;</span></div>
        <div style="left:11.3125em;top:26.0982em;" class="pdf24_01"><a
            href="mailto:${nominee2?.email || ''}"><span
              class="pdf24_16 pdf24_11 pdf24_14">${nominee2?.email || ''}
              &nbsp;</span></a></div>
        <div style="left:28.6125em;top:26.3139em;" class="pdf24_01">
          <span style="word-spacing:-0.0278em;"
            class="pdf24_37 pdf24_11 pdf24_09">Relationship to
            Applicant &nbsp;</span></div>
        <div style="left:38.8625em;top:26.3232em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_30">${nominee2?.relationship || ''} &nbsp;</span>
        </div>
        <div style="left:27.6125em;top:28.279em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">Niche No &nbsp;</span>
        </div>
        <div style="left:38.1625em;top:28.3024em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_20">${nicheNumber} &nbsp;</span>
        </div>
        <div style="left:15.0625em;top:28.3524em;" class="pdf24_01">
          <span style="word-spacing:-0.0398em;"
            class="pdf24_16 pdf24_11 pdf24_14">${chapelName} &nbsp;</span>
        </div>
        <div style="left:5.2625em;top:28.429em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">Chapel Name
            &nbsp;</span></div>
        <div style="left:5.1125em;top:29.779em;" class="pdf24_01">
          <span style="word-spacing:0.0004em;"
            class="pdf24_17 pdf24_08 pdf24_14">1st Interment Date
            &nbsp;</span></div>
        <div style="left:4.9625em;top:31.129em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_17 pdf24_08 pdf24_09">Storage Period From
            &nbsp;</span></div>
        <div style="left:15.0792em;top:29.7524em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${firstIntermentDate}
            &nbsp;</span></div>
        <div style="left:27.6875em;top:29.8748em;" class="pdf24_01">
          <span style="word-spacing:0.0003em;"
            class="pdf24_17 pdf24_08 pdf24_09">2nd Intement Date
            &nbsp;</span></div>
        <div style="left:38.3125em;top:29.7524em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${secondIntermentDate}
            &nbsp;</span></div>
        <div style="left:27.8125em;top:31.229em;" class="pdf24_01">
          <span style="word-spacing:-0.0083em;"
            class="pdf24_17 pdf24_08 pdf24_09">Storage Period
          </span><span
            class="pdf24_17 pdf24_08 pdf24_19">T</span><span
            class="pdf24_17 pdf24_08 pdf24_19">o &nbsp;</span></div>
        <div style="left:15.0792em;top:31.1524em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${storageFrom}
            &nbsp;</span></div>
        <div style="left:38.3125em;top:31.1524em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${storageTo}
            &nbsp;</span></div>
        <div style="left:3.7125em;top:33.9191em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">Date &nbsp;</span>
        </div>
        <div style="left:32.025em;top:33.904em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">Amount
            &nbsp;</span></div>
        <div style="left:31.675em;top:35.2748em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_17 pdf24_08 pdf24_09">$ ${formatCurrency(nicheAmount)}
            &nbsp;</span></div>
        <div style="left:35.9em;top:33.904em;" class="pdf24_01"><span
            class="pdf24_17 pdf24_08 pdf24_30">GST &nbsp;</span></div>
        <div style="left:13.525em;top:33.9816em;" class="pdf24_01">
          <span style="word-spacing:0.0004em;"
            class="pdf24_16 pdf24_11 pdf24_14">Inv/ Receipt
            &nbsp;</span></div>
        <div style="left:20.5875em;top:33.9816em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_14">Description
            &nbsp;</span></div>
        <div style="left:44.8292em;top:34.029em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_19">T</span><span
            class="pdf24_17 pdf24_08 pdf24_20">o</span><span
            class="pdf24_17 pdf24_08 pdf24_14">tal &nbsp;</span></div>
        <div style="left:3.5875em;top:35.3149em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${invoiceDate1}
            &nbsp;</span></div>
        <div style="left:3.775em;top:36.9399em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${invoiceDate2}
            &nbsp;</span></div>
        <div style="left:42.7333em;top:35.3373em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_17 pdf24_08 pdf24_09">$ ${formatCurrency(totalAmount)}
            &nbsp;</span></div>
        <div style="left:13.4625em;top:35.3774em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_20">${invoiceNo1} &nbsp;</span>
        </div>
        <div style="left:36.1083em;top:35.3998em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_17 pdf24_08 pdf24_09">$ ${formatCurrency(taxAmount)} &nbsp;</span>
        </div>
        <div style="left:37.7542em;top:40.154em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_19">T</span><span
            class="pdf24_17 pdf24_08 pdf24_20">o</span><span
            class="pdf24_17 pdf24_08 pdf24_14">tal &nbsp;</span></div>
        <div style="left:20.5875em;top:35.5248em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">${applicationCode || ''}
            &nbsp;</span></div>
        <div style="left:27.4625em;top:36.7748em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_09">${paymentMethod} &nbsp;</span>
        </div>
        <div style="left:40.9917em;top:36.8415em;" class="pdf24_01">
          <span class="pdf24_17 pdf24_08 pdf24_14">-</span></div>
        <div style="left:43.1083em;top:36.8373em;" class="pdf24_01">
          <span style="word-spacing:0.0002em;"
            class="pdf24_17 pdf24_08 pdf24_09">$ ${formatCurrency(totalAmount)} &nbsp;</span>
        </div>
        <div style="left:44.2958em;top:39.8373em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_17 pdf24_08 pdf24_14">$ ${formatCurrency(balance)} &nbsp;</span>
        </div>
        <div style="left:13.525em;top:37.0024em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_20">${invoiceNo2}
            &nbsp;</span></div>
        <div style="left:5.125em;top:46.8123em;" class="pdf24_01">
          <span style="word-spacing:0.0004em;"
            class="pdf24_17 pdf24_08 pdf24_09">Name of Deceased
            &nbsp;</span></div>
        <div style="left:28.25em;top:46.8123em;" class="pdf24_01">
          <span style="word-spacing:0.0001em;"
            class="pdf24_17 pdf24_08 pdf24_09">Death Certificate No.
            &nbsp;</span></div>
        <div style="left:38.6875em;top:46.8123em;" class="pdf24_01">
          <span style="word-spacing:0.0004em;"
            class="pdf24_17 pdf24_08 pdf24_09">Date of Deceased
            &nbsp;</span></div>
        <div style="left:39.25em;top:48.2857em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${firstDeceasedDate}
            &nbsp;</span></div>
        <div style="left:39.3125em;top:49.5982em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_09">${secondDeceasedDate}
            &nbsp;</span></div>
        <div style="left:5.125em;top:48.3482em;" class="pdf24_01">
          <span style="word-spacing:0.0025em;"
            class="pdf24_16 pdf24_11 pdf24_32">${firstDeceasedName}
            &nbsp;</span></div>
        <div style="left:28.25em;top:48.3482em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_20">${firstDeceasedDeathCert}
            &nbsp;</span></div>
        <div style="left:5.25em;top:49.5982em;" class="pdf24_01"><span
            style="word-spacing:0.0001em;"
            class="pdf24_16 pdf24_11 pdf24_30">${secondDeceasedName}
            &nbsp;</span></div>
        <div style="left:28.2583em;top:49.5982em;" class="pdf24_01">
          <span class="pdf24_16 pdf24_11 pdf24_20">${secondDeceasedDeathCert}
            &nbsp;</span></div>
      </div>
    </div>
  </div>
</body>
</html>`;

        // Normalize header images to a single shared base64 asset (no UI/layout change)
        // Note: the raw template contains duplicated/legacy base64 strings.
        const headerImg = (className: string) =>
            `<img src="${PDF_ASSETS.headerImageBase64}" alt="" class="${className}" />`;

        const normalizedTemplate = template
            // Page 0 header image
            .replace(
                /<img\s+src="[^"]*"\s+alt=""\s+class="pdf24_04"\s*\/>/,
                headerImg('pdf24_04')
            )
            // Page 1 header image
            .replace(
                /<img\s+src="[^"]*"\s+alt=""\s+class="pdf24_34"\s*\/>/,
                headerImg('pdf24_34')
            );

        return normalizedTemplate;
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
