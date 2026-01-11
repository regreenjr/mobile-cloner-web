/**
 * Unified App Store Service
 *
 * Combines iOS App Store (iTunes API) and Google Play Store functionality
 * into a single service with parallel search, graceful error handling,
 * and unified result types.
 *
 * @example
 * ```ts
 * // Search both stores simultaneously
 * const results = await searchAppStores({ query: 'Headspace', platforms: ['ios', 'android'] });
 *
 * // Get app by store URL (auto-detects platform)
 * const app = await getAppByUrl('https://apps.apple.com/app/id123456');
 * ```
 */

import type {
  AppStorePlatform,
  AppSearchResult,
  AppStoreScreenshot,
  AppStoreError,
  AppStoreSearchParams,
  CombinedSearchResults,
  iOSDeviceType,
} from '../types/appStore';
import type { Result } from '../types/analyze';

// iOS App Store API
import {
  searchiTunesApps,
  getiTunesAppById,
  getiTunesAppByBundleId,
  getScreenshotUrls as getiOSScreenshotUrls,
  filterSelectedScreenshots,
  toggleScreenshotSelection,
  setAllScreenshotsSelection,
} from './appStoreApi';

// Google Play Store API
import {
  searchPlayStoreApps,
  getPlayStoreApp,
  getPlayStoreAppByUrl,
  parsePlayStoreUrl,
  isPlayStoreUrl,
  getPlayStoreScreenshotUrls,
} from './playStoreApi';

// ============================================================================
// Constants
// ============================================================================

/** Default search limit per platform */
const DEFAULT_LIMIT = 10;

/** Default country code */
const DEFAULT_COUNTRY = 'us';

/** Default language code */
const DEFAULT_LANGUAGE = 'en';

// ============================================================================
// URL Detection and Parsing
// ============================================================================

/**
 * Detects the platform from a store URL
 *
 * @param url - App store URL
 * @returns Platform type or null if not recognized
 *
 * @example
 * ```ts
 * detectPlatformFromUrl('https://apps.apple.com/app/id123456'); // 'ios'
 * detectPlatformFromUrl('https://play.google.com/store/apps/details?id=com.app'); // 'android'
 * detectPlatformFromUrl('https://example.com'); // null
 * ```
 */
export function detectPlatformFromUrl(url: string): AppStorePlatform | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // iOS App Store
    if (
      hostname.includes('apple.com') ||
      hostname.includes('itunes.apple.com') ||
      hostname.includes('apps.apple.com')
    ) {
      return 'ios';
    }

    // Google Play Store
    if (hostname.includes('play.google.com')) {
      return 'android';
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parses an iTunes/App Store URL to extract the app ID
 *
 * @param url - iTunes or App Store URL
 * @returns App ID or null if not found
 *
 * @example
 * ```ts
 * parseiTunesUrl('https://apps.apple.com/us/app/headspace/id493145008'); // '493145008'
 * parseiTunesUrl('https://itunes.apple.com/app/id493145008'); // '493145008'
 * ```
 */
export function parseiTunesUrl(url: string): string | null {
  try {
    // Pattern 1: /id{number}
    const idMatch = url.match(/\/id(\d+)/);
    if (idMatch) {
      return idMatch[1];
    }

    // Pattern 2: ?id={number}
    const parsed = new URL(url);
    const idParam = parsed.searchParams.get('id');
    if (idParam && /^\d+$/.test(idParam)) {
      return idParam;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if a URL is an iTunes/App Store URL
 *
 * @param url - URL to check
 * @returns True if it's an App Store URL
 */
export function isiTunesUrl(url: string): boolean {
  return detectPlatformFromUrl(url) === 'ios';
}

/**
 * Parses any app store URL (iOS or Android)
 *
 * @param url - App store URL
 * @returns Object with platform and app ID, or null if not recognized
 *
 * @example
 * ```ts
 * parseAppStoreUrl('https://apps.apple.com/app/id123456');
 * // { platform: 'ios', appId: '123456' }
 *
 * parseAppStoreUrl('https://play.google.com/store/apps/details?id=com.app');
 * // { platform: 'android', appId: 'com.app' }
 * ```
 */
export function parseAppStoreUrl(
  url: string
): { platform: AppStorePlatform; appId: string } | null {
  const platform = detectPlatformFromUrl(url);

  if (platform === 'ios') {
    const appId = parseiTunesUrl(url);
    if (appId) {
      return { platform, appId };
    }
  }

  if (platform === 'android') {
    const appId = parsePlayStoreUrl(url);
    if (appId) {
      return { platform, appId };
    }
  }

  return null;
}

// ============================================================================
// Unified Search Functions
// ============================================================================

/**
 * Search for apps across iOS and Android stores simultaneously
 *
 * Performs parallel searches on all requested platforms and combines results.
 * Individual platform failures don't affect other platforms.
 *
 * @param params - Search parameters
 * @returns Combined search results from all platforms
 *
 * @example
 * ```ts
 * // Search both stores
 * const results = await searchAppStores({
 *   query: 'Headspace',
 *   platforms: ['ios', 'android'],
 *   limit: 5
 * });
 *
 * if (results.iosSuccess) {
 *   console.log(`Found ${results.ios.length} iOS apps`);
 * }
 *
 * if (results.androidSuccess) {
 *   console.log(`Found ${results.android.length} Android apps`);
 * }
 * ```
 */
export async function searchAppStores(
  params: AppStoreSearchParams
): Promise<CombinedSearchResults> {
  const {
    query,
    platforms,
    limit = DEFAULT_LIMIT,
    country = DEFAULT_COUNTRY,
    language = DEFAULT_LANGUAGE,
  } = params;

  const results: CombinedSearchResults = {
    query,
    ios: [],
    android: [],
    iosSuccess: false,
    androidSuccess: false,
  };

  // Build array of search promises based on requested platforms
  const searchPromises: Promise<void>[] = [];

  // iOS search
  if (platforms.includes('ios')) {
    const iosPromise = searchiTunesApps(query, { limit, country })
      .then((result) => {
        if (result.success) {
          results.ios = result.data;
          results.iosSuccess = true;
        } else {
          const error = (result as any).error;
          results.iosError = error.message;
          // For NO_RESULTS, we still consider it a "success" but with empty results
          if (error.code === 'NO_RESULTS') {
            results.iosSuccess = true;
          }
        }
      })
      .catch((error) => {
        results.iosError = error instanceof Error ? error.message : 'Unknown error';
      });

    searchPromises.push(iosPromise);
  }

  // Android search
  if (platforms.includes('android')) {
    const androidPromise = searchPlayStoreApps(query, { limit, country, language })
      .then((result) => {
        if (result.success) {
          results.android = result.data;
          results.androidSuccess = true;
        } else {
          const error = (result as any).error;
          results.androidError = error.message;
          // For NO_RESULTS, we still consider it a "success" but with empty results
          if (error.code === 'NO_RESULTS') {
            results.androidSuccess = true;
          }
        }
      })
      .catch((error) => {
        results.androidError = error instanceof Error ? error.message : 'Unknown error';
      });

    searchPromises.push(androidPromise);
  }

  // Execute all searches in parallel
  await Promise.all(searchPromises);

  return results;
}

/**
 * Search for apps on a single platform
 *
 * @param query - Search term
 * @param platform - Platform to search
 * @param options - Search options
 * @returns Search results or error
 */
export async function searchPlatform(
  query: string,
  platform: AppStorePlatform,
  options: {
    limit?: number;
    country?: string;
    language?: string;
  } = {}
): Promise<Result<AppSearchResult[], AppStoreError>> {
  const { limit = DEFAULT_LIMIT, country = DEFAULT_COUNTRY, language = DEFAULT_LANGUAGE } = options;

  if (platform === 'ios') {
    return searchiTunesApps(query, { limit, country });
  }

  return searchPlayStoreApps(query, { limit, country, language });
}

// ============================================================================
// Get App By ID/URL Functions
// ============================================================================

/**
 * Get app details from any store by URL
 *
 * Automatically detects the platform from the URL and fetches app details.
 *
 * @param url - App store URL (iTunes or Play Store)
 * @param options - Fetch options
 * @returns App details with screenshots or error
 *
 * @example
 * ```ts
 * const result = await getAppByUrl('https://apps.apple.com/app/id493145008');
 * if (result.success) {
 *   console.log(`${result.data.name}: ${result.data.screenshots.length} screenshots`);
 * }
 * ```
 */
export async function getAppByUrl(
  url: string,
  options: {
    country?: string;
    language?: string;
  } = {}
): Promise<Result<AppSearchResult, AppStoreError>> {
  const parsed = parseAppStoreUrl(url);

  if (!parsed) {
    return {
      success: false,
      error: {
        code: 'INVALID_QUERY',
        message: 'Could not parse URL. Please provide a valid iOS App Store or Google Play Store URL.',
        retryable: false,
      },
    };
  }

  const { platform, appId } = parsed;

  if (platform === 'ios') {
    return getiTunesAppById(appId, options.country);
  }

  return getPlayStoreApp(appId, options);
}

/**
 * Get app details by ID and platform
 *
 * @param appId - App ID (track ID for iOS, package name for Android)
 * @param platform - Platform
 * @param options - Fetch options
 * @returns App details with screenshots or error
 */
export async function getAppById(
  appId: string,
  platform: AppStorePlatform,
  options: {
    country?: string;
    language?: string;
  } = {}
): Promise<Result<AppSearchResult, AppStoreError>> {
  if (platform === 'ios') {
    return getiTunesAppById(appId, options.country);
  }

  return getPlayStoreApp(appId, options);
}

/**
 * Get iOS app by bundle ID
 *
 * @param bundleId - iOS bundle identifier (e.g., 'com.headspace.headspace')
 * @param country - Country code (default: 'us')
 * @returns App details with screenshots or error
 */
export async function getAppByBundleId(
  bundleId: string,
  country: string = DEFAULT_COUNTRY
): Promise<Result<AppSearchResult, AppStoreError>> {
  return getiTunesAppByBundleId(bundleId, country);
}

// ============================================================================
// Screenshot Utilities
// ============================================================================

/**
 * Get screenshot URLs from an app, optionally filtered by device type
 *
 * @param app - App search result
 * @param deviceType - Optional filter for iOS device type
 * @returns Array of screenshot URLs
 */
export function getScreenshotUrls(
  app: AppSearchResult,
  deviceType?: iOSDeviceType
): string[] {
  if (app.platform === 'ios' && deviceType) {
    return getiOSScreenshotUrls(app, deviceType);
  }

  if (app.platform === 'android') {
    return getPlayStoreScreenshotUrls(app);
  }

  return app.screenshots.map((s) => s.url);
}

/**
 * Get all screenshots from combined search results
 *
 * @param results - Combined search results
 * @param selected - If true, only return selected screenshots
 * @returns Array of all screenshots across platforms
 */
export function getAllScreenshotsFromResults(
  results: CombinedSearchResults,
  selected = false
): AppStoreScreenshot[] {
  const allScreenshots: AppStoreScreenshot[] = [];

  // Collect from iOS results
  for (const app of results.ios) {
    const screenshots = selected
      ? filterSelectedScreenshots(app.screenshots, true)
      : app.screenshots;
    allScreenshots.push(...screenshots);
  }

  // Collect from Android results
  for (const app of results.android) {
    const screenshots = selected
      ? filterSelectedScreenshots(app.screenshots, true)
      : app.screenshots;
    allScreenshots.push(...screenshots);
  }

  return allScreenshots;
}

/**
 * Count total screenshots across platforms
 *
 * @param results - Combined search results
 * @returns Object with screenshot counts
 */
export function countScreenshots(results: CombinedSearchResults): {
  ios: number;
  android: number;
  total: number;
} {
  const iosCount = results.ios.reduce((sum, app) => sum + app.screenshots.length, 0);
  const androidCount = results.android.reduce((sum, app) => sum + app.screenshots.length, 0);

  return {
    ios: iosCount,
    android: androidCount,
    total: iosCount + androidCount,
  };
}

/**
 * Filter screenshots by device type (iOS only)
 *
 * @param screenshots - Array of screenshots
 * @param deviceType - Device type to filter by
 * @returns Filtered array of screenshots
 */
export function filterScreenshotsByDevice(
  screenshots: AppStoreScreenshot[],
  deviceType: iOSDeviceType
): AppStoreScreenshot[] {
  return screenshots.filter((s) => s.deviceType === deviceType);
}

/**
 * Filter screenshots by platform
 *
 * @param screenshots - Array of screenshots
 * @param platform - Platform to filter by
 * @returns Filtered array of screenshots
 */
export function filterScreenshotsByPlatform(
  screenshots: AppStoreScreenshot[],
  platform: AppStorePlatform
): AppStoreScreenshot[] {
  return screenshots.filter((s) => s.platform === platform);
}

// ============================================================================
// Selection Helpers (Re-exported from individual APIs)
// ============================================================================

// Re-export screenshot selection utilities
export { filterSelectedScreenshots, toggleScreenshotSelection, setAllScreenshotsSelection };

/**
 * Select or deselect screenshots by platform
 *
 * @param screenshots - Array of screenshots
 * @param platform - Platform to select/deselect
 * @param selected - New selection state
 * @returns New array with updated selections
 */
export function setScreenshotSelectionByPlatform(
  screenshots: AppStoreScreenshot[],
  platform: AppStorePlatform,
  selected: boolean
): AppStoreScreenshot[] {
  return screenshots.map((s) =>
    s.platform === platform ? { ...s, selected } : s
  );
}

/**
 * Select or deselect screenshots by device type
 *
 * @param screenshots - Array of screenshots
 * @param deviceType - Device type to select/deselect
 * @param selected - New selection state
 * @returns New array with updated selections
 */
export function setScreenshotSelectionByDevice(
  screenshots: AppStoreScreenshot[],
  deviceType: iOSDeviceType,
  selected: boolean
): AppStoreScreenshot[] {
  return screenshots.map((s) =>
    s.deviceType === deviceType ? { ...s, selected } : s
  );
}

// ============================================================================
// Convenience Re-exports
// ============================================================================

// Re-export URL utilities
export { isPlayStoreUrl, parsePlayStoreUrl };

// Re-export individual API functions for direct access when needed
export {
  // iOS
  searchiTunesApps,
  getiTunesAppById,
  getiTunesAppByBundleId,
  // Android
  searchPlayStoreApps,
  getPlayStoreApp,
  getPlayStoreAppByUrl,
};

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Check if an error is retryable
 *
 * @param error - App store error
 * @returns True if the error is retryable
 */
export function isRetryableError(error: AppStoreError): boolean {
  return error.retryable;
}

/**
 * Get user-friendly error message
 *
 * @param error - App store error
 * @returns User-friendly error message with suggestions
 */
export function getErrorMessage(error: AppStoreError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Network error. Please check your internet connection and try again.';
    case 'RATE_LIMITED':
      return `Too many requests. Please wait ${
        error.retryAfterMs ? Math.ceil(error.retryAfterMs / 1000) : 60
      } seconds and try again.`;
    case 'NO_RESULTS':
      return error.message;
    case 'INVALID_QUERY':
      return error.message;
    case 'STORE_UNAVAILABLE':
      return `The ${error.platform === 'ios' ? 'App Store' : 'Play Store'} is temporarily unavailable. Please try again later.`;
    case 'CORS_ERROR':
      return 'Unable to fetch data due to browser restrictions. This feature may have limited functionality on web.';
    case 'PARSE_ERROR':
      return 'Failed to parse store response. The store format may have changed.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Create a combined error message from search results
 *
 * @param results - Combined search results
 * @returns Error message or null if no errors
 */
export function getCombinedErrorMessage(results: CombinedSearchResults): string | null {
  const errors: string[] = [];

  if (!results.iosSuccess && results.iosError) {
    errors.push(`iOS: ${results.iosError}`);
  }

  if (!results.androidSuccess && results.androidError) {
    errors.push(`Android: ${results.androidError}`);
  }

  return errors.length > 0 ? errors.join('\n') : null;
}

// ============================================================================
// Result Utilities
// ============================================================================

/**
 * Check if combined results have any apps
 *
 * @param results - Combined search results
 * @returns True if at least one app was found
 */
export function hasResults(results: CombinedSearchResults): boolean {
  return results.ios.length > 0 || results.android.length > 0;
}

/**
 * Check if combined results have any successful searches
 *
 * @param results - Combined search results
 * @returns True if at least one platform search succeeded
 */
export function hasSuccessfulSearch(results: CombinedSearchResults): boolean {
  return results.iosSuccess || results.androidSuccess;
}

/**
 * Get total app count from combined results
 *
 * @param results - Combined search results
 * @returns Total number of apps found
 */
export function getTotalAppCount(results: CombinedSearchResults): number {
  return results.ios.length + results.android.length;
}

/**
 * Merge results from the same app across platforms
 *
 * If the same app exists on both iOS and Android (by name similarity),
 * this can help identify them. Note: This is heuristic-based.
 *
 * @param results - Combined search results
 * @returns Array of potential cross-platform matches
 */
export function findCrossPlatformMatches(
  results: CombinedSearchResults
): { ios: AppSearchResult; android: AppSearchResult; confidence: number }[] {
  const matches: { ios: AppSearchResult; android: AppSearchResult; confidence: number }[] = [];

  for (const iosApp of results.ios) {
    for (const androidApp of results.android) {
      const confidence = calculateNameSimilarity(iosApp.name, androidApp.name);

      // Consider it a match if names are very similar
      if (confidence >= 0.8) {
        matches.push({
          ios: iosApp,
          android: androidApp,
          confidence,
        });
      }
    }
  }

  // Sort by confidence (highest first)
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate similarity between two strings (simple Jaccard similarity)
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score between 0 and 1
 */
function calculateNameSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .split('');

  const setA = new Set(normalize(a));
  const setB = new Set(normalize(b));

  // Use Array.from for better compatibility
  const arrA = Array.from(setA);
  const arrB = Array.from(setB);

  const intersection = arrA.filter((x) => setB.has(x));
  const union = new Set(arrA.concat(arrB));

  if (union.size === 0) return 0;
  return intersection.length / union.size;
}
