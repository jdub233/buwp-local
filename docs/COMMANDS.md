# Command Reference

Complete reference for all `buwp-local` CLI commands.

## Core Commands

### `init`

Initialize a new project configuration with an interactive assistant.

```bash
npx buwp-local init [options]
```

**Options:**
- `--no-interactive` - Use non-interactive mode with defaults
- `--plugin` - Non-interactive: initialize as plugin project
- `--mu-plugin` - Non-interactive: initialize as mu-plugin project
- `--theme` - Non-interactive: initialize as theme project
- `-f, --force` - Overwrite existing configuration file

**Examples:**
```bash
# Interactive mode (recommended)
npx buwp-local init

# Non-interactive modes
npx buwp-local init --plugin
npx buwp-local init --mu-plugin --force
npx buwp-local init --theme --no-interactive
```

**What it does:**
- Creates `.buwp-local.json` configuration file
- Auto-detects project type from directory structure
- Generates hostname from directory name
- Creates appropriate volume mappings for plugin/theme/mu-plugin types
- Configures services (Redis, S3, Shibboleth)
- Sets up port mappings

---

### `start`

Start the Docker Compose environment for your project.

```bash
npx buwp-local start [options]
```

**Options:**
- `--xdebug` - Enable Xdebug for debugging

**Examples:**
```bash
# Standard start
npx buwp-local start

# Start with Xdebug enabled
npx buwp-local start --xdebug
```

**What it does:**
- Validates credentials (Keychain or `.env.local`)
- Prompts for credential setup if missing
- Generates Docker Compose configuration
- Creates secure temporary environment file
- Starts Docker containers
- Shows service URLs and status

---

### `stop`

Stop all running containers for the current project.

```bash
npx buwp-local stop
```

**What it does:**
- Stops all Docker containers
- Preserves volumes (database and WordPress files remain intact)
- Cleans up temporary environment files

---

### `destroy`

Destroy the entire environment including volumes.

```bash
npx buwp-local destroy [options]
```

**Options:**
- `-f, --force` - Skip confirmation prompt

**Examples:**
```bash
# With confirmation prompt
npx buwp-local destroy

# Force destroy without confirmation
npx buwp-local destroy --force
```

**What it does:**
- Stops all containers
- Removes all containers
- **Deletes all volumes** (database and WordPress files are lost!)
- Cleans up temporary files

**⚠️ Warning:** This permanently deletes your local database and WordPress installation. Cannot be undone.

---

### `update`

Update Docker images and refresh WordPress core files.

```bash
npx buwp-local update [options]
```

**Options:**
- `--all` - Update all service images (default: WordPress image only)
- `--preserve-wpbuild` - Keep existing WordPress volume (prevents core file updates)

**Examples:**
```bash
# Update WordPress core from new image (recommended)
npx buwp-local update

# Update all service images (Redis, S3 proxy, etc.)
npx buwp-local update --all

# Preserve WordPress volume (skip core file refresh)
npx buwp-local update --preserve-wpbuild
```

**What it does:**
- Checks if environment exists and Docker is running
- Pulls latest Docker images from registry
- **Removes wp_build volume** to get fresh WordPress core files (unless `--preserve-wpbuild`)
- Recreates containers with new images
- Loads credentials from Keychain and/or `.env.local`
- **Always preserves database** (separate volume)
- **Always preserves custom mapped code** (your local files)
- **Uploads safe** (stored in S3, not in container)

**What gets updated:**
- ✅ WordPress core files (wp-admin, wp-includes, core PHP files)
- ✅ BU plugins and themes bundled in image
- ✅ PHP/Apache configuration from image

**What's preserved:**
- ✅ Database content (posts, users, settings) - separate volume
- ✅ Your custom mapped code - lives on your Mac
- ✅ Media uploads - stored in S3 bucket

**Use cases:**
- Get latest WordPress security patches
- Pull updated BU plugins/themes from new image
- Test code against newer WordPress version
- Refresh environment without losing development work

**Key difference from other commands:**
- `stop` → `start`: Reuses containers and volumes (no updates)
- `update`: Refreshes WordPress from image, preserves database
- `destroy`: Removes everything including database (nuclear option)

**Why it's safe:**
Because buwp-local uses S3 for media uploads (via s3proxy), the WordPress volume contains no user data - only WordPress core and BU infrastructure code. Your custom development code is mapped from your local filesystem and never touched.

---

### `logs`

View logs from Docker containers.

```bash
npx buwp-local logs
```

**Options:**
- `-f, --follow` - Follow log output

**Examples:**
```bash
# View all logs
npx buwp-local logs

# Follow logs in real-time
npx buwp-local logs --follow
```

---

### `config`

Manage project configuration.

```bash
npx buwp-local config [options]
```

**Options:**
- `--init` - Initialize new configuration file (legacy, use `init` instead)
- `--validate` - Validate existing configuration file
- `--show` - Display resolved configuration with masked secrets

**Examples:**
```bash
# Validate configuration
npx buwp-local config --validate

# Show current configuration (credentials masked)
npx buwp-local config --show
```

**What it does:**
- `--validate`: Checks `.buwp-local.json` for errors
- `--show`: Displays merged configuration (file + environment variables) with secrets masked

---

### `wp`

Run WP-CLI commands inside the WordPress container.

```bash
npx buwp-local wp <wp-cli-command> [args...]
```

**Examples:**
```bash
# User management
npx buwp-local wp user list
npx buwp-local wp user create username user@bu.edu --role=administrator
npx buwp-local wp super-admin add username@bu.edu

# Plugin management
npx buwp-local wp plugin list
npx buwp-local wp plugin activate akismet
npx buwp-local wp plugin deactivate hello

# Post management
npx buwp-local wp post list
npx buwp-local wp post create --post_title="Test Post" --post_status=publish

# Database operations
npx buwp-local wp db export backup.sql
npx buwp-local wp db query "SELECT * FROM wp_users LIMIT 5"

# Cache operations
npx buwp-local wp cache flush
npx buwp-local wp transient delete --all

# Site management
npx buwp-local wp site-manager snapshot-pull \
  --source=https://www.bu.edu/admissions/ \
  --destination=http://myproject.local/admissions
```

**What it does:**
- Executes WP-CLI commands inside the running WordPress container
- Passes through all arguments and options
- Requires containers to be running (`start` first)

**Full WP-CLI documentation:** https://developer.wordpress.org/cli/commands/

---

## Credential Management

### `keychain setup`

Import credentials into macOS Keychain from a JSON file.

```bash
npx buwp-local keychain setup --file <path-to-json>
```

Can also be used interactively by omitting the `--file` option, but shibboleth-related credentials that are multiline have to be provided via external files.

**Options:**
- `--file <path>` - Path to credentials JSON file (required)

**Example:**
```bash
npx buwp-local keychain setup --file ~/Downloads/buwp-local-credentials.json
```

**What it does:**
- Reads credentials from JSON file
- Stores each credential securely in macOS Keychain
- Validates credential format
- Prompts to delete source file after import (security best practice)
- Credentials become available to all buwp-local projects

**JSON file format:**
```json
{
  "WORDPRESS_DB_PASSWORD": "password",
  "DB_ROOT_PASSWORD": "rootpassword",
  "SP_ENTITY_ID": "https://your-sp-entity-id",
  "SHIB_SP_KEY": "-----BEGIN PRIVATE KEY-----\n...",
  "SHIB_SP_CERT": "-----BEGIN CERTIFICATE-----\n...",
  "S3_UPLOADS_BUCKET": "your-bucket",
  "S3_UPLOADS_ACCESS_KEY_ID": "your-access-key",
  "S3_UPLOADS_SECRET_ACCESS_KEY": "your-secret-key"
}
```

---

### `keychain get`

Retrieve a specific credential from macOS Keychain.

```bash
npx buwp-local keychain get <credential-name>
```

**Example:**
```bash
npx buwp-local keychain get WORDPRESS_DB_PASSWORD
npx buwp-local keychain get S3_UPLOADS_BUCKET
```

**What it does:**
- Fetches the specified credential from Keychain
- Displays the value (use with caution in shared terminals)
- Returns error if credential not found

---

### `keychain set`

Set a single credential in macOS Keychain.

```bash
npx buwp-local keychain set <credential-name> <value>
```

**Example:**
```bash
npx buwp-local keychain set WORDPRESS_DB_PASSWORD "new-password"
npx buwp-local keychain set S3_UPLOADS_BUCKET "my-bucket"
```

**What it does:**
- Stores or updates a credential in Keychain
- Creates new entry if it doesn't exist
- Updates existing entry if it does

---

### `keychain delete`

Delete a credential from macOS Keychain.

```bash
npx buwp-local keychain delete <credential-name>
```

**Example:**
```bash
npx buwp-local keychain delete WORDPRESS_DB_PASSWORD
```

**What it does:**
- Removes the specified credential from Keychain
- Prompts for confirmation before deletion

---

### `keychain list`

List all stored credentials in macOS Keychain.

```bash
npx buwp-local keychain list
```

**What it does:**
- Displays all credential names (not values) stored in Keychain
- Shows which of the 15 credential types are configured
- Useful for auditing what's stored

---

### `keychain status`

Test Keychain access and credential loading.

```bash
npx buwp-local keychain status
```

**What it does:**
- Verifies Keychain is accessible
- Tests reading sample credentials
- Reports any permission or access issues
- Useful for troubleshooting Keychain integration

---

### `keychain clear`

Clear all stored credentials from macOS Keychain.

```bash
npx buwp-local keychain clear [--force]
```

**What it does:**
- Deletes all 15 buwp-local credentials from Keychain
- Prompts for confirmation unless `--force` is used

---

## Global Options

These options work with all commands:

- `-h, --help` - Display help for command
- `-v, --version` - Display version number

**Examples:**
```bash
npx buwp-local --version
npx buwp-local start --help
npx buwp-local keychain --help
```

---

## Environment Variables

Commands respect these environment variables:

- `BUWP_CONFIG_FILE` - Path to config file (default: `.buwp-local.json`)
- `BUWP_ENV_FILE` - Path to environment file (default: `.env.local`)
- `NODE_ENV` - Node environment (`development`, `production`)

**Example:**
```bash
BUWP_CONFIG_FILE=.buwp-local.staging.json npx buwp-local start
```

---

## Exit Codes

Commands return standard exit codes:

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - Docker error
- `4` - Credential error

Use in scripts:
```bash
npx buwp-local start
if [ $? -eq 0 ]; then
  echo "Started successfully"
else
  echo "Failed to start"
fi
```

---

## Tips & Best Practices

### Running Multiple Projects

Each project is isolated by its `projectName`. You can run multiple projects simultaneously:

```bash
cd ~/project-a && npx buwp-local start
cd ~/project-b && npx buwp-local start
# Both running at the same time!
```

See [Multi-Project Setup](MULTI_PROJECT.md) for details (upcoming).

### Debugging

Enable Xdebug and configure your IDE:

```bash
npx buwp-local start --xdebug
```

Xdebug connects on port 9003 by default.

### WP-CLI Shortcuts

Create shell aliases for common commands:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias buwp='npx buwp-local'
alias buwp-wp='npx buwp-local wp'

# Then use:
buwp start
buwp-wp plugin list
```

---

## See Also

- [Getting Started](GETTING_STARTED.md) - Initial setup guide
- [Credentials Management](CREDENTIALS.md) - Detailed credential guide
- [Multi-Project Setup](MULTI_PROJECT.md) - Running multiple projects
- [Architecture](ARCHITECTURE.md) - How buwp-local works
