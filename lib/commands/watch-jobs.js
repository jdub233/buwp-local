/**
 * Watch Jobs command - Periodically process site-manager jobs
 * Mirrors production cron/EventBridge behavior for local development
 */

import chalk from 'chalk';
import { execSync, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { loadConfig } from '../config.js';

const DEFAULT_INTERVAL = 60; // 1 minute in seconds
const MIN_INTERVAL = 10; // Minimum 10 seconds

/**
 * Format timestamp for log output
 */
function timestamp() {
  const now = new Date();
  return now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(',', '');
}

/**
 * Check if container is running
 */
function isContainerRunning(projectName, composePath) {
  try {
    const result = execSync(
      `docker compose -p ${projectName} -f "${composePath}" ps --status running --services`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    return result.includes('wordpress');
  } catch (err) {
    return false;
  }
}

/**
 * Process site-manager jobs
 */
async function processJobs(projectName, composePath, quiet) {
  return new Promise((resolve) => {
    const composeDir = path.dirname(composePath);
    const command = `docker compose -p ${projectName} -f "${composePath}" exec -T wordpress wp site-manager process-jobs`;

    if (!quiet) {
      console.log(chalk.gray(`[${timestamp()}] Checking for jobs...`));
    }

    exec(command, { cwd: composeDir }, (error, stdout, stderr) => {
      if (error) {
        // In quiet mode, silently retry on transient errors (container might restart)
        // Only verbose mode shows these errors
        if (!quiet) {
          if (stderr.includes('container') || stderr.includes('not running')) {
            console.log(chalk.yellow(`[${timestamp()}] ⚠️  Container not running. Waiting...`));
          } else {
            console.log(chalk.red(`[${timestamp()}] ❌ Error executing command:`));
            console.log(chalk.red(stderr || error.message));
          }
        }
        resolve(false);
        return;
      }

      const output = stdout.trim();
      
      // Check if jobs were found and processed
      if (output && output.length > 0) {
        // In quiet mode, suppress all output (user checks web UI for job status)
        // In verbose mode, show full job output
        if (!quiet) {
          console.log(chalk.green(`[${timestamp()}] ✓ Processing jobs:`));
          console.log(output);
        }
        resolve(true);
      } else if (!quiet) {
        // No jobs found - only show in verbose mode
        console.log(chalk.gray(`[${timestamp()}] No jobs found.`));
        resolve(false);
      } else {
        // Quiet mode and no jobs - silent
        resolve(false);
      }
    });
  });
}

/**
 * Watch jobs command
 */
async function watchJobsCommand(options) {
  try {
    const projectPath = process.cwd();
    const composePath = path.join(projectPath, '.buwp-local', 'docker-compose.yml');

    // Check if docker-compose.yml exists
    if (!fs.existsSync(composePath)) {
      console.log(chalk.yellow('⚠️  No running environment found.'));
      console.log(chalk.gray('Run "buwp-local start" to create an environment.\n'));
      return;
    }

    // Load config to get project name and optional interval setting
    const config = loadConfig(projectPath);
    const projectName = config.projectName || 'buwp-local';

    // Determine interval (priority: CLI flag > config file > default)
    let interval = DEFAULT_INTERVAL;
    if (options.interval) {
      interval = parseInt(options.interval, 10);
      if (isNaN(interval) || interval < MIN_INTERVAL) {
        console.log(chalk.red(`❌ Invalid interval. Minimum is ${MIN_INTERVAL} seconds.`));
        process.exit(1);
      }
    } else if (config.jobWatchInterval) {
      interval = config.jobWatchInterval;
      if (interval < MIN_INTERVAL) {
        console.log(chalk.yellow(`⚠️  Config interval too low. Using minimum: ${MIN_INTERVAL}s`));
        interval = MIN_INTERVAL;
      }
    }

    const quiet = options.quiet || false;

    // Check if Docker is running
    try {
      execSync('docker info', { stdio: 'ignore' });
    } catch (err) {
      console.error(chalk.red('❌ Docker is not running.'));
      console.log(chalk.gray('Start Docker Desktop and try again.'));
      process.exit(1);
    }

    // Check if container is running initially
    if (!isContainerRunning(projectName, composePath)) {
      console.log(chalk.yellow('⚠️  WordPress container is not running.'));
      console.log(chalk.gray('Run "buwp-local start" first, then try again.\n'));
      return;
    }

    // Display startup message
    console.log(chalk.cyan('🔍 Watching for site-manager jobs...'));
    console.log(chalk.gray(`   Interval: ${interval}s`));
    console.log(chalk.gray(`   Project: ${projectName}`));
    console.log(chalk.gray(`   Mode: ${quiet ? 'quiet' : 'verbose'}`));
    console.log(chalk.gray('\nPress Ctrl+C to stop\n'));

    // Set up graceful shutdown
    let isShuttingDown = false;
    const shutdown = () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(chalk.cyan('\n\n👋 Stopping job watcher...'));
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Main watch loop
    const watch = async () => {
      // Check if we should stop
      if (isShuttingDown) return;

      // Process jobs
      await processJobs(projectName, composePath, quiet);

      // Schedule next check
      if (!isShuttingDown) {
        setTimeout(watch, interval * 1000);
      }
    };

    // Start watching
    await watch();

  } catch (err) {
    console.error(chalk.red('\n❌ Error:'), err.message);
    process.exit(1);
  }
}

export default watchJobsCommand;
