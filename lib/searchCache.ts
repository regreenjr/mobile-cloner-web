/**
 * Search Results Caching Layer
 *
 * Provides in-memory caching for app store search results to reduce API calls
 * and improve response times. This module handles:
 *
 * - In-memory caching with LRU eviction
 * - TTL-based expiration for search results
 * - Cache key generation based on search parameters
 * - Cache statistics and management
 *
 * Search results are cached by query + platform combination to allow
 * fast retrieval for repeated searches.
 *
 * @module lib/searchCache
 */

import type {
  AppSearchResult,
  AppStorePlatform,
  AppStoreSearchParams,
} from '../types/appStore';

// ============================================
// Configuration Constants
// ============================================

/** Maximum number of search result entries in the cache */
const MAX_CACHE_ENTRIES = 100;

/** Default cache TTL in milliseconds (5 minutes) - search results change frequently */
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/** Maximum age for cache entries before they're considered stale (1 hour) */
const MAX_CACHE_AGE_MS = 60 * 60 * 1000;

/** Minimum query length for caching */
const MIN_QUERY_LENGTH = 2;

// ============================================
// Types
// ============================================

/**
 * Configuration options for the search cache
 */
export interface SearchCacheConfig {
  /** Maximum number of entries in memory (default: 100) */
  maxEntries?: number;
  /** Time-to-live for cache entries in ms (default: 5 minutes) */
  ttlMs?: number;
  /** Maximum cache age before forced expiration (default: 1 hour) */
  maxAgeMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * A cached search result entry
 */
export interface SearchCacheEntry {
  /** Unique cache entry ID */
  id: string;
  /** The search query that produced these results */
  query: string;
  /** Platforms searched */
  platforms: AppStorePlatform[];
  /** Country code used for search */
  country: string;
  /** Language code used for search */
  language: string;
  /** iOS search results */
  iosResults: AppSearchResult[];
  /** Android search results */
  androidResults: AppSearchResult[];
  /** Whether iOS search succeeded */
  iosSuccess: boolean;
  /** Whether Android search succeeded */
  androidSuccess: boolean;
  /** iOS error message if failed */
  iosError?: string;
  /** Android error message if failed */
  androidError?: string;
  /** When this entry was created */
  createdAt: string;
  /** When this entry was last accessed */
  lastAccessedAt: string;
  /** Number of times this entry has been accessed */
  accessCount: number;
}

/**
 * Statistics about the cache state
 */
export interface SearchCacheStats {
  /** Number of entries currently in cache */
  entryCount: number;
  /** Total hits since initialization */
  totalHits: number;
  /** Total misses since initialization */
  totalMisses: number;
  /** Hit rate as a percentage (0-100) */
  hitRate: number;
  /** Memory estimate in bytes (approximate) */
  memorySizeEstimate: number;
  /** Oldest entry creation date */
  oldestEntry: string | null;
  /** Most recent entry creation date */
  newestEntry: string | null;
}

/**
 * Result of a cache lookup operation
 */
export interface SearchCacheLookupResult {
  /** Whether a valid cache entry was found */
  hit: boolean;
  /** The cached iOS results (if hit is true) */
  iosResults: AppSearchResult[] | null;
  /** The cached Android results (if hit is true) */
  androidResults: AppSearchResult[] | null;
  /** Whether iOS search was successful (if hit is true) */
  iosSuccess: boolean;
  /** Whether Android search was successful (if hit is true) */
  androidSuccess: boolean;
  /** iOS error message (if hit is true and iosSuccess is false) */
  iosError?: string;
  /** Android error message (if hit is true and androidSuccess is false) */
  androidError?: string;
  /** Cache entry ID (if hit is true) */
  entryId: string | null;
  /** Time taken to perform lookup in ms */
  lookupTimeMs: number;
  /** Reason for cache miss (if hit is false) */
  missReason: SearchCacheMissReason | null;
}

/**
 * Reasons why a cache lookup might miss
 */
export type SearchCacheMissReason =
  | 'NO_CACHE_ENTRY'
  | 'ENTRY_EXPIRED'
  | 'QUERY_TOO_SHORT'
  | 'PLATFORM_MISMATCH';

// ============================================
// In-Memory Cache Storage
// ============================================

/**
 * In-memory cache storage using Map with LRU-like eviction
 */
class InMemorySearchCache {
  private cache: Map<string, SearchCacheEntry> = new Map();
  private accessOrder: string[] = [];
  private config: Required<SearchCacheConfig>;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(config: SearchCacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? MAX_CACHE_ENTRIES,
      ttlMs: config.ttlMs ?? DEFAULT_CACHE_TTL_MS,
      maxAgeMs: config.maxAgeMs ?? MAX_CACHE_AGE_MS,
      debug: config.debug ?? false,
    };
  }

  /**
   * Get an entry from the cache by its key
   */
  get(key: string): SearchCacheEntry | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.log(`Cache miss: ${key}`);
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      this.log(`Cache expired: ${key}`);
      return null;
    }

    // Update access tracking
    this.stats.hits++;
    this.updateAccessOrder(key);
    entry.lastAccessedAt = new Date().toISOString();
    entry.accessCount++;

    this.log(`Cache hit: ${key}`);
    return entry;
  }

  /**
   * Store an entry in the cache
   */
  set(key: string, entry: SearchCacheEntry): void {
    // Evict oldest entries if at capacity
    while (this.cache.size >= this.config.maxEntries) {
      const oldest = this.accessOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
        this.log(`Evicted: ${oldest}`);
      }
    }

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.log(`Cached: ${key}`);
  }

  /**
   * Check if an entry exists (without updating access time)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Remove an entry from the cache
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    this.removeFromAccessOrder(key);
    return existed;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.log('Cache cleared');
  }

  /**
   * Get all entries matching a query pattern
   */
  getByQueryPrefix(queryPrefix: string): SearchCacheEntry[] {
    const entries: SearchCacheEntry[] = [];
    const normalizedPrefix = this.normalizeQuery(queryPrefix);

    this.cache.forEach((entry) => {
      const normalizedQuery = this.normalizeQuery(entry.query);
      if (normalizedQuery.startsWith(normalizedPrefix) && !this.isExpired(entry)) {
        entries.push(entry);
      }
    });

    return entries;
  }

  /**
   * Remove all entries matching a query pattern
   */
  deleteByQueryPrefix(queryPrefix: string): number {
    let count = 0;
    const keysToDelete: string[] = [];
    const normalizedPrefix = this.normalizeQuery(queryPrefix);

    this.cache.forEach((entry, key) => {
      const normalizedQuery = this.normalizeQuery(entry.query);
      if (normalizedQuery.startsWith(normalizedPrefix)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      count++;
    });

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): SearchCacheStats {
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;
    let totalSize = 0;

    this.cache.forEach((entry) => {
      const createdTimestamp = new Date(entry.createdAt).getTime();

      if (oldestTimestamp === null || createdTimestamp < oldestTimestamp) {
        oldestTimestamp = createdTimestamp;
      }
      if (newestTimestamp === null || createdTimestamp > newestTimestamp) {
        newestTimestamp = createdTimestamp;
      }

      // Rough estimate of memory usage
      totalSize += JSON.stringify(entry).length * 2; // UTF-16 chars
    });

    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      entryCount: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      memorySizeEstimate: totalSize,
      oldestEntry: oldestTimestamp !== null ? new Date(oldestTimestamp).toISOString() : null,
      newestEntry: newestTimestamp !== null ? new Date(newestTimestamp).toISOString() : null,
    };
  }

  /**
   * Normalize query string for consistent cache key generation
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim();
  }

  /**
   * Check if an entry has expired
   */
  private isExpired(entry: SearchCacheEntry): boolean {
    const createdAt = new Date(entry.createdAt).getTime();
    const now = Date.now();

    // Check max age (absolute expiration)
    if (now - createdAt > this.config.maxAgeMs) {
      return true;
    }

    // Check TTL from last access
    const lastAccessed = new Date(entry.lastAccessedAt).getTime();
    return now - lastAccessed > this.config.ttlMs;
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order tracking
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[SearchCache] ${message}`);
    }
  }
}

// ============================================
// Search Cache Class
// ============================================

/**
 * Search cache manager that handles caching of app store search results
 *
 * Uses query + platform combination for cache keys to ensure appropriate
 * cache hits for repeated searches.
 *
 * @example
 * ```typescript
 * const cache = new SearchCache({ debug: true });
 *
 * // Try to get cached results
 * const lookup = cache.lookup({ query: 'headspace', platforms: ['ios', 'android'] });
 * if (lookup.hit) {
 *   console.log('Using cached results');
 *   return { ios: lookup.iosResults, android: lookup.androidResults };
 * }
 *
 * // No cache hit, perform search
 * const results = await searchAppStores(params);
 *
 * // Store in cache
 * cache.store(params, results);
 * ```
 */
export class SearchCache {
  private memoryCache: InMemorySearchCache;
  private debug: boolean;

  constructor(config: SearchCacheConfig = {}) {
    this.memoryCache = new InMemorySearchCache(config);
    this.debug = config.debug ?? false;
  }

  // ============================================
  // Cache Lookup Operations
  // ============================================

  /**
   * Look up cached search results for given parameters
   *
   * @param params - The search parameters to look up
   * @returns Cache lookup result
   */
  lookup(params: AppStoreSearchParams): SearchCacheLookupResult {
    const startTime = Date.now();

    // Validate query length
    if (params.query.trim().length < MIN_QUERY_LENGTH) {
      return {
        hit: false,
        iosResults: null,
        androidResults: null,
        iosSuccess: false,
        androidSuccess: false,
        entryId: null,
        lookupTimeMs: Date.now() - startTime,
        missReason: 'QUERY_TOO_SHORT',
      };
    }

    const cacheKey = this.buildCacheKey(params);
    const entry = this.memoryCache.get(cacheKey);

    if (!entry) {
      return {
        hit: false,
        iosResults: null,
        androidResults: null,
        iosSuccess: false,
        androidSuccess: false,
        entryId: null,
        lookupTimeMs: Date.now() - startTime,
        missReason: 'NO_CACHE_ENTRY',
      };
    }

    // Verify platforms match
    const requestedPlatforms = new Set(params.platforms);
    const cachedPlatforms = new Set(entry.platforms);
    const platformsMatch =
      requestedPlatforms.size === cachedPlatforms.size &&
      Array.from(requestedPlatforms).every((p) => cachedPlatforms.has(p));

    if (!platformsMatch) {
      return {
        hit: false,
        iosResults: null,
        androidResults: null,
        iosSuccess: false,
        androidSuccess: false,
        entryId: null,
        lookupTimeMs: Date.now() - startTime,
        missReason: 'PLATFORM_MISMATCH',
      };
    }

    return {
      hit: true,
      iosResults: entry.iosResults,
      androidResults: entry.androidResults,
      iosSuccess: entry.iosSuccess,
      androidSuccess: entry.androidSuccess,
      iosError: entry.iosError,
      androidError: entry.androidError,
      entryId: entry.id,
      lookupTimeMs: Date.now() - startTime,
      missReason: null,
    };
  }

  /**
   * Quick check if a cache entry exists for given parameters
   * Does not update access time
   */
  hasEntry(params: AppStoreSearchParams): boolean {
    if (params.query.trim().length < MIN_QUERY_LENGTH) {
      return false;
    }

    const cacheKey = this.buildCacheKey(params);
    return this.memoryCache.has(cacheKey);
  }

  // ============================================
  // Cache Storage Operations
  // ============================================

  /**
   * Store search results in the cache
   *
   * @param params - The search parameters used
   * @param results - The search results to cache
   * @returns The cache entry ID
   */
  store(
    params: AppStoreSearchParams,
    results: {
      iosResults: AppSearchResult[];
      androidResults: AppSearchResult[];
      iosSuccess: boolean;
      androidSuccess: boolean;
      iosError?: string;
      androidError?: string;
    }
  ): string {
    // Don't cache queries that are too short
    if (params.query.trim().length < MIN_QUERY_LENGTH) {
      this.log(`Query too short to cache: "${params.query}"`);
      return '';
    }

    const entryId = this.generateEntryId();
    const now = new Date().toISOString();

    const entry: SearchCacheEntry = {
      id: entryId,
      query: params.query.trim().toLowerCase(),
      platforms: [...params.platforms],
      country: params.country ?? 'us',
      language: params.language ?? 'en',
      iosResults: results.iosResults,
      androidResults: results.androidResults,
      iosSuccess: results.iosSuccess,
      androidSuccess: results.androidSuccess,
      iosError: results.iosError,
      androidError: results.androidError,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
    };

    const cacheKey = this.buildCacheKey(params);
    this.memoryCache.set(cacheKey, entry);

    this.log(
      `Stored search results for "${params.query}" (${results.iosResults.length} iOS, ${results.androidResults.length} Android)`
    );

    return entryId;
  }

  // ============================================
  // Cache Management
  // ============================================

  /**
   * Invalidate cache entries matching a query prefix
   *
   * @param queryPrefix - The query prefix to match
   * @returns Number of entries invalidated
   */
  invalidateByQuery(queryPrefix: string): number {
    const count = this.memoryCache.deleteByQueryPrefix(queryPrefix);
    this.log(`Invalidated ${count} entries matching "${queryPrefix}"`);
    return count;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.memoryCache.clear();
    this.log('Cleared all cache entries');
  }

  /**
   * Get cache statistics
   */
  getStats(): SearchCacheStats {
    return this.memoryCache.getStats();
  }

  /**
   * Get all cached entries for a query prefix (for debugging/inspection)
   */
  getEntriesForQuery(queryPrefix: string): SearchCacheEntry[] {
    return this.memoryCache.getByQueryPrefix(queryPrefix);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Build a cache key from search parameters
   */
  private buildCacheKey(params: AppStoreSearchParams): string {
    const normalizedQuery = params.query.trim().toLowerCase();
    const platforms = [...params.platforms].sort().join(',');
    const country = params.country ?? 'us';
    const language = params.language ?? 'en';

    return `search:${normalizedQuery}:${platforms}:${country}:${language}`;
  }

  /**
   * Generate a unique entry ID
   */
  private generateEntryId(): string {
    return `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[SearchCache] ${message}`);
    }
  }
}

// ============================================
// App Details Cache (for individual app lookups)
// ============================================

/**
 * Cached app details entry
 */
export interface AppDetailsCacheEntry {
  /** Unique cache entry ID */
  id: string;
  /** The app ID */
  appId: string;
  /** The platform */
  platform: AppStorePlatform;
  /** The cached app details */
  app: AppSearchResult;
  /** When this entry was created */
  createdAt: string;
  /** When this entry was last accessed */
  lastAccessedAt: string;
  /** Number of times this entry has been accessed */
  accessCount: number;
}

/**
 * Cache for individual app details lookups
 * Longer TTL than search results since app details change less frequently
 */
class AppDetailsCache {
  private cache: Map<string, AppDetailsCacheEntry> = new Map();
  private accessOrder: string[] = [];
  private maxEntries: number;
  private ttlMs: number;
  private debug: boolean;
  private stats = { hits: 0, misses: 0 };

  constructor(config: SearchCacheConfig = {}) {
    this.maxEntries = config.maxEntries ?? 200;
    // App details cache has longer TTL (30 minutes)
    this.ttlMs = config.ttlMs ?? 30 * 60 * 1000;
    this.debug = config.debug ?? false;
  }

  /**
   * Get cached app details
   */
  get(appId: string, platform: AppStorePlatform): AppSearchResult | null {
    const key = this.buildKey(appId, platform);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    const lastAccessed = new Date(entry.lastAccessedAt).getTime();
    if (Date.now() - lastAccessed > this.ttlMs) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    this.updateAccessOrder(key);
    entry.lastAccessedAt = new Date().toISOString();
    entry.accessCount++;

    return entry.app;
  }

  /**
   * Store app details in cache
   */
  set(appId: string, platform: AppStorePlatform, app: AppSearchResult): void {
    // Evict oldest if at capacity
    while (this.cache.size >= this.maxEntries) {
      const oldest = this.accessOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }

    const key = this.buildKey(appId, platform);
    const now = new Date().toISOString();

    this.cache.set(key, {
      id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      appId,
      platform,
      app,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
    });

    this.updateAccessOrder(key);

    if (this.debug) {
      console.log(`[AppDetailsCache] Cached: ${appId} (${platform})`);
    }
  }

  /**
   * Check if entry exists
   */
  has(appId: string, platform: AppStorePlatform): boolean {
    const key = this.buildKey(appId, platform);
    const entry = this.cache.get(key);
    if (!entry) return false;

    const lastAccessed = new Date(entry.lastAccessedAt).getTime();
    return Date.now() - lastAccessed <= this.ttlMs;
  }

  /**
   * Remove an entry
   */
  delete(appId: string, platform: AppStorePlatform): boolean {
    const key = this.buildKey(appId, platform);
    const existed = this.cache.delete(key);
    this.removeFromAccessOrder(key);
    return existed;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): { entryCount: number; hits: number; misses: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      entryCount: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
    };
  }

  private buildKey(appId: string, platform: AppStorePlatform): string {
    return `${platform}:${appId}`;
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

// ============================================
// Singleton Instances
// ============================================

/**
 * Default singleton instance of the search cache
 */
let defaultSearchCacheInstance: SearchCache | null = null;

/**
 * Default singleton instance of the app details cache
 */
let defaultAppDetailsCacheInstance: AppDetailsCache | null = null;

/**
 * Get the default search cache instance (singleton)
 * Creates the instance on first call with default configuration
 */
export function getSearchCache(): SearchCache {
  if (!defaultSearchCacheInstance) {
    defaultSearchCacheInstance = new SearchCache({
      debug: process.env.NODE_ENV === 'development',
    });
  }
  return defaultSearchCacheInstance;
}

/**
 * Get the default app details cache instance (singleton)
 */
export function getAppDetailsCache(): AppDetailsCache {
  if (!defaultAppDetailsCacheInstance) {
    defaultAppDetailsCacheInstance = new AppDetailsCache({
      debug: process.env.NODE_ENV === 'development',
    });
  }
  return defaultAppDetailsCacheInstance;
}

/**
 * Reset the default search cache instance (useful for testing)
 */
export function resetSearchCache(): void {
  if (defaultSearchCacheInstance) {
    defaultSearchCacheInstance.clear();
    defaultSearchCacheInstance = null;
  }
}

/**
 * Reset the default app details cache instance (useful for testing)
 */
export function resetAppDetailsCache(): void {
  if (defaultAppDetailsCacheInstance) {
    defaultAppDetailsCacheInstance.clear();
    defaultAppDetailsCacheInstance = null;
  }
}

/**
 * Reset all caches (useful for testing)
 */
export function resetAllSearchCaches(): void {
  resetSearchCache();
  resetAppDetailsCache();
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Quick lookup in the default search cache instance
 */
export function lookupCachedSearch(
  params: AppStoreSearchParams
): SearchCacheLookupResult {
  return getSearchCache().lookup(params);
}

/**
 * Quick store in the default search cache instance
 */
export function storeCachedSearch(
  params: AppStoreSearchParams,
  results: {
    iosResults: AppSearchResult[];
    androidResults: AppSearchResult[];
    iosSuccess: boolean;
    androidSuccess: boolean;
    iosError?: string;
    androidError?: string;
  }
): string {
  return getSearchCache().store(params, results);
}

/**
 * Quick lookup for cached app details
 */
export function lookupCachedAppDetails(
  appId: string,
  platform: AppStorePlatform
): AppSearchResult | null {
  return getAppDetailsCache().get(appId, platform);
}

/**
 * Quick store for app details
 */
export function storeCachedAppDetails(
  appId: string,
  platform: AppStorePlatform,
  app: AppSearchResult
): void {
  getAppDetailsCache().set(appId, platform, app);
}

/**
 * Get combined cache statistics from both caches
 */
export function getAllSearchCacheStats(): {
  searchCache: SearchCacheStats;
  appDetailsCache: { entryCount: number; hits: number; misses: number; hitRate: number };
} {
  return {
    searchCache: getSearchCache().getStats(),
    appDetailsCache: getAppDetailsCache().getStats(),
  };
}

/**
 * Invalidate search cache entries matching a query
 */
export function invalidateSearchCache(queryPrefix: string): number {
  return getSearchCache().invalidateByQuery(queryPrefix);
}

/**
 * Clear all search caches
 */
export function clearAllSearchCaches(): void {
  getSearchCache().clear();
  getAppDetailsCache().clear();
}
