-- Migration: Storage Bucket Setup
-- Creates storage bucket for screenshots with appropriate policies
-- Part of Mobile Cloner Pipeline persistent storage setup

-- ============================================================================
-- STORAGE BUCKET SETUP
-- ============================================================================
-- Note: Supabase storage buckets are managed through the storage schema
-- The bucket will be created if it doesn't exist

-- Create the screenshots bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  true,  -- Public bucket for read access
  5242880,  -- 5MB file size limit (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================
-- Current implementation: Open access for all operations
-- Future enhancement: Scope policies to authenticated users
--
-- File path convention: reference-apps/{app_id}/{timestamp}-{filename}
-- ============================================================================

-- Drop existing policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "screenshots_public_read" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_delete_policy" ON storage.objects;

-- Policy: Allow public read access to all screenshots
-- This enables public URL access without authentication
CREATE POLICY "screenshots_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'screenshots');

-- Policy: Allow uploads to the screenshots bucket
-- Currently allows all uploads; can be scoped to authenticated users later
-- Example for auth: (auth.role() = 'authenticated')
CREATE POLICY "screenshots_insert_policy"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'screenshots');

-- Policy: Allow updates to files in the screenshots bucket
-- Useful for replacing/updating existing screenshots
CREATE POLICY "screenshots_update_policy"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'screenshots')
  WITH CHECK (bucket_id = 'screenshots');

-- Policy: Allow deletion of files in the screenshots bucket
-- Enables cleanup when reference apps are deleted
CREATE POLICY "screenshots_delete_policy"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'screenshots');

-- ============================================================================
-- ADDITIONAL STORAGE CONFIGURATION
-- ============================================================================

-- Create a design-assets bucket for future design direction assets
-- (logos, mood boards, generated images, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-assets',
  'design-assets',
  true,  -- Public bucket for read access
  10485760,  -- 10MB file size limit for design assets
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies for design-assets bucket (follows same pattern)
DROP POLICY IF EXISTS "design_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "design_assets_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "design_assets_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "design_assets_delete_policy" ON storage.objects;

CREATE POLICY "design_assets_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'design-assets');

CREATE POLICY "design_assets_insert_policy"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'design-assets');

CREATE POLICY "design_assets_update_policy"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'design-assets')
  WITH CHECK (bucket_id = 'design-assets');

CREATE POLICY "design_assets_delete_policy"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'design-assets');

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN storage.buckets.id IS 'Bucket identifier used in storage operations';

-- Note: The following comments describe the bucket usage but cannot be attached
-- directly to storage.buckets rows. Documented here for reference:
--
-- screenshots bucket:
--   Purpose: Store reference app screenshots for analysis
--   Path convention: reference-apps/{app_id}/{timestamp}-{filename}
--   Supported formats: JPEG, PNG, WebP, GIF
--   Max file size: 5MB
--   Public access: Yes (for displaying in UI)
--
-- design-assets bucket:
--   Purpose: Store design direction assets (mood boards, generated images, exports)
--   Path convention: design-directions/{direction_id}/{asset_type}/{filename}
--   Supported formats: JPEG, PNG, WebP, GIF, SVG, PDF
--   Max file size: 10MB
--   Public access: Yes (for displaying in UI and exports)
