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
  const [mounted, setMounted] = useState(false)

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
    
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    // Reserved for future theme toggle
    analytics.trackEvent(analytics.events.TOGGLE_THEME, {
      ...analytics.getTrackingContext({ element: "theme_toggle" }),
      theme: theme || "light",
    });
  }

  // Return null during SSR to prevent hydration issues
  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ theme: theme || 'light', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext) 