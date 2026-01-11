/**
 * Types for App Store Screenshot Fetching
 * Supports fetching screenshots from iOS App Store (iTunes API) and Google Play Store
 */

// ============================================================================
// Enums and Constants
// ============================================================================

/** Supported app store platforms */
export type AppStorePlatform = 'ios' | 'android';

/** Device types for iOS screenshots */
export type iOSDeviceType = 'iphone' | 'ipad';

/** Screenshot orientation */
export type ScreenshotOrientation = 'portrait' | 'landscape';

// ============================================================================
// iTunes Search API Types (iOS App Store)
// ============================================================================

/**
 * Response from iTunes Search API
 * @see https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */
export interface iTunesSearchResponse {
  resultCount: number;
  results: iTunesAppResult[];
}

/**
 * Single app result from iTunes Search API
 * Contains only the fields we need for screenshot fetching
 */
export interface iTunesAppResult {
  /** Unique app identifier (numeric) */
  trackId: number;
  /** App name */
  trackName: string;
  /** Bundle identifier (e.g., com.headspace.headspace) */
  bundleId: string;
  /** Developer/seller name */
  artistName: string;
  /** App Store URL */
  trackViewUrl: string;
  /** App icon URL (100x100) */
  artworkUrl100: string;
  /** App icon URL (512x512) */
  artworkUrl512?: string;
  /** Primary genre/category */
  primaryGenreName: string;
  /** All genre names */
  genres: string[];
  /** Average user rating */
  averageUserRating?: number;
  /** Number of ratings */
  userRatingCount?: number;
  /** App description */
  description?: string;
  /** App version */
  version?: string;
  /** Release date */
  releaseDate?: string;
  /** Current version release date */
  currentVersionReleaseDate?: string;

  // Screenshot URLs - these are what we're after
  /** iPhone screenshot URLs */
  screenshotUrls: string[];
  /** iPad screenshot URLs */
  ipadScreenshotUrls: string[];
  /** Apple TV screenshot URLs (usually not needed) */
  appletvScreenshotUrls?: string[];
}

// ============================================================================
// Google Play Store Types
// ============================================================================

/**
 * App result from Google Play Store
 * Based on google-play-scraper package structure
 */
export interface PlayStoreAppResult {
  /** Package name (e.g., com.getsomeheadspace.android) */
  appId: string;
  /** App name */
  title: string;
  /** Developer name */
  developer: string;
  /** Developer ID */
  developerId?: string;
  /** Play Store URL */
  url: string;
  /** App icon URL */
  icon: string;
  /** App category */
  genre: string;
  /** Category ID */
  genreId?: string;
  /** Average rating (0-5) */
  score?: number;
  /** Number of ratings */
  ratings?: number;
  /** Number of reviews */
  reviews?: number;
  /** Price (0 for free apps) */
  price?: number;
  /** Whether the app is free */
  free?: boolean;
  /** App description */
  description?: string;
  /** Short description */
  summary?: string;
  /** App version */
  version?: string;
  /** Last updated date */
  updated?: string;

  /** Screenshot URLs */
  screenshots: string[];
}

/**
 * Search options for Google Play Store
 */
export interface PlayStoreSearchOptions {
  /** Search query */
  term: string;
  /** Number of results to return */
  num?: number;
  /** Language code (e.g., 'en') */
  lang?: string;
  /** Country code (e.g., 'us') */
  country?: string;
  /** Price filter */
  price?: 'all' | 'free' | 'paid';
}

// ============================================================================
// Unified App Store Types
// ============================================================================

/**
 * Screenshot metadata with source tracking
 */
export interface AppStoreScreenshot {
  /** Unique identifier for this screenshot */
  id: string;
  /** URL to the screenshot image */
  url: string;
  /** Source platform */
  platform: AppStorePlatform;
  /** Device type (for iOS) */
  deviceType?: iOSDeviceType;
  /** Screenshot orientation (inferred from dimensions if available) */
  orientation?: ScreenshotOrientation;
  /** Order/index in the original listing */
  order: number;
  /** Image width (if available) */
  width?: number;
  /** Image height (if available) */
  height?: number;
  /** Whether this screenshot is selected for import */
  selected: boolean;
}

/**
 * Unified app search result from any store
 */
export interface AppSearchResult {
  /** Unique identifier (trackId for iOS, appId for Android) */
  id: string;
  /** App name */
  name: string;
  /** Developer/publisher name */
  developer: string;
  /** Source platform */
  platform: AppStorePlatform;
  /** App icon URL */
  iconUrl: string;
  /** Primary category/genre */
  category: string;
  /** Store URL */
  storeUrl: string;
  /** Average rating (normalized to 0-5) */
  rating?: number;
  /** Number of ratings/reviews */
  ratingCount?: number;
  /** Bundle/package ID */
  bundleId: string;
  /** Available screenshots */
  screenshots: AppStoreScreenshot[];
  /** Raw response data for reference */
  _raw?: iTunesAppResult | PlayStoreAppResult;
}

/**
 * Combined search results from multiple stores
 */
export interface CombinedSearchResults {
  /** Search query used */
  query: string;
  /** Results from iOS App Store */
  ios: AppSearchResult[];
  /** Results from Google Play Store */
  android: AppSearchResult[];
  /** Whether iOS search completed successfully */
  iosSuccess: boolean;
  /** Whether Android search completed successfully */
  androidSuccess: boolean;
  /** Error message for iOS (if failed) */
  iosError?: string;
  /** Error message for Android (if failed) */
  androidError?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Search parameters for app store queries
 */
export interface AppStoreSearchParams {
  /** Search term/app name */
  query: string;
  /** Which platforms to search */
  platforms: AppStorePlatform[];
  /** Maximum results per platform */
  limit?: number;
  /** Country code for store (default: 'us') */
  country?: string;
  /** Language code (default: 'en') */
  language?: string;
}

/**
 * State for app store search UI
 */
export interface AppStoreSearchState {
  /** Current search query */
  query: string;
  /** Whether a search is in progress */
  isSearching: boolean;
  /** Search results */
  results: CombinedSearchResults | null;
  /** Currently selected app for screenshot preview */
  selectedApp: AppSearchResult | null;
  /** Screenshots from selected app with selection state */
  previewScreenshots: AppStoreScreenshot[];
  /** Whether screenshots are being fetched/processed */
  isFetchingScreenshots: boolean;
  /** Error state */
  error: string | null;
}

// ============================================================================
// Import Types
// ============================================================================

/**
 * Data for importing screenshots from app store
 */
export interface AppStoreImportData {
  /** Source app information */
  sourceApp: {
    name: string;
    developer: string;
    platform: AppStorePlatform;
    storeUrl: string;
    bundleId: string;
  };
  /** Screenshots to import */
  screenshots: AppStoreScreenshot[];
}

/**
 * Result of importing screenshots from app store
 */
export interface AppStoreImportResult {
  /** Number of screenshots successfully imported */
  successCount: number;
  /** Number of screenshots that failed to import */
  failedCount: number;
  /** IDs of successfully imported screenshots */
  importedIds: string[];
  /** Errors for failed imports */
  errors: {
    screenshotId: string;
    error: string;
  }[];
}

// ============================================================================
// Error Types
// ============================================================================

/** App store API error codes */
export type AppStoreErrorCode =
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'NO_RESULTS'
  | 'INVALID_QUERY'
  | 'STORE_UNAVAILABLE'
  | 'CORS_ERROR'
  | 'PARSE_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Structured error for app store operations
 */
export interface AppStoreError {
  code: AppStoreErrorCode;
  message: string;
  platform?: AppStorePlatform;
  retryable: boolean;
  retryAfterMs?: number;
}
