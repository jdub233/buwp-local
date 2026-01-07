# Architecture

Technical overview of how buwp-local works under the hood.

## System Overview

buwp-local is a CLI tool that generates and manages Docker Compose configurations for BU WordPress development environments.

```
┌─────────────────────────────────────────────────────────────┐
│                         buwp-local CLI                      │
│                     (Node.js/Commander)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ Read Configuration
                              │  (.buwp-local.json)
                              │
                              ├─ Load Credentials
                              │  (Keychain or .env.local)
                              │
                              ├─ Generate Docker Compose
                              │  (docker-compose.yml)
                              │
                              └─ Execute Docker Compose
                                 (via child process)
                                 
┌─────────────────────────────────────────────────────────────┐
│                      Docker Compose                         │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌─────────┐       │
│  │WordPress │  │  MySQL   │  │ Redis   │  │S3 Proxy │       │
│  │ Container│  │Container │  │Container│  │Container│       │
│  └──────────┘  └──────────┘  └─────────┘  └─────────┘       │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ db_data volume   │  │ wp_build volume  │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. CLI Framework

**Technology:** Commander.js

**Entry Point:** `bin/buwp-local.js`

**Structure:**
```
bin/
  buwp-local.js          # CLI entry point, command routing

lib/
  commands/
    init.js              # Interactive setup wizard
    start.js             # Start Docker Compose environment
    stop.js              # Stop containers
    destroy.js           # Remove containers and volumes
    logs.js              # View container logs
    keychain.js          # Keychain credential management
    wp.js                # WP-CLI proxy command
  
  config.js              # Configuration loading/validation
  keychain.js            # macOS Keychain integration
  docker-compose.js      # Docker Compose generation
  utils.js               # Utility functions
```

### 2. Configuration Management

**Config File:** `.buwp-local.json`

**Schema:**
```json
{
  "projectName": "string",       // Unique project identifier
  "hostname": "string",          // Local hostname (e.g., project.local)
  "multisite": "boolean",        // Enable WordPress multisite
  "image": "string",             // Docker image to use
  "services": {
    "redis": "boolean",          // Enable Redis cache
    "s3proxy": "boolean",        // Enable S3 proxy service
    "shibboleth": "boolean"      // Enable Shibboleth SSO
  },
  "ports": {
    "http": "number",            // HTTP port (default: 80)
    "https": "number",           // HTTPS port (default: 443)
    "db": "number",              // MySQL port (default: 3306)
    "redis": "number"            // Redis port (default: 6379)
  },
  "mappings": [
    {
      "local": "string",         // Local path (relative or absolute)
      "container": "string"      // Container path (absolute)
    }
  ],
  "env": {
    "KEY": "value"               // Custom environment variables
  }
}
```

**Loading Process:**

1. Read `.buwp-local.json` from project directory
2. Apply defaults for missing values
3. Validate schema and paths
4. Sanitize project name for Docker compatibility
5. Merge with command-line options

**Module:** `lib/config.js`

### 3. Credential Management

#### macOS Keychain Integration

**Service:** `buwp-local`  
**Account:** `<CREDENTIAL_NAME>`  
**Access:** Via `security` command-line tool

**Implementation:**
The current implementation uses the macOS `security` CLI to store, retrieve, and delete credentials securely in the Keychain. It is essentially a wrapper around these commands:

```bash
# Set credential
security add-generic-password \
  -s "buwp-local" \
  -a "WORDPRESS_DB_PASSWORD" \
  -w "password123" \
  -U

# Get credential  
security find-generic-password \
  -s "buwp-local" \
  -a "WORDPRESS_DB_PASSWORD" \
  -w

# Delete credential
security delete-generic-password \
  -s "buwp-local" \
  -a "WORDPRESS_DB_PASSWORD"
```

**Features:**
- Stores 15 credential types
- Automatic hex decoding for legacy multiline credentials
- Secure storage with macOS encryption
- Global access across all projects

#### Credential Loading Flow

```
Start Command
     │
     ├─ Check .env.local exists?
     │  ├─ Yes → Load from .env.local (dotenv)
     │  └─ No → Check Keychain
     │          ├─ Found → Load from Keychain
     │          └─ Not found → Prompt for setup
     │
     ├─ Validate required credentials
     │  └─ Missing? → Offer interactive setup
     │
     └─ Create secure temp env file
        └─ Pass to Docker Compose
```

**Priority:**
1. `.env.local` (highest - overrides Keychain)
2. macOS Keychain (fallback)
3. Error if not found

**Module:** `lib/config.js` (`loadKeychainCredentials()`)

### 4. Secure Temporary Files

**Purpose:** Pass credentials to Docker Compose securely

**Location:** `.buwp-local/.env.XXXXXX` (random suffix)

**Permissions:** `0600` (owner read/write only)

**Lifecycle:**
1. **Create:** Before starting containers
2. **Use:** Docker Compose reads via `env_file` directive
3. **Delete:** After stopping containers or on process exit

**Implementation:**
```javascript
// lib/config.js

export function createSecureTempEnvFile(credentials) {
  const tmpDir = path.join(process.cwd(), '.buwp-local');
  fs.mkdirSync(tmpDir, { recursive: true });
  
  const tmpFile = fs.mkdtempSync(path.join(tmpDir, '.env.'));
  const envFilePath = path.join(tmpFile, '.env');
  
  // Write credentials with escaped newlines
  const content = Object.entries(credentials)
    .map(([key, value]) => {
      const escaped = value.replace(/\n/g, '\\n');
      return `${key}=${escaped}`;
    })
    .join('\n');
  
  fs.writeFileSync(envFilePath, content, { mode: 0o600 });
  
  return envFilePath;
}

export function secureDeleteTempEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    fs.rmdirSync(path.dirname(filePath));
  }
}
```

**Why Not Process Environment?**
- ❌ Process env vars visible in `ps` output
- ❌ Can't handle multiline values reliably
- ✅ Temp files are more secure
- ✅ Docker Compose `env_file` is standard pattern

### 5. Docker Compose Generation

**Template:** Generated dynamically in memory

**Generation Process:**

1. **Base Services** (always included):
   ```yaml
   services:
     wordpress:
       image: ghcr.io/bu-ist/bu-wp-docker-mod_shib:arm64-latest
       environment:
         WORDPRESS_DB_HOST: db
         WORDPRESS_DB_USER: wordpress
       env_file: .buwp-local/.env.XXXXXX
       volumes:
         - wp_build:/var/www/html
       
     db:
       image: mysql:8.0
       environment:
         MYSQL_DATABASE: wordpress
         MYSQL_USER: wordpress
       env_file: .buwp-local/.env.XXXXXX
       volumes:
         - db_data:/var/lib/mysql
   ```

2. **Add Optional Services** (if enabled):
   ```yaml
   redis:
     image: redis:alpine
     
   s3proxy:
     image: ghcr.io/bu-ist/s3-proxy:latest
   ```

3. **Add Volume Mappings**:
   ```yaml
   wordpress:
     volumes:
       - ./:/var/www/html/wp-content/plugins/my-plugin
   ```

4. **Add Port Mappings**:
   ```yaml
   wordpress:
     ports:
       - "80:80"
       - "443:443"
   ```

5. **Add Named Volumes**:
   ```yaml
   volumes:
     db_data:
       name: ${projectName}_db_data
     wp_build:
       name: ${projectName}_wp_build
   ```

**Module:** `lib/docker-compose.js`

**Output:** `.buwp-local/docker-compose.yml`

**Important:** Generated file contains **variable references** (`${VAR_NAME}`), not actual credential values.

### 6. Docker Compose Execution

**Process:** Node.js child process spawning `docker compose` command

Once the docker-compose.yml is generated, buwp-local executes Docker Compose commands using the following pattern:

**Commands:**
```bash
# Start
docker compose -f .buwp-local/docker-compose.yml \
  --project-name ${projectName} \
  --env-file .buwp-local/.env.XXXXXX \
  up -d

# Stop
docker compose -f .buwp-local/docker-compose.yml \
  --project-name ${projectName} \
  down

# Destroy
docker compose -f .buwp-local/docker-compose.yml \
  --project-name ${projectName} \
  down -v

# Logs
docker compose -f .buwp-local/docker-compose.yml \
  --project-name ${projectName} \
  logs 
```

**Project Names:**
- Each project gets unique Docker Compose project name
- Format: sanitized directory name (lowercase, alphanumeric)
- Enables running multiple projects simultaneously
- All containers/volumes prefixed with project name

**Module:** `lib/commands/start.js`, `lib/commands/stop.js`

### 7. Volume Management

**Per-Project Volumes:**

```yaml
volumes:
  db_data:
    name: ${projectName}_db_data    # MySQL data
  wp_build:
    name: ${projectName}_wp_build   # WordPress files
```

**Bind Mounts (Volume Mappings):**

```yaml
volumes:
  - ./:/var/www/html/wp-content/plugins/my-plugin
  - ../theme:/var/www/html/wp-content/themes/my-theme
```

**Volume Isolation:**
- Each project name gets unique volumes
- Prevents database conflicts between projects
- Allows multiple projects to run simultaneously
- Volumes persist until `destroy` command

**Shared Environment:**
- Multiple repos with same `projectName` share volumes
- Enables integration testing
- All mappings accumulate

### 8. WP-CLI Proxy

**Implementation:**
```bash
docker compose --project-name ${projectName} \
  -f .buwp-local/docker-compose.yml \
  exec wordpress \
  wp ${args}
```

**Usage:**
```bash
npx buwp-local wp plugin list
npx buwp-local wp user create username user@bu.edu
```

**Features:**
- Passes all arguments through to WP-CLI
- Runs inside WordPress container
- Requires containers to be running

**Module:** `lib/commands/wp.js`

## Architectural Advantages

### Why Docker + Volume Mappings Over VM Sandboxes

Traditional VM sandbox environments face a fundamental architectural limitation: **WordPress core and developer code share the same filesystem**. This creates a destructive update cycle.

#### The VM Sandbox Problem

```
┌───────────────────────────────────────┐
│           VM Filesystem               │
│                                       │
│  /var/www/html/                       │
│    ├── wp-admin/      (WordPress core)│
│    ├── wp-includes/   (WordPress core)│
│    └── wp-content/                    │
│         ├── plugins/                  │
│         │   └── my-plugin/  ← Your code
│         └── themes/                   │
│              └── my-theme/   ← Your code
│                                       │
│  ALL IN ONE PLACE = Problem!          │
└───────────────────────────────────────┘

To update WordPress → Must rebuild entire VM
Rebuild entire VM → Your code gets overwritten
```

**Consequences:**
- Monthly rebuild schedules required
- Developers must backup code before rebuilds
- Team-wide coordination overhead
- All-or-nothing updates (everyone updates together)
- Risk of losing work if backup/restore fails

#### The buwp-local Solution

Docker's **volume mapping architecture** creates a clean separation:

```
┌─────────────────────────────────┐
│    Your Mac's Filesystem        │  ← Developer code lives here
│                                 │     (permanent, survives updates)
│  ~/projects/my-plugin/          │
│    ├── my-plugin.php            │
│    ├── includes/                │
│    └── assets/                  │
└────────────┬────────────────────┘
             │ Volume mapping (bind mount)
             ↓
┌─────────────────────────────────┐
│      Docker Container           │  ← WordPress core lives here
│                                 │     (disposable, updates don't affect code)
│  /var/www/html/                 │
│    ├── wp-admin/    (from image)│
│    ├── wp-includes/ (from image)│
│    └── wp-content/              │
│         └── plugins/            │
│              └── my-plugin/ ──┐ │  (mapped from Mac)
│                               │ │
│  SEPARATED = No conflicts!    │ │
└───────────────────────────────┴─┘
```

**Technical Benefits:**

1. **Persistent Code** - Your code lives on the host filesystem, not in the container. Destroy and recreate containers as much as you want—code never changes.

2. **Independent Updates** - Pull new WordPress images (`docker pull`) without affecting your development code. Update on your schedule, not a team calendar.

3. **Instant Rollback** - Switch between WordPress versions by changing the image tag. Your code stays constant while you test different WordPress versions.

4. **Zero Coordination** - Each developer controls their own environment. No rebuild meetings, no freeze periods, no waiting for others.

5. **Safe Testing** - Test breaking changes in WordPress without risk. If something goes wrong, recreate the container—your code was never in danger.

### Separation of Concerns

This architecture provides clean boundaries:

| Concern | Location | Update Mechanism |
|---------|----------|------------------|
| WordPress core | Docker image | `docker pull` |
| BU plugins | Docker image | `docker pull` |
| BU theme | Docker image | `docker pull` |
| **Your plugin** | **Local filesystem** | **Your editor** |
| **Your theme** | **Local filesystem** | **Your editor** |
| Database | Docker volume | Persists across updates |
| Uploads | Docker volume | Persists across updates |

Updates to WordPress never touch your development code. Updates to your code never require rebuilding WordPress.

For detailed migration guidance, see [MIGRATION_FROM_VM.md](MIGRATION_FROM_VM.md).

## Security Model

### Credential Security

**Storage:**
- **Keychain:** Encrypted by macOS, protected by user authentication
- **`.env.local`:** File permissions should be `0600` (user-managed)

**In Transit:**
- Loaded in Node.js process memory
- Written to temp file with `0600` permissions
- Never logged or displayed (except explicit `keychain get` command)

**In Docker:**
- Passed via `env_file` directive (not command line)
- Not visible in `docker ps` or process list
- Not written to generated `docker-compose.yml`

**Cleanup:**
- Temp files deleted on stop/destroy
- Process exit handlers ensure cleanup

### File Permissions

```
.buwp-local/
  docker-compose.yml    # 0644 (safe - no credentials)
  .env.XXXXXX/         # 0700 directory
    .env               # 0600 file (credentials)
```

### Git Ignore

**Must be ignored:**
```gitignore
.env.local
.buwp-local/
```

**Safe to commit:**
```
.buwp-local.json       # Configuration template (no secrets)
.env.local.example     # Example with placeholder values
```

## Multi-Project Architecture

### Isolated Projects

```
Project A (bu-custom-analytics):
  Volumes:
    - bu-custom-analytics_db_data
    - bu-custom-analytics_wp_build
  Containers:
    - bu-custom-analytics-wordpress-1
    - bu-custom-analytics-db-1
  Hostname: bu-custom-analytics.local
  Ports: 8080, 8443

Project B (bu-slideshow):
  Volumes:
    - bu-slideshow_db_data
    - bu-slideshow_wp_build
  Containers:
    - bu-slideshow-wordpress-1
    - bu-slideshow-db-1
  Hostname: bu-slideshow.local
  Ports: 8081, 8444
```

**Key:** Different `projectName` = Complete isolation

### Shared Projects

```
Shared Environment (bu-sandbox):
  Volumes:
    - bu-sandbox_db_data      # Shared
    - bu-sandbox_wp_build     # Shared
  Containers:
    - bu-sandbox-wordpress-1
    - bu-sandbox-db-1
  Mappings:
    - ~/projects/plugin-a → /wp-content/plugins/plugin-a
    - ~/projects/plugin-b → /wp-content/plugins/plugin-b
    - ~/projects/theme → /wp-content/themes/theme
  Hostname: bu-sandbox.local
  Ports: 80, 443
```

**Key:** Same `projectName` = Shared volumes and containers

## Performance Considerations

### Volume Performance

**Bind Mounts:**
- Direct host filesystem access
- Fast on macOS (Docker Desktop optimizations)
- Real-time code changes

**Named Volumes:**
- Better performance than bind mounts
- Used for database and WordPress core
- Persist between starts

### Resource Usage

**Typical Project:**
- WordPress container: ~200-500 MB RAM
- MySQL container: ~200-400 MB RAM
- Redis container: ~10-20 MB RAM
- S3 Proxy container: ~50-100 MB RAM
- Total: ~500 MB - 1 GB per project

**Multiple Projects:**
- Linear scaling per project
- 3 projects ≈ 1.5-3 GB RAM
- Docker Desktop overhead: ~500 MB

## Extensibility

### Adding New Services

Edit `lib/docker-compose.js`:

```javascript
if (config.services.myservice) {
  compose.services.myservice = {
    image: 'my/service:latest',
    environment: {
      SERVICE_CONFIG: '${MY_SERVICE_CONFIG}'
    }
  };
}
```

Add credential type to `lib/keychain.js`:

```javascript
const CREDENTIAL_TYPES = [
  // ... existing types
  'MY_SERVICE_CONFIG'
];
```

### Adding New Commands

Create `lib/commands/mycommand.js`:

```javascript
import { Command } from 'commander';

export function myCommand(program) {
  program
    .command('mycommand')
    .description('Description of my command')
    .action(async (options) => {
      // Implementation
    });
}
```

Register in `bin/buwp-local.js`:

```javascript
import { myCommand } from '../lib/commands/mycommand.js';

myCommand(program);
```

### Custom Docker Images

Override in `.buwp-local.json`:

```json
{
  "image": "ghcr.io/bu-ist/custom-image:latest"
}
```

## Error Handling

### Configuration Errors

**Validation:** Runs before Docker Compose generation

**Common Issues:**
- Missing required fields → Prompt with defaults
- Invalid JSON → Clear error message with line number
- Invalid paths → Resolve and validate before use

### Docker Errors

**Detection:** Check exit codes from `docker compose` commands

**Common Issues:**
- Docker not running → Check `docker info`
- Port conflicts → Suggest alternate ports
- Image pull failures → Check authentication
- Volume permission issues → Suggest cleanup

### Credential Errors

**Validation:** Before starting containers

**Common Issues:**
- Missing credentials → Offer interactive setup
- Keychain access denied → Provide Keychain Access instructions
- Invalid format → Clear error about expected format

### Cleanup on Failure

These are the handlers to ensure temporary files are deleted on process exit:

**Process Exit Handlers:**
```javascript
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

function cleanup() {
  secureDeleteTempEnvFile(tempEnvPath);
}
```

**Graceful Shutdown:**
- Delete temporary credential files
- Log cleanup actions
- Preserve volumes (unless `destroy`)

## Dependencies

### Runtime Dependencies

```json
{
  "commander": "^12.x",      // CLI framework
  "js-yaml": "^4.x",         // YAML generation
  "chalk": "^5.x",           // Terminal colors
  "prompts": "^2.x",         // Interactive prompts
  "dotenv": "^16.x"          // .env.local parsing
}
```

### External Requirements

- **Node.js:** >=18.0.0 (ESM support)
- **Docker Desktop:** Latest stable
- **macOS:** 10.15+ (for Keychain integration)
- **Shell:** zsh or bash

### Platform Support

**Current:**
- ✅ macOS (Intel and Apple Silicon)
- ✅ Keychain integration (macOS only)

**Future:**
- 🔄 Linux (credential storage TBD)
- 🔄 Windows (WSL2 + credential storage TBD)

## Testing Strategy

### Manual Testing

**Test Commands:**

Unit tests not implemented yet, recommend vitest as with bu-protected-s3-object-lambda.

### Validation

**Config Validation:**
```bash
npx buwp-local config --validate
```

**Credential Validation:**
```bash
npx buwp-local keychain status
```

**Docker Validation:**
```bash
docker compose -f .buwp-local/docker-compose.yml config
```

## Future Enhancements

### Planned Features

- **Cross-platform credential storage** (Linux, Windows)
- **Automatic /etc/hosts management** (detect missing entries)
- **SSL certificate generation** (local HTTPS)
- **Central registry** (shared team configurations)
- **Health checks** (verify services are running)
- **Performance monitoring** (container resource usage)
- **Unit tests** vitest

## See Also

- [Getting Started](GETTING_STARTED.md) - User guide
- [Commands Reference](COMMANDS.md) - Full command list
- [Credentials Management](CREDENTIALS.md) - Security details
- [Multi-Project Setup](MULTI_PROJECT.md) - Running multiple projects
