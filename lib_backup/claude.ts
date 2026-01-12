/**
 * Claude AI Integration for Reference App Analysis
 * ================================================
 *
 * This module provides a comprehensive integration with the Claude AI API
 * for analyzing mobile app screenshots. It uses Claude's vision capabilities
 * to extract design patterns, user flows, and feature sets from app screenshots.
 *
 * ## Architecture Overview
 *
 * The module is organized into several key sections:
 *
 * 1. **Configuration & Client Management**
 *    - Lazy client initialization with API key validation
 *    - Environment-based configuration via `EXPO_PUBLIC_ANTHROPIC_API_KEY`
 *
 * 2. **Error Handling**
 *    - Typed errors with `ClaudeApiError` interface
 *    - User-friendly error messages for each error code
 *    - Automatic error classification (retryable vs non-retryable)
 *
 * 3. **Retry Logic & Rate Limiting**
 *    - Exponential backoff with jitter for transient failures
 *    - Rate limit tracking and proactive waiting
 *    - Configurable retry parameters via `RetryConfig`
 *
 * 4. **Caching Layer**
 *    - Checksum-based cache invalidation
 *    - Automatic cache lookup before API calls
 *    - Cache status callbacks for UI feedback
 *
 * 5. **Image Processing**
 *    - Base64 encoding for Claude's vision API
 *    - Image validation (size, format)
 *    - Graceful handling of failed image fetches
 *
 * 6. **Response Validation**
 *    - Zod schema validation for all API responses
 *    - Structured extraction of analysis data
 *    - JSON parsing with markdown code block handling
 *
 * ## Key Integration Patterns
 *
 * ### Result Pattern
 * All API functions return a `Result<T, ClaudeApiError>` type for explicit
 * success/failure handling:
 *
 * ```typescript
 * const result = await analyzeAppScreenshots(appName, screenshots, options);
 *
 * if (result.success) {
 *   // TypeScript knows result.data is AppAnalysis
 *   console.log(result.data.designPatterns);
 * } else {
 *   // TypeScript knows result.error is ClaudeApiError
 *   console.error(result.error.userMessage);
 * }
 * ```
 *
 * ### Progress Callbacks
 * Long-running operations support progress callbacks:
 *
 * ```typescript
 * await analyzeAppScreenshots(appName, screenshots, {
 *   onProgress: (progress) => {
 *     // progress is 0-100
 *     updateProgressBar(progress);
 *   },
 * });
 * ```
 *
 * ### Error Recovery
 * Errors include metadata for intelligent retry decisions:
 *
 * ```typescript
 * if (!result.success) {
 *   if (result.error.retryable) {
 *     // Safe to retry after delay
 *     await sleep(result.error.retryAfterMs ?? 1000);
 *     // Retry...
 *   } else {
 *     // Show error to user
 *     showError(result.error.userMessage);
 *   }
 * }
 * ```
 *
 * ### Caching Integration
 * Enable caching by providing an `appId`:
 *
 * ```typescript
 * const result = await analyzeAppScreenshots(appName, screenshots, {
 *   appId: referenceApp.id,  // Enables caching
 *   onCacheStatus: (status) => {
 *     // 'checking' | 'hit' | 'miss' | 'storing' | 'stored' | 'store_failed'
 *     updateCacheIndicator(status);
 *   },
 *   forceRefresh: false,  // Set true to skip cache
 * });
 * ```
 *
 * ## Dependencies
 *
 * - `@anthropic-ai/sdk`: Official Anthropic SDK for API calls
 * - `zod`: Runtime type validation for API responses
 * - `./apiConfig`: API key validation utilities
 * - `./analysisCache`: Caching layer implementation
 *
 * ## Environment Variables
 *
 * - `EXPO_PUBLIC_ANTHROPIC_API_KEY`: Required. Your Anthropic API key.
 *   Must start with 'sk-ant-' and be at least 40 characters.
 *
 * @module lib/claude
 * @see {@link analyzeAppScreenshots} - Main analysis function
 * @see {@link compareApps} - Multi-app comparison function
 * @see {@link ClaudeApiError} - Error type definition
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type {
  AppAnalysis,
  Screenshot,
  ScreenAnalysis,
  UIPattern,
  UserFlow,
  FeatureSet,
  ColorPalette,
  Typography,
  AppComparison,
  ReferenceApp,
  Result,
  ClaudeApiError,
  ClaudeApiErrorCode,
  RetryConfig,
  AnalysisResultWithCache,
  CacheInvalidationReason,
} from '../types/analyze';
import { DEFAULT_RETRY_CONFIG } from '../types/analyze';
import { validateClaudeApiConfig, getClaudeApiKey } from './apiConfig';
import {
  lookupCachedAnalysis,
  storeCachedAnalysis,
  type CacheLookupResult,
} from './analysisCache';

// ============================================
// Configuration Constants
// ============================================
//
// These constants define the operational limits for the Claude API integration.
// They are tuned based on:
// - Claude API limits and typical response times
// - Mobile app memory constraints (base64 encoding is memory-intensive)
// - User experience considerations (reasonable wait times)
//
// To customize these values for your use case, consider creating a wrapper
// function that passes custom options to the main API functions.

/**
 * Default timeout for API requests in milliseconds (60 seconds)
 *
 * This timeout is generous to account for:
 * - Claude processing up to 10 high-resolution screenshots
 * - Network latency variations
 * - JSON parsing of large responses
 *
 * For faster feedback on simpler requests, you can pass a custom
 * `timeoutMs` option to `analyzeAppScreenshots()`.
 */
const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Maximum screenshots per analysis request
 *
 * This limit is set based on:
 * - Claude's context window constraints
 * - Memory usage from base64 encoding (each screenshot can be 1-5MB)
 * - API response time (more screenshots = longer processing)
 *
 * If you have more than 10 screenshots, the function will:
 * 1. Analyze only the first 10 screenshots
 * 2. Log a warning about truncation
 * 3. Call the `onBatching` callback if provided
 *
 * Consider splitting large screenshot sets across multiple analysis calls
 * and combining results client-side.
 */
const MAX_SCREENSHOTS_PER_REQUEST = 10;

// ============================================
// Lazy Client Initialization
// ============================================
//
// The Anthropic client is initialized lazily (on first use) rather than at
// module load time. This pattern provides several benefits:
//
// 1. **Faster App Startup**: The app doesn't block on API key validation
//    during initial load.
//
// 2. **Better Error Handling**: API key errors are surfaced in context
//    (when the user tries to analyze) rather than at startup.
//
// 3. **Testing Flexibility**: Tests can mock the client before first use.
//
// The client is cached after successful initialization, so subsequent calls
// return the same instance without re-validation.

/** Cached Anthropic client instance (singleton pattern) */
let anthropicClient: Anthropic | null = null;

/**
 * Gets or creates the Anthropic client with lazy initialization
 *
 * This function implements a singleton pattern for the Anthropic client:
 * - First call: Validates API key and creates client
 * - Subsequent calls: Returns cached client
 *
 * @returns Result containing the Anthropic client or an error if API key is invalid
 *
 * @example
 * ```typescript
 * const clientResult = getAnthropicClient();
 * if (!clientResult.success) {
 *   // Handle missing/invalid API key
 *   showConfigurationError(clientResult.error.userMessage);
 *   return;
 * }
 * const client = clientResult.data;
 * // Use client for API calls...
 * ```
 *
 * @internal This is an internal function. Use the public API functions
 * (`analyzeAppScreenshots`, `compareApps`, etc.) instead.
 */
function getAnthropicClient(): Result<Anthropic, ClaudeApiError> {
  if (anthropicClient) {
    return { success: true, data: anthropicClient };
  }

  const apiKeyResult = getClaudeApiKey();
  if (!apiKeyResult.success) {
    // Type narrow: apiKeyResult.error is Error when success is false
    const errorMessage = apiKeyResult.error instanceof Error
      ? apiKeyResult.error.message
      : String(apiKeyResult.error);
    return {
      success: false,
      error: createClaudeApiError('API_KEY_INVALID', errorMessage),
    };
  }

  anthropicClient = new Anthropic({
    apiKey: apiKeyResult.data,
  });

  return { success: true, data: anthropicClient };
}

// ============================================
// Error Handling Utilities
// ============================================
//
// This module uses a structured error handling approach with the following goals:
//
// 1. **Type Safety**: All errors are typed as `ClaudeApiError` with specific codes
// 2. **User-Friendly Messages**: Each error has a human-readable message for UI display
// 3. **Retry Intelligence**: Errors indicate whether they're safe to retry
// 4. **Debugging Support**: Technical details are preserved in `message` and `originalError`
//
// ## Error Flow Example
//
// ```
// API Call Fails
//     ↓
// parseAnthropicError() - Classifies the error
//     ↓
// createClaudeApiError() - Creates structured error with user message
//     ↓
// Result<T, ClaudeApiError> - Returned to caller
//     ↓
// Caller checks error.retryable and error.userMessage
// ```
//
// ## Adding New Error Codes
//
// To add a new error code:
// 1. Add the code to `ClaudeApiErrorCode` type in types/analyze.ts
// 2. Add a user-friendly message to `ERROR_USER_MESSAGES` below
// 3. Update `isRetryableError()` if the error should trigger retries
// 4. Handle the code in `parseAnthropicError()` if needed

/**
 * User-friendly error messages for each error code
 *
 * These messages are designed to be shown directly to users in the UI.
 * They should be:
 * - Actionable (tell the user what to do)
 * - Non-technical (avoid jargon)
 * - Concise (fit in a toast/alert)
 */
const ERROR_USER_MESSAGES: Record<ClaudeApiErrorCode, string> = {
  API_KEY_INVALID: 'Claude API key is not configured or invalid. Please check your settings.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  TIMEOUT: 'The analysis took too long. Please try again with fewer screenshots.',
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  RESPONSE_PARSE_ERROR: 'Failed to parse the analysis response. Please try again.',
  VALIDATION_ERROR: 'The analysis response was invalid. Please try again.',
  IMAGE_FETCH_ERROR: 'Failed to load one or more screenshots. Please check the image URLs.',
  IMAGE_INVALID: 'One or more screenshots are corrupted or invalid.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

/**
 * Creates a structured ClaudeApiError from error code and message
 *
 * This factory function ensures consistent error creation across the module.
 * It automatically:
 * - Looks up the user-friendly message for the error code
 * - Determines if the error is retryable
 * - Sets a default retry delay for retryable errors
 *
 * @param code - The error code identifying the type of error
 * @param message - Technical error message for debugging
 * @param options - Additional error metadata
 * @returns A fully populated ClaudeApiError
 *
 * @example
 * ```typescript
 * // Simple error
 * const error = createClaudeApiError('TIMEOUT', 'Request exceeded 60s limit');
 *
 * // Error with additional context
 * const error = createClaudeApiError('RATE_LIMITED', 'HTTP 429', {
 *   statusCode: 429,
 *   retryAfterMs: 30000,
 *   originalError: httpError,
 * });
 * ```
 */
export function createClaudeApiError(
  code: ClaudeApiErrorCode,
  message: string,
  options?: {
    statusCode?: number;
    retryAfterMs?: number;
    originalError?: Error;
  }
): ClaudeApiError {
  const retryable = isRetryableError(code);

  return {
    code,
    message,
    userMessage: ERROR_USER_MESSAGES[code],
    retryable,
    retryAfterMs: options?.retryAfterMs ?? (retryable ? DEFAULT_RETRY_CONFIG.initialDelayMs : undefined),
    statusCode: options?.statusCode,
    originalError: options?.originalError,
  };
}

/**
 * Determines if an error code indicates a retryable error
 *
 * Retryable errors are transient failures that may succeed on retry:
 * - `RATE_LIMITED`: API quota temporarily exceeded (retry after delay)
 * - `TIMEOUT`: Request took too long (may work with fewer screenshots)
 * - `NETWORK_ERROR`: Connection failed (may work when connection restored)
 *
 * Non-retryable errors require user action:
 * - `API_KEY_INVALID`: Configuration fix needed
 * - `VALIDATION_ERROR`: Invalid input data
 * - `IMAGE_INVALID`: Bad image files
 *
 * @param code - The error code to check
 * @returns true if the error is safe to retry
 */
function isRetryableError(code: ClaudeApiErrorCode): boolean {
  return ['RATE_LIMITED', 'TIMEOUT', 'NETWORK_ERROR'].includes(code);
}

/**
 * Parses an error from the Anthropic SDK into a ClaudeApiError
 *
 * This function classifies errors from various sources:
 * - Anthropic SDK errors (APIError with status codes)
 * - Standard JavaScript errors (Error instances)
 * - Unknown error types (strings, objects, etc.)
 *
 * Classification logic:
 * - HTTP 429 → RATE_LIMITED (with retry-after extraction)
 * - HTTP 401/403 → API_KEY_INVALID
 * - HTTP 5xx → NETWORK_ERROR (server issues, retryable)
 * - Timeout messages → TIMEOUT
 * - Network/fetch messages → NETWORK_ERROR
 * - Everything else → UNKNOWN_ERROR
 *
 * @param error - The raw error from an API call or other operation
 * @returns A structured ClaudeApiError with appropriate code and messages
 *
 * @example
 * ```typescript
 * try {
 *   await client.messages.create({ ... });
 * } catch (error) {
 *   const claudeError = parseAnthropicError(error);
 *   if (claudeError.retryable) {
 *     // Schedule retry
 *   } else {
 *     // Show error to user
 *   }
 * }
 * ```
 */
export function parseAnthropicError(error: unknown): ClaudeApiError {
  // Handle Anthropic SDK errors
  if (error instanceof Anthropic.APIError) {
    const statusCode = error.status;

    // Rate limiting (429)
    if (statusCode === 429) {
      // Extract retry-after header if present
      const retryAfter = error.headers?.['retry-after'];
      const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 30000;

      return createClaudeApiError(
        'RATE_LIMITED',
        `Rate limited: ${error.message}`,
        { statusCode, retryAfterMs, originalError: error }
      );
    }

    // Authentication errors (401, 403)
    if (statusCode === 401 || statusCode === 403) {
      return createClaudeApiError(
        'API_KEY_INVALID',
        `Authentication failed: ${error.message}`,
        { statusCode, originalError: error }
      );
    }

    // Server errors (500+) - typically retryable
    if (statusCode && statusCode >= 500) {
      return createClaudeApiError(
        'NETWORK_ERROR',
        `Server error: ${error.message}`,
        { statusCode, originalError: error }
      );
    }

    // Other API errors
    return createClaudeApiError(
      'UNKNOWN_ERROR',
      error.message,
      { statusCode, originalError: error }
    );
  }

  // Handle timeout errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      return createClaudeApiError(
        'TIMEOUT',
        `Request timed out: ${error.message}`,
        { originalError: error }
      );
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return createClaudeApiError(
        'NETWORK_ERROR',
        `Network error: ${error.message}`,
        { originalError: error }
      );
    }

    // Generic error
    return createClaudeApiError(
      'UNKNOWN_ERROR',
      error.message,
      { originalError: error }
    );
  }

  // Unknown error type
  return createClaudeApiError(
    'UNKNOWN_ERROR',
    String(error)
  );
}

// ============================================
// Retry Logic
// ============================================
//
// Retry logic is critical for reliable API integration. This section implements
// exponential backoff with jitter, following industry best practices:
//
// ## Why Exponential Backoff?
//
// When an API is under load, immediate retries can worsen the situation.
// Exponential backoff spaces out retries exponentially (1s, 2s, 4s, 8s...)
// giving the API time to recover.
//
// ## Why Jitter?
//
// Without jitter, all clients retry at the same time, creating "thundering herd"
// spikes. Adding random jitter spreads retries across time.
//
// ## Formula
//
// ```
// delay = min(initialDelay * (multiplier ^ attempt), maxDelay) + random(0, delay * jitterFactor)
// ```
//
// ## Default Configuration
//
// - Initial delay: 1 second
// - Max delay: 30 seconds
// - Multiplier: 2 (doubles each attempt)
// - Jitter: 10% random variation
// - Max retries: 3 attempts
//
// ## Customization
//
// Pass a custom `RetryConfig` to override any of these defaults.

/**
 * Calculates delay for exponential backoff with jitter
 *
 * The delay formula is:
 * `min(initialDelay * (multiplier ^ attempt), maxDelay) + jitter`
 *
 * @param attempt - Zero-based attempt number (0 for first retry)
 * @param config - Retry configuration parameters
 * @returns Delay in milliseconds before the next retry
 *
 * @example
 * ```typescript
 * // With defaults: attempt 0 = ~1000ms, attempt 1 = ~2000ms, etc.
 * const delay0 = calculateBackoffDelay(0); // ~1000-1100ms
 * const delay1 = calculateBackoffDelay(1); // ~2000-2200ms
 * const delay2 = calculateBackoffDelay(2); // ~4000-4400ms
 *
 * // With custom config
 * const delay = calculateBackoffDelay(1, { initialDelayMs: 500, ... });
 * ```
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (random variation) to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * Math.random();

  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes an async function with retry logic
 *
 * This is a general-purpose retry wrapper that handles:
 * - Automatic retries for retryable errors
 * - Exponential backoff between attempts
 * - Rate limit header extraction (retry-after)
 * - Progress callbacks for monitoring
 *
 * The function will NOT retry errors marked as non-retryable
 * (e.g., invalid API key, validation errors).
 *
 * @param fn - The async function to execute (called on each attempt)
 * @param config - Retry configuration (uses DEFAULT_RETRY_CONFIG if not provided)
 * @param onRetry - Optional callback invoked before each retry attempt
 * @returns Result with data (if any attempt succeeded) or error (if all failed)
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await withRetry(
 *   () => client.messages.create({ model: 'claude-sonnet-4-20250514', ... }),
 * );
 *
 * // With retry monitoring
 * const result = await withRetry(
 *   () => client.messages.create({ ... }),
 *   { maxRetries: 5, initialDelayMs: 2000 },
 *   (attempt, error, delayMs) => {
 *     console.log(`Retry ${attempt}: ${error.code}, waiting ${delayMs}ms`);
 *     showRetryToast(`Retrying in ${delayMs/1000}s...`);
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Custom retry config for time-sensitive operations
 * const result = await withRetry(
 *   () => quickApiCall(),
 *   {
 *     maxRetries: 2,
 *     initialDelayMs: 500,
 *     maxDelayMs: 2000,
 *     backoffMultiplier: 1.5,
 *     jitterFactor: 0.2,
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: ClaudeApiError, delayMs: number) => void
): Promise<Result<T, ClaudeApiError>> {
  let lastError: ClaudeApiError | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn();
      return { success: true, data: result };
    } catch (error) {
      lastError = parseAnthropicError(error);

      // Don't retry non-retryable errors
      if (!lastError.retryable) {
        return { success: false, error: lastError };
      }

      // Don't retry if we've exhausted retries
      if (attempt === config.maxRetries) {
        break;
      }

      // Calculate delay (use retry-after if provided, otherwise exponential backoff)
      const delayMs = lastError.retryAfterMs ?? calculateBackoffDelay(attempt, config);

      // Notify about retry
      onRetry?.(attempt + 1, lastError, delayMs);

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError ?? createClaudeApiError('UNKNOWN_ERROR', 'All retry attempts failed'),
  };
}

/**
 * Wraps a promise with a timeout
 *
 * Creates a race between the original promise and a timeout timer.
 * If the timeout wins, the promise rejects with a timeout error.
 *
 * Note: This does NOT cancel the underlying operation. The original
 * promise will continue running in the background but its result
 * will be ignored.
 *
 * @param promise - The promise to wrap with a timeout
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 60s)
 * @returns A promise that rejects if the timeout is exceeded
 * @throws Error with message containing "timed out" for timeout detection
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await withTimeout(
 *   client.messages.create({ ... }),
 *   30000  // 30 second timeout
 * );
 *
 * // Combined with retry
 * const result = await withRetry(() =>
 *   withTimeout(client.messages.create({ ... }), 30000)
 * );
 * ```
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// ============================================
// Rate Limiting State
// ============================================
//
// Rate limiting is tracked in memory to proactively prevent unnecessary
// API calls when we know they'll fail. This provides several benefits:
//
// 1. **User Experience**: Instead of making a doomed API call and waiting
//    for it to fail, we can immediately show "please wait X seconds".
//
// 2. **API Health**: Reduces load on the API during rate limit periods.
//
// 3. **Cost Efficiency**: Avoids wasting API quota on calls we know will fail.
//
// ## How It Works
//
// When a rate limit error (429) is received:
// 1. `recordRateLimitHit()` stores the reset time and increments hit counter
// 2. Subsequent calls check `getRateLimitWaitTime()` before making requests
// 3. If wait time > 0, the request is rejected immediately with a user message
// 4. On successful request, `clearRateLimitState()` resets the tracker
//
// ## Limitations
//
// - State is per-process (not shared across app instances)
// - State is lost on app restart
// - Does not account for rate limits across multiple API keys
//
// For production use with multiple app instances, consider implementing
// distributed rate limit tracking (e.g., Redis-based).

/**
 * Simple in-memory rate limit tracker
 * Tracks when we've hit rate limits to avoid hammering the API
 */
interface RateLimitState {
  isLimited: boolean;
  resetAt: number | null;
  consecutiveHits: number;
}

let rateLimitState: RateLimitState = {
  isLimited: false,
  resetAt: null,
  consecutiveHits: 0,
};

/**
 * Updates rate limit state when a rate limit error is encountered
 */
function recordRateLimitHit(retryAfterMs?: number): void {
  rateLimitState.isLimited = true;
  rateLimitState.resetAt = Date.now() + (retryAfterMs ?? 30000);
  rateLimitState.consecutiveHits += 1;
}

/**
 * Clears rate limit state after a successful request
 */
function clearRateLimitState(): void {
  rateLimitState.isLimited = false;
  rateLimitState.resetAt = null;
  rateLimitState.consecutiveHits = 0;
}

/**
 * Checks if we're currently rate limited and should wait
 * Returns the wait time in ms, or 0 if not limited
 */
export function getRateLimitWaitTime(): number {
  if (!rateLimitState.isLimited || !rateLimitState.resetAt) {
    return 0;
  }

  const waitTime = rateLimitState.resetAt - Date.now();
  if (waitTime <= 0) {
    // Rate limit period has passed
    rateLimitState.isLimited = false;
    rateLimitState.resetAt = null;
    return 0;
  }

  return waitTime;
}

/**
 * Gets rate limit status for display to user
 *
 * Use this to show rate limit information in the UI:
 * - `isLimited`: Whether we're currently rate limited
 * - `waitTimeMs`: How long until the rate limit resets
 * - `consecutiveHits`: How many times we've hit the limit (for backoff UI)
 *
 * @returns Current rate limit status
 *
 * @example
 * ```typescript
 * const status = getRateLimitStatus();
 * if (status.isLimited) {
 *   showMessage(`Please wait ${Math.ceil(status.waitTimeMs / 1000)} seconds`);
 *   disableAnalyzeButton();
 *   setTimeout(enableAnalyzeButton, status.waitTimeMs);
 * }
 * ```
 */
export function getRateLimitStatus(): { isLimited: boolean; waitTimeMs: number; consecutiveHits: number } {
  return {
    isLimited: rateLimitState.isLimited,
    waitTimeMs: getRateLimitWaitTime(),
    consecutiveHits: rateLimitState.consecutiveHits,
  };
}

// ============================================
// Zod Schema Validation
// ============================================
//
// All Claude API responses are validated using Zod schemas to ensure
// type safety at runtime. This protects against:
//
// - Claude returning unexpected response formats
// - API version changes breaking assumptions
// - Malformed JSON parsing issues
//
// ## Schema Structure
//
// The schemas mirror the TypeScript types in types/analyze.ts:
// - `screenAnalysisSchema` → `ScreenAnalysis`
// - `uiPatternSchema` → `UIPattern`
// - `userFlowSchema` → `UserFlow`
// - `featureSetSchema` → `FeatureSet`
// - `colorPaletteSchema` → `ColorPalette`
// - `typographySchema` → `Typography`
// - `appAnalysisSchema` → `AppAnalysis` (combines all above)
//
// ## Validation Flow
//
// 1. Claude returns JSON (possibly wrapped in markdown code block)
// 2. Extract JSON string (strip markdown if present)
// 3. Parse with JSON.parse()
// 4. Validate with Zod schema
// 5. Return typed result or validation error
//
// ## Error Handling
//
// If validation fails, the error includes:
// - Which fields failed validation
// - What the expected types were
// - The actual values received (for debugging)

// Zod schemas for response validation
const screenAnalysisSchema = z.object({
  index: z.number(),
  screenName: z.string(),
  screenType: z.enum(['onboarding', 'home', 'list', 'detail', 'form', 'settings', 'profile', 'modal', 'other']),
  components: z.array(z.string()),
  patterns: z.array(z.string()),
  navigation: z.array(z.string()),
  interactions: z.array(z.string()),
  notes: z.string().optional(),
});

const uiPatternSchema = z.object({
  name: z.string(),
  description: z.string(),
  frequency: z.enum(['single_screen', 'multiple_screens', 'all_screens']),
  components: z.array(z.string()),
  screenshotIndices: z.array(z.number()),
});

const userFlowSchema = z.object({
  name: z.string(),
  description: z.string(),
  stepCount: z.number(),
  screens: z.array(z.string()),
  screenshotIndices: z.array(z.number()),
  complexity: z.enum(['simple', 'moderate', 'complex']),
});

const featureSetSchema = z.object({
  core: z.array(z.string()),
  niceToHave: z.array(z.string()),
  differentiators: z.array(z.string()),
});

const colorPaletteSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  textSecondary: z.string(),
  success: z.string().optional(),
  warning: z.string().optional(),
  error: z.string().optional(),
});

const typographySchema = z.object({
  headingFont: z.string(),
  headingSize: z.string(),
  headingWeight: z.string(),
  bodyFont: z.string(),
  bodySize: z.string(),
  bodyWeight: z.string(),
  captionFont: z.string().optional(),
  captionSize: z.string().optional(),
});

const appAnalysisSchema = z.object({
  analyzedAt: z.string(),
  screensAnalyzed: z.number(),
  screens: z.array(screenAnalysisSchema),
  designPatterns: z.array(uiPatternSchema),
  userFlows: z.array(userFlowSchema),
  featureSet: featureSetSchema,
  colorPalette: colorPaletteSchema,
  typography: typographySchema,
  overallStyle: z.string(),
  targetAudience: z.string(),
  uniqueSellingPoints: z.array(z.string()),
  improvementOpportunities: z.array(z.string()),
});

// Analysis prompt template
const ANALYSIS_PROMPT = `You are an expert mobile app UI/UX analyst. Analyze the provided app screenshots thoroughly and extract detailed information about design patterns, user flows, and feature sets.

For each screenshot provided, analyze:
1. Screen type and purpose
2. UI components used (buttons, cards, lists, navigation, etc.)
3. Design patterns (bottom tabs, floating action buttons, swipeable cards, etc.)
4. Navigation elements and flow indicators
5. Interaction patterns (tap targets, gestures indicated)

After analyzing all screenshots, provide:
1. A comprehensive list of design patterns used across the app
2. Identified user flows (onboarding, core actions, etc.)
3. Feature set categorized by priority (core, nice-to-have, differentiators)
4. Extracted color palette (provide hex values)
5. Typography observations (font families, sizes, weights if discernible)
6. Overall style characterization
7. Target audience inference
8. Unique selling points of the design
9. Opportunities for improvement

Return your analysis as a JSON object with this exact structure:
{
  "analyzedAt": "<ISO timestamp>",
  "screensAnalyzed": <number>,
  "screens": [
    {
      "index": <number>,
      "screenName": "<descriptive name>",
      "screenType": "<onboarding|home|list|detail|form|settings|profile|modal|other>",
      "components": ["<component1>", "<component2>"],
      "patterns": ["<pattern1>", "<pattern2>"],
      "navigation": ["<nav element1>", "<nav element2>"],
      "interactions": ["<interaction1>", "<interaction2>"],
      "notes": "<optional additional observations>"
    }
  ],
  "designPatterns": [
    {
      "name": "<pattern name>",
      "description": "<detailed description>",
      "frequency": "<single_screen|multiple_screens|all_screens>",
      "components": ["<component1>"],
      "screenshotIndices": [<indices>]
    }
  ],
  "userFlows": [
    {
      "name": "<flow name>",
      "description": "<flow description>",
      "stepCount": <number>,
      "screens": ["<screen1>", "<screen2>"],
      "screenshotIndices": [<indices>],
      "complexity": "<simple|moderate|complex>"
    }
  ],
  "featureSet": {
    "core": ["<feature1>"],
    "niceToHave": ["<feature1>"],
    "differentiators": ["<feature1>"]
  },
  "colorPalette": {
    "primary": "#XXXXXX",
    "secondary": "#XXXXXX",
    "accent": "#XXXXXX",
    "background": "#XXXXXX",
    "surface": "#XXXXXX",
    "text": "#XXXXXX",
    "textSecondary": "#XXXXXX"
  },
  "typography": {
    "headingFont": "<font name or system>",
    "headingSize": "<size description>",
    "headingWeight": "<weight>",
    "bodyFont": "<font name or system>",
    "bodySize": "<size description>",
    "bodyWeight": "<weight>"
  },
  "overallStyle": "<style description>",
  "targetAudience": "<audience description>",
  "uniqueSellingPoints": ["<usp1>", "<usp2>"],
  "improvementOpportunities": ["<opportunity1>", "<opportunity2>"]
}

Be thorough and specific in your analysis. Infer reasonable values for colors and typography based on visual appearance.`;

// Comparison prompt template
const COMPARISON_PROMPT = `You are an expert mobile app UI/UX analyst comparing multiple reference apps. Analyze the provided apps and create a comprehensive side-by-side comparison.

You have been provided with analysis data for the following apps:
{{APP_DATA}}

Create a detailed comparison covering:
1. Design patterns - which patterns each app uses, commonalities and differences
2. User flows - how each app structures its core user journeys
3. Feature comparison - what features each app offers, categorized by priority
4. Color palettes - visual style comparison
5. Strengths - what each app does particularly well
6. Recommendations - suggested approach for a new app based on these references

Return your comparison as a JSON object with this exact structure:
{
  "id": "<uuid>",
  "apps": [
    {
      "appId": "<id>",
      "appName": "<name>",
      "category": "<category>",
      "screenshotCount": <number>
    }
  ],
  "comparedAt": "<ISO timestamp>",
  "designPatternComparison": [
    {
      "category": "<pattern category>",
      "apps": [
        {
          "appId": "<id>",
          "appName": "<name>",
          "items": ["<pattern1>", "<pattern2>"]
        }
      ]
    }
  ],
  "userFlowComparison": [
    {
      "category": "<flow category>",
      "apps": [
        {
          "appId": "<id>",
          "appName": "<name>",
          "items": ["<flow1>", "<flow2>"]
        }
      ]
    }
  ],
  "featureComparison": [
    {
      "category": "<core|niceToHave|differentiators>",
      "apps": [
        {
          "appId": "<id>",
          "appName": "<name>",
          "features": ["<feature1>"]
        }
      ]
    }
  ],
  "colorPaletteComparison": [
    {
      "appId": "<id>",
      "appName": "<name>",
      "palette": {
        "primary": "#XXXXXX",
        "secondary": "#XXXXXX",
        "accent": "#XXXXXX",
        "background": "#XXXXXX",
        "surface": "#XXXXXX",
        "text": "#XXXXXX",
        "textSecondary": "#XXXXXX"
      }
    }
  ],
  "strengths": [
    {
      "appId": "<id>",
      "appName": "<name>",
      "strengths": ["<strength1>"]
    }
  ],
  "recommendations": ["<recommendation1>", "<recommendation2>"]
}`;

// ============================================
// Image Fetching with Error Handling
// ============================================
//
// Claude's vision API requires images as base64-encoded strings with
// explicit media type declarations. This section handles:
//
// - Fetching images from URLs (Supabase storage, CDNs, etc.)
// - Converting to base64 format
// - Validating image type and size
// - Graceful error handling for invalid/missing images
//
// ## Supported Image Formats
//
// - JPEG/JPG: Most common, best for photos
// - PNG: Best for screenshots with text
// - WebP: Modern format, good compression
// - GIF: Supported (static only, first frame used)
//
// ## Size Limits
//
// - Maximum file size: 20MB per image
// - Recommended: Keep images under 5MB for faster processing
// - Consider using compressed images (see lib/imageUpload.ts)
//
// ## Error Handling Strategy
//
// When fetching multiple images:
// 1. Attempt to fetch each image independently
// 2. Track failed images with error details
// 3. Continue with valid images if at least one succeeds
// 4. Return detailed error if ALL images fail
//
// This ensures partial results when some images have issues.

/**
 * Result type for image fetch operations
 *
 * Contains base64-encoded image data and the detected media type.
 * The mediaType is required by Claude's API for proper image handling.
 */
interface ImageFetchResult {
  /** Base64-encoded image data (without data URI prefix) */
  data: string;
  /** MIME type of the image */
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

/**
 * Fetch image as base64 for Claude API with improved error handling
 *
 * This function handles the complete image fetch and conversion pipeline:
 * 1. Fetch image from URL with timeout
 * 2. Validate response (status, content-type)
 * 3. Check size limits (max 20MB)
 * 4. Convert to base64
 * 5. Detect media type from headers or URL
 *
 * @param url - URL of the image to fetch
 * @param timeoutMs - Fetch timeout in milliseconds (default: 30s)
 * @returns Result with ImageFetchResult or ClaudeApiError
 *
 * @example
 * ```typescript
 * const result = await fetchImageAsBase64(screenshot.url);
 * if (result.success) {
 *   // Use result.data.data (base64) and result.data.mediaType
 *   imageContents.push({
 *     type: 'image',
 *     source: {
 *       type: 'base64',
 *       media_type: result.data.mediaType,
 *       data: result.data.data,
 *     },
 *   });
 * } else {
 *   console.warn(`Failed to fetch: ${result.error.message}`);
 * }
 * ```
 */
async function fetchImageAsBase64(
  url: string,
  timeoutMs: number = 30000
): Promise<Result<ImageFetchResult, ClaudeApiError>> {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: createClaudeApiError(
          'IMAGE_FETCH_ERROR',
          `Failed to fetch image: HTTP ${response.status} ${response.statusText}`,
          { statusCode: response.status }
        ),
      };
    }

    const blob = await response.blob();

    // Validate that we got an image
    const contentType = response.headers.get('content-type') ?? blob.type;
    if (!contentType?.startsWith('image/')) {
      return {
        success: false,
        error: createClaudeApiError(
          'IMAGE_INVALID',
          `URL did not return an image: received ${contentType}`
        ),
      };
    }

    // Validate image size (Claude has limits)
    const maxSizeBytes = 20 * 1024 * 1024; // 20MB limit
    if (blob.size > maxSizeBytes) {
      return {
        success: false,
        error: createClaudeApiError(
          'IMAGE_INVALID',
          `Image too large: ${(blob.size / 1024 / 1024).toFixed(2)}MB exceeds 20MB limit`
        ),
      };
    }

    const buffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // Determine media type from content-type header or URL
    let mediaType: ImageFetchResult['mediaType'] = 'image/png';
    if (contentType?.includes('jpeg') || contentType?.includes('jpg') || url.includes('.jpg') || url.includes('.jpeg')) {
      mediaType = 'image/jpeg';
    } else if (contentType?.includes('webp') || url.includes('.webp')) {
      mediaType = 'image/webp';
    } else if (contentType?.includes('gif') || url.includes('.gif')) {
      mediaType = 'image/gif';
    } else if (contentType?.includes('png') || url.includes('.png')) {
      mediaType = 'image/png';
    }

    return { success: true, data: { data: base64, mediaType } };
  } catch (error) {
    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: createClaudeApiError(
          'TIMEOUT',
          `Image fetch timed out after ${timeoutMs}ms: ${url}`
        ),
      };
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: createClaudeApiError(
          'NETWORK_ERROR',
          `Network error fetching image: ${error.message}`,
          { originalError: error as Error }
        ),
      };
    }

    return {
      success: false,
      error: createClaudeApiError(
        'IMAGE_FETCH_ERROR',
        `Failed to fetch image: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error instanceof Error ? error : undefined }
      ),
    };
  }
}

// ============================================
// Core API Functions with Error Handling
// ============================================
//
// This section contains the primary public API functions for Claude integration.
// These functions are designed to be called directly from UI components and stores.
//
// ## Main Functions
//
// - `analyzeAppScreenshots()` - Analyze screenshots of a reference app
// - `compareApps()` - Compare multiple analyzed apps
// - `generateAppSummary()` - Generate a text summary from analysis
// - `analyzeAppScreenshotsWithCache()` - Analysis with explicit cache metadata
//
// ## Common Patterns Used
//
// All functions follow these patterns:
//
// 1. **Result<T, ClaudeApiError>**: Never throw, always return Result type
// 2. **Early Validation**: Check config/input before expensive operations
// 3. **Progress Callbacks**: Report progress for UI feedback
// 4. **Rate Limit Awareness**: Check rate limits before API calls
// 5. **Retry Integration**: Use withRetry for transient failures
//
// ## Typical Call Flow
//
// ```
// analyzeAppScreenshots()
//   → validateClaudeApiConfig()      // Check API key
//   → validate input                 // Check screenshots exist
//   → check cache (if appId)         // Return cached if available
//   → check rate limits              // Fail fast if limited
//   → getAnthropicClient()           // Get/create client
//   → fetchImageAsBase64() for each  // Fetch and encode images
//   → withRetry(withTimeout(...))    // Call API with retry/timeout
//   → validate response              // Zod schema validation
//   → store in cache (if appId)      // Cache for future use
//   → return Result                  // Success or error
// ```

/**
 * Cache status during analysis
 *
 * Use this in your UI to show cache state to users:
 * - `checking`: Looking up cache (show spinner)
 * - `hit`: Using cached result (show "from cache" indicator)
 * - `miss`: No cache available (show "analyzing...")
 * - `storing`: Saving to cache (show "saving...")
 * - `stored`: Cache save successful
 * - `store_failed`: Cache save failed (log but don't block)
 */
export type CacheStatus = 'checking' | 'hit' | 'miss' | 'storing' | 'stored' | 'store_failed';

/**
 * Batching information for screenshot analysis
 *
 * Returned via `onBatching` callback when screenshots exceed limits.
 * Use this to inform users about truncation.
 */
export interface BatchingInfo {
  /** Total screenshots provided */
  totalProvided: number;
  /** Screenshots being analyzed (after batching) */
  analyzing: number;
  /** Whether screenshots were truncated due to limits */
  wasTruncated: boolean;
  /** Maximum allowed screenshots per request */
  maxAllowed: number;
}

/**
 * Options for the analyzeAppScreenshots function
 */
export interface AnalyzeOptions {
  /** Progress callback (0-100) */
  onProgress?: (progress: number) => void;
  /** Retry callback for observability */
  onRetry?: (attempt: number, error: ClaudeApiError, delayMs: number) => void;
  /** Custom retry configuration */
  retryConfig?: RetryConfig;
  /** Custom timeout in milliseconds */
  timeoutMs?: number;
  /**
   * App ID for caching - if provided, enables caching for this analysis
   * The app ID is used as part of the cache key along with screenshot checksums
   */
  appId?: string;
  /** Skip cache and force a fresh analysis */
  forceRefresh?: boolean;
  /** Callback for cache status updates */
  onCacheStatus?: (status: CacheStatus) => void;
  /** Callback when batching occurs (screenshots truncated) */
  onBatching?: (info: BatchingInfo) => void;
}

/**
 * Analyze app screenshots using Claude's vision capability
 *
 * This function provides comprehensive screenshot analysis with:
 * - **Batching**: Automatically limits to 10 screenshots per request with notification
 * - **Caching**: When `appId` is provided, caches results based on screenshot checksums
 * - **Retry Logic**: Exponential backoff for transient failures
 * - **Rate Limiting**: Tracks and respects API rate limits
 * - **Error Handling**: Comprehensive error types with user-friendly messages
 *
 * @param appName - Name of the app being analyzed
 * @param screenshots - Array of screenshots to analyze (max 10 will be processed)
 * @param optionsOrProgressCallback - Either an options object or a legacy progress callback function
 *
 * @returns Result containing AppAnalysis or a ClaudeApiError
 *
 * @example
 * // With caching (recommended for production):
 * const result = await analyzeAppScreenshots('MyApp', screenshots, {
 *   appId: 'app-123',
 *   onProgress: (progress) => console.log(`${progress}%`),
 *   onCacheStatus: (status) => console.log(`Cache: ${status}`),
 *   onBatching: (info) => {
 *     if (info.wasTruncated) {
 *       console.warn(`Only analyzing ${info.analyzing} of ${info.totalProvided} screenshots`);
 *     }
 *   },
 * });
 *
 * @example
 * // Force fresh analysis (skip cache):
 * const result = await analyzeAppScreenshots('MyApp', screenshots, {
 *   appId: 'app-123',
 *   forceRefresh: true,
 * });
 *
 * @example
 * // Legacy API (deprecated, for backwards compatibility):
 * const result = await analyzeAppScreenshots('MyApp', screenshots, (progress) => {
 *   console.log(`${progress}%`);
 * });
 */
export async function analyzeAppScreenshots(
  appName: string,
  screenshots: Screenshot[],
  optionsOrProgressCallback?: AnalyzeOptions | ((progress: number) => void)
): Promise<Result<AppAnalysis, ClaudeApiError>> {
  // Support legacy API where third argument was a progress callback
  const options: AnalyzeOptions = typeof optionsOrProgressCallback === 'function'
    ? { onProgress: optionsOrProgressCallback }
    : optionsOrProgressCallback ?? {};

  const {
    onProgress,
    onRetry,
    retryConfig = DEFAULT_RETRY_CONFIG,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    appId,
    forceRefresh = false,
    onCacheStatus,
    onBatching,
  } = options;

  // Validate API configuration first
  const configStatus = validateClaudeApiConfig();
  if (!configStatus.isConfigured) {
    return {
      success: false,
      error: createClaudeApiError(
        'API_KEY_INVALID',
        configStatus.error?.message ?? 'API key not configured'
      ),
    };
  }

  // Validate input
  if (screenshots.length === 0) {
    return {
      success: false,
      error: createClaudeApiError(
        'VALIDATION_ERROR',
        'No screenshots provided for analysis'
      ),
    };
  }

  // ============================================
  // Batching: Enforce max screenshots limit
  // ============================================
  const wasTruncated = screenshots.length > MAX_SCREENSHOTS_PER_REQUEST;
  const screenshotsToAnalyze = screenshots.slice(0, MAX_SCREENSHOTS_PER_REQUEST);

  // Notify about batching if screenshots were truncated
  if (wasTruncated || onBatching) {
    const batchingInfo: BatchingInfo = {
      totalProvided: screenshots.length,
      analyzing: screenshotsToAnalyze.length,
      wasTruncated,
      maxAllowed: MAX_SCREENSHOTS_PER_REQUEST,
    };

    onBatching?.(batchingInfo);

    if (wasTruncated) {
      console.warn(
        `[analyzeAppScreenshots] Analysis limited to first ${MAX_SCREENSHOTS_PER_REQUEST} screenshots ` +
        `(${screenshots.length} provided). Consider splitting into multiple analysis requests.`
      );
    }
  }

  // ============================================
  // Caching: Check for cached results
  // ============================================
  if (appId && !forceRefresh) {
    onCacheStatus?.('checking');

    try {
      const cacheLookup = await lookupCachedAnalysis(appId, screenshotsToAnalyze);

      if (cacheLookup.hit && cacheLookup.analysis) {
        onCacheStatus?.('hit');
        onProgress?.(100);

        console.log(
          `[analyzeAppScreenshots] Cache hit for app ${appId} ` +
          `(entry: ${cacheLookup.entryId}, lookup: ${cacheLookup.lookupTimeMs}ms)`
        );

        return { success: true, data: cacheLookup.analysis };
      }

      onCacheStatus?.('miss');
      console.log(
        `[analyzeAppScreenshots] Cache miss for app ${appId}: ${cacheLookup.missReason}`
      );
    } catch (cacheError) {
      // Cache errors should not block analysis - log and continue
      console.warn('[analyzeAppScreenshots] Cache lookup failed, proceeding with fresh analysis:', cacheError);
      onCacheStatus?.('miss');
    }
  } else if (appId && forceRefresh) {
    console.log(`[analyzeAppScreenshots] Force refresh requested, skipping cache for app ${appId}`);
    onCacheStatus?.('miss');
  }

  // Check rate limit status before proceeding
  const rateLimitWait = getRateLimitWaitTime();
  if (rateLimitWait > 0) {
    return {
      success: false,
      error: createClaudeApiError(
        'RATE_LIMITED',
        `Rate limited. Please wait ${Math.ceil(rateLimitWait / 1000)} seconds.`,
        { retryAfterMs: rateLimitWait }
      ),
    };
  }

  onProgress?.(5);

  // Get Anthropic client
  const clientResult = getAnthropicClient();
  if (!clientResult.success) {
    return { success: false, error: clientResult.error };
  }
  const client = clientResult.data;

  onProgress?.(10);

  // ============================================
  // Fetch all images with error handling
  // ============================================
  const imageContents: Anthropic.ImageBlockParam[] = [];
  const failedImages: { index: number; url: string; error: string }[] = [];

  for (let i = 0; i < screenshotsToAnalyze.length; i++) {
    const screenshot = screenshotsToAnalyze[i];
    const imageResult = await fetchImageAsBase64(screenshot.url);

    if (!imageResult.success) {
      const errorMessage = imageResult.error.message;
      failedImages.push({
        index: i,
        url: screenshot.url,
        error: errorMessage,
      });
      console.warn(`[analyzeAppScreenshots] Failed to fetch image ${i + 1}/${screenshotsToAnalyze.length}: ${errorMessage}`);
      continue;
    }

    // imageResult.success is true here, so imageResult.data is available
    const imageData = imageResult.data;
    imageContents.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageData.mediaType,
        data: imageData.data,
      },
    });

    onProgress?.(10 + (40 * (i + 1)) / screenshotsToAnalyze.length);
  }

  // Check if we have any valid images
  if (imageContents.length === 0) {
    return {
      success: false,
      error: createClaudeApiError(
        'IMAGE_FETCH_ERROR',
        `All ${failedImages.length} screenshots failed to load. First error: ${failedImages[0]?.error ?? 'Unknown'}`
      ),
    };
  }

  // Log partial success if some images failed
  if (failedImages.length > 0) {
    console.warn(
      `[analyzeAppScreenshots] Proceeding with ${imageContents.length} of ${screenshotsToAnalyze.length} screenshots ` +
      `(${failedImages.length} failed to load)`
    );
  }

  onProgress?.(50);

  // ============================================
  // Call Claude API with retry logic
  // ============================================
  const apiResult = await withRetry(
    async () => {
      const response = await withTimeout(
        client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          messages: [
            {
              role: 'user',
              content: [
                ...imageContents,
                {
                  type: 'text',
                  text: `Analyzing app: ${appName}\n\n${ANALYSIS_PROMPT}`,
                },
              ],
            },
          ],
        }),
        timeoutMs
      );
      return response;
    },
    retryConfig,
    (attempt, error, delayMs) => {
      // Track rate limit hits
      if (error.code === 'RATE_LIMITED') {
        recordRateLimitHit(error.retryAfterMs);
      }
      onRetry?.(attempt, error, delayMs);
    }
  );

  if (!apiResult.success) {
    return { success: false, error: apiResult.error };
  }

  // Clear rate limit state on success
  clearRateLimitState();
  onProgress?.(80);

  // ============================================
  // Extract and parse response
  // ============================================
  const response = apiResult.data;
  const textContent = response.content.find(c => c.type === 'text');

  if (!textContent || textContent.type !== 'text') {
    return {
      success: false,
      error: createClaudeApiError(
        'RESPONSE_PARSE_ERROR',
        'No text response from Claude'
      ),
    };
  }

  // Parse JSON from response (may be wrapped in markdown code block)
  let jsonStr = textContent.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  let parsedResponse: unknown;
  try {
    parsedResponse = JSON.parse(jsonStr);
  } catch (parseError) {
    return {
      success: false,
      error: createClaudeApiError(
        'RESPONSE_PARSE_ERROR',
        `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        { originalError: parseError instanceof Error ? parseError : undefined }
      ),
    };
  }

  // ============================================
  // Validate with Zod
  // ============================================
  const validationResult = appAnalysisSchema.safeParse(parsedResponse);
  if (!validationResult.success) {
    const zodError = validationResult.error;
    // Access Zod error issues (not errors)
    const errorMessages = zodError.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    return {
      success: false,
      error: createClaudeApiError(
        'VALIDATION_ERROR',
        `Invalid analysis response: ${errorMessages}`
      ),
    };
  }

  const analysis = validationResult.data as AppAnalysis;

  // ============================================
  // Caching: Store results in cache
  // ============================================
  if (appId) {
    onCacheStatus?.('storing');

    try {
      const storeResult = await storeCachedAnalysis(appId, screenshotsToAnalyze, analysis);

      if (storeResult.success) {
        onCacheStatus?.('stored');
        console.log(`[analyzeAppScreenshots] Stored analysis in cache for app ${appId} (entry: ${storeResult.data})`);
      } else {
        onCacheStatus?.('store_failed');
        console.warn(`[analyzeAppScreenshots] Failed to store analysis in cache: ${storeResult.error.message}`);
      }
    } catch (cacheError) {
      // Cache storage errors should not affect the result
      onCacheStatus?.('store_failed');
      console.warn('[analyzeAppScreenshots] Cache storage failed:', cacheError);
    }
  }

  onProgress?.(100);

  return { success: true, data: analysis };
}

/**
 * Compare multiple reference apps
 *
 * Analyzes and compares 2-3 reference apps to identify:
 * - Common design patterns across apps
 * - User flow differences and similarities
 * - Feature comparison (core, nice-to-have, differentiators)
 * - Color palette comparison
 * - Strengths of each app
 * - Recommendations for building a new app
 *
 * **Prerequisites**: All apps must have been analyzed first (have `analysis` populated).
 *
 * Includes retry logic, rate limiting awareness, and comprehensive error handling.
 *
 * @param apps - Array of 2-3 reference apps to compare (must have analysis)
 * @param optionsOrProgressCallback - Either an options object or a legacy progress callback
 * @returns Result containing AppComparison or a ClaudeApiError
 *
 * @example
 * ```typescript
 * // Ensure apps are analyzed first
 * const analyzedApps = referenceApps.filter(app => app.analysis !== null);
 *
 * if (analyzedApps.length < 2) {
 *   showError('Need at least 2 analyzed apps to compare');
 *   return;
 * }
 *
 * const result = await compareApps(analyzedApps.slice(0, 3), {
 *   onProgress: (progress) => setComparisonProgress(progress),
 * });
 *
 * if (result.success) {
 *   // result.data contains AppComparison
 *   setComparison(result.data);
 *   showComparisonView();
 * } else {
 *   showError(result.error.userMessage);
 * }
 * ```
 */
export async function compareApps(
  apps: ReferenceApp[],
  optionsOrProgressCallback?: AnalyzeOptions | ((progress: number) => void)
): Promise<Result<AppComparison, ClaudeApiError>> {
  // Support legacy API where second argument was a progress callback
  const options: AnalyzeOptions = typeof optionsOrProgressCallback === 'function'
    ? { onProgress: optionsOrProgressCallback }
    : optionsOrProgressCallback ?? {};

  const { onProgress, onRetry, retryConfig = DEFAULT_RETRY_CONFIG, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // Validate API configuration first
  const configStatus = validateClaudeApiConfig();
  if (!configStatus.isConfigured) {
    return {
      success: false,
      error: createClaudeApiError(
        'API_KEY_INVALID',
        configStatus.error?.message ?? 'API key not configured'
      ),
    };
  }

  // Validate input
  if (apps.length < 2 || apps.length > 3) {
    return {
      success: false,
      error: createClaudeApiError(
        'VALIDATION_ERROR',
        'Comparison requires 2-3 apps'
      ),
    };
  }

  // Ensure all apps have analysis
  const appsWithoutAnalysis = apps.filter(app => !app.analysis);
  if (appsWithoutAnalysis.length > 0) {
    return {
      success: false,
      error: createClaudeApiError(
        'VALIDATION_ERROR',
        `Apps missing analysis: ${appsWithoutAnalysis.map(a => a.name).join(', ')}`
      ),
    };
  }

  // Check rate limit status before proceeding
  const rateLimitWait = getRateLimitWaitTime();
  if (rateLimitWait > 0) {
    return {
      success: false,
      error: createClaudeApiError(
        'RATE_LIMITED',
        `Rate limited. Please wait ${Math.ceil(rateLimitWait / 1000)} seconds.`,
        { retryAfterMs: rateLimitWait }
      ),
    };
  }

  onProgress?.(10);

  // Get Anthropic client
  const clientResult = getAnthropicClient();
  if (!clientResult.success) {
    return { success: false, error: clientResult.error };
  }
  const client = clientResult.data;

  onProgress?.(20);

  // Prepare app data for the prompt
  const appDataString = apps
    .map(
      app => `
App: ${app.name}
Category: ${app.category}
Screenshots: ${app.screenshots.length}
Analysis:
${JSON.stringify(app.analysis, null, 2)}
`
    )
    .join('\n---\n');

  const prompt = COMPARISON_PROMPT.replace('{{APP_DATA}}', appDataString);

  onProgress?.(40);

  // Call Claude API with retry logic
  const apiResult = await withRetry(
    async () => {
      const response = await withTimeout(
        client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
        timeoutMs
      );
      return response;
    },
    retryConfig,
    (attempt, error, delayMs) => {
      // Track rate limit hits
      if (error.code === 'RATE_LIMITED') {
        recordRateLimitHit(error.retryAfterMs);
      }
      onRetry?.(attempt, error, delayMs);
    }
  );

  if (!apiResult.success) {
    return { success: false, error: apiResult.error };
  }

  // Clear rate limit state on success
  clearRateLimitState();
  onProgress?.(80);

  // Extract and parse response
  const response = apiResult.data;
  const textContent = response.content.find(c => c.type === 'text');

  if (!textContent || textContent.type !== 'text') {
    return {
      success: false,
      error: createClaudeApiError(
        'RESPONSE_PARSE_ERROR',
        'No text response from Claude'
      ),
    };
  }

  // Parse JSON from response
  let jsonStr = textContent.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  let comparison: AppComparison;
  try {
    comparison = JSON.parse(jsonStr) as AppComparison;
  } catch (parseError) {
    return {
      success: false,
      error: createClaudeApiError(
        'RESPONSE_PARSE_ERROR',
        `Failed to parse comparison JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        { originalError: parseError instanceof Error ? parseError : undefined }
      ),
    };
  }

  onProgress?.(100);

  return { success: true, data: comparison };
}

/**
 * Generate a quick summary of an app from its analysis
 *
 * Creates a concise 2-3 sentence summary highlighting:
 * - Key design characteristics
 * - Target use case
 * - Unique aspects
 *
 * This is useful for:
 * - App cards in lists
 * - Quick previews
 * - Export/sharing features
 *
 * Uses a shorter timeout (30s) since this is a quick text generation task.
 *
 * @param analysis - The AppAnalysis to summarize
 * @param options - Optional retry and timeout configuration
 * @returns Result containing summary string or a ClaudeApiError
 *
 * @example
 * ```typescript
 * if (app.analysis) {
 *   const result = await generateAppSummary(app.analysis);
 *   if (result.success) {
 *     setAppSummary(result.data);
 *   }
 * }
 * ```
 */
export async function generateAppSummary(
  analysis: AppAnalysis,
  options: Omit<AnalyzeOptions, 'onProgress'> = {}
): Promise<Result<string, ClaudeApiError>> {
  const { onRetry, retryConfig = DEFAULT_RETRY_CONFIG, timeoutMs = 30000 } = options;

  // Validate API configuration first
  const configStatus = validateClaudeApiConfig();
  if (!configStatus.isConfigured) {
    return {
      success: false,
      error: createClaudeApiError(
        'API_KEY_INVALID',
        configStatus.error?.message ?? 'API key not configured'
      ),
    };
  }

  // Check rate limit status before proceeding
  const rateLimitWait = getRateLimitWaitTime();
  if (rateLimitWait > 0) {
    return {
      success: false,
      error: createClaudeApiError(
        'RATE_LIMITED',
        `Rate limited. Please wait ${Math.ceil(rateLimitWait / 1000)} seconds.`,
        { retryAfterMs: rateLimitWait }
      ),
    };
  }

  // Get Anthropic client
  const clientResult = getAnthropicClient();
  if (!clientResult.success) {
    return { success: false, error: clientResult.error };
  }
  const client = clientResult.data;

  // Call Claude API with retry logic
  const apiResult = await withRetry(
    async () => {
      const response = await withTimeout(
        client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `Based on this app analysis, provide a 2-3 sentence summary highlighting the app's key design characteristics and target use case:

${JSON.stringify(analysis, null, 2)}

Respond with just the summary text, no formatting.`,
            },
          ],
        }),
        timeoutMs
      );
      return response;
    },
    retryConfig,
    (attempt, error, delayMs) => {
      // Track rate limit hits
      if (error.code === 'RATE_LIMITED') {
        recordRateLimitHit(error.retryAfterMs);
      }
      onRetry?.(attempt, error, delayMs);
    }
  );

  if (!apiResult.success) {
    return { success: false, error: apiResult.error };
  }

  // Clear rate limit state on success
  clearRateLimitState();

  // Extract response
  const response = apiResult.data;
  const textContent = response.content.find(c => c.type === 'text');

  if (!textContent || textContent.type !== 'text') {
    return {
      success: false,
      error: createClaudeApiError(
        'RESPONSE_PARSE_ERROR',
        'No text response from Claude'
      ),
    };
  }

  return { success: true, data: textContent.text };
}

// ============================================
// Convenience Functions with Cache Metadata
// ============================================
//
// These functions provide simpler APIs for common use cases.
// They wrap the main API functions with sensible defaults.

/**
 * Options for analyzeAppScreenshotsWithCache
 *
 * This is a subset of AnalyzeOptions that excludes `appId` since
 * the app ID is required as a separate parameter for this function.
 */
export interface AnalyzeWithCacheOptions extends Omit<AnalyzeOptions, 'appId'> {
  /** Skip cache and force a fresh analysis */
  forceRefresh?: boolean;
}

/**
 * Analyze app screenshots with explicit cache metadata in the result
 *
 * This is a convenience wrapper around `analyzeAppScreenshots` that:
 * 1. Requires an appId (caching is mandatory)
 * 2. Returns cache metadata along with the analysis result
 *
 * Use this when you need to know whether the result came from cache
 * or was freshly generated.
 *
 * @param appId - The reference app ID (required for caching)
 * @param appName - Name of the app being analyzed
 * @param screenshots - Array of screenshots to analyze
 * @param options - Analysis options (without appId)
 *
 * @returns Result containing AnalysisResultWithCache or a ClaudeApiError
 *
 * @example
 * const result = await analyzeAppScreenshotsWithCache(
 *   'app-123',
 *   'MyApp',
 *   screenshots,
 *   { onProgress: (p) => console.log(`${p}%`) }
 * );
 *
 * if (result.success) {
 *   console.log(`From cache: ${result.data.fromCache}`);
 *   console.log(`Analyzed at: ${result.data.analyzedAt}`);
 * }
 */
export async function analyzeAppScreenshotsWithCache(
  appId: string,
  appName: string,
  screenshots: Screenshot[],
  options: AnalyzeWithCacheOptions = {}
): Promise<Result<AnalysisResultWithCache, ClaudeApiError>> {
  let fromCache = false;
  let cacheEntryId: string | null = null;

  const result = await analyzeAppScreenshots(appName, screenshots, {
    ...options,
    appId,
    onCacheStatus: (status) => {
      if (status === 'hit') {
        fromCache = true;
      }
      options.onCacheStatus?.(status);
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // If from cache, try to get the cache entry ID
  if (fromCache) {
    try {
      const cacheLookup = await lookupCachedAnalysis(appId, screenshots.slice(0, MAX_SCREENSHOTS_PER_REQUEST));
      cacheEntryId = cacheLookup.entryId;
    } catch {
      // Ignore errors getting cache entry ID
    }
  }

  const analysisWithCache: AnalysisResultWithCache = {
    analysis: result.data,
    fromCache,
    cacheEntryId,
    analyzedAt: result.data.analyzedAt,
  };

  return { success: true, data: analysisWithCache };
}

/**
 * Get the maximum number of screenshots allowed per analysis request
 * Useful for UI to display limits to users
 */
export function getMaxScreenshotsPerRequest(): number {
  return MAX_SCREENSHOTS_PER_REQUEST;
}

// ============================================
// Utility Exports
// ============================================
//
// These exports provide access to internal utilities for advanced use cases.
// Most consumers should use the main API functions instead.

/**
 * Re-export retry configuration for consumers who want to customize
 *
 * Use this as a base and override specific values:
 *
 * @example
 * ```typescript
 * const myConfig = {
 *   ...DEFAULT_RETRY_CONFIG,
 *   maxRetries: 5,
 *   initialDelayMs: 2000,
 * };
 * ```
 */
export { DEFAULT_RETRY_CONFIG };

/**
 * Get the Anthropic client for advanced use cases
 *
 * Returns the raw Anthropic client for direct API access.
 * Use this when you need functionality not exposed by the wrapper functions.
 *
 * **Warning**: This bypasses retry logic, rate limiting, and caching.
 * Consider using the wrapper functions for most use cases.
 *
 * @returns The Anthropic client instance, or null if not configured
 *
 * @example
 * ```typescript
 * const client = getClient();
 * if (client) {
 *   // Direct API access (no retry/caching)
 *   const response = await client.messages.create({ ... });
 * }
 * ```
 */
export function getClient(): Anthropic | null {
  const result = getAnthropicClient();
  return result.success ? result.data : null;
}

/**
 * Re-export types for external use
 *
 * These types are useful when working with the cache directly
 * or implementing custom cache strategies.
 */
export type {
  CacheLookupResult,
};

// ============================================
// Module Summary
// ============================================
//
// This module provides a complete Claude API integration for app analysis.
//
// ## Quick Start
//
// ```typescript
// import { analyzeAppScreenshots, getRateLimitStatus } from '@/lib/claude';
//
// // Check if we can make requests
// const status = getRateLimitStatus();
// if (status.isLimited) {
//   console.log(`Wait ${status.waitTimeMs}ms`);
//   return;
// }
//
// // Analyze with caching
// const result = await analyzeAppScreenshots('MyApp', screenshots, {
//   appId: 'app-123',
//   onProgress: setProgress,
//   onCacheStatus: setCacheStatus,
// });
//
// if (result.success) {
//   processAnalysis(result.data);
// } else {
//   showError(result.error.userMessage);
// }
// ```
//
// ## Key Exports
//
// - `analyzeAppScreenshots` - Main analysis function
// - `compareApps` - Compare multiple apps
// - `generateAppSummary` - Quick text summary
// - `getRateLimitStatus` - Check rate limit state
// - `createClaudeApiError` - Create typed errors
// - `parseAnthropicError` - Parse SDK errors
// - `withRetry` - Retry wrapper (reusable)
// - `withTimeout` - Timeout wrapper (reusable)
//
// ## Related Modules
//
// - `lib/apiConfig` - API key validation
// - `lib/analysisCache` - Caching implementation
// - `lib/imageUtils` - Checksum generation
// - `types/analyze` - TypeScript types
