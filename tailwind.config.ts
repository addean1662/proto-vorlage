import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0c0a07',
        parchment: '#d4c4a8',
        dss: '#c4a882',
        lxx: '#7ea8be',
        vul: '#a8b896',
        mt: '#d4a574',
      },
      fontFamily: {
        garamond: ['var(--font-garamond)', 'EB Garamond', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
