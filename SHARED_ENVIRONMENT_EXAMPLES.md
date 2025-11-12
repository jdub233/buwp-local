# Shared Environment - Practical Examples

## Example 1: Team Integration Sandbox

### Scenario
A team of 4 developers working on BU's WordPress site needs a shared local environment with:
- Custom theme (responsive-framework)
- Navigation plugin (bu-navigation)  
- Analytics plugin (bu-custom-analytics)
- Slideshow plugin (bu-slideshow)

### Setup

**Step 1: Create Primary Configuration Repo**
```bash
mkdir -p ~/projects/bu-team-sandbox
cd ~/projects/bu-team-sandbox

# Initialize
buwp-local config --init

# Edit .buwp-local.json:
{
  "projectName": "bu-team-sandbox",
  "hostname": "buteam.local",
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
  "env": {
    "WP_DEBUG": true,
    "WP_DEBUG_LOG": true,
    "XDEBUG": false
  }
}

# Create .env.local with credentials
# Start environment
buwp-local start
```

**Step 2: Each Developer Adds Their Repo**

**Developer 1 - Theme:**
```bash
cd ~/projects/responsive-framework
buwp-local config --init --theme

# Edit .buwp-local.json to join shared sandbox:
{
  "projectName": "bu-team-sandbox",  # SHARED!
  "hostname": "buteam.local",
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
      "container": "/var/www/html/wp-content/themes/responsive-framework"
    }
  ],
  "env": {
    "WP_DEBUG": true
  }
}

# Symlink shared credentials
ln -s ~/projects/bu-team-sandbox/.env.local .env.local

# Add theme to shared environment
buwp-local start
```

**Developer 2 - Navigation Plugin:**
```bash
cd ~/projects/bu-navigation
buwp-local config --init --plugin

# Edit .buwp-local.json (same projectName):
{
  "projectName": "bu-team-sandbox",
  "hostname": "buteam.local",
  # ... same ports/services ...
  "mappings": [
    {
      "local": "./",
      "container": "/var/www/html/wp-content/plugins/bu-navigation"
    }
  ]
}

ln -s ~/projects/bu-team-sandbox/.env.local .env.local
buwp-local start
```

**Developers 3 & 4 repeat for their plugins...**

**Result:**
- All 4 developers access http://buteam.local
- All plugins and theme are active
- Shared database with realistic test data
- Each developer's file changes are live

---

## Example 2: Solo Developer - Isolated + Shared

### Scenario
One developer working on `bu-custom-analytics` needs:
- **Isolated environment** for feature development
- **Shared environment** for integration testing with other plugins

### Setup

**Isolated Configuration** (`.buwp-local.json`):
```json
{
  "projectName": "bu-custom-analytics",
  "hostname": "analytics.local",
  "multisite": true,
  "services": {
    "redis": true,
    "s3proxy": false,
    "shibboleth": false
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
    "XDEBUG": true
  }
}
```

**Shared Configuration** (`.buwp-local.shared.json`):
```json
{
  "projectName": "bu-integration",
  "hostname": "buint.local",
  "multisite": true,
  "services": {
    "redis": true,
    "s3proxy": true,
    "shibboleth": true
  },
  "ports": {
    "http": 8080,
    "https": 8443,
    "db": 3307,
    "redis": 6380
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
```

### Workflow

**Morning - Feature Development (Isolated):**
```bash
cd ~/projects/bu-custom-analytics

# Use isolated config (default)
buwp-local start

# Develop at http://analytics.local
# Fast, isolated, clean environment
# Debug with Xdebug enabled
```

**Afternoon - Integration Testing (Shared):**
```bash
cd ~/projects/bu-custom-analytics

# Stop isolated
buwp-local stop

# Switch to shared config
cp .buwp-local.shared.json .buwp-local.json

# Join shared integration environment
buwp-local start

# Test at http://buint.local:8080
# Now running with other plugins/theme
# Test interactions and integration points
```

**End of Day - Back to Isolated:**
```bash
# Restore isolated config
git checkout .buwp-local.json

# Back to isolated for tomorrow
buwp-local destroy  # Clean up shared
buwp-local start    # Start fresh isolated
```

---

## Example 3: Multi-Environment Matrix

### Scenario
Testing plugin compatibility across different configurations:
- Modern stack (latest everything)
- Legacy stack (older versions)
- Production replica

### Setup

**Create 3 Separate Environments:**

**Environment 1: Modern Stack**
```bash
cd ~/projects/bu-custom-analytics

# .buwp-local.modern.json:
{
  "projectName": "modern-stack",
  "hostname": "modern.local",
  "image": "ghcr.io/bu-ist/bu-wp-docker-mod_shib:arm64-latest",
  # ... modern settings ...
}

cp .buwp-local.modern.json .buwp-local.json
buwp-local start
# Test at http://modern.local
```

**Environment 2: Legacy Stack**
```bash
# .buwp-local.legacy.json:
{
  "projectName": "legacy-stack",
  "hostname": "legacy.local",
  "image": "ghcr.io/bu-ist/bu-wp-docker-mod_shib:legacy-tag",
  "ports": {
    "http": 8081,
    "db": 3307
  }
  # ... legacy settings ...
}

cp .buwp-local.legacy.json .buwp-local.json
buwp-local start
# Test at http://legacy.local:8081
```

**Environment 3: Production Replica**
```bash
# .buwp-local.prod.json:
{
  "projectName": "prod-replica",
  "hostname": "prodlocal.local",
  "ports": {
    "http": 8082,
    "db": 3308
  }
  # ... production-like settings ...
}

cp .buwp-local.prod.json .buwp-local.json
buwp-local start
# Test at http://prodlocal.local:8082
```

**Result:**
- All 3 environments running simultaneously
- Same plugin code in all 3
- Different WordPress/PHP versions
- Test compatibility across configurations

---

## Example 4: Department-Wide Shared Sandbox

### Scenario
Marketing department (10 people) needs shared sandbox with:
- Content editors
- Designers  
- Developers
- QA testers

### Setup

**Central Configuration Repository:**
```bash
# Shared repo that everyone clones
git clone https://github.com/bu-ist/bu-marketing-sandbox.git
cd bu-marketing-sandbox

# .buwp-local.json:
{
  "projectName": "bu-marketing",
  "hostname": "marketing.local",
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
      "local": "../responsive-framework",
      "container": "/var/www/html/wp-content/themes/responsive-framework"
    },
    {
      "local": "../bu-slideshow",
      "container": "/var/www/html/wp-content/plugins/bu-slideshow"
    },
    {
      "local": "../bu-analytics",
      "container": "/var/www/html/wp-content/plugins/bu-analytics"
    }
  ],
  "env": {
    "WP_DEBUG": false  # Production-like for QA
  }
}

# .env.local (shared credentials via 1Password/LastPass)
# Includes test user accounts for all team members
```

**Each Team Member:**
```bash
# Clone central config
git clone https://github.com/bu-ist/bu-marketing-sandbox.git ~/projects/bu-marketing-sandbox

# Clone the repos to develop
cd ~/projects
git clone https://github.com/bu-ist/responsive-framework.git
git clone https://github.com/bu-ist/bu-slideshow.git
git clone https://github.com/bu-ist/bu-analytics.git

# Start shared environment
cd ~/projects/bu-marketing-sandbox
# Add .env.local with shared credentials
buwp-local start

# Access http://marketing.local
# All team members work in same environment
```

**Benefits:**
- Designers see live changes to theme
- Developers see plugin interactions
- Content editors have realistic environment
- QA tests actual configuration
- Everyone shares same database with test content

---

## Example 5: Feature Branch Testing

### Scenario  
Test a feature branch alongside main branch:
- `main` branch in production-like environment
- `feature/new-ui` branch in test environment

### Setup

**Main Branch Environment:**
```bash
cd ~/projects/bu-custom-analytics
git checkout main

# .buwp-local.json (default):
{
  "projectName": "bu-analytics-main",
  "hostname": "analytics-main.local",
  "ports": {
    "http": 80,
    "db": 3306
  },
  "mappings": [
    {
      "local": "./",
      "container": "/var/www/html/wp-content/plugins/bu-custom-analytics"
    }
  ]
}

buwp-local start
# Test main at http://analytics-main.local
```

**Feature Branch Environment:**
```bash
cd ~/projects/bu-custom-analytics
git checkout feature/new-ui

# Change projectName in .buwp-local.json:
{
  "projectName": "bu-analytics-feature",
  "hostname": "analytics-feature.local",
  "ports": {
    "http": 8080,
    "db": 3307
  },
  "mappings": [
    {
      "local": "./",
      "container": "/var/www/html/wp-content/plugins/bu-custom-analytics"
    }
  ]
}

buwp-local start
# Test feature at http://analytics-feature.local:8080
```

**Result:**
- Both branches running simultaneously
- Compare behavior side-by-side
- Separate databases for each
- No branch switching needed

---

## Tips for Shared Environments

### 1. Use Configuration Management
```bash
# Store configs in version control
~/projects/
├── bu-team-sandbox/           # Primary config repo
│   ├── .buwp-local.json
│   ├── .env.local.example
│   └── README.md
├── plugin-a/
│   ├── .buwp-local.json       # Points to shared
│   └── .env.local -> ../bu-team-sandbox/.env.local
└── plugin-b/
    ├── .buwp-local.json       # Points to shared
    └── .env.local -> ../bu-team-sandbox/.env.local
```

### 2. Document Your Shared Environments
Create a team wiki page:
```markdown
# Team Shared Environments

## bu-team-sandbox
- **URL:** http://buteam.local
- **Purpose:** Integration testing
- **Includes:** theme + all plugins
- **Managed by:** @teamlead
- **Config repo:** github.com/bu-ist/bu-team-sandbox

## bu-staging-replica
- **URL:** http://bustaging.local:8080  
- **Purpose:** Pre-production testing
- **Includes:** Production plugins only
- **Managed by:** @qa-lead
```

### 3. Use Consistent Naming
```bash
# Good naming convention:
bu-team-sandbox      # Team shared environment
bu-integration       # Integration testing
bu-staging-replica   # Staging mirror
bu-prod-replica      # Production mirror

# Avoid:
sandbox
test
local
dev
```

### 4. Regular Cleanup
```bash
# Weekly: Clean shared environments
buwp-local destroy
buwp-local start
# Fresh start with clean database
```

### 5. Backup Shared Databases
```bash
# Before major changes:
docker exec bu-team-sandbox-db-1 mysqldump -u wordpress -ppassword wordpress > backup-$(date +%Y%m%d).sql

# Restore if needed:
docker exec -i bu-team-sandbox-db-1 mysql -u wordpress -ppassword wordpress < backup-20251110.sql
```

---

## Troubleshooting Common Issues

### Issue: "Port already in use"
**Cause:** Another shared environment using same ports  
**Solution:** Use different ports in shared config:
```json
{
  "ports": {
    "http": 8081,
    "db": 3307
  }
}
```

### Issue: "My changes don't appear"
**Cause:** Wrong repo's mapping is active  
**Solution:** Check which repo last ran `start`:
```bash
docker compose -p bu-team-sandbox ps
# See which volumes are mounted
```

### Issue: "Database has wrong data"
**Cause:** Another developer made changes  
**Solution:** Communicate or use separate environments

### Issue: "Config out of sync"
**Cause:** Repos have different settings  
**Solution:** Use symlinks or central config repo

---

## Summary

Shared environments enable:
- ✅ Team collaboration on integrated stack
- ✅ Integration testing without deploy
- ✅ Multiple development strategies
- ✅ Flexible workflows (solo + team)
- ✅ Realistic production-like testing

Use the right tool for the job:
- **Isolated** = Solo development, fast iteration
- **Shared** = Integration, team collaboration
- **Both** = Maximum flexibility
