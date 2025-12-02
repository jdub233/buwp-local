# Credential Management

This guide explains how to securely manage credentials for your buwp-local projects.

## Overview

buwp-local requires various credentials to function:
- Database passwords
- Shibboleth certificates and keys
- AWS S3 access keys
- OLAP credentials

You have two options for managing these credentials:

1. **macOS Keychain** (Recommended) - Secure, global, encrypted storage
2. **`.env.local` file** - Per-project, manual configuration

## Credential Types

buwp-local uses 15 different credential types:

### Database Credentials
- `WORDPRESS_DB_PASSWORD` - WordPress database user password
- `DB_ROOT_PASSWORD` - MySQL root password

### Shibboleth Credentials
- `SP_ENTITY_ID` - Service Provider entity ID
- `IDP_ENTITY_ID` - Identity Provider entity ID (default: `https://shib-test.bu.edu/idp/shibboleth`)
- `SHIB_IDP_LOGOUT` - IDP logout URL (default: `https://shib-test.bu.edu/idp/logout.jsp`)
- `SHIB_SP_KEY` - Service Provider private key (multiline PEM format)
- `SHIB_SP_CERT` - Service Provider certificate (multiline PEM format)

### S3 Credentials
- `S3_UPLOADS_BUCKET` - S3 bucket name for WordPress uploads
- `S3_UPLOADS_REGION` - AWS region (e.g., `us-east-1`)
- `S3_UPLOADS_ACCESS_KEY_ID` - AWS access key ID
- `S3_UPLOADS_SECRET_ACCESS_KEY` - AWS secret access key
- `S3_ACCESS_RULES_TABLE` - DynamoDB table for access rules

### OLAP Credentials
- `OLAP` - OLAP environment name
- `OLAP_ACCT_NBR` - OLAP account number
- `OLAP_REGION` - OLAP AWS region

---

## Option 1: macOS Keychain (Recommended)

### Why Use Keychain?

✅ **Secure** - Encrypted storage built into macOS  
✅ **Global** - Credentials available to all buwp-local projects  
✅ **Convenient** - Set up once, use everywhere  
✅ **Protected** - Requires authentication to access  
✅ **No files** - No plaintext credential files to accidentally commit

### Setup Process

#### Step 1: Get Credentials File

Download credentials from the dev server:

```bash
scp user@devserver:/path/to/buwp-local-credentials.json ~/Downloads/
```

#### Step 2: Import to Keychain

```bash
npx buwp-local keychain setup --file ~/Downloads/buwp-local-credentials.json
```

This will:
- Read all credentials from the JSON file
- Store each one securely in your Keychain
- Validate the format of each credential
- Prompt to delete the source file (recommended for security)

#### Step 3: Verify Import

```bash
npx buwp-local keychain list
```

You should see all 15 credential types listed.

#### Step 4: Test Access

```bash
npx buwp-local keychain test
```

This verifies Keychain access is working properly.

### Managing Keychain Credentials

**View a credential:**
```bash
npx buwp-local keychain get WORDPRESS_DB_PASSWORD
```

**Update a credential:**
```bash
npx buwp-local keychain set WORDPRESS_DB_PASSWORD "new-password"
```

**Delete a credential:**
```bash
npx buwp-local keychain delete WORDPRESS_DB_PASSWORD
```

**List all credentials:**
```bash
npx buwp-local keychain list
```

### Keychain Security

- Credentials are stored in your **login keychain**
- Service name: `buwp-local`
- Account name: `<credential-name>`
- Access is protected by macOS security
- First access may prompt for keychain password

You can view/edit credentials in **Keychain Access.app**:
1. Open **Keychain Access** (Applications → Utilities)
2. Search for `buwp-local`
3. Double-click any entry to view/edit

---

## Option 2: `.env.local` File

### When to Use `.env.local`

Use this method if you:
- Need per-project credentials (different credentials per project)
- Are not on macOS
- Prefer manual configuration
- Want to override specific Keychain credentials for testing

### Setup Process

#### Step 1: Create File

Copy the example file:

```bash
cp .env.local.example .env.local
```

#### Step 2: Add Credentials

Edit `.env.local` with your actual values:

```bash
# Database
WORDPRESS_DB_PASSWORD=your-password-here
DB_ROOT_PASSWORD=your-root-password-here

# Shibboleth
SP_ENTITY_ID=https://your-sp-entity-id
IDP_ENTITY_ID=https://shib-test.bu.edu/idp/shibboleth
SHIB_IDP_LOGOUT=https://shib-test.bu.edu/idp/logout.jsp
SHIB_SP_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
SHIB_SP_CERT="-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKJ5CqJ5CqJ5MA0GCSqGSIb3DQEBBQUA...
-----END CERTIFICATE-----"

# S3
S3_UPLOADS_BUCKET=your-bucket-name
S3_UPLOADS_REGION=us-east-1
S3_UPLOADS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_UPLOADS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_ACCESS_RULES_TABLE=your-access-rules-table

# OLAP
OLAP=your-olap-name
OLAP_ACCT_NBR=123456789
OLAP_REGION=us-east-1
```

#### Step 3: Multiline Values

For multiline credentials (like `SHIB_SP_KEY` and `SHIB_SP_CERT`), use quotes:

```bash
SHIB_SP_KEY="-----BEGIN PRIVATE KEY-----
Line 1 of key
Line 2 of key
Line 3 of key
-----END PRIVATE KEY-----"
```

Or use `\n` for newlines:

```bash
SHIB_SP_KEY="-----BEGIN PRIVATE KEY-----\nLine 1\nLine 2\n-----END PRIVATE KEY-----"
```

### `.env.local` Security

**⚠️ Critical Security Rules:**

1. **NEVER commit `.env.local` to git**
2. Add it to `.gitignore` immediately
3. Don't share it via Slack, email, or other channels
4. Store securely if backing up
5. Delete from Downloads after importing to Keychain

**Add to `.gitignore`:**
```bash
echo ".env.local" >> .gitignore
```

---

## Credential Loading Priority

buwp-local checks for credentials in this order:

1. **`.env.local` file** (highest priority - overrides Keychain)
2. **macOS Keychain** (fallback if not in `.env.local`)
3. **Error** if not found in either location

This means:
- `.env.local` can override specific Keychain credentials for testing
- Projects without `.env.local` automatically use Keychain
- Mix and match: some credentials from Keychain, some from `.env.local`

### Example: Mixed Credentials

```bash
# .env.local (only override database password for testing)
WORDPRESS_DB_PASSWORD=test-password

# All other credentials loaded from Keychain automatically
```

---

## Credential Validation

### Automatic Validation

When you run `start`, buwp-local automatically validates that all required credentials are available:

```bash
npx buwp-local start
```

If credentials are missing, you'll see:

```
⚠️  Missing required credentials:
  - WORDPRESS_DB_PASSWORD
  - S3_UPLOADS_ACCESS_KEY_ID

Would you like to set up credentials now? (y/n)
```

Choose:
- **Yes** - Opens interactive Keychain setup
- **No** - Exit and set up credentials manually

### Manual Validation

Check your configuration anytime:

```bash
npx buwp-local keychain status
```

This displays an inventory of your current credentials.

---

## Troubleshooting

### "Credential not found" Error

**Problem:** `npx buwp-local start` fails with missing credential error

**Solutions:**

1. Check Keychain:
```bash
npx buwp-local keychain list
npx buwp-local keychain get WORDPRESS_DB_PASSWORD
```

2. Check `.env.local`:
```bash
cat .env.local | grep WORDPRESS_DB_PASSWORD
```

3. Re-import to Keychain:
```bash
npx buwp-local keychain setup --file ~/Downloads/credentials.json
```

### Keychain Access Denied

**Problem:** Problems when accessing Keychain

**Solutions:**

1. Open **Keychain Access.app**
2. Find `buwp-local` entries
3. Confirm contents by double-clicking an entry or right-click → "Copy Password to Clipboard"

### Multiline Credentials Not Working

**Problem:** `SHIB_SP_KEY` appears garbled or doesn't work

**Cause:** Improper formatting in `.env.local`

**Solution:** Ensure proper quoting:

```bash
# ✅ Correct
SHIB_SP_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcw...
-----END PRIVATE KEY-----"

# ❌ Wrong - no quotes
SHIB_SP_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcw...
-----END PRIVATE KEY-----

# ❌ Wrong - single quotes don't work
SHIB_SP_KEY='-----BEGIN PRIVATE KEY-----...'
```

### Docker Can't See Credentials

**Problem:** Docker fails with "environment variable not set" errors

**Cause:** Credentials not loaded properly

**Solution:**

1. Verify credentials exist:
```bash
npx buwp-local keychain status
```

2. Check generated env file (for debugging only):
```bash
ls -la .buwp-local/.env.*
```

3. Restart with verbose logging:
```bash
DEBUG=* npx buwp-local start
```

### Wrong Credentials

**Problem:** Can't login to WordPress or S3 uploads fail

**Solutions:**

1. Update the credential:
```bash
npx buwp-local keychain set WORDPRESS_DB_PASSWORD "correct-password"
```

2. Or update `.env.local`:
```bash
# Edit .env.local with correct values
nano .env.local
```

3. Restart containers:
```bash
npx buwp-local restart
```

---

## Best Practices

### ✅ Do

- **Use Keychain for primary credentials** - Set up once globally
- **Delete credential files** after importing to Keychain
- **Add `.env.local` to `.gitignore`** immediately
- **Use `.env.local` for testing overrides** - Test different credentials without changing Keychain
- **Rotate credentials regularly** - Update old passwords/keys
- **Document credential sources** - Note where team members get credentials

### ❌ Don't

- **Never commit `.env.local`** to version control
- **Don't share credentials via chat/email** - Use secure transfer methods
- **Don't store plaintext backups** - Use encrypted storage

### Team Workflow

**Recommended approach for teams:**

1. **IT provides** encrypted credential file to developers
2. **Developer imports** to Keychain once:
   ```bash
   npx buwp-local keychain setup --file ~/Downloads/credentials.json
   ```
3. **Developer deletes** source file
4. **All projects** automatically use Keychain credentials
5. **Per-project overrides** use `.env.local` as needed (not committed)

---

## Credential File Format

If creating your own credentials JSON file for import:

```json
{
  "WORDPRESS_DB_PASSWORD": "password123",
  "DB_ROOT_PASSWORD": "rootpass123",
  "SP_ENTITY_ID": "https://your-sp-entity-id",
  "IDP_ENTITY_ID": "https://shib-test.bu.edu/idp/shibboleth",
  "SHIB_IDP_LOGOUT": "https://shib-test.bu.edu/idp/logout.jsp",
  "SHIB_SP_KEY": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEF...\n-----END PRIVATE KEY-----",
  "SHIB_SP_CERT": "-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAKJ5...\n-----END CERTIFICATE-----",
  "S3_UPLOADS_BUCKET": "bu-wordpress-uploads",
  "S3_UPLOADS_REGION": "us-east-1",
  "S3_UPLOADS_ACCESS_KEY_ID": "AKIAIOSFODNN7EXAMPLE",
  "S3_UPLOADS_SECRET_ACCESS_KEY": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "S3_ACCESS_RULES_TABLE": "bu-access-rules",
  "OLAP": "protected-s3-production-olap",
  "OLAP_ACCT_NBR": "123456789",
  "OLAP_REGION": "us-east-1"
}
```

**Notes:**
- Use `\n` for newlines in multiline values (JSON format)
- All values must be strings
- Validate JSON syntax before importing

---

## Security Architecture

### How Credentials Flow

1. **Storage** - Credentials stored in Keychain or `.env.local`
2. **Load** - buwp-local reads credentials at runtime
3. **Temp file** - Creates secure temp file (0600 permissions) with credentials
4. **Docker** - Docker Compose reads temp file via `env_file` directive
5. **Cleanup** - Temp file deleted when containers stop

### Why Temp Files?

buwp-local uses temporary environment files instead of passing credentials via command-line arguments because:

✅ **More secure** - Not visible in process list  
✅ **Handles multiline** - Supports certificates and keys  
✅ **Docker native** - Standard Docker Compose pattern  
✅ **Auto cleanup** - Files deleted automatically

### Temp File Location

```
.buwp-local/.env.XXXXXX  (random suffix)
```

**Permissions:** `0600` (owner read/write only)  
**Lifetime:** Exists only while containers are running  
**Cleanup:** Automatically deleted by `stop`, `destroy`, or process exit

TODO: double-check cleanup code

---

## See Also

- [Getting Started](GETTING_STARTED.md) - Initial setup guide
- [Commands Reference](COMMANDS.md) - All credential commands
- [Architecture](ARCHITECTURE.md) - Technical implementation details
