#!/usr/bin/env node

/**
 * buwp-local CLI
 * Main entry point for the BU WordPress Local development environment tool
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);

// Import commands
import startCommand from '../lib/commands/start.js';
import stopCommand from '../lib/commands/stop.js';
import destroyCommand from '../lib/commands/destroy.js';
import updateCommand from '../lib/commands/update.js';
import logsCommand from '../lib/commands/logs.js';
import wpCommand from '../lib/commands/wp.js';
import watchJobsCommand from '../lib/commands/watch-jobs.js';
import shellCommand from '../lib/commands/shell.js';
import configCommand from '../lib/commands/config.js';
import initCommand from '../lib/commands/init.js';
import keychainCommand from '../lib/commands/keychain.js';

const program = new Command();

program
  .name('buwp-local')
  .description('Local WordPress development environment for Boston University projects')
  .version(packageJson.version);

// Start command
program
  .command('start')
  .description('Start the local WordPress environment')
  .option('--xdebug', 'Enable Xdebug')
  .option('--no-s3', 'Disable S3 proxy service')
  .option('--no-redis', 'Disable Redis service')
  .action(startCommand);

// Stop command
program
  .command('stop')
  .description('Stop the local WordPress environment')
  .action(stopCommand);

// Destroy command
program
  .command('destroy')
  .description('Destroy the local WordPress environment (removes volumes)')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(destroyCommand);

// Update command
program
  .command('update')
  .description('Update Docker images and recreate containers')
  .option('--all', 'Update all service images (default: WordPress only)')
  .option('--preserve-wpbuild', 'Preserve existing WordPress volume (prevents core file updates)')
  .action(updateCommand);

// Logs command
program
  .command('logs')
  .description('View logs from the WordPress environment')
  .option('-f, --follow', 'Follow log output')
  .option('-s, --service <service>', 'Show logs for specific service (wordpress, db, s3proxy, redis)')
  .action(logsCommand);

// Config command
program
  .command('config')
  .description('Configuration management')
  .option('--init', 'Initialize configuration file')
  .option('--plugin', 'Initialize with plugin mapping (use with --init)')
  .option('--mu-plugin', 'Initialize with mu-plugin mapping (use with --init)')
  .option('--theme', 'Initialize with theme mapping (use with --init)')
  .option('--validate', 'Validate configuration file')
  .option('--show', 'Show resolved configuration')
  .action(configCommand);

// Init command (interactive configuration)
program
  .command('init')
  .description('Initialize configuration interactively')
  .option('--no-interactive', 'Use non-interactive mode with defaults')
  .option('--plugin', 'Non-interactive: initialize as plugin')
  .option('--mu-plugin', 'Non-interactive: initialize as mu-plugin')
  .option('--theme', 'Non-interactive: initialize as theme')
  .option('--sandbox', 'Non-interactive: initialize as sandbox')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(initCommand);

// WP-CLI proxy command
program
  .command('wp <args...>')
  .description('Run WP-CLI commands in the WordPress container')
  .allowUnknownOption()
  .action(wpCommand);

// Watch Jobs command
program
  .command('watch-jobs')
  .description('Watch and automatically process site-manager jobs')
  .option('--interval <seconds>', `Polling interval in seconds (default: 300, min: 30)`)
  .option('--quiet', 'Suppress output unless jobs are found')
  .action(watchJobsCommand);

// Shell command
program
  .command('shell')
  .description('Open an interactive bash shell in the WordPress container')
  .action(shellCommand);

// Keychain command
program
  .command('keychain <subcommand> [args...]')
  .description('Manage credentials in macOS keychain')
  .option('-f, --force', 'Skip confirmation prompts')
  .option('--file <path>', 'Read credential from file (for multiline content)')
  .option('--stdin', 'Read credential from stdin')
  .action((subcommand, args, options) => {
    keychainCommand(subcommand, args, options);
  });

// Error handling
program.exitOverride();

try {
  program.parse(process.argv);
} catch (err) {
  if (err.code === 'commander.help' || err.code === 'commander.version') {
    // Normal exit for help/version
    process.exit(0);
  }
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
