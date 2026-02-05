# Run Beneficiary Nominee Relationships Schema Update
# This script adds the missing RelationshipToNominee1 and RelationshipToNominee2 columns

Write-Host "Starting database schema update for beneficiary nominee relationships..." -ForegroundColor Green

# Database connection parameters
$server = "localhost"
$database = "fms_db_new"
$username = "sa"
$password = "Admin@123"

# SQL script path
$sqlScriptPath = "scripts\add-beneficiary-nominee-relationships.sql"

# Check if SQL script exists
if (-not (Test-Path $sqlScriptPath)) {
    Write-Host "Error: SQL script not found at $sqlScriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Running SQL script: $sqlScriptPath" -ForegroundColor Yellow

# Execute the SQL script using sqlcmd
try {
    $result = sqlcmd -S $server -d $database -U $username -P $password -i $sqlScriptPath -o "migration-output.log"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Schema update completed successfully!" -ForegroundColor Green
        Write-Host "Check migration-output.log for details" -ForegroundColor Yellow
        
        # Display the output
        if (Test-Path "migration-output.log") {
            Get-Content "migration-output.log"
        }
    } else {
        Write-Host "Schema update failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        if (Test-Path "migration-output.log") {
            Write-Host "Error details:" -ForegroundColor Red
            Get-Content "migration-output.log"
        }
        exit 1
    }
} catch {
    Write-Host "Error executing SQL script: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure sqlcmd is installed and accessible in your PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host "Database migration completed!" -ForegroundColor Green