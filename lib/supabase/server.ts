/**
 * Server Supabase Client
 * ======================
 *
 * This module provides a server-side Supabase client with cookie handling
 * for type-safe database operations in Next.js server components, route handlers,
 * and server actions.
 *
 * ## Usage
 *
 * ```typescript
 * import { createServerClient } from '@/lib/supabase/server';
 *
 * // In a Server Component
 * export default async function Page() {
 *   const supabase = await createServerClient();
 *   const { data } = await supabase.from('reference_apps').select('*');
 *   return <div>{JSON.stringify(data)}</div>;
 * }
 *
 * // In a Route Handler
 * export async function GET() {
 *   const supabase = await createServerClient();
 *   const { data } = await supabase.from('reference_apps').select('*');
 *   return Response.json(data);
 * }
 *
 * // In a Server Action
 * async function createApp(formData: FormData) {
 *   'use server';
 *   const supabase = await createServerClient();
 *   // ... perform database operations
 * }
 * ```
 *
 * ## Environment Variables
 *
 * Required environment variables:
 * - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
 * - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key
 *
 * ## Cookie Handling
 *
 * This client uses Next.js's `cookies()` function from `next/headers` to manage
 * session cookies for server-side authentication. The cookie handler:
 * - Reads existing session cookies
 * - Sets new cookies when sessions are refreshed
 * - Removes cookies when sessions are cleared
 *
 * @module lib/supabase/server
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

// ============================================================================
// Server Client Factory
// ============================================================================

/**
 * Creates a Supabase server client with cookie handling for server-side operations
 *
 * This function creates a new client instance each time it's called, which is
 * the recommended pattern for server-side code where each request should have
 * its own client instance with its own cookie context.
 *
 * The client is configured with custom cookie handlers that integrate with
 * Next.js's `cookies()` function from `next/headers`, enabling:
 * - Session persistence across server-side requests
 * - Automatic token refresh
 * - Secure cookie management
 *
 * **Important**: This function must be called within a server context where
 * `cookies()` is available (Server Components, Route Handlers, Server Actions,
 * or Middleware).
 *
 * @throws {SupabaseConfigError} If environment variables are not configured
 * @returns A promise that resolves to a typed Supabase client instance
 *
 * @example
 * ```typescript
 * // In a Server Component
 * import { createServerClient } from '@/lib/supabase/server';
 *
 * export default async function DashboardPage() {
 *   const supabase = await createServerClient();
 *
 *   const { data: apps, error } = await supabase
 *     .from('reference_apps')
 *     .select('*')
 *     .order('created_at', { ascending: false });
 *
 *   if (error) {
 *     return <div>Error loading apps</div>;
 *   }
 *
 *   return (
 *     <ul>
 *       {apps?.map(app => (
 *         <li key={app.id}>{app.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In a Route Handler
 * import { createServerClient } from '@/lib/supabase/server';
 * import { NextResponse } from 'next/server';
 *
 * export async function GET() {
 *   const supabase = await createServerClient();
 *
 *   const { data, error } = await supabase
 *     .from('reference_apps')
 *     .select('id, name, category');
 *
 *   if (error) {
 *     return NextResponse.json({ error: error.message }, { status: 500 });
 *   }
 *
 *   return NextResponse.json(data);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In a Server Action
 * 'use server';
 *
 * import { createServerClient } from '@/lib/supabase/server';
 * import type { ReferenceAppInsert } from '@/types/database';
 *
 * export async function createReferenceApp(data: ReferenceAppInsert) {
 *   const supabase = await createServerClient();
 *
 *   const { data: app, error } = await supabase
 *     .from('reference_apps')
 *     .insert(data)
 *     .select()
 *     .single();
 *
 *   if (error) {
 *     throw new Error(`Failed to create app: ${error.message}`);
 *   }
 *
 *   return app;
 * }
 * ```
 */
export async function createServerClient(): Promise<SupabaseClient<Database>> {
  const { url, anonKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(url, anonKey, {
    cookies: {
      /**
       * Gets all cookies from the cookie store
       * @returns Array of cookie name-value pairs
       */
      getAll() {
        return cookieStore.getAll();
      },

      /**
       * Sets cookies in the cookie store
       *
       * Note: Setting cookies in Server Components will throw an error because
       * the response headers have already been sent. This is expected behavior
       * and Supabase SSR handles it gracefully. For Server Components, session
       * tokens are read-only.
       *
       * @param cookiesToSet - Array of cookies to set with name, value, and options
       */
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Setting cookies from a Server Component will throw an error.
          // This can be safely ignored if you're only reading cookies in
          // Server Components, as the middleware will handle refreshing
          // sessions and setting cookies.
          //
          // If you're using Server Actions or Route Handlers that need to
          // modify cookies, ensure you're not calling this from a Server
          // Component's initial render.
        }
      },
    },
  });
}

// ============================================================================
// Read-Only Server Client (for Server Components)
// ============================================================================

/**
 * Creates a read-only Supabase server client optimized for Server Components
 *
 * This is a convenience function that creates a server client specifically
 * designed for use in Server Components where you only need to read data.
 * It's functionally identical to `createServerClient()` but makes the
 * read-only intent explicit.
 *
 * Use this when you want to clearly indicate that the operation is read-only
 * and won't attempt to modify session cookies.
 *
 * @throws {SupabaseConfigError} If environment variables are not configured
 * @returns A promise that resolves to a typed Supabase client instance
 *
 * @example
 * ```typescript
 * import { createReadOnlyServerClient } from '@/lib/supabase/server';
 *
 * export default async function AppListPage() {
 *   const supabase = await createReadOnlyServerClient();
 *
 *   const { data: apps } = await supabase
 *     .from('reference_apps')
 *     .select('*');
 *
 *   return <AppList apps={apps ?? []} />;
 * }
 * ```
 */
export async function createReadOnlyServerClient(): Promise<SupabaseClient<Database>> {
  return createServerClient();
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
 * import { createServerClient, type Database } from '@/lib/supabase/server';
 * ```
 */
export type { Database };

/**
 * Typed Supabase server client type for this database
 *
 * Use this type when you need to pass the Supabase client as a parameter
 * or define function signatures with proper typing.
 *
 * @example
 * ```typescript
 * import type { TypedServerSupabaseClient } from '@/lib/supabase/server';
 *
 * async function fetchApps(supabase: TypedServerSupabaseClient) {
 *   return supabase.from('reference_apps').select('*');
 * }
 * ```
 */
export type TypedServerSupabaseClient = SupabaseClient<Database>;
