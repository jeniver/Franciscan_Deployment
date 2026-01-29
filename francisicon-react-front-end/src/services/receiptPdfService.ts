import jsPDF from 'jspdf';

interface ReceiptApiDetail {
  description?: string | null;
  quantity?: number | null;
  unitAmount?: number | null;
  lineTotalAmount?: number | null;
  refDocNumber?: string | string[] | null;
  refDocName?: string | string[] | null;
  itemId?: number | null;
  totalPayingAmount?: number | null;
}

// Helper function to convert number to words (for receipt amounts)
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const convertHundreds = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
  };

  const convertThousands = (n: number): string => {
    if (n < 1000) return convertHundreds(n);
    const thousand = Math.floor(n / 1000);
    const remainder = n % 1000;
    return convertHundreds(thousand) + ' Thousand' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
  };

  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);
  let result = convertThousands(wholePart);
  
  if (decimalPart > 0) {
    const cents = decimalPart < 20 ? ones[decimalPart] : 
      tens[Math.floor(decimalPart / 10)] + (decimalPart % 10 > 0 ? ' ' + ones[decimalPart % 10] : '');
    result += ', And ' + cents + ' Cents Only';
  } else {
    result += ' Only';
  }
  
  return result;
};

interface ReceiptApiPayload {
  receipt?: {
    receiptId?: number | null;
    code?: string | null;
    transactionDate?: string | null;
    customerName?: string | null;
    address?: string | null;
    customerAddress?: string | null;
    totalAmount?: number | null;
    payingAmount?: number | null;
    paymentMode?: string | number | null;
    paymentModeDocNo?: string | null;
    status?: number | null;
  };
  invoice?: {
    invoiceId?: number | null;
    code?: string | null;
    invoiceNo?: string | null;
    transactionDate?: string | null;
    invoiceDate?: string | null;
    customerName?: string | null;
    address?: string | null;
    customerAddress?: string | null;
    totalAmount?: number | null;
    payingAmount?: number | null;
    taxAmount?: number | null;
    paymentMode?: string | number | null;
    paymentModeDocNo?: string | null;
    details?: ReceiptApiDetail[];
  };
  details?: ReceiptApiDetail[];
}

interface ReceiptPdfOptions {
  requestedCode?: string;
  applicationCode?: string;
}

const PAYMENT_MODE_MAP: Record<string, string> = {
  '1': 'Cash',
  '2': 'Cheque',
  '3': 'Bank Transfer',
  '4': 'Credit Card',
  '5': 'Online Payment',
  TT: 'Telegraphic Transfer',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  BANK: 'Bank Transfer',
};

const formatCurrency = (value?: number | null): string => {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const escapeHtml = (value: string | undefined | null): string => {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatDate = (value?: string | null): string => {
  if (!value) return 'N/A';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    // Format as DD-MMM-YY (e.g., 03-Oct-25)
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return value;
  }
};

const resolvePaymentMode = (value?: string | number | null): string => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const key = String(value).toUpperCase();
  return PAYMENT_MODE_MAP[key] || String(value);
};

const normalizeRefField = (value?: string | string[] | null): string => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(' / ');
  }
  return value;
};

const collectLineItems = (payload: ReceiptApiPayload): Array<{
  description: string;
  quantity: number;
  unitAmount: number;
  total: number;
}> => {
  const items = payload.invoice?.details ?? payload.details ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map((item, index) => {
    const descriptionParts: string[] = [];
    const refName = normalizeRefField(item.refDocName);
    const refNumber = normalizeRefField(item.refDocNumber);

    if (refName) descriptionParts.push(refName);
    if (refNumber) descriptionParts.push(refNumber);
    if (!descriptionParts.length && item.itemId) {
      descriptionParts.push(`Item ${item.itemId}`);
    }

    const description = descriptionParts.join(' • ') || `Item ${index + 1}`;
    const quantity = item.quantity ?? 1;
    const unitAmount = item.unitAmount ?? (item.lineTotalAmount ?? 0);
    const total = item.lineTotalAmount ?? unitAmount * quantity;

    return {
      description,
      quantity,
      unitAmount,
      total,
    };
  });
};

const addKeyValueRow = (
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelWidth = 35
) => {
  doc.setFont('helvetica', 'bold');
  doc.text(`${label}:`, x, y);
  doc.setFont('helvetica', 'normal');
  doc.text(value || 'N/A', x + labelWidth, y);
};

// Generate receipt HTML template based on the provided template
const generateReceiptHtmlTemplate = (payload: ReceiptApiPayload, options: ReceiptPdfOptions = {}): string => {
  console.log('[generateReceiptHtmlTemplate] Payload:', JSON.stringify(payload, null, 2));
  
  const receiptInfo = payload.receipt ?? {};
  const invoiceInfo = payload.invoice ?? {};
  
  // Extract data
  const receiptNo = receiptInfo.code || options.requestedCode || 'N/A';
  const receiptDate = formatDate(receiptInfo.transactionDate || invoiceInfo.transactionDate || invoiceInfo.invoiceDate);
  const customerName = receiptInfo.customerName || invoiceInfo.customerName || 'N/A';
  // Get address from invoice or receipt
  const invoiceAddress = invoiceInfo.address || invoiceInfo.customerAddress || '';
  const receiptAddress = receiptInfo.address || receiptInfo.customerAddress || '';
  const address = receiptAddress || invoiceAddress || '';
  
  // Get line items
  const lineItems = collectLineItems(payload);
  
  // Calculate total amount - try multiple sources
  let totalAmount = 0;
  if (typeof receiptInfo.payingAmount === 'number' && receiptInfo.payingAmount > 0) {
    totalAmount = receiptInfo.payingAmount;
  } else if (typeof receiptInfo.totalAmount === 'number' && receiptInfo.totalAmount > 0) {
    totalAmount = receiptInfo.totalAmount;
  } else if (typeof invoiceInfo.payingAmount === 'number' && invoiceInfo.payingAmount > 0) {
    totalAmount = invoiceInfo.payingAmount;
  } else if (typeof invoiceInfo.totalAmount === 'number' && invoiceInfo.totalAmount > 0) {
    totalAmount = invoiceInfo.totalAmount;
  } else if (lineItems.length > 0) {
    // Calculate from line items as fallback
    totalAmount = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  }
  
  console.log('[generateReceiptHtmlTemplate] Calculated totalAmount:', totalAmount, {
    receiptPayingAmount: receiptInfo.payingAmount,
    receiptTotalAmount: receiptInfo.totalAmount,
    invoicePayingAmount: invoiceInfo.payingAmount,
    invoiceTotalAmount: invoiceInfo.totalAmount,
    lineItemsTotal: lineItems.reduce((sum, item) => sum + (item.total || 0), 0)
  });
  
  const totalInWords = numberToWords(totalAmount);
  const paymentMode = resolvePaymentMode(receiptInfo.paymentMode || invoiceInfo.paymentMode);
  
  // Get invoice details from payload for table rows
  const invoiceDetails = payload.invoice?.details ?? payload.details ?? [];
  
  // Build table rows - receipt shows single row with invoice number and description
  let tableRows = '';
  // Get description from first detail's refDocName (e.g., "St 5585 Bernadine")
  const description = invoiceDetails.length > 0 
    ? (normalizeRefField(invoiceDetails[0].refDocName) || invoiceDetails[0].description || '')
    : (lineItems.length > 0 ? lineItems[0].description : 'Payment received');
  
  const invoiceNo = invoiceInfo.invoiceNo || invoiceInfo.code || '';
  
  // Receipt shows single row with total amount
  tableRows = `
    <tr>
      <td>${invoiceNo}</td>
      <td>${description}</td>
      <td style="text-align: right;">$ ${formatCurrency(totalAmount)}</td>
    </tr>
  `;
  
  const safeReceiptNo = escapeHtml(receiptNo || '');
  const safeReceiptDate = escapeHtml(receiptDate || '');
  const safeCustomerName = escapeHtml(customerName || '');
  const safeAddress = escapeHtml(address || '');
  const safeInvoiceNo = escapeHtml(invoiceNo || '');
  const safeDescription = escapeHtml(description || '');
  const safeTotalAmountDisplay = formatCurrency(totalAmount);
  const safeTotalInWords = escapeHtml(totalInWords || '');
  const safePaymentMode = escapeHtml(paymentMode || '');

  const html = `
<!DOCTYPE html><!--[if IE]>  <html class="pdf24_ie"> <![endif]-->
<html>
	<head>
		<meta charset="utf-8" />
		<title>
		</title>
		
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
	width: 49.58333em;
	height: 34.91667em;
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
	clip: rect(3.058334em,45.20833em,30.70833em,3.416667em);
	width: 100%;
}
.pdf24_05 {
	position: relative;
	width: 49.58333em;
}
.pdf24_06 {
	height: 3.491667em;
}
.pdf24_ie .pdf24_06 {
	height: 34.91667em;
}
@font-face {
	font-family:"JMUUJQ+Arial,Bold";
	src:url("data:application/octet-stream;base64,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") format("woff");
}
.pdf24_07 {
	font-size: 1.020833em;
	font-family: "JMUUJQ+Arial,Bold";
	color: #000000;
}
.pdf24_08 {
	line-height: 1.117188em;
}
.pdf24_09 {
	letter-spacing: -0.0036em;
}

.pdf24_ie .pdf24_09 {
	letter-spacing: -0.0594px;
}
@font-face {
	font-family:"OOISBJ+Arial";
	src:url("data:application/octet-stream;base64,d09GRgABAAAAAFv4AA0AAAAAl7AAAQABAAAAAAAAAAAAAAAAAAAAAAAAAABPUy8yAAABMAAAAEIAAABOVnJpn2NtYXAAAAF0AAAA8AAABsJfRnCCY3Z0IAAAAmQAAAUxAAAGcK2/345mcGdtAAAHmAAABogAAAuwOKUWK2dseWYAAA4gAABDVwAAbWxFQPVAaGVhZAAAUXgAAAAvAAAANj0bGN5oaGVhAABRqAAAAB4AAAAkDWQE52htdHgAAFHIAAAAqQAAANji5hVubG9jYQAAUnQAAAC+AAAA3AALiyxtYXhwAABTNAAAACAAAAAgDFsXS25hbWUAAFNUAAAA3gAAAbO98+NwcG9zdAAAVDQAAAAMAAAAIAADAABwcmVwAABUQAAAB7UAAAwwobLo6njaY2Bg7mCcwMDKwME6i9WYgYFRGkIzX2RIYxLiYGXiZmNhAgEWBjQQ4uuswODwQeFDCLvdPz9GY3Y7xk0AVdwKyQAAeNrt1ddKA0AQheHPmNh7770bNfZyZUdFVNQXEDv2CoIP5Fvq6DNIrjLDlmGXHTjnh0US+TH65MUscRBV7JKfsRZR8CWZSMfBrWUpaV1xM23MuIxJU6bNmDVn3oJFS1asWrNuw6Yt23bs2rPvwKEjx06cOnPuwqUr127i5Tv3Hjx68uzFqzfvPr6/o2t2u2UvbrOYqdBtwmBo169Xu4FQskG3odC2R4FqjarC81oVoW6lUTVKlatTqEO9RHAwHJxkdIYPxZrDjxFtypT88dASpDRpDV/kWMmxkmMlx8r/sxJVfE6REb+a/uka1Q87CM3OeNpVVHlQ1lUUPfe+934fIdpMuQBZCiqTkJk4Zo4ObqktgAIuZCJZMoCmiMqIiSuKS64MkuCWuYCaaM4HKWm5Z6OAqblVoJihTgo1k+b2e12tP+o78+bN937v3XfveeceU44AU45AU4QAHQJ/wNbJuP54dlPtdfkW8HjmmwD2/DuAYuygVOzANzhEDXJqJ/bCi+NogdexBlnIw3w4GC4rCxErMLKeRwHWi47YACWjQvYOwwyUozn52xuYiXnqjJyah8YIRm8MQhqWUKTNwAjU6Gx0RSTGYwLNsvF2qc21m7AZe9Vx+wiNEIgPBBX2trlgf0IHObESBaih3KdK0UtumSU712IiClWCJpts70sGQZgiOWhEoYIOcJhET0Id+VOW6itRNtpd9ojsaokEpKAQ5dSFBnCQGWGjbAWayx2ZErUAu1Em2IP9uER+psFusg0IwEt4U+rxopIOKPfRbLenMGaEpfboJl/S8DW+xSlqQwc5zfiZcNPLfGTPoik6YYhkWyQnf6W7PEMwUx3T/W0fNBFeVjxmG0dxhQKpIw2kodye03idmggfubGTYDRShe9VEr2awqiM/bhKbdTb9QPnefeybSIvEoLVWIuD1FgqbU2TaA6do6vclxN5NdeqPL1Vn/aMkqpHYhyWYDvu0jP0GsXQu5RCWTSfVlABVdApus69eTCP5XqVotLVft1HEKcn6WyTYz52rrvx7hH3e/euDbc5iBE9zJbsV2KdVLYXVbgoqEEtGWpETQStKYiG0DTBDFpCn1ExbSWv3HKKaukG/UF/0gOGwOHnOIiDBW14Ik/hPF7DVYJT/BvfUy1UsApTXVQP9Y5Kk6zmq+WCUnVFB+oqbYXncJNv1ptis90cMg2On2eOD3xOPtz4KPRRtQt3gZvv7na99gqayRsGCgut0EOyHyUYI++dL4rbiTPkJ9wFUihFUKQwk0hjKJ0yhcm5VEibn+ReQvuEpfNULzk35pZPcn6Zu3AfHigYyUmczss5l718ju8rj2qknlbNVKgaoBJUkpqspqp8tUudVD+rWnVHPRRY7atb6WAdosP0AJ2oM/Q6XafrzAhzwlxzfJ1xTo6zx/nd86onwjPIE+NJ8CzzlHnO+rwn6jyMUnyJ//zospqt+qlSLOXOOoAruVL0nIjRKopFqVxMC3g6ebmtyXS6c3eKRoMOEa6P8Xq+w91VFL1NcRjDnf6J5jTV22TqoQ/jlt4ntVVK5EzHj2ZwveOH3QTuJnceVa/oMHUCl1QNefQG/Kh9qQXd4iI1SFSwX0eYeASpNShR6TQdpdwP8H3gs1h0HE3bxBcGUzj9pSwUR4uKuqqryMZYvoBb0scL8AmN1slYis6UhTpska5ob8Y7oU4z+o5T9SJ+lrxgvVWq60ZtSZmmmEsJqtCp54vIQJX2RbX6XLKv4hIVpRtMLKVIB0xHDtLtbEw18fo0JUPRULTTl8XdslS4DpJ5prjKCPG0MunucvGB3ipKVvxFOZGiiyHiEIWCVeITWhSUKj0+TFysEl5nMO9BsmlC4jqAPuHGYrjdggKbjPE2Fx3ED+bbLIlYjGtYhmKa507DBLwgnVNNkaY/V5n+tgMv4oscx/n/f19hux3546agRP5EmK+wSJ9HHHraxfYHUfeL4rAFeB9v4Rep8rbc8IY6gM5uNH9h+6sJUm8NYmyRbUW+SLEfYiD2YbPHYJQnTN54F52WeqchiWPtZJXkpgoPy4SFXsJWhvjPQp2us/U9LJaezxe/+VT6Zpt0zuPex99PS8VJAAAAeNqNVs1zE0cW7x4LWwgDAgIGj7Pp2Y60CSOF7AeLI7NmYmkERpXEHzKZMVCZkSzHsPlwslupZfeiCxWqIVU55pg/ocfkIHOict//YQ97TKpyydn5vR5JllKbrUjz8T5+r9/r169fj3f74d//9uknux9/9OEHf71/b+f97U7rbvDurY3mO2+/6V1b/MvVhcob81cu/+mPf/j965deK5fci6++8rti4WX5W0e89JsX5+zZC+dnzp194czpU/mTJ45PH8sdzU5NHslMWJyVfFmPhC5GOlOUN26UiZcxBPGIINICovo4RovIwMQ40gNy+2dIL0V6QyTPi6vsarkkfCn0v2tS9PjmagD6i5oMhf7e0G8Z+ktDHwftODAQ/vmdmtA8Er6uf7aj/KiG4ZJjuaqsdnLlEktyx0AeA6Vn5G7CZxa5IawZv5JYLHscQelZWfP1BVmjCPREwY+39Mpq4NdsxwnLJc2rbdnSTC7pk66BsKpxoyeresq4EfdoNuyxSErP1ZNenrUid3pLbsV3Aj0Rh+TjlAu/NT3zz/+eP2Qx+Olq8Pmo1p5Q/vl7glilPhf669VgVOvQMwwxBmytQj1Sdbh+giQ21gW8WQ/DQPOHcCloJjSrdH4d6ZMkui/0Ubkkd9T9CEszqzRbe+Dszc56+wf/YbO+UM1AOvqaLcO4Npe8wNTag6cXPHFhXFMuJflTaWKTEyf7xPTxUaIz1BnKwIlqrA0zyykiuYyC0KItEEkgMad5enTmmWrPA4ZfyGGlt7Ai9/TRaqTyFZKTvT5SyEuhfmSoAPn9d+OSuC+ZLOR/ZERSnQxLDfoBrV1XX7xIJTJVxZoixkXDXy6XPutZUu7mBV5IH1tBbuOwcgnpdxxa4Mc9j7XA6O5qkPKCtew95l1yQ21FpHk+0JzdIE13oBmaRxKV/A3jjLGzOlscXifz5874OxXNz/0fdSfVN9ZlY3UzEL6K+rltNMe4VD8/1PUpfaYaTNhWn7LsCaNFUd4ZgokJpnWmgGvSFPVWbyqLqjQSLuo6H91In2HOcX6lUe/gB7Iyr0Ozfpi64o7zC2P8WHjTagIBZ4pWo7mpVG5Mh1JLHS73X6h41gwcUdVsAzuzgKt38Hye7tDWHlJWJQDqLxX12TGg3adD/Kg6y6U6Gp1SdSnqKlJx76DbkiIv1b71rfWt2vWjQeH0Dp49tnX9SYhc7fBKuSRJo9RWwiYKcOPZCTfElerjUL/jhlK3XOnIoIO5JBU27TSjKiiLLSWSP1pNPP5ofTPYzzMmHjWDPYtb1WgpTF6GLtgXjHlGapGUhMQIYliDIzV7Vtbg7X2Psa7RZozA8O0eZ0aWHcg4a/esVJZPHRWNI49Z0GRSjTdAZyDLprJuin6lj85CkyfNM4YThxll+kvANAMvd8WreAveonXNQkZItAfJM2AXOHu6yK9xO8GYa0bc491kwbP3zUhrfWQXSJJ1hzJETrCRgeAvnfjG4Qw2NoOniwzjmycQS/SjTosgRveQaUxU5++6wbSlGuuoQFLm5u3ciFqQoeZSvyf/4dDs9C35wIFQaoFuDVDCrs+FSgn8JbLSvhWkT1Lx0hxGCnW3NcDac6iJQ3Yapqauns5RDxl6+9fA26fwRoQauNPt/+kN0Wt+m57mMuEnf2Yy9Y9TOnWq7qhN1KOjXyTH/TjAnpgLzQiI5CsTCTeHUxvfBNu0lwQ1ObRJeTOx3nbNm5u3uin9LSDoxqF7GYvliK2QUJI2DRX+L4L4CIgOEjO4yi8MON7n0u2r9Pvj7M6QrdONb5TCa2mbwFzMlnX0fVt/ELpDSExzVtjbFdrgFWN8ne4Ix8513W3HCBHnzXJbQnATAhG00gzSQa3oy6kdw4yy3PekP3LHhkRP4GhRGIimo7srIgpFhB7CV5FsW+gjeIttfD7JmPrGSjqfFTR/vGK1DltGy2brKfSz7bgjqblqqvc0+xRjBtGx9UAzWymJGkKIhTrAGL6oJ4vL9MK168q4Q1922/Rh10k/ORCuyQ6NZvvSCQGxCiaXSBw2WosebUXfjXcjF5k4pU4r8YbChr+LXpUptm9F6GsiL+rCLHVsg0MSlokLMVAKPFogIOzNVdQfusndqcKhxFwfuyk4a0Y1HxF6ZQCZMheIT1xtzcxDSZPna5vmXMBCUfKOFJaRXg9VZZM1dlGzf2yk9stkag8WLDWDJBwcAKj3pMAfrYx2wjv6dGPtto3Eln8C6GZQznjapb0JnBTVtT9+b+1rV1Xv23T3LN2z9MAMszI4OoUKLsiiSMsgHVAEZABlAFEUZFAEVFTU5xqjqMSdsMwAIxglhmg08sMENU8TlbwgUZMxPMMjCkzP/95bVT09av4vv89vmK46VV1Tdevec8/5nuUeAAXQDzVVAIAGPADQ/rHOAtC/hZqAtjsAQFeAbwBgAeBP4C/B4+hgGrsHaKAITth2W3qq6U7E4TlCtChGQcrQYxoQAqP1gRxQgAJNkAGBga+BDGSbPoHOq9A045lAKiHCuKmq1BQxoetoK2ka2gbJmd6B46aiKNwUMRwv0l2y3AvNnowuqapFoO8QYboyegImAATkDqB34EQPvgkh8H0QcbJHUQjxzx58P0R8Y6LbICobO2N6MK2fSJOfbGs/2rbah9k+tAFtrf2t+DOi9pzlZhMd4QVOYAVGYLhQMBykOFlSJFWiOZ/f6/f4aS5CB4qh24U2QSFaDP2SUQzSaZhOV6Gf1TAb2Q70Xrq+ZwEQYBEidiyAFAi2pdvStSPa643iuoA/4Hf7vJSLKk0W1zU1NzU1NqTKU6XFj8NvX5x2c/vSJRNuvPfAbbntsOXen44YM/6hBRO25N5h9/iKLroyd3D/s7nc81fUbWkaMeaLZ47+syqGBuzCgc+ZKHMWqADNdAkZsGpRFatCariqUq2qalGbfM2RUVUXVGXVbFWHOq9qZu0d6trKR/0/Dj+v+ip6Bz7vkWVuSjkizBCmngm9ULErtLdif+hgxe98H1cI5/phDA+XgbvX7cZblgxdY+/AYXMipuKBeDBdXdXQwrRUX8CcX50R2tNzhHnpZco65S3lW/XbtNHc4IKMXlPWEKgr9gZnVF5bSVVGa1xtrntcT7gGXOwTrq2uv7to196BkxY77c64FDzWrt6BL3vw6LtwI7y6zk1xKXh8XZymoW3KZhlXkLDMzozLFaUDvdQL3cFqwlaIiYLVknT2lOAD3miUB/l3AWPKpbooLVdeoV8BEE+fyPMxGPgmz99g4DRQCU/LGcARpksWl/UO/I00ChOmjM+WMZgP0fER1KGEOE56FhF/NGXc7DLSYHR8mnBqWS91uekqN0FKTyVStamtKbald2Bfj8tFTUn1DnxgEXsHjluP786kRuDvTTVW2lDbsq+F2tQCWwLoMbvxzQOCNWPETCAZLKkR7F6psSYSIqw5ZhqZmrLXuIMcFefaOIrz2jOP89p/wNn3GZ7hXLj7OQW/HBfEL8cp+M3wlpvCufAYcDp+E27ESGeWkbnViSfXcbTRs53pE2S2HXe+JLMw/dlnoK2v7Ui6rQ8dHjHcLTUFf9yJjtFvCzTcgZYRtSCLz8NOtAOdkd2ATqcVxVXZSw/bvQCNdblE1xGaloOBQNTbS9fsWICGGU27upp6NPcMdPMWox7dEU3CJMeVlqQaG5rQ3MP/GhvQ7Cvh+PKzqPo6P5qdPp/XHyhN0RzvohBZjydpI9161csdW185b8n5jfM/mgvrx6xftbxoW/Cad29f/8IkXQyUvBINXLn/2ul1C+dd/VSq6NYpY1+8bcLqCV6XGi5LStcMO7O9M9h55zjziguH33Ds1G1njoQfV0T1ivE158+8fOKZ1yP5VjbwNVXFPgIC8Bo8iUcngFIgY+UCWiig+QKaK6ClgX3dpakGEbNLGSK6QhBARZUgDfy6mNYkzo/4XtNLQAlU3Q6vuB0x7JYsHijJuJMKHOCFMeKYmfwivovfyDOAT/Cb+G38Pv5dnuN7B74i84DH7I75BRFfE85FxDdERhMCsw+PhTXmVUQcM2U8GXgO8w+PpRBmJ34P1QGCsGn7nEG5TXji+BG9z5bfR463Yt5BUttoQXxSX6+/NaIWZu1LI9tpfy9d14O4AQJEmOICiLSB4ZJExCQ7FkgcZoz6uroaWyonA5ghUo1GaWO90WzU+0oNrx8NO6WHL2q9ckH1mjXdO3d60hWxJ5/Qz5r9FDVrA+QX5O7a0H//+Oowkr/jkPyNIfnrA0WUn8jfQBxEfdQUOstmxSnybHo+e604WxZ8WDLglzQQYV6CqaIo3pa7P2RPek+EmRHuUaER0dHu8eHR0Yvd00OXRK9wLwxfEb2Bu8F3gjoR1IEfamogMMk/07/IT/uj2kZ9k07pOhOJSjzYQ70AIJIfeDggHnkX7msd6f0HPFFGxlr72L/Q2t84IiZgqkhckWFT8dDi9qlYAONhUvFNxfKqhm0qVMNxdNSdTDXg/W4skuIw7t/rCMtdGX+9LtiyZ1C/W6xmejJ6GW+WVTXE+TZ+Ik/zjpTiFeuCdIZPYFnDE7nDRwkfubDc4aOEY/yEXUKxhuZgeoKely7Z9HjMJUfQuc50+kQnPjfeUvV9/YhHjrT1IVmDoEBnK8Qixt2CeYdIGNi5OGIWATAJLAJdYCNga21iH3gXcAAwOmKsGlNdoAO9Vqc8tC4xHnSmZwEjSxEidSTeUvbulhk/ytakjfqabCdiMRjAQgcYOqivA4aXL8b81QSLU0T00D/aU/3Vy1/k/g69f3wfuuDpz6Udt83a0P8RdbEyMnP7iudhJvB0D4xDGiqwIvdJ7ls9sXXP1fCBtedc/QxiwJcRvlvLpAjSsxBbgmEBx4sU18rQrZBjJKq1BrQBCuOoJ4UnH0Zz6zgSs6CtrU/vs7sB9UNkJ8sIwIQgWBM+0HYANdzTWO+j0eflAwcO0O0HDpx+9sAB9MQnEUbcgjBiEJRQq8gTi92yC7qbotPic4SFcUbU8egIZMuTbRlWbHgoVSwnMKE4hOwQ7t6B/+p2hxvQ/lh3SXmDgY+Lyht0e6/Ze/T9f3YXpazv0fW6vcffmxcgIum6MHphYrI8Pbowuli8wbVcu01arz2kPq/1ap+7/qLpLkVJGJrXMDRDU0R3hCoO+yXObeiqwgZF0R8Ih2KBVwf2FcyQfaYPc18gAIpLMBIGwaCmuYTYECgcK5hUMQcK78zEUq7HOCziiD51oCuH0VOIqFWOqNJsomxRWVcZXVYSpOzpEHQmTlBSVBvK/K942JQJIOZwe38QFpee8VzhpMm2jrcka5ZI3NCRoI2NdfQPy1minfvRQUsNUsjQCLSscw1Psyv1/QWC1/oB+H7nTJ9qSoKptWj6KMM9Cp1qh53o5MvANfCJGQ61GCWhFjf6uMxoi17iRZ84+vha7Ju0R3aIoQAW3vKCUAhATUBwugQd5+F0G0EMLTao9vt9Xo5HujvgKaWHU2hWlRroNMHWpcVPUnfsf+fGtw+Nr5hy0cDx16dcc9mw4nF/gk/e9uCEh57O1bJ7Jv56+WMfFCXLJlyX64Qj1mwYKfP919H1zcvPu3ot6ulJA5/TfUjAh6krMK+/gpjBFqM9GcmRcKJDaHmZ5xAGIl7GLLGdos65dKrZ4FqlQQ0zCZY0NGDcUZkPIgENXT5eIJqTQC4sE9FWJ2KQwKMD772BNV+fvj9bhz9oyprniQqMR8/xnBOY7JkcmOmZGfgx9WP6UXWzvjmsCGpI6qDm0R3sdcoitUt9Rtkp7pJ2KopfWav8maJdJTO0a7VVGq1BhJfNVC3AjZqJmrURbAKHwTEgAk2TwWAbo6jpoyUESR2W1xyWN7WMVuYSCDAviaB+G3IZGPgqfxkok9NxZIwixWS60qSPoGlDEGjavQabLLiaQKcwI0MTKzN4PuZlGMZPgRdEfQ5y8Tn6w2ej3OKMr+wgD7F6oWy9IRHkQcwXW8tgdUP+bleGHxFp2J/HHBaAHQQg2cXjJpeOu3ga4mCkYEe2o28XH0/jLRkPxIsIY+rZI+gXw9VOmO1shzYeMSVkdrsRlHYzQVtbyG6iLWRbW6C/rcefAk3R4G5CaDTAp7CCsFAo3bq96O8/+yj3z8Vf3L7lj/GtoVXT1r+weU3H3fC2wO6DsAhKL0Fq9dYnI/MX/PLQB6/fguT0eqQZWpGcRpqBkjDvdlOSLU9oh+AcgkfE6BAZLIiU+KAlNEizBTTj0D0ZSrY7n3YIziF4RORv2l/ADYM0W0AzDo1uythDRDsE5xA8IgpaSuBGoZ1mt9Shmbz91pwRm/BsmihuFDeJ28R94qfiMZEHYlxcJHaJT9inDosDohQXEYPyDEWLHL0XaQLrDlUZ+mYIOBbpVI5PsoB5gtnEbGP2MYcZbh9zjKEAk2DeRUcMg0EvltEMlsgBPK0ZYiAyEm4C48U8yVimLSFyBGsh4rQpYR5lJgjnTSpEwdnOxUgWI6Xd2taXJlrbIGobZhd3pv/VT2Q3I7EcVuqI15BWb3O0OrKH1vf09DB/PXjwlI9JnfoI8cu63DymGEk6N4jB94leX6row/Qz9XE605bYlqDiiUqltKjOV1d0dtGixMaEMCowKnJh4MJIu3C5Mj0wPdIhzFfm6QsD8yP7Eoe8Hwc/Dh+KHfEeiR1ODCT8pUxaT/samVH6WOZCfZr+mfzXopwuGy6EZKMcD5FN4pKBK4RU6qAaDRUIkZCDU81oJlT2rgR1yZRmSl0SkzBxpyaIs0nqHTiKjQtEBe1jy0UkYUCLu12ybBVCfG5quLelpdBTT9X/gClkO6JCyBQCYB+EG+EmuA0eg0wctsGJCJThESvC4wt1/Dio42dBIrYhsZQhVs5EeuFL/fjBkPhPoJvIsVD8vOYgLESxZKzH61grI8Onf6hdjWEb+jUIdgVZJGsWI7O4B7gMFwaoyCaWIUdzUWLucJYd3NaWbiFDj+ybJixakMaksN1TbtBEumBNWcKt2zzqvqvXv9tx3ac3TbtnuPHMshtefHbpku25eezP77j44g0DDz+dO3XnRaP6T9GbD+z/zfu/efv3SM4/htBgHEkZkaKIjKERZH/VtlQ/t8ZuR8YtY9tB8vgahKDiR8YRhkM2cdxE6vrsKYJCthRNJ3jBy/MCxdO0IDIUJfICQyOuOJXnBLqAQ2jn/M4MneA4Fntm8Ogj4mvLM8O68ZCg43+aYTwgbDYhw4Q8SZ4pL5K7ZFYWRGe4RclR6AlkPmJnC2ryv4e3mH+Jt6Qz2gsmcpa4QBDa6iTj3UrGF81rBLWIz6OlZR0zPL1u5f7tHMYLL6MXPLxbMRqEBNogfNWeTo+oxU5HhKh6BHNsC+rCfbvGtghmnUXWtfAIW1G9A5/sCiGyziLx2VJCmnJpC+/yoo8HHx/f5UFkkUUWIdKHyW+25+EYHIR26XaAVZpCC0g4IlTGECTc1kYAmQXH6iESLaXQeOxNmtrz5ukcu+fUambVybFM16kuJGPOReZyOZIxKgjBAcwvu3xB3EsexwWg4Tk5G1Mh8oWbl0LKedz5QoZrF+Zy8wShQR/lHuVvDI7Rx7nH+ccEp7PTxUv0rDvrvyS4kF0oXqUvdC/0XxW8HvpEjlUvpy9lL5UuVxbQs9nZ0gJFCkQZ3ojKsneIoPEWCBpvXtDoGW9ZhIiVCBExPJLYpkH8HES42PAMWSxEshCCWD2YIA4OTNg+DmSRlyUbankIeJ1PIKs379vDAOTTCIzga2RsSyPa5cgilwNuXDa4GZ1xlQHFhfnQTZiQIEUQxU0BBOwA4pwDCpY6wE/40USPjmMrEDjgBzj3BQq5764MGBHG9jRh1UFcT7BQZxpZB9kCsG8b1W19SAN1ZgHG96Y4mZ0sXsleKTIw2w4sd4xsENQjy0yAoB6GzzvEPXozkkUAgXcMejwFgujczbf/6g/Qf9Nf7/w01/fyjnVrd3Tftm4H5YHldy/L/an/wF9vgTGovvObd377q9+8jV5p1sBf2I/Z94ALROClRHONC2vQq3u9kUAkwjA60rcBOcI8H9jlesNFBwLBCJUoMo2JnokBMzyVnSpepk8xZnimBWYEM+HLIncGHqH0UIym3TFZ9A2x8XwFPONzbLxdGV8qwUP+VTSgzpc8YmjbM/aV4wc75vjBvnTY5bjDLidNF2GTcFcRLNIcA1BzBJNmG4BSRktheSTY59Eg2h4V2+AjDjUQis6anrfxssQDMsG27/InnNHLdoJsNtuJhspNPGeySIeIsUXTBUMFiusYHLlgSkvKqGbLldFAocECs+B62PQbOPbFntyu1w7m9jz3a1j0+z/AyPIv7v0/ud9Tb8OF8Cev5376x09zm3b+Gk57NffP3EHYACPdUL4/9xl6l+eQgXEb1iDgEBm7Eo6NCcI9qD95QDPE2hb4xxJUQqaosMyITucUSm3bOhb/XetYsaV1zpHWxwal9fQfso4n6Cey449g+EUM4iyS263IANvOCr10/e4FLIvGBDKFMR9soloWqq+YfJ6jPz79GbWtfxK7Z0tu1Jb+OailryGMvhpjdDjJQujOy9EOQfEOZkfEaNXGvd8WIPRv80icVWzQjIj8pacsHiWXnnL4FfcpxWIX3sgzG8i+vsHaD6u19hWV1r40ae2LYtY+GCZ7s0rVGxLsRnYrizQ2wpf3IJNxG2BqiA35KbIdWXcCndwIaHI50cQgaA/M35yB+coZmBMmAU4gQQbmKeaDAp2JPQo7upDBmG3HIDgvhTAaRgxcAHe70SAQjWTpIuO119k9J8eifp6DJMQy9hAogjW4n3fOojqKKOhEvwBWOjMwlQB16ixkAC8t6gJrijaCR9kX6Z+qL9M96pvqu+BI0T+KDJe7yCgqoqu4CqMqmoifp2a8l/kyoavZ+UU3ue90P0o/4no0+hzcTD1nvO/yAC8I6149zGDVu6OihXhmExUtugYgE/HEFDoSY0Q9pV0IUglkEofjAWfkAw5/B/KTP5BKCFCw57yaEQgbC6FYfrY7cx0xa9/xPjLFDRxEQZ2UxRMdqfPFlk3KaLquMBEy5RlR8ZApr9COB7PQJiVzvrHBXVZfx9hGKeXzurG8ZnpePzP3y8/6cr//8VZ4zut/hNVnvFb/+v3P/3n6wqNrn/4vihrx91O/gNf87jM4Zfvh3wzbdN9Tub/fuzf3xR2vAApZe4BtR8zPAxd1Bwl7FCF+/aYgjHE6T4sF59kCmnHonozguFw4xrE/BQeLsk5YEV2GBOWr9t8ez08dxTkJB08OGsf+vLi1CZmzHyE5iJHNQ0eX0wznDG+d2Z2BLg3xP4VDJDbxDZH/GHuZ7SQcrgzGV2v0Wn2ucLU4U19Pb9TfYt/g9unHdFlg22GGmqRfLW/T/6H8Q/2HS2QURmVctCyJLLIyVZfA8byCaIFTENogWFSzZhevIGitIJCNz/nwOTrBKF70V2KMZYUYshx6qUWmCATlCxNJXmoPlNHEk023kgCzefqSScxB5lOG3sggYQehKU9S9vGfKvRGBSr4WNf4gzy1iu/iKf5+7YPfW77mEPqg32Cf3hcO6X19iMlaw31tR1r1PvS7jh2eTq/U968bHiR7y7hFOFjfv9+1f/861tojJh63TZ48blvs4mnbqHO2mZOmTe1hNFrg9wwcwyHbkeinHS7uzKb/f34i2wWulx5hKgsEBGIZBGIVIjHqbaci4vhSWA9L6WLaU0ynyjmepup/S039+MX+Hz/5IfzvR8aWROuxUIGv5M6lpsEHX77+rjuRgHkQzagqxMss2EyUGLorQ8dYICRwT1HP7uSpvEinXXk3jKO46H87zeHE9+wL7ofSHI5mrewGrKMA7SQlENmYtoVjse/B16nfoXf5xxb06KfQC3yOXkAGfeQFfEQL51WwJMZkpIax9PLq7gb+UvrChJRQKSms/j9qZOfFTvaIYv7MUJ2snHH5v9TJx48M5nGgARyil3cSvSw6bz9EPWO/21D9XOx7iik7/TidPv0+vQbr6LaXcuoWKymG6Uddo4IgHE46JzbbmO+lxunjvJfrl3sZWYlpLhcIBC2w4h6CGN0FiNE9GGpzp4S9CD9adoYrI0i4PwSdCHQsDoinUggnwhD9hoOq08eq08dqvo/V/1vU8/0eDhXykMNEE/ROCzPaeNHpYtzDOGoW2e5SCPpxuTD6Cf4w+qkLxJC2oIqLiVPeyXehKu8bv+C+9q9yb+XWw5teeTx70Yg1udvZPS737F0L9+b6+1+i4YZV02/1qejNatEA7MGKAgYISuKczuAdgnNQEv+/oiTOQUn8/4KSUM+yVIyhMfzkWEbspZZ0Jyy5t5tLQKqGhjSid0LS+xhCyGQEBLv7v3Y4+7+ccTjt9Lvl7QP4jsKuRwpnLxKXiIWPZI/i6IvV5UMhTg8QOJoiXU1TlncH9TPi3kbMw5QnV8TckYuw6pYtJ/+BmjVl4C9MMfsMiFE86TqPY/W5HcKj5H1dNuFxTEQ3IgpiF8T9jaxh7OaKuqSYzxd191J7TVljmFhURUzAB7Ftg9+fEPjKYE06faDmQI3jKu/fr+9P49BFg5uk8WhkOy68vOiOogc9z3p+qXyg/CEiiJ6gqypMeySf2+N526V5XR6vS1N7qc2mBz/adG1yUS6XZvqg3YzdGgMPmXgkYNA0cIOMGfq1+ir9Hp3Ru3g0J48XJE58XWCoOda+keGXBM1iZH8HIYKqQSqIs2tw84IbE+5XYCPQ4APoypE7XDvhHjgSsQoCtuj6BAK9FNgY74X3bb8Tj2Y2jdDX8T40rNlOYiqjUSUhaDsAjWRPVu/Tj6wTrEAaMLA3z9JqU3vEWrZW3jNwGLt+oKXVsFJrd0IKCgBR1eNCRj7jk5BVvXOBz6dFGWJoR1XNTZhDYwbFHAkx4AyYGmzLNfsHLW2+3IPYhrbscB67BKf83PfIglt6tmy4bEPF83dTH/bvnrjm3n1QWHrX8V/3wy79jjv3P/Xojoltfuq/X8otm5478ds3792Bmko04BdokhqgCFTBTzC3vYwhlllJfN3M2NJM6ZzSJeIakZsXvo5dJC6Rb2Vvlblyv0gHy6ti/iIRjdHnBYjv8/wYYdoao2BGFD3uWFVVZSWwkhLjsZgBhOAQmRssGN9gPilRygRTnILnKIedxEkSjyUuFI4jgViBZDYR8IUTotD20uSQ+yYL7pvM31fPJFNKFN9XIVJcIdmN+F5KuBq10Z5oMUdyx/KSO/Z/oR2/K7LTP6D2J5BjIq6PD3HUDFWQJN3KwAEESFKsSApEZIforiJK0+2GIPbDeYzG9+OuaOuiSmFxnZXNiIQ7+q75LMqiH6RSz/1myZy5t91zWdcvNuTuh2euHnnhuLG3PJ77A1z4o9Q500Zd+sCG3BZ2T/vLs3/0TH35K11zt88cQV9i+OeMv+DaylObeGXk/LGXLB+BuunWgc/pw0wKaeHdFneFcUKKL9BAJTx+HP8/Zobc3oa0B5YJHr8CPX6ZA5IRpWVQ70fj+E0+KOQvGEe/IxfMaMafDAbM+qaGsIlHJFBBtm7s3Q/kE/0CJI6DE+9MmeQEkJzEAAZkMh6ZgIIdfwFs0qp4zAYCcF8ABiaEMXbyNzQ1bAsfC1OLwpvC28IDYQaHaS1pqzj8oViiuTujJEkKl45adExEQCYhviseFpEmsoNLmDAN3DyRNEqUcINE/GgSZ8DADG9xs8QJoSEBJVswkRS9bGEEiXDSESyu21pJEl4LSY8NM7pL1VSKs5JkaU5nlAhQBSMCQBqmq6pWgyy0FJQEaaOXrt21gJb9HMm4anPUVCPJtipPNSJx5A0QQdSEabptxfs/enqiLvfIxjUXX3z3GT2P9Zy/cGLjEuq+/u67Rpx38eR71lMtpz5CXLAeAPobDFRptxVwQN022mOLicFhFQpoxqHzIV8EAxyCtUM80QxHVBHPZbhpIq2p/2BPcLToyIvjThDJIkSHwKEMkyS5TKGvlyg3l/AUNwg4h8VdjjPwjvWgvZslJ4rJCXMNOsMxDMtwzeJ5DJvkhklTpevp66SP6D9z/DMcLOVSfFJo4UaKbepEtZ1p56by7eJKZjn7iPgG9zvmA+4I9wX/T+5bweeWJJamGYrjeFEU0IEoCEmeQ1YeRzNMkpW8LCtJIjrA6J9h0fAhKQckhGI0E5mIxNwsEfCRL0HC5brlh9yoQlV2OFJ2eFRWbFNWTgLK+ZZyvqXyadtUEsKNALaBiUgxIrxjjsBcCkiIDFieHhIIBW4CSQnYBSR7AIQU9U/F581BtuCEPODvbB2vE261vBudJ7Cj43i6L5+l0taK01KQIclgQ5JFlqQLEbwutAqtNNla4RRTHSfCuLiGpsSgiuMp2c52JP9IyopYXdQiCkVFrRx21RS1oN17OxJkt73Yioa0Z0FnFnaCdJrks3AD+3YUk6jLDj/efbJDb+GsHTlSyG67bIdSSFIAfpT7YwYKXj96mtfbSjY4LWhHEP/x37ZHrMuxDz1rU535GEzE1CRa5BjACBIaRY5EdkkAJmAHYAxkvsJSyBvre+ALX+Q64Guf5J5cxe45/QrcllvWfxUVvzF3OZpHbUiabmfOArVMjMyjvLspn3UUwjOrmcygigLwVF5ApwroZAFdVkCXFtAlBXRxAZ3IC+EVGabEWzJKvFA8tyxTMrtkhXi3uKbsGc+L1a/TqhgIBwO146o/CLARagpF6XVQCk4XpovTpenydGW62iF0iB1Sh9yhdKg9qZ5yrTxVVl5W2VQ2TWqXr0pdVbG0dGlZV9n90mPKfRUPVT9Qu1l6Xnm6fHNFd+pXKX+F45AvcYhShyhziApr4tvXYKLUIcocogiH2dyxlmlCeVKRmHAi5WPk4UVhnGVTEqrGjB8PtYUmhmaEtoYOhjgtFA9dG/o0xMRD94So0M/RvPABYOVzml58uQ5NSOnwXTSHoQ6x53Jft9ffQLyJustogHD49KIFRVRR1MczVuo5yT046uQXHDU9WCMw0eFyHNmTZSHTE2yow39ehzFHKGht8fwM+fH8DCXwX4YS+K9CRCaESNIl/na0aAXkqcsHkXR3hi+rQvfbGW15twpW4Ufj21Q5iW+EwLepsiwDROx1Br07UxUmbSkur2qYWbevjmqr66qj6nDyahkIWkKDCIeENQzUFELgFmJiN25kwg6P+TOJMo3E5TTyIloCX69hK9iLG6KRQItldmiWGw8hf63kU0dchUbYWaXZzvGFKCqto/3iCU5SezrdiZHW8YKYGM4HQvu2vk6SM5ftXJw+oveTnZXTbqe0I3Vqlg+LlbLe6pShu3WPTnMlaiICxAo+AtlhaBPzosNiV2kElJSqilApRWBFuShxaSYC4npRBCJZgEWftSEGYlV69erVoCCJAKeGZAdPQCsfCUBYJKdSRcMZki4wXA6Fw74iEpzzDabNGzhl3vIA5w2G8lT5cATr8LIVkizv5CfhVS3EyCfJ9W07tNtvWnFDY/L+Nx6ZOHpk1b2TV/58mrFNWTJvRYffXxNZ89pDmXlvrDz4ITwzOn/x7HPPLA0m6y5YPeG85RXx9Pk3zQ1eMv2S5tJokUcqqx+9Yvq0Jy57CUmrMNL6nyPsJ1GzrDQ8YVCnY0U02jHev8yDPMGh0RWIdfNXHC/Ipc+n8lH60DS9ACsASeAgJwGkUllIsWUkq6Am/fEB/eMDRn09Ms7bMDaK7G5kISgxWiQ861WjRfS7ow0C3lCI1bvRHtp7dMV/mmKsuAFUoA1JPxFLkg3Ajzbo6CPz5orhDSCBNppSCSrElNQCGqXzwXlSBmaodmGqOAfOoeYJ88QbwPXwemq5cIN4vbQOrqPW0rfz64U7xJ+Ah8V7pZfAU9LPwW5+u/QW+JX0EXhf+hv4s3QKHJeq0etIQeCXKkBKapYmAqT2WNPtb2AReG2wdaSIg1no1QFGO6aGJ4oEyHzBfUGcUyTBF/UKOUuxrCJj6/LjNOob9DmQPpAGNcSjii39ZgmBjqQoeUVRAjSFsAHwQogagjQYgisUBTleEmkA2RoFKiWCaZpil0iJvTCy02S7WIpFlCkmKBOWyF/+DoPYvnCoP9ufDQf7jmTtDOY8FjAIEFi3kjiU0Q4peGAvICnIVM22570qkV2sNdZElWKWL4b1Hn+gqdmDVOnPcgtePZKMB9N/ezl3DZPqXzP32kuXUesJFl2HuPIo0qF+eJT4BT0szXmo5/Re/c/0XzzH6BMejsGIrwR17nIdPqy/GzwcHAgyCcHr8iIOYXHakyqpLsU1xD5xFYBXV4F94ioLEsskSLIRZGKfyF4MrWRsnxhY0snEFJBLyBV5K0UmVgo6/tayUmQJy0wZmwoEfMnY7BmQIfqVJwSxLA5jUyV4LEgtCm4KbgvuCzJBmqr3+R2w53dggt9B0v4kJLarYdgmq23W2glwgCnAfU66zEmcToEoYqkAxnKLoae7sc2DehgkwLvgMGDAhIA+xE6xDN7jrd83YCxpTdxnrSRTCtomjJ8zREmQeAkZLymDc0WgJrmxJMUr+FbjQDgSmojRVMkvQY5m3ciI2bGAdXKo7KCir8leKWSUGg2WBDTWPXXdxzOfnKRLPVXzz1/yLJN6aOuYRePrVvYvodZes3D0fe/0v4LepRUAhmf3gRhVjrnFmW2GrgY9Hs7KjTcMQnxlini81JiXjWExEcAXxGL421jUhb6JkZkXw+43hZICgURcNygqEcfT8L0DeHsA1BCtRVTSfpwtbIs2/EDF7baS8U1RQ6NlP+ewKbs91JSYF5/D996Bbm0FSW0L2EUs4B94WjptPQ8/bb+VmnwGewa3l32N28u/KbwV5S9Q2pVLXfOVq1w3um/03O5+xf1Z+LPIsbDymrzbQ8UkXeC4t6NhbzQaFqJhGlJCOEqrMb2X2tw90YBGLwzuxO0EuGHdSPRIQ1x6UsGUkfIuPTUjLQkcAgBitx7cS61G/KTDkaZi7GyjZlDXUqsohtpDlYE4vMd23RG3Xat+fNBxgv12Bkl9d1u57y47SpV32ZliRI/qRXpM515FOoUfOEx0i4g+2H9nOfFwst7i9vYIHlo1wvMqZTlZKMWrEvWL3s12shj1lq8u6StONTfZ60SJu46oXqxpefTL8KebqUDy6Uf//twjN93yGHzZ881vD504/9nXn5oe27JldOusfTfv/2zO/Psfu8Nz8MMvt0x94ZXN66/AnpTpA39h/soeArX0aBJ3NRCoH5Q+qQI66dDILtDteR5yiDAiRsfJdWqBt04poOUCOlpARxy6J0MHHTvSIaBFmBWZWfQsZgm9FFmy5Y10S/Qc+gL+oqIx8XPLxpZPptv56UWXVdzucZViZ7u9HNMikg6Rcohyhygl7jXrYotIOkTKIcqxXByLqQo1VUaV0eXJJq2h9NzkmJppiUzplOQCuUOd75rjnR1cLt+o3qit1K8rW5JcS98h367eod2l31Z2a/I+9UHtQV/MnubDilPuSCospiphCoDKsJupG5ECsxHeVIctj9weoSJJvzosVp6ESdbP5tdHs7FhYizmp4n7PI14LmshSbzLEoas6bP+RcxhyTKXKrPF0aJYROA5hqY4mCwrQec4NhYZFjax/L0Hof8+PxhGTAeSGanDBJwEZ8JFcCPkYC/cZirDYgmP5+wp+MEsFgsqPsJNQW9woThk3hX6XESHWXZlxBSohJUY6mPRX0n0EH5YZbiu2NEXxY4GKbZ0yq4M6iOYcuP8EPxXbscR6s5HsN2XYn9paMQsKyCYHX8Ei3vbLXDCyX8gmQ9YFCHwTRB4+jjuKSNgrStFZDtJ1B/UGHCIBgEkdRpG4LCIfxhLJukw2R8jnlA/7UxSNEUtf3qMqq+zV3KXlafI6tLv4GMmQJylCB6XpabvVmf8euW1L0yeNP2M3IKL5829+ev/ePrbtewebcvz255sGQk/nNp149pTP3kz949H4O/1a+667Owl546ZWxq4It389Oxrf3HVvHdWu+68e/XlE+vr51ecsXPZdQeXLP0C8dHZuYvpLxEYiYEqqpLAkZmyjEwMOem9SB7j5cSiUFG1nPJWl7bITd4L5bHeDD9Vvlo+Kf2PzzW8tLr8rNKzyi8q31i9qZpvKm6qbKseK48tHlN5afGllfP4WcWzKmdWd1V/VP558Velfy83An7O10tt76mIeniyfkRPgFqyeqSLrJnjQS+10tTZaFSTxpREFcnvq0/WS0OyLrHQHhTgjtAuy0jJYPDdANQDZmBmoCvAVCPmoaZUk0zMgJt4ZckybgzJAxzxz/rJdzg/0/LKum2v7FfE6Azg4Bvxzo6WBk4WLIM8aT9TyQSWajAJSuIOU8YdoBO3vVqBTLzsNe2g9qk2oDFxrU2bqNGaw8uabq1cHJ7RyMpFLUxszxJie0Zxi2yLM0ysz1C6emlxw6RCJxfCHjbzDqZ8284vcuLICRxCOmJHkY60tdq5e53YpgMQ8SXwRFkSDkI9rpQQ6w71OufzVBD14ilIBscZPjN+lEXsG8DWG1nmXI7YE6f5IOYNNNYbljVXmJY5Z6tcd87SleuDLrhs2x+OXfPbu1658ZnZf9j06pePPLNyxXNbbrzhuanhi5N1V01r3nYnbP34YQg3PNx1uuObgze8SFf9dt9r7/zyjV+i6XsbANQbiFENSGKS5hk1HqgzsJRpYM5hJjNzmKUMJxqCKIiqxxBVQAtQJisEkLlQsVGAQknCAz1UieEMleEMleEMh5G08rf178JIx3UO8q5zG5ZyBJZiNiFZs5i9iA/dzqi0fJMT3OftH7oow3aX69nji3F2IIabOHeF5LAA/a11rpX7sahZDLOR3QChSpHm5F66KZ+aXzcIK3G/80TLI0R521NnzWu7/EdnnX32GT/yxpjUk53nj3q2/Ly2mYv730NzfTxS4D4EJXGo7QsCJi1sF9dgHM6ANIxUxEwVqirCdRG2JOZVpRgESR2/VgjzpB4L6GT2EGdsgCw5C+Cw0IGa9IH3Dui/cuK1WbzeDOO5YfND8Fze9J0bOjcxDcnh+fRV/FVCh/uqxFLhuuhtwtroB8J7foNPkEXNSGs4DrTDZgRTxeQL3KxJKoUaFoGHZuBoLXU1MjjtRiLtM3IH2JkcomGGBt0Gg7XJJToJ1uoQ6GhI0bsd243HSt9YLaH7dMeU7wXe0CjutZZnwhZTbQvMCFwbWBVgArqTaac7kbkASZsOEJdXoJcq606/eacz8qR4SGFw10q0IygRd1geFr6MkWBPeaI0UdzrhHItbYPMz8hOCFlJrSAzVlUj3hISwPWqEZZM1wg7GHKrs+Ag5MmaYQz9MLe47dRpgyRS+6G3ILBLn+oOVl8wPzN6ypXU6Ffm9vRf/+6aP+WO/OT2z7d83N888e4Jizc/ddONLzCTXR2142vP+uqPs2bm/vm7O/puhuPgCvj8L557/fTH2Rfaex9/eOtWxG84jSCETRekW6YNGi+75XgQsZURtGKXHA77W27SIDZ7K3AfBg0i+AziQzSCRnVarohprrhroot2ubxgEoQEi6g6Mm4gjtuXYJSPe3R/OltHerSOzCfEnphDdcyfH/8qb9AUNGIw98CsIskHBsmN/xdPHfqs7zyqpvBB5nmjwhf5zdLL/ZeVzqEX+BeG55beGF4Z2xC+M/ao//nwK+Ev/UcTJxKeM/2P+7f46VGVV3FURWyiawZOUojih8BDkyxu78GPjY8u9KLHCzg8XgC+47AFAejjBXUgThQA68HrZGTRGEMzFzZW47m0E80lZxYknVmQtKRlN5pABlmVgDMYDNOgjI02k2dttiYWd99gtn8+f2GQxfciy+EwKB043F2c4BKOodMJs+2EwRnZZTE46vN8hgLh9EJzJ8/glqsRx47LOUsbAcTYbkMnq5Vgw+B6yEVb/CuumLxyUhNs2rtw12nIv3FP3003/vdTL31E/eanS2/Y8fyKlU/CyfqN11y06j8XKcHMfCj856dQfzT359zXub/kun/2Gt3w4137H9uA2BuCT5FGOoXYW4IuEguRBtdGOHmeTu8Bh5AcpQPsqgbFGdpUjYb5zCrqHuoRgXmJgSLgWIoWWahQ8G2JaCQJjxKwU4YOO7rIXlUCokQXuezo/zEzRFQQmTq2BzyssKaqWTnYeORqWZhgTZZiQ/Ie2ApvAxgYH8FwtjDU2zqerB3ENqwT78+vUEVtEzmTZUWoiHhIcO5W+IBVL6W41EDCphGZoPXUqZ7Rhy596L9qljI3nbUi/rPz3p4BaDDZFgwBUApqqTcGVVGPAiKx4biVAY+HmjJ8uLs4xrEVMbcaExUngrqLFINKa9ZyGeKlt5wNmCBfakEaf4m7iXauovNajC7zkZo0PnJHH9FiPluLFWwOOMos3UcqHdjCK2Zl29oN4ayGHCFyDBPknP18fI7G6/dK8En8WPyXPiLZfORNB9/PeRh6FqyxG+B8sCwZ3+iHlf4L/Bekjipf1LJiLVwJVsIVzFKhU16sXKfeGLgT3AE3MGuF1fIaZa16V+Ad4w2PWwGxIFDQkzYNhwWdOURVDq1AkDfGYkteE6E42k3NBemCq9MFV6cLFGt6iWYmEGdpEGi6Rmm98N6euqDyvaIEjtUWXLINp8JRc7vLnIvKnIvKHGFTtsSXFzY+00f5No4YImyIUsUxl4JDuyezpCut5a55zVoycHhHNBFGc2hHIlGDd8MSyH4/vL3SkkJW3lR2cSfoRKKoG/XccCKIIhHOXUEEkVvliokg4goEEVnGBokRZzlaSIILQFoWnSkEw3ShtoUdixYcfW3fl/MXrrsrd+LDD3Mn7r1y7fyrb7t9ztz1oy7YOHn1c1tuWfUsHal8uGPTR59umvNQZfX+9a8MAAj33fMLeOnVa26dMWvdmtMD4zdOfKbrlheeszWugSaWDopgrgDhSeEYw3pjqhoQndCaSIp3kalkAFI0C/itfE8iR4bOgjz7D72TtSJWxGE7MhWwC5LUA0O3tASPLYSI33Zwdjn3NCcw3Dpqvbxee8vFirwcpMZ4LvJdGDoncqlnum966JLIfH6+PMuzwDc/NDOynLqeWybfqK3jHuYf1N8KfkR9wH0g/0EL55s0hK1/sFoNYtTAEpEoPZwbo4uUSGoOfC9nbHdG3BgftAy+YzR0Z4wlRDAr+US+vPDPr7JyOB1sjOVhoMW3xOnQmf7ugionlY9LhPQoEiA7qIT8KlKUfvRxo4+GPiMd12A7YtDtqpcwpaoyYWuhHFuw+orUA/C7fUQPlqc8OmY9QydYcMr8Q5uW7Vh6dsehJ99bfu/Lz69Y8fzzN6+4MEsdggw886UZ3bmBj3K53C+3PLwb/iT30N+Pwathx1fzcG2LzMBRxo94LA1PFHCYHAoSQzsYBQSYpRWc8FlZKqmaosUkqdIXizKxyihbqZaqSjAEgTtBrIgEnyJBXnR5qoYYEjUk89Pd0tam9+lEJr6hv+Fu0fen6/AH800tq/rVMepalRljXGYsi9CX+BfoHd6r/Nepy71r1Tu8t0d+qkqyoroYHqLnQewPxmmee2EQVKLxbUQGvo8J7qE2gxC2JVDrWNQ81T2EhX4wCxuxkHvJjMS1CSpBFpsm/u000RThuxTExduolJMmmto4LIgtmNChH0oPrR6aHlpgP6QHpV0/sSH6dMuYsOPFNjftYBO0ZUe0Yw0OO7EvGckQplRRNSsRVNOilVZct1INBYNRn1UOjS2I69ak6+tavhvaxZzUXJgW6iwTz8u/VKYn/sD8VVufWll/kdctL+ld2zFvg7en+Muf3fD2/DlX3bIx9/kHvxiAtwYfWbftlhVPeh+nblg565Y1axI735y746oZjw2P/fzufbn/OYpLg6Ax7KAWIvRwJrH/Q4uoRTQ1Ho6nKFgKqDC7CPv4mEV3WVBGPwpqxqOJBRCqjOxwKhSRSgbFvtFUJezduRP9wRUAIGZ+Fg3SneSurv0qZNAvJTAirQIcKamlICMq6hKapvD4TSQRAJoKa8IS8a9gIjKcZ1B0G9pdC1ehyRNy2SNGcgFaxx/vm6CfwFhK77Mys1E3WmEA2JmN9IgKjWuO4WxJkntb32a3kQM0x5c2ud3NV9A7N+T6xjVpL9O3/ON25uSWDQ/k3LlTvX/YAr+Ebz6GuGTswOf0p1YWLeUh77FCohg1qTao56pso7cxehl1qXSJd3J0LnUVO1uc5Z0Z3Rd/j33f83HoM89n3r8H/hr6rOhwfCDuj8fT4VZ/a3hceFF8Y5wfTpWpw/2jqEZ1HDVGHeu9IHqZlFHnqp9xf/GfhMddOvTRLlnXQCQq8waQfFFaDo6WCsyM4OBaq2A9moCDEXhkfWlDApjaD9aIKctoSV1/14A6MjdmGl0GEyeBTKtMqEEce0besWcQx55B0j8Mspof6x6DlDUzHMee4ayhMvY6rduVMZYOVnLI57u77FXO7jLeiV/wttPujMxr/EH+U36AZ5yKZLGC8mMxqx4PWbJrpQgSJx4uPzapYF0KxtzEg9f/He8d0RP96dYj1hxvxR+SfUsKOODV05HtNJ6ppoTr1rlcQJIj1rJpXiP5Xem2eiRE04MZlI12iRic7lUISkbO3r/q/es63rt15oM13f2Jl65b9tPnbrrhybWPbzj19BOQvuPi0ZTr5FjK/c7bv3jjo3f2WyFsLsWcBUrpa0ko6D7gKZB6+hCxOUgbBXRRQbWVaAEdKaDDBXRRwbK+aAEdKaDDBXRhJUS1gHYV0FoB7SlwKusFtLuANgpoTwHfFvKwu4A2CmjVdnEIjq9DxGkd42W1IckcYY6Ifwp8lmDfZ08kqICQKBWDkYRI06WxKOfDfmAecqXhkC69m4Qbk5uSVDIQCLuSGw1oMIT9SSKWQbKNCft7iQODxIAxSxoUmQRkab9BCooaTnL44FTohdnuoPA9vG5V0DHVTDC5MQIj5EmR/JMi5EkRDPwM/KQICdFHSN2kCE7hJHkDEZLdHHHWskTQo3YBqr7UeUipM/FKba+5N1OahO8CiEtKUbgCwUQk9/Htir6XEUpMOeC3MwMKHLFeYgWTujh2aYNQWbIX3tBdfN5QF7pVOcXyyBacLMyHx8f9E8bMPvdo52LQ1traiiT5eIxODBLgbbFzBVyK15PyKkYEulWfnSOw2ikV+C8XF5qSLoUl7OeVfSQDWuZFmouRPIK8wzfd1jbE6esPEFOjIJ0AU4jAiQVP1j3Tseyh+M1vP/5Cd+n0sxb9R8/Uqy5aPYpJPTBhxpVT92zd1V9O/WTBjFEPbO5/iNpxww2THr23/0M0rZsH/kJfgfUIDBEtos+m5nJLqeu49ep6gxNJBmGPjKvQ9MJwDxPTRHHISoehYb18LTsxJUnCkAuFITnX9oXdGSElO4V7ZWcpkGyttyeEtfAanzGJp1XOJjww4TE9kzwzPYwHpoCVL2h5R5zFD3+0Fz+Mc+9y1of36dnOEwVZHzaS6ku3YekaQcgAihpDYnjoHa0FkEPRD0lAt6IdZ2zlF826oKPi9fZf3PKLA3BT8LkV5yy5mf76dKj37Y5PkHo+PzePPoykpQ6i8FXSsQtkKk1VBc+gxlHLFa7N1xYaF9oY2xRjGzwNkbbYuZ5zI5M9kyOzPLMiM2Ndsfe4991HuS+UL4N6JVWipH0tVKNyATVWmUbNoz5U/hD8s/+L0NHIaUpD4MUbRqrYxXmjjAxcAVc9GBI8A0MKrA0GzwDWsRrUNVObqXVpTIwEz2JEx2pEx2p5HasRHav57RTJnBWk1fx46mlOxia5nHS8tvQHQi123mUgY5R9T41+p9KaWZHhy4hmJeExnoTHeL+VcW6V9CyKfTcwZsfF+r8fEsOlYL9bDckqhgQZL0HBjOziVDlMiiHJQ4shQcMuttZkB7yGKNLqqoem/Dz392sP3fyrzqf6i1+6YckzW5dd93RuHiWcMQEOh/ym3K3P3H3yHHrLgQO/fPO9D97E61MAgM2kmMPq75dby680/IHiat8popa/9AdKpn2nNFrBXb9XCG13hiX1zkjZhuaRVvmGhkZrXzvC2pdY5R3MpC/QoLFx9gn2U5aZiDbHWDrOLmK72AGWgQBIFG2F1PCdiL3sq29seALAfeAYmhc/FF87aYv4wrQvUvcMCLZkd5ZBDgw4E9yufgYmMEOrn5Fc2rRVAI2Y2It/QPp2A8lKh7cT4W/tsas/4DQ9vLbZC9+yFg750XugF8bWlEkUSpJppMfQe1SGnPIFQg0BwVAML81CoEVZ3itLyhCAqxRMRCWfoVeOl+yQTDoR7hOhn6BbP0nZE0mynkiS9cR8sp69bieMryPrdgjGFUmynphfUiRKtnPmxC7isJzgJ35VnKDnP+anFvk3+bf5B/yMn/I609PrTE+vo5m9/zok+i8y9YTvZOr5CzL1KCse6vtukTo7Lw9n5R0fGsV2VqKhCWu0DCbluTgXn3RxSgSqguYoWpDG/unILhnpUprVkP7sWcDy1uCi2esMsGWjFqrLnpv3LfvZuJ7r5k+6q5Xd0//1fdnNj/XPoJ5cd9Pku1f270Wv/ULuE3grOAAkcBWpBCLRgH+R64WTzBSkW5EFKsFWzO3oAHAj+VETwQxwLViF0AsLNsl29VxSjxonGOItAg/9fZYdGNnJc4glBFJtrwbbqPWN9diIRvZ0864Dky6ra2miDxzovDM1PnQFXoThAYDqYg+BAPyRtbDcK0ItVBOqDSGrOPRj5TH1eVUIqxXqttC+EBPC4xcPxxuKBJVWtKgEfVTa62FoDkhPeKF3wGMN9u6Mx2QGy4c4PBGwhbCcCSQZQFP3QWtGj7BndDoab9gIYMgkawFMFXOCl3BGBXEqlhDeqLaDE1/bi8q9Nn986eC1o8SViDmGhGPB08HQK3APKAYnoASQYD9RyBaYV46jTrRX9/RlsWXdSrLuWgyLQ7w6Aiw8J3AUp4vuCECwNwLxkrPVq2EaWU+LkZKX/B68KHpYzwKakzRSywTJAuJAq6+z2KW0EQms5sEou8+Hi33veOIJT/jWZRdNj4ysu+TcgwfpRzd0zm8Ye5n7J9LYmVduOD0HCbcwrv6MxIcEVCpqZZ8rThJJT0blhi4kK1haJuajR/nFZs6gcPlSCfl4kkPwDnLPFzThHUekIOSvscdUcAhWyFfwtwnRIexIldmccU9VrlYeVZ5X3lLYi+iL1P9gaDekBKBwNM9KMs3jelLq2zTjpWmGVtFcVxme3kvtRSxNwU2mBBgGXQLelpheas5ulpXMojhOXbcCWZLlPrZrLZK88V7YbKq8WVLawHcVN/IbNcqqBuRtAJROJSg0aiRTgFRDsUIu1E5XL9xAPGV/wxyCxYtdK++oTjQA4pgTrU6WxTpr0ZemadZCrpeRgfbJDneL2jvwninXt9Alw1popqio1V7AReoTexVTblG6JrUoZqpFKYmi/bCWwUVa3/0BSBYpjMjRKmKyut3YSwsUxgmWpevr66xomVHcCOtJEXnagNSD/Wuon9z/xhs9uUY446f0rtMX/jT3JMVQD/TPRzbQBQPDGA83GlSBEWAkVUemf3JFDDK11U1NNWOLpxRPqsk2ddCzam6kry9eUnNT07rirpq7m/QRvQOf7JZbYolEWUM1VlfVidKGDmFklV9pTviraotl4FOaR9QWA19zcW3t20ozUgbNtUpxMxOo43qpzbsmsZDtg1HsMo1QW7oD8UPpXthoSl6fvysQ8LKgCg3bDijVobM9lYegGsXuzAj18I7GJSkSxESvmzJTXSk61UtdYmpV/kAgHk8kRo6sq6usRH99v+kHPq83nR4xQpYlCVcW7kLqBikbSjFFdvgSvDCf0vfAuwEHR5paGzuRXcXewzJsqOVN2+M2vu94Zx+phzD4r7/wABdLSJMyR8f7sRRpI6Kk/wj5tVJ2cbYuzsHRCHsEkTS5sLhZ8ZQlS5MlSZpzp1yaqlFcc3HjRFhfgTbVnuETQa2CNk3JkRNhcQLBnfK6iaC+bpiRRl+nPd4abQS6ZIQig8EFON9ZiENEE+IaBEgjppIYOQLpdZgGoLLO9s2yHAexxxb//wTIvoxGA3Hivw0EfN50QXS8vr4G+21rbO9tfY1BgrP1dYjb2MbhVHkzXntjpEjaYXNTM9I2+ASfSpUb9poc3kdzOGge8Fg5ijC37vmbpJ2+xos6rl2aya6/vLvjJ9OXBffos6eur760o+Wrn3fMWz73po55t19x76Ee47LXN5Tce+5MmTrTN7r2hQX7rp/kzmS08Ve+GO3odPd/W+JJdtw3Ze9JcRdXoa/PTl+R7Perjy258voapN32IEC8DulaGjQT9g5SWLW2Wgp1K2A2oWs2MUSnnshmcRYNUqHdeQVqq889Bw4cQBduBoAtwet+4VgLxKl4PbXH18DQMVHaJL0rURJLUbIgsP+GhbozIyR4nsNyyi7LblcL5YgvglRnJyXfOUjKAWS7VKhSsrOWf3BlrLWWf3dGTtgxfavO6b9RjUX4fsVQv13vJqHChDpJnakuUhlcPTTbWYCxWgvLtQ8pINqStYuz4P8HA7FXvaniKn5QEIDAFtbqrMnXAMLVOtF28+vUyddf7+cQZnqGmnZyLNXdPx69TXHuYvorJgXC1K+IRaMF8/AyX3rbWQ7iEBoyS161HWjHndxxl/Ot6hBK/vp8fUuHUB0CL4R/dajv0VomX7hSq0jyarRMR0Oam5M5j+nWEjKacxpxbyEslQ5/HA4eCId0vCMpeiSmEunWolDDS7aWRFsqvBltq0SbqqlRWqKitkHHG14R3X416C6Xy5VytUlpUhtdjxhyhbvCc76/3d3uaffNc8/zzPMt55apy40bvTf6blPvMDa4N3hu9z4sPSe/ou819ni/lP7i/R+1X//WOxCNuT1Bl+vsKXYI1u+RoxFGO1dbo9FaKP8SViKhleDd0hIxmzVN0Q23WwJ0yOvxJN2SFx1oimYoSVlCAEzy4P+YSebwDUBUj1I10deiVLSXatupoR4xvb3Upabc5jbd1Az3a27K3QvP3qXBEjAmIuGvSJ+ZCaVWmajQk5QBhUIDcHZ3jYZ6iGrriSRWzAmmURf24zJe4SCp4hXUjx8J4UyTvnBQ7yMU4q8+axUWXoElFC7FxhVO1rn01lZh/7htrsnjtgUHq3jttVYMDHyOI1vtaUeNewc+2dXcIpU0t7h6Bz7f6Wsx7P8joB172kFnFi+R/p6e3h7C1a5MaUFI0ySJ9CZZ1WVFUsutVFf0b3CFF15KUVqyyntGdev5SJSycm7h6x+nS+LpP/fkFowuq12RacjNfV6vKIvM14qYiv5Hrlu9Yhk1/9Svt57dPvn/A/kg5i8AeNpjYGQAg9I+5pXx/DZfOaQ5wPyn89NFYfSv9X/TBRg4AoFcNgZGIGQAAC7lCvkAeNpjYGRgYLf758fAwLbq/9//O9nUGNCBGQCXswZZAAB42mOKYGBgPc4wj6WYwYvJkkEFSHsDaQYg3gkUX8jCwBDAeJyhAyjeDuTPAdIubJYMySyPGVYA1ewHiqWxhv3/CxSfxhrGsAiI5wHlDID8UCB7GpBuBprRAcT2QCwFMgeIbYByMUDaiWkVQyuQ9gWpB+L7QBwMZYcB5RyBdCIQu7GtAupjYDAHsj2A7mkGmQO0fxUQCwPZIHM9gexdQPcsAapTBAB8Qy8fAAAAeNolzk9HA3AAh/HPaLJoJsksa9oymWgyKkY0No0xG0l/JJO2qUOyt9A7iC47JTp06Nq1FxBJpy5d16FLvYB+6stz+h6eh7+tERkRfWC8R+zzn4l9JuskxpgqMd1n5prkF6l7Zu9IJ5i7Zf6c7Aq5BgvP5GMsXlB4Y+mdYo7SC6snrF9RzrDxw+aQygfVJlvL1IO/8UQzTyt8rW/aj2wX2I2wt8PBgMM4R6lAaOgE5/EN3cvAK/0aZ6e/f9wlngAAAAEAAAA2EAAEAAD/AP8AAgAQAEAA/wAABRcF7AD/AB542nWQzWrCQBRGTzRaaks30tJdXVcQoiDMMtnpJqBg1xGCRIKBEZd9jD5GfQkfoy/TL/Ui6SL3MsOZw73zBzxxJqCOgMe/uY4Od1pduSsaGofiN+MeD4yN+/Jz4wHPJOoKwnuZVz6MOzqrMu7KfxqH4i/jHi98G/flL8YD3vlJ08U6WY5jX2TlKt+dysw3VZM3uT8W1WEUTaK4juSqmzybOzettntHqlyw1qWXelCMpyCjZEXOjpMok2uravMbdXuOWlUcGBEx0YhvmfyrbvMzfatTTrXLlj3uF8S5PtwAAHjaY2BmwAsAAH0ABHjajZZtbBTHGcdnZi93azvmzlewTby+Wft8S/BijhyQA0zsveOuTnKqbMChd66LzYslQiKBdAakSoVFKlJRGhylEm2pVKN8qKJEEeu9yD3bSKZymzZuWlBLqUTenLQfmg+pQz405dP1P7NnKCqVuuvf8zzzPP+dmZ2dXd/U4LlUnbJBnKydtBKumEon2Qnf6fpbeVl5vGQ08xtXlfVkCTBlvWu28hllndLqdnOrrERL4TWJYKpL0QklcWl12GPgCpgHPjKiRJAPwZ4BNrgC5sEN4CcEVlR1cAxMgiVRUVoVzdV5KLVOWYtr1xJGgkoTWQYVoGCeTRi1ifSDETABJoFf6kTmGDgD5sEXsmIpTe6rmzH3Jvcl6UpHX0zI5gGvOfxt2Sx9s+D5b+z2fOYZT7bDkz2xxUtvTHt+3QbPh2MJW/ja+sS1VKPSiJtsxMSPw1L2KxKklHByWVlDHMAUfzVjKeFSh5GYnFd8hCpMoeQw4ZVrCnXrGxKpWlZhyyRMOPsH+9yrsM9LqxoSk6ln2afkCpgHCvsU5yfsE3KGLYk1h+0Fk2AeXAfLwM+WcH6M8yP2EQmyD0kc9IIRMAnmwTIIsA9hQ+wD9EakFXEvYOwD2BB7H7f1PmyQ3UZ0m93G1P7kJrcnZmRgxqsBj1WDppZqEG5MlNkf3bvrsaMMPGnsqDmlnfSQzUq7G3sC26/Z3fk8L7O/lnSTX05tYjeJAxhmchMj3yQ6GACj4DjwI7qF6BaxwSvgMnAAdhlsCOhsEbwHbpFNwAIDQGU3XAxTZtddI81TjewP7DekCSv+e/Zb6d9j70j/O/Zr6d+Fj8AvsnfcCCepOtQJrgnBh+DjqD/CflnqCPNKqoHNY+04bBz0gn4wAiaAn82zdvcwD6OTObKoEihd8pn0PyevqcQ6yi1jFzagLoyx4ylEMJP6pMEs4+JP0BTGuPAqImGM7/0AkTDGd84iEsZ48SQiYYzDRxEJYwyNIBLG6B9EBFNmP/tFxzqe7H+B6qkgO4VVOoVVOoVVOkV87JQ4yV2fmNtP3c5OrNgly1zfye1Zal+l9h5qv0btMWqfpvZZau+k9n5qm9TWqB2htkXtOboNS2FT6+0HmtutZmovUvstahepbVA7Ru0Oaus0aZVZm/vMZumy0pVS4qWDf6oHX58ga8OKtmHPt+GbMA97HVRky4JIb/fEayPCt5c6e732xh2JY3h9FnDhAh7DAvkY+PCAFrCNFtDJAjoIwvaCEXANLIMK8EPdjolPSBuEjYNeMALOgGXgl9NZBowcq07xipyYmHS8OvF+4GMLONtxtrE2qzWkhczQ08qERoMR2h+pRFiSNDYSQsINakOZ1k9/Vf+vr+pJTaqGXWAT4tPNXqn6CfcuPt30x64xx1Nr6I9IxIedR7cTg8bgt5GibG8lmir8FqKxN+ETrrYPlwVdYwOfpavEVdP8rvY3/plWZgj/rs3xv+hlH3X5n5F5c5rf1M7zd+NlFZmrRpnCzepSOqNt428tSulZFC65/LRw0/y7Wh9/QZOFMa+wv4iWFeR7jCH+NPrLaAe5VUSf07xX2893eqqt4pppvglTML2wE5Ndr8lBoxFk3uZbn3suWaZHrA2Bi4F8oD/wZCAR2BBoC/BAa6AlsFoNqyF1lfqoWquqql/1qUwl6upyZckyCR7gan9IOL9PWJ+MQ0xYGPnpoyojzxLna0qO5famac65dojkDurOP/dGy7R295DzSDRNnXCO5AbTzjYzVw5U9jhJM+cEBr6Vn6L0QgFZh32/TMlgvkwrInWuxQnvys8QShvOvdwi/OPnXi4USHPjyd7m3nBPw/avZx5iRqvWvH80PxC3pp2Lub15d+sbb7SmC05CxpUK4pzzw736cH6Gfkm/yGZm6B3hCvkZpYd+md0j8kpPplDIlek+qSM6vQMdts4dqVPxX1roiK5GPN0lTxfD9dB1CAddTQ2JSV2spkbqfFTopood2cxUR4fUNOmkKDXFJv0/NYsxaGIxqWm0yaLULDbaQuP0SImmQRLRpIQ+RjQp0ehjUrLvviRelZy/JzkvR1LofY3maeqXVjT1S9CY/+8xljZNWuouHBrOjkWzo9HsGBh1Xjp5pNmxD+r61KGCKOiOYowePHRE+ANjTiE6lnEORTP6VPfwQ8rDotwdzUyR4exgfmrYGsu43VZ3NnogUyj1DWxJPjDW+XtjbRl4SGcDorMtYqy+5EPKSVHuE2MlxVhJMVaf1SfHInKrD+SnVJIu7Br2fInV1WLbjra0FdKNoeM9cg93tzWfbpnFT5fXSZ1ZcB6Npp16IEpdqa6UKOHVEqVVSAerpebT3W0ts/T1aimEdEM0TczxE8UTpDn7fMb7K+JAavyEWHDPmsX/daCWdawDmeI4ITmnc2/O6d09lJ8KBJAdFbfk7FjJ1dVly5VrXnIjkjtEUlHuCUVup8jV1FSF//38T1T9LvEW2GyuRK0IHSfFguJEcoMMX4TBIdzr8FB+Fj+sxP+KYgE3WKQmLa70UZ22aRKvTcQ9rzB+ohpV12K86r0rcUlxZUnuHWKxzHsrNi67lctpDudTq5QnlThJ4bfzJvgu+C74BHxCiVthgyssyWvUJK+rzfCAP8NXei2Y5N+dETb3AAAA") format("woff");
}
.pdf24_10 {
	font-size: 1.491667em;
	font-family: "OOISBJ+Arial";
	color: #000000;
}
.pdf24_11 {
	line-height: 1.117187em;
}
.pdf24_12 {
	letter-spacing: 0.0001em;
}

.pdf24_ie .pdf24_12 {
	letter-spacing: 0.0023px;
}
.pdf24_13 {
	letter-spacing: 0em;
}

.pdf24_ie .pdf24_13 {
	letter-spacing: -0.0006px;
}
@font-face {
	font-family:"MKMDQQ+Calibri";
	src:url("data:application/octet-stream;base64,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") format("woff");
}
.pdf24_14 {
	font-size: 0.683333em;
	font-family: "MKMDQQ+Calibri";
	color: #000000;
}
.pdf24_15 {
	line-height: 1em;
}
.pdf24_16 {
	letter-spacing: -0.0018em;
}

.pdf24_ie .pdf24_16 {
	letter-spacing: -0.0202px;
}
.pdf24_17 {
	letter-spacing: -0.0013em;
}

.pdf24_ie .pdf24_17 {
	letter-spacing: -0.0138px;
}
.pdf24_18 {
	font-size: 0.745833em;
	font-family: "OOISBJ+Arial";
	color: #000000;
}
.pdf24_19 {
	letter-spacing: -0.0007em;
}

.pdf24_ie .pdf24_19 {
	letter-spacing: -0.0081px;
}
.pdf24_20 {
	letter-spacing: -0.0913em;
}

.pdf24_ie .pdf24_20 {
	letter-spacing: -0.9983px;
}
.pdf24_21 {
	letter-spacing: 0.0004em;
}

.pdf24_ie .pdf24_21 {
	letter-spacing: 0.0048px;
}
.pdf24_22 {
	letter-spacing: 0.0003em;
}

.pdf24_ie .pdf24_22 {
	letter-spacing: 0.0038px;
}
.pdf24_23 {
	letter-spacing: -0.0008em;
}

.pdf24_ie .pdf24_23 {
	letter-spacing: -0.0083px;
}
.pdf24_24 {
	letter-spacing: -0.0002em;
}

.pdf24_ie .pdf24_24 {
	letter-spacing: -0.0018px;
}
.pdf24_25 {
	letter-spacing: -0.0001em;
}

.pdf24_ie .pdf24_25 {
	letter-spacing: -0.0017px;
}
.pdf24_26 {
	font-size: 0.729167em;
	font-family: "JMUUJQ+Arial,Bold";
	color: #000000;
}
.pdf24_27 {
	letter-spacing: -0.0082em;
}

.pdf24_ie .pdf24_27 {
	letter-spacing: -0.0955px;
}
.pdf24_28 {
	letter-spacing: -0.0185em;
}

.pdf24_ie .pdf24_28 {
	letter-spacing: -0.2154px;
}
.pdf24_29 {
	letter-spacing: 0.0017em;
}

.pdf24_ie .pdf24_29 {
	letter-spacing: 0.0197px;
}
.pdf24_30 {
	font-size: 0.75em;
	font-family: "MKMDQQ+Calibri";
	color: #000000;
}
.pdf24_31 {
	letter-spacing: -0.0034em;
}

.pdf24_ie .pdf24_31 {
	letter-spacing: -0.0409px;
}

 body > div {
	box-shadow: 0 0 5px rgba(0,0,0,0.3) !important;
	margin: 20px auto !important;
}

</STYLE> 
</head>
	<body>
		<div id="page_0" class="pdf24_ pdf24_02">
			<div class="pdf24_03">
				<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAxkAAAIvCAYAAAAYtxb7AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAiL0lEQVR4nO3dadS29fzv8Z74U6ZKISoKmYlQIoVEg2RI5kKDoVJKRVHKkJCSNCpJkbEyhGaVBsnUSINGKtJgno7d+7ec9yp7rb32Xnvv/3XL67XWsa7rPq9zMjw4Pus7/BZYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOB/6R//+Mf097//ffrrX/86/e1vf7vT1WN/+ctfxs8///nP837/05/+NO/f/Zz93mtm/+55s9fPrl7XNfv9j3/847ju+F6zz519h77b7P1mr7vjZ86+0+y5/eeZ6/9OAQDgP1o356eeeur0yle+ctpyyy2nHXfccXrrW986ffSjH51e85rXTC94wQumDTfccHrhC184vfrVr57e8IY3TM997nOn7bffftp7772nt7zlLdPaa6897bDDDuOxXvOKV7xieu1rXzse22677cZ79nP2fl3PfvazpzXWWGN61rOeNd739a9//bTZZpuN573zne+cDj300GnXXXedjjjiiGnrrbee3vOe90ybb775tOaaa47X9n3WX3/96aUvfem07rrrThtvvPH0la98RcgAAIC5VhVgn332mdZbb73pYQ972Lyb/yWWWGJaZpllpvvc5z7T6quvPv79uMc9bgSIvfbaa9zM/+Y3v5mOO+646d3vfvf4d1eVhUsvvXSElptvvnne41UZrrnmmvH6rpVWWml605veNMJIgabvMXvu7H163+OPP366/PLLx2M95/DDD5/23Xff6eKLLx5VjauvvnpaYYUVpre//e0jnAgZAAAwx7qZf9/73jetssoq05JLLjk94xnPmJ7+9KePcPGABzxg+q//+q/p7ne/+3SPe9xjetrTnjats84606c//elxM//73/9+OuWUU0bF4o5h4kc/+tF4Xu89e/x3v/vdtMEGG4xqRVWK97///SMcLL300tOiiy46ffvb3/6fQsYHP/jB6YADDpgXVqq6HH300aOCcc4554zPKugUjqpsVIERMgAAYI51M19b0lOf+tTpgQ984AgbtR8tvvjiI1wsuOCC02Me85jRptSN/Mte9rLp4IMPHjfzN9100/S5z31utEPdMSDceOON0+te97rpV7/61bzHbrnllmmttdaarrjiiun666+fPv7xj482qALNsssuO73qVa+603s0c7HJJptMH/jAB+aFjCoZhxxyyHjvc889d4SMKhmLLbbY9KQnPWm0TAkZAAAwx2YhY9VVVx0tUYWM5z//+SNgzK4qGBtttNG4kS9kNHsxq2R84QtfGLMShYJZQKiNqVaoE044Yd5jVSG+/OUvj+rFy1/+8hEudt999+n888+fHvWoR40Kyq233jrv+QWRWrdOPPHEea1Ufdd3vOMdoxoyCxk/+clPpvvd737TiiuuOB4XMgAAYI51A99MRAPYSy211PTEJz5xWn755UebVFfBowpElYZ73/ve4+8Nes+2R33jG98YbVBVFGYBocf322+/EUzu2DJVEKmlaeeddx5zIL3mhz/84Zj9KHScfPLJ8zZI7bnnnmMY/Nprr71Ty1WzHu9617umiy66aASXY489dlRd+l5VOIQMAACYY93U77TTTiMo1Lb0lKc8Zdzw3+te9xqzDm1vqvLwzGc+c7rnPe85wkjViMsuu2zc5J900klj49T+++8/b4XsrBJRVaRqxuzx1tXWdrXIIouM6sVHPvKREXAa2F555ZVHW9a22247WqIe+9jHTt/61rfuNOvRHEbD573mtttum1fZaH6kKktbsIQMAACYY92od5NfIGjQu5v7Nj81i1HLU4GiCkYVjR7rZyHkyCOPHDf+zVg0C1FQqSpxx6pFA94vetGLph/84AcjYLSJqiDT8x//+MePwe5LLrlk/K3tUFUiVltttTFjUQD5wx/+cKf3a8VulYzZqtpmQmrz6vlPfvKTxypcIQMAAOZYIaMZi86+qG2pUNFMRkPgb37zm6cHP/jB00ILLTSu2aapF7/4xaN9anYwX6/fY489RjWkNbV3DAbNYfR4VwPjnavRQHiBorBQ21TnZ1QJ+elPfzre86yzzpo+/OEPj0rJbJ7j9NNPH9WONmFVJel5bZpqI1ZVl4c+9KHapQAAYH5QyOgAvKoXyy233Gg7apbi/ve//zjPopv42qSae3jkIx85VtlW7aiacfbZZ48AUAVjl112mV7ykpeMqsgd5zAKIc1QFBp6vEHxhrZrw6qa0Wd1feITnxhBYjbTceCBB47zMaqWXHfddWMOpEHxqiKzrVK1TjVHUvDpp0oGAADMB7rx7zTt2UxEq2w7jG/hhRceMw6dY1GwuO997zuGttsu1eF8VS+a1ahlqfW0HZx3xhlnjHmJ2eF5Xa2frT2qSkfh4corrxxrbztro1Bx1VVXjXW2n/3sZ8djPX+2NaqgUcDoe/ScBsOrjhRc+rzmRKqwFDL6TkIGAADMB2btUoWMKhmtgn3jG984Zic6jbs2pGYeqmRstdVW0yMe8YgxN1HY6FC8Ako3/QWHKhtHHXXU2AxVhaPr1FNPHf/ulPAqGH1em6eqSBx22GFjY1QBotDQoPcxxxwz71yNQkzhofMyPvWpT41h74JKbVZ9j4bU73a3u42QUSWmliwhAwAA5tisXaozKdr4VCWjw/gKFrUxzSoZtU91s992qVqXao+qcvCEJzxh+tCHPjT98pe/HKd4Fxiawzj++OPHORq9d6GgNqlec8MNN0y/+MUvxurbj33sYyNMFD76rGY2vva1r41wUsWiINMMR2Gk1xUwzjzzzOkhD3nIaJXq/I5ZyGiOpNAjZAAAwBybrYFtO1PVi+YkakMqZDRj0QB4rVJVDgoVhYxNN910BIEvfvGL43yK5jO22Wab6TOf+cwIBVUvGt5uoLsh8VqhCh+XXnrpGNzu0L2CSEHjoIMOGoPgfdYOO+wwHXDAAfOGxmuTuuCCC0a1YzbP8fCHP3xswer7VnUpABU02oDVDImQAQAAc6yb97e97W0jKDTY3VxGbUhtbOqm/UEPetC4kS9stFGqG/vZZqnPf/7z42a/07oLKAWRqh2trv3ud787hrmrcjT0XSApXFStOOKII6bf/va3428FkPPOO28cvNe62yoWszM1muVoPqPXFU56/yoYhZ6CUC1Sfbe+a1uwhAwAAJgPFDI6o6KgUMBoNqPfu3FvhW2B4373u9/YKNW/a1HqrIpCRm1MbZ9qbqNB8UJK26l23HHHUakoGHTexXvf+97R5nTiiSeOge5O6S5oXHjhhWMbVc9t/qPB7tnBe52/scUWW4ywUitUFYwO8StM1LpVxeU5z3nOqGIsuuiio4Wq7yVkAADAHCtktGK2YNGNfDfvzWcUHGp1qjWpVqRO/679qcrFWmutNdqZChmFil7Tcwop/d4BeQWMKhldHbp38cUXj81TtT61aaqtUb2+Ye/NN998VC2qXsxapXp9n93MR1WSDgLsnI5CRT/7Hs973vPGPEZ/KwwJGQAAMB+YzWQ0W1FrVJWJwsZsxqEWpW7qCx21SS2//PJjxW2ncbfxqcpCA+NVOGZBo0P9+vfXv/71sXWqcFGYaP7i2muvHZulDj/88FENqVLRsPm+++47wkVVjNba1g5VgOl7FSRqi+p71CrV5xRkOkCw0NF1n/vcxwpbAACYHxQytt1221GBKEi0TarqQdWB2pQ65K6b+1bYFjqqIFQxqOpQy1M39z2/FqZZCFhzzTVHFaRZi69+9avj/IvmL3784x+PTVN95gc+8IFxwndtUeuss84IIQWE3/zmN2Odbd+lMDMLF82EdCjgbJtUIaTWrv42+3shSMgAAIA51g1/m6GqRjz60Y8eVYiGwLuhr4WqfxckllhiiVEpqFLR/ERVh6oRzW4UPGZtTB2OVwCoJaqQceSRR46QUftTr+nxNlO1Uap5jLZJdfp3lZHO2yiEFFCasaiK0vv2XQobhYtZyKj60aar2ef2fCEDAADmA4WMLbfcctzQd3WzXsXikEMOGetjb7zxxnEGRpWG173udSOMNJPR69oMVchYYYUVRghohqLX18r0pS99aVQuCiKtoi2g/PrXvx6rbKtg1CpVAOn9el4B5Nvf/vb0pje9aQyOd25Gm6RmJ3rPVtUWKKqarLLKKiPM9O+qLg2da5cCAID5wGyFbdujqlJ0FkUBoGpDa2bPOOOMcXhesxI93t9bNVu7VL8XMpqdKAAUCGpbqhLSJqmGvTs9vO1V66233jgHo6BSVaOqRSeBd65Gw+AFjf7WAXxXXnnlaOFqmLv3m1UvZpWMgkXBpsHvPrPtVw2r93ohAwAA5lghY6uttho37bvvvvsIF1dfffU4WK+Zh0LEaqutNgJDQaO/H3fccWPt7FFHHTVu8nte7VRVFPrZLMVJJ500nXbaaWOuo4pDG6QKHFU1ChZVNJrLKGhcfvnl47TwKhcNgved2kq13HLLjfdqPqOWqd6/q7DRZzZc3urcHuvMjLZfCRkAADDHalPqpr+5iFqjTj/99DEX0fB1bUm1UnWYXi1ShYZCRq9pY1Sbo6oqFA4aDK+lqZDRrETnYzTs3ZD42muvPaoZzUzUIvWxj31sOvfcc0f71Prrrz/O0WhY/JOf/OS0zz77jJPBa5mqdapwUpWioFPYaLNUoeIFL3jBCCCzykbD5xtssIGQAQAAc202k7HZZptNt9xyyzh5u7amKgetqy0ANNjdid1VLqowFDL6d3MbbZOqPWp2hsViiy022qm6qlYUGrbffvsxm1GQ2G233cag+fnnnz9W2RZQChI33XTTCAj9bB6j1bh99vXXXz9mNQoVDXvPzuQoyKy++upjKL3vUKtXrVZCBgAAzLHZdqlddtlltER16F7D2924N6vRGRrNZTQE3mB1IaHXHH/88dPOO+882qnaQtXz77hd6g1veMOoYBQgjj766Ok73/nO9J73vGesq+11DYYXbJr3aLNU4WB22nengtf+1M+DDz54rMptPqQ2rT6r9y/EdOJ3n9/3bfXuy1/+ciEDAADm2uycjKoXl1xyydgQ1Y17LUkNXXcaePMXzU+suOKKIyRUgWhmoxaqWpRqt2r4u6vfa4fqPftbcxi77rrrqJY08N3PHmt9bad8n3LKKfMCxuyaHRBYJaPWqcJPv//sZz8bq2/f/OY3j/fpOYsuuugINs1nOPEbAADmA7U+VVFoU9OZZ545WqOaq1hkkUWmZZdddrQkFQY6XbsQUXWi59a+1POqYHS+Ritl99tvv1H9aIajIfK3vvWtYxaj4e+GyQserZqtCtHMRkPfnRp+66233ilktG1qp512GqtuTz755NGWVdjo/Zvl+P3vfz8GxZvVqJrRIHjfxTkZAAAwH5jNZFTBqOWon808FCQ23XTTad999x3Vi9bEdkNfa1UVhIJJlYpu7GuDaki7we0PfvCDo8Wp4fEttthiPH+77babrrrqqlG1KHTUQlXVpL+dc845Y4B8FjAaLG/4vAP5vvnNb45/33bbbSOMzA72K3zcfPPN43sVigoZVTQMfgMAwHygkNGNfwGjg/GqXjQzcdlll02nnnrqOHCv6kTViBe+8IVj61RD162L3WuvvUaAKIgUGAoLVSBqserwvioNnY/R66699tpRgei9anuq/aqB7l5TReOGG26YFzQaQO91fadDDz10vK4zOmrTapC8KklnaTR83urd2rrabGXwGwAA5gOFjIJB7U6tiG2uoQ1TVSR6/IADDhhhoOBRG1PPL1x0099A9hVXXDFOCN9///3HvERh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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==" alt="" class="pdf24_04" />
			</div>
			<div class="pdf24_view">
				<div class="pdf24_05 pdf24_06">
					<div class="pdf24_01" style="left:25.7542em;top:3.0717em;"><span class="pdf24_07 pdf24_08 pdf24_09" style="word-spacing:0.0083em;">THE ORDER OF FRIARS MINOR (S) LTD &nbsp;</span></div>
					<div class="pdf24_01" style="left:10.1667em;top:3.3121em;"><span class="pdf24_10 pdf24_11 pdf24_12">OFFICIAL &nbsp;</span></div>
					<div class="pdf24_01" style="left:10.1667em;top:5.3746em;"><span class="pdf24_10 pdf24_11 pdf24_13">RECEIPT &nbsp;</span></div>
					<div class="pdf24_01" style="left:36.2833em;top:4.6917em;"><span class="pdf24_14 pdf24_15 pdf24_16" style="word-spacing:0.0024em;">Co &amp; GST Reg No. 201016236M &nbsp;</span></div>
					<div class="pdf24_01" style="left:38.4417em;top:5.6917em;"><span class="pdf24_14 pdf24_15 pdf24_17" style="word-spacing:0.0021em;">Franciscan Columbarium &nbsp;</span></div>
					<div class="pdf24_01" style="left:29.0917em;top:6.5915em;"><span class="pdf24_18 pdf24_11 pdf24_19" style="word-spacing:-0.001em;">5 Bukit Batok East Avenue 2 Singapore 659918 &nbsp;</span></div>
					<div class="pdf24_01" style="left:36.3292em;top:7.6917em;"><span class="pdf24_14 pdf24_15 pdf24_20">T</span><span class="pdf24_14 pdf24_15 pdf24_21">e</span><span class="pdf24_14 pdf24_15 pdf24_22" style="word-spacing:-0.0003em;">l: 6560-6361, HP: 9774-7053, &nbsp;</span></div>
					<div class="pdf24_01" style="left:33.0292em;top:8.6917em;"><span class="pdf24_14 pdf24_15 pdf24_23">email:Franciscan.columbarium@gmail.com &nbsp;</span></div>
					<div class="pdf24_01" style="left:42.4792em;top:10.2957em;"><span class="pdf24_18 pdf24_11 pdf24_24">${safeReceiptNo} &nbsp;</span></div>
					<div class="pdf24_01" style="left:30.5em;top:10.4665em;"><span class="pdf24_18 pdf24_11 pdf24_25" style="word-spacing:0.0006em;">Receipt No: &nbsp;</span></div>
					<div class="pdf24_01" style="left:30.625em;top:11.5915em;"><span class="pdf24_18 pdf24_11 pdf24_25" style="word-spacing:0.0001em;">Date : &nbsp;</span></div>
					<div class="pdf24_01" style="left:41.5667em;top:11.5873em;"><span class="pdf24_18 pdf24_11 pdf24_13">${safeReceiptDate} &nbsp;</span></div>
					<div class="pdf24_01" style="left:3.5625em;top:14.8623em;"><span class="pdf24_18 pdf24_11 pdf24_25" style="word-spacing:0.0002em;">Received From : &nbsp;</span></div>
					<div class="pdf24_01" style="left:3.5625em;top:16.5915em;"><span class="pdf24_18 pdf24_11 pdf24_25">Address: &nbsp;</span></div>
					<div class="pdf24_01" style="left:10.4375em;top:14.9623em;"><span class="pdf24_18 pdf24_11 pdf24_25" style="word-spacing:0.0003em;">${safeCustomerName} &nbsp;</span></div>
					<div class="pdf24_01" style="left:10.5625em;top:16.3998em;"><span class="pdf24_18 pdf24_11 pdf24_25">${safeAddress} &nbsp;</span></div>
					<div class="pdf24_01" style="left:3.625em;top:19.5857em;"><span class="pdf24_26 pdf24_08 pdf24_12">Invoice &nbsp;</span></div>
					<div class="pdf24_01" style="left:14em;top:19.6482em;"><span class="pdf24_26 pdf24_08 pdf24_13">Description &nbsp;</span></div>
					<div class="pdf24_01" style="left:40.2583em;top:19.8357em;"><span class="pdf24_26 pdf24_08 pdf24_27" style="word-spacing:-0.0233em;">Total Amount &nbsp;</span></div>
					<div class="pdf24_01" style="left:3.5em;top:20.8165em;"><span class="pdf24_18 pdf24_11 pdf24_24">${safeInvoiceNo} &nbsp;</span></div>
					<div class="pdf24_01" style="left:14em;top:20.9248em;"><span class="pdf24_18 pdf24_11 pdf24_13">${safeDescription} &nbsp;</span></div>
					<div class="pdf24_01" style="left:41.1875em;top:21.004em;"><span class="pdf24_18 pdf24_11 pdf24_25" style="word-spacing:0.0001em;">$ ${safeTotalAmountDisplay} &nbsp;</span></div>
					<div class="pdf24_01" style="left:14em;top:21.9248em;"><span class="pdf24_18 pdf24_11 pdf24_25"></span></div>
					<div class="pdf24_01" style="left:33.3125em;top:23.1357em;"><span class="pdf24_26 pdf24_08 pdf24_28" style="word-spacing:0.0385em;">Total : &nbsp;</span></div>
					<div class="pdf24_01" style="left:41.4792em;top:23.1566em;"><span class="pdf24_26 pdf24_08 pdf24_25" style="word-spacing:0.0001em;">$ ${safeTotalAmountDisplay} &nbsp;</span></div>
					<div class="pdf24_01" style="left:3.625em;top:24.4332em;"><span class="pdf24_18 pdf24_11 pdf24_25" style="word-spacing:0.0004em;">Dollars : &nbsp;</span></div>
					<div class="pdf24_01" style="left:3.6875em;top:29.429em;"><span class="pdf24_18 pdf24_11 pdf24_25">${safePaymentMode} &nbsp;</span></div>
					<div class="pdf24_01" style="left:9.1875em;top:24.4332em;"><span class="pdf24_18 pdf24_11 pdf24_29" style="word-spacing:-0.0089em;">${safeTotalInWords} &nbsp;</span></div>
					<div class="pdf24_01" style="left:9.1875em;top:25.4332em;"><span class="pdf24_18 pdf24_11 pdf24_25" style="word-spacing:0.0003em;"></span></div>
					<div class="pdf24_01" style="left:35.0833em;top:30.1083em;"><span class="pdf24_30 pdf24_15 pdf24_31" style="word-spacing:0.0125em;">The Order of Friars Minor (S) Ltd &nbsp;</span></div>
				</div>
			</div>
		</div>
	</body>
</html>
`;
  
  return html;
};

// Generate receipt PDF content using HTML template (optimized similar to invoice)
const generateReceiptPdfContent = async (payload: ReceiptApiPayload, options: ReceiptPdfOptions = {}): Promise<Blob> => {
  let element: HTMLDivElement | null = null;
  
  try {
    console.log('[generateReceiptPdfContent] Starting receipt PDF generation...');
    const startTime = Date.now();
    
    // Generate HTML template
    const htmlContent = generateReceiptHtmlTemplate(payload, options);
    
    // Create a temporary element with the HTML content
    element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '850px';
    element.style.backgroundColor = '#fff';
    document.body.appendChild(element);
    
    // Wait a bit for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use optimized html2canvas settings for better performance
    const html2canvas = (await import('html2canvas')).default;
    console.log('[generateReceiptPdfContent] Starting html2canvas conversion...');
    
    const canvas = await html2canvas(element, {
      scale: 1.5, // Reduced from 2 for better performance
      useCORS: true,
      logging: false,
      width: 850,
      height: element.scrollHeight,
      windowWidth: 850,
      backgroundColor: '#ffffff',
      removeContainer: false,
      allowTaint: false,
      imageTimeout: 15000
    });
    
    console.log('[generateReceiptPdfContent] Canvas created, converting to PDF...');
    const canvasTime = Date.now() - startTime;
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95); // Use JPEG for smaller size
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
    
    pdfDoc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdfDoc.addPage();
      pdfDoc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    const blob = pdfDoc.output('blob');
    const totalTime = Date.now() - startTime;
    console.log(`[generateReceiptPdfContent] Receipt PDF generated successfully in ${totalTime}ms (canvas: ${canvasTime}ms, blob size: ${(blob.size / 1024).toFixed(2)}KB)`);
    
    // Clean up temporary element
    if (element && element.parentNode) {
      document.body.removeChild(element);
    }
    element = null;
    
    return blob;
  } catch (error) {
    console.error('[generateReceiptPdfContent] Error generating receipt PDF from HTML:', error);
    
    // Clean up element if it exists
    if (element && element.parentNode) {
      document.body.removeChild(element);
    }
    
    // Fallback to jsPDF if html2canvas fails
    console.log('[generateReceiptPdfContent] Falling back to jsPDF direct generation...');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const receiptInfo = payload.receipt ?? {};
    const invoiceInfo = payload.invoice ?? {};
    const receiptCode = receiptInfo.code || options.requestedCode || 'N/A';
    const customerName = receiptInfo.customerName || invoiceInfo.customerName || 'N/A';
    const totalAmount = receiptInfo.payingAmount ?? receiptInfo.totalAmount ?? invoiceInfo.payingAmount ?? invoiceInfo.totalAmount ?? 0;
    
    doc.setFontSize(12);
    doc.text('OFFICIAL RECEIPT', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Receipt No: ${receiptCode}`, 18, 40);
    doc.text(`Date: ${formatDate(receiptInfo.transactionDate || invoiceInfo.transactionDate)}`, 18, 50);
    doc.text(`Received From: ${customerName}`, 18, 60);
    doc.text(`Total: $${formatCurrency(totalAmount)}`, 18, 80);
    
    return doc.output('blob');
  }
};

export const receiptPdfService = {
  generateReceiptPdf: async (
    payload: ReceiptApiPayload,
    options: ReceiptPdfOptions = {}
  ): Promise<Blob> => {
    const RECEIPT_PDF_GENERATION_TIMEOUT = 45000; // 45 seconds timeout
    
    try {
      console.log('[generateReceiptPdf] Starting receipt PDF generation with timeout protection...');
      
      // Create a timeout promise
      const timeoutPromise = new Promise<Blob>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Receipt PDF generation timed out. The receipt is taking longer than expected to generate. Please try again.'));
        }, RECEIPT_PDF_GENERATION_TIMEOUT);
      });
      
      // Race between PDF generation and timeout
      const pdfPromise = generateReceiptPdfContent(payload, options);
      
      const blob = await Promise.race([pdfPromise, timeoutPromise]);
      console.log('[generateReceiptPdf] Receipt PDF generation completed successfully');
      return blob;
    } catch (error: any) {
      console.error('[generateReceiptPdf] Error generating receipt PDF blob:', error);
      
      // If timeout, provide helpful message
      if (error.message?.includes('timed out')) {
        throw new Error('Receipt PDF generation is taking too long. This may be due to a large receipt or slow browser performance. Please try again or contact support.');
      }
      
      throw error;
    }
  },

  /**
   * Generate the receipt HTML template only (for on-screen viewing, e.g. in a modal iframe),
   * reusing the exact same layout as the PDF generator.
   */
  generateReceiptHtml: (payload: ReceiptApiPayload, options: ReceiptPdfOptions = {}): string => {
    return generateReceiptHtmlTemplate(payload, options);
  },

  // Generate INVOICE PDF from receipt/invoice API payload (different UI from receipt)
  generateInvoicePdf: async (
    rawPayload: any,
    options: ReceiptPdfOptions = {}
  ): Promise<Blob> => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    let y = margin;

    const payload = rawPayload as any;

    const invoiceNo =
      payload.InvoiceNo ||
      payload.Code ||
      (payload.invoice && (payload.invoice.invoiceNo || payload.invoice.code)) ||
      options.requestedCode ||
      'N/A';

    const invoiceDate = formatDate(
      payload.InvoiceDate || payload.TransactionDate || payload.invoice?.invoiceDate
    );

    const customerName =
      payload.CustomerName || payload.invoice?.customerName || 'N/A';

    const address = payload.Address || '';

    const refDocNumber = normalizeRefField(
      payload.RefDocNumber || payload.refDocNumber
    );
    const refDocName = normalizeRefField(
      payload.RefDocName || payload.refDocName
    );

    const totalAmount =
      typeof payload.TotalAmount === 'number'
        ? payload.TotalAmount
        : payload.invoice?.totalAmount;

    const taxAmount =
      typeof payload.TaxAmount === 'number'
        ? payload.TaxAmount
        : payload.invoice?.taxAmount;

    const payingAmountRaw =
      Array.isArray(payload.PayingAmount) && payload.PayingAmount.length
        ? payload.PayingAmount[0]
        : payload.PayingAmount ?? payload.TotalPayingAmount ?? payload.invoice?.payingAmount;

    const payingAmount =
      typeof payingAmountRaw === 'number'
        ? payingAmountRaw
        : Number(payingAmountRaw ?? 0);

    const paymentMode =
      payload.PaymentMode ?? payload.invoice?.paymentMode ?? null;

    const lineItemsSource: any[] = Array.isArray(payload.details)
      ? payload.details
      : Array.isArray(payload.invoice?.details)
        ? payload.invoice.details
        : [];

    const lineItems = lineItemsSource.map((item, index) => {
      const descParts: string[] = [];
      const itemRefName = normalizeRefField(item.refDocName);
      const itemRefNumber = normalizeRefField(item.refDocNumber);

      if (itemRefName) descParts.push(itemRefName);
      if (itemRefNumber) descParts.push(itemRefNumber);
      if (!descParts.length && item.itemId) descParts.push(`Item ${item.itemId}`);

      const description = descParts.join(' • ') || `Item ${index + 1}`;
      const quantity = item.quantity ?? 1;
      const unitAmount = item.unitAmount ?? (item.lineTotalAmount ?? 0);
      const total = item.lineTotalAmount ?? unitAmount * quantity;

      return {
        description,
        quantity,
        unitAmount,
        total,
      };
    });

    // Header
    doc.setFontSize(22);
    doc.setTextColor(139, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', margin, y);

    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text('Franciscan Columbarium', margin, y + 7);

    y += 18;

    // Invoice summary box
    doc.setDrawColor(139, 40, 40);
    doc.setFillColor(251, 248, 244);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 3, 3, 'FD');

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Summary', margin + 5, y + 8);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addKeyValueRow(doc, 'Invoice #', String(invoiceNo), margin + 5, y + 15);
    addKeyValueRow(doc, 'Date', invoiceDate, margin + 5, y + 21);
    addKeyValueRow(
      doc,
      'Reference',
      [refDocName, refDocNumber].filter(Boolean).join(' / ') || 'N/A',
      pageWidth / 2,
      y + 15
    );
    addKeyValueRow(
      doc,
      'Application',
      options.applicationCode || refDocName || 'N/A',
      pageWidth / 2,
      y + 21
    );

    y += 32;

    // Bill To
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To', margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(customerName, margin, y);
    y += 5;
    if (address) {
      const wrappedAddress = doc.splitTextToSize(address, pageWidth / 2 - margin);
      doc.text(wrappedAddress, margin, y);
      y += wrappedAddress.length * 4 + 2;
    }

    y += 4;

    // Line items table (different styling than receipt)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Items', margin, y);
    y += 6;

    const tableWidth = pageWidth - margin * 2;
    const descWidth = tableWidth * 0.5;
    const qtyWidth = tableWidth * 0.1;
    const unitWidth = tableWidth * 0.15;
    const totalWidth = tableWidth * 0.25;

    doc.setFillColor(40, 40, 40);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, y, tableWidth, 8, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Description', margin + 2, y + 6);
    doc.text('Qty', margin + descWidth + 2, y + 6);
    doc.text('Unit (S$)', margin + descWidth + qtyWidth + 2, y + 6);
    doc.text('Line Total (S$)', margin + descWidth + qtyWidth + unitWidth + 2, y + 6);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    if (!lineItems.length) {
      doc.rect(margin, y, tableWidth, 8);
      doc.text('No line items returned by the server.', margin + 2, y + 5);
      y += 12;
    } else {
      lineItems.forEach((item, index) => {
        const baseRowHeight = 8;
        const bg = index % 2 === 0 ? 255 : 245;
        doc.setFillColor(bg, bg, bg);
        doc.rect(margin, y, tableWidth, baseRowHeight, 'F');

        const wrappedDesc = doc.splitTextToSize(item.description, descWidth - 4);
        doc.text(wrappedDesc, margin + 2, y + 5);
        doc.text(String(item.quantity ?? 0), margin + descWidth + 2, y + 5);
        doc.text(
          formatCurrency(item.unitAmount ?? 0).replace('S$', ''),
          margin + descWidth + qtyWidth + 2,
          y + 5
        );
        doc.text(
          formatCurrency(item.total ?? 0).replace('S$', ''),
          margin + descWidth + qtyWidth + unitWidth + 2,
          y + 5
        );

        const extraHeight = wrappedDesc.length > 1 ? (wrappedDesc.length - 1) * 4 : 0;
        y += baseRowHeight + extraHeight;

        if (y > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          y = margin;
        }
      });
    }

    y += 6;

    // Totals section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Invoice Totals', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    addKeyValueRow(doc, 'Subtotal', formatCurrency(totalAmount), margin, y);
    addKeyValueRow(doc, 'Tax', formatCurrency(taxAmount), margin, y + 6);
    addKeyValueRow(doc, 'Total Amount', formatCurrency(totalAmount), margin, y + 12);
    addKeyValueRow(
      doc,
      'Amount Received',
      formatCurrency(payingAmount),
      pageWidth / 2,
      y
    );
    addKeyValueRow(
      doc,
      'Payment Mode',
      resolvePaymentMode(paymentMode),
      pageWidth / 2,
      y + 6
    );

    y += 24;

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Thank you for your payment. This invoice was generated from the Franciscan Columbarium system.',
      margin,
      y
    );
    y += 5;
    doc.text(`Generated on ${new Date().toLocaleString()}`, margin, y);

    return doc.output('blob');
  },
};

export default receiptPdfService;

