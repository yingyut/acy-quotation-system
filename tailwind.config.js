/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        thai: ['Sarabun', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#0F4C81',
          light: '#3E7CB1',
          dark: '#0A3861',
        },
      },
    },
  },
  plugins: [],
};
