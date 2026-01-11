/**
 * App Comparison API Route
 *
 * Provides a server-side API endpoint for generating AI-powered comparison insights
 * between multiple analyzed reference apps. This route handles:
 * - App validation and fetching from Supabase
 * - Claude API integration for generating comparison insights
 * - Rate limit handling and error management
 *
 * POST /api/compare - Generate comparison insights for 2-4 apps
 * GET /api/compare - Get rate limit status and configuration
 *
 * @example
 * ```ts
 * // POST request body
 * {
 *   "appIds": ["uuid1", "uuid2", "uuid3"],
 *   "options": {
 *     "includeRecommendations": true
 *   }
 * }
 *
 * // Response
 * {
 *   "success": true,
 *   "data": {
 *     "insights": { ... },
 *     "generatedAt": "2024-01-15T12:00:00Z"
 *   }
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { referenceApps } from '@/lib/supabase/db';
import {
  getRateLimitStatus,
  createClaudeApiError,
  parseAnthropicError,
  withRetry,
  withTimeout,
  DEFAULT_RETRY_CONFIG,
} from '@/lib/claude';
import { validateClaudeApiConfig, getClaudeApiKey } from '@/lib/apiConfig';
import type { ComparisonInsights } from '@/components/ComparisonTable';
import type { ReferenceAppRow } from '@/types/database';
import type { ClaudeApiError, Result } from '@/types/analyze';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default timeout for comparison generation (90 seconds)
 * Comparison analysis may take longer than single-app analysis
 */
const DEFAULT_TIMEOUT_MS = 90000;

/**
 * Maximum number of apps that can be compared at once
 */
const MAX_APPS_TO_COMPARE = 4;

/**
 * Minimum number of apps required for comparison
 */
const MIN_APPS_TO_COMPARE = 2;

// ============================================================================
// Lazy Client Initialization
// ============================================================================

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Result<Anthropic, ClaudeApiError> {
  if (anthropicClient) {
    return { success: true, data: anthropicClient };
  }

  const apiKeyResult = getClaudeApiKey();
  if (!apiKeyResult.success) {
    const errorMessage = (apiKeyResult as any).error instanceof Error
      ? (apiKeyResult as any).error.message
      : String((apiKeyResult as any).error);
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

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request body for POST /api/compare
 */
interface CompareRequestBody {
  /** Array of app IDs to compare (2-4 required) */
  appIds: string[];
  /** Comparison options */
  options?: {
    /** Whether to include recommendations in the output */
    includeRecommendations?: boolean;
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
 * Comparison response data
 */
interface CompareResponseData {
  /** The generated comparison insights */
  insights: ComparisonInsights;
  /** When the comparison was generated */
  generatedAt: string;
  /** Number of apps compared */
  appsCompared: number;
}

// ============================================================================
// Zod Validation Schema
// ============================================================================

/**
 * Schema for validating comparison insights response from Claude
 */
const comparisonInsightsSchema = z.object({
  summary: z.string(),
  similarities: z.array(z.string()),
  differences: z.array(z.string()),
  recommendations: z.array(z.string()),
});

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates the compare request body
 */
function validateCompareRequest(body: unknown): {
  valid: true;
  data: CompareRequestBody;
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

  // Validate appIds (required, array of UUIDs)
  if (!Array.isArray(data.appIds)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_APP_IDS',
        message: 'appIds is required and must be an array of strings',
      },
    };
  }

  if (data.appIds.length < MIN_APPS_TO_COMPARE) {
    return {
      valid: false,
      error: {
        code: 'TOO_FEW_APPS',
        message: `At least ${MIN_APPS_TO_COMPARE} apps are required for comparison`,
      },
    };
  }

  if (data.appIds.length > MAX_APPS_TO_COMPARE) {
    return {
      valid: false,
      error: {
        code: 'TOO_MANY_APPS',
        message: `Maximum of ${MAX_APPS_TO_COMPARE} apps can be compared at once`,
      },
    };
  }

  // Validate each appId is a non-empty string
  for (let i = 0; i < data.appIds.length; i++) {
    const appId = data.appIds[i];
    if (typeof appId !== 'string' || appId.trim().length === 0) {
      return {
        valid: false,
        error: {
          code: 'INVALID_APP_ID',
          message: `Invalid app ID at index ${i}. Each appId must be a non-empty string`,
        },
      };
    }
  }

  // Check for duplicate app IDs
  const uniqueIds = new Set(data.appIds);
  if (uniqueIds.size !== data.appIds.length) {
    return {
      valid: false,
      error: {
        code: 'DUPLICATE_APP_IDS',
        message: 'Duplicate app IDs are not allowed',
      },
    };
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

    if (options.includeRecommendations !== undefined && typeof options.includeRecommendations !== 'boolean') {
      return {
        valid: false,
        error: {
          code: 'INVALID_OPTIONS',
          message: 'options.includeRecommendations must be a boolean if provided',
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
      appIds: data.appIds as string[],
      options: data.options as CompareRequestBody['options'],
    },
  };
}

// ============================================================================
// Comparison Prompt Generation
// ============================================================================

/**
 * Generates the comparison prompt for Claude
 */
function generateComparisonPrompt(apps: ReferenceAppRow[], includeRecommendations: boolean): string {
  // Build app data summary for each app
  const appSummaries = apps.map((app, idx) => {
    const analysis = app.analysis;
    if (!analysis) {
      return `
App ${idx + 1}: ${app.name}
Category: ${app.category}
Status: Not analyzed
`;
    }

    return `
App ${idx + 1}: ${app.name}
Category: ${app.category}
Screenshots Analyzed: ${analysis.screensAnalyzed}

Design Patterns:
${analysis.designPatterns?.map(p => `- ${p.name}: ${p.description}`).join('\n') || 'None identified'}

User Flows:
${analysis.userFlows?.map(f => `- ${f.name} (${f.complexity}, ${f.stepCount} steps): ${f.description}`).join('\n') || 'None identified'}

Features:
- Core: ${analysis.featureSet?.core?.join(', ') || 'None'}
- Nice to Have: ${analysis.featureSet?.niceToHave?.join(', ') || 'None'}
- Differentiators: ${analysis.featureSet?.differentiators?.join(', ') || 'None'}

Color Palette:
- Primary: ${analysis.colorPalette?.primary || 'Unknown'}
- Secondary: ${analysis.colorPalette?.secondary || 'Unknown'}
- Accent: ${analysis.colorPalette?.accent || 'Unknown'}

Typography:
- Heading: ${analysis.typography?.headingFont || 'Unknown'} (${analysis.typography?.headingSize || 'Unknown'})
- Body: ${analysis.typography?.bodyFont || 'Unknown'} (${analysis.typography?.bodySize || 'Unknown'})

Overall Style: ${analysis.overallStyle || 'Not determined'}
Target Audience: ${analysis.targetAudience || 'Not determined'}
Unique Selling Points: ${analysis.uniqueSellingPoints?.join(', ') || 'None identified'}
`;
  }).join('\n---\n');

  const recommendationsInstruction = includeRecommendations
    ? `
5. Recommendations: 3-5 actionable recommendations for building a new app based on these references. Focus on:
   - Best practices observed across the apps
   - Design patterns worth adopting
   - Features that provide the most value
   - Areas where the apps could be improved upon`
    : '';

  return `You are an expert mobile app UI/UX analyst comparing multiple reference apps. Analyze the following apps and generate comprehensive comparison insights.

${appSummaries}

Based on this analysis data, provide:

1. Summary: A 2-3 sentence overview of what these apps have in common and how they differ at a high level.

2. Similarities: List 4-6 key similarities between the apps. Focus on:
   - Shared design patterns and UI components
   - Common user flows and interaction patterns
   - Similar feature sets and functionality
   - Matching color schemes or typography choices

3. Differences: List 4-6 key differences between the apps. Focus on:
   - Unique design approaches each app takes
   - Different user flow implementations
   - Distinct features that set each app apart
   - Visual style and branding differences
${recommendationsInstruction}

Return your analysis as a JSON object with this exact structure:
{
  "summary": "<2-3 sentence overview>",
  "similarities": ["<similarity 1>", "<similarity 2>", ...],
  "differences": ["<difference 1>", "<difference 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...]
}

${!includeRecommendations ? 'Note: Return an empty array for recommendations.' : ''}

Be specific and reference the actual apps by name when making comparisons. Focus on actionable insights that would help someone building a similar app.`;
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
      return 400;
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
 * GET /api/compare
 *
 * Returns rate limit status and configuration information.
 * Useful for checking if comparison can proceed before submitting.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const rateLimitStatus = getRateLimitStatus();

    return NextResponse.json({
      success: true,
      data: {
        rateLimit: {
          isLimited: rateLimitStatus.isLimited,
          waitTimeMs: rateLimitStatus.waitTimeMs,
          consecutiveHits: rateLimitStatus.consecutiveHits,
        },
        config: {
          minApps: MIN_APPS_TO_COMPARE,
          maxApps: MAX_APPS_TO_COMPARE,
          defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[API] Compare GET error:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        userMessage: 'Failed to get comparison status. Please try again.',
        retryable: true,
      },
    }, { status: 500 });
  }
}

/**
 * POST /api/compare
 *
 * Generates AI-powered comparison insights for 2-4 analyzed apps.
 *
 * Request body:
 * - appIds: string[] (required) - Array of 2-4 app UUIDs to compare
 * - options.includeRecommendations: boolean (optional) - Include design recommendations
 * - options.timeoutMs: number (optional) - Custom timeout (1-300 seconds)
 *
 * Response:
 * - success: boolean
 * - data: CompareResponseData (on success)
 * - error: { code, message, userMessage, retryable, retryAfterMs? } (on failure)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<CompareResponseData>>> {
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
    const validation = validateCompareRequest(body);
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

    const { appIds, options } = validation.data;
    const includeRecommendations = options?.includeRecommendations ?? true;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // Validate API configuration
    const configStatus = validateClaudeApiConfig();
    if (!configStatus.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'API_KEY_INVALID',
            message: configStatus.error?.message ?? 'API key not configured',
            userMessage: 'Claude API key is not configured. Please check your settings.',
            retryable: false,
          },
        },
        { status: 401 }
      );
    }

    // Check rate limit status before proceeding
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

    // Fetch all apps from Supabase
    console.log(`[API] Fetching ${appIds.length} apps for comparison`);
    const fetchedApps: ReferenceAppRow[] = [];
    const notFoundIds: string[] = [];
    const unanalyzedApps: string[] = [];

    for (const appId of appIds) {
      const result = await referenceApps.getById(appId);
      if (!result.success) {
        if ((result as any).error.code === 'NOT_FOUND') {
          notFoundIds.push(appId);
        } else {
          console.error(`[API] Failed to fetch app ${appId}:`, (result as any).error);
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'DATABASE_ERROR',
                message: `Failed to fetch app ${appId}: ${(result as any).error.message}`,
                userMessage: 'Failed to fetch app data. Please try again.',
                retryable: true,
              },
            },
            { status: 500 }
          );
        }
      } else {
        fetchedApps.push(result.data);
        if (!result.data.analysis) {
          unanalyzedApps.push(result.data.name);
        }
      }
    }

    // Check for not found apps
    if (notFoundIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'APPS_NOT_FOUND',
            message: `The following app IDs were not found: ${notFoundIds.join(', ')}`,
            userMessage: `Some apps could not be found. Please refresh and try again.`,
            retryable: false,
          },
        },
        { status: 404 }
      );
    }

    // Check for unanalyzed apps
    if (unanalyzedApps.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'APPS_NOT_ANALYZED',
            message: `The following apps have not been analyzed: ${unanalyzedApps.join(', ')}`,
            userMessage: `Please analyze the following apps before comparing: ${unanalyzedApps.join(', ')}`,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Get Anthropic client
    const clientResult = getAnthropicClient();
    if (!clientResult.success) {
      return NextResponse.json(createErrorResponse((clientResult as any).error), { status: 401 });
    }
    const client = clientResult.data;

    // Generate comparison prompt
    const prompt = generateComparisonPrompt(fetchedApps, includeRecommendations);
    console.log(`[API] Generating comparison insights for ${fetchedApps.length} apps`);

    // Call Claude API with retry logic
    const apiResult = await withRetry(
      async () => {
        const response = await withTimeout(
          client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
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
      DEFAULT_RETRY_CONFIG,
      (attempt, error, delayMs) => {
        console.log(
          `[API] Comparison retry ${attempt}: ${error.code}, waiting ${delayMs}ms`
        );
      }
    );

    if (!apiResult.success) {
      const httpStatus = getHttpStatusForError((apiResult as any).error);
      console.error(`[API] Comparison generation failed:`, (apiResult as any).error);
      return NextResponse.json(createErrorResponse((apiResult as any).error), {
        status: httpStatus,
        headers: (apiResult as any).error.retryAfterMs
          ? { 'Retry-After': String(Math.ceil((apiResult as any).error.retryAfterMs / 1000)) }
          : undefined,
      });
    }

    // Extract and parse response
    const response = apiResult.data;
    const textContent = response.content.find(c => c.type === 'text');

    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESPONSE_PARSE_ERROR',
            message: 'No text response from Claude',
            userMessage: 'Failed to generate comparison insights. Please try again.',
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // Parse JSON from response (may be wrapped in markdown code block)
    let jsonStr: string = textContent.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1];
    }

    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[API] Failed to parse comparison JSON:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESPONSE_PARSE_ERROR',
            message: `Failed to parse comparison JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            userMessage: 'Failed to parse comparison results. Please try again.',
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // Validate with Zod
    const validationResult = comparisonInsightsSchema.safeParse(parsedResponse);
    if (!validationResult.success) {
      const zodError = validationResult.error;
      const errorMessages = zodError.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      console.error('[API] Comparison validation failed:', errorMessages);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid comparison response: ${errorMessages}`,
            userMessage: 'Failed to validate comparison results. Please try again.',
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // Build the response
    const generatedAt = new Date().toISOString();
    const insights: ComparisonInsights = {
      ...validationResult.data,
      generatedAt,
    };

    const responseData: CompareResponseData = {
      insights,
      generatedAt,
      appsCompared: fetchedApps.length,
    };

    console.log(
      `[API] Comparison completed for ${fetchedApps.length} apps: ` +
      `${insights.similarities.length} similarities, ${insights.differences.length} differences, ` +
      `${insights.recommendations.length} recommendations`
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
    console.error('[API] Compare POST error:', error);

    // Check if it's an Anthropic error we can parse
    if (error instanceof Error) {
      const claudeError = parseAnthropicError(error);
      return NextResponse.json(createErrorResponse(claudeError), {
        status: getHttpStatusForError(claudeError),
      });
    }

    const message = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
          userMessage: 'An unexpected error occurred during comparison. Please try again.',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
