/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        // Personyx design system colors - Evidence Gate palette
        evidence: {
          DEFAULT: '#2F80ED',
          dark: '#5C9EFF',
        },
        persona: {
          DEFAULT: '#27AE60',
          dark: '#5BC686',
        },
        insight: {
          DEFAULT: '#9B51E0',
          dark: '#BB7BFF',
        },
        mist: {
          DEFAULT: '#F7F9FC',
          dark: '#1F1F24',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          dark: '#26262C',
        },
        graphite: {
          DEFAULT: '#CED4DA',
          dark: '#3A3E46',
        },
        slate: {
          DEFAULT: '#212529',
          dark: '#E9ECEF',
        },
        steel: {
          DEFAULT: '#495057',
          dark: '#ADB5BD',
        },
        // Legacy colors for backwards compatibility
        'evidence-blue': {
          DEFAULT: '#2F80ED',
          dark: '#5C9EFF',
        },
        'persona-green': {
          DEFAULT: '#27AE60',
          dark: '#5BC686',
        },
        'insight-violet': {
          DEFAULT: '#9B51E0',
          dark: '#BB7BFF',
        },
        'caution-amber': {
          DEFAULT: '#F2994A',
          dark: '#FFB36D',
        },
        'risk-red': {
          DEFAULT: '#EB5757',
          dark: '#FF7B7B',
        },
        'mist-grey': {
          DEFAULT: '#F7F9FC',
          dark: '#1F1F24',
        },
        'paper-white': {
          DEFAULT: '#FFFFFF',
          dark: '#26262C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      // Typography scale handled by CSS classes to avoid circular dependencies
      spacing: {
        // Design system spacing scale (4px grid)
        xs: '0.25rem', // 4px
        sm: '0.5rem', // 8px
        md: '1rem', // 16px
        lg: '1.5rem', // 24px
        xl: '2rem', // 32px
        '2xl': '3rem', // 48px
        '3xl': '4rem', // 64px
        // Keep existing spacing
        18: '4.5rem',
        88: '22rem',
      },
      borderRadius: {
        'dr-md': '0.5rem', // 8px - Component token
      },
      boxShadow: {
        'dr-sm': '0 1px 2px rgba(0,0,0,0.05)', // Component token
        'dr-md': '0 4px 6px rgba(0,0,0,0.1)', // Elevation for top-level tray
        'dr-depth':
          '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // 4dp shadow
      },
      transitionDuration: {
        'dr-fast': '120ms', // Component token
      },
      animation: {
        'pulse-score': 'pulse-score 400ms ease-in-out',
        sweep: 'sweep 200ms linear infinite',
        'slide-in': 'slide-in 120ms ease-out', // Tray slide-in
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
        'slide-in': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
