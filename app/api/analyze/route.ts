/**
 * Screenshot Analysis API Route
 *
 * Provides a server-side API endpoint for analyzing app screenshots using Claude AI.
 * This route handles the complete analysis workflow including:
 * - Screenshot validation and fetching
 * - Claude API integration with vision capabilities
 * - Progress tracking via Server-Sent Events (SSE)
 * - Result caching and storage in Supabase
 * - Rate limit handling and error management
 *
 * POST /api/analyze - Analyze screenshots for a reference app
 * GET /api/analyze/status/:appId - Get analysis status (optional polling endpoint)
 *
 * @example
 * ```ts
 * // POST request body
 * {
 *   "appId": "uuid",
 *   "appName": "Instagram",
 *   "screenshots": [
 *     { "id": "1", "url": "https://...", "order": 0 },
 *     { "id": "2", "url": "https://...", "order": 1 }
 *   ],
 *   "options": {
 *     "forceRefresh": false
 *   }
 * }
 *
 * // Response
 * {
 *   "success": true,
 *   "data": {
 *     "analysis": { ... },
 *     "fromCache": false,
 *     "analyzedAt": "2024-01-15T12:00:00Z"
 *   }
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeAppScreenshots,
  getRateLimitStatus,
  getMaxScreenshotsPerRequest,
  type CacheStatus,
} from '@/lib/claude';
import { referenceApps } from '@/lib/supabase/db';
import type { Screenshot, AppAnalysis, ClaudeApiError } from '@/types/analyze';

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request body for POST /api/analyze
 */
interface AnalyzeRequestBody {
  /** Reference app ID for caching and storage */
  appId: string;
  /** Name of the app being analyzed */
  appName: string;
  /** Screenshots to analyze */
  screenshots: Screenshot[];
  /** Analysis options */
  options?: {
    /** Skip cache and force fresh analysis */
    forceRefresh?: boolean;
    /** Custom timeout in milliseconds */
    timeoutMs?: number;
  };
}

/**
 * API Response wrapper
 */
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; userMessage: string; retryable: boolean; retryAfterMs?: number } };

/**
 * Analysis response data
 */
interface AnalysisResponseData {
  /** The analysis result */
  analysis: AppAnalysis;
  /** Whether result came from cache */
  fromCache: boolean;
  /** Cache entry ID if applicable */
  cacheEntryId: string | null;
  /** When analysis was performed */
  analyzedAt: string;
  /** Screenshots analyzed count */
  screenshotsAnalyzed: number;
  /** Whether screenshots were truncated */
  wasTruncated: boolean;
  /** Cache status during analysis */
  cacheStatus: CacheStatus | null;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates a single screenshot object
 */
function isValidScreenshot(screenshot: unknown): screenshot is Screenshot {
  if (!screenshot || typeof screenshot !== 'object') {
    return false;
  }

  const s = screenshot as Record<string, unknown>;

  // Required fields
  if (typeof s.id !== 'string' || s.id.trim().length === 0) {
    return false;
  }
  if (typeof s.url !== 'string' || s.url.trim().length === 0) {
    return false;
  }
  if (typeof s.order !== 'number' || s.order < 0) {
    return false;
  }

  // Validate URL format
  try {
    new URL(s.url);
  } catch {
    return false;
  }

  return true;
}

/**
 * Validates the analyze request body
 */
function validateAnalyzeRequest(body: unknown): {
  valid: true;
  data: AnalyzeRequestBody;
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

  // Validate appId (required, non-empty UUID)
  if (typeof data.appId !== 'string' || data.appId.trim().length === 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_APP_ID',
        message: 'appId is required and must be a non-empty string',
      },
    };
  }

  // Validate appName (required, non-empty string)
  if (typeof data.appName !== 'string' || data.appName.trim().length === 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_APP_NAME',
        message: 'appName is required and must be a non-empty string',
      },
    };
  }

  // Validate screenshots (required, non-empty array)
  if (!Array.isArray(data.screenshots)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_SCREENSHOTS',
        message: 'screenshots must be an array',
      },
    };
  }

  if (data.screenshots.length === 0) {
    return {
      valid: false,
      error: {
        code: 'NO_SCREENSHOTS',
        message: 'At least one screenshot is required for analysis',
      },
    };
  }

  // Validate each screenshot
  for (let i = 0; i < data.screenshots.length; i++) {
    if (!isValidScreenshot(data.screenshots[i])) {
      return {
        valid: false,
        error: {
          code: 'INVALID_SCREENSHOT',
          message: `Invalid screenshot at index ${i}. Each screenshot must have id (string), url (valid URL), and order (number >= 0)`,
        },
      };
    }
  }

  // Validate options (optional)
  if (data.options !== undefined) {
    if (typeof data.options !== 'object' || data.options === null) {
      return {
        valid: false,
        error: {
          code: 'INVALID_OPTIONS',
          message: 'options must be an object if provided',
        },
      };
    }

    const options = data.options as Record<string, unknown>;

    if (options.forceRefresh !== undefined && typeof options.forceRefresh !== 'boolean') {
      return {
        valid: false,
        error: {
          code: 'INVALID_OPTIONS',
          message: 'options.forceRefresh must be a boolean if provided',
        },
      };
    }

    if (options.timeoutMs !== undefined) {
      if (typeof options.timeoutMs !== 'number' || options.timeoutMs < 1000 || options.timeoutMs > 300000) {
        return {
          valid: false,
          error: {
            code: 'INVALID_OPTIONS',
            message: 'options.timeoutMs must be a number between 1000 and 300000 (1s to 5min)',
          },
        };
      }
    }
  }

  return {
    valid: true,
    data: {
      appId: data.appId as string,
      appName: data.appName as string,
      screenshots: data.screenshots as Screenshot[],
      options: data.options as AnalyzeRequestBody['options'],
    },
  };
}

// ============================================================================
// Error Mapping
// ============================================================================

/**
 * Maps ClaudeApiError to HTTP status code
 */
function getHttpStatusForError(error: ClaudeApiError): number {
  switch (error.code) {
    case 'API_KEY_INVALID':
      return 401;
    case 'RATE_LIMITED':
      return 429;
    case 'VALIDATION_ERROR':
    case 'IMAGE_INVALID':
      return 400;
    case 'IMAGE_FETCH_ERROR':
      return 422;
    case 'TIMEOUT':
      return 504;
    case 'NETWORK_ERROR':
      return 502;
    case 'RESPONSE_PARSE_ERROR':
    case 'UNKNOWN_ERROR':
    default:
      return 500;
  }
}

/**
 * Creates API error response from ClaudeApiError
 */
function createErrorResponse(error: ClaudeApiError): ApiResponse<never> {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      retryable: error.retryable,
      retryAfterMs: error.retryAfterMs,
    },
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/analyze
 *
 * Returns rate limit status and configuration information.
 * Useful for checking if analysis can proceed before submitting.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const rateLimitStatus = getRateLimitStatus();
    const maxScreenshots = getMaxScreenshotsPerRequest();

    return NextResponse.json({
      success: true,
      data: {
        rateLimit: {
          isLimited: rateLimitStatus.isLimited,
          waitTimeMs: rateLimitStatus.waitTimeMs,
          consecutiveHits: rateLimitStatus.consecutiveHits,
        },
        config: {
          maxScreenshotsPerRequest: maxScreenshots,
          defaultTimeoutMs: 60000,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[API] Analyze GET error:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        userMessage: 'Failed to get analysis status. Please try again.',
        retryable: true,
      },
    }, { status: 500 });
  }
}

/**
 * POST /api/analyze
 *
 * Analyzes app screenshots using Claude AI vision capabilities.
 *
 * Request body:
 * - appId: string (required) - Reference app UUID for caching/storage
 * - appName: string (required) - Name of the app being analyzed
 * - screenshots: Screenshot[] (required) - Screenshots to analyze
 * - options.forceRefresh: boolean (optional) - Skip cache
 * - options.timeoutMs: number (optional) - Custom timeout (1-300 seconds)
 *
 * Response:
 * - success: boolean
 * - data: AnalysisResponseData (on success)
 * - error: { code, message, userMessage, retryable, retryAfterMs? } (on failure)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AnalysisResponseData>>> {
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
            userMessage: 'Invalid request format. Please try again.',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = validateAnalyzeRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: (validation as any).error.code,
            message: (validation as any).error.message,
            userMessage: (validation as any).error.message,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const { appId, appName, screenshots, options } = validation.data;

    // Check rate limit before proceeding
    const rateLimitStatus = getRateLimitStatus();
    if (rateLimitStatus.isLimited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Rate limited. Please wait ${Math.ceil(rateLimitStatus.waitTimeMs / 1000)} seconds.`,
            userMessage: `Too many requests. Please wait ${Math.ceil(rateLimitStatus.waitTimeMs / 1000)} seconds before trying again.`,
            retryable: true,
            retryAfterMs: rateLimitStatus.waitTimeMs,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimitStatus.waitTimeMs / 1000)),
          },
        }
      );
    }

    // Track analysis metadata
    let cacheStatus: CacheStatus | null = null;
    let screenshotsAnalyzedCount = screenshots.length;
    let wasScreenshotsTruncated = false;

    // Perform analysis using the existing claude.ts module
    const result = await analyzeAppScreenshots(appName, screenshots, {
      appId,
      forceRefresh: options?.forceRefresh ?? false,
      timeoutMs: options?.timeoutMs,
      onCacheStatus: (status) => {
        cacheStatus = status;
        console.log(`[API] Analysis cache status for app ${appId}: ${status}`);
      },
      onBatching: (info) => {
        screenshotsAnalyzedCount = info.analyzing;
        wasScreenshotsTruncated = info.wasTruncated;
        if (info.wasTruncated) {
          console.log(
            `[API] Analysis for app ${appId}: Screenshots truncated from ${info.totalProvided} to ${info.analyzing}`
          );
        }
      },
      onRetry: (attempt, error, delayMs) => {
        console.log(
          `[API] Analysis retry ${attempt} for app ${appId}: ${error.code}, waiting ${delayMs}ms`
        );
      },
    });

    // Handle analysis failure
    if (!result.success) {
      const httpStatus = getHttpStatusForError((result as any).error);
      const errorResponse = createErrorResponse((result as any).error);

      console.error(`[API] Analysis failed for app ${appId}:`, (result as any).error);

      return NextResponse.json(errorResponse, {
        status: httpStatus,
        headers: (result as any).error.retryAfterMs
          ? { 'Retry-After': String(Math.ceil((result as any).error.retryAfterMs / 1000)) }
          : undefined,
      });
    }

    // Analysis succeeded - store in Supabase
    const analysis = result.data;
    const fromCache = cacheStatus === 'hit';

    // Update the reference app with the analysis result
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateResult = await referenceApps.update(appId, {
        analysis: analysis as any,
      });

      if (!updateResult.success) {
        // Log the error but don't fail the request - analysis completed successfully
        console.error(
          `[API] Failed to store analysis in Supabase for app ${appId}:`,
          (updateResult as any).error
        );
      } else {
        console.log(`[API] Analysis stored in Supabase for app ${appId}`);
      }
    } catch (dbError) {
      // Log database errors but don't fail the request
      console.error(`[API] Database error storing analysis for app ${appId}:`, dbError);
    }

    // Prepare response
    const responseData: AnalysisResponseData = {
      analysis,
      fromCache,
      cacheEntryId: null, // Could be enhanced to return cache entry ID
      analyzedAt: analysis.analyzedAt,
      screenshotsAnalyzed: screenshotsAnalyzedCount,
      wasTruncated: wasScreenshotsTruncated,
      cacheStatus,
    };

    console.log(
      `[API] Analysis completed for app ${appId}: ` +
      `${responseData.screenshotsAnalyzed} screenshots, fromCache=${fromCache}`
    );

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('[API] Analyze POST error:', error);

    const message = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
          userMessage: 'An unexpected error occurred during analysis. Please try again.',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
