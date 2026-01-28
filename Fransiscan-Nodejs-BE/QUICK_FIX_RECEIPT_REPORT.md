# 🚀 QUICK FIX: ReceiptReport Permission Error

## The Problem
You're seeing this error:
```
The EXECUTE permission was denied on the object 'ReceiptReport', database 'FransiscanTest', schema 'dbo'.
```

## ⚡ FASTEST SOLUTION (30 seconds)

### Option 1: Run SQL Script in SSMS (Recommended - Works 100%)

1. **Open SQL Server Management Studio (SSMS)**
2. **Connect as Administrator** (sa or Windows Admin)
3. **Copy and paste this SQL:**

```sql
USE [FransiscanTest];
GO
GRANT EXECUTE ON [dbo].[ReceiptReport] TO [public];
GO
```

4. **Click Execute** (F5)
5. **Done!** Restart your Node.js application

### Option 2: Run Automated Script

```bash
npm run fix-permissions
```

**Note:** This requires the script to be run with admin permissions. If it fails, use Option 1.

## ✅ Verification

After running the fix, verify it worked:

```sql
-- Check if permission was granted
SELECT 
    p.name AS principal_name,
    perm.permission_name,
    perm.state_desc
FROM sys.database_permissions perm
INNER JOIN sys.objects obj ON perm.major_id = obj.object_id
INNER JOIN sys.database_principals p ON perm.grantee_principal_id = p.principal_id
WHERE obj.name = 'ReceiptReport' AND perm.type = 'EX';
```

You should see `public` in the results.

## 🔄 After Fixing

1. **Restart your Node.js application**
2. **Test the endpoint:** `GET /api/receipts/report`
3. **The error should be gone!**

## Why This Works

Granting to `[public]` role means **ALL database users** automatically inherit the permission. This is the simplest and most reliable solution.

## Still Having Issues?

If you still see the error after running the fix:

1. **Check you're connected to the right database** (`FransiscanTest`)
2. **Verify the stored procedure exists:**
   ```sql
   SELECT * FROM sys.procedures WHERE name = 'ReceiptReport';
   ```
3. **Check your database user has access:**
   ```sql
   SELECT name, type_desc FROM sys.database_principals WHERE name = 'JENIVER\geniv';
   ```
4. **Try granting directly to your user:**
   ```sql
   GRANT EXECUTE ON [dbo].[ReceiptReport] TO [JENIVER\geniv];
   ```

## Need More Help?

See `PERMISSION_FIX.md` for detailed troubleshooting.

