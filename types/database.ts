/**
 * Supabase Database Types
 *
 * Type definitions matching the Supabase database schema for type-safe queries.
 * These types represent the raw database row formats (snake_case) and can be
 * used with the Supabase client for full type safety.
 *
 * Related migrations:
 * - 20240101000000_reference_app_analyzer.sql
 * - 20240102000000_design_directions.sql
 * - 20240103000000_storage_setup.sql
 */

import type {
  DesignColorPalette,
  DesignDarkModeColors,
  DesignTypography,
  ComponentPatterns,
  VoteRecord
} from './design';
import type {
  AppAnalysis,
  Screenshot,
  AppComparison
} from './analyze';

// ============================================================================
// Database Schema Types (snake_case matching SQL schema)
// ============================================================================

/**
 * Reference Apps Table Row
 * Stores competitor app information and screenshots
 */
export interface ReferenceAppRow {
  id: string;
  name: string;
  category: string;
  app_store_url: string | null;
  play_store_url: string | null;
  screenshots: Screenshot[];
  analysis: AppAnalysis | null;
  report: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * App Features Table Row
 * Stores extracted features from reference apps
 */
export interface AppFeatureRow {
  id: string;
  app_id: string;
  feature_name: string;
  description: string | null;
  ui_pattern: string | null;
  priority: 'core' | 'nice-to-have' | 'differentiator' | null;
  screenshot_indices: number[];
  created_at: string;
}

/**
 * App Comparisons Table Row
 * Stores comparison data between multiple apps
 */
export interface AppComparisonRow {
  id: string;
  app_ids: string[];
  comparison_data: AppComparison;
  created_at: string;
}

/**
 * Design Directions Table Row
 * Stores AI-generated design directions with color palettes, typography, and component patterns
 */
export interface DesignDirectionRow {
  id: string;
  project_id: string;
  direction_number: number;
  name: string;
  description: string | null;
  mood_keywords: string[];
  color_palette: DesignColorPalette;
  dark_mode_colors: DesignDarkModeColors;
  typography: DesignTypography;
  component_patterns: ComponentPatterns;
  votes: number;
  voters: VoteRecord[];
  is_selected: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Insert Types (for creating new records)
// ============================================================================

/**
 * Reference App Insert - fields required/optional for creating a new reference app
 */
export interface ReferenceAppInsert {
  id?: string;
  name: string;
  category: string;
  app_store_url?: string | null;
  play_store_url?: string | null;
  screenshots?: Screenshot[];
  analysis?: AppAnalysis | null;
  report?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * App Feature Insert - fields required/optional for creating a new app feature
 */
export interface AppFeatureInsert {
  id?: string;
  app_id: string;
  feature_name: string;
  description?: string | null;
  ui_pattern?: string | null;
  priority?: 'core' | 'nice-to-have' | 'differentiator' | null;
  screenshot_indices?: number[];
  created_at?: string;
}

/**
 * App Comparison Insert - fields required/optional for creating a new comparison
 */
export interface AppComparisonInsert {
  id?: string;
  app_ids: string[];
  comparison_data: AppComparison;
  created_at?: string;
}

/**
 * Design Direction Insert - fields required/optional for creating a new design direction
 */
export interface DesignDirectionInsert {
  id?: string;
  project_id: string;
  direction_number: number;
  name: string;
  description?: string | null;
  mood_keywords?: string[];
  color_palette: DesignColorPalette;
  dark_mode_colors?: DesignDarkModeColors;
  typography: DesignTypography;
  component_patterns: ComponentPatterns;
  votes?: number;
  voters?: VoteRecord[];
  is_selected?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Update Types (for updating existing records)
// ============================================================================

/**
 * Reference App Update - all fields optional for partial updates
 */
export interface ReferenceAppUpdate {
  name?: string;
  category?: string;
  app_store_url?: string | null;
  play_store_url?: string | null;
  screenshots?: Screenshot[];
  analysis?: AppAnalysis | null;
  report?: string | null;
  updated_at?: string;
}

/**
 * App Feature Update - all fields optional for partial updates
 */
export interface AppFeatureUpdate {
  feature_name?: string;
  description?: string | null;
  ui_pattern?: string | null;
  priority?: 'core' | 'nice-to-have' | 'differentiator' | null;
  screenshot_indices?: number[];
}

/**
 * App Comparison Update - all fields optional for partial updates
 */
export interface AppComparisonUpdate {
  app_ids?: string[];
  comparison_data?: AppComparison;
}

/**
 * Design Direction Update - all fields optional for partial updates
 */
export interface DesignDirectionUpdate {
  project_id?: string;
  direction_number?: number;
  name?: string;
  description?: string | null;
  mood_keywords?: string[];
  color_palette?: DesignColorPalette;
  dark_mode_colors?: DesignDarkModeColors;
  typography?: DesignTypography;
  component_patterns?: ComponentPatterns;
  votes?: number;
  voters?: VoteRecord[];
  is_selected?: boolean;
  updated_at?: string;
}

// ============================================================================
// Database Type Definition (for Supabase client generic)
// ============================================================================

/**
 * Complete database type definition for use with Supabase client
 *
 * Usage:
 * ```typescript
 * import { createClient } from '@supabase/supabase-js';
 * import type { Database } from './types/database';
 *
 * const supabase = createClient<Database>(url, key);
 *
 * // Now queries are fully typed
 * const { data } = await supabase.from('reference_apps').select('*');
 * // data is typed as ReferenceAppRow[] | null
 * ```
 */
export type Database = {
  public: {
    Tables: {
      reference_apps: {
        Row: ReferenceAppRow;
        Insert: ReferenceAppInsert;
        Update: ReferenceAppUpdate;
        Relationships: [];
      };
      app_features: {
        Row: AppFeatureRow;
        Insert: AppFeatureInsert;
        Update: AppFeatureUpdate;
        Relationships: [
          {
            foreignKeyName: 'app_features_app_id_fkey';
            columns: ['app_id'];
            isOneToOne: false;
            referencedRelation: 'reference_apps';
            referencedColumns: ['id'];
          }
        ];
      };
      app_comparisons: {
        Row: AppComparisonRow;
        Insert: AppComparisonInsert;
        Update: AppComparisonUpdate;
        Relationships: [];
      };
      design_directions: {
        Row: DesignDirectionRow;
        Insert: DesignDirectionInsert;
        Update: DesignDirectionUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      feature_priority: 'core' | 'nice-to-have' | 'differentiator';
    };
    CompositeTypes: Record<string, never>;
  };
};

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Storage bucket identifiers
 */
export type StorageBucket = 'screenshots' | 'design-assets';

/**
 * Storage bucket configuration matching the SQL migration
 */
export interface StorageBucketConfig {
  id: StorageBucket;
  name: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

/**
 * Screenshots bucket configuration
 */
export const SCREENSHOTS_BUCKET: StorageBucketConfig = {
  id: 'screenshots',
  name: 'screenshots',
  public: true,
  fileSizeLimit: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

/**
 * Design assets bucket configuration
 */
export const DESIGN_ASSETS_BUCKET: StorageBucketConfig = {
  id: 'design-assets',
  name: 'design-assets',
  public: true,
  fileSizeLimit: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'],
};

// ============================================================================
// Helper Types for Type-Safe Queries
// ============================================================================

/**
 * Table names in the database
 */
export type TableName = keyof Database['public']['Tables'];

/**
 * Get the Row type for a specific table
 */
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

/**
 * Get the Insert type for a specific table
 */
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];

/**
 * Get the Update type for a specific table
 */
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

// ============================================================================
// Utility Types for Mapping
// ============================================================================

/**
 * Mapping utility: snake_case to camelCase field name conversion
 * Used internally by the supabase.ts mapping functions
 */
export type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamel<U>>}`
  : S;

/**
 * Convert snake_case object keys to camelCase
 */
export type SnakeToCamelObject<T> = {
  [K in keyof T as SnakeToCamel<K & string>]: T[K];
};

// ============================================================================
// Note on Re-exports
// ============================================================================

// The design and analyze types (ColorPalette, DarkModeColors, ComponentPatterns,
// VoteRecord, AppAnalysis, Screenshot, AppComparison) are imported from their
// source modules and used in the row types above. Import them directly from
// './design' or './analyze' when needed, or from './index' for the full type set.
