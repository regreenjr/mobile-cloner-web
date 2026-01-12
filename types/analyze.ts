/**
 * Types for Reference App Analyzer (Phase 4)
 * Analyzes competitor apps from screenshots to extract design patterns,
 * user flows, and feature sets.
 */

import type { AppStorePlatform, iOSDeviceType } from './appStore';

// ============================================================================
// Screenshot Source Types
// ============================================================================

/** Source of a screenshot - either manually uploaded or fetched from an app store */
export type ScreenshotSource = 'manual' | 'appstore';

/**
 * Metadata for screenshots sourced from an app store
 */
export interface AppStoreSourceMetadata {
  /** The platform the screenshot was fetched from */
  platform: AppStorePlatform;
  /** Store URL for the source app */
  storeUrl: string;
  /** Bundle/package ID of the source app */
  bundleId: string;
  /** Name of the app in the store */
  appName: string;
  /** Developer/publisher name */
  developer: string;
  /** Device type for iOS screenshots */
  deviceType?: iOSDeviceType;
  /** When the screenshot was fetched from the store */
  fetchedAt: string;
}

// Screenshot data structure
export interface Screenshot {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: string;
  order: number;
  /** Source of the screenshot - defaults to 'manual' for backwards compatibility */
  source: ScreenshotSource;
  /** Additional metadata when source is 'appstore' */
  appStoreMetadata?: AppStoreSourceMetadata;
}

// UI pattern identified in analysis
export interface UIPattern {
  name: string;
  description: string;
  frequency: 'single_screen' | 'multiple_screens' | 'all_screens';
  components: string[];
  screenshotIndices: number[];
}

// User flow identified in analysis
export interface UserFlow {
  name: string;
  description: string;
  stepCount: number;
  screens: string[];
  screenshotIndices: number[];
  complexity: 'simple' | 'moderate' | 'complex';
}

// Feature set categorization
export interface FeatureSet {
  core: string[];
  niceToHave: string[];
  differentiators: string[];
}

// Color palette extracted from screenshots (enhanced with usage context)
export interface ColorPalette {
  // Primary colors with variants
  primary: string;
  primaryLight?: string;
  primaryDark?: string;

  // Secondary colors with variants
  secondary: string;
  secondaryLight?: string;
  secondaryDark?: string;

  // Accent colors
  accent: string;

  // Background colors
  background: string;
  backgroundSecondary?: string;

  // Surface colors
  surface: string;
  surfaceSecondary?: string;

  // Text colors
  text: string;
  textSecondary: string;
  textMuted?: string;

  // Border colors
  border?: string;
  borderLight?: string;

  // Semantic colors
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
}

// Color with usage context (for detailed extraction)
export interface ColorWithContext {
  hex: string;
  rgb?: string;
  role: string;
  usageContext: string;
  description?: string;
}

// Typography information (comprehensive text styles)
export interface AnalysisTypography {
  // Legacy fields (kept for backwards compatibility)
  headingFont: string;
  headingSize: string;
  headingWeight: string;
  bodyFont: string;
  bodySize: string;
  bodyWeight: string;
  captionFont?: string;
  captionSize?: string;

  // Enhanced typography system
  textStyles?: {
    h1?: TextStyle;
    h2?: TextStyle;
    h3?: TextStyle;
    bodyLarge?: TextStyle;
    bodyRegular?: TextStyle;
    bodySmall?: TextStyle;
    buttonText?: TextStyle;
    label?: TextStyle;
    caption?: TextStyle;
  };
}

// Individual text style with exact specifications
export interface TextStyle {
  fontFamily: string;
  fontSize: number; // in points
  fontWeight: string | number;
  lineHeight?: number;
  letterSpacing?: number;
  usage: string; // Description of where/how it's used
}

// Spacing and layout system
export interface SpacingSystem {
  // Screen-level spacing
  screenPadding: {
    horizontal: number; // px
    topSafeArea: number; // px
    bottomSafeArea: number; // px
  };

  // Vertical spacing between sections
  verticalSpacing: {
    small: number; // px
    medium: number; // px
    large: number; // px
  };

  // Component internal padding (commonly used values)
  componentPadding: {
    cards?: number; // px
    buttons?: { vertical: number; horizontal: number }; // px
    listItems?: { vertical: number; horizontal: number }; // px
  };

  // Gap between repeated elements
  elementSpacing: {
    listItemGap?: number; // px
    gridGap?: number; // px
  };
}

// Layout architecture patterns
export interface LayoutArchitecture {
  screenAnatomy: string; // Description of top-to-bottom structure
  bottomCtaTreatment: 'fixed' | 'sticky' | 'inline' | 'none'; // How CTAs are positioned
  safeAreaHandling: string; // How iOS notch/home indicator are handled
  scrollingBehavior: string; // Fixed headers, scroll-to-dismiss, etc.
  contentDensity: 'high' | 'medium' | 'low'; // Spacious vs compact
}

// Detailed component specifications
export interface ComponentInventory {
  buttons?: ButtonSpecs;
  cards?: CardSpecs;
  inputs?: InputSpecs;
  navigation?: NavigationSpecs;
  lists?: ListSpecs;
  modals?: ModalSpecs;
  progressIndicators?: ProgressSpecs;
  other?: string[]; // Other unique components
}

export interface ButtonSpecs {
  primaryButton?: {
    size: string; // e.g., "48px height"
    borderRadius: number; // px
    backgroundColor: string;
    textStyle: string;
    shadow: string | null;
  };
  secondaryButton?: {
    variations: string; // Description of how it differs from primary
  };
  textButton?: {
    treatment: string;
  };
  iconButton?: {
    size: string;
    treatment: string;
  };
}

export interface CardSpecs {
  appearance: {
    background: string;
    border: string | null;
    shadow: string | null;
    borderRadius: number; // px
  };
  padding: number | string; // px or description
  states?: {
    selected?: string;
    pressed?: string;
  };
}

export interface InputSpecs {
  defaultState: {
    border: string;
    background: string;
    textStyle: string;
  };
  focusedState?: {
    treatment: string;
  };
  errorState?: {
    indication: string;
  };
  placeholderStyle?: string;
}

export interface NavigationSpecs {
  header?: {
    height: number; // px
    background: string;
    shadow: string | null;
  };
  backButton?: {
    style: string;
    position: string;
  };
  tabBar?: {
    height: number; // px
    hasIcons: boolean;
    hasLabels: boolean;
  };
}

export interface ListSpecs {
  itemStructure: string; // Layout pattern description
  separatorStyle: 'lines' | 'spacing' | 'none';
  separatorSpacing?: number; // px
}

export interface ModalSpecs {
  backgroundTreatment: string; // Dim level, blur
  cardStyle: {
    size: string;
    position: 'center' | 'bottom' | 'top';
    borderRadius: number; // px
  };
  closeMechanism: string; // X button, swipe, tap outside
}

export interface ProgressSpecs {
  loadingStates: string; // Spinners, skeletons description
  progressBars?: string; // Style if present
}

// Screen analysis from Claude
export interface ScreenAnalysis {
  index: number;
  screenName: string;
  screenType: 'onboarding' | 'home' | 'list' | 'detail' | 'form' | 'settings' | 'profile' | 'modal' | 'other';
  components: string[];
  patterns: string[];
  navigation: string[];
  interactions: string[];
  notes?: string;
}

// Complete analysis result from Gemini (enhanced with Phase 1 fields)
export interface AppAnalysis {
  analyzedAt: string;
  screensAnalyzed: number;
  screens: ScreenAnalysis[];
  designPatterns: UIPattern[];
  userFlows: UserFlow[];
  featureSet: FeatureSet;
  colorPalette: ColorPalette;
  typography: AnalysisTypography;
  overallStyle: string;
  targetAudience: string;
  uniqueSellingPoints: string[];
  improvementOpportunities: string[];

  // Phase 1 enhancements: Core Design System
  spacingSystem?: SpacingSystem;
  layoutArchitecture?: LayoutArchitecture;
  componentInventory?: ComponentInventory;
}

// Feature extracted from app
export interface AppFeature {
  id: string;
  appId: string;
  featureName: string;
  description: string;
  uiPattern: string;
  priority: 'core' | 'nice-to-have' | 'differentiator';
  screenshotIndices: number[];
  createdAt: string;
}

/** Source of a reference app - how the app entry was created */
export type ReferenceAppSource = 'manual' | 'appstore';

/**
 * Metadata for apps sourced from an app store search
 */
export interface ReferenceAppSourceMetadata {
  /** The primary platform used to fetch this app */
  platform: AppStorePlatform;
  /** App store bundle/package ID */
  bundleId: string;
  /** Developer/publisher from the store */
  developer: string;
  /** App rating from the store (0-5) */
  rating?: number;
  /** Number of ratings/reviews */
  ratingCount?: number;
  /** When the app was fetched from the store */
  fetchedAt: string;
}

// Reference app main entity
export interface ReferenceApp {
  id: string;
  name: string;
  category: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  screenshots: Screenshot[];
  analysis: AppAnalysis | null;
  report: string | null;
  features: AppFeature[];
  createdAt: string;
  updatedAt: string;
  /** Source of the reference app - defaults to 'manual' for backwards compatibility */
  source: ReferenceAppSource;
  /** Additional metadata when source is 'appstore' */
  sourceMetadata?: ReferenceAppSourceMetadata;
}

// App comparison data
export interface AppComparisonItem {
  appId: string;
  appName: string;
  category: string;
  screenshotCount: number;
}

export interface ComparisonCategory {
  category: string;
  apps: {
    appId: string;
    appName: string;
    items: string[];
  }[];
}

export interface AppComparison {
  id: string;
  apps: AppComparisonItem[];
  comparedAt: string;
  designPatternComparison: ComparisonCategory[];
  userFlowComparison: ComparisonCategory[];
  featureComparison: {
    category: 'core' | 'niceToHave' | 'differentiators';
    apps: {
      appId: string;
      appName: string;
      features: string[];
    }[];
  }[];
  colorPaletteComparison: {
    appId: string;
    appName: string;
    palette: ColorPalette;
  }[];
  strengths: {
    appId: string;
    appName: string;
    strengths: string[];
  }[];
  recommendations: string[];
}

// Store state types
export interface AnalyzeState {
  referenceApps: ReferenceApp[];
  selectedAppIds: string[];
  currentComparison: AppComparison | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  analysisProgress: number;
  error: string | null;
}

// API result type following the Result pattern from CLAUDE.md
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Upload progress tracking
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

// ScreensDesign.com import
export interface ScreensDesignImport {
  appName: string;
  category: string;
  screenshotUrls: string[];
  sourceUrl: string;
}

// Analysis request
export interface AnalysisRequest {
  appId: string;
  screenshots: Screenshot[];
  options?: {
    extractColors?: boolean;
    extractTypography?: boolean;
    identifyFlows?: boolean;
    extractFeatures?: boolean;
  };
}

// Comparison request
export interface ComparisonRequest {
  appIds: string[];
  includeRecommendations?: boolean;
}

// ============================================
// Analysis Caching Types
// ============================================

/**
 * Checksum data for a single screenshot
 * Used to detect if a screenshot has changed since last analysis
 */
export interface ScreenshotChecksum {
  /** Screenshot ID from the Screenshot type */
  screenshotId: string;
  /** SHA-256 hash of the image data */
  checksum: string;
  /** Image URL at time of checksum generation */
  url: string;
  /** When the checksum was generated */
  generatedAt: string;
}

/**
 * Cache key for uniquely identifying an analysis
 * Combines app ID with checksums to create a unique identifier
 */
export interface AnalysisCacheKey {
  /** Reference app ID */
  appId: string;
  /** Combined checksum of all screenshots (sorted by order) */
  combinedChecksum: string;
  /** Number of screenshots in the analysis */
  screenshotCount: number;
}

/**
 * Cached analysis entry stored in database
 * Stores the full analysis result along with cache metadata
 */
export interface AnalysisCacheEntry {
  /** Unique cache entry ID */
  id: string;
  /** Reference app ID */
  appId: string;
  /** Combined checksum of all screenshots used in analysis */
  combinedChecksum: string;
  /** Individual checksums for each screenshot */
  screenshotChecksums: ScreenshotChecksum[];
  /** The cached analysis result */
  analysis: AppAnalysis;
  /** When the cache entry was created */
  createdAt: string;
  /** When the cache entry was last accessed */
  lastAccessedAt: string;
  /** Number of times this cache entry has been accessed */
  accessCount: number;
}

/**
 * Result of cache validation check
 */
export interface CacheValidationResult {
  /** Whether a valid cache entry exists */
  isValid: boolean;
  /** The cached analysis if valid */
  cachedAnalysis: AppAnalysis | null;
  /** Cache entry ID if found */
  cacheEntryId: string | null;
  /** Reason cache was invalidated (if isValid is false) */
  invalidationReason: CacheInvalidationReason | null;
  /** Screenshots that changed (if any) */
  changedScreenshots: string[];
}

/**
 * Reasons why a cache entry might be invalidated
 */
export type CacheInvalidationReason =
  | 'NO_CACHE_ENTRY'
  | 'CHECKSUM_MISMATCH'
  | 'SCREENSHOT_COUNT_CHANGED'
  | 'SCREENSHOT_ORDER_CHANGED'
  | 'CACHE_EXPIRED'
  | 'FORCE_REFRESH';

// ============================================
// API Error Types
// ============================================

/**
 * Specific error codes for Claude API interactions
 */
export type ClaudeApiErrorCode =
  | 'API_KEY_INVALID'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'RESPONSE_PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'IMAGE_FETCH_ERROR'
  | 'IMAGE_INVALID'
  | 'UNKNOWN_ERROR';

/**
 * Structured error from Claude API operations
 */
export interface ClaudeApiError {
  /** Error code for programmatic handling */
  code: ClaudeApiErrorCode;
  /** Technical error message */
  message: string;
  /** User-friendly error message for display */
  userMessage: string;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Suggested retry delay in milliseconds (if retryable) */
  retryAfterMs?: number;
  /** HTTP status code (if applicable) */
  statusCode?: number;
  /** Original error (if wrapped) */
  originalError?: Error;
}

/**
 * Analysis request with caching options
 */
export interface AnalysisRequestWithCache extends AnalysisRequest {
  /** Skip cache and force a fresh analysis */
  forceRefresh?: boolean;
  /** Callback for cache status updates */
  onCacheStatus?: (status: 'checking' | 'hit' | 'miss' | 'storing') => void;
}

/**
 * Analysis result with cache metadata
 */
export interface AnalysisResultWithCache {
  /** The analysis result */
  analysis: AppAnalysis;
  /** Whether this result came from cache */
  fromCache: boolean;
  /** Cache entry ID (if cached) */
  cacheEntryId: string | null;
  /** When the analysis was performed (original time, not cache access time) */
  analyzedAt: string;
}

/**
 * Retry configuration for API calls
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay between retries in milliseconds */
  initialDelayMs: number;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Jitter factor (0-1) to add randomness to delays */
  jitterFactor: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};
