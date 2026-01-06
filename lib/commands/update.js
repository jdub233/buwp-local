/**
 * Update command - Updates Docker images and recreates containers
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { loadConfig, loadKeychainCredentials, createSecureTempEnvFile, secureDeleteTempEnvFile, ENV_FILE_NAME } from '../config.js';

async function updateCommand(options = {}) {
  console.log(chalk.blue('🔄 Updating Docker images...\n'));

  try {
    const projectPath = process.cwd();
    const composePath = path.join(projectPath, '.buwp-local', 'docker-compose.yml');
    const composeDir = path.dirname(composePath);
    const envFilePath = path.join(projectPath, ENV_FILE_NAME);

    // Check if docker-compose.yml exists
    if (!fs.existsSync(composePath)) {
      console.log(chalk.yellow('⚠️  No environment found.'));
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
      console.error(chalk.red('❌ Docker is not running'));
      console.log(chalk.gray('Please start Docker Desktop and try again.\n'));
      process.exit(1);
    }

    // Determine which services to pull
    const pullAll = options.all || false;
    const imageFilter = pullAll ? '' : 'wordpress';
    
    // Step 1: Pull images (WordPress only by default, or all with --all flag)
    console.log(chalk.cyan(pullAll ? '📥 Pulling all Docker images...' : '📥 Pulling WordPress image...'));
    try {
      execSync(
        `docker compose -p ${projectName} -f "${composePath}" pull ${imageFilter}`,
        {
          cwd: composeDir,
          stdio: 'inherit'
        }
      );
    } catch (err) {
      console.error(chalk.red('\n❌ Failed to pull Docker images'));
      console.log(chalk.gray('Check your Docker registry credentials and network connection.\n'));
      process.exit(1);
    }

    // Step 2: Recreate containers with new images (preserves volumes)
    // Need to pass environment variables just like start command does
    console.log(chalk.cyan('\n🔨 Recreating containers with new images...'));
    
    // Load keychain credentials and create secure temp env file if available
    let tempEnvPath = null;
    const finalKeychainCredentials = loadKeychainCredentials();
    const keychainCredCount = Object.keys(finalKeychainCredentials).length;
    
    if (keychainCredCount > 0) {
      try {
        tempEnvPath = createSecureTempEnvFile(finalKeychainCredentials, projectName);
      } catch (err) {
        console.warn(chalk.yellow(`⚠️  Could not load keychain credentials: ${err.message}`));
      }
    }
    
    // Build env-file flags
    const envFileFlag = fs.existsSync(envFilePath) ? `--env-file ${envFilePath}` : '';
    const tempEnvFileFlag = tempEnvPath ? `--env-file ${tempEnvPath}` : '';
    
    try {
      execSync(
        `docker compose -p ${projectName} ${tempEnvFileFlag} ${envFileFlag} -f "${composePath}" up -d --force-recreate`,
        {
          cwd: composeDir,
          stdio: 'inherit'
        }
      );
    } catch (err) {
      console.error(chalk.red('\n❌ Failed to recreate containers'));
      process.exit(1);
    } finally {
      // Always clean up temp env file
      if (tempEnvPath) {
        secureDeleteTempEnvFile(tempEnvPath);
      }
    }

    // Success message
    console.log(chalk.green('\n✅ Update complete!\n'));
    console.log(chalk.gray('Preserved:'));
    console.log(chalk.gray('  ✓ Database and WordPress data'));
    console.log(chalk.gray('  ✓ Volume mappings and configuration\n'));
    console.log(chalk.cyan('Access your site at:'));
    console.log(chalk.white(`  https://${config.hostname}\n`));

  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

export default updateCommand;
