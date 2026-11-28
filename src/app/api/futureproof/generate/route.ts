import { NextRequest, NextResponse } from "next/server";
import type { ComfortLevel } from "@/app/config/aiToolRegistry";
import type { IndustryCategory } from "@/app/config/domainTaxonomy";
import { extractAuthToken, getAuthenticatedUser } from "@/app/utils/auth";
import { getAccessInfoServer } from "@/app/utils/accessManager";
import { generateFutureproofUpgrades } from "@/app/services/futureproofAgent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const resumeText = typeof body?.resumeText === "string" ? body.resumeText.trim() : "";
    const comfortLevel: ComfortLevel =
      body?.comfortLevel === "automator" ? "automator" : "everyday";
    const useIndustryStandards = Boolean(body?.useIndustryStandards);
    const selectedToolIds = Array.isArray(body?.selectedToolIds)
      ? body.selectedToolIds.filter((x: unknown): x is string => typeof x === "string")
      : [];
    const industryHint =
      typeof body?.industry === "string" ? (body.industry as IndustryCategory) : undefined;
    const hasRecentRoles =
      typeof body?.hasRecentRoles === "boolean" ? body.hasRecentRoles : undefined;
    const detectedRoles = Array.isArray(body?.detectedRoles)
      ? body.detectedRoles
          .filter((r: unknown): r is Record<string, unknown> => Boolean(r && typeof r === "object"))
          .slice(0, 5)
          .map((r: Record<string, unknown>, idx: number) => ({
            id: typeof r.id === "string" ? r.id : `role-${idx}`,
            title: typeof r.title === "string" ? r.title : "",
            company: typeof r.company === "string" ? r.company : "",
            dateRange: typeof r.dateRange === "string" ? r.dateRange : "",
            isRecentForAi: Boolean(r.isRecentForAi),
          }))
      : undefined;
    const accessToken =
      typeof body?.accessToken === "string" ? body.accessToken : undefined;

    if (resumeText.length < 80) {
      return NextResponse.json(
        { error: "Resume text is required (minimum 80 characters)." },
        { status: 400 }
      );
    }

    // Server-side access check (never trust client-supplied unlock flags)
    let isUnlocked = false;
    const token = extractAuthToken(req, { accessToken });
    if (token) {
      const user = await getAuthenticatedUser(token);
      if (user?.id) {
        const accessInfo = await getAccessInfoServer(user.id);
        isUnlocked = Boolean(accessInfo?.hasAccess && !accessInfo.isExpired);
      }
    }

    const safeResponse = await generateFutureproofUpgrades({
      resumeText,
      comfortLevel,
      useIndustryStandards,
      selectedToolIds,
      industry: industryHint,
      hasRecentRoles,
      detectedRoles,
      isUnlocked,
    });

    return NextResponse.json(safeResponse);
  } catch (error) {
    console.error("[futureproof/generate] Error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to generate AI experience upgrades. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
