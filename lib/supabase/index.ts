/**
 * Supabase Module
 * ===============
 *
 * This module provides a unified interface for Supabase client and database operations.
 * It exports clients for both browser and server contexts, as well as typed database
 * operations for all tables.
 *
 * ## Quick Start
 *
 * ```typescript
 * // Browser-side usage
 * import { getSupabaseClient, referenceApps } from '@/lib/supabase';
 *
 * const client = getSupabaseClient();
 * const apps = await referenceApps.getAll();
 *
 * // Server-side usage
 * import { createServerClient, referenceApps } from '@/lib/supabase';
 *
 * export default async function Page() {
 *   const supabase = await createServerClient();
 *   const { data } = await supabase.from('reference_apps').select('*');
 *   return <div>{JSON.stringify(data)}</div>;
 * }
 * ```
 *
 * ## Available Exports
 *
 * ### Clients
 * - `getSupabaseClient()` - Browser-side singleton client
 * - `createBrowserClient()` - Create new browser client
 * - `createServerClient()` - Server-side client with cookie handling
 * - `createReadOnlyServerClient()` - Read-only server client
 *
 * ### Database Operations
 * - `referenceApps` - CRUD for reference_apps table
 * - `appFeatures` - Operations for app_features table
 * - `appComparisons` - Operations for app_comparisons table
 * - `designDirections` - Operations for design_directions table
 *
 * ### Utilities
 * - `testConnection()` - Test database connectivity
 * - `validateSupabaseConfig()` - Check environment variables
 *
 * @module lib/supabase
 */

// Browser Client
export {
  createBrowserClient,
  getSupabaseClient,
  resetSupabaseClient,
  validateSupabaseConfig,
  SupabaseConfigError,
} from './client';

export type { TypedSupabaseClient, Database } from './client';

// Server Client
export {
  createServerClient,
  createReadOnlyServerClient,
} from './server';

export type { TypedServerSupabaseClient } from './server';

// Database Operations
export {
  // Operations objects
  referenceApps,
  appFeatures,
  appComparisons,
  designDirections,
  // Connection test utility
  testConnection,
  // Error types and Result type
  type DatabaseErrorCode,
  type DatabaseError,
  type DbResult,
} from './db';

// Re-export database row types for convenience
export type {
  ReferenceAppRow,
  ReferenceAppInsert,
  ReferenceAppUpdate,
  AppFeatureRow,
  AppFeatureInsert,
  AppComparisonRow,
  AppComparisonInsert,
  DesignDirectionRow,
  DesignDirectionInsert,
  DesignDirectionUpdate,
} from './db';
