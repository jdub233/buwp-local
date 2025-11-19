/**
 * Stop command - Stops the local WordPress environment
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { loadConfig } from '../config.js';

async function stopCommand() {
  console.log(chalk.blue('🛑 Stopping BU WordPress local environment...\n'));

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

    // Stop Docker Compose
    const composeDir = path.dirname(composePath);
    
    try {
      execSync(
        `docker compose -p ${projectName} -f ${composePath} stop`,
        { 
          cwd: composeDir,
          stdio: 'inherit'
        }
      );
    } catch (err) {
      console.error(chalk.red('\n❌ Failed to stop Docker containers'));
      process.exit(1);
    }

    console.log(chalk.green('\n✅ Environment stopped successfully!\n'));
    console.log(chalk.gray('Use "buwp-local start" to start it again.\n'));

  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

export default stopCommand;
