# Frontend Implementation Guide - Niche Agreement API

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Request/Response Examples](#requestresponse-examples)
3. [Data Structures](#data-structures)
4. [Field Mappings](#field-mappings)
5. [Error Handling](#error-handling)
6. [Date Formatting](#date-formatting)
7. [UI Component Suggestions](#ui-component-suggestions)
8. [Integration Examples](#integration-examples)
9. [PDF Generation](#pdf-generation)

---

## API Endpoints

### Base URL
```
http://your-api-domain.com/api/niche-agreements
```

### 1. Get Complete Agreement Details
**Endpoint**: `GET /api/niche-agreements/:applicationNumber`

**Description**: Retrieves complete niche agreement details including applicant, nominees, beneficiaries, deceased information, payment details, and storage period.

**URL Parameters**:
- `applicationNumber` (string, required): Application code (e.g., "3795-1", "3795", or "3795-")

**Response**: `200 OK` with complete agreement data

**Example Request**:
```javascript
GET /api/niche-agreements/3795-1
```

---

### 2. Get Agreement Summary (Lightweight)
**Endpoint**: `GET /api/niche-agreements/:applicationNumber/summary`

**Description**: Returns a lightweight summary version of the agreement.

**Response**: `200 OK` with summary data

---

### 3. Get PDF Data for Agreement
**Endpoint**: `GET /api/niche-agreements/:applicationNumber/pdf`

**Description**: Returns structured data optimized for PDF generation.

**Response**: `200 OK` with PDF-ready data structure

---

### 4. Get PDF Data for Invoice
**Endpoint**: `GET /api/niche-agreements/:applicationNumber/invoice-pdf`

**Description**: Returns invoice data optimized for PDF generation.

**Response**: `200 OK` with invoice PDF data

**Special**: Supports `HEAD` request to check if invoice exists

---

### 5. Get Crystal Reports Information
**Endpoint**: `GET /api/niche-agreements/:applicationNumber/reports`

**Description**: Returns Crystal Reports configuration information.

**Response**: `200 OK` with report paths and parameters

---

### 6. Get Application Number Suggestions
**Endpoint**: `GET /api/niche-agreements/suggestions/:partialApplicationNumber`

**Description**: Returns matching application numbers for autocomplete.

**Response**: `200 OK` with array of application numbers

---

## Request/Response Examples

### Example 1: Get Complete Agreement

**Request**:
```javascript
fetch('/api/niche-agreements/3795-1')
  .then(response => response.json())
  .then(data => console.log(data));
```

**Response**:
```json
{
  "success": true,
  "message": "Niche agreement details retrieved successfully",
  "data": {
    "applicationCode": "3795-1",
    "appliedDate": "14-Jul-2025",
    "agreementDate": "14-Jul-2025",
    
    "applicant": {
      "name": "Gabriella Wong Lye Ying",
      "address": "Blk 343 Choa Chu Kang Loop #06-43, Singapore 680343",
      "email": "gabby.wong68@gmail.com",
      "idNo": "S6811601E",
      "mobileNo": "9650-4551",
      "homeTelNo": null,
      "officeTelNo": null,
      "isCatholic": true
    },
    
    "nominee": {
      "name": "Denis Yu Wen Hui",
      "address": "Blk 10B Boon Tiong Road #27-533 Singapore 164010",
      "email": "denis_yu@hotmail.com",
      "idNo": "S8524327F",
      "mobileNo": "9831-3448",
      "homeTelNo": null,
      "officeTelNo": null,
      "relationship": "Nephew"
    },
    
    "nominee2": {
      "name": "Marcus Leong Jun Wen",
      "address": "Blk 343 Choa Chu Kang Loop #06-43 Singapore 680343",
      "email": "marcusgerard97@gmail.com",
      "idNo": "S9716600E",
      "mobileNo": "9877-4876",
      "homeTelNo": null,
      "officeTelNo": null,
      "relationship": "Son"
    },
    
    "beneficiaries": [
      {
        "name": "Monica Pang Oi Moi",
        "idNo": "S0399339F",
        "isCatholic": true,
        "isMale": false,
        "relationshipToApplicant": "Mother",
        "dateOfBirth": "27-Aug-1936",
        "birthYear": "1936",
        "relationshipToNominee1": null,
        "relationshipToNominee2": null,
        "status": "Occupied",
        "sex": "Female"
      },
      {
        "name": "Peter Wong Ngok Heong",
        "idNo": "S0399340Z",
        "isCatholic": true,
        "isMale": true,
        "relationshipToApplicant": "Father",
        "dateOfBirth": "03-Nov-1932",
        "birthYear": "1932",
        "relationshipToNominee1": null,
        "relationshipToNominee2": null,
        "status": "Occupied",
        "sex": "Male"
      }
    ],
    
    "niche": {
      "number": "3795",
      "code": "N3795",
      "rowNumber": null,
      "wallName": null,
      "chapelName": "St Agnes",
      "totalAmount": 5500.00,
      "lineAmount": 5500.00,
      "location": {
        "chapel": {
          "chapelId": 1,
          "chapelCode": "STAGNES",
          "chapelName": "St Agnes",
          "description": null
        },
        "wall": {
          "wallId": 1,
          "wallCode": "W001",
          "wallName": "Wall A"
        },
        "row": {
          "rowId": 1,
          "rowCode": "R001",
          "level": 1
        }
      }
    },
    
    "invoice": {
      "invoiceNo": "53139",
      "invoiceDate": "15-Jul-2025",
      "receiptNo": "003616",
      "receiptDate": "15-Jul-2025",
      "receiptAmount": 5995.00,
      "taxAmount": 495.00,
      "invoicePayingAmount": 5500.00,
      "receiptPayingAmount": 5995.00,
      "totalAmount": 5500.00,
      "paymentMode": "Cash",
      "paymentModeDocNo": null,
      "refDocNumber": "3795-1"
    },
    
    "deceased": {
      "deceased1": {
        "name": "Peter Wong Ngok Heong",
        "dateDied": "28-Oct-1998",
        "internmentDate": "19-Jul-2025",
        "deathCertificateNo": null
      },
      "deceased2": {
        "name": "Monica Pang Oi Moi",
        "dateDied": "10-Jul-2025",
        "internmentDate": null,
        "deathCertificateNo": "888563Z"
      }
    },
    
    "storage": {
      "storageFrom": "01-Jan-2026",
      "storageTo": "31-Dec-2055"
    },
    
    "printReady": {
      "agreementReady": true,
      "invoiceReady": true,
      "receiptReady": true,
      "consentFormReady": false
    },
    
    "metadata": {
      "generatedAt": "2025-08-25T10:30:00.000Z",
      "applicationNumber": "3795-1",
      "hasInvoice": true,
      "hasReceipt": true,
      "beneficiaryCount": 2,
      "nomineeCount": 2
    }
  }
}
```

---

### Example 2: Error Response

**Request**:
```javascript
fetch('/api/niche-agreements/invalid-code')
```

**Response** (404 Not Found):
```json
{
  "success": false,
  "message": "No niche agreement found for application number: invalid-code",
  "error": "Not Found"
}
```

**Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "Application number is required",
  "error": "Bad Request"
}
```

---

## Data Structures

### Complete Agreement Response Structure

```typescript
interface AgreementResponse {
  success: boolean;
  message: string;
  data: {
    applicationCode: string;
    appliedDate: string; // Format: "dd-MMM-yyyy"
    agreementDate: string; // Format: "dd-MMM-yyyy"
    
    applicant: PersonInfo;
    nominee: PersonInfo | null;
    nominee2: PersonInfo | null;
    
    beneficiaries: Beneficiary[];
    
    niche: NicheInfo;
    
    invoice: InvoiceInfo;
    
    deceased: DeceasedInfo;
    
    storage: StorageInfo;
    
    printReady: PrintReadyStatus;
    
    metadata: Metadata;
  };
}

interface PersonInfo {
  name: string;
  address: string; // Formatted full address
  email: string | null;
  idNo: string | null;
  mobileNo: string | null;
  homeTelNo: string | null;
  officeTelNo: string | null;
  isCatholic?: boolean;
  relationship?: string; // For nominees only
}

interface Beneficiary {
  name: string;
  idNo: string | null;
  isCatholic: boolean;
  isMale: boolean;
  relationshipToApplicant: string | null;
  dateOfBirth: string | null; // Format: "dd-MMM-yyyy"
  birthYear: string | null;
  relationshipToNominee1: string | null;
  relationshipToNominee2: string | null;
  status: string;
  sex: "Male" | "Female";
}

interface NicheInfo {
  number: string | null;
  code: string | null;
  rowNumber: string | null;
  wallName: string | null;
  chapelName: string | null;
  totalAmount: number;
  lineAmount: number;
  location: {
    chapel: {
      chapelId: number | null;
      chapelCode: string | null;
      chapelName: string | null;
      description: string | null;
    };
    wall: {
      wallId: number | null;
      wallCode: string | null;
      wallName: string | null;
    };
    row: {
      rowId: number | null;
      rowCode: string | null;
      level: number | null;
    };
  };
}

interface InvoiceInfo {
  invoiceNo: string | null;
  invoiceDate: string | null; // Format: "dd-MMM-yyyy"
  receiptNo: string | null;
  receiptDate: string | null; // Format: "dd-MMM-yyyy"
  receiptAmount: number;
  taxAmount: number;
  invoicePayingAmount: number;
  receiptPayingAmount: number;
  totalAmount: number;
  paymentMode: string | null;
  paymentModeDocNo: string | null;
  refDocNumber: string | null;
}

interface DeceasedInfo {
  deceased1: {
    name: string | null;
    dateDied: string | null; // Format: "dd-MMM-yyyy"
    internmentDate: string | null; // Format: "dd-MMM-yyyy"
    deathCertificateNo: string | null;
  };
  deceased2: {
    name: string | null;
    dateDied: string | null; // Format: "dd-MMM-yyyy"
    internmentDate: string | null; // Format: "dd-MMM-yyyy"
    deathCertificateNo: string | null;
  };
}

interface StorageInfo {
  storageFrom: string | null; // Format: "dd-MMM-yyyy"
  storageTo: string | null; // Format: "dd-MMM-yyyy"
}

interface PrintReadyStatus {
  agreementReady: boolean;
  invoiceReady: boolean;
  receiptReady: boolean;
  consentFormReady: boolean;
}

interface Metadata {
  generatedAt: string; // ISO 8601 format
  applicationNumber: string;
  hasInvoice: boolean;
  hasReceipt: boolean;
  beneficiaryCount: number;
  nomineeCount: number;
}
```

---

## Field Mappings

### Agreement Document Fields → API Response

| Document Field | API Path | Type | Notes |
|---------------|----------|------|-------|
| **Application Code** | `data.applicationCode` | string | e.g., "3795-1" |
| **Applied Date** | `data.appliedDate` | string | Format: "dd-MMM-yyyy" |
| **Agreement Date** | `data.agreementDate` | string | Format: "dd-MMM-yyyy" |
| **Applicant Name** | `data.applicant.name` | string | |
| **Applicant NRIC/Passport** | `data.applicant.idNo` | string | |
| **Applicant Address** | `data.applicant.address` | string | Full formatted address |
| **Applicant Mobile** | `data.applicant.mobileNo` | string | |
| **Applicant Email** | `data.applicant.email` | string | |
| **Applicant Catholic** | `data.applicant.isCatholic` | boolean | |
| **Nominee 1 Name** | `data.nominee.name` | string | |
| **Nominee 1 Address** | `data.nominee.address` | string | |
| **Nominee 1 Email** | `data.nominee.email` | string | |
| **Nominee 1 NRIC** | `data.nominee.idNo` | string | |
| **Nominee 1 Mobile** | `data.nominee.mobileNo` | string | |
| **Nominee 1 Relationship** | `data.nominee.relationship` | string | |
| **Nominee 2 Name** | `data.nominee2.name` | string | |
| **Nominee 2 Address** | `data.nominee2.address` | string | |
| **Nominee 2 Email** | `data.nominee2.email` | string | |
| **Nominee 2 NRIC** | `data.nominee2.idNo` | string | |
| **Nominee 2 Mobile** | `data.nominee2.mobileNo` | string | |
| **Nominee 2 Relationship** | `data.nominee2.relationship` | string | |
| **Beneficiary 1 Name** | `data.beneficiaries[0].name` | string | |
| **Beneficiary 1 NRIC** | `data.beneficiaries[0].idNo` | string | |
| **Beneficiary 1 DOB** | `data.beneficiaries[0].dateOfBirth` | string | Format: "dd-MMM-yyyy" |
| **Beneficiary 1 Relationship** | `data.beneficiaries[0].relationshipToApplicant` | string | |
| **Beneficiary 1 Sex** | `data.beneficiaries[0].sex` | string | "Male" or "Female" |
| **Beneficiary 1 Catholic** | `data.beneficiaries[0].isCatholic` | boolean | |
| **Beneficiary 2 Name** | `data.beneficiaries[1].name` | string | |
| **Beneficiary 2 NRIC** | `data.beneficiaries[1].idNo` | string | |
| **Beneficiary 2 DOB** | `data.beneficiaries[1].dateOfBirth` | string | Format: "dd-MMM-yyyy" |
| **Beneficiary 2 Relationship** | `data.beneficiaries[1].relationshipToApplicant` | string | |
| **Beneficiary 2 Sex** | `data.beneficiaries[1].sex` | string | "Male" or "Female" |
| **Beneficiary 2 Catholic** | `data.beneficiaries[1].isCatholic` | boolean | |
| **Chapel Name** | `data.niche.chapelName` | string | |
| **Niche No** | `data.niche.number` | string | |
| **Consideration Sum** | `data.niche.totalAmount` | number | |
| **Invoice No** | `data.invoice.invoiceNo` | string | |
| **Invoice Date** | `data.invoice.invoiceDate` | string | Format: "dd-MMM-yyyy" |
| **Receipt No** | `data.invoice.receiptNo` | string | |
| **Receipt Date** | `data.invoice.receiptDate` | string | Format: "dd-MMM-yyyy" |
| **Amount** | `data.invoice.totalAmount` | number | |
| **GST** | `data.invoice.taxAmount` | number | |
| **Total** | `data.invoice.receiptAmount` | number | |
| **Payment Mode** | `data.invoice.paymentMode` | string | |
| **Deceased 1 Name** | `data.deceased.deceased1.name` | string | |
| **Deceased 1 Date Died** | `data.deceased.deceased1.dateDied` | string | Format: "dd-MMM-yyyy" |
| **Deceased 1 Internment Date** | `data.deceased.deceased1.internmentDate` | string | Format: "dd-MMM-yyyy" |
| **Deceased 1 Cert No** | `data.deceased.deceased1.deathCertificateNo` | string | |
| **Deceased 2 Name** | `data.deceased.deceased2.name` | string | |
| **Deceased 2 Date Died** | `data.deceased.deceased2.dateDied` | string | Format: "dd-MMM-yyyy" |
| **Deceased 2 Internment Date** | `data.deceased.deceased2.internmentDate` | string | Format: "dd-MMM-yyyy" |
| **Deceased 2 Cert No** | `data.deceased.deceased2.deathCertificateNo` | string | |
| **Storage From** | `data.storage.storageFrom` | string | Format: "dd-MMM-yyyy" |
| **Storage To** | `data.storage.storageTo` | string | Format: "dd-MMM-yyyy" |

---

## Error Handling

### Error Response Structure

```typescript
interface ErrorResponse {
  success: false;
  message: string;
  error: string; // Error type: "Bad Request", "Not Found", "Internal Server Error"
}
```

### Common Error Scenarios

#### 1. Application Not Found (404)
```json
{
  "success": false,
  "message": "No niche agreement found for application number: 9999-1",
  "error": "Not Found"
}
```

**Handling**:
```javascript
if (response.status === 404) {
  // Show "Application not found" message
  // Allow user to search again
}
```

#### 2. Invalid Application Number (400)
```json
{
  "success": false,
  "message": "Application number is required",
  "error": "Bad Request"
}
```

**Handling**:
```javascript
if (response.status === 400) {
  // Show validation error
  // Highlight input field
}
```

#### 3. Multiple Applications Found (404)
```json
{
  "success": false,
  "message": "Multiple applications found for pattern 3795-. Please specify: 3795-1, 3795-2",
  "error": "Not Found"
}
```

**Handling**:
```javascript
if (response.status === 404 && message.includes('Multiple applications')) {
  // Extract suggestions from message
  // Show dropdown with options
  const suggestions = message.split(': ')[1].split(', ');
}
```

#### 4. Server Error (500)
```json
{
  "success": false,
  "message": "Failed to retrieve niche agreement details",
  "error": "Internal Server Error"
}
```

**Handling**:
```javascript
if (response.status === 500) {
  // Show generic error message
  // Log error for debugging
  // Offer retry option
}
```

### Error Handling Example

```javascript
async function fetchAgreement(applicationNumber) {
  try {
    const response = await fetch(`/api/niche-agreements/${applicationNumber}`);
    const data = await response.json();
    
    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new Error(`Invalid input: ${data.message}`);
        case 404:
          if (data.message.includes('Multiple applications')) {
            // Handle multiple matches
            const suggestions = extractSuggestions(data.message);
            return { type: 'multiple', suggestions };
          }
          throw new Error(`Application not found: ${data.message}`);
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error(data.message || 'An error occurred');
      }
    }
    
    return { type: 'success', data: data.data };
  } catch (error) {
    console.error('Error fetching agreement:', error);
    return { type: 'error', message: error.message };
  }
}

function extractSuggestions(message) {
  const match = message.match(/Please specify: (.+)$/);
  if (match) {
    return match[1].split(', ').map(s => s.trim());
  }
  return [];
}
```

---

## Date Formatting

### Date Format
All dates from the API are in format: **`dd-MMM-yyyy`** (e.g., "14-Jul-2025", "01-Jan-2026")

### Date Utility Functions

```javascript
/**
 * Parse API date format (dd-MMM-yyyy) to JavaScript Date
 */
function parseApiDate(dateString) {
  if (!dateString) return null;
  
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = months[parts[1]];
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || !month || isNaN(year)) return null;
  
  return new Date(year, month, day);
}

/**
 * Format JavaScript Date to API format (dd-MMM-yyyy)
 */
function formatApiDate(date) {
  if (!date) return null;
  
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
}

/**
 * Format date for display (can customize based on locale)
 */
function formatDisplayDate(dateString) {
  const date = parseApiDate(dateString);
  if (!date) return dateString;
  
  // Example: "July 14, 2025"
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
```

### Usage Examples

```javascript
// Display formatted date
const agreementDate = data.agreementDate; // "14-Jul-2025"
const displayDate = formatDisplayDate(agreementDate); // "July 14, 2025"

// Compare dates
const storageFrom = parseApiDate(data.storage.storageFrom);
const today = new Date();
const isActive = storageFrom && storageFrom <= today;

// Calculate duration
const from = parseApiDate(data.storage.storageFrom);
const to = parseApiDate(data.storage.storageTo);
if (from && to) {
  const years = (to.getFullYear() - from.getFullYear());
  // Display: "30 years (2026-2055)"
}
```

---

## UI Component Suggestions

### 1. Application Search Component

```jsx
function ApplicationSearch({ onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async (term) => {
    if (term.length < 3) {
      setSuggestions([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/niche-agreements/suggestions/${term}`);
      const data = await response.json();
      setSuggestions(data.data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="search-container">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          handleSearch(e.target.value);
        }}
        placeholder="Enter application code (e.g., 3795-1)"
      />
      {loading && <span>Loading...</span>}
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((code) => (
            <li key={code} onClick={() => onSelect(code)}>
              {code}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 2. Agreement Display Component

```jsx
function AgreementDisplay({ applicationNumber }) {
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchAgreement(applicationNumber)
      .then(result => {
        if (result.type === 'success') {
          setAgreement(result.data);
        } else {
          setError(result.message);
        }
      })
      .finally(() => setLoading(false));
  }, [applicationNumber]);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!agreement) return <div>No data found</div>;
  
  return (
    <div className="agreement-container">
      <AgreementHeader data={agreement} />
      <ApplicantSection data={agreement.applicant} />
      <NomineesSection 
        nominee1={agreement.nominee} 
        nominee2={agreement.nominee2} 
      />
      <BeneficiariesSection data={agreement.beneficiaries} />
      <NicheSection data={agreement.niche} />
      <PaymentSection data={agreement.invoice} />
      <DeceasedSection data={agreement.deceased} />
      <StorageSection data={agreement.storage} />
    </div>
  );
}
```

### 3. Person Info Component

```jsx
function PersonInfo({ person, title }) {
  if (!person || !person.name) return null;
  
  return (
    <div className="person-info">
      <h3>{title}</h3>
      <div className="info-grid">
        <div><strong>Name:</strong> {person.name}</div>
        <div><strong>NRIC/Passport:</strong> {person.idNo || 'N/A'}</div>
        <div><strong>Address:</strong> {person.address || 'N/A'}</div>
        <div><strong>Mobile:</strong> {person.mobileNo || 'N/A'}</div>
        <div><strong>Email:</strong> {person.email || 'N/A'}</div>
        {person.relationship && (
          <div><strong>Relationship:</strong> {person.relationship}</div>
        )}
        {person.isCatholic !== undefined && (
          <div><strong>Catholic:</strong> {person.isCatholic ? 'Yes' : 'No'}</div>
        )}
      </div>
    </div>
  );
}
```

### 4. Beneficiary Card Component

```jsx
function BeneficiaryCard({ beneficiary, index }) {
  return (
    <div className="beneficiary-card">
      <h4>Beneficiary {index + 1}</h4>
      <div className="info-grid">
        <div><strong>Name:</strong> {beneficiary.name}</div>
        <div><strong>NRIC:</strong> {beneficiary.idNo || 'N/A'}</div>
        <div><strong>Date of Birth:</strong> {beneficiary.dateOfBirth || 'N/A'}</div>
        <div><strong>Sex:</strong> {beneficiary.sex}</div>
        <div><strong>Relationship:</strong> {beneficiary.relationshipToApplicant || 'N/A'}</div>
        <div><strong>Catholic:</strong> {beneficiary.isCatholic ? 'Yes' : 'No'}</div>
        <div><strong>Status:</strong> {beneficiary.status}</div>
      </div>
    </div>
  );
}
```

### 5. Payment Summary Component

```jsx
function PaymentSummary({ invoice }) {
  if (!invoice || !invoice.invoiceNo) {
    return <div className="no-payment">No payment information available</div>;
  }
  
  return (
    <div className="payment-summary">
      <h3>Payment Information</h3>
      <table>
        <tbody>
          <tr>
            <td>Invoice No:</td>
            <td>{invoice.invoiceNo}</td>
            <td>Invoice Date:</td>
            <td>{invoice.invoiceDate}</td>
          </tr>
          {invoice.receiptNo && (
            <tr>
              <td>Receipt No:</td>
              <td>{invoice.receiptNo}</td>
              <td>Receipt Date:</td>
              <td>{invoice.receiptDate}</td>
            </tr>
          )}
          <tr>
            <td>Amount:</td>
            <td>${invoice.totalAmount.toFixed(2)}</td>
            <td>GST:</td>
            <td>${invoice.taxAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Total:</td>
            <td colSpan="3"><strong>${invoice.receiptAmount.toFixed(2)}</strong></td>
          </tr>
          {invoice.paymentMode && (
            <tr>
              <td>Payment Mode:</td>
              <td colSpan="3">{invoice.paymentMode}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

### 6. Deceased Information Component

```jsx
function DeceasedSection({ deceased }) {
  if (!deceased) return null;
  
  const hasDeceased1 = deceased.deceased1 && deceased.deceased1.name;
  const hasDeceased2 = deceased.deceased2 && deceased.deceased2.name;
  
  if (!hasDeceased1 && !hasDeceased2) return null;
  
  return (
    <div className="deceased-section">
      <h3>Deceased Information</h3>
      {hasDeceased1 && (
        <div className="deceased-card">
          <h4>Deceased 1</h4>
          <div className="info-grid">
            <div><strong>Name:</strong> {deceased.deceased1.name}</div>
            <div><strong>Date Died:</strong> {deceased.deceased1.dateDied || 'N/A'}</div>
            <div><strong>Internment Date:</strong> {deceased.deceased1.internmentDate || 'N/A'}</div>
            <div><strong>Death Certificate:</strong> {deceased.deceased1.deathCertificateNo || 'N/A'}</div>
          </div>
        </div>
      )}
      {hasDeceased2 && (
        <div className="deceased-card">
          <h4>Deceased 2</h4>
          <div className="info-grid">
            <div><strong>Name:</strong> {deceased.deceased2.name}</div>
            <div><strong>Date Died:</strong> {deceased.deceased2.dateDied || 'N/A'}</div>
            <div><strong>Internment Date:</strong> {deceased.deceased2.internmentDate || 'N/A'}</div>
            <div><strong>Death Certificate:</strong> {deceased.deceased2.deathCertificateNo || 'N/A'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Integration Examples

### React Example

```jsx
import React, { useState, useEffect } from 'react';

function NicheAgreementPage() {
  const [applicationNumber, setApplicationNumber] = useState('');
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchAgreement = async (appNumber) => {
    if (!appNumber) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/niche-agreements/${appNumber}`);
      const result = await response.json();
      
      if (result.success) {
        setAgreement(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to fetch agreement. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    fetchAgreement(applicationNumber);
  };
  
  return (
    <div className="niche-agreement-page">
      <h1>Niche Agreement Lookup</h1>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={applicationNumber}
          onChange={(e) => setApplicationNumber(e.target.value)}
          placeholder="Enter application code (e.g., 3795-1)"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </button>
      </form>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {agreement && (
        <div className="agreement-display">
          <AgreementDisplay data={agreement} />
        </div>
      )}
    </div>
  );
}

export default NicheAgreementPage;
```

### Vue.js Example

```vue
<template>
  <div class="niche-agreement-page">
    <h1>Niche Agreement Lookup</h1>
    
    <form @submit.prevent="fetchAgreement">
      <input
        v-model="applicationNumber"
        type="text"
        placeholder="Enter application code (e.g., 3795-1)"
        required
      />
      <button type="submit" :disabled="loading">
        {{ loading ? 'Loading...' : 'Search' }}
      </button>
    </form>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-if="agreement" class="agreement-display">
      <AgreementDisplay :data="agreement" />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      applicationNumber: '',
      agreement: null,
      loading: false,
      error: null
    };
  },
  methods: {
    async fetchAgreement() {
      if (!this.applicationNumber) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const response = await fetch(`/api/niche-agreements/${this.applicationNumber}`);
        const result = await response.json();
        
        if (result.success) {
          this.agreement = result.data;
        } else {
          this.error = result.message;
        }
      } catch (err) {
        this.error = 'Failed to fetch agreement. Please try again.';
        console.error('Error:', err);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

### Vanilla JavaScript Example

```javascript
class NicheAgreementApp {
  constructor() {
    this.apiBase = '/api/niche-agreements';
    this.init();
  }
  
  init() {
    const form = document.getElementById('agreement-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('application-number');
      this.fetchAgreement(input.value);
    });
  }
  
  async fetchAgreement(applicationNumber) {
    if (!applicationNumber) return;
    
    this.showLoading();
    this.clearError();
    
    try {
      const response = await fetch(`${this.apiBase}/${applicationNumber}`);
      const result = await response.json();
      
      if (result.success) {
        this.displayAgreement(result.data);
      } else {
        this.showError(result.message);
      }
    } catch (error) {
      this.showError('Failed to fetch agreement. Please try again.');
      console.error('Error:', error);
    } finally {
      this.hideLoading();
    }
  }
  
  displayAgreement(data) {
    const container = document.getElementById('agreement-container');
    container.innerHTML = this.renderAgreement(data);
  }
  
  renderAgreement(data) {
    return `
      <div class="agreement">
        <h2>Agreement Details</h2>
        <div class="section">
          <h3>Application</h3>
          <p><strong>Code:</strong> ${data.applicationCode}</p>
          <p><strong>Applied Date:</strong> ${data.appliedDate}</p>
          <p><strong>Agreement Date:</strong> ${data.agreementDate}</p>
        </div>
        
        <div class="section">
          <h3>Applicant</h3>
          <p><strong>Name:</strong> ${data.applicant.name}</p>
          <p><strong>NRIC:</strong> ${data.applicant.idNo || 'N/A'}</p>
          <p><strong>Address:</strong> ${data.applicant.address}</p>
          <p><strong>Mobile:</strong> ${data.applicant.mobileNo || 'N/A'}</p>
          <p><strong>Email:</strong> ${data.applicant.email || 'N/A'}</p>
        </div>
        
        ${this.renderNominees(data.nominee, data.nominee2)}
        ${this.renderBeneficiaries(data.beneficiaries)}
        ${this.renderNiche(data.niche)}
        ${this.renderPayment(data.invoice)}
        ${this.renderDeceased(data.deceased)}
        ${this.renderStorage(data.storage)}
      </div>
    `;
  }
  
  renderNominees(nominee1, nominee2) {
    let html = '<div class="section"><h3>Nominees</h3>';
    
    if (nominee1 && nominee1.name) {
      html += `
        <div class="nominee">
          <h4>Nominee 1</h4>
          <p><strong>Name:</strong> ${nominee1.name}</p>
          <p><strong>Relationship:</strong> ${nominee1.relationship || 'N/A'}</p>
          <p><strong>Mobile:</strong> ${nominee1.mobileNo || 'N/A'}</p>
        </div>
      `;
    }
    
    if (nominee2 && nominee2.name) {
      html += `
        <div class="nominee">
          <h4>Nominee 2</h4>
          <p><strong>Name:</strong> ${nominee2.name}</p>
          <p><strong>Relationship:</strong> ${nominee2.relationship || 'N/A'}</p>
          <p><strong>Mobile:</strong> ${nominee2.mobileNo || 'N/A'}</p>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }
  
  renderBeneficiaries(beneficiaries) {
    if (!beneficiaries || beneficiaries.length === 0) return '';
    
    let html = '<div class="section"><h3>Beneficiaries</h3>';
    beneficiaries.forEach((ben, index) => {
      html += `
        <div class="beneficiary">
          <h4>Beneficiary ${index + 1}</h4>
          <p><strong>Name:</strong> ${ben.name}</p>
          <p><strong>NRIC:</strong> ${ben.idNo || 'N/A'}</p>
          <p><strong>DOB:</strong> ${ben.dateOfBirth || 'N/A'}</p>
          <p><strong>Relationship:</strong> ${ben.relationshipToApplicant || 'N/A'}</p>
          <p><strong>Sex:</strong> ${ben.sex}</p>
          <p><strong>Catholic:</strong> ${ben.isCatholic ? 'Yes' : 'No'}</p>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }
  
  renderNiche(niche) {
    return `
      <div class="section">
        <h3>Niche Information</h3>
        <p><strong>Niche No:</strong> ${niche.number || 'N/A'}</p>
        <p><strong>Chapel:</strong> ${niche.chapelName || 'N/A'}</p>
        <p><strong>Total Amount:</strong> $${niche.totalAmount.toFixed(2)}</p>
      </div>
    `;
  }
  
  renderPayment(invoice) {
    if (!invoice || !invoice.invoiceNo) return '';
    
    return `
      <div class="section">
        <h3>Payment Information</h3>
        <p><strong>Invoice No:</strong> ${invoice.invoiceNo}</p>
        <p><strong>Invoice Date:</strong> ${invoice.invoiceDate || 'N/A'}</p>
        ${invoice.receiptNo ? `<p><strong>Receipt No:</strong> ${invoice.receiptNo}</p>` : ''}
        <p><strong>Amount:</strong> $${invoice.totalAmount.toFixed(2)}</p>
        <p><strong>GST:</strong> $${invoice.taxAmount.toFixed(2)}</p>
        <p><strong>Total:</strong> $${invoice.receiptAmount.toFixed(2)}</p>
      </div>
    `;
  }
  
  renderDeceased(deceased) {
    if (!deceased) return '';
    
    const dec1 = deceased.deceased1;
    const dec2 = deceased.deceased2;
    
    if (!dec1 || !dec1.name) return '';
    
    let html = '<div class="section"><h3>Deceased Information</h3>';
    
    if (dec1 && dec1.name) {
      html += `
        <div class="deceased">
          <h4>Deceased 1</h4>
          <p><strong>Name:</strong> ${dec1.name}</p>
          <p><strong>Date Died:</strong> ${dec1.dateDied || 'N/A'}</p>
          <p><strong>Internment Date:</strong> ${dec1.internmentDate || 'N/A'}</p>
        </div>
      `;
    }
    
    if (dec2 && dec2.name) {
      html += `
        <div class="deceased">
          <h4>Deceased 2</h4>
          <p><strong>Name:</strong> ${dec2.name}</p>
          <p><strong>Date Died:</strong> ${dec2.dateDied || 'N/A'}</p>
          <p><strong>Internment Date:</strong> ${dec2.internmentDate || 'N/A'}</p>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }
  
  renderStorage(storage) {
    if (!storage || !storage.storageFrom) return '';
    
    return `
      <div class="section">
        <h3>Storage Period</h3>
        <p><strong>From:</strong> ${storage.storageFrom}</p>
        <p><strong>To:</strong> ${storage.storageTo}</p>
      </div>
    `;
  }
  
  showLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'block';
  }
  
  hideLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'none';
  }
  
  showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }
  
  clearError() {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
    }
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  new NicheAgreementApp();
});
```

---

## PDF Generation

### Get PDF Data Endpoint

**Endpoint**: `GET /api/niche-agreements/:applicationNumber/pdf`

**Response Structure**:
```json
{
  "success": true,
  "message": "Agreement PDF data retrieved successfully",
  "data": {
    "type": "agreement",
    "documentTitle": "Niche Agreement",
    "applicationNumber": "3795-1",
    "generatedAt": "2025-08-25T10:30:00.000Z",
    "application": { ... },
    "applicant": { ... },
    "niche": { ... },
    "beneficiaries": [ ... ],
    "nominees": [ ... ],
    "deceased": { ... },
    "storage": { ... },
    "printReady": { ... },
    "metadata": { ... }
  }
}
```

### PDF Generation Example (using jsPDF)

```javascript
import jsPDF from 'jspdf';

async function generateAgreementPDF(applicationNumber) {
  // Fetch PDF data
  const response = await fetch(`/api/niche-agreements/${applicationNumber}/pdf`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  const data = result.data;
  
  // Create PDF
  const doc = new jsPDF();
  let yPosition = 20;
  
  // Header
  doc.setFontSize(18);
  doc.text('FRANCISCAN COLUMBARIUM AGREEMENT', 105, yPosition, { align: 'center' });
  yPosition += 15;
  
  // Application Info
  doc.setFontSize(12);
  doc.text(`Application Code: ${data.applicationNumber}`, 20, yPosition);
  yPosition += 7;
  doc.text(`Agreement Date: ${data.agreementDate}`, 20, yPosition);
  yPosition += 10;
  
  // Applicant Section
  doc.setFontSize(14);
  doc.text('Applicant Information', 20, yPosition);
  yPosition += 7;
  doc.setFontSize(10);
  doc.text(`Name: ${data.applicant.name}`, 20, yPosition);
  yPosition += 5;
  doc.text(`NRIC: ${data.applicant.idNo}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Address: ${data.applicant.address}`, 20, yPosition);
  yPosition += 10;
  
  // Beneficiaries
  if (data.beneficiaries && data.beneficiaries.length > 0) {
    doc.setFontSize(14);
    doc.text('Beneficiaries', 20, yPosition);
    yPosition += 7;
    doc.setFontSize(10);
    
    data.beneficiaries.forEach((ben, index) => {
      doc.text(`Beneficiary ${index + 1}: ${ben.name}`, 20, yPosition);
      yPosition += 5;
      doc.text(`NRIC: ${ben.idNo}`, 20, yPosition);
      yPosition += 5;
      doc.text(`DOB: ${ben.dateOfBirth}`, 20, yPosition);
      yPosition += 5;
      doc.text(`Relationship: ${ben.relationshipToApplicant}`, 20, yPosition);
      yPosition += 8;
    });
  }
  
  // Save PDF
  doc.save(`Agreement-${data.applicationNumber}.pdf`);
}
```

---

## Best Practices

### 1. Caching
```javascript
// Cache agreement data to avoid repeated API calls
const agreementCache = new Map();

async function getCachedAgreement(applicationNumber) {
  if (agreementCache.has(applicationNumber)) {
    return agreementCache.get(applicationNumber);
  }
  
  const agreement = await fetchAgreement(applicationNumber);
  agreementCache.set(applicationNumber, agreement);
  return agreement;
}
```

### 2. Loading States
Always show loading indicators during API calls:
```javascript
const [loading, setLoading] = useState(false);

// Show spinner or skeleton loader
{loading && <LoadingSpinner />}
```

### 3. Error Boundaries
Wrap components in error boundaries to handle unexpected errors gracefully.

### 4. Validation
Validate application number format before making API call:
```javascript
function isValidApplicationNumber(code) {
  // Format: "number-number" or "number"
  return /^\d+(-\d+)?$/.test(code);
}
```

### 5. Accessibility
- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation
- Provide alt text for images

---

## Testing Checklist

- [ ] Test with valid application number (e.g., "3795-1")
- [ ] Test with invalid application number
- [ ] Test with application number without dash (e.g., "3795")
- [ ] Test with application number ending in dash (e.g., "3795-")
- [ ] Test error handling (404, 400, 500)
- [ ] Test loading states
- [ ] Test date formatting
- [ ] Test with applications that have:
  - [ ] Both nominees
  - [ ] Deceased information
  - [ ] Storage period
  - [ ] Complete payment information
- [ ] Test PDF generation
- [ ] Test responsive design
- [ ] Test accessibility

---

## Support

For API issues or questions, refer to:
- API Documentation: `PROJECT_DOCUMENTATION.md`
- Implementation Summary: `NICHE_AGREEMENT_IMPLEMENTATION_SUMMARY.md`
- ASP.NET Analysis: `../ASP_NET_NICHE_AGREEMENT_DEEP_ANALYSIS.md`

---

**Document Version**: 1.0  
**Last Updated**: Based on Node.js implementation  
**API Version**: Compatible with current backend implementation

