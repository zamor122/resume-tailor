import { TIME_BASED_TIERS, FREE_AUDIT_LIMIT } from "@/app/config/pricing";

export type LimitAction = "upgrade" | "auth" | null;

export interface ClassifiedTailorError {
  message: string;
  errorType: string;
  limitAction: LimitAction;
  openUpgradeModal: boolean;
  openAuthModal: boolean;
}

export function classifyTailorError(err: unknown): ClassifiedTailorError {
  const rawMessage = err instanceof Error ? err.message : "An error occurred";
  const isAbort = err instanceof Error && err.name === "AbortError";
  const isNetwork =
    err instanceof TypeError &&
    (rawMessage.includes("fetch") ||
      rawMessage.includes("network") ||
      rawMessage.includes("Failed to fetch"));
  const typedErr = err as Error & {
    statusCode?: number;
    anonymousLimitExceeded?: boolean;
    requireUpgrade?: boolean;
  };
  const statusCode = typedErr?.statusCode;
  const anonymousLimitExceeded = typedErr?.anonymousLimitExceeded;
  const requireUpgrade = typedErr?.requireUpgrade;

  const entryPriceLabel = Math.min(...TIME_BASED_TIERS.map((t) => t.price)).toFixed(2);

  if (statusCode === 402 || requireUpgrade) {
    return {
      message: rawMessage,
      errorType: "upgrade_required",
      limitAction: "upgrade",
      openUpgradeModal: true,
      openAuthModal: false,
    };
  }

  if (statusCode === 401 && anonymousLimitExceeded) {
    return {
      message:
        rawMessage ||
        `You've used your 1 free preview. Create a free account for ${FREE_AUDIT_LIMIT} ATS audits & previews, or purchase a pass from $${entryPriceLabel} for full downloads.`,
      errorType: "anonymous_limit",
      limitAction: "auth",
      openUpgradeModal: false,
      openAuthModal: true,
    };
  }

  if (isAbort) {
    return {
      message: "Request timed out. Please try again with a shorter resume or job description.",
      errorType: "timeout",
      limitAction: null,
      openUpgradeModal: false,
      openAuthModal: false,
    };
  }

  if (isNetwork) {
    return {
      message: "Network error. Please check your connection and try again.",
      errorType: "network",
      limitAction: null,
      openUpgradeModal: false,
      openAuthModal: false,
    };
  }

  if (statusCode === 504) {
    return {
      message: "Request timed out. Please try again.",
      errorType: "timeout",
      limitAction: null,
      openUpgradeModal: false,
      openAuthModal: false,
    };
  }

  if (statusCode === 429) {
    return {
      message: rawMessage,
      errorType: "rate_limit",
      limitAction: null,
      openUpgradeModal: false,
      openAuthModal: false,
    };
  }

  return {
    message: rawMessage,
    errorType: "unknown",
    limitAction: null,
    openUpgradeModal: false,
    openAuthModal: false,
  };
}
