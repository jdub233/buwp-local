/**
 * macOS Keychain integration for secure credential storage
 * Uses the `security` command-line tool to interact with macOS Keychain
 */

import { execSync } from 'child_process';
import fs from 'fs';

// Keychain service name for all buwp-local credentials
const KEYCHAIN_SERVICE = 'buwp-local';

/**
 * All credential keys that can be stored in keychain
 */
export const CREDENTIAL_KEYS = [
  'WORDPRESS_DB_PASSWORD',
  'DB_ROOT_PASSWORD',
  'SP_ENTITY_ID',
  'IDP_ENTITY_ID',
  'SHIB_IDP_LOGOUT',
  'SHIB_SP_KEY',
  'SHIB_SP_CERT',
  'S3_UPLOADS_BUCKET',
  'S3_UPLOADS_REGION',
  'S3_UPLOADS_ACCESS_KEY_ID',
  'S3_UPLOADS_SECRET_ACCESS_KEY',
  'S3_ACCESS_RULES_TABLE',
  'OLAP',
  'OLAP_ACCT_NBR',
  'OLAP_REGION'
];

/**
 * Credentials organized by functional group
 */
export const CREDENTIAL_GROUPS = {
  database: ['WORDPRESS_DB_PASSWORD', 'DB_ROOT_PASSWORD'],
  shibboleth: ['SP_ENTITY_ID', 'IDP_ENTITY_ID', 'SHIB_IDP_LOGOUT', 'SHIB_SP_KEY', 'SHIB_SP_CERT'],
  s3: ['S3_UPLOADS_BUCKET', 'S3_UPLOADS_REGION', 'S3_UPLOADS_ACCESS_KEY_ID', 'S3_UPLOADS_SECRET_ACCESS_KEY', 'S3_ACCESS_RULES_TABLE'],
  olap: ['OLAP', 'OLAP_ACCT_NBR', 'OLAP_REGION']
};

/**
 * Credentials that contain multiline content (cryptographic keys, certificates)
 */
export const MULTILINE_CREDENTIALS = ['SHIB_SP_KEY', 'SHIB_SP_CERT'];

/**
 * Human-readable descriptions for each credential
 */
export const CREDENTIAL_DESCRIPTIONS = {
  WORDPRESS_DB_PASSWORD: 'WordPress database password',
  DB_ROOT_PASSWORD: 'Database root password',
  SP_ENTITY_ID: 'Shibboleth Service Provider Entity ID',
  IDP_ENTITY_ID: 'Shibboleth Identity Provider Entity ID',
  SHIB_IDP_LOGOUT: 'Shibboleth IDP logout URL',
  SHIB_SP_KEY: 'Shibboleth Service Provider private key (multiline)',
  SHIB_SP_CERT: 'Shibboleth Service Provider certificate (multiline)',
  S3_UPLOADS_BUCKET: 'S3 bucket name',
  S3_UPLOADS_REGION: 'S3 region (e.g., us-east-1)',
  S3_UPLOADS_ACCESS_KEY_ID: 'AWS access key ID',
  S3_UPLOADS_SECRET_ACCESS_KEY: 'AWS secret access key',
  S3_ACCESS_RULES_TABLE: 'S3 access rules table name',
  OLAP: 'OLAP name',
  OLAP_ACCT_NBR: 'OLAP account number',
  OLAP_REGION: 'OLAP region'
};

/**
 * Check if the current platform supports keychain operations
 * @returns {boolean} True if macOS, false otherwise
 */
export function isPlatformSupported() {
  return process.platform === 'darwin';
}

/**
 * Validate that a credential key is recognized
 * @param {string} key - Credential key to validate
 * @returns {boolean} True if valid
 */
export function isValidCredentialKey(key) {
  return CREDENTIAL_KEYS.includes(key);
}

/**
 * Get the group name for a credential key
 * @param {string} key - Credential key
 * @returns {string|null} Group name or null if not found
 */
export function getCredentialGroup(key) {
  for (const [groupName, keys] of Object.entries(CREDENTIAL_GROUPS)) {
    if (keys.includes(key)) {
      return groupName;
    }
  }
  return null;
}

/**
 * Check if a credential contains multiline content
 * @param {string} key - Credential key
 * @returns {boolean} True if credential is multiline
 */
export function isMultilineCredential(key) {
  return MULTILINE_CREDENTIALS.includes(key);
}

/**
 * Set a credential in the macOS keychain
 * Uses -U flag to update existing entries instead of creating duplicates
 * @param {string} key - Credential key (e.g., 'WORDPRESS_DB_PASSWORD')
 * @param {string} value - Credential value
 * @throws {Error} If platform is not supported or operation fails
 */
export function setCredential(key, value) {
  if (!isPlatformSupported()) {
    throw new Error('Keychain operations are only supported on macOS');
  }

  if (!isValidCredentialKey(key)) {
    throw new Error(`Invalid credential key: ${key}`);
  }

  try {
    // Use -U flag to update if exists, create if doesn't
    // -w flag allows password on command line (needed for automation)
    execSync(
      `security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "${key}" -w "${value}" -U`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    throw new Error(`Failed to store credential in keychain: ${err.message}`);
  }
}

/**
 * Get a credential from the macOS keychain
 * @param {string} key - Credential key
 * @returns {string|null} Credential value or null if not found
 * @throws {Error} If platform is not supported
 */
export function getCredential(key) {
  if (!isPlatformSupported()) {
    throw new Error('Keychain operations are only supported on macOS');
  }

  if (!isValidCredentialKey(key)) {
    throw new Error(`Invalid credential key: ${key}`);
  }

  try {
    // -w flag returns only the password (no other metadata)
    let result = execSync(
      `security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${key}" -w`,
      { stdio: 'pipe', encoding: 'utf8' }
    );
    result = result.trim();

    // Handle hex-encoded values (legacy format for multiline credentials)
    // Check if the value looks like hex (only hex digits, even length)
    if (isMultilineCredential(key) && isHexEncoded(result)) {
      try {
        result = Buffer.from(result, 'hex').toString('utf8');
      } catch (err) {
        // If hex decode fails, return original value
        console.warn(`Warning: Could not decode hex-encoded credential ${key}`);
      }
    }

    return result;
  } catch (err) {
    // Credential not found
    if (err.message.includes('could not be found')) {
      return null;
    }
    throw new Error(`Failed to retrieve credential from keychain: ${err.message}`);
  }
}

/**
 * Check if a string appears to be hex-encoded
 * @param {string} value - Value to check
 * @returns {boolean} True if value looks like hex
 */
function isHexEncoded(value) {
  // Must be even length and only contain hex digits
  return /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0;
}

/**
 * Check if a credential exists in the keychain
 * @param {string} key - Credential key
 * @returns {boolean} True if credential exists
 */
export function hasCredential(key) {
  if (!isPlatformSupported()) {
    return false;
  }

  if (!isValidCredentialKey(key)) {
    return false;
  }

  try {
    execSync(
      `security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${key}"`,
      { stdio: 'pipe' }
    );
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Delete a credential from the keychain
 * @param {string} key - Credential key
 * @throws {Error} If platform is not supported or operation fails
 */
export function deleteCredential(key) {
  if (!isPlatformSupported()) {
    throw new Error('Keychain operations are only supported on macOS');
  }

  if (!isValidCredentialKey(key)) {
    throw new Error(`Invalid credential key: ${key}`);
  }

  try {
    execSync(
      `security delete-generic-password -s "${KEYCHAIN_SERVICE}" -a "${key}"`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    // Ignore if credential doesn't exist
    if (!err.message.includes('could not be found')) {
      throw new Error(`Failed to delete credential from keychain: ${err.message}`);
    }
  }
}

/**
 * List all stored credentials (returns keys only, not values)
 * @returns {string[]} Array of credential keys that are stored
 */
export function listCredentials() {
  if (!isPlatformSupported()) {
    return [];
  }

  const storedKeys = [];
  
  for (const key of CREDENTIAL_KEYS) {
    if (hasCredential(key)) {
      storedKeys.push(key);
    }
  }
  
  return storedKeys;
}

/**
 * Clear all buwp-local credentials from keychain
 * @returns {number} Number of credentials deleted
 */
export function clearAllCredentials() {
  if (!isPlatformSupported()) {
    throw new Error('Keychain operations are only supported on macOS');
  }

  let deletedCount = 0;
  
  for (const key of CREDENTIAL_KEYS) {
    try {
      deleteCredential(key);
      deletedCount++;
    } catch (err) {
      // Continue deleting others even if one fails
    }
  }
  
  return deletedCount;
}

/**
 * Parse credentials from a JSON file
 * Expected format: { "credentials": { "KEY": "value", ... }, "version": "1.0", ... }
 * @param {string} filePath - Path to credentials JSON file
 * @returns {object} { parsed, unknown, metadata }
 */
export function parseCredentialsFile(filePath) {
  // Read and parse JSON file
  let data;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    } else if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON format: ${err.message}`);
    }
    throw new Error(`Failed to read file: ${err.message}`);
  }
  
  // Validate structure
  if (!data.credentials || typeof data.credentials !== 'object') {
    throw new Error('Invalid credentials file format: missing "credentials" object');
  }
  
  // Filter and validate keys
  const parsed = {};
  const unknown = [];
  
  for (const [key, value] of Object.entries(data.credentials)) {
    if (CREDENTIAL_KEYS.includes(key)) {
      // Validate value is non-empty string
      if (typeof value === 'string' && value.trim().length > 0) {
        parsed[key] = value;
      } else {
        unknown.push({ key, reason: 'empty or invalid value' });
      }
    } else {
      unknown.push({ key, reason: 'unknown credential key' });
    }
  }
  
  // Extract metadata
  const metadata = {
    version: data.version || 'unknown',
    source: data.source || 'unknown',
    exported: data.exported || null
  };
  
  return { parsed, unknown, metadata };
}
