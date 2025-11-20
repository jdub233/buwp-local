/**
 * Start command - Starts the local WordPress environment
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { loadConfig, validateConfig, ENV_FILE_NAME } from '../config.js';
import { generateComposeFile } from '../compose-generator.js';

async function startCommand(options) {
  console.log(chalk.blue('🚀 Starting BU WordPress local environment...\n'));

  try {
    // Load configuration
    const projectPath = process.cwd();
    let config = loadConfig(projectPath);

    // Apply command-line options
    if (options.xdebug) {
      config.env = config.env || {};
      config.env.XDEBUG = true;
    }

    if (options.s3 === false) {
      config.services.s3proxy = false;
    }

    if (options.redis === false) {
      config.services.redis = false;
    }

    // Validate configuration
    console.log(chalk.gray('Validating configuration...'));
    const validation = validateConfig(config);
    
    if (!validation.valid) {
      console.error(chalk.red('\n❌ Configuration validation failed:'));
      validation.errors.forEach(error => {
        console.error(chalk.red(`  - ${error}`));
      });
      process.exit(1);
    }

    // Generate docker-compose.yml
    console.log(chalk.gray('Generating docker-compose.yml...'));
    const composePath = generateComposeFile(config, projectPath);
    console.log(chalk.green(`✓ Generated ${composePath}\n`));

    // Check if Docker is running
    try {
      execSync('docker info', { stdio: 'ignore' });
    } catch (err) {
      console.error(chalk.red('❌ Docker is not running. Please start Docker Desktop and try again.'));
      process.exit(1);
    }

    // Start Docker Compose
    console.log(chalk.gray('Starting Docker containers...\n'));
    const composeDir = path.dirname(composePath);
    const projectName = config.projectName || 'buwp-local';
    
    // Check if .env.local exists and build env-file flag
    const envFilePath = path.join(projectPath, ENV_FILE_NAME);
    const envFileFlag = fs.existsSync(envFilePath) ? `--env-file ${envFilePath}` : '';
    
    try {
      execSync(
        `docker compose -p ${projectName} ${envFileFlag} -f ${composePath} up -d`,
        { 
          cwd: composeDir,
          stdio: 'inherit'
        }
      );
    } catch (err) {
      console.error(chalk.red('\n❌ Failed to start Docker containers'));
      process.exit(1);
    }

    // Success message
    console.log(chalk.green('\n✅ Environment started successfully!\n'));
    console.log(chalk.cyan(`Project: ${projectName}`));
    console.log(chalk.cyan('Access your site at:'));
    console.log(chalk.white(`  http://${config.hostname}`));
    console.log(chalk.white(`  https://${config.hostname}\n`));
    
    console.log(chalk.gray('Useful commands:'));
    console.log(chalk.white('  buwp-local logs    - View logs'));
    console.log(chalk.white('  buwp-local stop    - Stop environment'));
    console.log(chalk.white('  buwp-local destroy - Remove environment\n'));

    // Reminder about /etc/hosts
    console.log(chalk.yellow('⚠️  Remember to add this to your /etc/hosts file:'));
    console.log(chalk.white(`  127.0.0.1 ${config.hostname}\n`));

  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

export default startCommand;
