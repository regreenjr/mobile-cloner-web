/**
 * Image utilities for checksum generation and validation
 *
 * @module lib/imageUtils
 */

import type { Screenshot, ScreenshotChecksum, AnalysisCacheKey, Result } from '../types/analyze';

/**
 * Error codes for checksum generation failures
 */
export type ImageChecksumErrorCode =
  | 'FETCH_FAILED'
  | 'HASH_FAILED'
  | 'INVALID_IMAGE'
  | 'TIMEOUT';

/**
 * Error structure for image checksum failures
 */
export interface ImageChecksumError {
  code: ImageChecksumErrorCode;
  message: string;
  url: string;
  screenshotId?: string;
}

/**
 * Result of generating checksums for multiple screenshots
 */
export interface BulkChecksumResult {
  /** Successfully generated checksums */
  checksums: ScreenshotChecksum[];
  /** Screenshots that failed to generate checksums */
  failures: Array<{
    screenshot: Screenshot;
    error: ImageChecksumError;
  }>;
  /** Whether all screenshots were processed successfully */
  allSuccessful: boolean;
}

/**
 * Progress callback for bulk operations
 */
export type ProgressCallback = (progress: number) => void;

/**
 * Generates checksums for multiple screenshots
 */
export async function generateScreenshotChecksums(
  screenshots: Screenshot[],
  onProgress?: ProgressCallback
): Promise<BulkChecksumResult> {
  const checksums: ScreenshotChecksum[] = [];
  const failures: BulkChecksumResult['failures'] = [];
  const total = screenshots.length;

  for (let i = 0; i < screenshots.length; i++) {
    const screenshot = screenshots[i];
    try {
      const checksum = await generateSingleChecksum(screenshot);
      checksums.push(checksum);
    } catch (error) {
      failures.push({
        screenshot,
        error: {
          code: 'HASH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          url: screenshot.url,
          screenshotId: screenshot.id,
        },
      });
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  return {
    checksums,
    failures,
    allSuccessful: failures.length === 0,
  };
}

/**
 * Generates a checksum for a single screenshot
 */
async function generateSingleChecksum(screenshot: Screenshot): Promise<ScreenshotChecksum> {
  // Simple implementation using URL as identifier
  const encoder = new TextEncoder();
  const data = encoder.encode(screenshot.url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    screenshotId: screenshot.id,
    checksum: hashHex,
    url: screenshot.url,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates a combined checksum from multiple screenshot checksums
 */
export async function generateCombinedChecksum(
  checksums: ScreenshotChecksum[],
  screenshots?: Screenshot[]
): Promise<string> {
  // Sort by screenshot order if available, otherwise by checksum
  const sortedChecksums = screenshots
    ? [...checksums].sort((a, b) => {
        const aIndex = screenshots.findIndex(s => s.id === a.screenshotId);
        const bIndex = screenshots.findIndex(s => s.id === b.screenshotId);
        return aIndex - bIndex;
      })
    : [...checksums].sort((a, b) => a.checksum.localeCompare(b.checksum));

  const combined = sortedChecksums.map(c => c.checksum).join(':');
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates an analysis cache key - returns a Result type
 */
export async function generateAnalysisCacheKey(
  appId: string,
  screenshots: Screenshot[]
): Promise<Result<AnalysisCacheKey, Error>> {
  try {
    const result = await generateScreenshotChecksums(screenshots);

    if (result.failures.length > 0 && result.checksums.length === 0) {
      return {
        success: false,
        error: new Error(`Failed to generate checksums for all screenshots: ${result.failures[0].error.message}`),
      };
    }

    const combinedChecksum = await generateCombinedChecksum(result.checksums, screenshots);

    return {
      success: true,
      data: {
        appId,
        combinedChecksum,
        screenshotCount: screenshots.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error generating cache key'),
    };
  }
}

/**
 * Result of comparing two sets of checksums
 */
export interface ChecksumComparisonResult {
  /** Whether all checksums match exactly */
  isMatch: boolean;
  /** Screenshot IDs that have different checksums */
  changedScreenshotIds: string[];
  /** Screenshot IDs that are in the new set but not the old set */
  addedScreenshotIds: string[];
  /** Screenshot IDs that are in the old set but not the new set */
  removedScreenshotIds: string[];
  /** Whether the order of screenshots has changed */
  orderChanged: boolean;
}

/**
 * Compares two arrays of checksums to determine what has changed
 */
export function compareChecksums(
  current: ScreenshotChecksum[],
  cached: ScreenshotChecksum[]
): ChecksumComparisonResult {
  const currentMap = new Map(current.map(c => [c.screenshotId, c.checksum]));
  const cachedMap = new Map(cached.map(c => [c.screenshotId, c.checksum]));

  const changedScreenshotIds: string[] = [];
  const addedScreenshotIds: string[] = [];
  const removedScreenshotIds: string[] = [];

  // Find changed and added screenshots
  for (const [id, checksum] of currentMap) {
    const cachedChecksum = cachedMap.get(id);
    if (cachedChecksum === undefined) {
      addedScreenshotIds.push(id);
    } else if (cachedChecksum !== checksum) {
      changedScreenshotIds.push(id);
    }
  }

  // Find removed screenshots
  for (const id of cachedMap.keys()) {
    if (!currentMap.has(id)) {
      removedScreenshotIds.push(id);
    }
  }

  // Check if order changed (only for screenshots that exist in both)
  const currentIds = current.map(c => c.screenshotId);
  const cachedIds = cached.map(c => c.screenshotId);
  const commonCurrentIds = currentIds.filter(id => cachedMap.has(id));
  const commonCachedIds = cachedIds.filter(id => currentMap.has(id));
  const orderChanged = commonCurrentIds.join(',') !== commonCachedIds.join(',');

  const isMatch =
    changedScreenshotIds.length === 0 &&
    addedScreenshotIds.length === 0 &&
    removedScreenshotIds.length === 0 &&
    !orderChanged;

  return {
    isMatch,
    changedScreenshotIds,
    addedScreenshotIds,
    removedScreenshotIds,
    orderChanged,
  };
}
