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
        cyber: {
          bg: '#0a0e17',
          card: '#111827',
          border: '#1f293d',
          accent: '#06b6d4',
          glow: 'rgba(6, 182, 212, 0.15)',
          red: '#ef4444',
          amber: '#f59e0b',
          green: '#10b981',
          purple: '#8b5cf6',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
