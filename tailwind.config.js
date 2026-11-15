/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#D50000',
          darkRed: '#B90000',
          yellow: '#FFD600',
          amber: '#FFB300',
          dark: '#171717',
          lightBg: '#F7F8FA',
          softGray: '#E9EDF2',
          muted: '#71717A',
          border: '#E2E8F0',
          green: '#10B981',
          greenDark: '#059669'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 10px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 25px -5px rgba(213, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        'nav': '0 -4px 16px rgba(0, 0, 0, 0.06)'
      }
    },
  },
  plugins: [],
}
