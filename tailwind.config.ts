import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // This is important!
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          light: "var(--primary-light)",
          dark: "var(--primary-dark)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          light: "var(--secondary-light)",
          dark: "var(--secondary-dark)",
        },
        cyan: {
          DEFAULT: "var(--cyan)",
          light: "var(--cyan-light)",
          dark: "var(--cyan-dark)",
        },
        pink: {
          DEFAULT: "var(--pink)",
          light: "var(--pink-light)",
          dark: "var(--pink-dark)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          light: "var(--amber-light)",
          dark: "var(--amber-dark)",
        },
        emerald: {
          DEFAULT: "var(--emerald)",
          light: "var(--emerald-light)",
          dark: "var(--emerald-dark)",
        }
      },
      textColor: {
        primary: "var(--primary)",
        "primary-light": "var(--primary-light)",
        "primary-dark": "var(--primary-dark)",
        secondary: "var(--secondary)",
        "secondary-light": "var(--secondary-light)",
        "secondary-dark": "var(--secondary-dark)",
        foreground: "var(--foreground)",
      },
      backgroundColor: {
        primary: "var(--primary)",
        "primary-light": "var(--primary-light)",
        "primary-dark": "var(--primary-dark)",
        secondary: "var(--secondary)",
        "secondary-light": "var(--secondary-light)",
        "secondary-dark": "var(--secondary-dark)",
        background: "var(--background)",
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(10px, 10px)' },
          '50%': { transform: 'translate(-10px, 20px)' },
          '75%': { transform: 'translate(-20px, -10px)' },
        },
        typing: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          }  
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        typing: 'typing 0.5s ease-in-out',
        fadeIn: 'fadeIn 0.5s ease-out forwards',
        'float': 'float 20s ease-in-out infinite',
        'float-delayed': 'float 25s ease-in-out infinite 2s',
        'float-slow': 'float 30s ease-in-out infinite 4s',  
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
} satisfies Config;
