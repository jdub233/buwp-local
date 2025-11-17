#!/usr/bin/env node

/**
 * buwp-local CLI
 * Main entry point for the BU WordPress Local development environment tool
 */

const { Command } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

// Import commands
const startCommand = require('../lib/commands/start');
const stopCommand = require('../lib/commands/stop');
const destroyCommand = require('../lib/commands/destroy');
const logsCommand = require('../lib/commands/logs');
const wpCommand = require('../lib/commands/wp');
const configCommand = require('../lib/commands/config');

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

// WP-CLI proxy command
program
  .command('wp <args...>')
  .description('Run WP-CLI commands in the WordPress container')
  .allowUnknownOption()
  .action(wpCommand);

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
