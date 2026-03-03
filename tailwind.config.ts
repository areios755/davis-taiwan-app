import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        davis: {
          navy: '#0B1E3D',
          blue: '#1A4A9E',
          accent: '#1A6FD4',
          light: '#E8F0FE',
          gold: '#D4A843',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', '"Noto Sans JP"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
