/**
 * Server-side auth utilities for API routes.
 * Verifies Supabase JWT and returns authenticated user ID.
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Extract Bearer token from request.
 * Checks Authorization header first, then body.accessToken (for POST with JSON body).
 */
export function extractAuthToken(req: NextRequest, body?: { accessToken?: string }): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim() || null;
  }
  if (body?.accessToken && typeof body.accessToken === "string") {
    return body.accessToken.trim() || null;
  }
  return null;
}

/**
 * Get authenticated user from Supabase JWT.
 * Returns null if token is missing, invalid, or expired.
 */
export async function getAuthenticatedUser(token: string): Promise<{ id: string; email?: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id, email: user.email ?? undefined };
}

/**
 * Get authenticated user ID from Supabase JWT.
 * Returns null if token is missing, invalid, or expired.
 */
export async function getAuthenticatedUserId(token: string): Promise<string | null> {
  const user = await getAuthenticatedUser(token);
  return user?.id ?? null;
}

/**
 * Require authentication for a request.
 * Returns userId if valid, or an error Response (401) if not.
 */
export async function requireAuth(
  req: NextRequest,
  body?: { accessToken?: string }
): Promise<{ userId: string } | { error: Response }> {
  const token = extractAuthToken(req, body);
  if (!token) {
    return {
      error: Response.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      ),
    };
  }

  const user = await getAuthenticatedUser(token);
  if (!user) {
    return {
      error: Response.json(
        { error: "Invalid or expired session. Please sign in again." },
        { status: 401 }
      ),
    };
  }

  return { userId: user.id };
}

/**
 * Require authentication and return user with email.
 * Use when the route needs the authenticated user's email (e.g. Stripe portal).
 */
export async function requireAuthWithEmail(
  req: NextRequest,
  body?: { accessToken?: string }
): Promise<{ userId: string; email?: string } | { error: Response }> {
  const token = extractAuthToken(req, body);
  if (!token) {
    return {
      error: Response.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      ),
    };
  }

  const user = await getAuthenticatedUser(token);
  if (!user) {
    return {
      error: Response.json(
        { error: "Invalid or expired session. Please sign in again." },
        { status: 401 }
      ),
    };
  }

  return { userId: user.id, email: user.email };
}

/**
 * Verify that the authenticated user matches the claimed userId.
 * Use when the client sends userId and we must ensure it's not spoofed.
 */
export function verifyUserIdMatch(
  authenticatedUserId: string,
  claimedUserId: string
): { ok: true } | { error: Response } {
  if (authenticatedUserId !== claimedUserId) {
    return {
      error: Response.json(
        { error: "User ID does not match authenticated session." },
        { status: 403 }
      ),
    };
  }
  return { ok: true };
}
