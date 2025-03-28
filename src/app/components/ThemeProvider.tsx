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

  useEffect(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme') as Theme
    const initialTheme = savedTheme || 'light'
    
    setTheme(initialTheme)
    
    // Apply the theme class directly to the document element
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      console.log('[ThemeProvider] Initial theme: dark, HTML classes:', document.documentElement.className)
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
      console.log('[ThemeProvider] Initial theme: light, HTML classes:', document.documentElement.className)
    }
    
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    if (!theme) return
    
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    
    // Apply theme classes more deterministically
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      console.log('[ThemeProvider] Changed to dark theme, HTML classes:', document.documentElement.className)
      
      // Debug dark mode elements
      setTimeout(() => {
        const darkCards = document.querySelectorAll('.dark\\:bg-gray-800\\/90')
        console.log(`[ThemeProvider] Found ${darkCards.length} elements with dark:bg-gray-800/90 class`)
        
        const darkTexts = document.querySelectorAll('.dark\\:text-gray-100')
        console.log(`[ThemeProvider] Found ${darkTexts.length} elements with dark:text-gray-100 class`)
      }, 100)
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
      console.log('[ThemeProvider] Changed to light theme, HTML classes:', document.documentElement.className)
    }
    
    localStorage.setItem('theme', newTheme)
    
    // Track theme toggle in analytics
    analytics.trackEvent(analytics.events.TOGGLE_THEME, {
      theme: newTheme
    })
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