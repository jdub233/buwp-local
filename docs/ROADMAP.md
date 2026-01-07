# Roadmap

Strategic direction and development priorities for buwp-local.

## Release History

### ✅ v0.5.x - Keychain & Credential Management (Complete)

**Status:** Shipped  

**Key Features:**
- macOS Keychain integration for secure credential storage
- Automatic hex decoding for large multiline credentials like Shibboleth keys and certs
- Credential validation on startup with interactive setup
- Multi-project support with isolated Docker volumes
- Smart initialization for plugins, themes, and mu-plugins

**Result:** Ready for production use by small development teams.

---

## v0.6.0 - Quality & Robustness
**Status:** Shipped  
**Focus:** Foundation improvements before team rollout

### Features in Development

1. **Credential Validation** ✅ (Complete)
   - Validates credentials before starting containers
   - Offers interactive setup if credentials missing
   - Clear error messages and guidance

2. **Documentation Consolidation** ✅ (Complete)
   - Reorganized docs in `/docs` directory
   - Comprehensive guides for all user levels
   - Architecture documentation for contributors

3. **Robust /etc/hosts Detection** ✅ (Complete)
   - Detects if hostname exists in `/etc/hosts` during start
   - Provides copy-paste sudo command if missing
   - Smart messaging (only shows once per project)
   - Non-blocking (user can continue without adding)

### Success Criteria
- ✅ Zero setup confusion for new users
- ✅ All common workflows documented
- ✅ Hostname setup guidance clear and actionable

**Status:** All v0.6.0 features complete. Ready for initial user rollout.

---

## Lessons Learned: /etc/hosts Management

### What We Built (v0.6.0)
The detection-only approach proved to be the right choice:
- **Non-intrusive** - Checks once, shows clear instructions
- **No sudo required** - Detection runs without elevated permissions
- **Smart persistence** - Doesn't nag on every start
- **User control** - Provides copy-paste command, user decides when to run

### Future Consideration: Automatic Management

**Library Identified:** [`hostile`](https://www.npmjs.com/package/hostile) npm package
- ~500k weekly downloads, well-maintained
- Cross-platform (macOS, Linux, Windows)
- Programmatic API: `hostile.set('127.0.0.1', 'hostname')`
- Sync and async methods available

**Why We're Not Implementing It Now:**

1. **Requires sudo** - Password prompt interrupts smooth startup flow
2. **Security sensitivity** - Modifying system files needs user trust
3. **Current solution works** - Detection + copy-paste is clear and effective
4. **Premature optimization** - Need real user feedback first

**If We Revisit (v0.8.0+):**

Implementation would be straightforward:
```javascript
import hostile from 'hostile';

// Add hostname (requires sudo, prompts for password)
hostile.set('127.0.0.1', config.hostname, (err) => {
  if (err) {
    // Fall back to manual instructions
  }
});

// Remove on destroy
hostile.remove('127.0.0.1', config.hostname);
```

**Decision criteria for future:**
- Do >50% of users request automatic management?
- Is sudo prompt acceptable to most users?
- Would opt-in flag (`autoManageHosts: true`) address concerns?
- Does it meaningfully improve onboarding over current approach?

**Current recommendation:** Gather feedback from Stage 1 users (2-3 developers) in December 2024. If hostname setup proves to be a friction point, revisit automatic management in Q1 2025.

---

## Incremental Functional Improvements: v0.6.x
**Status:** Shipped
**Focus:** Enhancements based on initial user experience

### Shipped in v0.6.1
- **Container Registry Assistance**
  - Guide users on setting up access to private registries (ghcr.io)
  - Automatic check for registry login or existing image on `start`

### Shipped in v0.6.2

- **Fix issues with spaces in paths**
  - Fix issues with spaces in host paths causing Docker errors

### Shipped for v0.6.3

- **Basic docs on existing Xdebug features**
  - Quickstart guide for enabling and using Xdebug in containers

- **Volume Mapping pattern guide**
  - Documentation on different volume mapping strategies for various development workflows

**Key Deliverables:**

1. **Volume Mapping Patterns Guide** ✅
   - Comprehensive [VOLUME_MAPPINGS.md](VOLUME_MAPPINGS.md) documenting 3 patterns:
     - **Pattern A:** In-Repo Development (self-contained, wp-env style)
     - **Pattern B:** Sandbox Coordination (base camp maps multiple repos)
     - **Pattern C:** Monolithic Sandbox (full WordPress for IDE context)
   - Based on real user workflows discovered during initial rollout
   - Decision trees, comparison tables, and migration guides
   - Advanced topics: switching patterns, hybrid setups, performance considerations

2. **Xdebug Configuration Guide** ✅
   - Comprehensive [XDEBUG.md](XDEBUG.md) with pattern-specific pathMappings
   - VSCode, PHPStorm, and Zed examples for each pattern
   - Multi-root workspace setup for Pattern B
   - Troubleshooting breakpoints, performance, and common issues

3. **Cross-Reference Documentation** ✅
   - Updated readme.md with links to new guides
   - Added callouts in MULTI_PROJECT.md pointing to Pattern B
   - Enhanced GETTING_STARTED.md next steps section
   - Improved discoverability across documentation

**Result:** Documentation now accurately reflects real-world development workflows, making it easier for new users to adopt appropriate patterns.

## Next Phase: v0.7.x - Developer Experience

**Status:** Ongoing 
**Focus:** Ease of use and visibility

### Shipped in v0.7.0
- **Docker Image Update Command** 🎯 (Proposed for v0.7.0)
  - **Problem:** Stopping and restarting containers reuses existing images; newer images aren't pulled
  - **Solution:** Add `buwp-local update` command that:
    - Pulls latest Docker images from registry
    - Recreates containers with new images
    - Preserves volumes (database, WordPress data)
  - **Benefit:** Safe, explicit way to apply WordPress/service updates without `destroy`
  - **Implementation:** Wrapper around `docker-compose pull && docker-compose up -d --force-recreate`

### Shipped in v0.7.1
- **Documentation Improvements**

### Potential Features

- **Database Security**
  - Check database access on db port (e.g. `localhost:3306`)
  - Consider more stringent default database passwords
  - The database can have restricted content in it, so we need to ensure that users are aware of this and take appropriate measures.

- **Xdebug Integration**
  - Command to help generate Xdebug configuration for IDEs (VSCode, Zed)
  - Documentation on usage patterns

- **Interactive setup assistant for adding volume mappings**
  - Guided prompts to add common volume mappings post-initialization
  - Suggestions based on detected project structure

- **Improved Windows and Linux support**
  - Multiplatform /etc/hosts hostname guide
  - Evaluate credential storage solutions for non-macOS platforms (https://www.npmjs.com/package/keytar)

- **Project Status & Listing**
  - Central tracking of all buwp-local projects in `~/.buwp-local/projects.json`
  - View all running projects: `buwp-local list`
  - Quick status checks: `buwp-local status`

- **Health Checks and Network Ports**
  - Verify services are running properly
  - Database connectivity validation
  - Clear diagnostics on failures
  - Advice and assistance on port conflicts

- **Improved Error Messages**
  - Docker startup failures → actionable solutions
  - Credential issues → clear next steps
  - Port conflicts → suggest alternatives

- **Multi project experience**
  - There is a problem when starting a new project when an existing project exists in docker but is stopped. When starting the new project, docker first starts the container for the stopped project for unknown reasons. If the new project uses the same ports, this causes conflicts. Need to investigate and resolve, projects should be isolated and not interfere with each other.

- **Docker Volume management assistant**
  - listing and cleanup of unused volumes

- **Unit tests**
  - Core modules (config, keychain, docker-compose)
  - Command tests (init, start, stop, destroy, wp)

### Prioritization
Will be informed by feedback from initial small group of users and actual pain points observed during rollout.

---

## Future Phases: v0.8.0+

**Status:** Conceptual  
**Timeline:** TBD based on team feedback

### Potential Features

- **Cross-Platform Support** - Windows WSL2 and Linux credential storage
- **SSL Certificate Generation** - Local HTTPS with mkcert
- **Real support for running on ports other than 443**
- **Potential GUI from Electron or SwiftUI**

**Note:** Automatic `/etc/hosts` management deferred pending user feedback. See "Lessons Learned" section above for details on the `hostile` library approach.

---

## Roadmap by User Stage

### Stage 1: Initial Users
**Users:** 1-3 developers  
**Goal:** Validate core functionality  
**Release:** v0.6.0  
**Focus:** Robustness, clear setup, good documentation

### Stage 2: Team Rollout
**Users:** 5-10 developers  
**Goal:** Find and fix real-world issues  
**Release:** v0.7.0+  
**Focus:** Developer experience, error handling

### Stage 3: Broader Adoption
**Users:** 20+ developers  
**Goal:** Self-service onboarding  
**Release:** v1.0.0+  
**Focus:** Advanced features, automation

---

## Technical Debt

### Testing
- Unit tests for core modules (config, keychain, docker-compose)
- Integration tests for Docker operations
- E2E tests for full workflows

### Documentation
- Troubleshooting guide for common issues
- FAQ section
- Video tutorials for setup

### Quality
- Standardized help for all CLI commands

---

## Decision Framework

Features will be prioritized based on:

1. **User Feedback** - What's actually blocking users?
2. **Adoption Impact** - Does it help onboard new users?
3. **Implementation Effort** - Can it be done quickly?
4. **Maintenance Burden** - Will it create ongoing support overhead?

---

## Technical Details

For detailed information about planned features, implementation approaches, and architecture decisions, see:

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Planned Features section
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes
