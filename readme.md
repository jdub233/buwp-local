# BU WordPress Local Development

This repository contains resources and instructions for setting up a local WordPress development environment for Boston University projects. It uses the BU WordPress container image and provides the additional resources needed to run it locally with Docker.


## Quickstart for plugin or theme development

1. **Install Docker**: Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running on your machine.

2. Login to GitHub Packages to access the BU WordPress Docker image (you will need a GitHub access token with `read:packages` scope):

   ```bash
   echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
   ```

3. **Install buwp-local CLI**: Install the `buwp-local` CLI tool in your project directory:

   ```bash
   npm install @bostonuniversity/buwp-local --save-dev
   ```

4. **One time credential keychain setup**: Install credentials in the macOS Keychain for secure storage (optional, macOS only right now):

    First, download a credentials JSON file through ssh from the dev server:

    ```bash
    scp user@devserver:/path/to/buwp-local-credentials.json ~/Downloads/
    ```

    Then run the setup command:

    ```bash
    npx buwp-local keychain setup --file ~/Downloads/buwp-local-credentials.json
    ```

    This will store all necessary credentials in your Keychain for future use, for this project and any other buwp-local projects (Keychain is global). (The global Keychain can also be overridden by `.env.local` files in each project.)

5. **Initialize your project**: Run the interactive setup to create your `.buwp-local.json` configuration file:

    ```bash
    npx buwp-local init
    ```

    This will guide you through setting up your project name, hostname, port mappings, volume mappings, and service options.

    If you choose plugin, theme, or mu-plugin project type, the setup will automatically add volume mappings for your current directory into the appropriate WordPress location in the container.

    If you choose sandbox project type, you will need to manually add volume mappings to your `.buwp-local.json` file later, or you can run without any volume mappings.

6. **Setup local hostname**: Add your project's local hostname (e.g. `myproject.local`) to your `/etc/hosts` file

7. **Start your local environment**:

    ```bash
    npx buwp-local start
    ```

    This will read your configuration, load credentials from Keychain (or `.env.local` if present), and start the Docker containers for your WordPress project.

Your local WordPress site should now be accessible at the hostname you configured (e.g. `http://myproject.local`).

## Basic Local setup


1. **Setup local user**: Create a local WordPress user and add it to the super admin role:

    If running with Shibboleth enabled, you can set up a local WordPress user with super admin privileges:

    Create the user:
    ```bash
    npx buwp-local wp user create username username@bu.edu --role=administrator
    ```

    Promote to super admin:
    ```bash
    npx buwp-local wp super-admin add username@bu.edu
    ```
2. Pull snapshot site content:

    You can pull a snapshot of the production or staging site database and media files into your local environment for testing and development.

    ```bash
    npx buwp-local wp site-manager snapshot-pull --source=https://www.bu.edu/admissions/ --destination=http://myproject.local/admissions
    ```

    This will download the latest snapshot from the specified source and import it into your local WordPress environment.

## Documentation

- 📘 [Getting Started Guide](docs/GETTING_STARTED.md)
- 📖 [Command Reference](docs/COMMANDS.md)
- 🔐 [Credential Management](docs/CREDENTIALS.md)
- 🏗️ [Architecture](docs/ARCHITECTURE.md) (for contributors)

## Features

- ✅ One-time credential setup with macOS Keychain
- ✅ Isolated environments for multiple projects
- ✅ Pre-configured BU infrastructure (Shibboleth, S3, Redis)
- ✅ Smart initialization for plugins, themes, and mu-plugins
- ✅ Volume mapping for live code sync
- ✅ Xdebug support for step debugging
