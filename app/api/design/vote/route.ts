/**
 * Design Direction Voting API Route
 *
 * Provides server-side API endpoints for voting on AI-generated design directions.
 * Supports both adding and removing votes, with duplicate vote prevention.
 *
 * POST /api/design/vote - Cast a vote for a design direction
 * DELETE /api/design/vote - Remove a vote from a design direction
 * GET /api/design/vote?directionId=<id> - Get voting status for a direction
 *
 * @example
 * ```ts
 * // POST request body - Cast a vote
 * {
 *   "directionId": "uuid",
 *   "voterId": "user-uuid",
 *   "voterName": "John Doe",
 *   "comment": "Great color palette!" // optional
 * }
 *
 * // Response
 * {
 *   "success": true,
 *   "data": {
 *     "directionId": "uuid",
 *     "directionName": "Modern Bold",
 *     "totalVotes": 5,
 *     "voterNames": ["John Doe", "Jane Smith", ...]
 *   }
 * }
 *
 * // DELETE request body - Remove a vote
 * {
 *   "directionId": "uuid",
 *   "voterId": "user-uuid"
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { designDirections } from '@/lib/supabase/db';
import type { VoteRecord } from '@/types/design';

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request body for POST /api/design/vote (cast vote)
 */
interface CastVoteRequestBody {
  /** UUID of the design direction to vote for */
  directionId: string;
  /** Unique identifier for the voter */
  voterId: string;
  /** Display name of the voter */
  voterName: string;
  /** Optional comment explaining the vote */
  comment?: string;
}

/**
 * Request body for DELETE /api/design/vote (remove vote)
 */
interface RemoveVoteRequestBody {
  /** UUID of the design direction to remove vote from */
  directionId: string;
  /** Unique identifier for the voter whose vote to remove */
  voterId: string;
}

/**
 * API Response wrapper
 */
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; userMessage: string; retryable: boolean } };

/**
 * Vote response data
 */
interface VoteResponseData {
  /** The direction ID that was voted on */
  directionId: string;
  /** Name of the design direction */
  directionName: string;
  /** Updated total vote count */
  totalVotes: number;
  /** List of voter names */
  voterNames: string[];
  /** Whether the current user has voted */
  hasUserVoted?: boolean;
}

/**
 * Get vote status response data
 */
interface VoteStatusData {
  /** The direction ID */
  directionId: string;
  /** Name of the design direction */
  directionName: string;
  /** Total vote count */
  totalVotes: number;
  /** All voter details */
  voters: VoteRecord[];
  /** Whether the direction is selected */
  isSelected: boolean;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates the cast vote request body
 */
function validateCastVoteRequest(body: unknown): {
  valid: true;
  data: CastVoteRequestBody;
} | {
  valid: false;
  error: { code: string; message: string };
} {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request body must be a JSON object',
      },
    };
  }

  const data = body as Record<string, unknown>;

  // Validate directionId
  if (typeof data.directionId !== 'string' || data.directionId.trim().length === 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_DIRECTION_ID',
        message: 'directionId is required and must be a non-empty string',
      },
    };
  }

  // Validate voterId
  if (typeof data.voterId !== 'string' || data.voterId.trim().length === 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_VOTER_ID',
        message: 'voterId is required and must be a non-empty string',
      },
    };
  }

  // Validate voterName
  if (typeof data.voterName !== 'string' || data.voterName.trim().length === 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_VOTER_NAME',
        message: 'voterName is required and must be a non-empty string',
      },
    };
  }

  // Validate voterName length
  if (data.voterName.trim().length > 100) {
    return {
      valid: false,
      error: {
        code: 'INVALID_VOTER_NAME',
        message: 'voterName must be 100 characters or less',
      },
    };
  }

  // Validate comment (optional)
  if (data.comment !== undefined) {
    if (typeof data.comment !== 'string') {
      return {
        valid: false,
        error: {
          code: 'INVALID_COMMENT',
          message: 'comment must be a string if provided',
        },
      };
    }
    if (data.comment.length > 500) {
      return {
        valid: false,
        error: {
          code: 'INVALID_COMMENT',
          message: 'comment must be 500 characters or less',
        },
      };
    }
  }

  return {
    valid: true,
    data: {
      directionId: data.directionId as string,
      voterId: data.voterId as string,
      voterName: data.voterName.trim() as string,
      comment: data.comment as string | undefined,
    },
  };
}

/**
 * Validates the remove vote request body
 */
function validateRemoveVoteRequest(body: unknown): {
  valid: true;
  data: RemoveVoteRequestBody;
} | {
  valid: false;
  error: { code: string; message: string };
} {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request body must be a JSON object',
      },
    };
  }

  const data = body as Record<string, unknown>;

  // Validate directionId
  if (typeof data.directionId !== 'string' || data.directionId.trim().length === 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_DIRECTION_ID',
        message: 'directionId is required and must be a non-empty string',
      },
    };
  }

  // Validate voterId
  if (typeof data.voterId !== 'string' || data.voterId.trim().length === 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_VOTER_ID',
        message: 'voterId is required and must be a non-empty string',
      },
    };
  }

  return {
    valid: true,
    data: {
      directionId: data.directionId as string,
      voterId: data.voterId as string,
    },
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/design/vote
 *
 * Returns voting status for a design direction.
 *
 * Query parameters:
 * - directionId: string (required) - UUID of the design direction
 *
 * Response:
 * - success: boolean
 * - data: VoteStatusData (on success)
 * - error: { code, message, userMessage, retryable } (on failure)
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<VoteStatusData>>> {
  try {
    const { searchParams } = new URL(request.url);
    const directionId = searchParams.get('directionId');

    if (!directionId || directionId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DIRECTION_ID',
            message: 'directionId query parameter is required',
            userMessage: 'Please provide a valid design direction ID.',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Fetch the direction from database
    const result = await designDirections.getById(directionId);

    if (!result.success) {
      const httpStatus = (result as any).error.code === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: (result as any).error.code,
            message: (result as any).error.message,
            userMessage: (result as any).error.userMessage,
            retryable: (result as any).error.code !== 'NOT_FOUND',
          },
        },
        { status: httpStatus }
      );
    }

    const direction = result.data;

    const responseData: VoteStatusData = {
      directionId: direction.id,
      directionName: direction.name,
      totalVotes: direction.votes,
      voters: direction.voters as VoteRecord[],
      isSelected: direction.is_selected,
    };

    console.log(`[API] Vote status retrieved for direction ${directionId}: ${direction.votes} votes`);

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Vote GET error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          userMessage: 'Failed to get voting status. Please try again.',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/design/vote
 *
 * Casts a vote for a design direction.
 *
 * Request body:
 * - directionId: string (required) - UUID of the design direction
 * - voterId: string (required) - Unique identifier for the voter
 * - voterName: string (required) - Display name of the voter
 * - comment: string (optional) - Comment explaining the vote
 *
 * Response:
 * - success: boolean
 * - data: VoteResponseData (on success)
 * - error: { code, message, userMessage, retryable } (on failure)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<VoteResponseData>>> {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
            userMessage: 'Invalid request format. Please try again.',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = validateCastVoteRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: (validation as any).error.code,
            message: (validation as any).error.message,
            userMessage: (validation as any).error.message,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const { directionId, voterId, voterName, comment } = validation.data;

    // Create the vote record
    const voteRecord: VoteRecord = {
      oderId: voterId, // Note: Using oderId as per the existing VoteRecord interface
      voterName,
      votedAt: new Date().toISOString(),
      comment,
    };

    // Cast the vote using the database module
    const result = await designDirections.vote(directionId, voteRecord);

    if (!result.success) {
      // Handle specific error cases
      let httpStatus = 500;
      if ((result as any).error.code === 'NOT_FOUND') {
        httpStatus = 404;
      } else if ((result as any).error.code === 'DUPLICATE_KEY') {
        httpStatus = 409; // Conflict - already voted
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: (result as any).error.code,
            message: (result as any).error.message,
            userMessage: (result as any).error.userMessage,
            retryable: (result as any).error.code !== 'NOT_FOUND' && (result as any).error.code !== 'DUPLICATE_KEY',
          },
        },
        { status: httpStatus }
      );
    }

    const updatedDirection = result.data;

    // Extract voter names from the voters array
    const voterNames = (updatedDirection.voters as VoteRecord[]).map(v => v.voterName);

    const responseData: VoteResponseData = {
      directionId: updatedDirection.id,
      directionName: updatedDirection.name,
      totalVotes: updatedDirection.votes,
      voterNames,
      hasUserVoted: true,
    };

    console.log(
      `[API] Vote cast for direction ${directionId} by ${voterName}: ` +
      `now has ${updatedDirection.votes} votes`
    );

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Vote POST error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          userMessage: 'Failed to record your vote. Please try again.',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/design/vote
 *
 * Removes a vote from a design direction.
 *
 * Request body:
 * - directionId: string (required) - UUID of the design direction
 * - voterId: string (required) - Unique identifier for the voter
 *
 * Response:
 * - success: boolean
 * - data: VoteResponseData (on success)
 * - error: { code, message, userMessage, retryable } (on failure)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<VoteResponseData>>> {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
            userMessage: 'Invalid request format. Please try again.',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = validateRemoveVoteRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: (validation as any).error.code,
            message: (validation as any).error.message,
            userMessage: (validation as any).error.message,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const { directionId, voterId } = validation.data;

    // Remove the vote using the database module
    const result = await designDirections.removeVote(directionId, voterId);

    if (!result.success) {
      // Handle specific error cases
      let httpStatus = 500;
      if ((result as any).error.code === 'NOT_FOUND') {
        httpStatus = 404;
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: (result as any).error.code,
            message: (result as any).error.message,
            userMessage: (result as any).error.userMessage,
            retryable: (result as any).error.code !== 'NOT_FOUND',
          },
        },
        { status: httpStatus }
      );
    }

    const updatedDirection = result.data;

    // Extract voter names from the voters array
    const voterNames = (updatedDirection.voters as VoteRecord[]).map(v => v.voterName);

    const responseData: VoteResponseData = {
      directionId: updatedDirection.id,
      directionName: updatedDirection.name,
      totalVotes: updatedDirection.votes,
      voterNames,
      hasUserVoted: false,
    };

    console.log(
      `[API] Vote removed from direction ${directionId} by voter ${voterId}: ` +
      `now has ${updatedDirection.votes} votes`
    );

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Vote DELETE error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          userMessage: 'Failed to remove your vote. Please try again.',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
