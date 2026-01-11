/**
 * App Store Search API Route
 *
 * Provides a server-side proxy for searching iOS App Store and Google Play Store.
 * This route avoids CORS issues that would occur when calling external APIs from the browser.
 *
 * GET /api/app-store - Get app details and screenshots by ID
 * POST /api/app-store - Search both app stores
 *
 * @example
 * ```ts
 * // GET request (app details)
 * // GET /api/app-store?id=493145008&platform=ios&country=us
 *
 * // Response
 * {
 *   "success": true,
 *   "data": {
 *     "id": "493145008",
 *     "name": "Headspace",
 *     "developer": "Headspace Inc.",
 *     "platform": "ios",
 *     "screenshots": [...]
 *   }
 * }
 *
 * // POST request body (search)
 * {
 *   "query": "Headspace",
 *   "platforms": ["ios", "android"],
 *   "limit": 10,
 *   "country": "us",
 *   "language": "en"
 * }
 *
 * // Response
 * {
 *   "success": true,
 *   "data": {
 *     "query": "Headspace",
 *     "ios": [...],
 *     "android": [...],
 *     "iosSuccess": true,
 *     "androidSuccess": true
 *   }
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchAppStores, getAppById } from '@/lib/appStoreService';
import type { AppStorePlatform, AppStoreSearchParams, CombinedSearchResults, AppSearchResult } from '@/types/appStore';

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request body for POST /api/app-store
 */
interface SearchRequestBody {
  query: string;
  platforms?: AppStorePlatform[];
  limit?: number;
  country?: string;
  language?: string;
}

/**
 * API Response wrapper
 */
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; retryable: boolean } };

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates the search request body
 */
function validateSearchRequest(body: unknown): {
  valid: true;
  data: SearchRequestBody;
} | {
  valid: false;
  error: { code: string; message: string };
} {
  // Check if body is an object
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request body must be a JSON object',
      },
    };
  }

  const data = body as Record<string, unknown>;

  // Validate query (required, non-empty string, min 2 chars)
  if (typeof data.query !== 'string' || data.query.trim().length < 2) {
    return {
      valid: false,
      error: {
        code: 'INVALID_QUERY',
        message: 'Query must be a string with at least 2 characters',
      },
    };
  }

  // Validate platforms (optional, must be array of valid platforms)
  if (data.platforms !== undefined) {
    if (!Array.isArray(data.platforms)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PLATFORMS',
          message: 'Platforms must be an array',
        },
      };
    }

    const validPlatforms: AppStorePlatform[] = ['ios', 'android'];
    for (const platform of data.platforms) {
      if (!validPlatforms.includes(platform as AppStorePlatform)) {
        return {
          valid: false,
          error: {
            code: 'INVALID_PLATFORMS',
            message: `Invalid platform "${platform}". Must be one of: ${validPlatforms.join(', ')}`,
          },
        };
      }
    }
  }

  // Validate limit (optional, must be positive number <= 50)
  if (data.limit !== undefined) {
    if (typeof data.limit !== 'number' || data.limit < 1 || data.limit > 50) {
      return {
        valid: false,
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be a number between 1 and 50',
        },
      };
    }
  }

  // Validate country (optional, must be 2-letter code)
  if (data.country !== undefined) {
    if (typeof data.country !== 'string' || !/^[a-z]{2}$/i.test(data.country)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_COUNTRY',
          message: 'Country must be a 2-letter country code (e.g., "us", "gb")',
        },
      };
    }
  }

  // Validate language (optional, must be 2-letter code)
  if (data.language !== undefined) {
    if (typeof data.language !== 'string' || !/^[a-z]{2}$/i.test(data.language)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_LANGUAGE',
          message: 'Language must be a 2-letter language code (e.g., "en", "es")',
        },
      };
    }
  }

  return {
    valid: true,
    data: {
      query: data.query as string,
      platforms: data.platforms as AppStorePlatform[] | undefined,
      limit: data.limit as number | undefined,
      country: data.country as string | undefined,
      language: data.language as string | undefined,
    },
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/app-store
 *
 * Fetch app details and screenshots by app ID.
 *
 * Query parameters:
 * - id: string (required) - App ID (iTunes track ID for iOS, package name for Android)
 * - platform: string (required) - Platform ("ios" or "android")
 * - country: string (optional) - 2-letter country code. Defaults to "us".
 * - language: string (optional) - 2-letter language code. Defaults to "en".
 *
 * Response:
 * - success: boolean
 * - data: AppSearchResult (on success)
 * - error: { code, message, retryable } (on failure)
 *
 * @example
 * ```
 * GET /api/app-store?id=493145008&platform=ios
 * GET /api/app-store?id=com.getsomeheadspace.android&platform=android&country=gb
 * ```
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AppSearchResult>>> {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const id = searchParams.get('id');
    const platform = searchParams.get('platform') as AppStorePlatform | null;
    const country = searchParams.get('country');
    const language = searchParams.get('language');

    // Validate required parameters
    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'App ID is required. Provide "id" query parameter.',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    if (!platform) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PLATFORM',
            message: 'Platform is required. Provide "platform" query parameter ("ios" or "android").',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate platform value
    const validPlatforms: AppStorePlatform[] = ['ios', 'android'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PLATFORM',
            message: `Invalid platform "${platform}". Must be one of: ${validPlatforms.join(', ')}`,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate country (optional, must be 2-letter code)
    if (country && !/^[a-z]{2}$/i.test(country)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_COUNTRY',
            message: 'Country must be a 2-letter country code (e.g., "us", "gb")',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate language (optional, must be 2-letter code)
    if (language && !/^[a-z]{2}$/i.test(language)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_LANGUAGE',
            message: 'Language must be a 2-letter language code (e.g., "en", "es")',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Fetch app details
    const result = await getAppById(id.trim(), platform, {
      country: country?.toLowerCase() || 'us',
      language: language?.toLowerCase() || 'en',
    });

    // Handle service errors
    if (!result.success) {
      const error = (result as any).error;

      // Determine HTTP status based on error code
      let status = 500;
      if (error.code === 'NO_RESULTS' || error.code === 'INVALID_QUERY') {
        status = 404;
      } else if (error.code === 'RATE_LIMITED') {
        status = 429;
      } else if (error.code === 'STORE_UNAVAILABLE') {
        status = 503;
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            retryable: error.retryable,
          },
        },
        { status }
      );
    }

    // Return successful result
    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('[API] App Store get app error:', error);

    const message = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/app-store
 *
 * Search for apps across iOS and Android app stores.
 *
 * Request body:
 * - query: string (required) - Search term, minimum 2 characters
 * - platforms: string[] (optional) - Platforms to search ["ios", "android"]. Defaults to both.
 * - limit: number (optional) - Max results per platform (1-50). Defaults to 10.
 * - country: string (optional) - 2-letter country code. Defaults to "us".
 * - language: string (optional) - 2-letter language code. Defaults to "en".
 *
 * Response:
 * - success: boolean
 * - data: CombinedSearchResults (on success)
 * - error: { code, message, retryable } (on failure)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<CombinedSearchResults>>> {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = validateSearchRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            ...(validation as any).error,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const { query, platforms, limit, country, language } = validation.data;

    // Build search parameters with defaults
    const searchParams: AppStoreSearchParams = {
      query: query.trim(),
      platforms: platforms || ['ios', 'android'],
      limit: limit || 10,
      country: country?.toLowerCase() || 'us',
      language: language?.toLowerCase() || 'en',
    };

    // Execute search
    const results = await searchAppStores(searchParams);

    // Check if both platforms failed
    if (!results.iosSuccess && !results.androidSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SEARCH_FAILED',
            message: `Search failed: ${results.iosError || ''} ${results.androidError || ''}`.trim(),
            retryable: true,
          },
        },
        { status: 503 }
      );
    }

    // Return successful results (even if one platform failed)
    return NextResponse.json(
      {
        success: true,
        data: results,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('[API] App Store search error:', error);

    const message = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
