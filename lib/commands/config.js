/**
 * Config command - Configuration management
 */

const chalk = require('chalk');
const { loadConfig, validateConfig, initConfig, CONFIG_FILE_NAME } = require('../config');

async function configCommand(options) {
  try {
    const projectPath = process.cwd();

    // Initialize configuration
    if (options.init) {
      console.log(chalk.blue('📝 Initializing configuration...\n'));
      
      try {
        const configPath = initConfig(projectPath);
        console.log(chalk.green(`✅ Created configuration file: ${configPath}\n`));
        console.log(chalk.gray('Edit this file to customize your environment.'));
        console.log(chalk.gray('Then run "buwp-local start" to launch your environment.\n'));
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(chalk.yellow(`⚠️  ${CONFIG_FILE_NAME} already exists.\n`));
        } else {
          throw err;
        }
      }
      return;
    }

    // Validate configuration
    if (options.validate) {
      console.log(chalk.blue('🔍 Validating configuration...\n'));
      
      const config = loadConfig(projectPath);
      const validation = validateConfig(config);

      if (validation.valid) {
        console.log(chalk.green('✅ Configuration is valid!\n'));
      } else {
        console.log(chalk.red('❌ Configuration has errors:\n'));
        validation.errors.forEach(error => {
          console.log(chalk.red(`  - ${error}`));
        });
        console.log('');
        process.exit(1);
      }
      return;
    }

    // Show resolved configuration
    if (options.show) {
      console.log(chalk.blue('📄 Resolved configuration:\n'));
      
      const config = loadConfig(projectPath);
      
      // Mask sensitive values
      const maskedConfig = maskSensitiveData(config);
      
      console.log(JSON.stringify(maskedConfig, null, 2));
      console.log('');
      return;
    }

    // No options provided, show help
    console.log(chalk.yellow('Usage: buwp-local config [options]\n'));
    console.log('Options:');
    console.log('  --init      Initialize configuration file');
    console.log('  --validate  Validate configuration file');
    console.log('  --show      Show resolved configuration\n');

  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

/**
 * Mask sensitive data in configuration
 * @param {object} config - Configuration object
 * @returns {object} Configuration with masked sensitive data
 */
function maskSensitiveData(config) {
  const masked = JSON.parse(JSON.stringify(config));

  // Mask database passwords
  if (masked.db) {
    if (masked.db.password) masked.db.password = '***MASKED***';
    if (masked.db.rootPassword) masked.db.rootPassword = '***MASKED***';
  }

  // Mask Shibboleth credentials
  if (masked.shibboleth) {
    if (masked.shibboleth.spKey) masked.shibboleth.spKey = '***MASKED***';
    if (masked.shibboleth.spCert) masked.shibboleth.spCert = '***MASKED***';
  }

  // Mask S3 credentials
  if (masked.s3) {
    if (masked.s3.accessKeyId) masked.s3.accessKeyId = '***MASKED***';
    if (masked.s3.secretAccessKey) masked.s3.secretAccessKey = '***MASKED***';
  }

  return masked;
}

module.exports = configCommand;
