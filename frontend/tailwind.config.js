/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'node-bg': 'var(--node-bg)',
        'node-border': 'var(--node-border)',
        'node-border-selected': 'var(--node-border-selected)',
        'node-text': 'var(--node-text)',
        'node-text-secondary': 'var(--node-text-secondary)',
        'node-icon-color': 'var(--node-icon-color)',
        'accent-cyan': 'var(--accent-cyan)',
        'accent-cyan-darker': 'var(--accent-cyan-darker)',
        'accent-pink': 'var(--accent-pink)',
        'accent-green': 'var(--accent-green)',
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'input-bg': 'var(--input-bg)',
        'input-border': 'var(--input-border)',
        'menu-bg': 'var(--menu-bg)',
        'menu-border': 'var(--menu-border)',
        'menu-text': 'var(--menu-text)',
        'menu-text-secondary': 'var(--menu-text-secondary)',
        'menu-hover-bg': 'var(--menu-hover-bg)',
        'menu-hover-text': 'var(--menu-hover-text)',
        'menu-active-bg': 'var(--menu-active-bg)',
        'menu-active-text': 'var(--menu-active-text)',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
}
