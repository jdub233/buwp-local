/**
 * Destroy command - Destroys the local WordPress environment (including volumes)
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { loadConfig } from '../config.js';

async function destroyCommand(options) {
  console.log(chalk.red('⚠️  DESTROY BU WordPress local environment\n'));

  try {
    const projectPath = process.cwd();
    const composePath = path.join(projectPath, '.buwp-local', 'docker-compose.yml');

    // Check if docker-compose.yml exists
    if (!fs.existsSync(composePath)) {
      console.log(chalk.yellow('⚠️  No environment found to destroy.\n'));
      return;
    }

    // Load config to get project name
    const config = loadConfig(projectPath);
    const projectName = config.projectName || 'buwp-local';

    // Confirm destruction unless --force flag is used
    if (!options.force) {
      const confirmed = await confirmDestroy(projectName);
      if (!confirmed) {
        console.log(chalk.gray('Destroy cancelled.\n'));
        return;
      }
    }

    // Check if Docker is running
    try {
      execSync('docker info', { stdio: 'ignore' });
    } catch (err) {
      console.error(chalk.red('❌ Docker is not running.'));
      process.exit(1);
    }

    // Destroy Docker Compose (down with volumes)
    console.log(chalk.gray('\nRemoving containers and volumes...\n'));
    const composeDir = path.dirname(composePath);
    
    try {
      // This is the actual docker compose down command that removes everything
      execSync(
        `docker compose -p ${projectName} -f ${composePath} down -v`,
        { 
          cwd: composeDir,
          stdio: 'inherit'
        }
      );
    } catch (err) {
      console.error(chalk.red('\n❌ Failed to destroy Docker environment'));
      process.exit(1);
    }

    console.log(chalk.green('\n✅ Environment destroyed successfully!\n'));
    console.log(chalk.gray('Use "buwp-local start" to create a fresh environment.\n'));

  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

/**
 * Prompt user for confirmation
 * @param {string} projectName - Name of the project being destroyed
 * @returns {Promise<boolean>}
 */
function confirmDestroy(projectName) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(chalk.yellow(`This will destroy project: ${chalk.bold(projectName)}`));
    console.log(chalk.yellow('  - Stop all containers'));
    console.log(chalk.yellow('  - Remove all containers'));
    console.log(chalk.yellow('  - Delete all volumes (including database data)\n'));

    rl.question(chalk.red('Are you sure you want to continue? (yes/no): '), (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

export default destroyCommand;
