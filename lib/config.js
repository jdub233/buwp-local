/**
 * Configuration management for buwp-local
 * Handles loading, validating, and merging configuration from various sources
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';

const CONFIG_FILE_NAME = '.buwp-local.json';
const ENV_FILE_NAME = '.env.local';

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  projectName: null, // Will be auto-generated from directory name if not set
  image: 'ghcr.io/bu-ist/bu-wp-docker-mod_shib:arm64-latest',
  hostname: 'wordpress.local',
  multisite: true,
  services: {
    redis: true,
    s3proxy: true,
    shibboleth: true
  },
  ports: {
    http: 80,
    https: 443,
    db: 3306,
    redis: 6379
  },
  mappings: [],
  env: {}
};

/**
 * Load configuration from project directory
 * @param {string} projectPath - Path to project directory
 * @returns {object} Merged configuration
 */
function loadConfig(projectPath = process.cwd()) {
  const configPath = path.join(projectPath, CONFIG_FILE_NAME);
  const envPath = path.join(projectPath, ENV_FILE_NAME);
  
  let userConfig = {};
  let envVars = {};

  // Load config file if it exists
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      userConfig = JSON.parse(configContent);
    } catch (err) {
      throw new Error(`Failed to parse ${CONFIG_FILE_NAME}: ${err.message}`);
    }
  }

  // Load .env.local if it exists
  if (fs.existsSync(envPath)) {
    try {
      dotenv.config({ path: envPath });
      envVars = extractEnvVars();
    } catch (err) {
      console.warn(chalk.yellow(`Warning: Failed to load ${ENV_FILE_NAME}: ${err.message}`));
    }
  }

  // Merge configurations (priority: env vars > user config > defaults)
  const config = mergeConfig(DEFAULT_CONFIG, userConfig, envVars);
  
  // Auto-generate project name if not set
  if (!config.projectName) {
    config.projectName = getProjectName(projectPath);
  }
  
  // Sanitize project name (Docker project names must be lowercase alphanumeric + dash/underscore)
  config.projectName = sanitizeProjectName(config.projectName);
  
  return config;
}

/**
 * Extract relevant environment variables
 * @returns {object} Environment variables
 */
function extractEnvVars() {
  return {
    db: {
      password: process.env.WORDPRESS_DB_PASSWORD,
      rootPassword: process.env.DB_ROOT_PASSWORD
    },
    shibboleth: {
      entityId: process.env.SP_ENTITY_ID,
      idpEntityId: process.env.IDP_ENTITY_ID,
      idpLogout: process.env.SHIB_IDP_LOGOUT,
      spKey: process.env.SHIB_SP_KEY,
      spCert: process.env.SHIB_SP_CERT
    },
    s3: {
      bucket: process.env.S3_UPLOADS_BUCKET,
      region: process.env.S3_UPLOADS_REGION,
      accessKeyId: process.env.S3_UPLOADS_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_UPLOADS_SECRET_ACCESS_KEY,
      accessRulesTable: process.env.S3_ACCESS_RULES_TABLE
    },
    olap: {
      name: process.env.OLAP,
      accountNumber: process.env.OLAP_ACCT_NBR,
      region: process.env.OLAP_REGION
    }
  };
}

/**
 * Deep merge configuration objects
 * @param {...object} configs - Configuration objects to merge
 * @returns {object} Merged configuration
 */
function mergeConfig(...configs) {
  return configs.reduce((acc, config) => {
    return deepMerge(acc, config);
  }, {});
}

/**
 * Deep merge utility
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
}

/**
 * Check if value is an object
 * @param {*} item - Value to check
 * @returns {boolean}
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Validate configuration
 * @param {object} config - Configuration to validate
 * @returns {object} Validation result { valid: boolean, errors: string[] }
 */
function validateConfig(config) {
  const errors = [];

  // Validate required fields
  if (!config.image) {
    errors.push('Missing required field: image');
  }

  if (!config.hostname) {
    errors.push('Missing required field: hostname');
  }

  // Validate mappings
  if (config.mappings && Array.isArray(config.mappings)) {
    config.mappings.forEach((mapping, index) => {
      if (!mapping.local || !mapping.container) {
        errors.push(`Mapping ${index} missing required fields (local, container)`);
      }
      
      if (mapping.local && !fs.existsSync(mapping.local)) {
        errors.push(`Mapping ${index}: local path does not exist: ${mapping.local}`);
      }
    });
  }

  // Validate ports
  if (config.ports) {
    Object.entries(config.ports).forEach(([service, port]) => {
      if (typeof port !== 'number' || port < 1 || port > 65535) {
        errors.push(`Invalid port for ${service}: ${port}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Initialize configuration file in project directory
 * @param {string} projectPath - Path to project directory
 * @param {object} options - Initialization options
 * @param {boolean} options.plugin - Create plugin mapping
 * @param {boolean} options.muPlugin - Create mu-plugin mapping
 * @param {boolean} options.theme - Create theme mapping
 * @returns {string} Path to created config file
 */
function initConfig(projectPath = process.cwd(), options = {}) {
  const configPath = path.join(projectPath, CONFIG_FILE_NAME);
  
  if (fs.existsSync(configPath)) {
    throw new Error(`Configuration file already exists: ${configPath}`);
  }

  const projectName = getProjectName(projectPath);
  const exampleConfig = {
    ...DEFAULT_CONFIG,
    projectName: projectName,
    hostname: `${projectName}.local`,
    mappings: [],
    env: {
      WP_DEBUG: true,
      XDEBUG: false
    }
  };

  // Create smart mappings based on options
  if (options.plugin) {
    exampleConfig.mappings.push({
      local: "./",
      container: `/var/www/html/wp-content/plugins/${projectName}`
    });
  } else if (options.muPlugin) {
    exampleConfig.mappings.push({
      local: "./",
      container: `/var/www/html/wp-content/mu-plugins/${projectName}`
    });
  } else if (options.theme) {
    exampleConfig.mappings.push({
      local: "./",
      container: `/var/www/html/wp-content/themes/${projectName}`
    });
  } else {
    // Default generic mapping with comment
    exampleConfig.mappings.push({
      local: "./",
      container: "/var/www/html/wp-content/plugins/my-plugin",
      comment: "Map current directory to a plugin location"
    });
  }

  fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
  
  return configPath;
}

/**
 * Get project name from directory path
 * @param {string} projectPath - Path to project directory
 * @returns {string} Project name
 */
function getProjectName(projectPath) {
  return path.basename(projectPath);
}

/**
 * Sanitize project name for Docker compatibility
 * Docker project names must be lowercase alphanumeric + dash/underscore
 * @param {string} name - Project name to sanitize
 * @returns {string} Sanitized project name
 */
function sanitizeProjectName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

export {
  loadConfig,
  validateConfig,
  initConfig,
  DEFAULT_CONFIG,
  CONFIG_FILE_NAME,
  ENV_FILE_NAME
};
