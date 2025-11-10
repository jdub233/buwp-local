/**
 * Logs command - View logs from the WordPress environment
 */

const chalk = require('chalk');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function logsCommand(options) {
  console.log(chalk.blue('📋 Viewing logs...\n'));

  try {
    const projectPath = process.cwd();
    const composePath = path.join(projectPath, '.buwp-local', 'docker-compose.yml');

    // Check if docker-compose.yml exists
    if (!fs.existsSync(composePath)) {
      console.log(chalk.yellow('⚠️  No running environment found.'));
      console.log(chalk.gray('Run "buwp-local start" to create an environment.\n'));
      return;
    }

    // Check if Docker is running
    try {
      execSync('docker info', { stdio: 'ignore' });
    } catch (err) {
      console.error(chalk.red('❌ Docker is not running.'));
      process.exit(1);
    }

    // Build docker compose logs command
    const composeDir = path.dirname(composePath);
    let command = `docker compose -f ${composePath} logs`;

    if (options.follow) {
      command += ' -f';
    }

    if (options.service) {
      command += ` ${options.service}`;
    }

    // Execute logs command
    try {
      execSync(command, { 
        cwd: composeDir,
        stdio: 'inherit'
      });
    } catch (err) {
      // User likely pressed Ctrl+C to exit, which is expected
      console.log(chalk.gray('\nLogs closed.\n'));
    }

  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

module.exports = logsCommand;
