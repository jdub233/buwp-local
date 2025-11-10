/**
 * buwp-local - BU WordPress Local Development Environment
 * Main library exports
 */

const config = require('./config');
const composeGenerator = require('./compose-generator');

module.exports = {
  // Configuration
  loadConfig: config.loadConfig,
  validateConfig: config.validateConfig,
  initConfig: config.initConfig,
  
  // Docker Compose generation
  generateComposeConfig: composeGenerator.generateComposeConfig,
  generateComposeFile: composeGenerator.generateComposeFile,
  
  // Constants
  CONFIG_FILE_NAME: config.CONFIG_FILE_NAME,
  ENV_FILE_NAME: config.ENV_FILE_NAME,
  DEFAULT_CONFIG: config.DEFAULT_CONFIG
};
