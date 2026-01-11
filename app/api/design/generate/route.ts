/**
 * Design Direction Generation API Route
 *
 * Provides a server-side API endpoint for generating AI-powered design directions
 * based on analyzed reference app data. Uses Claude AI to create 4 distinct design
 * directions with complete design systems including:
 * - Color palettes (light and dark mode)
 * - Typography settings
 * - Component patterns (buttons, cards, inputs, navigation, lists, modals)
 *
 * POST /api/design/generate - Generate design directions for a project
 *
 * @example
 * ```ts
 * // POST request body
 * {
 *   "projectId": "uuid",
 *   "referenceAnalyses": [
 *     {
 *       "id": "uuid",
 *       "appName": "Instagram",
 *       "category": "Social",
 *       "colorInsights": { ... },
 *       "typographyData": { ... },
 *       ...
 *     }
 *   ],
 *   "preferences": {
 *     "moodKeywords": ["modern", "minimal"],
 *     "preferredColorTemperature": "cool"
 *   }
 * }
 *
 * // Response
 * {
 *   "success": true,
 *   "data": {
 *     "directions": [...],
 *     "generationMetadata": {
 *       "modelUsed": "claude-sonnet-4-20250514",
 *       "processingTimeMs": 5432,
 *       "inputAnalysesCount": 2
 *     }
 *   }
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { designDirections } from '@/lib/supabase/db';
import { validateClaudeApiConfig, getClaudeApiKey } from '@/lib/apiConfig';
import type {
  DesignDirection,
  DesignPreferences,
} from '@/types/design';
import type { AppAnalysis } from '@/types/analyze';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes for complex generation
const DIRECTIONS_TO_GENERATE = 4;

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request body for POST /api/design/generate
 */
interface GenerateRequestBody {
  /** Project ID to associate directions with */
  projectId: string;
  /** Analysis data from reference apps */
  referenceAnalyses: AppAnalysis[];
  /** Optional design preferences to guide generation */
  preferences?: DesignPreferences;
}

/**
 * API Response wrapper
 */
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; userMessage: string; retryable: boolean; retryAfterMs?: number } };

/**
 * Generation response data
 */
interface GenerationResponseData {
  /** Generated design directions */
  directions: DesignDirection[];
  /** Metadata about the generation process */
  generationMetadata: {
    modelUsed: string;
    processingTimeMs: number;
    inputAnalysesCount: number;
  };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const colorPaletteSchema = z.object({
  primary: z.string(),
  primaryLight: z.string(),
  primaryDark: z.string(),
  secondary: z.string(),
  secondaryLight: z.string(),
  secondaryDark: z.string(),
  accent: z.string(),
  background: z.string(),
  backgroundSecondary: z.string(),
  surface: z.string(),
  surfaceSecondary: z.string(),
  text: z.string(),
  textSecondary: z.string(),
  textMuted: z.string(),
  border: z.string(),
  borderLight: z.string(),
  success: z.string(),
  warning: z.string(),
  error: z.string(),
  info: z.string(),
});

const darkModeColorsSchema = z.object({
  background: z.string(),
  backgroundSecondary: z.string(),
  surface: z.string(),
  surfaceSecondary: z.string(),
  text: z.string(),
  textSecondary: z.string(),
  textMuted: z.string(),
  border: z.string(),
  borderLight: z.string(),
});

const typographySchema = z.object({
  fontFamily: z.object({
    primary: z.string(),
    secondary: z.string(),
    mono: z.string(),
  }),
  fontSize: z.object({
    xs: z.number(),
    sm: z.number(),
    base: z.number(),
    lg: z.number(),
    xl: z.number(),
    '2xl': z.number(),
    '3xl': z.number(),
    '4xl': z.number(),
  }),
  fontWeight: z.object({
    light: z.string(),
    normal: z.string(),
    medium: z.string(),
    semibold: z.string(),
    bold: z.string(),
  }),
  lineHeight: z.object({
    tight: z.number(),
    normal: z.number(),
    relaxed: z.number(),
    loose: z.number(),
  }),
  letterSpacing: z.object({
    tight: z.number(),
    normal: z.number(),
    wide: z.number(),
  }),
});

const buttonPatternSchema = z.object({
  borderRadius: z.number(),
  paddingHorizontal: z.number(),
  paddingVertical: z.number(),
  variants: z.array(z.enum(['solid', 'outline', 'ghost', 'link'])),
  sizes: z.array(z.enum(['sm', 'md', 'lg'])),
  hasIcon: z.boolean(),
  hasShadow: z.boolean(),
});

const cardPatternSchema = z.object({
  borderRadius: z.number(),
  padding: z.number(),
  hasShadow: z.boolean(),
  shadowIntensity: z.enum(['subtle', 'medium', 'strong']),
  hasBorder: z.boolean(),
  hasHoverEffect: z.boolean(),
});

const inputPatternSchema = z.object({
  borderRadius: z.number(),
  borderStyle: z.enum(['solid', 'none', 'underline']),
  padding: z.number(),
  hasLabel: z.boolean(),
  labelPosition: z.enum(['above', 'floating', 'inline']),
  hasIcon: z.boolean(),
  iconPosition: z.enum(['left', 'right']),
});

const navigationPatternSchema = z.object({
  style: z.enum(['tabs', 'drawer', 'bottom-nav', 'stack']),
  hasIcons: z.boolean(),
  iconStyle: z.enum(['filled', 'outlined', 'duotone']),
  activeIndicator: z.enum(['underline', 'background', 'icon-fill', 'dot']),
});

const listPatternSchema = z.object({
  itemSpacing: z.number(),
  hasDividers: z.boolean(),
  dividerStyle: z.enum(['full', 'inset', 'none']),
  hasSwipeActions: z.boolean(),
  avatarStyle: z.enum(['circle', 'rounded', 'square']),
});

const modalPatternSchema = z.object({
  borderRadius: z.number(),
  hasOverlay: z.boolean(),
  overlayOpacity: z.number(),
  animationType: z.enum(['fade', 'slide', 'scale']),
  position: z.enum(['center', 'bottom', 'top']),
});

const componentPatternsSchema = z.object({
  buttons: buttonPatternSchema,
  cards: cardPatternSchema,
  inputs: inputPatternSchema,
  navigation: navigationPatternSchema,
  lists: listPatternSchema,
  modals: modalPatternSchema,
});

const designDirectionSchema = z.object({
  directionNumber: z.number(),
  name: z.string(),
  description: z.string(),
  moodKeywords: z.array(z.string()),
  colorPalette: colorPaletteSchema,
  darkModeColors: darkModeColorsSchema,
  typography: typographySchema,
  componentPatterns: componentPatternsSchema,
});

const generateResponseSchema = z.object({
  directions: z.array(designDirectionSchema),
});

// ============================================================================
// Claude Prompt Template
// ============================================================================

const DESIGN_GENERATION_PROMPT = `You are an expert UI/UX designer and design system architect. Based on the provided reference app analyses, generate 4 distinct and unique design directions for a new mobile app.

Each design direction should be cohesive and complete, offering a different aesthetic approach while maintaining usability and accessibility standards. The directions should vary in:
- Visual style (e.g., minimal vs. bold, organic vs. geometric)
- Color temperature and saturation
- Typography personality
- Component roundness and shadow usage

## Reference App Analyses

{{ANALYSES_DATA}}

{{PREFERENCES_SECTION}}

## Required Output Format

Generate exactly 4 design directions as a JSON object with this structure:

\`\`\`json
{
  "directions": [
    {
      "directionNumber": 1,
      "name": "<Creative direction name, 2-4 words>",
      "description": "<2-3 sentence description of the design aesthetic and personality>",
      "moodKeywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"],
      "colorPalette": {
        "primary": "#XXXXXX",
        "primaryLight": "#XXXXXX",
        "primaryDark": "#XXXXXX",
        "secondary": "#XXXXXX",
        "secondaryLight": "#XXXXXX",
        "secondaryDark": "#XXXXXX",
        "accent": "#XXXXXX",
        "background": "#XXXXXX",
        "backgroundSecondary": "#XXXXXX",
        "surface": "#XXXXXX",
        "surfaceSecondary": "#XXXXXX",
        "text": "#XXXXXX",
        "textSecondary": "#XXXXXX",
        "textMuted": "#XXXXXX",
        "border": "#XXXXXX",
        "borderLight": "#XXXXXX",
        "success": "#XXXXXX",
        "warning": "#XXXXXX",
        "error": "#XXXXXX",
        "info": "#XXXXXX"
      },
      "darkModeColors": {
        "background": "#XXXXXX",
        "backgroundSecondary": "#XXXXXX",
        "surface": "#XXXXXX",
        "surfaceSecondary": "#XXXXXX",
        "text": "#XXXXXX",
        "textSecondary": "#XXXXXX",
        "textMuted": "#XXXXXX",
        "border": "#XXXXXX",
        "borderLight": "#XXXXXX"
      },
      "typography": {
        "fontFamily": {
          "primary": "<Google Font or system font name>",
          "secondary": "<Google Font or system font name>",
          "mono": "<Monospace font name>"
        },
        "fontSize": {
          "xs": 10,
          "sm": 12,
          "base": 14,
          "lg": 16,
          "xl": 18,
          "2xl": 24,
          "3xl": 30,
          "4xl": 36
        },
        "fontWeight": {
          "light": "300",
          "normal": "400",
          "medium": "500",
          "semibold": "600",
          "bold": "700"
        },
        "lineHeight": {
          "tight": 1.25,
          "normal": 1.5,
          "relaxed": 1.75,
          "loose": 2
        },
        "letterSpacing": {
          "tight": -0.025,
          "normal": 0,
          "wide": 0.025
        }
      },
      "componentPatterns": {
        "buttons": {
          "borderRadius": <number in px>,
          "paddingHorizontal": <number in px>,
          "paddingVertical": <number in px>,
          "variants": ["solid", "outline", "ghost", "link"],
          "sizes": ["sm", "md", "lg"],
          "hasIcon": <boolean>,
          "hasShadow": <boolean>
        },
        "cards": {
          "borderRadius": <number in px>,
          "padding": <number in px>,
          "hasShadow": <boolean>,
          "shadowIntensity": "<subtle|medium|strong>",
          "hasBorder": <boolean>,
          "hasHoverEffect": <boolean>
        },
        "inputs": {
          "borderRadius": <number in px>,
          "borderStyle": "<solid|none|underline>",
          "padding": <number in px>,
          "hasLabel": <boolean>,
          "labelPosition": "<above|floating|inline>",
          "hasIcon": <boolean>,
          "iconPosition": "<left|right>"
        },
        "navigation": {
          "style": "<tabs|drawer|bottom-nav|stack>",
          "hasIcons": <boolean>,
          "iconStyle": "<filled|outlined|duotone>",
          "activeIndicator": "<underline|background|icon-fill|dot>"
        },
        "lists": {
          "itemSpacing": <number in px>,
          "hasDividers": <boolean>,
          "dividerStyle": "<full|inset|none>",
          "hasSwipeActions": <boolean>,
          "avatarStyle": "<circle|rounded|square>"
        },
        "modals": {
          "borderRadius": <number in px>,
          "hasOverlay": <boolean>,
          "overlayOpacity": <number 0-1>,
          "animationType": "<fade|slide|scale>",
          "position": "<center|bottom|top>"
        }
      }
    }
  ]
}
\`\`\`

## Design Direction Guidelines

### Direction 1: Conservative/Professional
- Draw from the most common patterns in the reference apps
- Clean, professional aesthetic
- Moderate border radius (4-8px)
- Subtle shadows
- Neutral or muted colors

### Direction 2: Modern/Bold
- Contemporary design with strong visual identity
- Larger border radius (12-16px)
- Vibrant primary colors with good contrast
- Bold typography choices
- Medium to strong shadows

### Direction 3: Minimal/Elegant
- Maximum restraint and negative space
- Very subtle or no shadows
- Monochromatic or limited color palette
- Refined typography with careful spacing
- Borderless or ultra-thin borders

### Direction 4: Playful/Dynamic
- Energetic and approachable
- Large border radius (16-24px or fully rounded)
- Bright, saturated colors
- Mix of font weights
- Creative navigation patterns

## Important Requirements

1. All colors MUST be valid 6-character hex codes (e.g., #FF5733)
2. Colors must meet WCAG AA contrast requirements for text on backgrounds
3. Font families should be commonly available Google Fonts
4. All numeric values should be reasonable for mobile UI (sizes in px)
5. Each direction should be distinctly different but all should be production-ready
6. Dark mode colors should properly invert the light mode palette

Return ONLY the JSON object, no additional text or explanation.`;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates the generate request body
 */
function validateGenerateRequest(body: unknown): {
  valid: true;
  data: GenerateRequestBody;
} | {
  valid: false;
  error: { code: string; message: string };
} {
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

  // Validate projectId
  if (typeof data.projectId !== 'string' || data.projectId.trim().length === 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PROJECT_ID',
        message: 'projectId is required and must be a non-empty string',
      },
    };
  }

  // Validate referenceAnalyses
  if (!Array.isArray(data.referenceAnalyses)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_ANALYSES',
        message: 'referenceAnalyses must be an array',
      },
    };
  }

  if (data.referenceAnalyses.length === 0) {
    return {
      valid: false,
      error: {
        code: 'NO_ANALYSES',
        message: 'At least one reference analysis is required',
      },
    };
  }

  // Validate preferences (optional)
  if (data.preferences !== undefined) {
    if (typeof data.preferences !== 'object' || data.preferences === null) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PREFERENCES',
          message: 'preferences must be an object if provided',
        },
      };
    }
  }

  return {
    valid: true,
    data: {
      projectId: data.projectId as string,
      referenceAnalyses: data.referenceAnalyses as AppAnalysis[],
      preferences: data.preferences as DesignPreferences | undefined,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build preferences section for the prompt
 */
function buildPreferencesSection(preferences?: DesignPreferences): string {
  if (!preferences) {
    return '';
  }

  const sections: string[] = ['## Design Preferences'];

  if (preferences.moodKeywords && preferences.moodKeywords.length > 0) {
    sections.push(`\n**Desired mood keywords:** ${preferences.moodKeywords.join(', ')}`);
  }

  if (preferences.avoidKeywords && preferences.avoidKeywords.length > 0) {
    sections.push(`\n**Keywords to avoid:** ${preferences.avoidKeywords.join(', ')}`);
  }

  if (preferences.preferredColorTemperature) {
    sections.push(`\n**Preferred color temperature:** ${preferences.preferredColorTemperature}`);
  }

  if (preferences.accessibilityLevel) {
    sections.push(`\n**Accessibility level:** ${preferences.accessibilityLevel}`);
  }

  return sections.length > 1 ? sections.join('') + '\n' : '';
}

/**
 * Format analyses data for the prompt
 */
function formatAnalysesForPrompt(analyses: AppAnalysis[]): string {
  return analyses.map((analysis, index) => `
### Reference App ${index + 1}
- **Screens Analyzed:** ${analysis.screensAnalyzed}
- **Overall Style:** ${analysis.overallStyle}
- **Target Audience:** ${analysis.targetAudience}
- **Color Palette:**
  - Primary: ${analysis.colorPalette.primary}
  - Secondary: ${analysis.colorPalette.secondary}
  - Accent: ${analysis.colorPalette.accent}
  - Background: ${analysis.colorPalette.background}
  - Text: ${analysis.colorPalette.text}
- **Typography:**
  - Heading: ${analysis.typography.headingFont} (${analysis.typography.headingSize}, ${analysis.typography.headingWeight})
  - Body: ${analysis.typography.bodyFont} (${analysis.typography.bodySize}, ${analysis.typography.bodyWeight})
- **Design Patterns:** ${analysis.designPatterns.map(p => p.name).join(', ')}
- **Unique Selling Points:** ${analysis.uniqueSellingPoints.join(', ')}
`).join('\n');
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/design/generate
 *
 * Returns API status and configuration information.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const configStatus = validateClaudeApiConfig();

    return NextResponse.json({
      success: true,
      data: {
        configured: configStatus.isConfigured,
        directionsPerGeneration: DIRECTIONS_TO_GENERATE,
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[API] Design generate GET error:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        userMessage: 'Failed to get generation status. Please try again.',
        retryable: true,
      },
    }, { status: 500 });
  }
}

/**
 * POST /api/design/generate
 *
 * Generates design directions using Claude AI based on reference app analyses.
 *
 * Request body:
 * - projectId: string (required) - Project UUID to associate directions with
 * - referenceAnalyses: AppAnalysis[] (required) - Analyzed reference app data
 * - preferences: DesignPreferences (optional) - User preferences for generation
 *
 * Response:
 * - success: boolean
 * - data: GenerationResponseData (on success)
 * - error: { code, message, userMessage, retryable } (on failure)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<GenerationResponseData>>> {
  const startTime = Date.now();

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
    const validation = validateGenerateRequest(body);
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

    const { projectId, referenceAnalyses, preferences } = validation.data;

    // Validate API configuration
    const configStatus = validateClaudeApiConfig();
    if (!configStatus.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'API_KEY_INVALID',
            message: configStatus.error?.message ?? 'API key not configured',
            userMessage: 'Claude API is not configured. Please check your settings.',
            retryable: false,
          },
        },
        { status: 401 }
      );
    }

    // Get API key
    const apiKeyResult = getClaudeApiKey();
    if (!apiKeyResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'API_KEY_INVALID',
            message: 'Failed to retrieve API key',
            userMessage: 'Claude API key is invalid. Please check your configuration.',
            retryable: false,
          },
        },
        { status: 401 }
      );
    }

    // Build the prompt
    const analysesData = formatAnalysesForPrompt(referenceAnalyses);
    const preferencesSection = buildPreferencesSection(preferences);
    const prompt = DESIGN_GENERATION_PROMPT
      .replace('{{ANALYSES_DATA}}', analysesData)
      .replace('{{PREFERENCES_SECTION}}', preferencesSection);

    console.log(`[API] Generating ${DIRECTIONS_TO_GENERATE} design directions for project ${projectId}`);

    // Initialize Anthropic client
    const client = new Anthropic({
      apiKey: apiKeyResult.data,
    });

    // Call Claude API
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESPONSE_PARSE_ERROR',
            message: 'No text response from Claude',
            userMessage: 'Failed to generate design directions. Please try again.',
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
      console.error('[API] Failed to parse JSON response:', parseError);
      console.error('[API] Raw response:', textContent.text.substring(0, 500));
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESPONSE_PARSE_ERROR',
            message: `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            userMessage: 'Failed to parse generated directions. Please try again.',
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // Validate with Zod
    const validationResult = generateResponseSchema.safeParse(parsedResponse);
    if (!validationResult.success) {
      const zodError = validationResult.error;
      const errorMessages = zodError.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      console.error('[API] Zod validation failed:', errorMessages);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid response structure: ${errorMessages}`,
            userMessage: 'Generated directions have invalid structure. Please try again.',
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    const generatedDirections = validationResult.data.directions;

    // Save directions to Supabase
    const savedDirections: DesignDirection[] = [];
    const now = new Date().toISOString();

    for (const direction of generatedDirections) {
      const directionId = generateUUID();

      const directionToSave = {
        id: directionId,
        project_id: projectId,
        direction_number: direction.directionNumber,
        name: direction.name,
        description: direction.description,
        mood_keywords: direction.moodKeywords,
        color_palette: direction.colorPalette,
        dark_mode_colors: direction.darkModeColors,
        typography: direction.typography,
        component_patterns: direction.componentPatterns,
        votes: 0,
        voters: [],
        is_selected: false,
        created_at: now,
        updated_at: now,
      };

      const saveResult = await designDirections.create(directionToSave);

      if (!saveResult.success) {
        console.error(`[API] Failed to save direction ${direction.directionNumber}:`, (saveResult as any).error);
        // Continue saving other directions even if one fails
        continue;
      }

      // Map to DesignDirection type for response
      const savedDirection: DesignDirection = {
        id: saveResult.data.id,
        projectId: saveResult.data.project_id,
        directionNumber: saveResult.data.direction_number,
        name: saveResult.data.name,
        description: saveResult.data.description ?? '',
        moodKeywords: saveResult.data.mood_keywords,
        colorPalette: saveResult.data.color_palette,
        darkModeColors: saveResult.data.dark_mode_colors,
        typography: saveResult.data.typography,
        componentPatterns: saveResult.data.component_patterns,
        votes: saveResult.data.votes,
        voters: saveResult.data.voters,
        isSelected: saveResult.data.is_selected,
        createdAt: saveResult.data.created_at,
        updatedAt: saveResult.data.updated_at,
      };

      savedDirections.push(savedDirection);
    }

    if (savedDirections.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SAVE_ERROR',
            message: 'Failed to save any design directions to database',
            userMessage: 'Failed to save generated directions. Please try again.',
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    const processingTimeMs = Date.now() - startTime;

    console.log(
      `[API] Successfully generated and saved ${savedDirections.length} design directions ` +
      `for project ${projectId} in ${processingTimeMs}ms`
    );

    // Prepare response
    const responseData: GenerationResponseData = {
      directions: savedDirections,
      generationMetadata: {
        modelUsed: 'claude-sonnet-4-20250514',
        processingTimeMs,
        inputAnalysesCount: referenceAnalyses.length,
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Design generate POST error:', error);

    // Handle Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      const statusCode = error.status;

      if (statusCode === 429) {
        const retryAfter = error.headers?.['retry-after'];
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 30000;

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: `Rate limited: ${error.message}`,
              userMessage: 'Too many requests. Please wait a moment and try again.',
              retryable: true,
              retryAfterMs,
            },
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
            },
          }
        );
      }

      if (statusCode === 401 || statusCode === 403) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'API_KEY_INVALID',
              message: `Authentication failed: ${error.message}`,
              userMessage: 'API key is invalid or unauthorized.',
              retryable: false,
            },
          },
          { status: 401 }
        );
      }
    }

    const message = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
          userMessage: 'An unexpected error occurred during generation. Please try again.',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
