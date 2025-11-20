/**
 * Init command - Interactive configuration initialization
 */

import prompts from 'prompts';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { initConfig, CONFIG_FILE_NAME } from '../config.js';

/**
 * Detect project type from package.json or directory structure
 * @param {string} projectPath - Path to project directory
 * @returns {string|null} Detected project type or null
 */
function detectProjectType(projectPath) {
  // Check package.json for hints
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check keywords
      if (pkg.keywords) {
        if (pkg.keywords.includes('wordpress-plugin')) return 'plugin';
        if (pkg.keywords.includes('wordpress-theme')) return 'theme';
        if (pkg.keywords.includes('wordpress-muplugin')) return 'mu-plugin';
      }
      
      // Check name patterns
      if (pkg.name) {
        if (pkg.name.includes('-plugin')) return 'plugin';
        if (pkg.name.includes('-theme')) return 'theme';
        if (pkg.name.includes('mu-')) return 'mu-plugin';
      }
    } catch (err) {
      // Ignore errors reading package.json
    }
  }
  
  // Check for common WordPress files
  if (fs.existsSync(path.join(projectPath, 'style.css'))) {
    const styleContent = fs.readFileSync(path.join(projectPath, 'style.css'), 'utf8');
    if (styleContent.includes('Theme Name:')) return 'theme';
  }
  
  // Check for plugin header
  const phpFiles = fs.readdirSync(projectPath).filter(f => f.endsWith('.php'));
  for (const phpFile of phpFiles) {
    const content = fs.readFileSync(path.join(projectPath, phpFile), 'utf8');
    if (content.includes('Plugin Name:')) return 'plugin';
  }
  
  return null; // Could not detect
}

/**
 * Interactive initialization command
 * @param {object} options - Command options
 */
async function initCommand(options) {
  const projectPath = process.cwd();
  const configPath = path.join(projectPath, CONFIG_FILE_NAME);
  
  const userName = os.userInfo().username;
  
  console.log(chalk.blue(`👋 Hello, ${userName}! Let's set up your WordPress local development environment.\n`));

  // Check if config already exists
  if (fs.existsSync(configPath) && !options.force) {
    console.log(chalk.yellow(`⚠️  Configuration file already exists: ${configPath}`));
    console.log(chalk.gray('Use --force to overwrite.\n'));
    return;
  }
  
  // Check if we should use interactive mode
  const isInteractive = options.interactive !== false && process.stdin.isTTY;
  
  if (!isInteractive) {
    // Fall back to non-interactive mode
    console.log(chalk.gray('Non-interactive mode: using defaults\n'));
    const initOptions = {};
    if (options.plugin) initOptions.plugin = true;
    if (options.muPlugin) initOptions.muPlugin = true;
    if (options.theme) initOptions.theme = true;
    
    const configPath = initConfig(projectPath, initOptions);
    console.log(chalk.green(`✅ Created configuration file: ${configPath}\n`));
    return;
  }
  
  // Interactive mode
  console.log(chalk.blue('🚀 Interactive configuration setup\n'));
  console.log(chalk.gray('Press Ctrl+C to cancel at any time\n'));
  
  const detectedName = path.basename(projectPath);
  const detectedType = detectProjectType(projectPath);
  
  if (detectedType) {
    console.log(chalk.cyan(`ℹ️  Detected project type: ${detectedType}\n`));
  }
  
  // Determine default project type index
  let defaultTypeIndex = 0;
  if (detectedType === 'plugin') defaultTypeIndex = 0;
  else if (detectedType === 'mu-plugin') defaultTypeIndex = 1;
  else if (detectedType === 'theme') defaultTypeIndex = 2;
  
  const questions = [
    {
      type: 'text',
      name: 'projectName',
      message: 'Project name',
      initial: detectedName,
      validate: value => value.trim().length > 0 || 'Project name is required'
    },
    {
      type: 'select',
      name: 'projectType',
      message: 'Project type',
      choices: [
        { title: 'Plugin', value: 'plugin', description: 'WordPress plugin development' },
        { title: 'MU Plugin', value: 'mu-plugin', description: 'Must-use plugin development' },
        { title: 'Theme', value: 'theme', description: 'WordPress theme development' },
        { title: 'Custom', value: 'custom', description: 'Custom mapping configuration' }
      ],
      initial: defaultTypeIndex
    },
    {
      type: 'text',
      name: 'hostname',
      message: 'Hostname',
      initial: (prev, values) => {
        return `${userName}-${values.projectName}.local`;
      },
      validate: value => {
        if (!value.trim()) return 'Hostname is required';
        if (!value.includes('.')) return 'Hostname should include a domain (e.g., .local)';
        return true;
      }
    },
    {
      type: 'text',
      name: 'httpPort',
      message: 'HTTP port (default: 80)',
      initial: '80',
      validate: value => {
        const port = parseInt(value);
        if (isNaN(port) || port < 1 || port > 65535) return 'Port must be a number between 1 and 65535';
        return true;
      }
    },
    {
      type: 'text',
      name: 'httpsPort',
      message: 'HTTPS port (default: 443)',
      initial: '443',
      validate: value => {
        const port = parseInt(value);
        if (isNaN(port) || port < 1 || port > 65535) return 'Port must be a number between 1 and 65535';
        return true;
      }
    },
    {
      type: 'text',
      name: 'dbPort',
      message: 'Database port (default: 3306)',
      initial: '3306',
      validate: value => {
        const port = parseInt(value);
        if (isNaN(port) || port < 1 || port > 65535) return 'Port must be a number between 1 and 65535';
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'redis',
      message: 'Enable Redis?',
      initial: true
    },
    {
      type: 'confirm',
      name: 's3proxy',
      message: 'Enable S3 proxy?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'shibboleth',
      message: 'Enable Shibboleth?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'xdebug',
      message: 'Enable Xdebug by default?',
      initial: false
    }
  ];
  
  const answers = await prompts(questions, {
    onCancel: () => {
      console.log(chalk.yellow('\n⚠️  Setup cancelled\n'));
      process.exit(0);
    }
  });
  
  // Build configuration object
  const config = {
    projectName: answers.projectName,
    image: 'ghcr.io/bu-ist/bu-wp-docker-mod_shib:arm64-latest',
    hostname: answers.hostname,
    multisite: true,
    services: {
      redis: answers.redis || false,
      s3proxy: answers.s3proxy || false,
      shibboleth: answers.shibboleth || false
    },
    ports: {
      http: parseInt(answers.httpPort),
      https: parseInt(answers.httpsPort),
      db: parseInt(answers.dbPort),
      redis: 6379
    },
    mappings: [],
    env: {
      WP_DEBUG: true,
      XDEBUG: answers.xdebug || false
    }
  };
  
  // Add mapping based on project type
  if (answers.projectType === 'plugin') {
    config.mappings.push({
      local: './',
      container: `/var/www/html/wp-content/plugins/${answers.projectName}`
    });
  } else if (answers.projectType === 'mu-plugin') {
    config.mappings.push({
      local: './',
      container: `/var/www/html/wp-content/mu-plugins/${answers.projectName}`
    });
  } else if (answers.projectType === 'theme') {
    config.mappings.push({
      local: './',
      container: `/var/www/html/wp-content/themes/${answers.projectName}`
    });
  } else {
    // Custom type
    config.mappings.push({
      local: './',
      container: '/var/www/html/wp-content/plugins/my-plugin',
      comment: 'Customize this mapping for your project'
    });
  }
  
  // Write configuration file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  
  console.log(chalk.green(`\n✅ Created configuration file: ${configPath}\n`));
  
  // Show summary
  console.log(chalk.cyan('📋 Configuration summary:'));
  console.log(chalk.gray(`  Project: ${answers.projectName}`));
  console.log(chalk.gray(`  Type: ${answers.projectType}`));
  console.log(chalk.gray(`  Hostname: ${answers.hostname}`));
  console.log(chalk.gray(`  HTTP port: ${answers.httpPort}`));
  console.log(chalk.gray(`  HTTPS port: ${answers.httpsPort}`));
  console.log(chalk.gray(`  Services: ${[
    answers.redis && 'Redis',
    answers.s3proxy && 'S3',
    answers.shibboleth && 'Shibboleth'
  ].filter(Boolean).join(', ') || 'None'}\n`));
  
  // Show next steps
  console.log(chalk.cyan('📝 Next steps:'));
  console.log(chalk.gray('  1. Create .env.local with your credentials'));
  console.log(chalk.gray(`  2. Add to /etc/hosts: 127.0.0.1 ${answers.hostname}`));
  console.log(chalk.gray('  3. Run: buwp-local start'));
  console.log(chalk.gray(`\n  Then access: https://${answers.hostname}\n`));
}

export default initCommand;
