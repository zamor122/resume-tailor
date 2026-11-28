"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { analytics } from "../services/analytics";

export type Theme = "light" | "dark";
export type DesignOption = "pomegranate" | "risograph";

export const DESIGN_STORAGE_KEY = "airesumetailor_design";

const VALID_DESIGNS: readonly DesignOption[] = ["pomegranate", "risograph"];

function parseDesignParam(val: string | null | undefined): DesignOption | null {
  if (!val) return null;
  const lower = val.toLowerCase();
  if (lower === "pomegranate" || lower === "modern") return "pomegranate";
  if (lower === "risograph" || lower === "classic") return "risograph";
  return null;
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  design: DesignOption;
  setDesign: (nextDesign: DesignOption) => void;
  toggleDesign: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  design: "pomegranate",
  setDesign: () => {},
  toggleDesign: () => {},
});

function applyDesignToDom(nextDesign: DesignOption) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute("data-design", nextDesign);
  root.style.setProperty("--design-mode", nextDesign);
  if (body) {
    body.setAttribute("data-design", nextDesign);
    body.style.setProperty("--design-mode", nextDesign);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<Theme>("light");
  const [design, setDesignState] = useState<DesignOption>("pomegranate");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;

    // Preserve light color scheme classes
    root.classList.add("light");
    root.classList.remove("dark");
    body?.classList.add("light");
    body?.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    body?.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    if (body) body.style.colorScheme = "light";

    // Resolve persisted or URL-requested design option (?design=modern|classic|pomegranate|risograph)
    let resolved: DesignOption = "pomegranate";
    try {
      const params = new URLSearchParams(window.location.search);
      const queryDesign = parseDesignParam(params.get("design"));
      const attrDesign = parseDesignParam(root.getAttribute("data-design"));
      const storedDesign = parseDesignParam(
        window.localStorage.getItem(DESIGN_STORAGE_KEY)
      );

      if (queryDesign) {
        resolved = queryDesign;
        window.localStorage.setItem(DESIGN_STORAGE_KEY, queryDesign);
      } else if (storedDesign) {
        resolved = storedDesign;
      } else if (attrDesign) {
        resolved = attrDesign;
      }
    } catch {
      // Ignore storage access failures in private/sandboxed contexts
    }

    applyDesignToDom(resolved);
    // Sync React state after paint if different from SSR default
    if (resolved !== "pomegranate") {
      const raf = window.requestAnimationFrame(() => {
        setDesignState(resolved);
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, []);

  const setDesign = useCallback((nextDesign: DesignOption) => {
    if (!VALID_DESIGNS.includes(nextDesign)) return;
    setDesignState(nextDesign);
    applyDesignToDom(nextDesign);
    try {
      window.localStorage.setItem(DESIGN_STORAGE_KEY, nextDesign);
    } catch {
      // ignore storage errors
    }
    analytics.trackEvent(analytics.events.TOGGLE_THEME, {
      ...analytics.getTrackingContext({ element: "design_switcher" }),
      design: nextDesign,
    });
  }, []);

  const toggleDesign = useCallback(() => {
    setDesign(design === "pomegranate" ? "risograph" : "pomegranate");
  }, [design, setDesign]);

  const toggleTheme = useCallback(() => {
    toggleDesign();
  }, [toggleDesign]);

  // Always render children immediately for full SSR HTML & crawler visibility.
  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, design, setDesign, toggleDesign }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
