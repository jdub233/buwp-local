/**
 * Start command - Starts the local WordPress environment
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import prompts from 'prompts';
import { loadConfig, validateConfig, ENV_FILE_NAME, loadKeychainCredentials, createSecureTempEnvFile, secureDeleteTempEnvFile } from '../config.js';
import { generateComposeFile } from '../compose-generator.js';
import keychainCommand from './keychain.js';

/**
 * Required credentials that must be present for WordPress to function
 */
const REQUIRED_CREDENTIALS = [
  'WORDPRESS_DB_PASSWORD',
  'DB_ROOT_PASSWORD'
];

/**
 * Check if hostname exists in /etc/hosts
 * @param {string} hostname - Hostname to check
 * @returns {object} { found: boolean, error?: string }
 */
function checkHostsFile(hostname) {
  try {
    const hostsPath = '/etc/hosts';
    const content = fs.readFileSync(hostsPath, 'utf8');
    const lines = content.split('\n');
    
    // Check each line for hostname
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) continue;
      
      // Parse: "127.0.0.1 hostname.local" or "127.0.0.1\thostname.local"
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        // Check if hostname appears in any position after IP
        const hostnames = parts.slice(1);
        if (hostnames.includes(hostname)) {
          return { found: true };
        }
      }
    }
    
    return { found: false };
  } catch (error) {
    // /etc/hosts not readable (unlikely on macOS)
    return { found: false, error: error.message };
  }
}

/**
 * Check if we've already shown the hosts warning for this project
 * @param {string} projectPath - Project directory path
 * @returns {boolean} true if warning already shown
 */
function hasShownHostsWarning(projectPath) {
  const warningFile = path.join(projectPath, '.buwp-local', '.hosts-warning-shown');
  return fs.existsSync(warningFile);
}

/**
 * Mark that we've shown the hosts warning for this project
 * @param {string} projectPath - Project directory path
 */
function markHostsWarningShown(projectPath) {
  const dir = path.join(projectPath, '.buwp-local');
  fs.mkdirSync(dir, { recursive: true });
  const warningFile = path.join(dir, '.hosts-warning-shown');
  fs.writeFileSync(warningFile, Date.now().toString());
}

/**
 * Check if required credentials are available in keychain or .env.local
 * @param {object} keychainCreds - Credentials loaded from keychain
 * @param {string} envFilePath - Path to .env.local file
 * @returns {object} { isValid, missing }
 */
function validateCredentials(keychainCreds, envFilePath) {
  const missing = [];
  
  for (const key of REQUIRED_CREDENTIALS) {
    // Check if credential exists in keychain
    if (keychainCreds[key]) {
      continue; // Found in keychain
    }
    
    // Check if credential exists in .env.local
    if (fs.existsSync(envFilePath)) {
      const envContent = fs.readFileSync(envFilePath, 'utf8');
      if (envContent.includes(`${key}=`)) {
        continue; // Found in .env.local
      }
    }
    
    // Credential not found anywhere
    missing.push(key);
  }
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

/**
 * Prompt user to set up missing credentials
 * @param {string[]} missingCreds - List of missing credential keys
 * @returns {Promise<boolean>} true if user wants to set up, false otherwise
 */
async function promptCredentialSetup(missingCreds) {
  console.log(chalk.yellow('\n⚠️  Missing Required Credentials\n'));
  console.log(chalk.gray('The following credentials are not configured:\n'));
  missingCreds.forEach(key => {
    console.log(chalk.gray(`  - ${key}`));
  });
  console.log('');
  
  console.log(chalk.cyan('You can set up credentials in two ways:\n'));
  console.log(chalk.white('  1. Use macOS Keychain (recommended):'));
  console.log(chalk.gray('     npx buwp-local keychain setup\n'));
  console.log(chalk.white('  2. Create .env.local file in your project:'));
  console.log(chalk.gray('     cp .env.local.example .env.local'));
  console.log(chalk.gray('     # Edit .env.local with your credentials\n'));
  
  const { shouldSetup } = await prompts({
    type: 'confirm',
    name: 'shouldSetup',
    message: 'Would you like to set up credentials now using Keychain?',
    initial: true
  });
  
  return shouldSetup;
}

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

    // Load and validate credentials early
    const envFilePath = path.join(projectPath, ENV_FILE_NAME);
    const keychainCredentials = loadKeychainCredentials();
    const credentialValidation = validateCredentials(keychainCredentials, envFilePath);
    
    if (!credentialValidation.isValid) {
      const shouldSetup = await promptCredentialSetup(credentialValidation.missing);
      
      if (shouldSetup) {
        // Run keychain setup command
        console.log(chalk.gray('\nLaunching Keychain Setup...\n'));
        await keychainCommand('setup', [], {});
        
        // Reload credentials after setup
        const reloadedCreds = loadKeychainCredentials();
        const revalidation = validateCredentials(reloadedCreds, envFilePath);
        
        if (!revalidation.isValid) {
          console.log(chalk.red('\n❌ Setup incomplete. Required credentials still missing:\n'));
          revalidation.missing.forEach(key => {
            console.log(chalk.red(`  - ${key}`));
          });
          console.log(chalk.gray('\nPlease complete setup or add credentials to .env.local\n'));
          process.exit(1);
        }
      } else {
        console.log(chalk.red('\n❌ Cannot start without required credentials.\n'));
        process.exit(1);
      }
    } else {
      console.log(chalk.green('✓ Required credentials validated\n'));
    }

    // Check /etc/hosts for hostname entry
    if (!hasShownHostsWarning(projectPath)) {
      const hostsCheck = checkHostsFile(config.hostname);
      
      if (!hostsCheck.found) {
        console.log(chalk.yellow('⚠️  Hostname not found in /etc/hosts\n'));
        console.log(`Your site won't be accessible at ${chalk.cyan(`http://${config.hostname}`)}`);
        console.log('until you add this entry:\n');
        console.log(chalk.green(`  127.0.0.1 ${config.hostname}\n`));
        console.log('Run this command to add it (copy and paste, and then enter your password):\n');
        console.log(chalk.cyan(`  echo "127.0.0.1 ${config.hostname}" | sudo tee -a /etc/hosts\n`));
        
        const { continueStart } = await prompts({
          type: 'confirm',
          name: 'continueStart',
          message: 'Continue starting containers?',
          initial: true
        });
        
        if (!continueStart) {
          console.log(chalk.gray('\nStart cancelled. Add hostname to /etc/hosts and try again.'));
          process.exit(0);
        }
        
        // Mark warning as shown so we don't annoy user on every start
        markHostsWarningShown(projectPath);
      }
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
    
    // Load keychain credentials and create secure temp env file if available
    let tempEnvPath = null;
    const finalKeychainCredentials = loadKeychainCredentials();
    const keychainCredCount = Object.keys(finalKeychainCredentials).length;
    
    if (keychainCredCount > 0) {
      try {
        tempEnvPath = createSecureTempEnvFile(finalKeychainCredentials, projectName);
        console.log(chalk.gray(`✓ Loaded ${keychainCredCount} credentials from keychain\n`));
      } catch (err) {
        console.warn(chalk.yellow(`⚠️  Could not load keychain credentials: ${err.message}`));
      }
    }
    
    // Check if .env.local exists and build env-file flags
    const envFileFlag = fs.existsSync(envFilePath) ? `--env-file ${envFilePath}` : '';
    const tempEnvFileFlag = tempEnvPath ? `--env-file ${tempEnvPath}` : '';
    
    try {
      // This is the actual docker compose up command that starts everything
      // If there is a local .env file, it will take over the temp env file generated from the keychain, because it is specified last.
      execSync(
        `docker compose -p ${projectName} ${tempEnvFileFlag} ${envFileFlag} -f ${composePath} up -d`,
        { 
          cwd: composeDir,
          stdio: 'inherit'
        }
      );
    } catch (err) {
      console.error(chalk.red('\n❌ Failed to start Docker containers'));
      process.exit(1);
    } finally {
      // Always clean up temp env file, even if Docker Compose failed
      if (tempEnvPath) {
        secureDeleteTempEnvFile(tempEnvPath);
      }
    }

    // Success message
    console.log(chalk.green('\n✅ Environment started successfully!\n'));
    console.log(chalk.cyan(`Project: ${projectName}`));
    console.log(chalk.cyan('Access your site at:'));
    console.log(chalk.white(`  https://${config.hostname}\n`));
    
    console.log(chalk.gray('Useful commands:'));
    console.log(chalk.white('  buwp-local logs    - View logs'));
    console.log(chalk.white('  buwp-local stop    - Stop environment'));
    console.log(chalk.white('  buwp-local destroy - Remove environment\n'));

  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

export default startCommand;
