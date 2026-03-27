/**
 * Update command - Updates Docker images and recreates containers
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { loadConfig, loadKeychainCredentials, createSecureTempEnvFile, secureDeleteTempEnvFile, ENV_FILE_NAME } from '../config.js';
import { generateComposeFile } from '../compose-generator.js';

async function updateCommand(options = {}) {
  console.log(chalk.blue('🔄 Updating Docker images...\n'));

  try {
    const projectPath = process.cwd();
    const envFilePath = path.join(projectPath, ENV_FILE_NAME);
    const composePath = path.join(projectPath, '.buwp-local', 'docker-compose.yml');

    // Check if docker-compose.yml exists (indicates environment was previously started)
    if (!fs.existsSync(composePath)) {
      console.log(chalk.yellow('⚠️  No environment found.'));
      console.log(chalk.gray('Run "buwp-local start" to create an environment.\n'));
      return;
    }

    // Load config to get project name
    const config = loadConfig(projectPath);
    const projectName = config.projectName || 'buwp-local';

    // Regenerate docker-compose.yml from current config
    // This ensures any config changes are applied during update
    console.log(chalk.gray('Regenerating docker-compose.yml from current config...'));
    const newComposePath = generateComposeFile(config, projectPath);
    console.log(chalk.green(`✓ Generated ${newComposePath}\n`));
    
    const composeDir = path.dirname(composePath);

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

    // Step 2: Stop and remove containers to ensure new images are used
    // Note: We use 'down' without -v flag to preserve all volumes
    console.log(chalk.cyan('\n🛑 Stopping containers...'));
    try {
      // Remove containers but preserve volumes (no -v flag)
      execSync(
        `docker compose -p ${projectName} -f "${composePath}" down`,
        { 
          cwd: composeDir,
          stdio: 'inherit'
        }
      );
    } catch (err) {
      console.error(chalk.red('\n❌ Failed to stop containers'));
      process.exit(1);
    }

    // Step 3: Conditionally remove wp_build volume to get fresh WordPress core
    const preserveWpBuild = options.preserveWpbuild || false;
    
    if (!preserveWpBuild) {
      // Docker Compose prefixes volume names with project name
      const wpVolumeName = `${projectName}_wp_build`;
      
      console.log(chalk.cyan('\n🗑️  Removing WordPress volume to get fresh core files...'));
      try {
        execSync(
          `docker volume rm ${wpVolumeName}`,
          { 
            cwd: composeDir,
            stdio: 'ignore'
          }
        );
        console.log(chalk.green('✓ WordPress volume removed\n'));
      } catch (err) {
        // Volume might not exist - that's okay
        console.log(chalk.yellow('⚠️  WordPress volume not found (will be created fresh)\n'));
      }
    } else {
      console.log(chalk.yellow('\n⚠️  Preserving existing WordPress volume'));
      console.log(chalk.gray('WordPress core files will NOT be updated from the image.\n'));
    }

    // Step 4: Start containers with new images
    // Need to pass environment variables just like start command does
    console.log(chalk.cyan('🔨 Starting containers with new images...'));
    
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
        `docker compose -p ${projectName} ${tempEnvFileFlag} ${envFileFlag} -f "${composePath}" up -d`,
        {
          cwd: composeDir,
          stdio: 'inherit'
        }
      );
    } catch (err) {
      console.error(chalk.red('\n❌ Failed to start containers'));
      process.exit(1);
    } finally {
      // Always clean up temp env file
      if (tempEnvPath) {
        secureDeleteTempEnvFile(tempEnvPath);
      }
    }

    // Success message
    console.log(chalk.green('\n✅ Update complete!\n'));
    
    if (!preserveWpBuild) {
      console.log(chalk.cyan('Updated:'));
      console.log(chalk.gray('  ✓ WordPress core files (from new image)'));
      console.log(chalk.gray('  ✓ BU plugins and themes (from new image)\n'));
    }
    
    console.log(chalk.cyan('Preserved:'));
    console.log(chalk.gray('  ✓ Database (all content and settings)'));
    console.log(chalk.gray('  ✓ Custom mapped code (your local files)'));
    console.log(chalk.gray('  ✓ Uploads (stored in S3)\n'));
    console.log(chalk.cyan('Access your site at:'));
    console.log(chalk.white(`  https://${config.hostname}\n`));

  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

export default updateCommand;
