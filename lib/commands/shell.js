/**
 * Shell command - Open an interactive bash shell in the WordPress container
 */

const chalk = require('chalk');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { loadConfig } = require('../config');

async function shellCommand(options) {
  console.log(chalk.blue('🐚 Opening interactive shell...\n'));

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
      spawnSync('docker', ['info'], { stdio: 'ignore' });
    } catch (err) {
      console.error(chalk.red('❌ Docker is not running.'));
      process.exit(1);
    }

    // Build docker compose exec command for interactive shell
    const composeDir = path.dirname(composePath);
    
    // Use spawnSync instead of execSync for proper TTY handling
    const result = spawnSync(
      'docker',
      [
        'compose',
        '-p', projectName,
        '-f', composePath,
        'exec',
        'wordpress',
        '/bin/bash'
      ],
      {
        cwd: composeDir,
        stdio: 'inherit',
        shell: false
      }
    );

    // Only show exit message if shell exited with error
    if (result.status !== 0 && result.status !== null) {
      console.log(chalk.yellow(`\n⚠️  Shell exited with code ${result.status}\n`));
    } else {
      console.log(chalk.gray('\n👋 Shell closed.\n'));
    }

  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

module.exports = shellCommand;
