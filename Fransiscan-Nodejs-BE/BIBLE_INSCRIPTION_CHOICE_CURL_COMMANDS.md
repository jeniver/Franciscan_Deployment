# Bible Inscription Choice API - cURL Commands

## Overview
This document provides comprehensive cURL commands for testing the Bible Inscription Choice API endpoints.

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints require JWT authentication. You need to:
1. First login to get a JWT token
2. Use the token in the `Authorization` header for all requests

---

## Step 1: Get Authentication Token

### Login to Get JWT Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

**Response Example**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": 1,
    "churchId": 1,
    "username": "your_username"
  }
}
```

**Save the token**:
```bash
# Linux/Mac
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Windows PowerShell
$env:TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Endpoint 1: GET /api/bible-choices

### Description
Get all Bible inscription choices for the authenticated user's church.

### Basic Request
```bash
curl -X GET http://localhost:3000/api/bible-choices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### With Token Directly (Linux/Mac)
```bash
curl -X GET http://localhost:3000/api/bible-choices \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### With Token Directly (Windows PowerShell)
```powershell
curl.exe -X GET http://localhost:3000/api/bible-choices `
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." `
  -H "Content-Type: application/json"
```

### Pretty Print Response (with jq)
```bash
curl -X GET http://localhost:3000/api/bible-choices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

### Verbose Output (for debugging)
```bash
curl -v -X GET http://localhost:3000/api/bible-choices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Expected Success Response (200 OK)
```json
{
  "success": true,
  "message": "Bible choices retrieved successfully",
  "data": [
    {
      "bibleInscriptionChoiceId": 1,
      "bibleInscriptionChoiceNo": "No1-Psalm 4:8",
      "bibleInscriptionChoiceNoValue": "I will lie down & sleep in peace, for you alone, O Lord, make me dwell in safety",
      "churchId": 1
    },
    {
      "bibleInscriptionChoiceId": 2,
      "bibleInscriptionChoiceNo": "No2-Psalm 23:1",
      "bibleInscriptionChoiceNoValue": "The Lord is my Shepherd, there is nothing I shall want",
      "churchId": 1
    },
    {
      "bibleInscriptionChoiceId": 3,
      "bibleInscriptionChoiceNo": "No3-Psalm 23",
      "bibleInscriptionChoiceNoValue": "In the Lord's own house shall I dwell for ever and ever",
      "churchId": 1
    }
  ],
  "count": 3
}
```

### Expected Empty Response (200 OK - No data)
```json
{
  "success": true,
  "message": "Bible choices retrieved successfully",
  "data": [],
  "count": 0
}
```

### Error Cases

#### Missing Authentication (401 Unauthorized)
```bash
curl -X GET http://localhost:3000/api/bible-choices \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": false,
  "error": "Authentication token is required"
}
```

#### Invalid Token (401 Unauthorized)
```bash
curl -X GET http://localhost:3000/api/bible-choices \
  -H "Authorization: Bearer invalid_token_here" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

#### User Without ChurchId (400 Bad Request)
```bash
curl -X GET http://localhost:3000/api/bible-choices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": false,
  "message": "ChurchId is required. Please ensure you are authenticated.",
  "error": "ChurchId is required. Please ensure you are authenticated."
}
```

---

## Endpoint 2: GET /api/bible-choices/:choiceId

### Description
Get a specific Bible inscription choice by ID.

### Basic Request (choiceId = 1)
```bash
curl -X GET http://localhost:3000/api/bible-choices/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Request with Different ID (choiceId = 2)
```bash
curl -X GET http://localhost:3000/api/bible-choices/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Pretty Print Response (with jq)
```bash
curl -X GET http://localhost:3000/api/bible-choices/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

### Verbose Output (for debugging)
```bash
curl -v -X GET http://localhost:3000/api/bible-choices/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Expected Success Response (200 OK)
```json
{
  "success": true,
  "message": "Bible choice retrieved successfully",
  "data": {
    "bibleInscriptionChoiceId": 1,
    "bibleInscriptionChoiceNo": "No1-Psalm 4:8",
    "bibleInscriptionChoiceNoValue": "I will lie down & sleep in peace, for you alone, O Lord, make me dwell in safety",
    "churchId": 1
  }
}
```

### Error Cases

#### Invalid ChoiceId (400 Bad Request - Not a Number)
```bash
curl -X GET http://localhost:3000/api/bible-choices/abc \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": false,
  "message": "Invalid ChoiceId. Must be a number.",
  "error": "Invalid ChoiceId. Must be a number."
}
```

#### Choice Not Found (404 Not Found)
```bash
curl -X GET http://localhost:3000/api/bible-choices/99999 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "BIBLE_CHOICE_NOT_FOUND",
    "message": "Bible choice not found or does not belong to this church"
  }
}
```

#### Missing Authentication (401 Unauthorized)
```bash
curl -X GET http://localhost:3000/api/bible-choices/1 \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": false,
  "error": "Authentication token is required"
}
```

#### Accessing Choice from Different Church (404 Not Found)
If you try to access a Bible choice that belongs to a different church, you'll get a 404:
```bash
curl -X GET http://localhost:3000/api/bible-choices/5 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "BIBLE_CHOICE_NOT_FOUND",
    "message": "Bible choice not found or does not belong to this church"
  }
}
```

---

## Complete Test Script

### Linux/Mac Bash Script
```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000"
USERNAME="your_username"
PASSWORD="your_password"

echo "=== Step 1: Login ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USERNAME\",
    \"password\": \"$PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq

# Extract token (requires jq)
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get token"
  exit 1
fi

echo ""
echo "Token: $TOKEN"
echo ""

echo "=== Step 2: Get All Bible Choices ==="
curl -s -X GET "$BASE_URL/api/bible-choices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq

echo ""
echo "=== Step 3: Get Bible Choice by ID (1) ==="
curl -s -X GET "$BASE_URL/api/bible-choices/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq

echo ""
echo "=== Step 4: Get Bible Choice by ID (2) ==="
curl -s -X GET "$BASE_URL/api/bible-choices/2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq

echo ""
echo "=== Step 5: Test Invalid ChoiceId ==="
curl -s -X GET "$BASE_URL/api/bible-choices/abc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq

echo ""
echo "=== Step 6: Test Non-existent ChoiceId ==="
curl -s -X GET "$BASE_URL/api/bible-choices/99999" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq

echo ""
echo "=== Step 7: Test Missing Authentication ==="
curl -s -X GET "$BASE_URL/api/bible-choices" \
  -H "Content-Type: application/json" | jq
```

### Windows PowerShell Script
```powershell
# Configuration
$baseUrl = "http://localhost:3000"
$username = "your_username"
$password = "your_password"

Write-Host "=== Step 1: Login ==="
$loginBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody

$loginResponse | ConvertTo-Json -Depth 10

$token = $loginResponse.token

if (-not $token) {
    Write-Host "ERROR: Failed to get token"
    exit 1
}

Write-Host ""
Write-Host "Token: $token"
Write-Host ""

Write-Host "=== Step 2: Get All Bible Choices ==="
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}
$response = Invoke-RestMethod -Uri "$baseUrl/api/bible-choices" `
    -Method GET `
    -Headers $headers
$response | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "=== Step 3: Get Bible Choice by ID (1) ==="
$response = Invoke-RestMethod -Uri "$baseUrl/api/bible-choices/1" `
    -Method GET `
    -Headers $headers
$response | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "=== Step 4: Get Bible Choice by ID (2) ==="
$response = Invoke-RestMethod -Uri "$baseUrl/api/bible-choices/2" `
    -Method GET `
    -Headers $headers
$response | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "=== Step 5: Test Invalid ChoiceId ==="
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/bible-choices/abc" `
        -Method GET `
        -Headers $headers
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_"
}

Write-Host ""
Write-Host "=== Step 6: Test Non-existent ChoiceId ==="
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/bible-choices/99999" `
        -Method GET `
        -Headers $headers
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_"
}
```

---

## Quick Reference

### All Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/bible-choices` | Get all Bible choices for church | Yes |
| GET | `/api/bible-choices/:choiceId` | Get Bible choice by ID | Yes |

### Response Status Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad Request (invalid input, missing ChurchId) |
| 401 | Unauthorized (missing/invalid token) |
| 404 | Not Found (choice doesn't exist or belongs to different church) |
| 500 | Internal Server Error |

### Common Headers

```bash
-H "Authorization: Bearer YOUR_TOKEN_HERE"
-H "Content-Type: application/json"
```

---

## Testing Checklist

- [ ] Login and get JWT token
- [ ] Get all Bible choices (should return array)
- [ ] Get Bible choice by valid ID (should return single object)
- [ ] Test with invalid ChoiceId (should return 400)
- [ ] Test with non-existent ChoiceId (should return 404)
- [ ] Test without authentication (should return 401)
- [ ] Test with invalid token (should return 401)
- [ ] Verify church isolation (choices from different church return 404)

---

## Notes

1. **Church Isolation**: Users can only see Bible choices from their own church (ChurchId)
2. **Authentication**: All endpoints require valid JWT token
3. **Ordering**: Results are ordered by `BibleInscriptionChoiceNo` ASC
4. **Case Sensitivity**: ChoiceId is case-sensitive in URL
5. **Data Format**: All responses follow the standard `{success, message, data}` format

---

## Troubleshooting

### Issue: "Authentication token is required"
**Solution**: Make sure you're including the `Authorization: Bearer TOKEN` header

### Issue: "Invalid or expired token"
**Solution**: Login again to get a fresh token

### Issue: "ChurchId is required"
**Solution**: Make sure your user account has a valid ChurchId assigned

### Issue: Empty array returned
**Solution**: Check if there are Bible choices in the database for your church. You may need to seed data first.

### Issue: Connection refused
**Solution**: Make sure the server is running on `http://localhost:3000`

---

**Last Updated**: 2025-01-25  
**API Version**: 1.0.0

