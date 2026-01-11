/**
 * API Configuration utilities
 *
 * @module lib/apiConfig
 */

import type { Result } from '../types/analyze';

/**
 * Result type for API config validation
 */
export interface ApiConfigStatus {
  /** Whether the API is properly configured and valid */
  isConfigured: boolean;
  /** Alias for isConfigured for backwards compatibility */
  isValid: boolean;
  /** Error details if configuration is invalid */
  error?: {
    message: string;
  };
}

/**
 * Validates the Claude API configuration
 */
export function validateClaudeApiConfig(): ApiConfigStatus {
  const apiKeyResult = getClaudeApiKey();

  if (!apiKeyResult.success) {
    return {
      isConfigured: false,
      isValid: false,
      error: { message: (apiKeyResult as any).error.message },
    };
  }

  const apiKey = apiKeyResult.data;

  if (!apiKey.startsWith('sk-ant-')) {
    return {
      isConfigured: false,
      isValid: false,
      error: { message: 'Invalid API key format' },
    };
  }

  if (apiKey.length < 40) {
    return {
      isConfigured: false,
      isValid: false,
      error: { message: 'API key is too short' },
    };
  }

  return { isConfigured: true, isValid: true };
}

/**
 * Gets the Claude API key from environment variables
 * Returns a Result type for proper error handling
 *
 * IMPORTANT: For security, prioritizes server-side only ANTHROPIC_API_KEY.
 * The NEXT_PUBLIC_ prefixed key should only be used for client-side fallback
 * (not recommended for production).
 */
export function getClaudeApiKey(): Result<string, Error> {
  // SECURITY: Prioritize server-side only key (no NEXT_PUBLIC_ prefix)
  // This ensures API keys are not exposed to the browser
  const apiKey =
    process.env.ANTHROPIC_API_KEY ||  // Server-side only (preferred)
    process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ||  // Client-accessible (not recommended)
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;  // Legacy Expo support

  if (!apiKey) {
    return {
      success: false,
      error: new Error('API key is not configured. Set ANTHROPIC_API_KEY environment variable.'),
    };
  }

  return {
    success: true,
    data: apiKey,
  };
}
