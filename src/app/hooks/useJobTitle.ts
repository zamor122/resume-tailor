"use client";

import useSWR from "swr";
import { fetchJobTitle, jobTitleKey } from "@/app/lib/swr-fetchers";

const MIN_LENGTH = 100;

export interface UseJobTitleOptions {
  /** When false, key is null and no fetch runs. Use to e.g. only fetch after blur. */
  enabled?: boolean;
}

export interface UseJobTitleResult {
  jobTitle: string | null;
  confidence: number;
  isLoading: boolean;
  error: unknown;
  mutate: () => void;
}

/**
 * Fetches job title for a job description string. Key is stable (trimmed string or hash).
 * Only fetches when enabled and jobDescription.trim().length >= MIN_LENGTH (API requirement).
 */
export function useJobTitle(
  jobDescription: string,
  options: UseJobTitleOptions = {}
): UseJobTitleResult {
  const { enabled = true } = options;
  const stableKey = jobTitleKey(jobDescription, MIN_LENGTH);
  const key = enabled && stableKey ? (["job-title", stableKey] as const) : null;

  const { data, error, isLoading, mutate } = useSWR(key, () => fetchJobTitle(jobDescription.trim()), {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  return {
    jobTitle: data?.jobTitle ?? null,
    confidence: data?.confidence ?? 0,
    isLoading: !!key && isLoading,
    error,
    mutate,
  };
}
