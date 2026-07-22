/**
 * Database Query Retry Utility
 * 
 * Added Jul 22, 2026 after AP engine failure on Arizona primary night.
 * The production instance experienced DB connection pool exhaustion during
 * cold start, causing all queries to fail with "Failed query" errors.
 * 
 * This utility wraps DB operations with exponential backoff retry logic
 * to recover gracefully from transient connection failures.
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, 2s, 3s

/**
 * Execute a database operation with retry and exponential backoff.
 * Retries up to MAX_RETRIES times with increasing delays.
 * 
 * @param fn - Async function that performs the DB operation
 * @param label - Human-readable label for logging (e.g., "Senate query")
 * @returns The result of the DB operation
 * @throws The last error if all retries are exhausted
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  label: string = "DB operation"
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      
      // Don't retry on non-transient errors (e.g., syntax errors, constraint violations)
      if (isNonTransientError(msg)) {
        throw err;
      }
      
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * attempt;
        console.warn(`[dbRetry] ${label} failed (attempt ${attempt}/${MAX_RETRIES}): ${msg}. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error(`[dbRetry] ${label} failed after ${MAX_RETRIES} attempts: ${msg}`);
      }
    }
  }
  
  throw lastError;
}

/**
 * Determine if an error is non-transient (should not be retried).
 * Transient errors include: connection resets, timeouts, pool exhaustion, EPIPE.
 * Non-transient errors include: SQL syntax errors, constraint violations, unknown columns.
 */
function isNonTransientError(msg: string): boolean {
  const nonTransientPatterns = [
    "ER_PARSE_ERROR",        // SQL syntax error
    "ER_BAD_FIELD_ERROR",    // Unknown column
    "ER_NO_SUCH_TABLE",      // Table doesn't exist
    "ER_DUP_ENTRY",          // Duplicate key (constraint violation)
    "ER_DATA_TOO_LONG",      // Data truncation
    "ER_TRUNCATED_WRONG_VALUE", // Type mismatch
  ];
  
  return nonTransientPatterns.some(pattern => msg.includes(pattern));
}
