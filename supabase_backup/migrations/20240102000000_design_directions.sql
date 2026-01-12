-- Migration: Design Directions
-- Phase 5 of Mobile Cloner Pipeline
-- Creates table for storing generated design directions with voting support

-- Design Directions Table
-- Stores AI-generated design directions with color palettes, typography, and component patterns
CREATE TABLE IF NOT EXISTS design_directions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  direction_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  mood_keywords TEXT[] DEFAULT '{}',
  color_palette JSONB NOT NULL DEFAULT '{}'::jsonb,
  dark_mode_colors JSONB DEFAULT '{}'::jsonb,
  typography JSONB NOT NULL DEFAULT '{}'::jsonb,
  component_patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
  votes INTEGER NOT NULL DEFAULT 0,
  voters JSONB DEFAULT '[]'::jsonb,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one direction per project can be selected at a time
  -- This is enforced via partial unique index below
  CONSTRAINT valid_votes CHECK (votes >= 0),
  CONSTRAINT valid_direction_number CHECK (direction_number > 0)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_design_directions_project_id ON design_directions(project_id);
CREATE INDEX IF NOT EXISTS idx_design_directions_is_selected ON design_directions(is_selected) WHERE is_selected = true;
CREATE INDEX IF NOT EXISTS idx_design_directions_created_at ON design_directions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_directions_votes ON design_directions(votes DESC);

-- Partial unique index to ensure only one selected direction per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_design_directions_one_selected_per_project
  ON design_directions(project_id)
  WHERE is_selected = true;

-- Composite index for common query pattern: get directions for a project ordered by direction_number
CREATE INDEX IF NOT EXISTS idx_design_directions_project_direction
  ON design_directions(project_id, direction_number);

-- Trigger to auto-update updated_at on design_directions
-- Reuses the update_updated_at_column function from the first migration
DROP TRIGGER IF EXISTS update_design_directions_updated_at ON design_directions;
CREATE TRIGGER update_design_directions_updated_at
  BEFORE UPDATE ON design_directions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on the table
ALTER TABLE design_directions ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (same pattern as other tables)
-- In production, you'd want to scope this to user_id or project ownership
CREATE POLICY "Allow all operations on design_directions"
  ON design_directions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE design_directions IS 'Stores AI-generated design directions for projects';
COMMENT ON COLUMN design_directions.project_id IS 'Reference to the project this direction belongs to';
COMMENT ON COLUMN design_directions.direction_number IS 'Order/number of this direction (1, 2, 3, etc.)';
COMMENT ON COLUMN design_directions.name IS 'Human-readable name for the design direction (e.g., "Modern Minimalist")';
COMMENT ON COLUMN design_directions.description IS 'Detailed description of the design direction';
COMMENT ON COLUMN design_directions.mood_keywords IS 'Array of mood/style keywords describing this direction';
COMMENT ON COLUMN design_directions.color_palette IS 'JSONB object containing the complete color palette (ColorPalette type)';
COMMENT ON COLUMN design_directions.dark_mode_colors IS 'JSONB object containing dark mode color overrides (DarkModeColors type)';
COMMENT ON COLUMN design_directions.typography IS 'JSONB object containing typography settings (Typography type)';
COMMENT ON COLUMN design_directions.component_patterns IS 'JSONB object containing UI component patterns (ComponentPatterns type)';
COMMENT ON COLUMN design_directions.votes IS 'Total number of votes this direction has received';
COMMENT ON COLUMN design_directions.voters IS 'JSONB array of VoteRecord objects tracking who voted';
COMMENT ON COLUMN design_directions.is_selected IS 'Whether this direction was selected as the final choice';
