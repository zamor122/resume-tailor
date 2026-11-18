export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  capturedAt?: string;
}

const STORAGE_KEY = "resume_tailor_utm";

export function captureUtmParams(): UtmParams | null {
  if (typeof window === "undefined") return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source");
    const medium = params.get("utm_medium");
    const campaign = params.get("utm_campaign");
    const content = params.get("utm_content");
    const term = params.get("utm_term");

    if (source || medium || campaign || content || term) {
      const utmData: UtmParams = {
        ...(source && { source }),
        ...(medium && { medium }),
        ...(campaign && { campaign }),
        ...(content && { content }),
        ...(term && { term }),
        capturedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(utmData));
      return utmData;
    }

    return getStoredUtmParams();
  } catch {
    return null;
  }
}

export function getStoredUtmParams(): UtmParams | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UtmParams;
  } catch {
    return null;
  }
}
