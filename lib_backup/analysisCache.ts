/**
 * Analysis Caching Layer
 *
 * Provides caching for Claude API analysis results using checksum-based
 * cache invalidation. This module handles:
 *
 * - In-memory caching for fast lookups
 * - Cache key generation based on screenshot checksums
 * - Cache validation and invalidation
 * - Cache statistics and management
 *
 * The caching strategy uses SHA-256 checksums of screenshot image data
 * to detect when screenshots have changed. This ensures cached results
 * are only returned when the input images are identical.
 *
 * @module lib/analysisCache
 */

import type {
  AppAnalysis,
  Screenshot,
  ScreenshotChecksum,
  AnalysisCacheKey,
  AnalysisCacheEntry,
  CacheValidationResult,
  CacheInvalidationReason,
  Result,
} from '../types/analyze';
import {
  generateScreenshotChecksums,
  generateCombinedChecksum,
  generateAnalysisCacheKey,
  compareChecksums,
  type BulkChecksumResult,
  type ImageChecksumError,
} from './imageUtils';

// ============================================
// Configuration Constants
// ============================================

/** Maximum number of entries in the in-memory cache */
const MAX_CACHE_ENTRIES = 50;

/** Default cache TTL in milliseconds (7 days) */
const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Maximum age for cache entries before they're considered stale (30 days) */
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// ============================================
// Types
// ============================================

/**
 * Configuration options for the analysis cache
 */
export interface AnalysisCacheConfig {
  /** Maximum number of entries in memory (default: 50) */
  maxEntries?: number;
  /** Time-to-live for cache entries in ms (default: 7 days) */
  ttlMs?: number;
  /** Maximum cache age before forced expiration (default: 30 days) */
  maxAgeMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Statistics about the cache state
 */
export interface CacheStats {
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
export interface CacheLookupResult {
  /** Whether a valid cache entry was found */
  hit: boolean;
  /** The cached analysis (if hit is true) */
  analysis: AppAnalysis | null;
  /** Cache entry ID (if hit is true) */
  entryId: string | null;
  /** Time taken to perform lookup in ms */
  lookupTimeMs: number;
  /** Reason for cache miss (if hit is false) */
  missReason: CacheInvalidationReason | null;
}

/**
 * Options for cache operations
 */
export interface CacheOperationOptions {
  /** Skip checksum validation (use stored checksums) */
  skipChecksumValidation?: boolean;
  /** Progress callback for checksum generation */
  onProgress?: (progress: number) => void;
}

// ============================================
// In-Memory Cache Storage
// ============================================

/**
 * In-memory cache storage using Map with LRU-like eviction
 */
class InMemoryCache {
  private cache: Map<string, AnalysisCacheEntry> = new Map();
  private accessOrder: string[] = [];
  private config: Required<AnalysisCacheConfig>;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(config: AnalysisCacheConfig = {}) {
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
  get(key: string): AnalysisCacheEntry | null {
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
  set(key: string, entry: AnalysisCacheEntry): void {
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
   * Get all entries for a specific app ID
   */
  getByAppId(appId: string): AnalysisCacheEntry[] {
    const entries: AnalysisCacheEntry[] = [];
    this.cache.forEach((entry) => {
      if (entry.appId === appId && !this.isExpired(entry)) {
        entries.push(entry);
      }
    });
    return entries;
  }

  /**
   * Remove all entries for a specific app ID
   */
  deleteByAppId(appId: string): number {
    let count = 0;
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.appId === appId) {
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
  getStats(): CacheStats {
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
   * Check if an entry has expired
   */
  private isExpired(entry: AnalysisCacheEntry): boolean {
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
      console.log(`[AnalysisCache] ${message}`);
    }
  }
}

// ============================================
// Analysis Cache Class
// ============================================

/**
 * Analysis cache manager that handles caching of Claude API analysis results
 *
 * Uses checksum-based invalidation to ensure cached results are only returned
 * when the input screenshots are identical to those used for the cached analysis.
 *
 * @example
 * ```typescript
 * const cache = new AnalysisCache({ debug: true });
 *
 * // Try to get cached analysis
 * const lookup = await cache.lookup(appId, screenshots);
 * if (lookup.hit) {
 *   console.log('Using cached analysis');
 *   return lookup.analysis;
 * }
 *
 * // No cache hit, perform analysis
 * const analysis = await analyzeAppScreenshots(appName, screenshots);
 *
 * // Store in cache
 * await cache.store(appId, screenshots, analysis);
 * ```
 */
export class AnalysisCache {
  private memoryCache: InMemoryCache;
  private debug: boolean;

  constructor(config: AnalysisCacheConfig = {}) {
    this.memoryCache = new InMemoryCache(config);
    this.debug = config.debug ?? false;
  }

  // ============================================
  // Cache Lookup Operations
  // ============================================

  /**
   * Look up a cached analysis for an app's screenshots
   *
   * This method:
   * 1. Generates checksums for the provided screenshots
   * 2. Creates a cache key from the checksums
   * 3. Looks up the cache entry
   * 4. Validates that checksums match (if entry exists)
   *
   * @param appId - The reference app ID
   * @param screenshots - The screenshots to look up
   * @param options - Lookup options
   * @returns Cache lookup result
   */
  async lookup(
    appId: string,
    screenshots: Screenshot[],
    options: CacheOperationOptions = {}
  ): Promise<CacheLookupResult> {
    const startTime = Date.now();

    // Handle empty screenshots
    if (screenshots.length === 0) {
      return {
        hit: false,
        analysis: null,
        entryId: null,
        lookupTimeMs: Date.now() - startTime,
        missReason: 'NO_CACHE_ENTRY',
      };
    }

    // Generate cache key from current screenshots
    const cacheKeyResult = await generateAnalysisCacheKey(appId, screenshots);

    if (cacheKeyResult.success === false) {
      // Type assertion for error - TypeScript narrowing from Result type
      const errorMessage = cacheKeyResult.error.message;
      this.log(`Failed to generate cache key: ${errorMessage}`);
      return {
        hit: false,
        analysis: null,
        entryId: null,
        lookupTimeMs: Date.now() - startTime,
        missReason: 'NO_CACHE_ENTRY',
      };
    }

    const cacheKey = this.buildCacheKeyString(cacheKeyResult.data);
    const entry = this.memoryCache.get(cacheKey);

    if (!entry) {
      return {
        hit: false,
        analysis: null,
        entryId: null,
        lookupTimeMs: Date.now() - startTime,
        missReason: 'NO_CACHE_ENTRY',
      };
    }

    // Validate checksums if not skipping validation
    if (!options.skipChecksumValidation) {
      const validationResult = await this.validateCacheEntry(
        entry,
        screenshots,
        cacheKeyResult.data
      );

      if (!validationResult.isValid) {
        // Remove invalid entry
        this.memoryCache.delete(cacheKey);

        return {
          hit: false,
          analysis: null,
          entryId: null,
          lookupTimeMs: Date.now() - startTime,
          missReason: validationResult.invalidationReason,
        };
      }
    }

    return {
      hit: true,
      analysis: entry.analysis,
      entryId: entry.id,
      lookupTimeMs: Date.now() - startTime,
      missReason: null,
    };
  }

  /**
   * Quick check if a cache entry exists for an app
   * Does not validate checksums, just checks for existence
   */
  async hasEntry(appId: string, screenshots: Screenshot[]): Promise<boolean> {
    if (screenshots.length === 0) {
      return false;
    }

    const cacheKeyResult = await generateAnalysisCacheKey(appId, screenshots);
    if (!cacheKeyResult.success) {
      return false;
    }

    const cacheKey = this.buildCacheKeyString(cacheKeyResult.data);
    return this.memoryCache.has(cacheKey);
  }

  // ============================================
  // Cache Storage Operations
  // ============================================

  /**
   * Store an analysis result in the cache
   *
   * @param appId - The reference app ID
   * @param screenshots - The screenshots that were analyzed
   * @param analysis - The analysis result to cache
   * @param options - Storage options
   * @returns Result with the cache entry ID or an error
   */
  async store(
    appId: string,
    screenshots: Screenshot[],
    analysis: AppAnalysis,
    options: CacheOperationOptions = {}
  ): Promise<Result<string, ImageChecksumError>> {
    if (screenshots.length === 0) {
      return {
        success: false,
        error: {
          code: 'HASH_FAILED',
          message: 'Cannot cache analysis with no screenshots',
          url: '',
        },
      };
    }

    // Sort screenshots by order for consistent checksum generation
    const sortedScreenshots = [...screenshots].sort((a, b) => a.order - b.order);

    // Generate checksums with progress reporting
    const checksumResult = await generateScreenshotChecksums(
      sortedScreenshots,
      options.onProgress
    );

    if (!checksumResult.allSuccessful) {
      this.log(
        `Checksum generation had ${checksumResult.failures.length} failures, ` +
          `but continuing with ${checksumResult.checksums.length} successful checksums`
      );
    }

    // Need at least one successful checksum
    if (checksumResult.checksums.length === 0) {
      const firstFailure = checksumResult.failures[0];
      return {
        success: false,
        error: firstFailure.error,
      };
    }

    // Generate combined checksum
    const combinedChecksum = await generateCombinedChecksum(
      checksumResult.checksums,
      sortedScreenshots
    );

    // Create cache entry
    const entryId = this.generateEntryId();
    const now = new Date().toISOString();

    const entry: AnalysisCacheEntry = {
      id: entryId,
      appId,
      combinedChecksum,
      screenshotChecksums: checksumResult.checksums,
      analysis,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
    };

    // Build cache key and store
    const cacheKey = this.buildCacheKeyString({
      appId,
      combinedChecksum,
      screenshotCount: sortedScreenshots.length,
    });

    this.memoryCache.set(cacheKey, entry);
    this.log(`Stored analysis for app ${appId} with ${sortedScreenshots.length} screenshots`);

    return { success: true, data: entryId };
  }

  // ============================================
  // Cache Validation
  // ============================================

  /**
   * Validate a cache entry against current screenshots
   *
   * @param appId - The reference app ID
   * @param screenshots - The current screenshots
   * @param forceRefresh - If true, always invalidate
   * @returns Validation result with details
   */
  async validate(
    appId: string,
    screenshots: Screenshot[],
    forceRefresh: boolean = false
  ): Promise<CacheValidationResult> {
    // Handle force refresh
    if (forceRefresh) {
      return {
        isValid: false,
        cachedAnalysis: null,
        cacheEntryId: null,
        invalidationReason: 'FORCE_REFRESH',
        changedScreenshots: [],
      };
    }

    // Lookup existing entry
    const lookupResult = await this.lookup(appId, screenshots);

    if (!lookupResult.hit) {
      return {
        isValid: false,
        cachedAnalysis: null,
        cacheEntryId: null,
        invalidationReason: lookupResult.missReason,
        changedScreenshots: [],
      };
    }

    return {
      isValid: true,
      cachedAnalysis: lookupResult.analysis,
      cacheEntryId: lookupResult.entryId,
      invalidationReason: null,
      changedScreenshots: [],
    };
  }

  /**
   * Validate a specific cache entry against screenshots
   */
  private async validateCacheEntry(
    entry: AnalysisCacheEntry,
    screenshots: Screenshot[],
    cacheKey: AnalysisCacheKey
  ): Promise<CacheValidationResult> {
    // Check screenshot count
    if (screenshots.length !== entry.screenshotChecksums.length) {
      return {
        isValid: false,
        cachedAnalysis: null,
        cacheEntryId: null,
        invalidationReason: 'SCREENSHOT_COUNT_CHANGED',
        changedScreenshots: [],
      };
    }

    // Compare combined checksum
    if (entry.combinedChecksum !== cacheKey.combinedChecksum) {
      // Checksums don't match - need to determine what changed
      const sortedScreenshots = [...screenshots].sort((a, b) => a.order - b.order);
      const currentChecksums = await generateScreenshotChecksums(sortedScreenshots);

      const comparison = compareChecksums(
        currentChecksums.checksums,
        entry.screenshotChecksums
      );

      const changedScreenshots = [
        ...comparison.changedScreenshotIds,
        ...comparison.addedScreenshotIds,
        ...comparison.removedScreenshotIds,
      ];

      if (comparison.orderChanged) {
        return {
          isValid: false,
          cachedAnalysis: null,
          cacheEntryId: null,
          invalidationReason: 'SCREENSHOT_ORDER_CHANGED',
          changedScreenshots,
        };
      }

      return {
        isValid: false,
        cachedAnalysis: null,
        cacheEntryId: null,
        invalidationReason: 'CHECKSUM_MISMATCH',
        changedScreenshots,
      };
    }

    return {
      isValid: true,
      cachedAnalysis: entry.analysis,
      cacheEntryId: entry.id,
      invalidationReason: null,
      changedScreenshots: [],
    };
  }

  // ============================================
  // Cache Management
  // ============================================

  /**
   * Invalidate cache entry for an app
   *
   * @param appId - The reference app ID
   * @returns Number of entries invalidated
   */
  invalidate(appId: string): number {
    const count = this.memoryCache.deleteByAppId(appId);
    this.log(`Invalidated ${count} entries for app ${appId}`);
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
  getStats(): CacheStats {
    return this.memoryCache.getStats();
  }

  /**
   * Get all cached entries for an app (for debugging/inspection)
   */
  getEntriesForApp(appId: string): AnalysisCacheEntry[] {
    return this.memoryCache.getByAppId(appId);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Build a cache key string from an AnalysisCacheKey
   */
  private buildCacheKeyString(key: AnalysisCacheKey): string {
    return `${key.appId}:${key.combinedChecksum}:${key.screenshotCount}`;
  }

  /**
   * Generate a unique entry ID
   */
  private generateEntryId(): string {
    return `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[AnalysisCache] ${message}`);
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * Default singleton instance of the analysis cache
 * Use this for most cases unless you need custom configuration
 */
let defaultCacheInstance: AnalysisCache | null = null;

/**
 * Get the default analysis cache instance (singleton)
 * Creates the instance on first call with default configuration
 */
export function getAnalysisCache(): AnalysisCache {
  if (!defaultCacheInstance) {
    defaultCacheInstance = new AnalysisCache({
      debug: process.env.NODE_ENV === 'development',
    });
  }
  return defaultCacheInstance;
}

/**
 * Reset the default cache instance (useful for testing)
 */
export function resetAnalysisCache(): void {
  if (defaultCacheInstance) {
    defaultCacheInstance.clear();
    defaultCacheInstance = null;
  }
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Quick lookup in the default cache instance
 */
export async function lookupCachedAnalysis(
  appId: string,
  screenshots: Screenshot[],
  options?: CacheOperationOptions
): Promise<CacheLookupResult> {
  return getAnalysisCache().lookup(appId, screenshots, options);
}

/**
 * Quick store in the default cache instance
 */
export async function storeCachedAnalysis(
  appId: string,
  screenshots: Screenshot[],
  analysis: AppAnalysis,
  options?: CacheOperationOptions
): Promise<Result<string, ImageChecksumError>> {
  return getAnalysisCache().store(appId, screenshots, analysis, options);
}

/**
 * Validate cache for an app using default instance
 */
export async function validateCache(
  appId: string,
  screenshots: Screenshot[],
  forceRefresh?: boolean
): Promise<CacheValidationResult> {
  return getAnalysisCache().validate(appId, screenshots, forceRefresh);
}

/**
 * Invalidate cache for an app using default instance
 */
export function invalidateCache(appId: string): number {
  return getAnalysisCache().invalidate(appId);
}

/**
 * Get cache statistics from default instance
 */
export function getCacheStats(): CacheStats {
  return getAnalysisCache().getStats();
}
