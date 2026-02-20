/**
 * Retry utility for handling transient failures
 */

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors, timeouts, and 5xx errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    return false;
  }
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if we've exhausted attempts or if error shouldn't be retried
      if (attempt === opts.maxRetries || !opts.shouldRetry(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
