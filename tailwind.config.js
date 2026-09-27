/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Google Sans"', '"Google Sans Text"', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Google Material palette used throughout the UI
        gblue: { DEFAULT: '#1a73e8', light: '#4285f4', soft: '#e8f0fe', dark: '#174ea6' },
        gred: { DEFAULT: '#d93025', light: '#ea4335', soft: '#fce8e6' },
        gyellow: { DEFAULT: '#f9ab00', light: '#fbbc04', soft: '#fef7e0' },
        ggreen: { DEFAULT: '#188038', light: '#34a853', soft: '#e6f4ea' },
        gorange: { DEFAULT: '#e37400' },
        ink: { DEFAULT: '#202124', 2: '#3c4043', 3: '#5f6368', 4: '#80868b', 5: '#9aa0a6' },
        line: '#dadce0',
        surface: '#f8f9fa',
      },
      boxShadow: {
        card: '0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
        lift: '0 4px 8px 3px rgba(60,64,67,.12), 0 1px 3px rgba(60,64,67,.2)',
        float: '0 24px 48px -12px rgba(60,64,67,.25), 0 2px 6px rgba(60,64,67,.08)',
      },
    },
  },
  plugins: [],
};
