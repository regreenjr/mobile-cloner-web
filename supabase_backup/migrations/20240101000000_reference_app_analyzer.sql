-- Migration: Reference App Analyzer
-- Phase 4 of Mobile Cloner Pipeline
-- Creates tables for storing reference apps, features, and comparisons

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reference Apps Table
-- Stores competitor app information and screenshots
CREATE TABLE IF NOT EXISTS reference_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  app_store_url TEXT,
  play_store_url TEXT,
  screenshots JSONB DEFAULT '[]'::jsonb,
  analysis JSONB,
  report TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Features Table
-- Stores extracted features from reference apps
CREATE TABLE IF NOT EXISTS app_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES reference_apps(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  description TEXT,
  ui_pattern TEXT,
  priority TEXT CHECK (priority IN ('core', 'nice-to-have', 'differentiator')),
  screenshot_indices INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Comparisons Table
-- Stores comparison data between multiple apps
CREATE TABLE IF NOT EXISTS app_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_ids UUID[] NOT NULL,
  comparison_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance

-- Reference Apps indexes
CREATE INDEX IF NOT EXISTS idx_reference_apps_category ON reference_apps(category);
CREATE INDEX IF NOT EXISTS idx_reference_apps_created_at ON reference_apps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reference_apps_name ON reference_apps(name);
-- GIN index for full-text search on name (useful for typeahead/search)
CREATE INDEX IF NOT EXISTS idx_reference_apps_name_gin ON reference_apps USING GIN(to_tsvector('english', name));
-- Index on updated_at for recently modified queries
CREATE INDEX IF NOT EXISTS idx_reference_apps_updated_at ON reference_apps(updated_at DESC);
-- Composite index for common query: category + created_at (for filtered listings)
CREATE INDEX IF NOT EXISTS idx_reference_apps_category_created ON reference_apps(category, created_at DESC);

-- App Features indexes
CREATE INDEX IF NOT EXISTS idx_app_features_app_id ON app_features(app_id);
CREATE INDEX IF NOT EXISTS idx_app_features_priority ON app_features(priority);
CREATE INDEX IF NOT EXISTS idx_app_features_created_at ON app_features(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_features_feature_name ON app_features(feature_name);
-- Composite index for common query: app_id + priority (for filtered feature lists)
CREATE INDEX IF NOT EXISTS idx_app_features_app_priority ON app_features(app_id, priority);
-- Composite index for listing features by app ordered by creation
CREATE INDEX IF NOT EXISTS idx_app_features_app_created ON app_features(app_id, created_at DESC);

-- App Comparisons indexes
CREATE INDEX IF NOT EXISTS idx_app_comparisons_app_ids ON app_comparisons USING GIN(app_ids);
CREATE INDEX IF NOT EXISTS idx_app_comparisons_created_at ON app_comparisons(created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on reference_apps
DROP TRIGGER IF EXISTS update_reference_apps_updated_at ON reference_apps;
CREATE TRIGGER update_reference_apps_updated_at
  BEFORE UPDATE ON reference_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE reference_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_comparisons ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Current implementation: Open access for all operations
-- Future enhancement: Add user_id column and scope policies to authenticated users
--
-- To migrate to user-scoped policies:
-- 1. Add user_id UUID REFERENCES auth.users(id) column to each table
-- 2. Replace policies below with user-scoped versions
-- 3. Example: USING (auth.uid() = user_id)
-- ============================================================================

-- Reference Apps Policies
-- Granular policies for better auditability and future extensibility

CREATE POLICY "reference_apps_select_policy"
  ON reference_apps
  FOR SELECT
  USING (true);

CREATE POLICY "reference_apps_insert_policy"
  ON reference_apps
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "reference_apps_update_policy"
  ON reference_apps
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "reference_apps_delete_policy"
  ON reference_apps
  FOR DELETE
  USING (true);

-- App Features Policies
-- Follows same pattern - ready for user_id scoping

CREATE POLICY "app_features_select_policy"
  ON app_features
  FOR SELECT
  USING (true);

CREATE POLICY "app_features_insert_policy"
  ON app_features
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "app_features_update_policy"
  ON app_features
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "app_features_delete_policy"
  ON app_features
  FOR DELETE
  USING (true);

-- App Comparisons Policies
-- Follows same pattern - ready for user_id scoping

CREATE POLICY "app_comparisons_select_policy"
  ON app_comparisons
  FOR SELECT
  USING (true);

CREATE POLICY "app_comparisons_insert_policy"
  ON app_comparisons
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "app_comparisons_update_policy"
  ON app_comparisons
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "app_comparisons_delete_policy"
  ON app_comparisons
  FOR DELETE
  USING (true);

-- Storage bucket for screenshots
-- Note: Run this in the Supabase dashboard or via the Storage API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('screenshots', 'screenshots', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for screenshots bucket
-- These need to be created via the Supabase dashboard or CLI
-- Policy: Allow public read access
-- Policy: Allow authenticated users to upload
-- Policy: Allow authenticated users to delete their uploads

-- Comments for documentation
COMMENT ON TABLE reference_apps IS 'Stores competitor apps for design analysis';
COMMENT ON TABLE app_features IS 'Stores extracted features from analyzed apps';
COMMENT ON TABLE app_comparisons IS 'Stores comparison data between multiple apps';

COMMENT ON COLUMN reference_apps.screenshots IS 'Array of screenshot objects with id, url, caption, order';
COMMENT ON COLUMN reference_apps.analysis IS 'Structured analysis JSON from Claude';
COMMENT ON COLUMN reference_apps.report IS 'Generated markdown report';
COMMENT ON COLUMN app_features.priority IS 'Feature priority: core, nice-to-have, or differentiator';
COMMENT ON COLUMN app_features.screenshot_indices IS 'Array of screenshot indices where feature appears';
