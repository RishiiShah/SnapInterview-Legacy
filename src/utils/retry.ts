/**
 * Simple utility for retrying async operations with exponential backoff.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffFactor?: number;
    retryableErrorCodes?: Set<number | string>;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    backoffFactor = 2,
    retryableErrorCodes = new Set([429, 500, 502, 503, 504, "timeout", "ECONNRESET"]),
    signal,
  } = options;

  let lastError: any;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw signal.reason || new Error("Operation aborted");
    }

    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      const status = error?.status || error?.statusCode || error?.code;
      const isRetryable = retryableErrorCodes.has(status) || 
                         (error?.message && error.message.toLowerCase().includes("timeout"));

      if (!isRetryable || attempt === maxRetries || signal?.aborted) {
        throw error;
      }

      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, {
        status,
        message: error?.message,
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, delay);
        signal?.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(signal.reason || new Error("Operation aborted"));
        }, { once: true });
      });
      delay *= backoffFactor;
    }
  }

  throw lastError;
}
