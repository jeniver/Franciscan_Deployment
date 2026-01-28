# Database Setup Guide

## Quick Reference

### Test Database Connection
```bash
npm run test-db
```

### Diagnose Database Issues
```bash
npm run diagnose-db
```

## Configuration

Your `.env` file should have:
```env
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=FransiscanTest
DB_USER=franciscan_api
DB_PASSWORD=Franciscan@2024!
```

## Essential Scripts

### SQL Scripts (Run in SSMS)
- `scripts/create-sql-user.sql` - Create SQL Server user
- `scripts/fix-user-permissions.sql` - Fix user permissions
- `scripts/enable-mixed-mode-auth.sql` - Enable Mixed Mode Authentication
- `scripts/grant-windows-user-access.sql` - Grant Windows user access

### PowerShell Scripts
- `scripts/grant-windows-access.ps1` - Grant Windows user access (automated)
- `scripts/fix-sql-user-complete.ps1` - Fix SQL user configuration (automated)

## Troubleshooting

See `ROOT_CAUSE_AND_FIX.md` for detailed troubleshooting steps.

