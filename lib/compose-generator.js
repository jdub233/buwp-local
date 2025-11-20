/**
 * Docker Compose file generator
 * Generates docker-compose.yml from configuration using js-yaml
 */

import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

/**
 * Generate docker-compose configuration from buwp-local config
 * @param {object} config - buwp-local configuration
 * @returns {object} Docker Compose configuration object
 */
function generateComposeConfig(config) {
  // Use project name for unique volume naming
  const projectName = config.projectName || 'buwp-local';
  const dbVolumeName = `${projectName}_db_data`;
  const wpVolumeName = `${projectName}_wp_build`;

  const composeConfig = {
    services: {},
    networks: {
      'wp-network': {
        driver: 'bridge'
      }
    },
    volumes: {
      [dbVolumeName]: null,
      [wpVolumeName]: null
    }
  };

  // Database service
  composeConfig.services.db = generateDbService(config, dbVolumeName);

  // WordPress service
  composeConfig.services.wordpress = generateWordPressService(config, wpVolumeName);

  // S3 proxy service (if enabled)
  if (config.services.s3proxy) {
    composeConfig.services.s3proxy = generateS3ProxyService(config);
  }

  // Redis service (if enabled)
  if (config.services.redis) {
    composeConfig.services.redis = generateRedisService(config);
  }

  return composeConfig;
}

/**
 * Generate database service configuration
 * @param {object} config - buwp-local configuration
 * @param {string} dbVolumeName - Name of the database volume
 * @returns {object} Database service config
 */
function generateDbService(config, dbVolumeName) {
  return {
    image: 'mariadb:latest',
    restart: 'always',
    volumes: [`${dbVolumeName}:/var/lib/mysql`],
    environment: {
      MYSQL_DATABASE: 'wordpress',
      MYSQL_USER: 'wordpress',
      MYSQL_PASSWORD: '${WORDPRESS_DB_PASSWORD:-password}',
      MYSQL_ROOT_PASSWORD: '${DB_ROOT_PASSWORD:-rootpassword}'
    },
    ports: [`${config.ports.db}:3306`],
    networks: ['wp-network']
  };
}

/**
 * Generate WordPress service configuration
 * @param {object} config - buwp-local configuration
 * @param {string} wpVolumeName - Name of the WordPress volume
 * @returns {object} WordPress service config
 */
function generateWordPressService(config, wpVolumeName) {
  const depends_on = ['db'];
  
  if (config.services.s3proxy) depends_on.push('s3proxy');
  if (config.services.redis) depends_on.push('redis');

  // Build environment variables
  const environment = {
    WORDPRESS_DB_HOST: 'db:3306',
    WORDPRESS_DB_USER: 'wordpress',
    WORDPRESS_DB_PASSWORD: '${WORDPRESS_DB_PASSWORD:-password}',
    WORDPRESS_DB_NAME: 'wordpress',
    WORDPRESS_DEBUG: config.env?.WP_DEBUG || '0',
    SERVER_NAME: config.hostname,
    HTTP_HOST: config.hostname,
    MULTISITE: config.multisite ? 'true' : 'false',
    XDEBUG: config.env?.XDEBUG || 'false',
    WP_CLI_ALLOW_ROOT: 'true',
    TZ: 'America/New_York'
  };

  // Add Shibboleth config if enabled
  if (config.services.shibboleth) {
    environment.SP_ENTITY_ID = '${SP_ENTITY_ID:-}';
    environment.IDP_ENTITY_ID = '${IDP_ENTITY_ID:-}';
    environment.SHIB_IDP_LOGOUT = '${SHIB_IDP_LOGOUT:-}';
    environment.SHIB_SP_KEY = '${SHIB_SP_KEY:-}';
    environment.SHIB_SP_CERT = '${SHIB_SP_CERT:-}';
  }

  // Add S3 config if enabled
  if (config.services.s3proxy) {
    environment.S3PROXY_HOST = 'http://s3proxy:8080';
  }

  // Add Redis config if enabled
  if (config.services.redis) {
    environment.REDIS_HOST = 'redis';
    environment.REDIS_PORT = '6379';
  }

  // Build WordPress config extra
  let wpConfigExtra = '';
  
  if (config.multisite) {
    wpConfigExtra += "define('MULTISITE', true);\n";
    wpConfigExtra += "define('SUBDOMAIN_INSTALL', false);\n";
  }

  if (config.services.s3proxy) {
    wpConfigExtra += "define('S3_UPLOADS_BUCKET', '${S3_UPLOADS_BUCKET}');\n";
    wpConfigExtra += "define('S3_UPLOADS_REGION', '${S3_UPLOADS_REGION:-us-east-1}');\n";
    wpConfigExtra += "define('S3_UPLOADS_KEY', '${S3_UPLOADS_ACCESS_KEY_ID}');\n";
    wpConfigExtra += "define('S3_UPLOADS_SECRET', '${S3_UPLOADS_SECRET_ACCESS_KEY}');\n";
    wpConfigExtra += "define('ACCESS_RULES_TABLE', '${S3_ACCESS_RULES_TABLE}');\n";
    wpConfigExtra += "define('S3_UPLOADS_OBJECT_ACL', null);\n";
    wpConfigExtra += "define('S3_UPLOADS_AUTOENABLE', true);\n";
    wpConfigExtra += "define('S3_UPLOADS_DISABLE_REPLACE_UPLOAD_URL', true);\n";
  }

  // Add BU_INCLUDES_PATH definition; this seems bad and should be unwound, but various things depend on it right now.
  wpConfigExtra += `define( 'BU_INCLUDES_PATH', '/var/www/html/bu-includes' );\n`;

  // Add custom env vars
  Object.entries(config.env || {}).forEach(([key, value]) => {
    if (!environment[key]) {
      environment[key] = String(value);
    }
  });

  if (wpConfigExtra) {
    environment.WORDPRESS_CONFIG_EXTRA = wpConfigExtra;
  }

  // Build volumes array
  const volumes = [`${wpVolumeName}:/var/www/html`];
  
  // Add custom mappings
  if (config.mappings && Array.isArray(config.mappings)) {
    config.mappings.forEach(mapping => {
      const localPath = path.resolve(mapping.local);
      volumes.push(`${localPath}:${mapping.container}`);
    });
  }

  return {
    image: config.image,
    depends_on,
    restart: 'always',
    ports: [
      `${config.ports.http}:80`,
      `${config.ports.https}:443`
    ],
    hostname: config.hostname,
    environment,
    volumes,
    networks: ['wp-network']
  };
}

/**
 * Generate S3 proxy service configuration
 * @param {object} _config - buwp-local configuration (unused - env vars used instead)
 * @returns {object} S3 proxy service config
 */
function generateS3ProxyService(_config) {
  return {
    image: 'public.ecr.aws/bostonuniversity-nonprod/aws-sigv4-proxy',
    restart: 'always',
    command: [
      '-v',
      '--name',
      's3-object-lambda',
      '--region',
      '${OLAP_REGION:-us-east-1}',
      '--no-verify-ssl',
      '--host',
      '${OLAP}-${OLAP_ACCT_NBR}.s3-object-lambda.${OLAP_REGION:-us-east-1}.amazonaws.com'
    ],
    environment: {
      healthcheck_path: '/s3proxy-healthcheck',
      AWS_ACCESS_KEY_ID: '${S3_UPLOADS_ACCESS_KEY_ID}',
      AWS_SECRET_ACCESS_KEY: '${S3_UPLOADS_SECRET_ACCESS_KEY}',
      REGION: '${S3_UPLOADS_REGION:-us-east-1}'
    },
    networks: ['wp-network']
  };
}

/**
 * Generate Redis service configuration
 * @param {object} config - buwp-local configuration
 * @returns {object} Redis service config
 */
function generateRedisService(config) {
  return {
    image: 'redis:alpine',
    restart: 'always',
    ports: [`${config.ports.redis}:6379`],
    networks: ['wp-network']
  };
}

/**
 * Write docker-compose.yml file
 * @param {object} composeConfig - Docker Compose configuration
 * @param {string} outputPath - Path to write docker-compose.yml
 * @returns {string} Path to written file
 */
function writeComposeFile(composeConfig, outputPath) {
  const yamlContent = yaml.dump(composeConfig, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });

  const fileContent = `# Generated by buwp-local
# Do not edit this file directly - it will be overwritten
# Edit .buwp-local.json instead

${yamlContent}`;

  fs.writeFileSync(outputPath, fileContent, 'utf8');
  
  return outputPath;
}

/**
 * Generate and write docker-compose.yml from config
 * @param {object} config - buwp-local configuration
 * @param {string} projectPath - Project directory path
 * @returns {string} Path to generated docker-compose.yml
 */
function generateComposeFile(config, projectPath = process.cwd()) {
  // Create .buwp-local directory if it doesn't exist
  const stateDir = path.join(projectPath, '.buwp-local');
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const composePath = path.join(stateDir, 'docker-compose.yml');
  const composeConfig = generateComposeConfig(config);
  
  return writeComposeFile(composeConfig, composePath);
}

export {
  generateComposeConfig,
  generateComposeFile,
  writeComposeFile
};
