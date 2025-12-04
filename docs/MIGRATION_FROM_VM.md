# Migration from VM Sandboxes

This guide explains the architectural advantages of buwp-local compared to traditional VM sandbox environments and provides practical migration advice.

## Difficulties with VM Sandboxes

1. DV01 sandboxes are very slow.
2. The shared server is a single point of failure, and stability issues impact all developers.
3. Reliance on SFTP for code editing is becoming outdated and hard to support.
4. VM Sandboxes need periodic updates. 

## The VM Sandbox Updates Problem

In traditional VM-based development environments:

1. **Monthly rebuild cycles** - VM sandboxes must be periodically replaced with fresh builds to keep WordPress core, plugins, and infrastructure up to date
3. **Manual preservation** - Developers must manually back up their work before each rebuild and restore it afterward
4. **Coordination overhead** - Team-wide rebuild schedules require coordination and can interrupt active development
5. **All-or-nothing updates** - The entire team must update together, regardless of individual project needs

## How buwp-local Solves This

buwp-local uses **Docker's volume mapping architecture** to fundamentally separate concerns:

```
┌─────────────────────────────────────┐
│      Your Local Filesystem          │
│  (Your code lives here permanently) │
│                                     │
│  /path/to/your-plugin/              │
│    ├── plugin.php                   │
│    ├── includes/                    │
│    └── assets/                      │
└─────────────┬───────────────────────┘
              │ Volume mapping
              ↓
┌─────────────────────────────────────┐
│       Docker Container              │
│   (WordPress core lives here)       │
│                                     │
│  /var/www/html/                     │
│    ├── wp-admin/ (from image)       │
│    ├── wp-includes/ (from image)    │
│    └── wp-content/                  │
│         └── plugins/                │
│              └── your-plugin/ ←──── │ (mapped from local)
└─────────────────────────────────────┘
```

### Key Architectural Differences

| Aspect | VM Sandbox | buwp-local |
|--------|------------|------------|
| **Code location** | Inside VM filesystem | Your local filesystem |
| **WordPress core** | Inside VM filesystem | Inside disposable container |
| **Update mechanism** | Deploy entire WP build | Pull new Docker image |
| **Your code** | Overwritten on rebuild | Always preserved |
| **Update schedule** | Team-wide coordination | Individual developer choice |

## Advantages

### 1. Persistent Code

Your development work lives on your Mac's filesystem. Even if you destroy and recreate containers hundreds of times, your code remains untouched.

```bash
# This destroys the container but NOT your code
npx buwp-local destroy

# Start fresh - your code is still there
npx buwp-local start
```

### 2. Individual Update Schedules

Only those plugin and themes that you explicitly map into the container are fixed to the working code in your local filesystem. All of the other code resources from the BU WordPress build come from the container and can be updated independently.

Update WordPress whenever it makes sense for YOUR project:

```bash
# You in January: Pull latest image
docker pull ghcr.io/bu-ist/buwp:latest

# Colleague in February: Still working on older version
# No problem - they update when ready
```

### 3. Instant Version Switching

Test different WordPress versions without losing work:

```yaml
# .buwp-local.json
{
  "image": "ghcr.io/bu-ist/bu-wp-docker-mod_shib:arm64-wp5-8"  # Stable version
}
```

```yaml
# Switch to test new features
{
  "image": "ghcr.io/bu-ist/bu-wp-docker-mod_shib:arm64-wp6-0"  # Release candidate
}
```

Your code stays the same - only the WordPress version changes.

### 4. No Rebuild Coordination

Every developer controls their own environment:

- No team-wide rebuild meetings
- No "freeze" periods before rebuilds
- No coordination overhead
- No waiting for others


---

## What Changes in Your Workflow

### Before (VM Sandbox)

```
1. Connect to VM via SSH SFTP
2. Edit code in VM filesystem
3. Test changes in VM's WordPress (dv01 is slow!)
4. Before monthly rebuild: Back up your changes
5. After rebuild: Restore changes and pray
6. Repeat monthly
```

### After (buwp-local)

```
1. Edit code in your favorite local editor
2. Changes instantly sync to container
3. Test changes at http://yourproject.local
4. When WordPress update available: docker pull
5. That's it - your code was never touched
```

## Frequently Asked Questions

### "What if I need the old VM for something?"

Keep it! buwp-local and VM sandboxes can coexist. Use buwp-local for active development and VMs for other purposes.

### "What about database snapshots?"

buwp-local includes the same `wp site-manager snapshot-pull` command as production. Pull from production/staging anytime:

```bash
npx buwp-local wp site-manager snapshot-pull --source=https://www.bu.edu/site/
```

### "Can I share my environment with teammates?"

Your `.buwp-local.json` configuration can be committed to version control. Teammates run:

```bash
git clone your-repo
npm install
npx buwp-local start
```

Everyone gets an identical environment with their own isolated containers.

### "What happens to my database when I update?"

Docker volumes persist your database across container updates:

```bash
# Your database lives in a named volume
docker volume ls | grep wordpress-db

# It survives container recreation
npx buwp-local destroy  # Removes container
npx buwp-local start    # Database still intact
```

### "How do I completely start fresh?"

```bash
# Remove everything including database (this is notional, the actual command does not yet support the --volumes flag)
npx buwp-local destroy --volumes

# Or keep database, just refresh WordPress
npx buwp-local stop
docker pull ghcr.io/bu-ist/bu-wordpress:new-tag
npx buwp-local start
```

## Troubleshooting

### Container won't start

```bash
# Check Docker Desktop is running
docker info

# Check port conflicts
npx buwp-local start --verbose
```

### Code changes not appearing

Check volume mappings in `.buwp-local.json`:

```json
{
  "volumeMappings": [
    {
      "localPath": "./",
      "containerPath": "/var/www/html/wp-content/plugins/your-plugin"
    }
  ]
}
```

### Credentials not loading

```bash
# Verify Keychain entries
npx buwp-local keychain list

# Or use .env.local fallback
npx buwp-local keychain export > .env.local
```

See [CREDENTIALS.md](CREDENTIALS.md) for detailed credential management.

## Additional Resources

- [Getting Started Guide](GETTING_STARTED.md) - Step-by-step setup
- [Command Reference](COMMANDS.md) - Complete CLI documentation
- [Architecture Guide](ARCHITECTURE.md) - Technical deep-dive
