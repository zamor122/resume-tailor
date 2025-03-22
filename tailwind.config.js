/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse-slow 10s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 15s ease-in-out infinite',
        'float-reverse': 'float-reverse 15s ease-in-out infinite',
        'drift': 'drift 20s ease-in-out infinite',
        'drift-reverse': 'drift-reverse 20s ease-in-out infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: 0.7 },
          '50%': { opacity: 0.4 },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-5%) scale(1.05)' },
        },
        'float-reverse': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(5%) scale(0.95)' },
        },
        'drift': {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(3%, -2%) scale(1.03)' },
          '66%': { transform: 'translate(-2%, 3%) scale(0.97)' },
          '100%': { transform: 'translate(0, 0) scale(1)' },
        },
        'drift-reverse': {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-3%, 2%) scale(0.98)' },
          '66%': { transform: 'translate(2%, -3%) scale(1.02)' },
          '100%': { transform: 'translate(0, 0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
} 