/**
 * WP-CLI proxy command - Execute WP-CLI commands in the WordPress container
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { loadConfig } from '../config.js';

async function wpCommand(args, _options) {
  try {
    const projectPath = process.cwd();
    const composePath = path.join(projectPath, '.buwp-local', 'docker-compose.yml');

    // Check if docker-compose.yml exists
    if (!fs.existsSync(composePath)) {
      console.log(chalk.yellow('⚠️  No running environment found.'));
      console.log(chalk.gray('Run "buwp-local start" to create an environment.\n'));
      return;
    }

    // Load config to get project name
    const config = loadConfig(projectPath);
    const projectName = config.projectName || 'buwp-local';

    // Check if Docker is running
    try {
      execSync('docker info', { stdio: 'ignore' });
    } catch (err) {
      console.error(chalk.red('❌ Docker is not running.'));
      process.exit(1);
    }

    // Build docker compose exec command for WP-CLI
    const composeDir = path.dirname(composePath);
    const wpArgs = args.join(' ');
    const command = `docker compose -p ${projectName} -f "${composePath}" exec wordpress wp ${wpArgs}`;

    // Execute WP-CLI command
    try {
      execSync(command, { 
        cwd: composeDir,
        stdio: 'inherit'
      });
    } catch (err) {
      // WP-CLI may exit with error codes (e.g., failed import), don't exit harshly
      // The error output is already shown via stdio: 'inherit'
    }

  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

export default wpCommand;
