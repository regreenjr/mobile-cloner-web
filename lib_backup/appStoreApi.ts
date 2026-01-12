/**
 * iTunes Search API Client
 *
 * Provides search functionality for iOS apps and extracts screenshot URLs.
 * Uses the public iTunes Search API which supports CORS and requires no authentication.
 *
 * @see https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */

import type {
  iTunesSearchResponse,
  iTunesAppResult,
  AppSearchResult,
  AppStoreScreenshot,
  AppStoreError,
  AppStoreErrorCode,
} from '../types/appStore';
import type { Result } from '../types/analyze';
import { generateUUID } from './utils';

// ============================================================================
// Constants
// ============================================================================

/** iTunes Search API base URL */
const ITUNES_API_BASE = 'https://itunes.apple.com';

/** Default country code for searches */
const DEFAULT_COUNTRY = 'us';

/** Default number of results to return */
const DEFAULT_LIMIT = 10;

/** Maximum allowed results per request */
const MAX_LIMIT = 50;

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT = 15000;

/** Minimum delay between requests (rate limiting) */
const MIN_REQUEST_DELAY = 100;

// ============================================================================
// Rate Limiting
// ============================================================================

/** Timestamp of last API request */
let lastRequestTime = 0;

/**
 * Ensures minimum delay between API requests to avoid rate limiting
 */
async function throttleRequest(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_DELAY) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_DELAY - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Creates a structured AppStoreError from various error sources
 */
function createAppStoreError(
  code: AppStoreErrorCode,
  message: string,
  retryable = false,
  retryAfterMs?: number
): AppStoreError {
  return {
    code,
    message,
    platform: 'ios',
    retryable,
    retryAfterMs,
  };
}

/**
 * Parses an error into a structured AppStoreError
 */
function parseError(error: unknown): AppStoreError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createAppStoreError(
      'NETWORK_ERROR',
      'Network error: Unable to connect to iTunes API. Please check your internet connection.',
      true
    );
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return createAppStoreError(
      'NETWORK_ERROR',
      'Request timed out. Please try again.',
      true
    );
  }

  if (error instanceof SyntaxError) {
    return createAppStoreError(
      'PARSE_ERROR',
      'Failed to parse iTunes API response.',
      true
    );
  }

  if (error instanceof Error) {
    // Check for CORS errors (usually manifest as TypeError in fetch)
    if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      return createAppStoreError(
        'CORS_ERROR',
        'Cross-origin request blocked. This may be a temporary issue.',
        true
      );
    }

    return createAppStoreError('UNKNOWN_ERROR', error.message, true);
  }

  return createAppStoreError('UNKNOWN_ERROR', 'An unexpected error occurred.', true);
}

// ============================================================================
// Screenshot Extraction
// ============================================================================

/**
 * Extracts screenshot metadata from iTunes API result
 *
 * @param result - Raw iTunes app result
 * @returns Array of screenshot metadata objects
 */
function extractScreenshots(result: iTunesAppResult): AppStoreScreenshot[] {
  const screenshots: AppStoreScreenshot[] = [];

  // Process iPhone screenshots
  if (result.screenshotUrls && result.screenshotUrls.length > 0) {
    result.screenshotUrls.forEach((url, index) => {
      screenshots.push({
        id: generateUUID(),
        url: enhanceScreenshotUrl(url),
        platform: 'ios',
        deviceType: 'iphone',
        order: index,
        selected: true, // Default to selected
      });
    });
  }

  // Process iPad screenshots
  if (result.ipadScreenshotUrls && result.ipadScreenshotUrls.length > 0) {
    const iphoneCount = screenshots.length;
    result.ipadScreenshotUrls.forEach((url, index) => {
      screenshots.push({
        id: generateUUID(),
        url: enhanceScreenshotUrl(url),
        platform: 'ios',
        deviceType: 'ipad',
        order: iphoneCount + index,
        selected: true, // Default to selected
      });
    });
  }

  return screenshots;
}

/**
 * Enhances screenshot URL for higher quality
 *
 * iTunes API returns URLs with size parameters that can be modified
 * to get higher resolution images.
 *
 * @param url - Original screenshot URL
 * @returns Enhanced URL with higher resolution
 */
function enhanceScreenshotUrl(url: string): string {
  // iTunes screenshot URLs typically end with dimensions like 392x696bb.png
  // We can modify these to get larger images
  // Common patterns: 392x696bb, 1242x2208bb, etc.

  // Try to get the highest quality version by removing size constraints
  // or increasing the resolution

  // Pattern: replace small dimensions with larger ones
  // The 'bb' suffix stands for "bounded box" - we want to keep it but increase size
  const sizePattern = /(\d+)x(\d+)(bb\.\w+)$/;
  const match = url.match(sizePattern);

  if (match) {
    const [, width, height, suffix] = match;
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);

    // If dimensions are small, scale them up (max 3x or to reasonable max)
    if (w < 1000) {
      const scale = Math.min(3, 1242 / w);
      const newWidth = Math.round(w * scale);
      const newHeight = Math.round(h * scale);
      return url.replace(sizePattern, `${newWidth}x${newHeight}${suffix}`);
    }
  }

  return url;
}

// ============================================================================
// Result Transformation
// ============================================================================

/**
 * Transforms iTunes API result to unified AppSearchResult format
 *
 * @param result - Raw iTunes app result
 * @returns Unified app search result
 */
function transformToAppSearchResult(result: iTunesAppResult): AppSearchResult {
  return {
    id: result.trackId.toString(),
    name: result.trackName,
    developer: result.artistName,
    platform: 'ios',
    iconUrl: result.artworkUrl512 || result.artworkUrl100,
    category: result.primaryGenreName,
    storeUrl: result.trackViewUrl,
    rating: result.averageUserRating,
    ratingCount: result.userRatingCount,
    bundleId: result.bundleId,
    screenshots: extractScreenshots(result),
    _raw: result,
  };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search for iOS apps by name
 *
 * @param query - Search term (app name or keywords)
 * @param options - Search options
 * @returns Search results or error
 *
 * @example
 * ```ts
 * const result = await searchiTunesApps('Headspace');
 * if (result.success) {
 *   console.log(`Found ${result.data.length} apps`);
 *   result.data.forEach(app => {
 *     console.log(`${app.name}: ${app.screenshots.length} screenshots`);
 *   });
 * }
 * ```
 */
export async function searchiTunesApps(
  query: string,
  options: {
    limit?: number;
    country?: string;
  } = {}
): Promise<Result<AppSearchResult[], AppStoreError>> {
  // Validate input
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      success: false,
      error: createAppStoreError(
        'INVALID_QUERY',
        'Search query cannot be empty.',
        false
      ),
    };
  }

  // Apply rate limiting
  await throttleRequest();

  // Build request URL
  const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const country = options.country || DEFAULT_COUNTRY;

  const params = new URLSearchParams({
    term: trimmedQuery,
    country,
    media: 'software',
    entity: 'software',
    limit: limit.toString(),
  });

  const url = `${ITUNES_API_BASE}/search?${params.toString()}`;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // Make the request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check response status
    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          error: createAppStoreError(
            'RATE_LIMITED',
            'Too many requests. Please wait a moment and try again.',
            true,
            60000 // Suggest waiting 1 minute
          ),
        };
      }

      if (response.status >= 500) {
        return {
          success: false,
          error: createAppStoreError(
            'STORE_UNAVAILABLE',
            'iTunes API is temporarily unavailable. Please try again later.',
            true
          ),
        };
      }

      return {
        success: false,
        error: createAppStoreError(
          'UNKNOWN_ERROR',
          `iTunes API returned status ${response.status}`,
          true
        ),
      };
    }

    // Parse response
    const data: iTunesSearchResponse = await response.json();

    // Check for empty results
    if (data.resultCount === 0 || !data.results || data.results.length === 0) {
      return {
        success: false,
        error: createAppStoreError(
          'NO_RESULTS',
          `No apps found matching "${trimmedQuery}". Try different keywords or check the spelling.`,
          false
        ),
      };
    }

    // Transform results
    const apps = data.results.map(transformToAppSearchResult);

    return {
      success: true,
      data: apps,
    };
  } catch (error) {
    return {
      success: false,
      error: parseError(error),
    };
  }
}

/**
 * Get app details by iTunes track ID
 *
 * @param trackId - iTunes track ID (numeric)
 * @param country - Country code for the store (default: 'us')
 * @returns App details with screenshots or error
 *
 * @example
 * ```ts
 * const result = await getiTunesAppById('1575659905');
 * if (result.success) {
 *   console.log(`${result.data.name}: ${result.data.screenshots.length} screenshots`);
 * }
 * ```
 */
export async function getiTunesAppById(
  trackId: string,
  country: string = DEFAULT_COUNTRY
): Promise<Result<AppSearchResult, AppStoreError>> {
  // Validate input
  if (!trackId || !/^\d+$/.test(trackId)) {
    return {
      success: false,
      error: createAppStoreError(
        'INVALID_QUERY',
        'Invalid app ID. Must be a numeric iTunes track ID.',
        false
      ),
    };
  }

  // Apply rate limiting
  await throttleRequest();

  const params = new URLSearchParams({
    id: trackId,
    country,
  });

  const url = `${ITUNES_API_BASE}/lookup?${params.toString()}`;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // Make the request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check response status
    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          error: createAppStoreError(
            'RATE_LIMITED',
            'Too many requests. Please wait a moment and try again.',
            true,
            60000
          ),
        };
      }

      return {
        success: false,
        error: createAppStoreError(
          'UNKNOWN_ERROR',
          `iTunes API returned status ${response.status}`,
          true
        ),
      };
    }

    // Parse response
    const data: iTunesSearchResponse = await response.json();

    // Check for empty results
    if (data.resultCount === 0 || !data.results || data.results.length === 0) {
      return {
        success: false,
        error: createAppStoreError(
          'NO_RESULTS',
          `No app found with ID "${trackId}".`,
          false
        ),
      };
    }

    // Transform result (lookup returns array but we expect single result)
    const app = transformToAppSearchResult(data.results[0]);

    return {
      success: true,
      data: app,
    };
  } catch (error) {
    return {
      success: false,
      error: parseError(error),
    };
  }
}

/**
 * Get app details by bundle ID
 *
 * @param bundleId - iOS bundle identifier (e.g., 'com.headspace.headspace')
 * @param country - Country code for the store (default: 'us')
 * @returns App details with screenshots or error
 *
 * @example
 * ```ts
 * const result = await getiTunesAppByBundleId('com.headspace.headspace');
 * if (result.success) {
 *   console.log(`${result.data.name}: ${result.data.screenshots.length} screenshots`);
 * }
 * ```
 */
export async function getiTunesAppByBundleId(
  bundleId: string,
  country: string = DEFAULT_COUNTRY
): Promise<Result<AppSearchResult, AppStoreError>> {
  // Validate input
  const trimmedBundleId = bundleId.trim();
  if (!trimmedBundleId) {
    return {
      success: false,
      error: createAppStoreError(
        'INVALID_QUERY',
        'Bundle ID cannot be empty.',
        false
      ),
    };
  }

  // Apply rate limiting
  await throttleRequest();

  const params = new URLSearchParams({
    bundleId: trimmedBundleId,
    country,
  });

  const url = `${ITUNES_API_BASE}/lookup?${params.toString()}`;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // Make the request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check response status
    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          error: createAppStoreError(
            'RATE_LIMITED',
            'Too many requests. Please wait a moment and try again.',
            true,
            60000
          ),
        };
      }

      return {
        success: false,
        error: createAppStoreError(
          'UNKNOWN_ERROR',
          `iTunes API returned status ${response.status}`,
          true
        ),
      };
    }

    // Parse response
    const data: iTunesSearchResponse = await response.json();

    // Check for empty results
    if (data.resultCount === 0 || !data.results || data.results.length === 0) {
      return {
        success: false,
        error: createAppStoreError(
          'NO_RESULTS',
          `No app found with bundle ID "${trimmedBundleId}".`,
          false
        ),
      };
    }

    // Transform result
    const app = transformToAppSearchResult(data.results[0]);

    return {
      success: true,
      data: app,
    };
  } catch (error) {
    return {
      success: false,
      error: parseError(error),
    };
  }
}

/**
 * Extract screenshot URLs from an app search result
 *
 * Utility function to get just the URLs from screenshots,
 * optionally filtered by device type.
 *
 * @param app - App search result
 * @param deviceType - Optional filter for device type
 * @returns Array of screenshot URLs
 */
export function getScreenshotUrls(
  app: AppSearchResult,
  deviceType?: 'iphone' | 'ipad'
): string[] {
  let screenshots = app.screenshots;

  if (deviceType) {
    screenshots = screenshots.filter((s) => s.deviceType === deviceType);
  }

  return screenshots.map((s) => s.url);
}

/**
 * Filter screenshots by selection state
 *
 * @param screenshots - Array of screenshots
 * @param selected - Filter for selected (true) or unselected (false)
 * @returns Filtered array of screenshots
 */
export function filterSelectedScreenshots(
  screenshots: AppStoreScreenshot[],
  selected = true
): AppStoreScreenshot[] {
  return screenshots.filter((s) => s.selected === selected);
}

/**
 * Toggle screenshot selection
 *
 * Returns a new array with the specified screenshot's selection toggled.
 * Immutable operation.
 *
 * @param screenshots - Array of screenshots
 * @param screenshotId - ID of screenshot to toggle
 * @returns New array with updated selection
 */
export function toggleScreenshotSelection(
  screenshots: AppStoreScreenshot[],
  screenshotId: string
): AppStoreScreenshot[] {
  return screenshots.map((s) =>
    s.id === screenshotId ? { ...s, selected: !s.selected } : s
  );
}

/**
 * Set all screenshots selection state
 *
 * @param screenshots - Array of screenshots
 * @param selected - New selection state for all
 * @returns New array with updated selections
 */
export function setAllScreenshotsSelection(
  screenshots: AppStoreScreenshot[],
  selected: boolean
): AppStoreScreenshot[] {
  return screenshots.map((s) => ({ ...s, selected }));
}
