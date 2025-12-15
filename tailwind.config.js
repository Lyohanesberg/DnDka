/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        stone: {
          950: 'var(--c-bg-deep)',
          900: 'var(--c-bg-main)',
          800: 'var(--c-bg-card)',
          700: 'var(--c-border)',
          600: 'var(--c-border-hover)',
          500: 'var(--c-text-muted)',
          400: 'var(--c-text-secondary)',
          300: 'var(--c-text-primary)',
          200: 'var(--c-text-bright)',
          100: '#f5f5f4',
          50: '#fafaf9',
        },
        amber: {
          950: '#451a03',
          900: 'var(--c-accent-dark)',
          800: 'var(--c-accent-dim)',
          700: 'var(--c-accent-main)',
          600: '#d97706',
          500: 'var(--c-accent-bright)',
          400: '#fbbf24',
          300: '#fcd34d',
          200: '#fde68a',
          100: '#fef3c7',
          50: '#fffbeb',
        }
      },
      animation: {
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-once': 'pulse 1s ease-in-out 1',
      },
      keyframes: {
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
        }
      }
    },
  },
  plugins: [],
}