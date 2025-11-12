# Multi-Project Support & Smart Initialization

## New Features Summary

### ✅ 1. Unique Project Names
Each project now has a unique identifier based on its directory name, allowing multiple instances to run simultaneously.

### ✅ 2. Isolated Volumes
Each project gets its own Docker volumes, preventing database and file conflicts between projects.

### ✅ 3. Smart Configuration Init
Automatic mapping generation based on project type (plugin, mu-plugin, or theme).

---

## Feature Details

### 1. Project Name & Isolation

**Automatic Project Naming:**
- Project name defaults to the directory name
- Automatically sanitized for Docker compatibility (lowercase, alphanumeric + dash/underscore)
- Can be overridden in `.buwp-local.json`

**Example:**
```bash
# Directory: /path/to/bu-custom-analytics
# Project name: bu-custom-analytics
# Shows in Docker Desktop as: "bu-custom-analytics"
```

**Volume Isolation:**
- Database volume: `{projectName}_db_data`
- WordPress volume: `{projectName}_wp_build`

This means:
- ✅ Each project has its own database
- ✅ Each project has its own WordPress installation
- ✅ Projects don't interfere with each other
- ✅ You can run multiple projects simultaneously

### 2. Smart Configuration Initialization

**New Flags:**

```bash
buwp-local config --init --plugin      # For plugins
buwp-local config --init --mu-plugin   # For mu-plugins
buwp-local config --init --theme       # For themes
```

**What It Does:**

1. **Auto-detects directory name**
2. **Sets project name** to directory name
3. **Auto-generates hostname** as `{projectName}.local`
4. **Creates appropriate mapping** based on type

**Examples:**

#### Plugin Development
```bash
cd ~/projects/bu-custom-analytics
buwp-local config --init --plugin
```

**Generates:**
```json
{
  "projectName": "bu-custom-analytics",
  "hostname": "bu-custom-analytics.local",
  "mappings": [
    {
      "local": "./",
      "container": "/var/www/html/wp-content/plugins/bu-custom-analytics"
    }
  ]
}
```

#### Theme Development
```bash
cd ~/projects/responsive-framework
buwp-local config --init --theme
```

**Generates:**
```json
{
  "projectName": "responsive-framework",
  "hostname": "responsive-framework.local",
  "mappings": [
    {
      "local": "./",
      "container": "/var/www/html/wp-content/themes/responsive-framework"
    }
  ]
}
```

#### MU-Plugin Development
```bash
cd ~/projects/bu-navigation
buwp-local config --init --mu-plugin
```

**Generates:**
```json
{
  "projectName": "bu-navigation",
  "hostname": "bu-navigation.local",
  "mappings": [
    {
      "local": "./",
      "container": "/var/www/html/wp-content/mu-plugins/bu-navigation"
    }
  ]
}
```

---

## Multi-Project Workflow

### Running Multiple Projects Simultaneously

**Before (Problem):**
```bash
cd ~/plugin-a && buwp-local start
cd ~/plugin-b && buwp-local start  # ❌ Overwrites plugin-a!
```

**Now (Solution):**
```bash
cd ~/plugin-a && buwp-local start  # ✅ Runs on plugin-a.local
cd ~/plugin-b && buwp-local start  # ✅ Runs on plugin-b.local
# Both running simultaneously!
```

### Setting Up Multiple Projects

**Step 1: Initialize each project**
```bash
# Plugin A
cd ~/projects/bu-custom-analytics
buwp-local config --init --plugin
cp .env.local.example .env.local  # Add your credentials

# Plugin B  
cd ~/projects/bu-slideshow
buwp-local config --init --plugin
cp .env.local.example .env.local  # Add your credentials

# Theme
cd ~/projects/responsive-framework
buwp-local config --init --theme
cp .env.local.example .env.local  # Add your credentials
```

**Step 2: Use different ports (optional but recommended)**

Edit `.buwp-local.json` in each project:

```json
// bu-custom-analytics
{
  "ports": {
    "http": 8080,
    "https": 8443,
    "db": 3307,
    "redis": 6380
  }
}

// bu-slideshow
{
  "ports": {
    "http": 8081,
    "https": 8444,
    "db": 3308,
    "redis": 6381
  }
}

// responsive-framework
{
  "ports": {
    "http": 8082,
    "https": 8445,
    "db": 3309,
    "redis": 6382
  }
}
```

**Step 3: Add hostnames to /etc/hosts**
```bash
sudo bash -c 'cat >> /etc/hosts << EOF
127.0.0.1 bu-custom-analytics.local
127.0.0.1 bu-slideshow.local
127.0.0.1 responsive-framework.local
EOF'
```

**Step 4: Start all projects**
```bash
cd ~/projects/bu-custom-analytics && buwp-local start
cd ~/projects/bu-slideshow && buwp-local start
cd ~/projects/responsive-framework && buwp-local start
```

**Step 5: Access your sites**
- http://bu-custom-analytics.local:8080
- http://bu-slideshow.local:8081
- http://responsive-framework.local:8082

---

## Shared Environment Strategy (Centralized Sandbox)

### Concept: Multiple Repos, One WordPress Instance

In addition to isolated environments, you can create a **centralized sandbox** where multiple repositories share the same WordPress instance, database, and volumes. This is useful for:

- **Integration testing** - Test how multiple plugins work together
- **Full-stack development** - Work on theme + plugins simultaneously  
- **Team collaboration** - Multiple developers contributing to the same environment
- **Production-like setup** - Mirror actual site configuration locally

### How It Works

By setting the **same `projectName`** in multiple repositories, they'll join the same Docker Compose project and share volumes:

```bash
# All repos share: bu-sandbox_db_data and bu-sandbox_wp_build volumes
```

### Setting Up a Shared Environment

#### Strategy 1: Primary + Secondary Pattern (Recommended)

**Primary Repository** (owns the configuration):
```bash
cd ~/projects/bu-sandbox-primary
buwp-local config --init

# Edit .buwp-local.json:
{
  "projectName": "bu-sandbox",
  "hostname": "bu-sandbox.local",
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
  "mappings": [],  // Primary doesn't map itself
  "env": {
    "WP_DEBUG": true,
    "XDEBUG": false
  }
}

# Create shared .env.local with credentials
# Start the primary environment
buwp-local start
```

**Secondary Repositories** (add their mappings):
```bash
# Plugin A
cd ~/projects/bu-custom-analytics
buwp-local config --init --plugin

# Edit .buwp-local.json:
{
  "projectName": "bu-sandbox",  # Same as primary!
  "hostname": "bu-sandbox.local",  # Same as primary!
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
      "container": "/var/www/html/wp-content/plugins/bu-custom-analytics"
    }
  ],
  "env": {
    "WP_DEBUG": true,
    "XDEBUG": false
  }
}

# Copy .env.local from primary OR use symlink
ln -s ~/projects/bu-sandbox-primary/.env.local .env.local

# Add this plugin to the shared environment
buwp-local start
```

```bash
# Plugin B
cd ~/projects/bu-slideshow
buwp-local config --init --plugin

# Edit .buwp-local.json (same projectName, add mapping)
{
  "projectName": "bu-sandbox",
  "hostname": "bu-sandbox.local",
  # ... same settings as above ...
  "mappings": [
    {
      "local": "./",
      "container": "/var/www/html/wp-content/plugins/bu-slideshow"
    }
  ]
}

ln -s ~/projects/bu-sandbox-primary/.env.local .env.local
buwp-local start
```

```bash
# Theme
cd ~/projects/responsive-framework
buwp-local config --init --theme

# Edit .buwp-local.json (same projectName, add mapping)
{
  "projectName": "bu-sandbox",
  "hostname": "bu-sandbox.local",
  # ... same settings as above ...
  "mappings": [
    {
      "local": "./",
      "container": "/var/www/html/wp-content/themes/responsive-framework"
    }
  ]
}

ln -s ~/projects/bu-sandbox-primary/.env.local .env.local
buwp-local start
```

**Result:** 
- One WordPress instance at http://bu-sandbox.local
- Three repos mounted into it
- Shared database with all data
- All plugins and theme active together

#### Strategy 2: Shared Config File

Create a centralized config that all repos reference:

```bash
# Create shared config directory
mkdir -p ~/.buwp-shared-configs

# Create shared config
cat > ~/.buwp-shared-configs/bu-sandbox.json << EOF
{
  "projectName": "bu-sandbox",
  "hostname": "bu-sandbox.local",
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
  "env": {
    "WP_DEBUG": true,
    "XDEBUG": false
  }
}
EOF
```

In each repository, extend the shared config:
```bash
cd ~/projects/bu-custom-analytics

# Create .buwp-local.json that references shared config
cat > .buwp-local.json << EOF
{
  "projectName": "bu-sandbox",
  "hostname": "bu-sandbox.local",
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
      "container": "/var/www/html/wp-content/plugins/bu-custom-analytics"
    }
  ],
  "env": {
    "WP_DEBUG": true
  }
}
EOF
```

### How Docker Compose Handles Shared Projects

When multiple repos share the same `projectName`:

1. **First `start` command** - Creates the environment
   - Creates volumes: `bu-sandbox_db_data`, `bu-sandbox_wp_build`
   - Starts containers: `bu-sandbox-wordpress-1`, `bu-sandbox-db-1`, etc.
   - Applies first repo's mappings

2. **Subsequent `start` commands** - Updates the environment
   - Reuses existing volumes (data persists!)
   - Restarts containers with **accumulated mappings**
   - All repos' volumes are mounted together

3. **Container shows all mappings**:
```yaml
volumes:
  - bu-sandbox_wp_build:/var/www/html
  - /Users/dev/bu-custom-analytics:/var/www/html/wp-content/plugins/bu-custom-analytics
  - /Users/dev/bu-slideshow:/var/www/html/wp-content/plugins/bu-slideshow
  - /Users/dev/responsive-framework:/var/www/html/wp-content/themes/responsive-framework
```

### Workflow with Shared Environment

**Starting your workday:**
```bash
# Option 1: Start from primary repo
cd ~/projects/bu-sandbox-primary && buwp-local start

# Option 2: Start from any secondary repo (all mappings apply)
cd ~/projects/bu-custom-analytics && buwp-local start
```

**Adding a new repo to the shared environment:**
```bash
cd ~/projects/new-plugin
buwp-local config --init --plugin

# Edit .buwp-local.json to use shared projectName
# Set projectName to "bu-sandbox"

# Add to shared environment
buwp-local start
# Your new plugin is now available in the shared WordPress!
```

**Stopping the shared environment:**
```bash
# Stop from any participating repo
cd ~/projects/bu-custom-analytics
buwp-local stop
# Entire shared environment stops
```

**Viewing logs:**
```bash
# Logs from any participating repo show all services
cd ~/projects/bu-slideshow
buwp-local logs -f
```

### Important Considerations

#### ⚠️ Configuration Consistency

**All repos sharing a project MUST have consistent:**
- `projectName` - Must match exactly
- `hostname` - Should be the same
- `ports` - Must be identical (or conflicts occur)
- `services` - Should match (redis, s3proxy, shibboleth)
- `env` vars - Should be compatible

**Recommendation:** Use the Primary + Secondary pattern with config files kept in sync.

#### ⚠️ Start Order Matters

The **last repository to run `buwp-local start`** determines the final configuration. If configs differ:
- The last one "wins" for env vars, services, etc.
- All volume mappings accumulate
- Port conflicts cause failures

**Best Practice:** 
- Use the primary repo for configuration changes
- Keep secondary repos minimal (just add mappings)
- Document which repo is the "source of truth"

#### ⚠️ Volume Mapping Accumulation

Every `start` command adds its mappings to the Docker Compose configuration. This means:
- ✅ You can add repos dynamically
- ⚠️ Removing a repo requires `destroy` and rebuild
- ⚠️ Changing a mapping requires `destroy` and rebuild

**To remove a plugin/theme from shared environment:**
```bash
cd ~/projects/bu-sandbox-primary
buwp-local destroy  # Removes everything
buwp-local start    # Rebuild without that plugin
```

#### ⚠️ Database Sharing

All repos share the same database:
- ✅ Test plugins together with real data
- ✅ Integration testing scenarios
- ⚠️ One repo can affect another's data
- ⚠️ Database migrations affect all plugins

**Best Practice:** Use database snapshots/backups before major changes.

### Comparison: Isolated vs Shared

| Aspect | Isolated Environments | Shared Environment |
|--------|----------------------|-------------------|
| **Use Case** | Independent plugin development | Integration testing, full-stack |
| **Databases** | Separate per project | One shared database |
| **WordPress** | Separate per project | One shared instance |
| **Volume Names** | `{projectName}_db_data` | `bu-sandbox_db_data` |
| **URLs** | Different per project | Same for all repos |
| **Ports** | Can differ | Must be identical |
| **Data Isolation** | Complete | Shared |
| **Setup Time** | Fast per project | Fast for additional repos |
| **Complexity** | Low | Medium (config sync) |
| **Best For** | Solo development, testing | Team collaboration, integration |

### When to Use Each Approach

#### Use Isolated Environments When:
- ✅ Developing one plugin/theme independently
- ✅ Need clean slate for testing
- ✅ Don't need other plugins active
- ✅ Want to test different WordPress versions
- ✅ Working on experimental features
- ✅ Need different PHP/MySQL settings per project

#### Use Shared Environment When:
- ✅ Testing plugin interactions
- ✅ Developing theme + plugins together
- ✅ Mimicking production setup locally
- ✅ Team collaborating on same codebase
- ✅ Need persistent test data across plugins
- ✅ Integration/acceptance testing
- ✅ Want single URL for all development

### Hybrid Approach (Mix and Match)

You can use **both strategies** for different scenarios:

```bash
# Isolated environment for experimental work
cd ~/projects/bu-custom-analytics
# Uses projectName: "bu-custom-analytics"
buwp-local start
# Test independently at http://bu-custom-analytics.local

# Shared environment for integration testing
cd ~/projects/bu-custom-analytics
# Edit .buwp-local.json temporarily, set projectName: "bu-sandbox"
buwp-local start
# Now part of shared sandbox at http://bu-sandbox.local

# Switch back
# Restore original .buwp-local.json with unique projectName
buwp-local destroy  # Clean up shared
cd ~/projects/bu-custom-analytics && buwp-local start  # Back to isolated
```

**Recommendation:** Keep two config files:
```bash
# In each repo:
.buwp-local.json           # Isolated (default)
.buwp-local.shared.json    # Shared environment

# Switch between them:
cp .buwp-local.shared.json .buwp-local.json  # Use shared
cp .buwp-local.json.backup .buwp-local.json  # Use isolated
```

### Advanced: Shared Config Template

Create a team template for shared environments:

```bash
# ~/.buwp-shared-configs/team-template.json
{
  "projectName": "CHANGE_ME",
  "hostname": "CHANGE_ME.local",
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
  "env": {
    "WP_DEBUG": true,
    "XDEBUG": false
  }
}

# Team members copy and customize:
cp ~/.buwp-shared-configs/team-template.json ~/projects/my-repo/.buwp-local.json
# Edit projectName and add mappings
```

### Troubleshooting Shared Environments

#### Problem: Config drift between repos
**Solution:** Use symlinks to shared config file or primary repo pattern

#### Problem: Can't remove a plugin from shared environment
**Solution:** `destroy` from any repo, then restart without that plugin

#### Problem: Database is messed up
**Solution:** `destroy` the shared environment and start fresh

#### Problem: Not sure which repos are in shared environment
**Solution:** Check Docker Desktop or run:
```bash
docker compose -p bu-sandbox ps
# Lists all containers for that project
```

#### Problem: Want to test alone temporarily
**Solution:** Change projectName temporarily to create isolated instance

---

## Docker Desktop View

With project names, Docker Desktop now shows:

```
Containers:
├─ bu-custom-analytics
│  ├─ bu-custom-analytics-wordpress-1
│  ├─ bu-custom-analytics-db-1
│  ├─ bu-custom-analytics-redis-1
│  └─ bu-custom-analytics-s3proxy-1
│
├─ bu-slideshow
│  ├─ bu-slideshow-wordpress-1
│  ├─ bu-slideshow-db-1
│  ├─ bu-slideshow-redis-1
│  └─ bu-slideshow-s3proxy-1
│
└─ responsive-framework
   ├─ responsive-framework-wordpress-1
   ├─ responsive-framework-db-1
   ├─ responsive-framework-redis-1
   └─ responsive-framework-s3proxy-1

Volumes:
├─ bu-custom-analytics_db_data
├─ bu-custom-analytics_wp_build
├─ bu-slideshow_db_data
├─ bu-slideshow_wp_build
├─ responsive-framework_db_data
└─ responsive-framework_wp_build
```

Clear separation and easy to manage!

---

## Configuration Reference

### Project Name Configuration

**Auto-generated (default):**
```json
{
  "projectName": "my-plugin-name"  // From directory name
}
```

**Manual override:**
```json
{
  "projectName": "custom-project-name"
}
```

**Sanitization rules:**
- Converted to lowercase
- Non-alphanumeric characters (except `-` and `_`) replaced with `-`
- Leading/trailing dashes removed

**Examples:**
- `My Custom Plugin` → `my-custom-plugin`
- `BU_Navigation_v2` → `bu_navigation_v2`
- `@Company/Plugin` → `-company-plugin`

### Volume Naming

Volumes are automatically prefixed with the project name:

| Volume Type | Name Pattern | Example |
|------------|--------------|---------|
| Database | `{projectName}_db_data` | `bu-navigation_db_data` |
| WordPress | `{projectName}_wp_build` | `bu-navigation_wp_build` |

---

## Troubleshooting

### Port Conflicts

**Problem:** "Port 80 already in use"

**Solution:** Use different ports for each project

```json
{
  "ports": {
    "http": 8081,
    "https": 8444
  }
}
```

### Project Name Conflicts

**Problem:** Two directories with the same name

**Solution:** Manually set different project names

```json
// Project A
{
  "projectName": "bu-forms-v1"
}

// Project B  
{
  "projectName": "bu-forms-v2"
}
```

### Volume Data Persistence

**Question:** What happens to data when I destroy a project?

**Answer:** 
- `buwp-local stop` - Preserves all data (database, WordPress files)
- `buwp-local destroy` - Deletes ALL data for that specific project only
- Other projects are unaffected

### Listing Active Projects

```bash
# View all running buwp-local projects
docker ps --filter "label=com.docker.compose.project" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View all buwp-local volumes
docker volume ls | grep -E '(db_data|wp_build)'
```

---

## Migration Guide

### Upgrading from Previous Version

If you have an existing project without project names:

**Option 1: Start Fresh (Recommended)**
```bash
# Destroy old environment
buwp-local destroy -f

# Re-initialize with new format
buwp-local config --init --plugin

# Start fresh
buwp-local start
```

**Option 2: Manual Migration**
```bash
# Edit .buwp-local.json and add:
{
  "projectName": "your-project-name",
  // ... rest of config
}

# Destroy and restart
buwp-local destroy -f
buwp-local start
```

---

## Best Practices

### 1. Use Descriptive Project Names
- ✅ `bu-custom-analytics`
- ✅ `responsive-framework-theme`
- ❌ `test` (too generic)
- ❌ `plugin1` (unclear)

### 2. Use Smart Init Flags
Always use `--plugin`, `--mu-plugin`, or `--theme` for correct mappings

### 3. Document Port Assignments
Keep a team reference for port assignments to avoid conflicts

### 4. Share .env.local Template
Create `.env.local.example` with empty values for team members

### 5. Regular Cleanup
```bash
# List all buwp-local volumes
docker volume ls | grep -E '(db_data|wp_build)'

# Remove unused volumes
docker volume prune
```

---

## Summary

These features enable:
- ✅ **Multiple concurrent dev environments** - Work on several projects at once
- ✅ **Data isolation** - Each project has its own database and WordPress installation  
- ✅ **Easy setup** - Smart initialization with `--plugin`, `--theme`, `--mu-plugin`
- ✅ **Clear organization** - See all projects clearly in Docker Desktop
- ✅ **Team scalability** - 20+ developers can each work on multiple projects
- ✅ **Flexible strategies** - Choose isolated OR shared environments based on needs
- ✅ **Centralized sandbox** - Test plugin interactions with shared WordPress instances
- ✅ **Mix and match** - Use both approaches for different scenarios

### Development Workflow Patterns

#### Pattern 1: Solo Developer - Isolated Environments
```
Developer works on 3 plugins independently:
├─ plugin-a (own DB, own WordPress)
├─ plugin-b (own DB, own WordPress)  
└─ plugin-c (own DB, own WordPress)

Each gets unique projectName = directory name
```

#### Pattern 2: Team Collaboration - Shared Environment
```
Team works on integrated stack:
├─ bu-theme (all share "bu-team-sandbox")
├─ bu-navigation (all share "bu-team-sandbox")
├─ bu-slideshow (all share "bu-team-sandbox")
└─ bu-analytics (all share "bu-team-sandbox")

All repos share: bu-team-sandbox_db_data, one WordPress instance
Access: http://bu-team-sandbox.local
```

#### Pattern 3: Hybrid Approach
```
Developer uses both:

Morning (isolated testing):
  bu-navigation with projectName: "bu-navigation"
  Test in isolation at http://bu-navigation.local

Afternoon (integration testing):
  Change projectName to "bu-integration"
  Join shared environment with theme + other plugins
  Test interactions at http://bu-integration.local
```

### Quick Decision Guide

**Choose Isolated When:**
- Developing new feature independently
- Need clean environment
- Testing without dependencies
- Want fast setup/teardown

**Choose Shared When:**
- Testing plugin interactions
- Team working on same feature
- Need persistent test data
- Mimicking production setup

**Use Both When:**
- Need isolated development + integration testing
- Want to test alone first, then with team
- Developing complex interdependent features

This solves the core multi-project development workflow challenges while providing flexibility for both isolated and collaborative work!
