/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Solarized Light palette
        solarized: {
          base03: '#002b36',
          base02: '#073642',
          base01: '#586e75',
          base00: '#657b83',
          base0: '#839496',
          base1: '#93a1a1',
          base2: '#eee8d5',
          base3: '#faf9f6',
          // Text colors optimized for off-white background
          textBody: '#374151',
          textHeading: '#1e293b',
          textSecondary: '#4a5568',
          violet: '#6c71c4',
          blue: '#268bd2',
          cyan: '#2aa198',
          green: '#1a7f52',
          sharpieViolet: 'rgb(198, 190, 226)',
          tintViolet: '#f3f1f7',
        },
      },
      fontFamily: {
        sans: ['Karla', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
