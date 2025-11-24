/**
 * Keychain command - Manage credentials in macOS keychain
 */

import chalk from 'chalk';
import prompts from 'prompts';
import fs from 'fs';
import {
  isPlatformSupported,
  setCredential,
  getCredential,
  hasCredential,
  listCredentials,
  clearAllCredentials,
  isMultilineCredential,
  parseCredentialsFile,
  CREDENTIAL_KEYS,
  CREDENTIAL_GROUPS,
  CREDENTIAL_DESCRIPTIONS,
  MULTILINE_CREDENTIALS
} from '../keychain.js';

/**
 * Main keychain command handler
 * @param {string} subcommand - Subcommand to execute
 * @param {string[]} args - Additional arguments
 * @param {object} options - Command options
 */
async function keychainCommand(subcommand, args, options) {
  // Check platform support first
  if (!isPlatformSupported()) {
    console.log(chalk.yellow('⚠️  Keychain integration is only available on macOS.\n'));
    console.log(chalk.gray('On this platform, please use .env.local for credential storage.\n'));
    process.exit(1);
  }

  try {
    switch (subcommand) {
      case 'setup':
        await setupCommand(options);
        break;
      case 'set':
        await setCommand(args, options);
        break;
      case 'get':
        await getCommand(args);
        break;
      case 'list':
        await listCommand();
        break;
      case 'clear':
        await clearCommand(options);
        break;
      case 'status':
        await statusCommand();
        break;
      default:
        showHelp();
    }
  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

/**
 * Interactive setup - prompts for all credentials
 * @param {object} options - Command options
 */
async function setupCommand(options) {
  console.log(chalk.blue('🔐 Keychain Credential Setup\n'));
  
  // Check if bulk import from file
  if (options.file) {
    await bulkImportFromFile(options.file, options.force);
    return;
  }
  
  // Interactive mode
  console.log(chalk.yellow('⚠️  macOS may prompt you to allow Node.js access to your keychain.'));
  console.log(chalk.yellow('    Click "Always Allow" to avoid repeated prompts.\n'));
  console.log(chalk.gray('This will store credentials securely in your macOS keychain.'));
  console.log(chalk.gray('All buwp-local projects will use these credentials by default.\n'));

  // Check for existing credentials
  const existingKeys = listCredentials();
  if (existingKeys.length > 0) {
    console.log(chalk.yellow(`Found ${existingKeys.length} existing credential(s) in keychain.`));
    const { shouldOverwrite } = await prompts({
      type: 'confirm',
      name: 'shouldOverwrite',
      message: 'Overwrite existing credentials?',
      initial: false
    });

    if (!shouldOverwrite) {
      console.log(chalk.gray('\nSetup cancelled.\n'));
      return;
    }
    console.log('');
  }

  // Prompt for each credential group
  const credentials = {};
  let totalStored = 0;

  for (const [groupName, keys] of Object.entries(CREDENTIAL_GROUPS)) {
    console.log(chalk.cyan(`\n📋 ${groupName.toUpperCase()} Credentials`));
    console.log(chalk.gray('━'.repeat(50)));

    for (const key of keys) {
      const description = CREDENTIAL_DESCRIPTIONS[key];
      const existing = hasCredential(key);
      const isMultiline = isMultilineCredential(key);
      
      const prompt = existing 
        ? `${description} (currently stored)`
        : description;

      if (isMultiline) {
        // Handle multiline credentials with file path input only
        console.log(chalk.yellow(`\n⚠️  ${key} is a multiline credential (cryptographic key/certificate).`));
        console.log(chalk.gray('Provide the file path to your key/certificate file.\n'));
        
        const { filePath } = await prompts({
          type: 'text',
          name: 'filePath',
          message: `File path for ${description}`,
          validate: val => {
            if (!val || !val.trim()) return 'File path cannot be empty';
            const trimmed = val.trim();
            if (!fs.existsSync(trimmed)) return `File not found: ${trimmed}`;
            try {
              fs.accessSync(trimmed, fs.constants.R_OK);
              return true;
            } catch {
              return 'File is not readable';
            }
          }
        });

        if (filePath) {
          try {
            const fileContent = fs.readFileSync(filePath.trim(), 'utf8');
            setCredential(key, fileContent);
            credentials[key] = true;
            totalStored++;
            const lineCount = fileContent.split('\n').length;
            console.log(chalk.green(`  ✓ Stored ${key} from file (${lineCount} lines)`));
          } catch (err) {
            console.log(chalk.red(`  ✗ Failed to read file: ${err.message}`));
          }
        }
      } else {
        // Handle single-line credentials with regular prompt
        const { value } = await prompts({
          type: 'text',
          name: 'value',
          message: prompt,
          validate: val => val.trim().length > 0 || 'Value cannot be empty'
        });

        if (value) {
          setCredential(key, value.trim());
          credentials[key] = true;
          totalStored++;
        }
      }
    }
  }

  console.log(chalk.green(`\n✅ Successfully stored ${totalStored} credential(s) in keychain\n`));
  console.log(chalk.gray('These credentials will be used automatically by all buwp-local projects.'));
  console.log(chalk.gray('You can override specific credentials per-project using .env.local files.\n'));
}

/**
 * Bulk import credentials from JSON file
 * @param {string} filePath - Path to credentials JSON file
 * @param {boolean} force - Skip confirmation prompts
 */
async function bulkImportFromFile(filePath, force) {
  console.log(chalk.yellow('⚠️  macOS may prompt you to allow Node.js access to your keychain.'));
  console.log(chalk.yellow('    Click "Always Allow" to avoid repeated prompts.\n'));
  
  // Parse the credentials file
  let result;
  try {
    result = parseCredentialsFile(filePath);
  } catch (err) {
    console.log(chalk.red(`❌ Failed to parse credentials file: ${err.message}\n`));
    process.exit(1);
  }
  
  const { parsed, unknown, metadata } = result;
  const credentialCount = Object.keys(parsed).length;
  
  if (credentialCount === 0) {
    console.log(chalk.yellow('⚠️  No valid credentials found in file.\n'));
    process.exit(1);
  }
  
  // Show import summary
  console.log(chalk.cyan('📄 Credentials File Summary:\n'));
  if (metadata.source !== 'unknown') {
    console.log(chalk.gray(`  Source: ${metadata.source}`));
  }
  if (metadata.version !== 'unknown') {
    console.log(chalk.gray(`  Version: ${metadata.version}`));
  }
  if (metadata.exported) {
    console.log(chalk.gray(`  Exported: ${metadata.exported}`));
  }
  console.log('');
  
  // Show credentials by group
  console.log(chalk.cyan('Credentials to import:\n'));
  for (const [groupName, keys] of Object.entries(CREDENTIAL_GROUPS)) {
    const groupCreds = keys.filter(k => parsed[k]);
    if (groupCreds.length > 0) {
      console.log(chalk.white(`  ${groupName.toUpperCase()}:`));
      groupCreds.forEach(key => {
        const value = parsed[key];
        const lineCount = value.split('\n').length;
        const info = lineCount > 1 ? ` (${lineCount} lines)` : '';
        console.log(chalk.green(`    ✓ ${key}${info}`));
      });
    }
  }
  console.log('');
  
  // Show unknown keys if any
  if (unknown.length > 0) {
    console.log(chalk.yellow(`⚠️  Found ${unknown.length} unknown or invalid credential(s):\n`));
    unknown.forEach(({ key, reason }) => {
      console.log(chalk.gray(`  - ${key}: ${reason}`));
    });
    console.log('');
  }
  
  console.log(chalk.cyan(`Total: ${credentialCount} credential(s) to import\n`));
  
  // Check for existing credentials
  const existingKeys = listCredentials();
  const willOverwrite = Object.keys(parsed).filter(k => existingKeys.includes(k));
  
  if (willOverwrite.length > 0 && !force) {
    console.log(chalk.yellow(`⚠️  ${willOverwrite.length} credential(s) already exist and will be overwritten:\n`));
    willOverwrite.forEach(key => {
      console.log(chalk.gray(`  - ${key}`));
    });
    console.log('');
    
    const { shouldContinue } = await prompts({
      type: 'confirm',
      name: 'shouldContinue',
      message: 'Continue with import?',
      initial: false
    });
    
    if (!shouldContinue) {
      console.log(chalk.gray('\nImport cancelled.\n'));
      return;
    }
  }
  
  // Import credentials
  console.log(chalk.gray('\nImporting credentials...\n'));
  let successCount = 0;
  let failCount = 0;
  
  for (const [key, value] of Object.entries(parsed)) {
    try {
      setCredential(key, value);
      successCount++;
      console.log(chalk.green(`  ✓ ${key}`));
    } catch (err) {
      failCount++;
      console.log(chalk.red(`  ✗ ${key}: ${err.message}`));
    }
  }
  
  console.log('');
  if (failCount === 0) {
    console.log(chalk.green(`✅ Successfully imported ${successCount} credential(s) into keychain\n`));
  } else {
    console.log(chalk.yellow(`⚠️  Imported ${successCount} credential(s), ${failCount} failed\n`));
  }
  
  console.log(chalk.gray('These credentials will be used automatically by all buwp-local projects.'));
  console.log(chalk.gray('You can override specific credentials per-project using .env.local files.\n'));
}

/**
 * Set a single credential
 */
async function setCommand(args, options) {
  if (args.length === 0) {
    console.log(chalk.red('❌ Missing credential key\n'));
    console.log(chalk.gray('Usage:'));
    console.log(chalk.gray('  buwp-local keychain set <KEY> [value]'));
    console.log(chalk.gray('  buwp-local keychain set <KEY> --file <path>'));
    console.log(chalk.gray('  cat file.pem | buwp-local keychain set <KEY> --stdin\n'));
    console.log(chalk.gray('Available keys:'));
    CREDENTIAL_KEYS.forEach(key => {
      const isMultiline = MULTILINE_CREDENTIALS.includes(key);
      console.log(chalk.gray(`  - ${key}${isMultiline ? ' (multiline)' : ''}`));
    });
    console.log('');
    process.exit(1);
  }

  const key = args[0];
  let value = args.slice(1).join(' ');

  if (!CREDENTIAL_KEYS.includes(key)) {
    console.log(chalk.red(`❌ Invalid credential key: ${key}\n`));
    console.log(chalk.gray('Available keys:'));
    CREDENTIAL_KEYS.forEach(k => {
      console.log(chalk.gray(`  - ${k}`));
    });
    console.log('');
    process.exit(1);
  }

  // Check if credential already exists
  const existing = hasCredential(key);
  if (existing && !options.force) {
    console.log(chalk.yellow(`⚠️  Credential ${key} already exists in keychain.\n`));
    const { shouldOverwrite } = await prompts({
      type: 'confirm',
      name: 'shouldOverwrite',
      message: 'Overwrite existing value?',
      initial: false
    });

    if (!shouldOverwrite) {
      console.log(chalk.gray('\nOperation cancelled.\n'));
      return;
    }
  }

  // Handle different input methods
  if (options.file) {
    // Read from file
    if (!fs.existsSync(options.file)) {
      console.log(chalk.red(`❌ File not found: ${options.file}\n`));
      process.exit(1);
    }
    try {
      value = fs.readFileSync(options.file, 'utf8');
      console.log(chalk.green(`📄 Read ${value.split('\n').length} line(s) from ${options.file}`));
    } catch (err) {
      console.log(chalk.red(`❌ Failed to read file: ${err.message}\n`));
      process.exit(1);
    }
  } else if (options.stdin) {
    // Read from stdin
    try {
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      value = Buffer.concat(chunks).toString('utf8');
      if (!value.trim()) {
        console.log(chalk.red('❌ No input received from stdin\n'));
        process.exit(1);
      }
      console.log(chalk.green(`📄 Read ${value.split('\n').length} line(s) from stdin`));
    } catch (err) {
      console.log(chalk.red(`❌ Failed to read from stdin: ${err.message}\n`));
      process.exit(1);
    }
  } else if (!value) {
    // Interactive prompt
    const isMultiline = isMultilineCredential(key);
    
    if (isMultiline) {
      console.log(chalk.red(`❌ ${key} is a multiline credential (cryptographic key/certificate).\n`));
      console.log(chalk.yellow('Multiline credentials must be provided via file or stdin:\n'));
      console.log(chalk.gray(`    buwp-local keychain set ${key} --file path/to/key.pem`));
      console.log(chalk.gray(`    cat key.pem | buwp-local keychain set ${key} --stdin\n`));
      process.exit(1);
    }
    
    // Regular single-line prompt
    console.log(chalk.yellow('⚠️  macOS may prompt you to allow keychain access.\n'));
    const description = CREDENTIAL_DESCRIPTIONS[key];
    
    const response = await prompts({
      type: 'text',
      name: 'value',
      message: description,
      validate: val => val.trim().length > 0 || 'Value cannot be empty'
    });

    if (!response.value) {
      console.log(chalk.gray('\nOperation cancelled.\n'));
      return;
    }

    value = response.value.trim();
  }

  // Validate and store the credential
  if (!value || !value.trim()) {
    console.log(chalk.red('❌ Empty value not allowed\n'));
    process.exit(1);
  }

  setCredential(key, value.trim());
  const lines = value.trim().split('\n').length;
  const lineText = lines === 1 ? 'line' : 'lines';
  console.log(chalk.green(`\n✅ Stored ${key} in keychain (${lines} ${lineText})\n`));
}

/**
 * Get a credential value (for debugging)
 */
async function getCommand(args) {
  if (args.length === 0) {
    console.log(chalk.red('❌ Missing credential key\n'));
    console.log(chalk.gray('Usage: buwp-local keychain get <KEY>\n'));
    process.exit(1);
  }

  const key = args[0];

  if (!CREDENTIAL_KEYS.includes(key)) {
    console.log(chalk.red(`❌ Invalid credential key: ${key}\n`));
    process.exit(1);
  }

  const value = getCredential(key);

  if (value === null) {
    console.log(chalk.yellow(`⚠️  Credential ${key} not found in keychain\n`));
    process.exit(1);
  }

  // Mask the value for security (show first/last 4 chars)
  let masked = value;
  if (value.length > 8) {
    const first = value.substring(0, 4);
    const last = value.substring(value.length - 4);
    const middle = '*'.repeat(Math.min(value.length - 8, 20));
    masked = `${first}${middle}${last}`;
  } else {
    masked = '*'.repeat(value.length);
  }

  console.log(chalk.cyan(`\n${key}:`));
  console.log(chalk.white(`  ${masked}`));
  console.log(chalk.gray(`  (length: ${value.length} characters)\n`));
}

/**
 * List all stored credentials
 */
async function listCommand() {
  console.log(chalk.blue('🔐 Stored Credentials\n'));

  const storedKeys = listCredentials();

  if (storedKeys.length === 0) {
    console.log(chalk.yellow('No credentials stored in keychain.\n'));
    console.log(chalk.gray('Run "buwp-local keychain setup" to configure credentials.\n'));
    return;
  }

  // Group by category
  for (const [groupName, keys] of Object.entries(CREDENTIAL_GROUPS)) {
    const groupKeys = keys.filter(k => storedKeys.includes(k));
    
    if (groupKeys.length > 0) {
      console.log(chalk.cyan(`\n${groupName.toUpperCase()}:`));
      groupKeys.forEach(key => {
        console.log(chalk.green(`  ✓ ${key}`));
      });
    } else {
      console.log(chalk.cyan(`\n${groupName.toUpperCase()}:`));
      console.log(chalk.gray('  (none stored)'));
    }
  }

  console.log(chalk.gray(`\nTotal: ${storedKeys.length} credential(s) stored\n`));
}

/**
 * Clear all credentials
 */
async function clearCommand(options) {
  console.log(chalk.red('⚠️  Clear All Credentials\n'));

  const storedKeys = listCredentials();

  if (storedKeys.length === 0) {
    console.log(chalk.yellow('No credentials stored in keychain.\n'));
    return;
  }

  console.log(chalk.gray(`This will remove ${storedKeys.length} credential(s) from your keychain:\n`));
  storedKeys.forEach(key => {
    console.log(chalk.gray(`  - ${key}`));
  });
  console.log('');

  if (!options.force) {
    const { confirmed } = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: 'Are you sure you want to clear all credentials?',
      initial: false
    });

    if (!confirmed) {
      console.log(chalk.gray('\nOperation cancelled.\n'));
      return;
    }
  }

  const deletedCount = clearAllCredentials();
  console.log(chalk.green(`\n✅ Removed ${deletedCount} credential(s) from keychain\n`));
}

/**
 * Show keychain status
 */
async function statusCommand() {
  console.log(chalk.blue('🔐 Keychain Status\n'));

  console.log(chalk.cyan('Platform:'));
  console.log(chalk.white(`  ${process.platform} ${isPlatformSupported() ? '(supported ✓)' : '(not supported ✗)'}\n`));

  if (!isPlatformSupported()) {
    console.log(chalk.yellow('Keychain integration is only available on macOS.\n'));
    return;
  }

  const storedKeys = listCredentials();
  const totalKeys = CREDENTIAL_KEYS.length;

  console.log(chalk.cyan('Credentials:'));
  console.log(chalk.white(`  ${storedKeys.length} of ${totalKeys} stored (${Math.round(storedKeys.length / totalKeys * 100)}%)\n`));

  // Show completeness by group
  for (const [groupName, keys] of Object.entries(CREDENTIAL_GROUPS)) {
    const storedInGroup = keys.filter(k => storedKeys.includes(k)).length;
    const emoji = storedInGroup === keys.length ? '✓' : storedInGroup > 0 ? '⚠' : '✗';
    console.log(chalk.gray(`  ${emoji} ${groupName}: ${storedInGroup}/${keys.length}`));
  }

  console.log('');

  if (storedKeys.length === 0) {
    console.log(chalk.yellow('No credentials configured yet.\n'));
    console.log(chalk.gray('Run "buwp-local keychain setup" to get started.\n'));
  } else if (storedKeys.length < totalKeys) {
    console.log(chalk.yellow('Some credentials are missing.\n'));
    console.log(chalk.gray('Run "buwp-local keychain setup" to configure all credentials.\n'));
  } else {
    console.log(chalk.green('All credentials configured! ✓\n'));
  }
}

/**
 * Show help message
 */
function showHelp() {
  console.log(chalk.blue('🔐 Keychain Command\n'));
  console.log('Manage credentials in macOS keychain for secure storage.\n');
  console.log(chalk.cyan('Usage:'));
  console.log('  buwp-local keychain <subcommand> [options]\n');
  console.log(chalk.cyan('Subcommands:'));
  console.log('  setup         Interactive credential setup (all credentials)');
  console.log('  set <KEY>     Set a single credential');
  console.log('  get <KEY>     Get a credential value (masked)');
  console.log('  list          List all stored credentials');
  console.log('  clear         Remove all credentials');
  console.log('  status        Show keychain status\n');
  console.log(chalk.cyan('Setup Command Options:'));
  console.log('  --file <path>  Bulk import credentials from JSON file\n');
  console.log(chalk.cyan('Set Command Options:'));
  console.log('  --file <path>  Read credential from file (required for multiline credentials)');
  console.log('  --stdin        Read credential from stdin (for piping)\n');
  console.log(chalk.cyan('Examples:'));
  console.log('  # Interactive setup (prompts for each credential)');
  console.log('  buwp-local keychain setup\n');
  console.log('  # Bulk import from JSON file');
  console.log('  buwp-local keychain setup --file .buwp-credentials.json\n');
  console.log('  # Interactive prompt for single-line credential');
  console.log('  buwp-local keychain set WORDPRESS_DB_PASSWORD\n');
  console.log('  # Set single-line credential directly');
  console.log('  buwp-local keychain set WORDPRESS_DB_PASSWORD mypassword\n');
  console.log('  # Set multiline credential from file (required for keys/certificates)');
  console.log('  buwp-local keychain set SHIB_SP_KEY --file private-key.pem\n');
  console.log('  # Pipe credential from file or command');
  console.log('  cat certificate.pem | buwp-local keychain set SHIB_SP_CERT --stdin\n');
  console.log(chalk.cyan('Global Options:'));
  console.log('  -f, --force   Skip confirmation prompts\n');
  console.log(chalk.cyan('Credentials File Format (JSON):'));
  console.log(chalk.gray('  {'));
  console.log(chalk.gray('    "version": "1.0",'));
  console.log(chalk.gray('    "source": "dev-server.bu.edu",'));
  console.log(chalk.gray('    "credentials": {'));
  console.log(chalk.gray('      "WORDPRESS_DB_PASSWORD": "password123",'));
  console.log(chalk.gray('      "SHIB_SP_KEY": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----",'));
  console.log(chalk.gray('      "S3_UPLOADS_BUCKET": "my-bucket"'));
  console.log(chalk.gray('    }'));
  console.log(chalk.gray('  }\n'));
}

export default keychainCommand;
