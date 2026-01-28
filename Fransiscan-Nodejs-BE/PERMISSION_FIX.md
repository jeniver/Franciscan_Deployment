# 🔧 Fix ReceiptReport Stored Procedure Permission Error

## Problem

You're seeing this error:
```
The EXECUTE permission was denied on the object 'ReceiptReport', database 'FransiscanTest', schema 'dbo'.
```

This happens when the database user doesn't have permission to execute the `ReceiptReport` stored procedure.

## Solution Options

### Option 1: Run the Automated Fix Script (Recommended)

**Prerequisites:** The script must be run with a user that has `sysadmin` or `db_owner` permissions.

```bash
npm run fix-permissions
```

This script will:
- Connect to your database using credentials from `.env`
- Grant EXECUTE permission on `ReceiptReport` to your database user
- Grant EXECUTE permission to `db_datareader` and `db_datawriter` roles
- Verify the permissions were granted successfully

### Option 2: Run SQL Script Manually (SSMS)

If the automated script doesn't work (e.g., insufficient permissions), run the SQL script manually:

1. **Open SQL Server Management Studio (SSMS)**
2. **Connect as an administrator** (e.g., `sa` or Windows Admin account)
3. **Open the script:** `scripts/grant-receipt-report-permissions.sql`
4. **Modify the script** if needed:
   - Update the user name if different from `franciscan_api`
   - For Windows Auth, uncomment and modify the Windows user section
5. **Execute the script**

### Option 3: Grant Permissions to All Stored Procedures

If you want to grant permissions to **all stored procedures** at once (recommended for development):

1. **Open SSMS** as administrator
2. **Run:** `scripts/grant-all-stored-procedure-permissions.sql`
3. This will grant EXECUTE on all stored procedures to `db_datareader` and `db_datawriter` roles

## Quick SQL Commands

**EASIEST SOLUTION - Grant to PUBLIC role (Recommended):**

```sql
USE [FransiscanTest];
GO

-- Grant to PUBLIC role - all users inherit this automatically
GRANT EXECUTE ON [dbo].[ReceiptReport] TO [public];
GO

-- Verify it worked
SELECT 
    p.name AS principal_name,
    perm.permission_name,
    perm.state_desc
FROM sys.database_permissions perm
INNER JOIN sys.objects obj ON perm.major_id = obj.object_id
INNER JOIN sys.database_principals p ON perm.grantee_principal_id = p.principal_id
WHERE obj.name = 'ReceiptReport' AND perm.type = 'EX';
GO
```

**Alternative - Grant to specific user:**

```sql
USE [FransiscanTest];
GO

-- Grant to specific user (replace 'franciscan_api' with your DB_USER)
GRANT EXECUTE ON [dbo].[ReceiptReport] TO [franciscan_api];
GO

-- Verify permissions
SELECT 
    p.name AS principal_name,
    p.type_desc AS principal_type,
    perm.permission_name,
    perm.state_desc AS permission_state
FROM sys.database_permissions perm
INNER JOIN sys.objects obj ON perm.major_id = obj.object_id
INNER JOIN sys.database_principals p ON perm.grantee_principal_id = p.principal_id
WHERE obj.name = 'ReceiptReport'
    AND perm.type = 'EX'
ORDER BY p.name;
GO
```

## For Windows Authentication Users

If you're using Windows Authentication (no `DB_PASSWORD` in `.env`):

```sql
USE [FransiscanTest];
GO

-- Replace 'JENIVER\geniv' with your actual Windows user from DB_USER
GRANT EXECUTE ON [dbo].[ReceiptReport] TO [JENIVER\geniv];
GO

-- Also grant to roles
GRANT EXECUTE ON [dbo].[ReceiptReport] TO [db_datareader];
GRANT EXECUTE ON [dbo].[ReceiptReport] TO [db_datawriter];
GO
```

## Verification

After granting permissions, verify they work:

1. **Restart your Node.js application**
2. **Test the endpoint:**
   ```bash
   curl http://localhost:3000/api/receipts/report?page=1&limit=50
   ```
3. **Check logs** - you should no longer see permission errors

## Troubleshooting

### Error: "Cannot find the user"

**Solution:** The user specified in `DB_USER` doesn't exist in the database.

1. Check your `.env` file for `DB_USER`
2. Verify the user exists:
   ```sql
   SELECT name, type_desc FROM sys.database_principals WHERE name = 'your_user_name';
   ```
3. If using Windows Auth, ensure the Windows user has access to the database

### Error: "The current database user does not have sufficient permissions"

**Solution:** You need to run the script/commands as a user with higher permissions.

1. **Option A:** Connect to SSMS as `sa` or a Windows Admin account
2. **Option B:** Ask your DBA to grant the permissions
3. **Option C:** Use the role-based approach (grant to `db_datareader`/`db_datawriter`)

### Still Getting Permission Errors After Fix

1. **Verify the user is in the correct roles:**
   ```sql
   SELECT dp.name AS user_name, r.name AS role_name
   FROM sys.database_role_members rm
   INNER JOIN sys.database_principals dp ON rm.member_principal_id = dp.principal_id
   INNER JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
   WHERE dp.name = 'your_user_name';
   ```

2. **Check if permissions were actually granted:**
   ```sql
   SELECT * FROM sys.database_permissions 
   WHERE major_id = OBJECT_ID('ReceiptReport') 
     AND type = 'EX';
   ```

3. **Ensure you're connecting with the correct user:**
   - Check your `.env` file
   - Verify the connection string matches

## Prevention

To prevent this issue in the future:

1. **Grant permissions during database setup** - Include permission grants in your database initialization scripts
2. **Use role-based permissions** - Grant to `db_datareader`/`db_datawriter` roles instead of individual users
3. **Document database users** - Keep a list of all database users and their required permissions

## Related Files

- `scripts/fix-receipt-report-permissions.js` - Automated fix script
- `scripts/grant-receipt-report-permissions.sql` - SQL script for ReceiptReport only
- `scripts/grant-all-stored-procedure-permissions.sql` - SQL script for all stored procedures
- `src/config/database.js` - Database configuration
- `src/repositories/ReceiptRepository.js` - Where ReceiptReport is called

