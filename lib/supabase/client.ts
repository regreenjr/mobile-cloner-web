/**
 * Browser Supabase Client
 * =======================
 *
 * This module provides a browser-side Supabase client with singleton pattern
 * for type-safe database operations in the mobile-cloner-web application.
 *
 * ## Usage
 *
 * ```typescript
 * import { createBrowserClient, getSupabaseClient } from '@/lib/supabase/client';
 *
 * // Get the singleton client (recommended for most use cases)
 * const supabase = getSupabaseClient();
 *
 * // Or create a new instance (for specific scenarios)
 * const supabase = createBrowserClient();
 *
 * // Use with full type safety
 * const { data } = await supabase.from('reference_apps').select('*');
 * // data is typed as ReferenceAppRow[] | null
 * ```
 *
 * ## Environment Variables
 *
 * Required environment variables:
 * - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
 * - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key
 *
 * These must be prefixed with `NEXT_PUBLIC_` to be available in the browser.
 *
 * @module lib/supabase/client
 */

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ============================================================================
// Environment Variable Validation
// ============================================================================

/**
 * Supabase configuration from environment variables
 */
interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Error thrown when Supabase environment variables are missing or invalid
 */
export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

/**
 * Validates and retrieves Supabase configuration from environment variables
 *
 * @throws {SupabaseConfigError} If required environment variables are missing
 * @returns The validated Supabase configuration
 */
function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new SupabaseConfigError(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please set this in your .env.local file or environment configuration.'
    );
  }

  if (!anonKey) {
    throw new SupabaseConfigError(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please set this in your .env.local file or environment configuration.'
    );
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    throw new SupabaseConfigError(
      `Invalid NEXT_PUBLIC_SUPABASE_URL: "${url}" is not a valid URL. ` +
      'Expected format: https://your-project.supabase.co'
    );
  }

  return { url, anonKey };
}

/**
 * Checks if the Supabase environment is properly configured
 *
 * Use this for conditional rendering or to show configuration errors
 * without throwing an exception.
 *
 * @returns Object with `isConfigured` boolean and optional `error` message
 *
 * @example
 * ```typescript
 * const { isConfigured, error } = validateSupabaseConfig();
 * if (!isConfigured) {
 *   console.error('Supabase not configured:', error);
 *   return <SetupInstructions />;
 * }
 * ```
 */
export function validateSupabaseConfig(): { isConfigured: boolean; error?: string } {
  try {
    getSupabaseConfig();
    return { isConfigured: true };
  } catch (error) {
    return {
      isConfigured: false,
      error: error instanceof SupabaseConfigError
        ? error.message
        : 'Unknown configuration error',
    };
  }
}

// ============================================================================
// Singleton Client Management
// ============================================================================

/**
 * Cached Supabase client instance (singleton pattern)
 *
 * The client is initialized lazily on first use and cached for subsequent calls.
 * This ensures we don't create multiple client instances in the browser,
 * which would be wasteful and could cause issues with real-time subscriptions.
 */
let browserClient: SupabaseClient<Database> | null = null;

/**
 * Creates a new Supabase browser client instance
 *
 * This function creates a fresh client instance each time it's called.
 * For most use cases, prefer `getSupabaseClient()` which returns a singleton.
 *
 * The client is configured for browser-side usage with:
 * - Cookie-based session persistence (via @supabase/ssr)
 * - Full TypeScript support via the Database generic
 *
 * @throws {SupabaseConfigError} If environment variables are not configured
 * @returns A new typed Supabase client instance
 *
 * @example
 * ```typescript
 * // Create a fresh client (for testing or isolation)
 * const supabase = createBrowserClient();
 *
 * // Query with type safety
 * const { data, error } = await supabase
 *   .from('reference_apps')
 *   .select('*')
 *   .eq('category', 'Social');
 * ```
 */
export function createBrowserClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseConfig();

  return createSupabaseBrowserClient<Database>(url, anonKey);
}

/**
 * Gets the singleton Supabase browser client
 *
 * This is the recommended way to access the Supabase client in browser code.
 * It lazily initializes the client on first call and returns the same instance
 * for subsequent calls.
 *
 * Benefits of using the singleton:
 * - Efficient: Only one client instance per browser session
 * - Consistent: All components share the same auth state
 * - Real-time ready: Subscriptions work correctly with a single client
 *
 * @throws {SupabaseConfigError} If environment variables are not configured
 * @returns The singleton typed Supabase client instance
 *
 * @example
 * ```typescript
 * // In a React component or hook
 * const supabase = getSupabaseClient();
 *
 * // Query reference apps
 * const { data: apps } = await supabase
 *   .from('reference_apps')
 *   .select('*')
 *   .order('created_at', { ascending: false });
 *
 * // Query with relationships (when supported)
 * const { data: appWithFeatures } = await supabase
 *   .from('reference_apps')
 *   .select(`
 *     *,
 *     app_features (*)
 *   `)
 *   .eq('id', appId)
 *   .single();
 * ```
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createBrowserClient();
  }

  return browserClient;
}

/**
 * Resets the singleton client instance
 *
 * This is primarily useful for testing scenarios where you need to
 * reset the client state between tests, or when you need to force
 * a client reconnection after configuration changes.
 *
 * **Warning**: This will disconnect any active real-time subscriptions.
 * Only use this when you understand the implications.
 *
 * @internal
 *
 * @example
 * ```typescript
 * // In tests
 * beforeEach(() => {
 *   resetSupabaseClient();
 * });
 * ```
 */
export function resetSupabaseClient(): void {
  browserClient = null;
}

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Re-export the Database type for convenience
 *
 * This allows consumers to import both the client and types from the same module.
 *
 * @example
 * ```typescript
 * import { getSupabaseClient, type Database } from '@/lib/supabase/client';
 * ```
 */
export type { Database };

/**
 * Typed Supabase client type for this database
 *
 * Use this type when you need to pass the Supabase client as a parameter
 * or store it in state with proper typing.
 *
 * @example
 * ```typescript
 * import type { TypedSupabaseClient } from '@/lib/supabase/client';
 *
 * function useReferenceApps(supabase: TypedSupabaseClient) {
 *   // ...
 * }
 * ```
 */
export type TypedSupabaseClient = SupabaseClient<Database>;
