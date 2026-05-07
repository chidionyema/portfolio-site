/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Light editorial palette. The dark dashboard look is reserved
        // for the embedded "operations console" panel (live topology,
        // dock, demo cards) which retains its own dark surface so it
        // reads as a separate device embedded in the article.
        base: '#FAFAF7',         // warm off-white page background
        surface: '#FFFFFF',      // card surface
        'surface-warm': '#F4F1EA', // slightly warmer secondary surface
        'panel-dark': '#0B0B0E', // for the embedded ops console panel
        border: '#E8E5DE',       // hairline borders on light surfaces
        'border-strong': '#D9D4C8',

        // States — readable on cream backgrounds
        success: '#15803D',
        info: '#1E40AF',
        warning: '#B45309',
        error: '#B91C1C',

        // Accent — deep navy-purple, the only saturated colour on the
        // editorial side. Dashboard sections use their own brighter
        // neon tokens scoped to their dark surfaces.
        accent: {
          DEFAULT: '#3B2D87',
          light: '#5B3FD6',
        },

        // Text — warm-black not pure-black, easier on cream
        primary: '#14110F',
        secondary: '#3D3833',
        muted: '#6B665E',
      },
      fontFamily: {
        // Display = Fraunces (variable serif already imported in
        // BaseLayout). Body = Inter.
        display: ['"Fraunces Variable"', 'Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
