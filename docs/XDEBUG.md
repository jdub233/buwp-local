# Xdebug Setup Guide

Xdebug configuration depends on your [volume mapping pattern](VOLUME_MAPPINGS.md). The key principle: **pathMappings must match your volume mappings exactly**.

## Quick Start

1. **Enable Xdebug** in `.buwp-local.json`:
```json
"env": {
  "XDEBUG": true
}
```

2. **Restart environment** to apply changes:
```bash
npx buwp-local stop
npx buwp-local start
```

3. **Configure pathMappings** using the pattern-specific examples below.

---

## Pattern A: In-Repo Development

**Scenario:** buwp-local lives inside your plugin/theme repo (like wp-env).

**Volume mapping:**
```json
"mappings": [
  {
    "local": ".",
    "container": "/var/www/html/wp-content/plugins/bu-navigation"
  }
]
```

### VSCode Configuration

Create `.vscode/launch.json` in your plugin/theme repo:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Listen for Xdebug (Pattern A)",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "pathMappings": {
        "/var/www/html/wp-content/plugins/bu-navigation": "${workspaceRoot}"
      }
    }
  ]
}
```

### PHPStorm Configuration

1. Go to **Run → Edit Configurations**
2. Add **PHP Remote Debug** configuration
3. Set **Server** configuration:
   - Host: `localhost`
   - Port: `9003`
   - Debugger: `Xdebug`
4. Add **Path mapping**:
   - Local: `/path/to/bu-navigation` (your repo root)
   - Remote: `/var/www/html/wp-content/plugins/bu-navigation`

### Zed Configuration

Create `.zed/tasks.json`:

```json
{
  "xdebug": {
    "type": "php",
    "pathMappings": {
      "/var/www/html/wp-content/plugins/bu-navigation": "."
    }
  }
}
```

---

## Pattern B: Sandbox Coordination

**Scenario:** Base camp directory maps multiple plugin/theme repos.

**Volume mapping:**
```json
"mappings": [
  {
    "local": "/Users/jaydub/projects/bu-navigation",
    "container": "/var/www/html/wp-content/plugins/bu-navigation"
  },
  {
    "local": "/Users/jaydub/projects/bu-slideshow",
    "container": "/var/www/html/wp-content/plugins/bu-slideshow"
  }
]
```

### VSCode Multi-Root Workspace

Create a **workspace file** (e.g., `bu-plugins.code-workspace`) to include all repos:

```json
{
  "folders": [
    { "path": "../bu-navigation" },
    { "path": "../bu-slideshow" }
  ],
  "settings": {},
  "launch": {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "Listen for Xdebug (Pattern B)",
        "type": "php",
        "request": "launch",
        "port": 9003,
        "pathMappings": {
          "/var/www/html/wp-content/plugins/bu-navigation": "${workspaceFolder:bu-navigation}",
          "/var/www/html/wp-content/plugins/bu-slideshow": "${workspaceFolder:bu-slideshow}"
        }
      }
    ]
  }
}
```

**Usage:**
1. Open the `.code-workspace` file in VSCode
2. All mapped repos will be available in the sidebar
3. Set breakpoints in any repo
4. Start debugging with F5

### PHPStorm Multi-Module Setup

1. Open PHPStorm, go to **File → Project Structure**
2. Add each repo as a **Module**
3. Configure **Run → Edit Configurations → PHP Remote Debug**
4. Add path mappings for each repo:
   - `/Users/jaydub/projects/bu-navigation` → `/var/www/html/wp-content/plugins/bu-navigation`
   - `/Users/jaydub/projects/bu-slideshow` → `/var/www/html/wp-content/plugins/bu-slideshow`

### Zed Workspace

Zed doesn't have multi-root workspace concept. Open each repo separately and configure individually (Pattern A style for each).

---

## Pattern C: Monolithic Sandbox

**Scenario:** Base camp maps entire WordPress installation for complete IDE context.

**Volume mapping:**
```json
"mappings": [
  {
    "local": "/Users/jaydub/wordpress-builds/bu-prod",
    "container": "/var/www/html"
  }
]
```

### VSCode Configuration

Create `.vscode/launch.json` in your WordPress build directory:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Listen for Xdebug (Pattern C)",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "pathMappings": {
        "/var/www/html": "${workspaceRoot}"
      }
    }
  ]
}
```

**Advantages:**
- Single path mapping (simpler)
- Full WordPress context in IDE
- Go-to-definition works across all code
- Autocomplete for WordPress core

**Trade-offs:**
- Slower volume performance on macOS
- Larger IDE project (may be slower)
- Must manage entire WordPress build

### PHPStorm Configuration

1. Open the WordPress build directory as your project root
2. Configure **PHP Remote Debug**
3. Add single path mapping:
   - Local: `/Users/jaydub/wordpress-builds/bu-prod`
   - Remote: `/var/www/html`

### Zed Configuration

Create `.zed/tasks.json` in WordPress root:

```json
{
  "xdebug": {
    "type": "php",
    "pathMappings": {
      "/var/www/html": "."
    }
  }
}
```

---

## Common Setup Steps (All Patterns)

### Install PHP Debug Extension (VSCode)

1. Open VSCode Extensions (Cmd+Shift+X)
2. Search for "PHP Debug"
3. Install: https://marketplace.visualstudio.com/items?itemName=xdebug.php-debug

### Start Debugging

1. **Set breakpoint** in your PHP file (click left gutter)
2. **Start debug listener** (F5 or Run → Start Debugging)
3. **Trigger code** in browser (reload page, submit form, etc.)
4. **Debugger pauses** at breakpoint

### Verify Xdebug is Running

```bash
# Check Xdebug is loaded
npx buwp-local wp eval 'phpinfo();' | grep -i xdebug

# Or via shell
npx buwp-local shell
php -v  # Should show "with Xdebug"
```

---

## Alternative: VSCode Remote Container Debugging

An alternative to volume mapping is to use VSCode's **Dev Containers** extension to open the entire WordPress container directly in VSCode.  PhpStorm also has a similar feature (Zed does not currently support this).

### How It Works

Instead of syncing code via volume mappings, you open VSCode **inside the container** and edit/debug directly there:

1. Start buwp-local (any pattern, even without volume mappings)
2. Right-click the running container in VSCode Docker explorer
3. Select "Attach Visual Studio Code"
4. VSCode opens inside the container with full filesystem access
5. Set breakpoints and debug the entire build

### When to Use This

- ✅ Experimental edits (don't need to persist locally)
- ✅ Full WordPress core context needed (like Pattern C)
- ✅ Stepping through entire codebase quickly
- ✅ Learning/exploring the build

### Setup

1. **Install Remote Containers Extension** (if not already installed)
   - Open VSCode Extensions (Cmd+Shift+X)
   - Search for "Remote - Containers"
   - Install: https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers

2. **Start your environment**
   ```bash
   npx buwp-local start
   ```

3. **Open container in VSCode**
   - Click **Containers** (sidebar)
   - Open the buwp-local project in the Containers list
   - Right-click on the WordPress container → **Attach Visual Studio Code**

4. **Install Extensions and Configure Debugging in container**
    - Install PHP Debug extension inside the container VSCode
    - Create `.vscode/launch.json` with pathMappings as needed (usually just `/var/www/html` to `.`)

### Advantages vs Volume Mapping

| Aspect | Volume Mapping | Remote Container |
|--------|---|---|
| **IDE Context** | Pattern-dependent | Full codebase always |
| **Persistence** | Changes stay local | Temporary only |
| **Performance** | Fast (local) | Slower (Docker I/O) |
| **Best For** | Production code changes | Experimental debugging |

### When NOT to Use This

- ❌ Changes you need to keep locally (use volume mapping instead)

---

## Troubleshooting

### Breakpoints Not Hit

**Check pathMappings match your volume mappings:**

```bash
# View your volume mappings
npx buwp-local config --show

# Ensure pathMappings in launch.json match exactly
```

**Common mistakes:**
- Pattern A: Using `/var/www/html` instead of full plugin path
- Pattern B: Missing mappings for some repos
- Pattern C: Wrong workspace root

### "Cannot Find File" Errors

**VSCode shows:** "Could not find file /var/www/html/..."

**Solution:** Your local file path doesn't match the pathMapping. Check:
1. Is VSCode workspace root correct?
2. Does `${workspaceRoot}` resolve to the right path?
3. For Pattern B, are you using multi-root workspace?

### Performance Issues

**Xdebug can slow page loads significantly.**

**Solutions:**
- Disable Xdebug when not actively debugging
- Use conditional breakpoints sparingly
- Pattern C is slower than A/B due to larger volume mapping

### Port Already in Use

**Error:** "Port 9003 already in use"

**Solution:**
```bash
# Find process using port 9003
lsof -i :9003

# Kill if needed
kill -9 <PID>

# Or change Xdebug port in launch.json and container config
```

---

## Advanced Configuration

### Conditional Breakpoints

Right-click breakpoint in VSCode → Edit Breakpoint → Add expression:

```php
$post_id === 123
```

### Step Debugging WP-CLI Commands

```bash
# Enable Xdebug for CLI
npx buwp-local wp --allow-root eval 'xdebug_break();'

# Or set environment variable
npx buwp-local shell
export XDEBUG_SESSION=1
wp plugin list
```

### Remote Debugging from Browser

Install Xdebug browser extension:
- Chrome: [Xdebug Helper](https://chrome.google.com/webstore/detail/xdebug-helper)
- Firefox: [Xdebug Helper](https://addons.mozilla.org/en-US/firefox/addon/xdebug-helper-for-firefox/)

Click extension icon → Enable debugging → Reload page.

---

## Pattern-Specific Tips

### Pattern A (In-Repo)
- ✅ Simplest pathMapping setup
- ❌ No WordPress core debugging
- 💡 Use [php-stubs/wordpress-stubs](https://github.com/php-stubs/wordpress-stubs) for autocomplete

### Pattern B (Sandbox)
- ✅ Debug multiple repos simultaneously
- ⚠️ Requires multi-root workspace in VSCode
- 💡 Create `.code-workspace` file for team to share

### Pattern C (Monolithic)
- ✅ Debug WordPress core, plugins, themes all together
- ✅ Full IDE context (go-to-definition everywhere)
- ⚠️ Larger project, slower performance on macOS
- 💡 Use sparse checkout to reduce repo size

---

## Related Documentation

- **[VOLUME_MAPPINGS.md](VOLUME_MAPPINGS.md)** - Complete guide to volume mapping patterns
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Initial setup guide
- **[COMMANDS.md](COMMANDS.md)** - CLI reference

---

## References

- [Xdebug Documentation](https://xdebug.org/docs/)
- [VSCode PHP Debugging](https://code.visualstudio.com/docs/languages/php)
- [PHPStorm Xdebug Guide](https://www.jetbrains.com/help/phpstorm/configuring-xdebug.html)
