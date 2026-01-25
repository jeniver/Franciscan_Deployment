# Wake Room API Documentation

Complete API documentation for Wake Room management endpoints with request/response examples for frontend integration.

## Base URL
```
/api/wake-rooms
/api/wake-room-bookings
```

## Authentication
All endpoints require authentication token in the header:
```
Authorization: Bearer <token>
```

---

## Table of Contents
1. [Wake Room Endpoints](#wake-room-endpoints)
2. [Availability Checking](#availability-checking)
3. [Booking Management](#booking-management)
4. [Search & Reports](#search--reports)

---

## Wake Room Endpoints

### 1. Get All Wake Rooms
Get all wake rooms for a church.

**Endpoint:** `GET /api/wake-rooms?church={churchId}`

**Query Parameters:**
- `church` (optional) - Church ID. If not provided, uses authenticated user's church.

**Request:**
```http
GET /api/wake-rooms?church=1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "wakeRoomId": 1,
      "code": "WR1",
      "name": "Wake Room 1",
      "remarks": "Main wake room",
      "openingTime": "2024-01-01T08:00:00.000Z",
      "clossingTime": "2024-01-01T20:00:00.000Z",
      "rentingAmount": 500.00,
      "churchId": 1
    },
    {
      "wakeRoomId": 2,
      "code": "WR2",
      "name": "Wake Room 2",
      "remarks": "Secondary wake room",
      "openingTime": "2024-01-01T08:00:00.000Z",
      "clossingTime": "2024-01-01T20:00:00.000Z",
      "rentingAmount": 400.00,
      "churchId": 1
    }
  ],
  "message": "Wake rooms retrieved successfully"
}
```

---

### 2. Get Wake Room by ID
Get a specific wake room by its ID.

**Endpoint:** `GET /api/wake-rooms/:id`

**Path Parameters:**
- `id` (required) - Wake Room ID

**Request:**
```http
GET /api/wake-rooms/1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "wakeRoomId": 1,
    "code": "WR1",
    "name": "Wake Room 1",
    "remarks": "Main wake room",
    "openingTime": "2024-01-01T08:00:00.000Z",
    "clossingTime": "2024-01-01T20:00:00.000Z",
    "rentingAmount": 500.00,
    "churchId": 1
  },
  "message": "Wake room retrieved successfully"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Wake room not found: 1"
  }
}
```

---

### 3. Get Wake Rooms by Church
Get all wake rooms for a specific church.

**Endpoint:** `GET /api/wake-rooms/church/:churchId`

**Path Parameters:**
- `churchId` (required) - Church ID

**Request:**
```http
GET /api/wake-rooms/church/1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "wakeRoomId": 1,
      "code": "WR1",
      "name": "Wake Room 1",
      "remarks": "Main wake room",
      "openingTime": "2024-01-01T08:00:00.000Z",
      "clossingTime": "2024-01-01T20:00:00.000Z",
      "rentingAmount": 500.00,
      "churchId": 1
    }
  ],
  "message": "Wake rooms retrieved successfully"
}
```

---

## Availability Checking

### 4. Check Availability (Single Time Slot)
Check if a wake room is available for a specific time slot.

**Endpoint:** `POST /api/wake-rooms/check-availability`

**Request Body:**
```json
{
  "wakeRoomId": 1,
  "fromTime": "2024-12-01T10:00:00.000Z",
  "toTime": "2024-12-01T14:00:00.000Z"
}
```

**Request:**
```http
POST /api/wake-rooms/check-availability
Authorization: Bearer <token>
Content-Type: application/json

{
  "wakeRoomId": 1,
  "fromTime": "2024-12-01T10:00:00.000Z",
  "toTime": "2024-12-01T14:00:00.000Z"
}
```

**Response (200 OK) - Available:**
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "conflicts": [],
    "message": "Wake room is available for the requested time"
  },
  "message": "Availability checked successfully"
}
```

**Response (200 OK) - Not Available:**
```json
{
  "success": true,
  "data": {
    "isAvailable": false,
    "conflicts": [
      {
        "wakeRoomBookingId": 5,
        "wakeRoomId": 1,
        "code": "WR1-0",
        "applicant": {
          "name": "John Doe",
          "idNo": "S1234567A",
          "email": "john@example.com",
          "mobileNo": "91234567",
          "address": "123 Main St, Singapore"
        },
        "booking": {
          "purpose": "Funeral",
          "nameOfDeceased": "Jane Doe",
          "usingDate": "2024-12-01T00:00:00.000Z",
          "usingTimeFrom": "2024-12-01T09:00:00.000Z",
          "usingTimeTo": "2024-12-01T15:00:00.000Z"
        }
      }
    ],
    "message": "Wake room has 1 conflicting booking(s)"
  },
  "message": "Availability checked successfully"
}
```

---

### 5. Check Availability by Date Range
Check wake room availability for a date range with daily breakdown.

**Endpoint:** `POST /api/wake-rooms/check-availability-range`

**Request Body:**
```json
{
  "wakeRoomId": 1,
  "fromDate": "2024-12-01T00:00:00.000Z",
  "toDate": "2024-12-05T23:59:59.000Z"
}
```

**Request:**
```http
POST /api/wake-rooms/check-availability-range
Authorization: Bearer <token>
Content-Type: application/json

{
  "wakeRoomId": 1,
  "fromDate": "2024-12-01T00:00:00.000Z",
  "toDate": "2024-12-05T23:59:59.000Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isAvailable": false,
    "fromDate": "2024-12-01",
    "toDate": "2024-12-05",
    "dailyAvailability": [
      {
        "date": "2024-12-01",
        "isAvailable": false,
        "conflictCount": 1,
        "conflicts": [
          {
            "wakeRoomBookingId": 5,
            "code": "WR1-0",
            "booking": {
              "usingTimeFrom": "2024-12-01T09:00:00.000Z",
              "usingTimeTo": "2024-12-01T15:00:00.000Z"
            }
          }
        ]
      },
      {
        "date": "2024-12-02",
        "isAvailable": true,
        "conflictCount": 0,
        "conflicts": []
      },
      {
        "date": "2024-12-03",
        "isAvailable": true,
        "conflictCount": 0,
        "conflicts": []
      },
      {
        "date": "2024-12-04",
        "isAvailable": false,
        "conflictCount": 2,
        "conflicts": [
          {
            "wakeRoomBookingId": 6,
            "code": "WR1-1",
            "booking": {
              "usingTimeFrom": "2024-12-04T10:00:00.000Z",
              "usingTimeTo": "2024-12-04T16:00:00.000Z"
            }
          },
          {
            "wakeRoomBookingId": 7,
            "code": "WR1-2",
            "booking": {
              "usingTimeFrom": "2024-12-04T18:00:00.000Z",
              "usingTimeTo": "2024-12-04T22:00:00.000Z"
            }
          }
        ]
      },
      {
        "date": "2024-12-05",
        "isAvailable": true,
        "conflictCount": 0,
        "conflicts": []
      }
    ],
    "totalConflicts": 3,
    "message": "Wake room has conflicts on 2 day(s)"
  },
  "message": "Availability checked successfully"
}
```

---

### 6. Check Availability for Multiple Dates (Calendar View)
Get availability status for multiple specific dates. Perfect for calendar UI.

**Endpoint:** `POST /api/wake-rooms/check-availability-dates`

**Request Body:**
```json
{
  "wakeRoomId": 1,
  "dates": [
    "2024-12-01T00:00:00.000Z",
    "2024-12-02T00:00:00.000Z",
    "2024-12-03T00:00:00.000Z",
    "2024-12-04T00:00:00.000Z",
    "2024-12-05T00:00:00.000Z"
  ]
}
```

**Request:**
```http
POST /api/wake-rooms/check-availability-dates
Authorization: Bearer <token>
Content-Type: application/json

{
  "wakeRoomId": 1,
  "dates": [
    "2024-12-01T00:00:00.000Z",
    "2024-12-02T00:00:00.000Z",
    "2024-12-03T00:00:00.000Z"
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "wakeRoomId": 1,
    "availability": [
      {
        "date": "2024-12-01",
        "isAvailable": false,
        "bookingCount": 1,
        "bookings": [
          {
            "wakeRoomBookingId": 5,
            "code": "WR1-0",
            "booking": {
              "usingTimeFrom": "2024-12-01T09:00:00.000Z",
              "usingTimeTo": "2024-12-01T15:00:00.000Z"
            }
          }
        ]
      },
      {
        "date": "2024-12-02",
        "isAvailable": true,
        "bookingCount": 0,
        "bookings": []
      },
      {
        "date": "2024-12-03",
        "isAvailable": true,
        "bookingCount": 0,
        "bookings": []
      }
    ],
    "totalDates": 3,
    "availableDates": 2,
    "bookedDates": 1
  },
  "message": "Availability retrieved successfully"
}
```

---

## Booking Management

### 7. Get Bookings for a Specific Date
Get all bookings for a wake room on a specific date.

**Endpoint:** `GET /api/wake-rooms/:id/bookings?date=YYYY-MM-DD`

**Path Parameters:**
- `id` (required) - Wake Room ID

**Query Parameters:**
- `date` (required) - Date in YYYY-MM-DD format

**Request:**
```http
GET /api/wake-rooms/1/bookings?date=2024-12-01
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "wakeRoomBookingId": 5,
      "wakeRoomId": 1,
      "code": "WR1-0",
      "applicant": {
        "name": "John Doe",
        "idNo": "S1234567A",
        "email": "john@example.com",
        "mobileNo": "91234567",
        "homeTelNo": "62345678",
        "officeTelNo": "67890123",
        "address": "123 Main St, Singapore 123456",
        "addressDetails": {
          "no": "123",
          "line1": "Main St",
          "line2": "",
          "city": "Singapore",
          "state": "",
          "country": "Singapore"
        }
      },
      "booking": {
        "purpose": "Funeral",
        "nameOfDeceased": "Jane Doe",
        "usingDate": "2024-12-01T00:00:00.000Z",
        "massTime": "2024-12-01T10:00:00.000Z",
        "usingTimeFrom": "2024-12-01T09:00:00.000Z",
        "usingTimeTo": "2024-12-01T15:00:00.000Z",
        "noOfDays": 1,
        "remarks": "Special requirements"
      },
      "financial": {
        "donationAmount": 500.00,
        "defaultDonationAmount": 500.00
      },
      "service": {
        "serviceby": "Church",
        "casketCompany": "ABC Funeral",
        "hallNo": "Hall 1",
        "timeOfCremation": "14:00"
      },
      "status": 0,
      "refDocType": "WAPP",
      "churchId": 1,
      "userId": 1
    }
  ],
  "message": "Found 1 booking(s) for the specified date"
}
```

---

### 8. Get Bookings by Date Range
Get all bookings for a wake room within a date range.

**Endpoint:** `GET /api/wake-rooms/:id/bookings-range?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`

**Path Parameters:**
- `id` (required) - Wake Room ID

**Query Parameters:**
- `fromDate` (required) - Start date in YYYY-MM-DD format
- `toDate` (required) - End date in YYYY-MM-DD format

**Request:**
```http
GET /api/wake-rooms/1/bookings-range?fromDate=2024-12-01&toDate=2024-12-05
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "wakeRoomBookingId": 5,
      "wakeRoomId": 1,
      "code": "WR1-0",
      "applicant": {
        "name": "John Doe",
        "idNo": "S1234567A",
        "email": "john@example.com",
        "mobileNo": "91234567",
        "address": "123 Main St, Singapore"
      },
      "booking": {
        "purpose": "Funeral",
        "nameOfDeceased": "Jane Doe",
        "usingDate": "2024-12-01T00:00:00.000Z",
        "usingTimeFrom": "2024-12-01T09:00:00.000Z",
        "usingTimeTo": "2024-12-01T15:00:00.000Z",
        "noOfDays": 1
      },
      "status": 0,
      "churchId": 1
    },
    {
      "wakeRoomBookingId": 6,
      "wakeRoomId": 1,
      "code": "WR1-1",
      "applicant": {
        "name": "Mary Smith",
        "idNo": "S7654321B",
        "email": "mary@example.com",
        "mobileNo": "98765432",
        "address": "456 Oak Ave, Singapore"
      },
      "booking": {
        "purpose": "Funeral",
        "nameOfDeceased": "Robert Smith",
        "usingDate": "2024-12-04T00:00:00.000Z",
        "usingTimeFrom": "2024-12-04T10:00:00.000Z",
        "usingTimeTo": "2024-12-04T16:00:00.000Z",
        "noOfDays": 1
      },
      "status": 0,
      "churchId": 1
    }
  ],
  "message": "Found 2 booking(s) in date range"
}
```

---

### 9. Get Wake Room Booking by Code
Get a specific booking by its code.

**Endpoint:** `GET /api/wake-room-bookings/:code?churchId={churchId}`

**Path Parameters:**
- `code` (required) - Booking code (e.g., "WR1-0")

**Query Parameters:**
- `churchId` (required) - Church ID

**Request:**
```http
GET /api/wake-room-bookings/WR1-0?churchId=1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "wakeRoomBookingId": 5,
    "wakeRoomId": 1,
    "code": "WR1-0",
    "applicant": {
      "name": "John Doe",
      "idNo": "S1234567A",
      "email": "john@example.com",
      "mobileNo": "91234567",
      "homeTelNo": "62345678",
      "officeTelNo": "67890123",
      "address": "123 Main St, Singapore 123456",
      "addressDetails": {
        "no": "123",
        "line1": "Main St",
        "line2": "",
        "city": "Singapore",
        "state": "",
        "country": "Singapore"
      }
    },
    "booking": {
      "purpose": "Funeral",
      "nameOfDeceased": "Jane Doe",
      "usingDate": "2024-12-01T00:00:00.000Z",
      "massTime": "2024-12-01T10:00:00.000Z",
      "usingTimeFrom": "2024-12-01T09:00:00.000Z",
      "usingTimeTo": "2024-12-01T15:00:00.000Z",
      "noOfDays": 1,
      "remarks": "Special requirements"
    },
    "financial": {
      "donationAmount": 500.00,
      "defaultDonationAmount": 500.00
    },
    "service": {
      "serviceby": "Church",
      "casketCompany": "ABC Funeral",
      "hallNo": "Hall 1",
      "timeOfCremation": "14:00"
    },
    "status": 0,
    "refDocType": "WAPP",
    "churchId": 1,
    "userId": 1,
    "wakeRoom": {
      "wakeRoomId": 1,
      "code": "WR1",
      "name": "Wake Room 1",
      "openingTime": "2024-01-01T08:00:00.000Z",
      "clossingTime": "2024-01-01T20:00:00.000Z",
      "rentingAmount": 500.00,
      "churchId": 1
    }
  },
  "message": "Wake room booking retrieved successfully"
}
```

---

### 10. Create Wake Room Booking
Create a new wake room booking.

**Endpoint:** `POST /api/wake-room-bookings`

**Request Body:**
```json
{
  "wakeRoomId": 1,
  "applicantName": "John Doe",
  "applicantIDNo": "S1234567A",
  "applicantEmailID": "john@example.com",
  "applicantMobileNo": "91234567",
  "applicantHomeTelNo": "62345678",
  "applicantOfficeTelNo": "67890123",
  "applicantAddressNo": "123",
  "applicantAddressLine1": "Main St",
  "applicantAddressLine2": "",
  "applicantAddressCity": "Singapore",
  "applicantAddressState": "",
  "applicantAddressCountry": "Singapore",
  "purpose": "Funeral",
  "nameOfDeceased": "Jane Doe",
  "usingDate": "2024-12-01T00:00:00.000Z",
  "massTime": "2024-12-01T10:00:00.000Z",
  "usingTimeFrom": "2024-12-01T09:00:00.000Z",
  "usingTimeTo": "2024-12-01T15:00:00.000Z",
  "noOfDays": 1,
  "remarks": "Special requirements",
  "donationAmount": 500.00,
  "defaultDonationAmount": 500.00,
  "serviceby": "Church",
  "casketCompany": "ABC Funeral",
  "hallNo": "Hall 1",
  "timeOfCremation": "14:00",
  "churchId": 1
}
```

**Request:**
```http
POST /api/wake-room-bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "wakeRoomId": 1,
  "applicantName": "John Doe",
  "applicantIDNo": "S1234567A",
  "applicantEmailID": "john@example.com",
  "applicantMobileNo": "91234567",
  "applicantAddressNo": "123",
  "applicantAddressLine1": "Main St",
  "applicantAddressCity": "Singapore",
  "applicantAddressCountry": "Singapore",
  "purpose": "Funeral",
  "nameOfDeceased": "Jane Doe",
  "usingDate": "2024-12-01T00:00:00.000Z",
  "usingTimeFrom": "2024-12-01T09:00:00.000Z",
  "usingTimeTo": "2024-12-01T15:00:00.000Z",
  "noOfDays": 1,
  "donationAmount": 500.00,
  "churchId": 1
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "code": "WR1-0",
    "bookingId": 5
  },
  "message": "Wake room booking created successfully"
}
```

**Response (200 OK) - Duplicate Detected:**
```json
{
  "success": true,
  "data": {
    "isDuplicate": true,
    "existingCode": "WR1-0",
    "message": "Duplicate booking found: WR1-0"
  },
  "message": "Duplicate booking detected"
}
```

**Response (400 Bad Request) - Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed: Applicant name is required, Using time from is required"
  }
}
```

---

### 11. Update Wake Room Booking
Update an existing wake room booking.

**Endpoint:** `PUT /api/wake-room-bookings/:id`

**Path Parameters:**
- `id` (required) - Booking ID

**Request Body:** (Same as create, but include `wakeRoomBookingId`)

**Request:**
```http
PUT /api/wake-room-bookings/5
Authorization: Bearer <token>
Content-Type: application/json

{
  "wakeRoomId": 1,
  "applicantName": "John Doe Updated",
  "applicantIDNo": "S1234567A",
  "nameOfDeceased": "Jane Doe",
  "usingTimeFrom": "2024-12-01T10:00:00.000Z",
  "usingTimeTo": "2024-12-01T16:00:00.000Z",
  "donationAmount": 600.00,
  "churchId": 1
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "code": "WR1-0",
    "bookingId": 5
  },
  "message": "Wake room booking updated successfully"
}
```

---

### 12. Delete Wake Room Booking
Soft delete a wake room booking (sets status to -1).

**Endpoint:** `DELETE /api/wake-room-bookings/:id`

**Path Parameters:**
- `id` (required) - Booking ID

**Request:**
```http
DELETE /api/wake-room-bookings/5
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "Wake room booking deleted successfully"
}
```

---

## Search & Reports

### 13. Search Wake Room Bookings
Search for bookings with various filters.

**Endpoint:** `POST /api/wake-room-bookings/search`

**Request Body:**
```json
{
  "churchId": 1,
  "code": "WR1",
  "applicantName": "John",
  "nameOfDeceased": "Jane",
  "usingDate": "2024-12-01T00:00:00.000Z",
  "wakeRoomId": 1
}
```

**Request:**
```http
POST /api/wake-room-bookings/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "churchId": 1,
  "applicantName": "John",
  "wakeRoomId": 1
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "wakeRoomBookingId": 5,
      "wakeRoomId": 1,
      "code": "WR1-0",
      "applicant": {
        "name": "John Doe",
        "idNo": "S1234567A",
        "email": "john@example.com",
        "mobileNo": "91234567",
        "address": "123 Main St, Singapore"
      },
      "booking": {
        "purpose": "Funeral",
        "nameOfDeceased": "Jane Doe",
        "usingDate": "2024-12-01T00:00:00.000Z",
        "usingTimeFrom": "2024-12-01T09:00:00.000Z",
        "usingTimeTo": "2024-12-01T15:00:00.000Z"
      },
      "status": 0,
      "churchId": 1,
      "wakeRoom": {
        "code": "WR1",
        "name": "Wake Room 1"
      }
    }
  ],
  "message": "Found 1 booking(s)"
}
```

**Response (200 OK) - No Results:**
```json
{
  "success": true,
  "data": [],
  "message": "No bookings found matching the criteria"
}
```

---

### 14. Get Last Booking Number
Get the last booking number for a church (for code generation).

**Endpoint:** `GET /api/wake-room-bookings/last-number/:churchId`

**Path Parameters:**
- `churchId` (required) - Church ID

**Request:**
```http
GET /api/wake-room-bookings/last-number/1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "lastNumber": "WR1-5"
  },
  "message": "Last booking number retrieved successfully"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Wake Room ID, from time, and to time are required"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "User authentication required"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Wake room booking not found: WR1-999"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to retrieve wake rooms"
  }
}
```

---

## Frontend Integration Examples

### JavaScript/TypeScript Example

```typescript
// Check availability for date range
async function checkAvailability(wakeRoomId: number, fromDate: Date, toDate: Date) {
  const response = await fetch('/api/wake-rooms/check-availability-range', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      wakeRoomId,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString()
    })
  });
  
  const result = await response.json();
  return result.data;
}

// Get calendar availability
async function getCalendarAvailability(wakeRoomId: number, dates: Date[]) {
  const response = await fetch('/api/wake-rooms/check-availability-dates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      wakeRoomId,
      dates: dates.map(d => d.toISOString())
    })
  });
  
  const result = await response.json();
  return result.data.availability;
}

// Create booking
async function createBooking(bookingData: any) {
  const response = await fetch('/api/wake-room-bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(bookingData)
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}
```

### React Example

```jsx
import { useState, useEffect } from 'react';

function WakeRoomCalendar({ wakeRoomId }) {
  const [availability, setAvailability] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);

  useEffect(() => {
    loadAvailability();
  }, [wakeRoomId, selectedDates]);

  const loadAvailability = async () => {
    if (selectedDates.length === 0) return;
    
    const response = await fetch('/api/wake-rooms/check-availability-dates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        wakeRoomId,
        dates: selectedDates.map(d => d.toISOString())
      })
    });
    
    const result = await response.json();
    if (result.success) {
      setAvailability(result.data.availability);
    }
  };

  return (
    <div>
      {availability.map(day => (
        <div key={day.date} className={day.isAvailable ? 'available' : 'booked'}>
          <span>{day.date}</span>
          <span>{day.isAvailable ? 'Available' : `${day.bookingCount} booking(s)`}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Notes

1. **Date Format**: All dates should be in ISO 8601 format (e.g., `2024-12-01T00:00:00.000Z`)
2. **Status Values**: 
   - `0` = Active/New
   - `-1` = Deleted (soft delete)
   - Other positive values may indicate different statuses
3. **Multi-day Bookings**: The API properly handles bookings that span multiple days
4. **Deleted Bookings**: All queries automatically exclude deleted bookings (Status = -1)
5. **Duplicate Detection**: The system automatically detects duplicate bookings based on name, time, and applicant
6. **Code Generation**: Booking codes are auto-generated in format: `{WakeRoomCode}-{BookingCount}` (e.g., WR1-0, WR1-1)

---

## Changelog

### Version 1.1.0 (Latest)
- ✅ Added availability check by date range
- ✅ Added calendar view availability (multiple dates)
- ✅ Added get bookings by date range endpoint
- ✅ Improved multi-day booking handling
- ✅ Added status filtering to exclude deleted bookings

### Version 1.0.0
- Initial release with basic CRUD operations
- Single time slot availability checking
- Search functionality

