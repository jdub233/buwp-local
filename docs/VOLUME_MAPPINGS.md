# Volume Mapping Patterns

Guide to configuring volume mappings for different development workflows in buwp-local.

## Overview

Volume mappings connect your local filesystem to the WordPress container, enabling live code sync and IDE integration. There are two main approaches based on **where buwp-local lives**:

- **Inside your plugin/theme repo** (Pattern A) - Self-contained, like wp-env
- **In a separate "base camp" directory** (Patterns B & C) - Coordinates multiple repos

This guide documents three patterns based on real user workflows.

**Quick Navigation:**
- [Pattern A: In-Repo Development](#pattern-a-in-repo-development) - Single plugin/theme, wp-env style
- [Pattern B: Sandbox Coordination](#pattern-b-sandbox-coordination) - Multiple repos from base camp
- [Pattern C: Monolithic Sandbox](#pattern-c-monolithic-sandbox) - Full WordPress build in base camp
- [Choosing a Pattern](#choosing-a-pattern) - Decision guide

---

## Pattern A: In-Repo Development

**Use Case:** Single plugin or theme development, wp-env style

### Description

buwp-local is installed directly in your plugin or theme repository. It can be  configured by `npx buwp-local init`, which will try to detect if is being run within a plugin or theme directory and automatically set up the volume mapping. The repository is self-contained and maps itself into WordPress.

**Good for:**
- Transitioning from wp-env
- Open source plugins (distributable setup)
- Single-focus development
- Projects where repo includes dev environment setup

### Pros & Cons

**Pros:**
- ✅ Simplest setup (`init` can auto-configure)
- ✅ Self-contained to one repo (each repo can have its own setup)
- ✅ Fast volume performance (minimal mapping)
- ✅ Clean isolation (your code vs WordPress core)
- ✅ Familiar to wp-env users

**Cons:**
- ❌ Can't easily develop multiple plugins together
- ❌ Local sites don't share content or database
- ❌ No IDE context for WordPress core

### Example Configuration

**Directory Structure:**
```
~/projects/bu-custom-analytics/    ← Your plugin repo
├── .buwp-local.json              ← buwp-local config
├── package.json                  ← Has buwp-local as devDependency
├── node_modules/
│   └── @bostonuniversity/buwp-local/
├── bu-custom-analytics.php
├── includes/
└── assets/

Container:
/var/www/html/                    (Docker volume)
└── wp-content/
    └── plugins/
        └── bu-custom-analytics/  (→ mapped to your repo root)
```

**Configuration File (`.buwp-local.json`):**
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

### Setup Workflow

```bash
# 1. Navigate to your plugin/theme repo
cd ~/projects/bu-custom-analytics

# 2. Install buwp-local
npm install --save-dev @bostonuniversity/buwp-local

# 3. Initialize (auto-generates config with mapping)
npx buwp-local init --plugin

# 4. Start environment
npx buwp-local start
```

### When to Use

- ✅ Single plugin or theme development
- ✅ Coming from wp-env background
- ✅ Want repo to be fully self-contained
- ✅ Don't need to test multiple plugins together

### Xdebug Configuration

See [Pattern A in XDEBUG.md](XDEBUG.md#pattern-a-in-repo-development) for IDE-specific pathMappings.

---

## Pattern B: Sandbox Coordination

**Use Case:** Multiple repos coordinated from a "base camp" directory

### Description

buwp-local is installed in a **separate "base camp" directory** that doesn't contain any WordPress code. This directory coordinates multiple plugin/theme repos by mapping them into a shared WordPress instance. The repos themselves remain pure and unaware of buwp-local.

**Key concept:** Like the traditional VM sandbox development environment, but using Docker and volume mappings instead of SFTP.

**Good for:**
- Working on multiple repos that interact
- Keeping repos free of development tool dependencies

### Pros & Cons

**Pros:**
- ✅ Repos stay pure (no buwp-local installation needed)
- ✅ Work on multiple plugins/themes simultaneously
- ✅ Test plugin interactions in realistic environment
- ✅ Team can share base camp configuration
- ✅ Site content and database available across repos in single project

**Cons:**
- ❌ Requires hand-editing config file for mappings
- ❌ No WordPress core context in IDE (unless using Pattern C)
- ❌ Slightly more complex initial setup

### Example Configuration

**Directory Structure:**
```
~/projects/
├── bu-sandbox/                   ← "Base camp" (owns buwp-local)
│   ├── .buwp-local.json         ← Hand-edited mappings
│   ├── .env.local               ← Credentials (optional)
│   ├── package.json             ← npm install buwp-local here
│   └── node_modules/
│       └── @bostonuniversity/buwp-local/
│
├── bu-navigation/                ← Pure repo (no buwp-local)
│   ├── bu-navigation.php
│   └── includes/
│
├── bu-slideshow/                 ← Pure repo (no buwp-local)
│   ├── bu-slideshow.php
│   └── assets/
│
└── responsive-framework/         ← Pure repo (no buwp-local)
    ├── style.css
    └── functions.php

Container (all repos mapped into one WordPress):
/var/www/html/                    (Docker volume)
└── wp-content/
    ├── plugins/
    │   ├── bu-navigation/        (→ ~/projects/bu-navigation)
    │   └── bu-slideshow/         (→ ~/projects/bu-slideshow)
    └── themes/
        └── responsive-framework/ (→ ~/projects/responsive-framework)
```

**Configuration File (`~/projects/bu-sandbox/.buwp-local.json`):**

Using **absolute paths** (most common, explicit):
```json
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
      "local": "/Users/username/projects/bu-navigation",
      "container": "/var/www/html/wp-content/plugins/bu-navigation"
    },
    {
      "local": "/Users/username/projects/bu-slideshow",
      "container": "/var/www/html/wp-content/plugins/bu-slideshow"
    },
    {
      "local": "/Users/username/projects/responsive-framework",
      "container": "/var/www/html/wp-content/themes/responsive-framework"
    }
  ],
  "env": {
    "WP_DEBUG": true,
    "XDEBUG": false
  }
}
```

Using **relative paths** (if repos are siblings to base camp):
```json
{
  "projectName": "bu-sandbox",
  "hostname": "bu-sandbox.local",
  "mappings": [
    {
      "local": "../bu-navigation",
      "container": "/var/www/html/wp-content/plugins/bu-navigation"
    },
    {
      "local": "../bu-slideshow",
      "container": "/var/www/html/wp-content/plugins/bu-slideshow"
    },
    {
      "local": "../responsive-framework",
      "container": "/var/www/html/wp-content/themes/responsive-framework"
    }
  ]
}
```

### Setup Workflow

```bash
# 1. Create base camp directory
mkdir ~/projects/bu-sandbox
cd ~/projects/bu-sandbox

# 2. Initialize npm project and install buwp-local
npm init -y
npm install --save-dev @bostonuniversity/buwp-local

# 3. Initialize in sandbox mode
npx buwp-local init --sandbox

# 4. Hand-edit .buwp-local.json to add repo mappings
# (See example configurations above)

# 5. Start environment
npx buwp-local start

# 6. Develop in your repos (bu-navigation, bu-slideshow, etc.)
# Changes sync automatically via volume mappings
```

### When to Use

- ✅ Developing multiple BU plugins/themes together
- ✅ Testing plugin interactions (navigation + slideshow + theme)
- ✅ Want repos to stay clean (no dev tool dependencies)
- ✅ Transitioning from VM sandbox workflow

### Xdebug Configuration

See [Pattern B in XDEBUG.md](XDEBUG.md#pattern-b-sandbox-coordination) for multi-workspace pathMappings.

---

## Pattern C: Monolithic Sandbox

**Use Case:** Full WordPress codebase for complete IDE intelligence

### Description

A variant of Pattern B where the base camp maps the **entire WordPress installation** instead of selective plugins/themes. This provides complete IDE context (autocomplete for WordPress core, go-to-definition across all code) at the cost of more complex setup and slower filesystem performance.

**Good for:**
- Advanced IDE users (PHPStorm, Zed)
- Complex debugging across multiple codebases
- Need to edit WordPress core or dependencies
- Want full codebase navigation

### Pros & Cons

**Pros:**
- ✅ Full WordPress core autocomplete in IDE
- ✅ Go-to-definition works across all code
- ✅ Can edit any file (core, plugins, themes)
- ✅ Step debug the entire codebase
- ✅ Complete codebase context

**Cons:**
- ❌ Complex initial setup
- ❌ Must manage all code updates locally
- ❌ Risk of accidentally editing core files
- ❌ Potentially Slower volume performance (large mapping)

### Example Configuration

**Directory Structure:**
```
~/projects/
├── bu-sandbox-full/              ← Base camp
│   ├── .buwp-local.json         ← Points to wordpress-build
│   ├── package.json             ← Has buwp-local
│   ├── node_modules/
│   └── wordpress-build/          ← Full WordPress ← Mapped to container
│       ├── wp-admin/
│       ├── wp-content/
│       │   ├── plugins/
│       │   │   ├── bu-navigation/
│       │   │   ├── bu-slideshow/
│       │   │   └── ... (all plugins)
│       │   ├── themes/
│       │   │   └── ... (all themes)
│       │   └── mu-plugins/
│       ├── wp-includes/
│       └── wp-config.php

Container:
/var/www/html/  (→ entire wordpress-build directory)
```

**Configuration File (`~/projects/bu-sandbox-full/.buwp-local.json`):**

Using **relative path** to wordpress-build:
```json
{
  "projectName": "bu-sandbox-full",
  "hostname": "bu-sandbox-full.local",
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
      "local": "./wordpress-build",
      "container": "/var/www/html"
    }
  ],
  "env": {
    "WP_DEBUG": true,
    "XDEBUG": true
  }
}
```

Using **absolute path**:
```json
{
  "projectName": "bu-sandbox-full",
  "hostname": "bu-sandbox-full.local",
  "mappings": [
    {
      "local": "/Users/username/projects/bu-sandbox-full/wordpress-build",
      "container": "/var/www/html"
    }
  ]
}
```

### Setup Workflow

```bash
# 1. Create base camp directory
mkdir ~/projects/bu-sandbox-full
cd ~/projects/bu-sandbox-full

# 2. Build or clone full WordPress
# Method depends on your organization:
#   - Clone WordPress core
#   - Clone all BU plugins/themes into wp-content/
#   - Run any build scripts (composer, npm)
#   - Or: Copy from existing dev environment

# Example structure:
mkdir wordpress-build
cd wordpress-build
# ... set up WordPress core + all plugins/themes ...

# 3. Back to base camp, initialize npm and install buwp-local
cd ~/projects/bu-sandbox-full
npm init -y
npm install --save-dev @bostonuniversity/buwp-local

# 4. Initialize in sandbox mode
npx buwp-local init --sandbox

# 5. Edit .buwp-local.json to map wordpress-build
# (See example configuration above)

# 6. Start environment
npx buwp-local start

# 7. Open IDE with wordpress-build as project root
# Full WordPress codebase is now available for autocomplete
```

### When to Use

- ✅ Using advanced IDE (Zed, PHPStorm with deep inspection)
- ✅ Need autocomplete for WordPress core functions
- ✅ Debugging complex issues across plugins + core
- ✅ Want complete codebase navigation
- ✅ Willing to manage full WordPress build locally
- ✅ Have fast disk I/O (SSD recommended)

### Important Considerations

**WordPress Management:**
- You're responsible for build updates and maintenance

**Performance:**
- Largest mapping = slowest volume I/O on macOS
- Initial sync may take time (large file count)
- File watchers may struggle with large codebases
- Linux performs better than macOS for large mappings

### Xdebug Configuration

See [Pattern C in XDEBUG.md](XDEBUG.md#pattern-c-monolithic-sandbox) for complete IDE context pathMappings.

---

## Choosing a Pattern

### Quick Comparison Table

| Pattern | buwp-local Location | IDE Context | Setup | Volume Perf | Best For |
|---------|---------------------|-------------|-------|-------------|----------|
| **A: In-Repo** | Inside plugin/theme repo | Your code only | ⭐ Easy | ⭐⭐⭐ Fast | wp-env users, single repo |
| **B: Sandbox** | Separate base camp | Your repos only | ⭐⭐ Medium | ⭐⭐ Good | Multiple repos, teams |
| **C: Monolithic** | Separate base camp | Everything | ⭐⭐⭐⭐ Advanced | ⭐ Slower | Full IDE context |

### Recommendation by Scenario

**Coming from wp-env?** → Pattern A (familiar workflow)  
**Coming from VM sandbox?** → Pattern B (similar concept, better maintainability)  
**Multiple BU plugins to test?** → Pattern B (coordination from base camp)  
**Team development?** → Pattern B (shared base camp config)  
**Need WordPress core autocomplete?** → Pattern C (monolithic sandbox)  
**Single open-source plugin?** → Pattern A (self-contained repo)

You can mix patterns - some repos use Pattern A while others coordinate through Pattern B base camp.  

---

## Related Documentation

- **[XDEBUG.md](XDEBUG.md)** - Pattern-specific Xdebug configuration
- **[MULTI_PROJECT.md](MULTI_PROJECT.md)** - Isolated vs shared environment strategies
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Initial setup guide
- **[COMMANDS.md](COMMANDS.md)** - CLI reference
