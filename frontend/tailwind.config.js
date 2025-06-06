/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'border-primary': 'var(--border-primary)',
        'border-secondary': 'var(--border-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'accent-main': 'var(--accent-main)',
        'accent-main-glow': 'var(--accent-main-glow)',
        'accent-warn': 'var(--accent-warn)',
        'accent-danger': 'var(--accent-danger)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 4px var(--accent-main-glow)',
        'glow': '0 0 8px var(--accent-main-glow)',
        'glow-lg': '0 0 12px var(--accent-main-glow)',
        'glow-xl': '0 0 16px var(--accent-main-glow)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
    plugin(function({ addUtilities, theme }) {
      addUtilities({
        '.frosted-glass': {
          'background-color': 'rgba(13, 17, 23, 0.75)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          'border': `1px solid ${theme('colors.border-primary')}`,
        },
        '.bg-grid': {
          'background-image': `linear-gradient(${theme('colors.border-primary')} 1px, transparent 1px), linear-gradient(to right, ${theme('colors.border-primary')} 1px, transparent 1px)`,
          'background-size': '2rem 2rem',
        },
        '.chamfer-clip': {
          'clip-path': 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)',
        },
      });
    }),
  ],
};
