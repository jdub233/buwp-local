# Changelog

All notable changes to buwp-local will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.2]

### Breaking Changes
- **Volume Naming Fix:** Corrected double-prefixing bug in Docker volume names
  - Old: `projectname_projectname_wp_build`
  - New: `projectname_wp_build`
  - **Migration required:** See [Migration Guide](docs/temp-breaking-0-7-2.md)

### Added
- `buwp-local update` now properly refreshes WordPress core files from new images
- `--preserve-wpbuild` flag to opt-out of WordPress volume refresh during updates

### Fixed
- Volume deletion during update now works correctly (containers released first)
- Docker Compose auto-prefixing no longer causes duplicated volume names

## [0.7.1]

Documentation only release.

## [0.7.0]

### Added
- **`update` command** - Pull latest Docker images and recreate containers without losing data
  - Pull WordPress image only by default (typical use case)
  - `--all` flag to update all service images (Redis, S3 proxy, etc.)
  - Safely applies security updates and WordPress core updates
  - Data preserved: Database, WordPress files, volume mappings

- **Non-interactive sandbox initialization** - Add `--sandbox` flag to `init` command for scripted setup of sandbox-type projects

### Changed
- **`init` command** - Now supports `--sandbox` flag for non-interactive initialization

## [0.6.3]

### Added
- Documentation for volume mapping and xdebug

## [0.6.2]

### Fixed
- **Project paths with spaces** - Fixed shell command construction to properly quote Docker Compose file paths when project directory contains spaces
- Prevents shell word-splitting errors like `unknown docker command: "compose folder/..."`
- All Docker Compose commands (`start`, `stop`, `destroy`, `logs`, `wp`) now correctly handle paths with spaces and special characters

### Changed
- Volume mapping generation now uses cleaner functional programming pattern with `map()` and spread operator
- Improved code readability in `generateWordPressService()` by isolating volume mapping transformation

## [0.6.1]

### Added
- Container registry accessibility check on `start` command
- Automatic Docker image pull with helpful authentication guidance
- GitHub Packages authentication assistance when image access is denied

### Fixed
- Clear error messages for registry authentication failures with actionable next steps

## [0.6.0]

### Added
- Credential validation on `start` command with interactive setup prompt
- Documentation consolidation in `docs/` directory
- Comprehensive guides: GETTING_STARTED.md, COMMANDS.md, CREDENTIALS.md, MULTI_PROJECT.md, ARCHITECTURE.md
- Robust `/etc/hosts` detection with smart one-time warnings
- VM Sandbox migration guide highlighting architectural advantages

## [0.5.3]

### Fixed
- Fixed newline escaping in `createSecureTempEnvFile()` to properly handle multiline credentials
- Changed regex from `/\\n/g` to `/\n/g` to escape actual newline characters instead of literal backslash-n strings

### Changed
- Improved temp env file generation to correctly format multiline values for Docker Compose

## [0.5.2]

### Added
- Automatic hex decoding for legacy multiline credentials in Keychain
- `isHexEncoded()` helper function to detect hex-encoded credential values
- Transparent decoding of Shibboleth certificates and keys stored as hex strings

### Fixed
- SHIB_SP_KEY and SHIB_SP_CERT now properly decode from hex format when retrieved from Keychain
- Credentials that were stored as "2d2d2d2d2d..." now correctly appear as "-----BEGIN..."

## [0.5.1]

### Added
- Source file deletion prompt after successful Keychain import
- `promptToDeleteSourceFile()` function for secure cleanup of plaintext credential files
- Security improvement to reduce attack surface by removing credential files after import

### Changed
- `keychain setup` command now prompts to delete source JSON file after successful import
- Enhanced security workflow for credential management

## [0.5.0]

### Added
- **macOS Keychain integration** for secure credential storage
- `keychain` command group with subcommands:
  - `setup --file <path>` - Import credentials from JSON file
  - `get <name>` - Retrieve specific credential
  - `set <name> <value>` - Update or create credential
  - `delete <name>` - Remove credential
  - `list` - Show all stored credentials
  - `test` - Verify Keychain access
- Hybrid credential loading: `.env.local` overrides Keychain
- Secure temporary environment file generation with 0600 permissions
- Automatic cleanup of temporary credential files

### Changed
- Credential loading now checks `.env.local` first, then falls back to Keychain
- Enhanced security model with encrypted credential storage
- Improved documentation for credential management workflows

### Security
- Credentials no longer require plaintext `.env.local` files in every project
- Global credential storage in macOS Keychain with encryption
- Temporary files used for Docker Compose with strict permissions

## [0.4.0]

### Added
- Interactive `init` command with guided setup wizard
- Smart project type detection (plugin, theme, mu-plugin, sandbox)
- Real-time input validation during interactive setup
- Automatic volume mapping generation based on project type
- Non-interactive mode with `--plugin`, `--mu-plugin`, `--theme` flags

### Changed
- Replaced `config --init` with dedicated `init` command
- Enhanced user experience with prompts library
- Improved default value suggestions

## [0.3.0]

### Added
- Multi-project support with unique project names
- Isolated Docker volumes per project (`{projectName}_db_data`, `{projectName}_wp_build`)
- Automatic project name generation from directory name
- Support for running multiple projects simultaneously
- Shared environment strategy (same projectName across repos)

### Changed
- Docker Compose now uses `--project-name` flag for isolation
- Volume names include project identifier
- Container names prefixed with project name

### Fixed
- Port conflicts between multiple running projects
- Database conflicts when running multiple instances

## [0.2.0]

### Added
- `wp` command for WP-CLI proxy
- Support for all WP-CLI commands via pass-through
- `logs` command with service filtering
- `--follow` flag for real-time log streaming
- Configuration validation with `config --validate`
- Configuration display with `config --show` (credentials masked)

### Changed
- Improved error messages for Docker failures
- Enhanced logging output with timestamps
- Better handling of missing Docker dependencies

## [0.1.0]

### Added
- Initial release of buwp-local CLI tool
- Basic Docker Compose generation and management
- `start`, `stop`, `destroy` commands
- Configuration file support (`.buwp-local.json`)
- Environment variable support (`.env.local`)
- Service toggles for Redis, S3 proxy, Shibboleth
- Port configuration (HTTP, HTTPS, database, Redis)
- Volume mappings for local code
- Support for BU WordPress Docker image
- MySQL 8.0 database service
- Redis cache service (optional)
- S3 proxy service (optional)
- Shibboleth SSO integration (optional)

### Documentation
- Basic README with quickstart guide
- Usage documentation with examples
- Configuration reference
- Environment variable documentation

---

## Version History

- **0.5.x** - Keychain integration and credential management enhancements
- **0.4.x** - Interactive initialization and improved UX
- **0.3.x** - Multi-project support and isolation
- **0.2.x** - WP-CLI integration and enhanced commands
- **0.1.x** - Initial release with core functionality
