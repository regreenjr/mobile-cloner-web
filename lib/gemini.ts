/**
 * Google Gemini AI Integration
 *
 * Provides screenshot analysis using Gemini 2.0 Flash with vision capabilities.
 * Replaces Claude API with Gemini for significantly higher image limits and lower cost.
 *
 * Features:
 * - Multi-image analysis (50-100 screenshots vs Claude's 6-8)
 * - 2M token context window vs Claude's 200K
 * - ~10x lower cost per token
 * - Direct image URL support (no base64 encoding needed)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AppAnalysis, Screenshot, ClaudeApiError } from '@/types/analyze';

// ============================================================================
// Configuration
// ============================================================================

/** Gemini API key from environment */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/** Gemini model to use - 2.0 Flash is best for vision + speed */
const MODEL_NAME = 'gemini-2.0-flash-exp';

/** Maximum screenshots Gemini can handle (conservative limit) */
const MAX_SCREENSHOTS = 50;

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT = 180000; // 3 minutes

// ============================================================================
// Types
// ============================================================================

export interface GeminiAnalysisResult {
  analysis: AppAnalysis;
  tokensUsed: number;
  model: string;
}

export type Result<T, E = ClaudeApiError> =
  | { success: true; data: T }
  | { success: false; error: E };

// ============================================================================
// Error Handling
// ============================================================================

function createApiError(
  code: string,
  message: string,
  userMessage?: string
): ClaudeApiError {
  return {
    code,
    message,
    userMessage: userMessage || message,
    retryable: code === 'RATE_LIMITED' || code === 'NETWORK_ERROR',
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Image Fetching
// ============================================================================

/**
 * Fetch image as buffer for Gemini inline data
 */
async function fetchImageAsBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Convert image buffer to base64 for Gemini
 */
function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Determine MIME type from URL
 */
function getMimeType(url: string): string {
  if (url.includes('.jpg') || url.includes('.jpeg')) return 'image/jpeg';
  if (url.includes('.png')) return 'image/png';
  if (url.includes('.webp')) return 'image/webp';
  if (url.includes('.gif')) return 'image/gif';
  return 'image/png'; // default
}

// ============================================================================
// Prompt Engineering
// ============================================================================

const ANALYSIS_PROMPT = `You are an expert mobile UI/UX designer analyzing app screenshots. Provide a comprehensive design system analysis.

Analyze these app screenshots and extract:

## 1. Overall Style
Describe the overall design philosophy, visual approach, and emotional tone in 2-3 sentences.

## 2. Color Palette
Extract the primary color palette with hex codes:
- Primary colors (brand colors, 2-3 main colors)
- Secondary colors (supporting colors)
- Accent colors (highlights, CTAs)
- Background colors (surfaces, cards)
- Text colors (primary, secondary, disabled)

## 3. Typography
Identify font families and usage:
- Heading fonts (family, size range, weight)
- Body fonts (family, size range, weight)
- Special fonts (if any, like monospace for code)

## 4. Spacing & Layout
- Grid system (if evident)
- Common padding/margin values
- Card/container styling
- Border radius patterns

## 5. Components
Identify common UI components and their styles:
- Buttons (primary, secondary, variants)
- Input fields and forms
- Cards and containers
- Navigation patterns
- Icons and imagery style

## 6. Unique Design Patterns
Any distinctive or noteworthy design choices that make this app stand out.

Return ONLY valid JSON in this exact structure:
{
  "overallStyle": "string",
  "colorPalette": {
    "primary": [{"name": "string", "hex": "#RRGGBB", "usage": "string"}],
    "secondary": [{"name": "string", "hex": "#RRGGBB", "usage": "string"}],
    "accent": [{"name": "string", "hex": "#RRGGBB", "usage": "string"}],
    "background": [{"name": "string", "hex": "#RRGGBB", "usage": "string"}],
    "text": [{"name": "string", "hex": "#RRGGBB", "usage": "string"}]
  },
  "typography": {
    "heading": {"family": "string", "sizes": "string", "weights": "string"},
    "body": {"family": "string", "sizes": "string", "weights": "string"}
  },
  "spacing": {
    "gridSystem": "string",
    "commonValues": ["string"],
    "borderRadius": "string"
  },
  "components": [
    {"type": "string", "description": "string", "variants": ["string"]}
  ],
  "uniquePatterns": ["string"]
}`;

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze app screenshots with Gemini 2.0 Flash
 */
export async function analyzeAppScreenshots(
  appName: string,
  screenshots: Screenshot[]
): Promise<Result<GeminiAnalysisResult>> {
  // Validate API key
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      error: createApiError(
        'CONFIG_ERROR',
        'Gemini API key not configured',
        'Server configuration error. Please contact support.'
      ),
    };
  }

  // Validate screenshots
  if (screenshots.length === 0) {
    return {
      success: false,
      error: createApiError(
        'INVALID_INPUT',
        'No screenshots provided',
        'Please select at least one screenshot to analyze.'
      ),
    };
  }

  if (screenshots.length > MAX_SCREENSHOTS) {
    return {
      success: false,
      error: createApiError(
        'TOO_MANY_SCREENSHOTS',
        `Maximum ${MAX_SCREENSHOTS} screenshots allowed`,
        `Please select ${MAX_SCREENSHOTS} or fewer screenshots.`
      ),
    };
  }

  try {
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Fetch all images
    console.log(`[Gemini] Fetching ${screenshots.length} screenshots...`);
    const imagePromises = screenshots.map(async (screenshot) => {
      const buffer = await fetchImageAsBuffer(screenshot.url);
      const base64 = bufferToBase64(buffer);
      const mimeType = getMimeType(screenshot.url);

      return {
        inlineData: {
          data: base64,
          mimeType,
        },
      };
    });

    const images = await Promise.all(imagePromises);
    console.log(`[Gemini] Fetched all images successfully`);

    // Build prompt parts
    const parts = [
      { text: `App Name: ${appName}\n\n${ANALYSIS_PROMPT}` },
      ...images,
    ];

    // Generate analysis with timeout
    console.log(`[Gemini] Generating analysis...`);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
    );

    const resultPromise = model.generateContent(parts);
    const result = await Promise.race([resultPromise, timeoutPromise]);

    const response = result.response;
    const text = response.text();

    console.log(`[Gemini] Analysis complete, parsing response...`);

    // Parse JSON response
    let analysis: AppAnalysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n([\s\S]+?)\n```/) || text.match(/```\n([\s\S]+?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Gemini] Failed to parse response:', text);
      return {
        success: false,
        error: createApiError(
          'PARSE_ERROR',
          'Failed to parse AI response',
          'AI returned invalid format. Please try again.'
        ),
      };
    }

    // Get token usage (Gemini provides this in usage metadata)
    const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

    console.log(`[Gemini] Success! Tokens used: ${tokensUsed}`);

    return {
      success: true,
      data: {
        analysis,
        tokensUsed,
        model: MODEL_NAME,
      },
    };
  } catch (error: any) {
    console.error('[Gemini] Analysis failed:', error);

    // Handle specific Gemini errors
    if (error.message?.includes('API_KEY')) {
      return {
        success: false,
        error: createApiError(
          'AUTH_ERROR',
          'Invalid API key',
          'Server configuration error. Please contact support.'
        ),
      };
    }

    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return {
        success: false,
        error: createApiError(
          'RATE_LIMITED',
          'Rate limit exceeded',
          'Too many requests. Please try again in a few moments.'
        ),
      };
    }

    if (error.message?.includes('timeout')) {
      return {
        success: false,
        error: createApiError(
          'TIMEOUT',
          'Request timeout',
          'Analysis took too long. Please try with fewer screenshots.'
        ),
      };
    }

    return {
      success: false,
      error: createApiError(
        'UNKNOWN_ERROR',
        error.message || 'Unknown error',
        'Something went wrong. Please try again.'
      ),
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get maximum screenshots per request
 */
export function getMaxScreenshotsPerRequest(): number {
  return MAX_SCREENSHOTS;
}

/**
 * Mock rate limit status for compatibility with existing code
 */
export function getRateLimitStatus() {
  return {
    hasLimit: false,
    remaining: Infinity,
    resetAt: null,
  };
}

/**
 * Mock cache status for compatibility
 */
export type CacheStatus = null;
