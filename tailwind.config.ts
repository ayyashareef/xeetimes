import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#c8102e',
          50: '#fef2f3',
          100: '#fde3e6',
          200: '#fbccd2',
          300: '#f7a3ae',
          400: '#f16a7d',
          500: '#e63b52',
          600: '#c8102e',
          700: '#a50d26',
          800: '#880c22',
          900: '#720f21',
          950: '#3f040d',
        },
        secondary: {
          DEFAULT: '#1b396f',
          50: '#eef3ff',
          100: '#dde6ff',
          200: '#b3c7ff',
          300: '#7ea0ff',
          400: '#4a73e0',
          500: '#2952b8',
          600: '#1b396f',
          700: '#162e5a',
          800: '#112347',
          900: '#0d1a35',
          950: '#080f20',
        },
      },
      fontFamily: {
        'dv-heading': ['mvwaheed', 'sans-serif'],
        'dv-bold': ['mvaahmufk', 'sans-serif'],
        'dv-body': ['utheemu', 'sans-serif'],
        'en-heading': ['Inter', 'system-ui', 'sans-serif'],
        'en-body': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
