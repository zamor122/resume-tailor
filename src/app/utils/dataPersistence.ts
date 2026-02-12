import { HumanizeResponse } from "@/app/types/humanize";

const STORAGE_KEY = "resume-tailor-data";

export interface StoredData {
  resumeText: string;
  jobDescription: string;
  results: HumanizeResponse | null;
  sessionId: string | null;
  uploadMode: "file" | "paste";
  timestamp: number;
}

/**
 * @deprecated Use database storage instead. This function is kept for backward compatibility only.
 * Save resume data to localStorage
 */
export function saveResumeData(data: Partial<StoredData>): void {
  try {
    const existing = loadResumeData();
    const updated: StoredData = {
      resumeText: data.resumeText ?? existing?.resumeText ?? "",
      jobDescription: data.jobDescription ?? existing?.jobDescription ?? "",
      results: data.results ?? existing?.results ?? null,
      sessionId: data.sessionId ?? existing?.sessionId ?? null,
      uploadMode: data.uploadMode ?? existing?.uploadMode ?? "file",
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving resume data:", error);
  }
}

/**
 * @deprecated Use database queries instead. This function is kept for backward compatibility only.
 * Load resume data from localStorage
 */
export function loadResumeData(): StoredData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored) as StoredData;
    
    // Validate data structure
    if (typeof data !== "object" || !data) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error loading resume data:", error);
    return null;
  }
}

/**
 * @deprecated No longer needed with database-first approach. This function is kept for backward compatibility only.
 * Clear resume data from localStorage
 */
export function clearResumeData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing resume data:", error);
  }
}

/**
 * @deprecated Use database queries instead. This function is kept for backward compatibility only.
 * Check if stored data exists
 */
export function hasStoredData(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    return false;
  }
}

