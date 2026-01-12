/**
 * Design Direction Types
 * Type definitions for the Design Direction Generator feature
 */

import type { Result } from './analyze';

// ============================================================================
// Core Design Direction Types
// ============================================================================

export interface DesignColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface DesignDarkModeColors {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
}

export interface DesignTypography {
  fontFamily: {
    primary: string;
    secondary: string;
    mono: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
  };
  fontWeight: {
    light: string;
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
  letterSpacing: {
    tight: number;
    normal: number;
    wide: number;
  };
}

export interface ComponentPatterns {
  buttons: ButtonPattern;
  cards: CardPattern;
  inputs: InputPattern;
  navigation: NavigationPattern;
  lists: ListPattern;
  modals: ModalPattern;
}

export interface ButtonPattern {
  borderRadius: number;
  paddingHorizontal: number;
  paddingVertical: number;
  variants: ('solid' | 'outline' | 'ghost' | 'link')[];
  sizes: ('sm' | 'md' | 'lg')[];
  hasIcon: boolean;
  hasShadow: boolean;
}

export interface CardPattern {
  borderRadius: number;
  padding: number;
  hasShadow: boolean;
  shadowIntensity: 'subtle' | 'medium' | 'strong';
  hasBorder: boolean;
  hasHoverEffect: boolean;
}

export interface InputPattern {
  borderRadius: number;
  borderStyle: 'solid' | 'none' | 'underline';
  padding: number;
  hasLabel: boolean;
  labelPosition: 'above' | 'floating' | 'inline';
  hasIcon: boolean;
  iconPosition: 'left' | 'right';
}

export interface NavigationPattern {
  style: 'tabs' | 'drawer' | 'bottom-nav' | 'stack';
  hasIcons: boolean;
  iconStyle: 'filled' | 'outlined' | 'duotone';
  activeIndicator: 'underline' | 'background' | 'icon-fill' | 'dot';
}

export interface ListPattern {
  itemSpacing: number;
  hasDividers: boolean;
  dividerStyle: 'full' | 'inset' | 'none';
  hasSwipeActions: boolean;
  avatarStyle: 'circle' | 'rounded' | 'square';
}

export interface ModalPattern {
  borderRadius: number;
  hasOverlay: boolean;
  overlayOpacity: number;
  animationType: 'fade' | 'slide' | 'scale';
  position: 'center' | 'bottom' | 'top';
}

// ============================================================================
// Design Direction Entity
// ============================================================================

export interface DesignDirection {
  id: string;
  projectId: string;
  directionNumber: number;
  name: string;
  description: string;
  moodKeywords: string[];
  colorPalette: DesignColorPalette;
  darkModeColors: DesignDarkModeColors;
  typography: DesignTypography;
  componentPatterns: ComponentPatterns;
  votes: number;
  voters: VoteRecord[];
  isSelected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoteRecord {
  oderId: string;
  voterName: string;
  votedAt: string;
  comment?: string;
}

// ============================================================================
// Reference App Analysis Input Types (from Phase 4)
// ============================================================================

export interface ReferenceAppAnalysis {
  id: string;
  appName: string;
  category: string;
  screenshots: string[];
  designPatterns: ExtractedDesignPatterns;
  userFlows: ExtractedUserFlow[];
  featureSets: ExtractedFeature[];
  colorInsights: ColorInsights;
  typographyData: TypographyData;
  componentInventory: ComponentUsageStats[];
  overallStyle: StyleInsights;
}

export interface ExtractedDesignPatterns {
  layoutPatterns: string[];
  interactionPatterns: string[];
  visualHierarchy: string[];
  whitespaceUsage: 'minimal' | 'balanced' | 'generous';
  contentDensity: 'high' | 'medium' | 'low';
}

export interface ExtractedUserFlow {
  flowName: string;
  steps: string[];
  keyScreens: string[];
}

export interface ExtractedFeature {
  name: string;
  description: string;
  uiPattern: string;
  priority: 'core' | 'nice-to-have' | 'differentiator';
}

export interface ColorInsights {
  dominantColors: string[];
  accentColors: string[];
  backgroundColors: string[];
  colorTemperature: 'warm' | 'cool' | 'neutral';
  colorSaturation: 'vibrant' | 'muted' | 'mixed';
  colorContrast: 'high' | 'medium' | 'low';
}

export interface TypographyData {
  primaryFonts: string[];
  headingStyle: string;
  bodyStyle: string;
  sizeHierarchy: 'compact' | 'standard' | 'spacious';
  weightUsage: string[];
}

export interface ComponentUsageStats {
  componentType: string;
  count: number;
  variations: string[];
  commonPatterns: string[];
}

export interface StyleInsights {
  overallAesthetic: string;
  moodDescriptors: string[];
  targetAudience: string;
  industryTrends: string[];
}

// ============================================================================
// Design Tokens Export Types
// ============================================================================

export interface DesignTokens {
  $schema: string;
  version: string;
  generatedAt: string;
  directionName: string;
  colors: DesignTokenCategory;
  typography: DesignTokenCategory;
  spacing: DesignTokenCategory;
  borderRadius: DesignTokenCategory;
  shadows: DesignTokenCategory;
  components: ComponentTokens;
}

export interface DesignTokenCategory {
  [key: string]: DesignToken;
}

export interface DesignToken {
  $value: string | number;
  $type: 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'number' | 'shadow';
  $description?: string;
}

export interface ComponentTokens {
  button: DesignTokenCategory;
  card: DesignTokenCategory;
  input: DesignTokenCategory;
}

// ============================================================================
// Generation Request/Response Types
// ============================================================================

export interface GenerateDirectionsRequest {
  projectId: string;
  referenceAnalyses: ReferenceAppAnalysis[];
  preferences?: DesignPreferences;
}

export interface DesignPreferences {
  moodKeywords?: string[];
  avoidKeywords?: string[];
  preferredColorTemperature?: 'warm' | 'cool' | 'neutral';
  accessibilityLevel?: 'AA' | 'AAA';
}

export interface GenerateDirectionsResponse {
  success: boolean;
  directions: DesignDirection[];
  generationMetadata: {
    modelUsed: string;
    processingTimeMs: number;
    inputAnalysesCount: number;
  };
}

// ============================================================================
// Voting Types
// ============================================================================

export interface CastVoteRequest {
  directionId: string;
  oderId: string;
  voterName: string;
  comment?: string;
}

export interface VotingResult {
  directionId: string;
  directionName: string;
  totalVotes: number;
  voterNames: string[];
  percentage: number;
}

// ============================================================================
// Store State Types
// ============================================================================

export interface DesignState {
  // State
  directions: DesignDirection[];
  selectedDirection: DesignDirection | null;
  isGenerating: boolean;
  isExporting: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  votingSessionId: string | null;
  currentProjectId: string | null;

  // Actions
  generateDirections: (request: GenerateDirectionsRequest) => Promise<Result<DesignDirection[]>>;
  loadDirections: (projectId: string) => Promise<Result<DesignDirection[]>>;
  selectDirection: (directionId: string) => Promise<Result<void>>;
  castVote: (request: CastVoteRequest) => Promise<Result<void>>;
  removeVote: (directionId: string, oderId: string) => Promise<Result<void>>;
  exportDesignTokens: (directionId: string) => Promise<Result<DesignTokens>>;
  resetDirections: () => Promise<Result<void>>;
  setError: (error: string | null) => void;

  // Computed
  getVotingResults: () => VotingResult[];
  getWinningDirection: () => DesignDirection | null;
}
