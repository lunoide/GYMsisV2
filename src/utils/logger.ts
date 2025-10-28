/**
 * Logger utility for development and production environments
 * In production, logs are disabled to improve performance and security
 */
const isDevelopment = import.meta.env.DEV || import.meta.env.VITE_NODE_ENV === 'development';
export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
    // In production, you might want to send errors to a monitoring service
    // Example: sendToErrorReporting(args);
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};
// For critical errors that should always be logged (even in production)
export const criticalLogger = {
  error: (...args: any[]) => {
    console.error('[CRITICAL]', ...args);
    // Send to error monitoring service in production
  }
};
export default logger;