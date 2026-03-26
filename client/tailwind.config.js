/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5fa',
          100: '#dfe9f2',
          200: '#bfd3e5',
          300: '#99b9d5',
          400: '#7da3c3',
          500: '#7095B4',
          600: '#5c80a0',
          700: '#496b8c',
          800: '#365878',
          900: '#232856',
          950: '#171c3a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
