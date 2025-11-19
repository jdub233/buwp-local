/**
 * buwp-local - BU WordPress Local Development Environment
 * Main library exports
 */

import * as config from './config.js';
import * as composeGenerator from './compose-generator.js';

export const loadConfig = config.loadConfig;
export const validateConfig = config.validateConfig;
export const initConfig = config.initConfig;
export const generateComposeConfig = composeGenerator.generateComposeConfig;
export const generateComposeFile = composeGenerator.generateComposeFile;
export const CONFIG_FILE_NAME = config.CONFIG_FILE_NAME;
export const ENV_FILE_NAME = config.ENV_FILE_NAME;
export const DEFAULT_CONFIG = config.DEFAULT_CONFIG;
