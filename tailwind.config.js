/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: '#050608',
        panel: '#0c0f14',
        panelSoft: '#11151c',
        muted: '#8f98a8',
        accent: '#dbe7ff',
        accentSoft: '#8fb7ff',
        success: '#8be3c6',
        warning: '#f3d08b',
        danger: '#f3a4b4',
      },
      fontFamily: {
        sans: ['"SF Pro Display"', '"SF Pro Text"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 24px 80px rgba(7, 12, 20, 0.55)',
      },
      backgroundImage: {
        grid:
          'radial-gradient(circle at top, rgba(219,231,255,0.10), transparent 30%), linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: 'auto, 32px 32px, 32px 32px',
      },
    },
  },
  plugins: [],
};
