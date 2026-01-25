# Test Script for Receipt API - Receipt Code 53125
# This script tests the receipt API endpoint

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Receipt API - Code: 53125" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to get JWT Token
Write-Host "Step 1: Logging in to get JWT token..." -ForegroundColor Yellow

$loginBody = @{
    username = "col_admin"  # Replace with your actual username
    password = "your_password"  # Replace with your actual password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/login/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $loginBody `
        -ErrorAction Stop
    
    $token = $loginResponse.data.token
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Note: You need to provide valid credentials." -ForegroundColor Yellow
    Write-Host "Please update the username and password in this script." -ForegroundColor Yellow
    Write-Host ""
    exit
}

# Step 2: Test Receipt API
Write-Host "Step 2: Testing Receipt API with code 53125..." -ForegroundColor Yellow
Write-Host "URL: http://localhost:3000/api/receipts/53125/pdf?data=true" -ForegroundColor Gray
Write-Host ""

try {
    $receiptResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/receipts/53125/pdf?data=true" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        } `
        -ErrorAction Stop
    
    Write-Host "✓ API Request Successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "RESPONSE:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Pretty print the JSON response
    $receiptResponse | ConvertTo-Json -Depth 10 | Write-Host
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "RESPONSE SUMMARY:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($receiptResponse.success) {
        Write-Host "Status: SUCCESS" -ForegroundColor Green
        Write-Host ""
        
        if ($receiptResponse.data.receipt) {
            Write-Host "Receipt Information:" -ForegroundColor Yellow
            Write-Host "  - Receipt ID: $($receiptResponse.data.receipt.receiptId)" -ForegroundColor White
            Write-Host "  - Receipt Code: $($receiptResponse.data.receipt.code)" -ForegroundColor White
            Write-Host "  - Customer Name: $($receiptResponse.data.receipt.customerName)" -ForegroundColor White
            Write-Host "  - Total Amount: $($receiptResponse.data.receipt.totalAmount)" -ForegroundColor White
            Write-Host "  - Paying Amount: $($receiptResponse.data.receipt.payingAmount)" -ForegroundColor White
            Write-Host "  - Transaction Date: $($receiptResponse.data.receipt.transactionDate)" -ForegroundColor White
            Write-Host ""
        }
        
        if ($receiptResponse.data.invoice) {
            Write-Host "Invoice Information:" -ForegroundColor Yellow
            Write-Host "  - Invoice ID: $($receiptResponse.data.invoice.invoiceId)" -ForegroundColor White
            Write-Host "  - Invoice Code: $($receiptResponse.data.invoice.code)" -ForegroundColor White
            Write-Host "  - Invoice No: $($receiptResponse.data.invoice.invoiceNo)" -ForegroundColor White
            Write-Host "  - Customer Name: $($receiptResponse.data.invoice.customerName)" -ForegroundColor White
            Write-Host "  - Total Amount: $($receiptResponse.data.invoice.totalAmount)" -ForegroundColor White
            Write-Host "  - Tax Amount: $($receiptResponse.data.invoice.taxAmount)" -ForegroundColor White
            Write-Host "  - Invoice Details Count: $($receiptResponse.data.invoice.details.Count)" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host "Invoice Information: No invoice associated with this receipt" -ForegroundColor Yellow
            Write-Host ""
        }
        
        Write-Host "Receipt Details Count: $($receiptResponse.data.details.Count)" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "Status: FAILED" -ForegroundColor Red
        Write-Host "Error Code: $($receiptResponse.error.code)" -ForegroundColor Red
        Write-Host "Error Message: $($receiptResponse.error.message)" -ForegroundColor Red
        Write-Host ""
        
        if ($receiptResponse.diagnostic) {
            Write-Host "Diagnostic Information:" -ForegroundColor Yellow
            $receiptResponse.diagnostic | ConvertTo-Json -Depth 5 | Write-Host
        }
    }
    
} catch {
    Write-Host "✗ API Request Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    # Try to get error details
    if ($_.ErrorDetails.Message) {
        Write-Host "Error Details:" -ForegroundColor Yellow
        $_.ErrorDetails.Message | Write-Host
    }
    
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "  1. Receipt code 53125 does not exist in the database" -ForegroundColor White
    Write-Host "  2. Receipt exists but belongs to a different churchId" -ForegroundColor White
    Write-Host "  3. Server is not running on localhost:3000" -ForegroundColor White
    Write-Host "  4. Database connection issue" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

