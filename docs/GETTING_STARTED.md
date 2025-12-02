# Getting Started with buwp-local

This guide will help you quickly set up a local WordPress development environment for Boston University web projects.

## Prerequisites

Before you begin, make sure you have:

1. **Docker Desktop** installed and running ([Download](https://www.docker.com/products/docker-desktop))
2. **Node.js 18+** installed ([Download](https://nodejs.org/))
3. **GitHub access token** with `read:packages` scope ([Create token](https://github.com/settings/tokens))

## Quick Start

### 1. Login to GitHub Packages

Authenticate with GitHub Packages to access the BU WordPress Docker image:

```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Or just login interactively:

```bash
docker login ghcr.io
```

### 2. Install buwp-local CLI

Navigate to your project directory and install the CLI tool:

```bash
npm install @bostonuniversity/buwp-local --save-dev
```

### 3. Set Up Credentials (Recommended)

This is a one-time setup to securely store your database passwords, S3 keys, and other secrets in your macOS Keychain. Once stored in the keychain, buwp-local will automatically retrieve them for any project.

**Option A: Keychain (Secure, macOS only)**

Download credentials from the dev server:

```bash
scp user@devserver:/path/to/buwp-local-credentials.json ~/Downloads/
```

Import the credentials from this downloaded file into your macOS Keychain:

```bash
npx buwp-local keychain setup --file ~/Downloads/buwp-local-credentials.json
```

This stores credentials securely in your Keychain for all buwp-local projects.

**Option B: Environment File (Manual)**

Copy the example file and add your credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your database passwords, S3 keys, etc. **Never commit this file!**

> 💡 **Tip:** Keychain is more secure and convenient since credentials are shared across all projects. You can always override with `.env.local` for specific projects.

### 4. Initialize Your Project

Run the interactive setup assistant to create your `.buwp-local.json` configuration file:

```bash
npx buwp-local init
```

This will guide you through:
- **Project type** (plugin, theme, mu-plugin, or sandbox)
- **Hostname** (e.g., `username-myproject.local`)
- **Ports** (HTTP, HTTPS, database)
- **Services** (Redis, S3, Shibboleth)
- **Volume mappings** (automatically configured for plugin/theme/mu-plugin types)

The `init` command creates `.buwp-local.json` with your configuration; the `start` command uses this file to launch your environment.

### 5. Add Hostname to /etc/hosts

Add your local hostname so your browser can find it:

```bash
sudo bash -c 'echo "127.0.0.1 username-myproject.local" >> /etc/hosts'
```

Replace `username-myproject.local` with the hostname you chose in step 4.

### 6. Start Your Environment

Start the Docker containers:

```bash
npx buwp-local start
```

The first run will pull Docker images and initialize your WordPress database. This may take a few minutes.

### 7. Access Your Site

Open your browser and navigate to:
- **HTTPS:** `https://username-myproject.local`

🎉 **Success!** Your local WordPress environment is running.

You can now develop your plugin/theme with live code sync via volume mapping, and the container can also be opened in vscode.

## Initial WordPress Setup

### Create a Local User

If running with Shibboleth enabled, create a local WordPress user with super admin privileges:

```bash
# Create the user
npx buwp-local wp user create username username@bu.edu --role=administrator

# Promote to super admin
npx buwp-local wp super-admin add username@bu.edu
```

### Import Site Content (Optional)

Pull a snapshot from production or staging:

```bash
npx buwp-local wp site-manager snapshot-pull \
  --source=https://www.bu.edu/admissions/ \
  --destination=http://username-myproject.local/admissions
```

This imports the database and copies media files to the s3 bucket from the specified site.

## Common Tasks

### Start/Stop

```bash
npx buwp-local start   # Start containers
npx buwp-local stop    # Stop containers
```

### View Logs

```bash
npx buwp-local logs # Show recent logs

```

### Run WP-CLI Commands

The `wp` command can be used to run any WP-CLI commands inside the WordPress container:

```bash
npx buwp-local wp plugin list
npx buwp-local wp post list --format=json
npx buwp-local wp cache flush
```

### Enable Xdebug

Xdebug can be enabled at startup:

```bash
npx buwp-local start --xdebug
```

### Destroy Environment

Remove all containers and volumes (fresh start):

```bash
npx buwp-local destroy
```

## Next Steps

- **[Commands Reference](COMMANDS.md)** - Full list of available commands
- **[Credential Management](CREDENTIALS.md)** - Detailed guide to managing secrets
- **[Multi-Project Setup](MULTI_PROJECT.md)** - Run multiple projects simultaneously
- **[Architecture](ARCHITECTURE.md)** - Understand how buwp-local works

## Troubleshooting

### Docker Not Running

Verify Docker Desktop is running:

```bash
docker info
```

### Credential Issues

Validate your configuration:

```bash
npx buwp-local keychain status
```

This displays an inventory of stored credentials.

### Need Help?

Run any command with `--help`:

```bash
npx buwp-local --help
npx buwp-local start --help
npx buwp-local keychain --help
```

## File Structure

After setup, your project will have:

```
your-project/
├── .buwp-local.json        # Configuration (this is okay to commit)
├── .env.local              # Secrets (NEVER commit)
├── .buwp-local/            # Generated files (don't commit)
│   └── docker-compose.yml  # Generated at runtime
├── node_modules/
└── package.json
```

**Important:** Add `.env.local` and `.buwp-local/` to your `.gitignore`!
