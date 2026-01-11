/**
 * Reference Apps API Route
 *
 * Provides CRUD operations for reference apps in the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { referenceApps } from '@/lib/supabase/db';
import type { ReferenceAppInsert } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * POST /api/reference-apps
 *
 * Creates a new reference app in the database
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'name is required and must be a string',
          },
        },
        { status: 400 }
      );
    }

    if (!body.category || typeof body.category !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'category is required and must be a string',
          },
        },
        { status: 400 }
      );
    }

    // Create the reference app
    const appData: ReferenceAppInsert = {
      name: body.name,
      category: body.category,
      app_store_url: body.app_store_url || null,
      play_store_url: body.play_store_url || null,
      screenshots: body.screenshots || [],
    };

    const result = await referenceApps.create(appData);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: (result as any).error.code,
            message: (result as any).error.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Reference apps POST error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reference-apps
 *
 * Lists all reference apps
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await referenceApps.getAll();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: (result as any).error.code,
            message: (result as any).error.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Reference apps GET error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
