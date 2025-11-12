# Quick Reference - New Features

## Smart Initialization

### Plugin Development
```bash
cd your-plugin-directory
buwp-local config --init --plugin
```
Auto-creates: `./` → `/var/www/html/wp-content/plugins/your-plugin-directory`

### Theme Development
```bash
cd your-theme-directory
buwp-local config --init --theme
```
Auto-creates: `./` → `/var/www/html/wp-content/themes/your-theme-directory`

### MU-Plugin Development
```bash
cd your-mu-plugin-directory
buwp-local config --init --mu-plugin
```
Auto-creates: `./` → `/var/www/html/wp-content/mu-plugins/your-mu-plugin-directory`

---

## Multi-Project Setup

### Quick Start - 3 Projects
```bash
# Project 1 (default ports)
cd ~/projects/plugin-a
buwp-local config --init --plugin
buwp-local start

# Project 2 (different ports)
cd ~/projects/plugin-b
buwp-local config --init --plugin
# Edit .buwp-local.json - change http: 8081, db: 3308, redis: 6381
buwp-local start

# Project 3 (different ports)
cd ~/projects/theme-c
buwp-local config --init --theme
# Edit .buwp-local.json - change http: 8082, db: 3309, redis: 6382
buwp-local start
```

### Add Hostnames
```bash
sudo bash -c 'cat >> /etc/hosts << EOF
127.0.0.1 plugin-a.local
127.0.0.1 plugin-b.local
127.0.0.1 theme-c.local
EOF'
```

### Access Your Sites
- http://plugin-a.local
- http://plugin-b.local:8081
- http://theme-c.local:8082

---

## Shared Environment (Centralized Sandbox)

### Multiple Repos, One WordPress

Set the **same `projectName`** in multiple repos to share one environment:

```bash
# Plugin A
cd ~/projects/plugin-a
buwp-local config --init --plugin
# Edit .buwp-local.json: "projectName": "bu-sandbox"
buwp-local start

# Plugin B (joins same environment)
cd ~/projects/plugin-b
buwp-local config --init --plugin
# Edit .buwp-local.json: "projectName": "bu-sandbox"  # SAME!
buwp-local start

# Both plugins now in same WordPress at http://bu-sandbox.local
```

### When to Use

**Isolated (Different projectName):**
- Solo development
- Independent testing
- Need clean slate

**Shared (Same projectName):**
- Integration testing
- Team collaboration
- Plugin interactions
- Full-stack development

See `SHARED_ENVIRONMENT_EXAMPLES.md` for detailed examples.

---

## Key Concepts

### Project Names
- **Auto-generated** from directory name
- **Sanitized** for Docker (lowercase, alphanumeric + dash/underscore)
- **Shows in Docker Desktop** for easy identification

### Volume Isolation
Each project gets its own:
- `{projectName}_db_data` - Database
- `{projectName}_wp_build` - WordPress files

### Port Configuration
Default ports:
```json
{
  "ports": {
    "http": 80,
    "https": 443,
    "db": 3306,
    "redis": 6379
  }
}
```

For multiple projects, change to avoid conflicts:
```json
{
  "ports": {
    "http": 8081,
    "https": 8444,
    "db": 3308,
    "redis": 6381
  }
}
```

---

## Common Commands

```bash
# Initialize with smart mapping
buwp-local config --init --plugin

# Start project
buwp-local start

# Stop project (keeps data)
buwp-local stop

# View logs
buwp-local logs -f

# Destroy project (deletes data)
buwp-local destroy

# Show configuration
buwp-local config --show

# Validate configuration
buwp-local config --validate
```

---

## Troubleshooting

### Port Already in Use
Edit `.buwp-local.json`:
```json
{
  "ports": {
    "http": 8081,  // Change from 80
    "db": 3308     // Change from 3306
  }
}
```

### Project Name Conflict
Edit `.buwp-local.json`:
```json
{
  "projectName": "my-unique-name"
}
```

### Check Active Projects
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### List All Volumes
```bash
docker volume ls | grep -E '(db_data|wp_build)'
```

---

## Best Practices

✅ Use smart init flags (`--plugin`, `--theme`, `--mu-plugin`)  
✅ Use descriptive directory names (they become project names)  
✅ Keep `.env.local` secret (never commit)  
✅ Assign unique ports for each project  
✅ Document your port assignments  
✅ Add all hostnames to `/etc/hosts`

---

## What's New

| Feature | Before | Now |
|---------|--------|-----|
| **Project Naming** | All projects called "buwp-local" | Each project has unique name |
| **Docker Desktop** | Can't distinguish projects | Clear project separation |
| **Database** | Shared between all projects | Isolated per project |
| **Volume Management** | Shared `db_data` and `wp_build` | Project-specific volumes |
| **Multi-Project** | ❌ Second project overwrites first | ✅ Multiple projects run together |
| **Configuration** | Manual path typing | Auto-generated smart mappings |
| **Setup Time** | ~5 minutes | ~30 seconds |
