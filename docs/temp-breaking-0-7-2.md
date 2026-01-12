# Temporary Breaking Changes in v0.7.2

Version 0.7.2 unwinds a problem where the project name was being duplicated in the volume names, e.g. `projectname_projectname_wp_build`. This requires a one-time manual migration of your Docker volumes from the old names to the new names.

## Option 1: Simple Destruction and Recreation

If you don't need to preserve your database or any data in your WordPress volume, you can simply destroy and recreate your environment:

```bash
npx buwp-local destroy
npx buwp-local start
```

## Manual Migration Steps

If you want to preserve your database and WordPress volume, follow these steps to rename your Docker volumes:

```bash
# Stop environment
npx buwp-local stop

# Rename volumes manually
docker volume create projectname_db_data
docker volume create projectname_wp_build

# Copy data from old to new
docker run --rm -v projectname_projectname_db_data:/from -v projectname_db_data:/to alpine ash -c "cd /from && cp -av . /to"
docker run --rm -v projectname_projectname_wp_build:/from -v projectname_wp_build:/to alpine ash -c "cd /from && cp -av . /to"

# Update buwp-local and start
npm update @bostonuniversity/buwp-local
npx buwp-local start

# Verify, then remove old volumes
docker volume rm projectname_projectname_db_data projectname_projectname_wp_build

```