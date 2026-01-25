# Inscription Items API Enhancement

## Overview
Enhanced the `/api/inscriptions/:code/items` endpoint to return comprehensive inscription request details along with items, including applicant information, deceased details, and additional inscription information.

## API Endpoint
```
GET /api/inscriptions/:code/items
```

## Enhanced Response Structure

### Before (Only Items)
```json
{
    "success": true,
    "message": "Inscription items retrieved successfully",
    "data": [
        {
            "ItemId": 12,
            "Name": "Niche Inscription 1st Name",
            "Code": "12",
            "Price": 400,
            "ChurchId": 1,
            "IsRefType": true,
            "DocType": "INCR"
        }
    ]
}
```

### After (Enhanced with Full Details)
```json
{
    "success": true,
    "message": "Inscription items retrieved successfully",
    "data": {
        "inscriptionRequestNo": "3795-1",
        "items": [
            {
                "ItemId": 12,
                "Name": "Niche Inscription 1st Name",
                "Code": "12",
                "Price": 400,
                "ChurchId": 1,
                "IsRefType": true,
                "DocType": "INCR"
            },
            {
                "ItemId": 10,
                "Name": "Urn (Marble)",
                "Code": "10",
                "Price": 150,
                "ChurchId": 1,
                "IsRefType": true,
                "DocType": "INCR"
            }
        ],
        "applicant": {
            "name": "John Doe",
            "nricPassportNo": "S1234567A",
            "address": {
                "block": "Blk 148",
                "blockNo": "148",
                "street": "Bishan Street 11",
                "streetName": "Bishan",
                "unitNo": "#07-111",
                "postalCode": "123456"
            },
            "mobile": "9123-4567",
            "homeTel": "1234-5678",
            "emailId": "example@email.com"
        },
        "deceasedDetails": [
            {
                "name": "Deceased Name",
                "dateOfDeath": "2024-01-01",
                "dateOfBirth": "1950-01-01",
                "internmentDate": "2024-01-15",
                "deathCertificateNo": "DC123456",
                "birthYear": "1950",
                "inscriptionText": "In loving memory"
            }
        ],
        "additionalDetails": {
            "bibleInscriptionChoiceId": 1,
            "bibleInscriptionText": "John 3:16",
            "additionalInscriptionPhrase": "Additional text",
            "remarks": "Remarks",
            "nicheApplicationCode": "NAPP-123",
            "nicheBookingId": 456
        }
    }
}
```

## Implementation Details

### 1. Service Layer Enhancement
**File**: `src/services/InscriptionInvoiceService.js`

**Changes**:
- Added `_parseAddress()` helper method to parse address components (Block, Block No., Street, Street Name, Unit No., Postal Code)
- Enhanced `getInscriptionItems()` to return full application details along with items
- Maintains backward compatibility by returning enhanced object structure

**Address Parsing Logic**:
- **Block/Block No.**: Extracted from `ApplicantAddressNo` (e.g., "Blk 123" → block: "Blk 123", blockNo: "123")
- **Street/Street Name**: Extracted from `ApplicantAddressLine1` (e.g., "Bishan Street 11" → street: "Bishan Street 11", streetName: "Bishan")
- **Unit No.**: Extracted from `ApplicantAddressLine2` (e.g., "#07-111" → unitNo: "#07-111")
- **Postal Code**: Extracted from `ApplicantAddressCity` (e.g., "Singapore 123456" → postalCode: "123456")

### 2. Repository Enhancement
**File**: `src/repositories/EngraveApplicationRepository.js`

**Changes**:
- Enhanced `getByCode()` query to include additional deceased fields:
  - `DateOfBirth`
  - `InternmentDate`
  - `DeathCertificateNo`
  - `BirthYear`
- Updated deceased details mapping to include all fields

### 3. Model Enhancement
**File**: `src/models/EngraveApplication.js`

**Changes**:
- Added `additionalInscriptionPhrase` field to `EngraveApplication` model
- Enhanced `EngraveApplicationDetail` to include:
  - `dateOfBirth`
  - `internmentDate`
  - `deathCertificateNo`
  - `birthYear`

### 4. Controller Update
**File**: `src/controllers/InscriptionInvoiceController.js`

**Changes**:
- Updated to handle enhanced response structure
- Maintains backward compatibility (checks if result is array for legacy support)

## Response Fields

### Inscription Request No.
- **Field**: `inscriptionRequestNo`
- **Type**: String
- **Description**: Auto-generated inscription request code (e.g., "3795-1")

### Items
- **Field**: `items`
- **Type**: Array
- **Description**: Array of inscription-related items (ItemId, Name, Code, Price, etc.)

### Applicant Details
- **Field**: `applicant`
- **Type**: Object
- **Fields**:
  - `name`: Applicant full name
  - `nricPassportNo`: NRIC/Passport number
  - `address`: Object with parsed address components
    - `block`: Block name (e.g., "Blk 148")
    - `blockNo`: Block number (e.g., "148")
    - `street`: Full street address (e.g., "Bishan Street 11")
    - `streetName`: Street name (e.g., "Bishan")
    - `unitNo`: Unit number (e.g., "#07-111")
    - `postalCode`: Postal code (e.g., "123456")
  - `mobile`: Mobile phone number
  - `homeTel`: Home telephone number (optional)
  - `emailId`: Email address

### Deceased Details
- **Field**: `deceasedDetails`
- **Type**: Array
- **Fields** (per deceased):
  - `name`: Name of deceased
  - `dateOfDeath`: Date of death
  - `dateOfBirth`: Date of birth
  - `internmentDate`: Internment date
  - `deathCertificateNo`: Death certificate number
  - `birthYear`: Birth year
  - `inscriptionText`: Inscription text/remarks

### Additional Details
- **Field**: `additionalDetails`
- **Type**: Object
- **Fields**:
  - `bibleInscriptionChoiceId`: Bible inscription choice ID
  - `bibleInscriptionText`: Bible inscription text
  - `additionalInscriptionPhrase`: Additional inscription phrase
  - `remarks`: General remarks
  - `nicheApplicationCode`: Related niche application code
  - `nicheBookingId`: Related niche booking ID

## Backward Compatibility

The implementation maintains backward compatibility:
- If the service returns an array (legacy format), it's returned as-is
- If the service returns an object (enhanced format), it's returned with full details
- Existing clients expecting only items array will continue to work

## Testing

### Test Request
```bash
GET http://localhost:3000/api/inscriptions/3795-1/items
Authorization: Bearer <token>
```

### Expected Response
- Status: 200 OK
- Response includes:
  - `inscriptionRequestNo`
  - `items` array
  - `applicant` object with parsed address
  - `deceasedDetails` array
  - `additionalDetails` object

## Files Modified

1. `src/services/InscriptionInvoiceService.js`
   - Added `_parseAddress()` method
   - Enhanced `getInscriptionItems()` to return full details

2. `src/repositories/EngraveApplicationRepository.js`
   - Enhanced query to include additional deceased fields
   - Updated deceased details mapping

3. `src/models/EngraveApplication.js`
   - Added `additionalInscriptionPhrase` field
   - Enhanced `EngraveApplicationDetail` with additional fields

4. `src/controllers/InscriptionInvoiceController.js`
   - Updated to handle enhanced response structure

## Notes

- All changes are backward compatible
- Address parsing handles various formats gracefully
- Empty/null values are returned as empty strings for consistency
- No breaking changes to existing functionality

