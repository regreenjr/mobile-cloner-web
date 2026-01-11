/**
 * Supabase Database Operations
 * ============================
 *
 * This module provides typed database operations for all tables in the
 * mobile-cloner-web application. All operations use the Result pattern
 * for consistent error handling.
 *
 * ## Usage
 *
 * ```typescript
 * import { referenceApps } from '@/lib/supabase/db';
 *
 * // Get all reference apps
 * const result = await referenceApps.getAll();
 * if (result.success) {
 *   console.log('Apps:', result.data);
 * } else {
 *   console.error('Error:', result.error.message);
 * }
 * ```
 *
 * ## Result Pattern
 *
 * All operations return a Result type:
 * - Success: `{ success: true, data: T }`
 * - Error: `{ success: false, error: DatabaseError }`
 *
 * @module lib/supabase/db
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
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
} from '@/types/database';
import type { VoteRecord } from '@/types/design';

// ============================================================================
// Supabase Client for Database Operations
// ============================================================================

/**
 * Typed Supabase client
 *
 * Note: Due to Supabase's complex generic types, we use the base client type
 * and apply type assertions at the operation level for better DX.
 */
type TypedClient = SupabaseClient<Database>;

/**
 * Get Supabase client for database operations
 *
 * Creates or returns a cached client instance for database operations.
 */
let cachedClient: TypedClient | null = null;

function getTypedSupabaseClient(): TypedClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  cachedClient = createClient<Database>(url, anonKey);
  return cachedClient;
}

// Type helper for Supabase query results
type QueryResult<T> = { data: T | null; error: { code?: string; message: string; details?: string; hint?: string } | null };

/**
 * Helper to cast Supabase query results to the expected types.
 * This is necessary due to complex generic type inference issues in @supabase/supabase-js v2.90+
 */
function asQueryResult<T>(result: unknown): QueryResult<T> {
  return result as QueryResult<T>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Specific error codes for database operations
 */
export type DatabaseErrorCode =
  | 'NOT_FOUND'
  | 'DUPLICATE_KEY'
  | 'FOREIGN_KEY_VIOLATION'
  | 'VALIDATION_ERROR'
  | 'CONNECTION_ERROR'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR';

/**
 * Structured error for database operations
 */
export interface DatabaseError {
  /** Error code for programmatic handling */
  code: DatabaseErrorCode;
  /** Technical error message */
  message: string;
  /** User-friendly error message for display */
  userMessage: string;
  /** Original Supabase error details (if available) */
  details?: string;
  /** Original error hint (if available) */
  hint?: string;
}

/**
 * Result type for database operations
 */
export type DbResult<T> =
  | { success: true; data: T }
  | { success: false; error: DatabaseError };

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Maps Supabase error codes to DatabaseErrorCode
 */
function mapErrorCode(code: string | undefined, message: string): DatabaseErrorCode {
  if (!code) {
    if (message.includes('not found') || message.includes('no rows')) {
      return 'NOT_FOUND';
    }
    return 'UNKNOWN_ERROR';
  }

  // PostgreSQL error codes
  switch (code) {
    case '23505': // unique_violation
      return 'DUPLICATE_KEY';
    case '23503': // foreign_key_violation
      return 'FOREIGN_KEY_VIOLATION';
    case '23502': // not_null_violation
    case '23514': // check_violation
    case '22P02': // invalid_text_representation
      return 'VALIDATION_ERROR';
    case '42501': // insufficient_privilege
      return 'PERMISSION_DENIED';
    case 'PGRST116': // "The result contains 0 rows"
      return 'NOT_FOUND';
    default:
      if (code.startsWith('08') || code.startsWith('57')) {
        return 'CONNECTION_ERROR';
      }
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Creates a user-friendly error message based on error code
 */
function createUserMessage(code: DatabaseErrorCode, table: string): string {
  switch (code) {
    case 'NOT_FOUND':
      return `The requested ${table.replace(/_/g, ' ')} was not found.`;
    case 'DUPLICATE_KEY':
      return `A ${table.replace(/_/g, ' ')} with this identifier already exists.`;
    case 'FOREIGN_KEY_VIOLATION':
      return `Cannot complete this operation due to related data dependencies.`;
    case 'VALIDATION_ERROR':
      return `The provided data is invalid. Please check your input.`;
    case 'CONNECTION_ERROR':
      return `Unable to connect to the database. Please try again later.`;
    case 'PERMISSION_DENIED':
      return `You do not have permission to perform this operation.`;
    default:
      return `An unexpected error occurred. Please try again.`;
  }
}

/**
 * Creates a DatabaseError from a Supabase error
 */
function createDatabaseError(
  error: { code?: string; message: string; details?: string; hint?: string },
  table: string
): DatabaseError {
  const code = mapErrorCode(error.code, error.message);

  return {
    code,
    message: error.message,
    userMessage: createUserMessage(code, table),
    details: error.details,
    hint: error.hint,
  };
}

// ============================================================================
// Reference Apps Operations
// ============================================================================

/**
 * Database operations for the reference_apps table
 *
 * Provides CRUD operations for managing reference apps that store
 * competitor app information and screenshots for analysis.
 *
 * @example
 * ```typescript
 * import { referenceApps } from '@/lib/supabase/db';
 *
 * // Get all apps
 * const allApps = await referenceApps.getAll();
 *
 * // Get by ID
 * const app = await referenceApps.getById('uuid-here');
 *
 * // Create new app
 * const newApp = await referenceApps.create({
 *   name: 'Instagram',
 *   category: 'Social',
 * });
 *
 * // Update app
 * const updated = await referenceApps.update('uuid-here', {
 *   name: 'Instagram Updated',
 * });
 *
 * // Delete app
 * const deleted = await referenceApps.delete('uuid-here');
 * ```
 */
export const referenceApps = {
  /**
   * Retrieves all reference apps ordered by creation date (newest first)
   *
   * @returns Result containing array of all reference apps or error
   *
   * @example
   * ```typescript
   * const result = await referenceApps.getAll();
   * if (result.success) {
   *   result.data.forEach(app => console.log(app.name));
   * }
   * ```
   */
  async getAll(): Promise<DbResult<ReferenceAppRow[]>> {
    try {
      const supabase = getTypedSupabaseClient();

      const result = await supabase
        .from('reference_apps')
        .select('*')
        .order('created_at', { ascending: false });
      const { data, error } = asQueryResult<ReferenceAppRow[]>(result);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'reference_apps'),
        };
      }

      // Ensure screenshots is always an array (handle null case)
      const normalizedData = (data ?? []).map(app => ({
        ...app,
        screenshots: app.screenshots ?? [],
      }));

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while fetching reference apps.',
        },
      };
    }
  },

  /**
   * Retrieves a single reference app by its ID
   *
   * @param id - The UUID of the reference app to retrieve
   * @returns Result containing the reference app or error
   *
   * @example
   * ```typescript
   * const result = await referenceApps.getById('123e4567-e89b-12d3-a456-426614174000');
   * if (result.success) {
   *   console.log('Found app:', result.data.name);
   * } else if (result.error.code === 'NOT_FOUND') {
   *   console.log('App not found');
   * }
   * ```
   */
  async getById(id: string): Promise<DbResult<ReferenceAppRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      const result = await supabase
        .from('reference_apps')
        .select('*')
        .eq('id', id)
        .single();
      const { data, error } = asQueryResult<ReferenceAppRow>(result);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'reference_apps'),
        };
      }

      if (!data) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Reference app with ID ${id} not found`,
            userMessage: 'The requested reference app was not found.',
          },
        };
      }

      // Ensure screenshots is always an array (handle null case)
      const normalizedData = {
        ...data,
        screenshots: data.screenshots ?? [],
      };

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while fetching the reference app.',
        },
      };
    }
  },

  /**
   * Creates a new reference app
   *
   * @param data - The data for the new reference app (name and category required)
   * @returns Result containing the created reference app or error
   *
   * @example
   * ```typescript
   * const result = await referenceApps.create({
   *   name: 'Instagram',
   *   category: 'Social',
   *   app_store_url: 'https://apps.apple.com/app/instagram/id389801252',
   *   screenshots: [],
   * });
   *
   * if (result.success) {
   *   console.log('Created app with ID:', result.data.id);
   * }
   * ```
   */
  async create(data: ReferenceAppInsert): Promise<DbResult<ReferenceAppRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      // Ensure screenshots defaults to empty array if not provided
      const insertData: ReferenceAppInsert = {
        ...data,
        screenshots: data.screenshots ?? [],
      };

      const createResult = await supabase
        .from('reference_apps')
        .insert(insertData as any)
        .select()
        .single();
      const { data: created, error } = asQueryResult<ReferenceAppRow>(createResult);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'reference_apps'),
        };
      }

      if (!created) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to create reference app - no data returned',
            userMessage: 'Failed to create the reference app. Please try again.',
          },
        };
      }

      // Ensure screenshots is always an array
      const normalizedData = {
        ...created,
        screenshots: created.screenshots ?? [],
      };

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while creating the reference app.',
        },
      };
    }
  },

  /**
   * Updates an existing reference app
   *
   * @param id - The UUID of the reference app to update
   * @param data - The fields to update (all fields optional)
   * @returns Result containing the updated reference app or error
   *
   * @example
   * ```typescript
   * const result = await referenceApps.update('uuid-here', {
   *   name: 'Instagram Pro',
   *   analysis: { ... },
   * });
   *
   * if (result.success) {
   *   console.log('Updated app:', result.data.name);
   * } else if (result.error.code === 'NOT_FOUND') {
   *   console.log('App not found');
   * }
   * ```
   */
  async update(id: string, data: ReferenceAppUpdate): Promise<DbResult<ReferenceAppRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      // Always set updated_at to current timestamp
      const updateData: ReferenceAppUpdate = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const updateResult = await supabase
        .from('reference_apps')
        // @ts-ignore - Supabase types issue with table inference
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();
      const { data: updated, error } = asQueryResult<ReferenceAppRow>(updateResult);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'reference_apps'),
        };
      }

      if (!updated) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Reference app with ID ${id} not found`,
            userMessage: 'The reference app to update was not found.',
          },
        };
      }

      // Ensure screenshots is always an array
      const normalizedData = {
        ...updated,
        screenshots: updated.screenshots ?? [],
      };

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while updating the reference app.',
        },
      };
    }
  },

  /**
   * Deletes a reference app by its ID
   *
   * Note: This may fail if there are related records (e.g., app_features)
   * that reference this app, depending on database cascade settings.
   *
   * @param id - The UUID of the reference app to delete
   * @returns Result containing the deleted reference app or error
   *
   * @example
   * ```typescript
   * const result = await referenceApps.delete('uuid-here');
   * if (result.success) {
   *   console.log('Deleted app:', result.data.name);
   * } else if (result.error.code === 'FOREIGN_KEY_VIOLATION') {
   *   console.log('Cannot delete: app has related data');
   * }
   * ```
   */
  async delete(id: string): Promise<DbResult<ReferenceAppRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      const deleteResult = await supabase
        .from('reference_apps')
        .delete()
        .eq('id', id)
        .select()
        .single();
      const { data: deleted, error } = asQueryResult<ReferenceAppRow>(deleteResult);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'reference_apps'),
        };
      }

      if (!deleted) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Reference app with ID ${id} not found`,
            userMessage: 'The reference app to delete was not found.',
          },
        };
      }

      // Ensure screenshots is always an array
      const normalizedData = {
        ...deleted,
        screenshots: deleted.screenshots ?? [],
      };

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while deleting the reference app.',
        },
      };
    }
  },

  /**
   * Retrieves reference apps by category
   *
   * @param category - The category to filter by
   * @returns Result containing array of matching reference apps or error
   *
   * @example
   * ```typescript
   * const result = await referenceApps.getByCategory('Social');
   * if (result.success) {
   *   console.log(`Found ${result.data.length} social apps`);
   * }
   * ```
   */
  async getByCategory(category: string): Promise<DbResult<ReferenceAppRow[]>> {
    try {
      const supabase = getTypedSupabaseClient();

      const result = await supabase
        .from('reference_apps')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });
      const { data, error } = asQueryResult<ReferenceAppRow[]>(result);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'reference_apps'),
        };
      }

      // Ensure screenshots is always an array
      const normalizedData = (data ?? []).map(app => ({
        ...app,
        screenshots: app.screenshots ?? [],
      }));

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while fetching reference apps by category.',
        },
      };
    }
  },

  /**
   * Retrieves reference apps that have been analyzed
   *
   * @returns Result containing array of analyzed reference apps or error
   *
   * @example
   * ```typescript
   * const result = await referenceApps.getAnalyzed();
   * if (result.success) {
   *   result.data.forEach(app => {
   *     console.log(`${app.name}: ${app.analysis?.overallStyle}`);
   *   });
   * }
   * ```
   */
  async getAnalyzed(): Promise<DbResult<ReferenceAppRow[]>> {
    try {
      const supabase = getTypedSupabaseClient();

      const result = await supabase
        .from('reference_apps')
        .select('*')
        .not('analysis', 'is', null)
        .order('created_at', { ascending: false });
      const { data, error } = asQueryResult<ReferenceAppRow[]>(result);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'reference_apps'),
        };
      }

      // Ensure screenshots is always an array
      const normalizedData = (data ?? []).map(app => ({
        ...app,
        screenshots: app.screenshots ?? [],
      }));

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while fetching analyzed reference apps.',
        },
      };
    }
  },
};

// ============================================================================
// App Features Operations
// ============================================================================

/**
 * Database operations for the app_features table
 *
 * Provides operations for managing app features extracted from reference apps.
 *
 * @example
 * ```typescript
 * import { appFeatures } from '@/lib/supabase/db';
 *
 * // Get features for an app
 * const features = await appFeatures.getByAppId('app-uuid');
 *
 * // Create multiple features
 * const created = await appFeatures.createMany([
 *   { app_id: 'uuid', feature_name: 'Login', priority: 'core' },
 *   { app_id: 'uuid', feature_name: 'Push Notifications', priority: 'nice-to-have' },
 * ]);
 * ```
 */
export const appFeatures = {
  /**
   * Retrieves all features for a specific reference app
   *
   * @param appId - The UUID of the reference app
   * @returns Result containing array of app features or error
   *
   * @example
   * ```typescript
   * const result = await appFeatures.getByAppId('123e4567-e89b-12d3-a456-426614174000');
   * if (result.success) {
   *   result.data.forEach(feature => console.log(feature.feature_name));
   * }
   * ```
   */
  async getByAppId(appId: string): Promise<DbResult<AppFeatureRow[]>> {
    try {
      const supabase = getTypedSupabaseClient();

      const result = await supabase
        .from('app_features')
        .select('*')
        .eq('app_id', appId)
        .order('created_at', { ascending: true });
      const { data, error } = asQueryResult<AppFeatureRow[]>(result);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'app_features'),
        };
      }

      // Ensure screenshot_indices is always an array
      const normalizedData = (data ?? []).map(feature => ({
        ...feature,
        screenshot_indices: feature.screenshot_indices ?? [],
      }));

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while fetching app features.',
        },
      };
    }
  },

  /**
   * Creates multiple app features in a single operation
   *
   * @param features - Array of feature data to insert
   * @returns Result containing array of created features or error
   *
   * @example
   * ```typescript
   * const result = await appFeatures.createMany([
   *   {
   *     app_id: 'uuid',
   *     feature_name: 'User Authentication',
   *     description: 'Login and registration flow',
   *     priority: 'core',
   *   },
   *   {
   *     app_id: 'uuid',
   *     feature_name: 'Dark Mode',
   *     description: 'Toggle between light and dark themes',
   *     priority: 'nice-to-have',
   *   },
   * ]);
   *
   * if (result.success) {
   *   console.log(`Created ${result.data.length} features`);
   * }
   * ```
   */
  async createMany(features: AppFeatureInsert[]): Promise<DbResult<AppFeatureRow[]>> {
    try {
      if (features.length === 0) {
        return { success: true, data: [] };
      }

      const supabase = getTypedSupabaseClient();

      // Ensure each feature has screenshot_indices default
      const insertData = features.map(feature => ({
        ...feature,
        screenshot_indices: feature.screenshot_indices ?? [],
      }));

      const createResult = await supabase
        .from('app_features')
        .insert(insertData as any)
        .select();
      const { data, error } = asQueryResult<AppFeatureRow[]>(createResult);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'app_features'),
        };
      }

      // Ensure screenshot_indices is always an array
      const normalizedData = (data ?? []).map(feature => ({
        ...feature,
        screenshot_indices: feature.screenshot_indices ?? [],
      }));

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while creating app features.',
        },
      };
    }
  },

  /**
   * Deletes all features for a specific reference app
   *
   * Useful when re-analyzing an app and need to replace all features.
   *
   * @param appId - The UUID of the reference app
   * @returns Result containing count of deleted features or error
   *
   * @example
   * ```typescript
   * const result = await appFeatures.deleteByAppId('uuid');
   * if (result.success) {
   *   console.log(`Deleted ${result.data.count} features`);
   * }
   * ```
   */
  async deleteByAppId(appId: string): Promise<DbResult<{ count: number }>> {
    try {
      const supabase = getTypedSupabaseClient();

      const deleteResult = await supabase
        .from('app_features')
        .delete()
        .eq('app_id', appId)
        .select();
      const { data, error } = asQueryResult<AppFeatureRow[]>(deleteResult);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'app_features'),
        };
      }

      return { success: true, data: { count: data?.length ?? 0 } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while deleting app features.',
        },
      };
    }
  },
};

// ============================================================================
// App Comparisons Operations
// ============================================================================

/**
 * Database operations for the app_comparisons table
 *
 * Provides operations for managing comparison data between multiple apps.
 *
 * @example
 * ```typescript
 * import { appComparisons } from '@/lib/supabase/db';
 *
 * // Create a new comparison
 * const created = await appComparisons.create({
 *   app_ids: ['uuid1', 'uuid2'],
 *   comparison_data: { ... },
 * });
 *
 * // Get all comparisons
 * const all = await appComparisons.getAll();
 * ```
 */
export const appComparisons = {
  /**
   * Creates a new app comparison
   *
   * @param data - The comparison data to insert
   * @returns Result containing the created comparison or error
   *
   * @example
   * ```typescript
   * const result = await appComparisons.create({
   *   app_ids: ['uuid1', 'uuid2', 'uuid3'],
   *   comparison_data: {
   *     id: 'comparison-id',
   *     apps: [...],
   *     comparedAt: new Date().toISOString(),
   *     designPatternComparison: [...],
   *     userFlowComparison: [...],
   *     featureComparison: [...],
   *     colorPaletteComparison: [...],
   *     strengths: [...],
   *     recommendations: [...],
   *   },
   * });
   * ```
   */
  async create(data: AppComparisonInsert): Promise<DbResult<AppComparisonRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      const createResult = await supabase
        .from('app_comparisons')
        .insert(data as any)
        .select()
        .single();
      const { data: created, error } = asQueryResult<AppComparisonRow>(createResult);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'app_comparisons'),
        };
      }

      if (!created) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to create comparison - no data returned',
            userMessage: 'Failed to create the comparison. Please try again.',
          },
        };
      }

      return { success: true, data: created };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while creating the comparison.',
        },
      };
    }
  },

  /**
   * Retrieves a comparison by its ID
   *
   * @param id - The UUID of the comparison
   * @returns Result containing the comparison or error
   *
   * @example
   * ```typescript
   * const result = await appComparisons.getById('uuid');
   * if (result.success) {
   *   console.log('Comparison apps:', result.data.app_ids);
   * }
   * ```
   */
  async getById(id: string): Promise<DbResult<AppComparisonRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      const result = await supabase
        .from('app_comparisons')
        .select('*')
        .eq('id', id)
        .single();
      const { data, error } = asQueryResult<AppComparisonRow>(result);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'app_comparisons'),
        };
      }

      if (!data) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Comparison with ID ${id} not found`,
            userMessage: 'The requested comparison was not found.',
          },
        };
      }

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while fetching the comparison.',
        },
      };
    }
  },

  /**
   * Retrieves all comparisons ordered by creation date (newest first)
   *
   * @returns Result containing array of all comparisons or error
   *
   * @example
   * ```typescript
   * const result = await appComparisons.getAll();
   * if (result.success) {
   *   console.log(`Found ${result.data.length} comparisons`);
   * }
   * ```
   */
  async getAll(): Promise<DbResult<AppComparisonRow[]>> {
    try {
      const supabase = getTypedSupabaseClient();

      const result = await supabase
        .from('app_comparisons')
        .select('*')
        .order('created_at', { ascending: false });
      const { data, error } = asQueryResult<AppComparisonRow[]>(result);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'app_comparisons'),
        };
      }

      return { success: true, data: data ?? [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while fetching comparisons.',
        },
      };
    }
  },

  /**
   * Deletes a comparison by its ID
   *
   * @param id - The UUID of the comparison to delete
   * @returns Result containing the deleted comparison or error
   */
  async delete(id: string): Promise<DbResult<AppComparisonRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      const deleteResult = await supabase
        .from('app_comparisons')
        .delete()
        .eq('id', id)
        .select()
        .single();
      const { data, error } = asQueryResult<AppComparisonRow>(deleteResult);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'app_comparisons'),
        };
      }

      if (!data) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Comparison with ID ${id} not found`,
            userMessage: 'The comparison to delete was not found.',
          },
        };
      }

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while deleting the comparison.',
        },
      };
    }
  },
};

// ============================================================================
// Design Directions Operations
// ============================================================================

/**
 * Database operations for the design_directions table
 *
 * Provides operations for managing AI-generated design directions with voting
 * and selection capabilities.
 *
 * @example
 * ```typescript
 * import { designDirections } from '@/lib/supabase/db';
 *
 * // Create a new design direction
 * const created = await designDirections.create({ ... });
 *
 * // Get all directions for a project
 * const directions = await designDirections.getByProjectId('project-uuid');
 *
 * // Vote for a direction
 * await designDirections.vote('direction-uuid', {
 *   oderId: 'voter-id',
 *   voterName: 'John Doe',
 *   votedAt: new Date().toISOString(),
 *   comment: 'Great design!',
 * });
 *
 * // Select a direction
 * await designDirections.select('direction-uuid', 'project-uuid');
 * ```
 */
export const designDirections = {
  /**
   * Creates a new design direction
   *
   * @param data - The design direction data to insert
   * @returns Result containing the created direction or error
   */
  async create(data: DesignDirectionInsert): Promise<DbResult<DesignDirectionRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      // Set defaults for optional fields
      const insertData: DesignDirectionInsert = {
        ...data,
        mood_keywords: data.mood_keywords ?? [],
        votes: data.votes ?? 0,
        voters: data.voters ?? [],
        is_selected: data.is_selected ?? false,
      };

      const createResult = await supabase
        .from('design_directions')
        .insert(insertData as any)
        .select()
        .single();
      const { data: created, error } = asQueryResult<DesignDirectionRow>(createResult);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'design_directions'),
        };
      }

      if (!created) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to create design direction - no data returned',
            userMessage: 'Failed to create the design direction. Please try again.',
          },
        };
      }

      return { success: true, data: created };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while creating the design direction.',
        },
      };
    }
  },

  /**
   * Retrieves all design directions for a project
   *
   * @param projectId - The UUID of the project
   * @returns Result containing array of design directions or error
   *
   * @example
   * ```typescript
   * const result = await designDirections.getByProjectId('project-uuid');
   * if (result.success) {
   *   result.data.forEach(dir => {
   *     console.log(`${dir.name}: ${dir.votes} votes`);
   *   });
   * }
   * ```
   */
  async getByProjectId(projectId: string): Promise<DbResult<DesignDirectionRow[]>> {
    try {
      const supabase = getTypedSupabaseClient();

      const result = await supabase
        .from('design_directions')
        .select('*')
        .eq('project_id', projectId)
        .order('direction_number', { ascending: true });
      const { data, error } = asQueryResult<DesignDirectionRow[]>(result);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'design_directions'),
        };
      }

      // Ensure arrays are properly initialized
      const normalizedData = (data ?? []).map(dir => ({
        ...dir,
        mood_keywords: dir.mood_keywords ?? [],
        voters: dir.voters ?? [],
      }));

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while fetching design directions.',
        },
      };
    }
  },

  /**
   * Gets a single design direction by ID
   *
   * @param id - The UUID of the design direction
   * @returns Result containing the design direction or error
   */
  async getById(id: string): Promise<DbResult<DesignDirectionRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      const result = await supabase
        .from('design_directions')
        .select('*')
        .eq('id', id)
        .single();
      const { data, error } = asQueryResult<DesignDirectionRow>(result);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'design_directions'),
        };
      }

      if (!data) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Design direction with ID ${id} not found`,
            userMessage: 'The requested design direction was not found.',
          },
        };
      }

      // Ensure arrays are properly initialized
      const normalizedData = {
        ...data,
        mood_keywords: data.mood_keywords ?? [],
        voters: data.voters ?? [],
      };

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while fetching the design direction.',
        },
      };
    }
  },

  /**
   * Adds a vote to a design direction
   *
   * This operation:
   * 1. Adds the vote record to the voters array
   * 2. Increments the votes count
   * 3. Updates the updated_at timestamp
   *
   * @param directionId - The UUID of the design direction to vote for
   * @param voteRecord - The vote record to add
   * @returns Result containing the updated direction or error
   *
   * @example
   * ```typescript
   * const result = await designDirections.vote('direction-uuid', {
   *   oderId: 'user-123',
   *   voterName: 'Jane Smith',
   *   votedAt: new Date().toISOString(),
   *   comment: 'Love the color palette!',
   * });
   *
   * if (result.success) {
   *   console.log(`Now has ${result.data.votes} votes`);
   * }
   * ```
   */
  async vote(directionId: string, voteRecord: VoteRecord): Promise<DbResult<DesignDirectionRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      // First, get the current direction to access voters array
      const fetchResult = await supabase
        .from('design_directions')
        .select('*')
        .eq('id', directionId)
        .single();
      const { data: current, error: fetchError } = asQueryResult<DesignDirectionRow>(fetchResult);

      if (fetchError) {
        return {
          success: false,
          error: createDatabaseError(fetchError, 'design_directions'),
        };
      }

      if (!current) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Design direction with ID ${directionId} not found`,
            userMessage: 'The design direction to vote for was not found.',
          },
        };
      }

      // Check if user has already voted
      const existingVoters = current.voters ?? [];
      const hasAlreadyVoted = existingVoters.some(
        (v: VoteRecord) => v.oderId === voteRecord.oderId
      );

      if (hasAlreadyVoted) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_KEY',
            message: `User ${voteRecord.oderId} has already voted for this direction`,
            userMessage: 'You have already voted for this design direction.',
          },
        };
      }

      // Update with new vote
      const updatedVoters = [...existingVoters, voteRecord];
      const updateVoteResult = await supabase
        .from('design_directions')
        // @ts-ignore - Supabase types issue with table inference
        .update({
          voters: updatedVoters,
          votes: (current?.votes ?? 0) + 1,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', directionId)
        .select()
        .single();
      const { data: updated, error: updateError } = asQueryResult<DesignDirectionRow>(updateVoteResult);

      if (updateError) {
        return {
          success: false,
          error: createDatabaseError(updateError, 'design_directions'),
        };
      }

      if (!updated) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to update vote - no data returned',
            userMessage: 'Failed to record your vote. Please try again.',
          },
        };
      }

      return { success: true, data: updated };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while recording your vote.',
        },
      };
    }
  },

  /**
   * Removes a vote from a design direction
   *
   * @param directionId - The UUID of the design direction
   * @param oderId - The ID of the voter to remove
   * @returns Result containing the updated direction or error
   */
  async removeVote(directionId: string, oderId: string): Promise<DbResult<DesignDirectionRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      // First, get the current direction
      const fetchResult2 = await supabase
        .from('design_directions')
        .select('*')
        .eq('id', directionId)
        .single();
      const { data: current, error: fetchError } = asQueryResult<DesignDirectionRow>(fetchResult2);

      if (fetchError) {
        return {
          success: false,
          error: createDatabaseError(fetchError, 'design_directions'),
        };
      }

      if (!current) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Design direction with ID ${directionId} not found`,
            userMessage: 'The design direction was not found.',
          },
        };
      }

      const existingVoters = current.voters ?? [];
      const voterIndex = existingVoters.findIndex((v: VoteRecord) => v.oderId === oderId);

      if (voterIndex === -1) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Vote from user ${oderId} not found`,
            userMessage: 'Your vote was not found for this direction.',
          },
        };
      }

      // Remove the vote
      const updatedVoters = existingVoters.filter((_: VoteRecord, i: number) => i !== voterIndex);
      const removeVoteResult = await supabase
        .from('design_directions')
        // @ts-ignore - Supabase types issue with table inference
        .update({
          voters: updatedVoters,
          votes: Math.max(0, (current?.votes ?? 0) - 1),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', directionId)
        .select()
        .single();
      const { data: updated, error: updateError } = asQueryResult<DesignDirectionRow>(removeVoteResult);

      if (updateError) {
        return {
          success: false,
          error: createDatabaseError(updateError, 'design_directions'),
        };
      }

      if (!updated) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to remove vote - no data returned',
            userMessage: 'Failed to remove your vote. Please try again.',
          },
        };
      }

      return { success: true, data: updated };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while removing your vote.',
        },
      };
    }
  },

  /**
   * Selects a design direction as the chosen direction for a project
   *
   * This operation:
   * 1. Sets is_selected = false for all other directions in the project
   * 2. Sets is_selected = true for the specified direction
   *
   * @param directionId - The UUID of the design direction to select
   * @param projectId - The UUID of the project (for deselecting others)
   * @returns Result containing the selected direction or error
   *
   * @example
   * ```typescript
   * const result = await designDirections.select('direction-uuid', 'project-uuid');
   * if (result.success) {
   *   console.log(`Selected: ${result.data.name}`);
   * }
   * ```
   */
  async select(directionId: string, projectId: string): Promise<DbResult<DesignDirectionRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      // First, deselect all directions in this project
      const deselectResult = await supabase
        .from('design_directions')
        // @ts-ignore - Supabase types issue with table inference
        .update({
          is_selected: false,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('project_id', projectId);
      const { error: deselectError } = asQueryResult<DesignDirectionRow[]>(deselectResult);

      if (deselectError) {
        return {
          success: false,
          error: createDatabaseError(deselectError, 'design_directions'),
        };
      }

      // Now select the specified direction
      const selectResult = await supabase
        .from('design_directions')
        // @ts-ignore - Supabase types issue with table inference
        .update({
          is_selected: true,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', directionId)
        .select()
        .single();
      const { data: selected, error: selectError } = asQueryResult<DesignDirectionRow>(selectResult);

      if (selectError) {
        return {
          success: false,
          error: createDatabaseError(selectError, 'design_directions'),
        };
      }

      if (!selected) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Design direction with ID ${directionId} not found`,
            userMessage: 'The design direction to select was not found.',
          },
        };
      }

      // Ensure arrays are properly initialized
      const normalizedData = {
        ...selected,
        mood_keywords: selected.mood_keywords ?? [],
        voters: selected.voters ?? [],
      };

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while selecting the design direction.',
        },
      };
    }
  },

  /**
   * Updates a design direction
   *
   * @param id - The UUID of the design direction to update
   * @param data - The fields to update
   * @returns Result containing the updated direction or error
   */
  async update(id: string, data: DesignDirectionUpdate): Promise<DbResult<DesignDirectionRow>> {
    try {
      const supabase = getTypedSupabaseClient();

      const updateData: DesignDirectionUpdate = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const updateResult = await supabase
        .from('design_directions')
        // @ts-ignore - Supabase types issue with table inference
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();
      const { data: updated, error } = asQueryResult<DesignDirectionRow>(updateResult);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'design_directions'),
        };
      }

      if (!updated) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Design direction with ID ${id} not found`,
            userMessage: 'The design direction to update was not found.',
          },
        };
      }

      // Ensure arrays are properly initialized
      const normalizedData = {
        ...updated,
        mood_keywords: updated.mood_keywords ?? [],
        voters: updated.voters ?? [],
      };

      return { success: true, data: normalizedData };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while updating the design direction.',
        },
      };
    }
  },

  /**
   * Deletes all design directions for a project
   *
   * @param projectId - The UUID of the project
   * @returns Result containing count of deleted directions or error
   */
  async deleteByProjectId(projectId: string): Promise<DbResult<{ count: number }>> {
    try {
      const supabase = getTypedSupabaseClient();

      const deleteResult = await supabase
        .from('design_directions')
        .delete()
        .eq('project_id', projectId)
        .select();
      const { data, error } = asQueryResult<DesignDirectionRow[]>(deleteResult);

      if (error) {
        return {
          success: false,
          error: createDatabaseError(error, 'design_directions'),
        };
      }

      return { success: true, data: { count: data?.length ?? 0 } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message,
          userMessage: 'An unexpected error occurred while deleting design directions.',
        },
      };
    }
  },
};

// ============================================================================
// Connection Test Utility
// ============================================================================

/**
 * Tests the Supabase connection by performing a simple query
 *
 * Use this to verify that:
 * - Environment variables are correctly configured
 * - Network connectivity to Supabase is working
 * - Database permissions allow read access
 *
 * @returns Result indicating connection success or failure with details
 *
 * @example
 * ```typescript
 * import { testConnection } from '@/lib/supabase/db';
 *
 * const result = await testConnection();
 * if (result.success) {
 *   console.log('Connected successfully!');
 *   console.log('Response time:', result.data.responseTimeMs, 'ms');
 * } else {
 *   console.error('Connection failed:', result.error.message);
 * }
 * ```
 */
export async function testConnection(): Promise<
  DbResult<{ connected: boolean; responseTimeMs: number; timestamp: string }>
> {
  try {
    const startTime = performance.now();
    const supabase = getTypedSupabaseClient();

    // Perform a simple query to test the connection
    // We use a count query on reference_apps which is lightweight
    const testResult = await supabase
      .from('reference_apps')
      .select('id', { count: 'exact', head: true });
    const { error } = asQueryResult<null>(testResult);

    const endTime = performance.now();
    const responseTimeMs = Math.round(endTime - startTime);

    if (error) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.message,
          userMessage: 'Unable to connect to the database. Please check your configuration.',
          details: error.details,
          hint: error.hint,
        },
      };
    }

    return {
      success: true,
      data: {
        connected: true,
        responseTimeMs,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message,
        userMessage: 'Failed to test the database connection. Please check your configuration.',
      },
    };
  }
}

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Re-export database types for convenience
 */
export type {
  Database,
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
};
