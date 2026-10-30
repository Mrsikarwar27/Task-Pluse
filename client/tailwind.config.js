/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F5',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#A33900',
          container: '#CC4900',
          soft: '#FFF1E8',
          softer: '#FFF7F1',
        },
        accent: {
          DEFAULT: '#F97316',
          soft: '#FFEDD5',
        },
        ink: '#1C1917',
        muted: '#78716C',
        line: '#F1E6DB',
        success: '#15803D',
        successSoft: '#F0FDF4',
        danger: '#B91C1C',
        dangerSoft: '#FEF2F2',
        warning: '#B45309',
        warningSoft: '#FFFBEB',
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans Variable',
          'Plus Jakarta Sans',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28, 25, 23, 0.04), 0 14px 34px -20px rgba(163, 57, 0, 0.22)',
        lift: '0 2px 4px rgba(28, 25, 23, 0.04), 0 22px 48px -24px rgba(163, 57, 0, 0.3)',
        panel: '0 24px 64px -28px rgba(28, 25, 23, 0.28)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97) translateY(6px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-in': 'slide-in 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scale-in 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        'toast-in': 'toast-in 240ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
