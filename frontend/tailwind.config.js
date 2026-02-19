/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0f0f1a',
        foreground: '#f0f0f5',
        card: '#1a1a2e',
        primary: '#6366f1',
        secondary: '#2a2a4a',
        muted: '#2a2a4a',
        accent: '#3a3a5a',
        destructive: '#ef4444',
        border: '#2a2a4a',
      },
    },
  },
  plugins: [],
}
