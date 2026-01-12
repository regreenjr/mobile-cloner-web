/**
 * Google Play Store API Client
 *
 * Provides search functionality for Android apps and extracts screenshot URLs.
 * Since Google Play has no official public API, this uses web scraping techniques
 * via a CORS proxy for browser compatibility.
 *
 * Note: Google Play scraping is less reliable than iTunes API and may fail
 * due to changes in Google's page structure or rate limiting.
 */

import type {
  PlayStoreAppResult,
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

/** Google Play Store base URL */
const PLAY_STORE_BASE = 'https://play.google.com';

/** Default country code for searches */
const DEFAULT_COUNTRY = 'us';

/** Default language code */
const DEFAULT_LANGUAGE = 'en';

/** Default number of results to return */
const DEFAULT_LIMIT = 10;

/** Maximum allowed results per request */
const MAX_LIMIT = 30;

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT = 20000;

/** Minimum delay between requests (rate limiting) */
const MIN_REQUEST_DELAY = 200;

/**
 * CORS proxy options for web platform
 * These are public CORS proxies - in production you'd want your own proxy
 */
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

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
function createPlayStoreError(
  code: AppStoreErrorCode,
  message: string,
  retryable = false,
  retryAfterMs?: number
): AppStoreError {
  return {
    code,
    message,
    platform: 'android',
    retryable,
    retryAfterMs,
  };
}

/**
 * Parses an error into a structured AppStoreError
 */
function parseError(error: unknown): AppStoreError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createPlayStoreError(
      'NETWORK_ERROR',
      'Network error: Unable to connect to Google Play. Please check your internet connection.',
      true
    );
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return createPlayStoreError(
      'NETWORK_ERROR',
      'Request timed out. Please try again.',
      true
    );
  }

  if (error instanceof SyntaxError) {
    return createPlayStoreError(
      'PARSE_ERROR',
      'Failed to parse Google Play response.',
      true
    );
  }

  if (error instanceof Error) {
    // Check for CORS errors
    if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      return createPlayStoreError(
        'CORS_ERROR',
        'Cross-origin request blocked. Android search may be limited on this platform.',
        true
      );
    }

    return createPlayStoreError('UNKNOWN_ERROR', error.message, true);
  }

  return createPlayStoreError('UNKNOWN_ERROR', 'An unexpected error occurred.', true);
}

// ============================================================================
// HTML Parsing Utilities
// ============================================================================

/**
 * Extracts JSON data from Google Play HTML response
 * Google Play embeds app data in script tags as AF_initDataCallback
 */
function extractDataFromHTML(html: string): Record<string, unknown> | null {
  try {
    // Look for the data script pattern used by Google Play
    // The data is embedded in AF_initDataCallback calls
    const scriptPattern = /AF_initDataCallback\s*\(\s*{[^}]*data:\s*(\[[\s\S]*?\])\s*,\s*sideChannel/g;
    const matches: string[] = [];
    let match;

    while ((match = scriptPattern.exec(html)) !== null) {
      matches.push(match[1]);
    }

    if (matches.length > 0) {
      // Find the script containing app data (usually the largest one)
      let bestMatch = matches[0];
      for (const m of matches) {
        if (m.length > bestMatch.length) {
          bestMatch = m;
        }
      }

      // Clean up the JSON - Google uses some non-standard formatting
      const cleaned = bestMatch
        .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

      return { rawData: JSON.parse(cleaned) };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts screenshot URLs from parsed Google Play data
 * The data structure is deeply nested and may vary
 */
function extractScreenshotsFromData(data: unknown[]): string[] {
  const screenshots: string[] = [];

  function findScreenshots(obj: unknown, depth = 0): void {
    if (depth > 20) return; // Prevent infinite recursion

    if (Array.isArray(obj)) {
      for (const item of obj) {
        // Screenshot URLs typically contain googleusercontent.com and have specific patterns
        if (
          typeof item === 'string' &&
          item.includes('googleusercontent.com') &&
          (item.includes('=w') || item.includes('=h'))
        ) {
          // Enhance the URL to get higher resolution
          const enhancedUrl = enhancePlayStoreScreenshotUrl(item);
          if (!screenshots.includes(enhancedUrl)) {
            screenshots.push(enhancedUrl);
          }
        } else if (typeof item === 'object' && item !== null) {
          findScreenshots(item, depth + 1);
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        findScreenshots(value, depth + 1);
      }
    }
  }

  findScreenshots(data);

  // Filter to only actual screenshots (not icons, feature graphics, etc.)
  // Screenshots typically have portrait dimensions in the URL pattern
  return screenshots.filter((url) => {
    // Exclude small images (icons, thumbnails)
    const sizeMatch = url.match(/=w(\d+)/);
    if (sizeMatch) {
      const width = parseInt(sizeMatch[1], 10);
      // Screenshots are typically wider than 200px
      return width > 200;
    }
    return true;
  });
}

/**
 * Extracts app metadata from parsed Google Play data
 */
function extractAppMetadataFromData(
  data: unknown[],
  appId: string
): Partial<PlayStoreAppResult> | null {
  const metadata: Partial<PlayStoreAppResult> = {
    appId,
    screenshots: [],
  };

  function findMetadata(obj: unknown, depth = 0): void {
    if (depth > 15) return;

    if (Array.isArray(obj)) {
      // Look for specific patterns in the data structure
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];

        // App title is usually a string followed by developer name
        if (typeof item === 'string' && item.length > 0 && item.length < 100) {
          // Check if this looks like an app title (not a URL, not HTML)
          if (!item.includes('http') && !item.includes('<') && !metadata.title) {
            // Verify it's likely the title by checking surrounding context
            if (i + 1 < obj.length && typeof obj[i + 1] === 'string') {
              metadata.title = item;
              metadata.developer = obj[i + 1] as string;
            }
          }
        }

        // Score is usually a number between 0 and 5
        if (typeof item === 'number' && item > 0 && item <= 5 && !metadata.score) {
          // Check decimals to distinguish from other numbers
          if (item !== Math.floor(item) || item <= 5) {
            metadata.score = item;
          }
        }

        // Recurse into nested arrays/objects
        if (typeof item === 'object' && item !== null) {
          findMetadata(item, depth + 1);
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        findMetadata(value, depth + 1);
      }
    }
  }

  findMetadata(data);

  // Extract screenshots separately
  metadata.screenshots = extractScreenshotsFromData(data);

  return metadata.screenshots && metadata.screenshots.length > 0 ? metadata : null;
}

/**
 * Fallback: Extract basic info from HTML using regex patterns
 * Used when JSON extraction fails
 */
function extractFromHTMLFallback(html: string, appId: string): Partial<PlayStoreAppResult> | null {
  const result: Partial<PlayStoreAppResult> = {
    appId,
    screenshots: [],
  };

  // Extract title
  const titleMatch = html.match(/<h1[^>]*itemprop="name"[^>]*>([^<]+)<\/h1>/);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  } else {
    // Try og:title
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    if (ogTitleMatch) {
      result.title = ogTitleMatch[1].replace(' - Apps on Google Play', '').trim();
    }
  }

  // Extract developer
  const developerMatch = html.match(/href="\/store\/apps\/developer\?id=[^"]*"[^>]*>([^<]+)<\/a>/);
  if (developerMatch) {
    result.developer = developerMatch[1].trim();
  }

  // Extract icon
  const iconMatch = html.match(/<img[^>]*itemprop="image"[^>]*src="([^"]+)"/);
  if (iconMatch) {
    result.icon = iconMatch[1];
  }

  // Extract screenshots from image URLs in the HTML
  const screenshotPattern = /https:\/\/play-lh\.googleusercontent\.com\/[a-zA-Z0-9_-]+(?:=w\d+-h\d+)?/g;
  const screenshotMatches = html.match(screenshotPattern);

  if (screenshotMatches) {
    const uniqueUrls = Array.from(new Set(screenshotMatches));
    // Filter for screenshots (larger images)
    result.screenshots = uniqueUrls
      .map(enhancePlayStoreScreenshotUrl)
      .slice(0, 10); // Limit to prevent including unrelated images
  }

  // Extract rating
  const ratingMatch = html.match(/itemprop="ratingValue"[^>]*content="([^"]+)"/);
  if (ratingMatch) {
    result.score = parseFloat(ratingMatch[1]);
  }

  // Extract category
  const categoryMatch = html.match(/itemprop="genre"[^>]*content="([^"]+)"/);
  if (categoryMatch) {
    result.genre = categoryMatch[1];
  }

  return result.screenshots && result.screenshots.length > 0 ? result : null;
}

/**
 * Enhances Play Store screenshot URL for higher quality
 * Google Play URLs use =w{width}-h{height} parameters
 */
function enhancePlayStoreScreenshotUrl(url: string): string {
  // Remove any existing size parameters and add high-res ones
  let cleanUrl = url.replace(/=w\d+(-h\d+)?(-[a-z]+)?$/, '');
  cleanUrl = cleanUrl.replace(/=s\d+(-[a-z]+)?$/, '');

  // Request a large size
  return `${cleanUrl}=w1080-h1920`;
}

// ============================================================================
// Screenshot Transformation
// ============================================================================

/**
 * Transforms screenshot URLs to AppStoreScreenshot format
 */
function transformToAppStoreScreenshots(urls: string[]): AppStoreScreenshot[] {
  return urls.map((url, index) => ({
    id: generateUUID(),
    url,
    platform: 'android' as const,
    order: index,
    selected: true,
  }));
}

// ============================================================================
// Result Transformation
// ============================================================================

/**
 * Transforms Play Store data to unified AppSearchResult format
 */
function transformToAppSearchResult(result: Partial<PlayStoreAppResult>): AppSearchResult {
  return {
    id: result.appId || '',
    name: result.title || 'Unknown App',
    developer: result.developer || 'Unknown Developer',
    platform: 'android',
    iconUrl: result.icon || '',
    category: result.genre || 'Apps',
    storeUrl: `${PLAY_STORE_BASE}/store/apps/details?id=${result.appId}`,
    rating: result.score,
    ratingCount: result.ratings,
    bundleId: result.appId || '',
    screenshots: transformToAppStoreScreenshots(result.screenshots || []),
    _raw: result as PlayStoreAppResult,
  };
}

// ============================================================================
// Fetch Utilities
// ============================================================================

/**
 * Fetches a URL with CORS proxy fallback
 */
async function fetchWithCorsProxy(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  // First, try direct fetch (works on native platforms)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.text();
    }
  } catch (directError) {
    // Direct fetch failed, try CORS proxies
    clearTimeout(timeoutId);
  }

  // Try CORS proxies (for web platform)
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyController = new AbortController();
      const proxyTimeoutId = setTimeout(() => proxyController.abort(), REQUEST_TIMEOUT);

      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        method: 'GET',
        signal: proxyController.signal,
      });

      clearTimeout(proxyTimeoutId);

      if (response.ok) {
        return await response.text();
      }
    } catch {
      // Try next proxy
      continue;
    }
  }

  throw new Error('All fetch attempts failed');
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get app details from Google Play Store by package ID
 *
 * @param appId - Package name (e.g., 'com.headspace.android')
 * @param options - Fetch options
 * @returns App details with screenshots or error
 *
 * @example
 * ```ts
 * const result = await getPlayStoreApp('com.headspace.android');
 * if (result.success) {
 *   console.log(`${result.data.name}: ${result.data.screenshots.length} screenshots`);
 * }
 * ```
 */
export async function getPlayStoreApp(
  appId: string,
  options: {
    country?: string;
    language?: string;
  } = {}
): Promise<Result<AppSearchResult, AppStoreError>> {
  // Validate input
  const trimmedAppId = appId.trim();
  if (!trimmedAppId) {
    return {
      success: false,
      error: createPlayStoreError(
        'INVALID_QUERY',
        'App ID (package name) cannot be empty.',
        false
      ),
    };
  }

  // Apply rate limiting
  await throttleRequest();

  const country = options.country || DEFAULT_COUNTRY;
  const language = options.language || DEFAULT_LANGUAGE;

  const url = `${PLAY_STORE_BASE}/store/apps/details?id=${encodeURIComponent(trimmedAppId)}&hl=${language}&gl=${country}`;

  try {
    const html = await fetchWithCorsProxy(url);

    // Check for 404 / not found
    if (html.includes('We\'re sorry, the requested URL was not found') ||
        html.includes('404') ||
        !html.includes('itemprop')) {
      return {
        success: false,
        error: createPlayStoreError(
          'NO_RESULTS',
          `No app found with package ID "${trimmedAppId}".`,
          false
        ),
      };
    }

    // Try to extract JSON data first
    const jsonData = extractDataFromHTML(html);
    let appData: Partial<PlayStoreAppResult> | null = null;

    if (jsonData && jsonData.rawData) {
      appData = extractAppMetadataFromData(jsonData.rawData as unknown[], trimmedAppId);
    }

    // Fallback to HTML parsing if JSON extraction failed
    if (!appData || !appData.screenshots || appData.screenshots.length === 0) {
      appData = extractFromHTMLFallback(html, trimmedAppId);
    }

    if (!appData || !appData.screenshots || appData.screenshots.length === 0) {
      return {
        success: false,
        error: createPlayStoreError(
          'PARSE_ERROR',
          'Could not extract screenshot data from Google Play. The page structure may have changed.',
          true
        ),
      };
    }

    const app = transformToAppSearchResult(appData);

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
 * Search for Android apps on Google Play Store
 *
 * Note: Google Play search scraping is unreliable due to dynamic content loading.
 * For best results, use getPlayStoreApp with a known package ID.
 *
 * @param query - Search term (app name or keywords)
 * @param options - Search options
 * @returns Search results or error
 *
 * @example
 * ```ts
 * const result = await searchPlayStoreApps('Headspace');
 * if (result.success) {
 *   console.log(`Found ${result.data.length} apps`);
 * }
 * ```
 */
export async function searchPlayStoreApps(
  query: string,
  options: {
    limit?: number;
    country?: string;
    language?: string;
  } = {}
): Promise<Result<AppSearchResult[], AppStoreError>> {
  // Validate input
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      success: false,
      error: createPlayStoreError(
        'INVALID_QUERY',
        'Search query cannot be empty.',
        false
      ),
    };
  }

  // Apply rate limiting
  await throttleRequest();

  const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const country = options.country || DEFAULT_COUNTRY;
  const language = options.language || DEFAULT_LANGUAGE;

  const url = `${PLAY_STORE_BASE}/store/search?q=${encodeURIComponent(trimmedQuery)}&c=apps&hl=${language}&gl=${country}`;

  try {
    const html = await fetchWithCorsProxy(url);

    // Check for no results
    if (html.includes('No results found') || html.includes('Try different keywords')) {
      return {
        success: false,
        error: createPlayStoreError(
          'NO_RESULTS',
          `No apps found matching "${trimmedQuery}". Try different keywords or check the spelling.`,
          false
        ),
      };
    }

    // Extract app IDs from search results
    const appIdPattern = /\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g;
    const appIds: string[] = [];
    let match;

    while ((match = appIdPattern.exec(html)) !== null) {
      const appId = match[1];
      if (!appIds.includes(appId)) {
        appIds.push(appId);
      }
      if (appIds.length >= limit) {
        break;
      }
    }

    if (appIds.length === 0) {
      return {
        success: false,
        error: createPlayStoreError(
          'NO_RESULTS',
          `No apps found matching "${trimmedQuery}". Try different keywords or check the spelling.`,
          false
        ),
      };
    }

    // For search results, we return basic info without full screenshots
    // Users can then select an app to get full details
    const results: AppSearchResult[] = [];

    // Extract basic info from search result HTML for each app
    // This is a simplified extraction - full details come from getPlayStoreApp
    for (const appId of appIds) {
      // Create a basic result - the full screenshots will be fetched when user selects the app
      results.push({
        id: appId,
        name: appId.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() || appId,
        developer: 'Unknown',
        platform: 'android',
        iconUrl: '',
        category: 'Apps',
        storeUrl: `${PLAY_STORE_BASE}/store/apps/details?id=${appId}`,
        bundleId: appId,
        screenshots: [], // Screenshots fetched on demand
      });
    }

    // Try to enhance the first few results with more details
    // But don't block the search - this is a nice-to-have
    const enhancedResults = await Promise.all(
      results.slice(0, 3).map(async (app) => {
        try {
          const detailResult = await getPlayStoreApp(app.id, { country, language });
          if (detailResult.success) {
            return detailResult.data;
          }
        } catch {
          // Ignore errors for individual app lookups
        }
        return app;
      })
    );

    // Merge enhanced results with basic results
    const finalResults = [
      ...enhancedResults,
      ...results.slice(3),
    ].slice(0, limit);

    return {
      success: true,
      data: finalResults,
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
 * @param app - App search result
 * @returns Array of screenshot URLs
 */
export function getPlayStoreScreenshotUrls(app: AppSearchResult): string[] {
  return app.screenshots.map((s) => s.url);
}

/**
 * Parse a Google Play Store URL to extract the app ID
 *
 * @param url - Play Store URL (e.g., https://play.google.com/store/apps/details?id=com.app.example)
 * @returns App ID or null if not found
 *
 * @example
 * ```ts
 * const appId = parsePlayStoreUrl('https://play.google.com/store/apps/details?id=com.headspace.android');
 * // Returns: 'com.headspace.android'
 * ```
 */
export function parsePlayStoreUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Check if it's a Play Store URL
    if (!parsed.hostname.includes('play.google.com')) {
      return null;
    }

    // Extract the app ID from the query parameter
    const appId = parsed.searchParams.get('id');
    return appId || null;
  } catch {
    // Try regex fallback for malformed URLs
    const match = url.match(/[?&]id=([a-zA-Z0-9._]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Check if a URL is a Google Play Store URL
 *
 * @param url - URL to check
 * @returns True if it's a Play Store URL
 */
export function isPlayStoreUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('play.google.com') && url.includes('/store/apps/');
  } catch {
    return false;
  }
}

/**
 * Get app by Play Store URL
 *
 * Convenience function to fetch app details from a Play Store URL
 *
 * @param url - Full Play Store URL
 * @param options - Fetch options
 * @returns App details with screenshots or error
 *
 * @example
 * ```ts
 * const result = await getPlayStoreAppByUrl('https://play.google.com/store/apps/details?id=com.headspace.android');
 * if (result.success) {
 *   console.log(`${result.data.name}: ${result.data.screenshots.length} screenshots`);
 * }
 * ```
 */
export async function getPlayStoreAppByUrl(
  url: string,
  options: {
    country?: string;
    language?: string;
  } = {}
): Promise<Result<AppSearchResult, AppStoreError>> {
  const appId = parsePlayStoreUrl(url);

  if (!appId) {
    return {
      success: false,
      error: createPlayStoreError(
        'INVALID_QUERY',
        'Could not extract app ID from URL. Please provide a valid Google Play Store URL.',
        false
      ),
    };
  }

  return getPlayStoreApp(appId, options);
}
