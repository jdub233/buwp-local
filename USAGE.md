# buwp-local Development Guide

## Quick Start

### 1. Install in your project

```bash
npm install --save-dev @bostonuniversity/buwp-local
```

### 2. Initialize configuration

**Interactive mode (recommended):**
```bash
npx buwp-local init
```

The interactive setup will guide you through:
- Project name and type (plugin, theme, mu-plugin)
- Hostname configuration
- Port selection
- Service options (Redis, S3, Shibboleth)
- Debug settings

**Non-interactive mode:**
```bash
npx buwp-local config --init --plugin      # For plugins
npx buwp-local config --init --mu-plugin   # For mu-plugins
npx buwp-local config --init --theme       # For themes
```

This creates `.buwp-local.json` in your project directory.

### 3. Edit configuration

Edit `.buwp-local.json` to map your local repository into the container:

```json
{
  "image": "ghcr.io/bu-ist/bu-wp-docker-mod_shib:arm64-latest",
  "hostname": "myproject.local",
  "multisite": true,
  "mappings": [
    {
      "local": "./",
      "container": "/var/www/html/wp-content/plugins/my-plugin"
    }
  ]
}
```

### 4. Create `.env.local` for secrets

Create `.env.local` (never commit this file!):

```bash
# Database
WORDPRESS_DB_PASSWORD=password
DB_ROOT_PASSWORD=rootpassword

# Shibboleth (if needed)
SP_ENTITY_ID=https://your-sp-entity-id
IDP_ENTITY_ID=https://shib-test.bu.edu/idp/shibboleth
SHIB_IDP_LOGOUT=https://shib-test.bu.edu/idp/logout.jsp
SHIB_SP_KEY=your-key-here
SHIB_SP_CERT=your-cert-here

# AWS S3 (if needed)
S3_UPLOADS_BUCKET=your-bucket
S3_UPLOADS_REGION=us-east-1
S3_UPLOADS_ACCESS_KEY_ID=your-access-key
S3_UPLOADS_SECRET_ACCESS_KEY=your-secret-key

# OLAP
OLAP=your-olap-name
OLAP_ACCT_NBR=your-account-number
OLAP_REGION=us-east-1
```

### 5. Add hostname to /etc/hosts

```bash
sudo bash -c 'echo "127.0.0.1 username.local" >> /etc/hosts'
```

### 6. Start the environment

```bash
npx buwp-local start
```

### 7. Access your site

Open http://username.local or https://username.local in your browser.

## Commands

### Initialize configuration
```bash
npx buwp-local init

Options:
  --no-interactive  Use non-interactive mode with defaults
  --plugin          Non-interactive: initialize as plugin
  --mu-plugin       Non-interactive: initialize as mu-plugin
  --theme           Non-interactive: initialize as theme
  -f, --force       Overwrite existing configuration
```

The `init` command provides an interactive setup experience with:
- **Smart defaults** - Detects project type from files
- **Port conflict detection** - Automatically suggests available ports
- **Real-time validation** - Validates inputs as you type
- **Guided workflow** - Clear prompts for all configuration options

### Start environment
```bash
npx buwp-local start [options]

Options:
  --xdebug       Enable Xdebug
  --no-s3        Disable S3 proxy service
  --no-redis     Disable Redis service
```

### Stop environment
```bash
npx buwp-local stop
```

### View logs
```bash
npx buwp-local logs [options]

Options:
  -f, --follow              Follow log output
  -s, --service <service>   Show logs for specific service
                            (wordpress, db, s3proxy, redis)
```

### Destroy environment
```bash
npx buwp-local destroy [options]

Options:
  -f, --force    Skip confirmation prompt
```

### Configuration management
```bash
npx buwp-local config [options]

Options:
  --init        Initialize configuration file
  --validate    Validate configuration file
  --show        Show resolved configuration (with masked secrets)
```

## Configuration File

### Basic Structure

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
  "mappings": [],
  "env": {}
}
```

### Volume Mappings

Map your local code into the container:

```json
{
  "mappings": [
    {
      "local": "./",
      "container": "/var/www/html/wp-content/plugins/my-plugin"
    },
    {
      "local": "../my-theme",
      "container": "/var/www/html/wp-content/themes/my-theme"
    }
  ]
}
```

### Custom Environment Variables

```json
{
  "env": {
    "WP_DEBUG": true,
    "WP_DEBUG_LOG": true,
    "XDEBUG": false
  }
}
```

### Disabling Services

```json
{
  "services": {
    "redis": false,
    "s3proxy": false,
    "shibboleth": false
  }
}
```

## Security Best Practices

1. **Never commit `.env.local`** - This file contains secrets
2. **Never commit `.buwp-local/`** - This contains generated files
3. **Do commit `.buwp-local.json`** - This is your configuration template
4. **Use environment variables for all secrets**
5. **Consider using macOS Keychain** for even better security (see docs)

## File Structure

When you use `buwp-local`, these files are created:

```
your-project/
├── .buwp-local.json        # Configuration (commit this)
├── .env.local              # Secrets (NEVER commit)
├── .buwp-local/            # Generated files (don't commit)
│   └── docker-compose.yml  # Generated compose file
└── package.json            # Your project
```

## Troubleshooting

### Port conflicts

If you get port conflicts, you can change ports in `.buwp-local.json`:

```json
{
  "ports": {
    "http": 8080,
    "https": 8443,
    "db": 3307,
    "redis": 6380
  }
}
```

### Docker not running

Make sure Docker Desktop is running:
```bash
docker info
```

### Configuration errors

Validate your configuration:
```bash
npx buwp-local config --validate
```

### View current configuration

See the resolved configuration (with masked secrets):
```bash
npx buwp-local config --show
```

## Next Steps

- [ ] Phase 2: WP-CLI proxy command
- [ ] Phase 2: macOS Keychain integration
- [ ] Phase 3: Automatic /etc/hosts management
- [ ] Phase 3: SSL certificate generation
