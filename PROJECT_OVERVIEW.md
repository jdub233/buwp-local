# buwp-local - Project Overview

A complete **npm CLI package** for managing local WordPress development environments at Boston University. It's modeled after `@wordpress/env` (wp-env) but customized for BU's specific infrastructure needs.

## Architecture

### Package Structure

```
buwp-local/
├── bin/
│   └── buwp-local.js           # CLI entry point (commander-based)
├── lib/
│   ├── index.js                # Main library exports
│   ├── config.js               # Configuration management
│   ├── compose-generator.js    # Docker Compose generation (uses js-yaml)
│   └── commands/
│       ├── start.js            # Start environment
│       ├── stop.js             # Stop environment
│       ├── destroy.js          # Destroy environment
│       ├── logs.js             # View logs
│       └── config.js           # Config management
├── package.json
├── USAGE.md                    # User documentation
└── README.md
```

### Key Technologies

- **commander** - CLI framework
- **js-yaml** - Docker Compose generation
- **chalk** - Terminal colors/formatting
- **dotenv** - Environment variable management

## How It Works

### 1. Configuration Management (`lib/config.js`)

Loads and merges configuration from three sources (in priority order):
1. Environment variables (`.env.local`)
2. User config (`.buwp-local.json`)
3. Default config

Features:
- Deep merge of configuration objects
- Validation with detailed error messages
- Sensitive data masking
- Path resolution for volume mappings

### 2. Docker Compose Generation (`lib/compose-generator.js`)

Programmatically generates `docker-compose.yml` files based on configuration:
- Creates services: WordPress, MariaDB, Redis, S3 proxy
- Configures networking and volumes
- Injects environment variables
- Handles conditional services (can disable Redis, S3, etc.)
- Generates volume mappings from config

Generated file is placed in `.buwp-local/docker-compose.yml` (gitignored).

### 3. CLI Commands (`bin/buwp-local.js` + `lib/commands/`)

#### `buwp-local start [options]`
- Loads configuration
- Validates config
- Generates docker-compose.yml
- Starts Docker containers
- Shows access URLs and next steps

Options:
- `--xdebug` - Enable Xdebug
- `--no-s3` - Disable S3 proxy
- `--no-redis` - Disable Redis

#### `buwp-local stop`
- Stops running containers (preserves data)

#### `buwp-local destroy [options]`
- Stops and removes containers AND volumes
- Prompts for confirmation (unless `--force`)
- **WARNING**: Deletes database data

#### `buwp-local logs [options]`
- View container logs
- `-f, --follow` - Follow log output
- `-s, --service <name>` - Show specific service logs

#### `buwp-local config [options]`
- `--init` - Create `.buwp-local.json`
- `--validate` - Validate configuration
- `--show` - Display resolved config (masks secrets)

## Configuration File Structure

### `.buwp-local.json` (committed to repo)

```json
{
  "image": "ghcr.io/bu-ist/bu-wp-docker-mod_shib:arm64-latest",
  "hostname": "wordpress.local",
  "multisite": true,
  "services": {
    "redis": true,
    "s3proxy": true,
    "shibboleth": true
  },
  "ports": {
    "http": 80,
    "https": 443,
    "db": 3306,
    "redis": 6379
  },
  "mappings": [
    {
      "local": "./",
      "container": "/var/www/html/wp-content/plugins/my-plugin"
    }
  ],
  "env": {
    "WP_DEBUG": true,
    "XDEBUG": false
  }
}
```

### `.env.local` (NEVER committed - gitignored)

```bash
# Database credentials
WORDPRESS_DB_PASSWORD=password
DB_ROOT_PASSWORD=rootpassword

# Shibboleth certificates
SP_ENTITY_ID=https://your-entity-id
IDP_ENTITY_ID=https://shib-test.bu.edu/idp/shibboleth
SHIB_IDP_LOGOUT=https://shib-test.bu.edu/idp/logout.jsp
SHIB_SP_KEY=your-private-key
SHIB_SP_CERT=your-certificate

# AWS credentials
S3_UPLOADS_BUCKET=your-bucket
S3_UPLOADS_REGION=us-east-1
S3_UPLOADS_ACCESS_KEY_ID=AKIA...
S3_UPLOADS_SECRET_ACCESS_KEY=secret...

# OLAP configuration
OLAP=your-olap
OLAP_ACCT_NBR=123456
OLAP_REGION=us-east-1
```

## Security Model

### Current Implementation (Phase 1)
- **Environment variables** via `.env.local` (gitignored)
- **Config masking** when displaying configuration
- **Clear separation** between config (committed) and secrets (local-only)

### Future Enhancements (Phase 2-3)
- macOS Keychain integration
- Windows Credential Manager support
- AWS SSO integration for temporary credentials
- Encrypted credential storage

## Usage Workflow

### For Plugin/Theme Development

1. Clone your plugin/theme repo
2. Install: `npm install --save-dev buwp-local`
3. Initialize: `npx buwp-local config --init`
4. Edit `.buwp-local.json` to map current directory to WordPress location
5. Create `.env.local` with credentials
6. Add hostname to `/etc/hosts`
7. Start: `npx buwp-local start`
8. Develop with live code sync via volume mapping

### For Multiple Repos

Each repo can have its own `.buwp-local.json` with different:
- Hostnames (site1.local, site2.local, etc.)
- Port mappings (avoid conflicts)
- Volume mappings (different plugins/themes)
- Service configurations

## Testing Results ✅

Tested successfully:
- [x] CLI entry point works
- [x] `config --init` creates configuration file
- [x] `config --show` displays resolved config with masking
- [x] Help command shows all available commands
- [x] Dependencies installed correctly
- [x] File structure created properly

## What's Ready Now

### Phase 1 Complete ✅
- [x] Full CLI infrastructure
- [x] Configuration management system
- [x] Docker Compose generation
- [x] All core commands (start, stop, destroy, logs, config)
- [x] Environment variable credential handling
- [x] Volume mapping support
- [x] Service toggles (enable/disable Redis, S3, etc.)
- [x] Comprehensive documentation

### Ready to Test
You can now:
1. Create a test project
2. Install buwp-local as dependency
3. Initialize configuration
4. Add credentials to `.env.local`
5. Run `npx buwp-local start`
6. Develop against live WordPress environment

