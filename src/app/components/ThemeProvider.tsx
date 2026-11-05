'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { analytics } from '../services/analytics'

type Theme = 'light' | 'dark'

const ThemeContext = createContext({
  theme: 'light' as Theme,
  toggleTheme: () => {}
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with undefined to prevent hydration mismatch
  const [theme, setTheme] = useState<Theme | undefined>(undefined)

  const applyTheme = (nextTheme: Theme) => {
    const root = document.documentElement
    const body = document.body

    // Set classes on both html and body for consistent styling
    if (nextTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      body.classList.add('dark')
      body.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
      body.classList.add('light')
      body.classList.remove('dark')
    }

    // Set data-theme for components/CSS that read it
    root.setAttribute('data-theme', nextTheme)
    body.setAttribute('data-theme', nextTheme)

    // Optional: let the browser know which color scheme to prefer
    root.style.colorScheme = nextTheme === 'dark' ? 'dark' : 'light'
    body.style.colorScheme = nextTheme === 'dark' ? 'dark' : 'light'
  }

  useEffect(() => {
    // Default to light theme
    const initialTheme: Theme = 'light'
    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  const toggleTheme = () => {
    // Reserved for future theme toggle
    analytics.trackEvent(analytics.events.TOGGLE_THEME, {
      ...analytics.getTrackingContext({ element: "theme_toggle" }),
      theme: theme || "light",
    });
  }

  // NOTE: previously this returned `null` until a client-side `mounted` flag flipped
  // true in useEffect. That gated the ENTIRE app subtree out of the server render, so
  // every crawler received an empty Suspense boundary (`<!--$--><!--/$-->`) with all
  // content living only in the client-rendered RSC payload — PageSpeed/Googlebot saw
  // zero headings and zero internal links. The theme is applied imperatively via
  // `applyTheme` (document.documentElement/body classList) inside useEffect, so it does
  // NOT affect server markup and there is no hydration mismatch from rendering children.
  // Always render children; server and first client render both use theme === 'light'.
  return (
    <ThemeContext.Provider value={{ theme: theme || 'light', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext) 