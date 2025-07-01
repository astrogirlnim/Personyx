/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        // DeskResearcher design system colors
        'evidence-blue': '#2F80ED',
        'persona-green': '#27AE60',
        'insight-violet': '#9B51E0',
        'caution-amber': '#F2994A',
        'risk-red': '#EB5757',
        'mist-grey': '#F7F9FC',
        'paper-white': '#FFFFFF',
        graphite: '#CED4DA',
        slate: '#212529',
        steel: '#495057',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      animation: {
        'pulse-score': 'pulse-score 400ms ease-in-out',
        sweep: 'sweep 200ms linear infinite',
      },
      keyframes: {
        'pulse-score': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.04)', opacity: '0.8' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
