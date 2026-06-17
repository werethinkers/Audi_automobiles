/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E40AF', // Royal Blue
          light: '#DBEAFE',
          dark: '#1E3A8A'
        },
        success: {
          DEFAULT: '#166534', // Forest Green
          light: '#DCFCE7'
        },
        warning: {
          DEFAULT: '#92400E', // Dark Amber
          light: '#FEF3C7'
        },
        danger: {
          DEFAULT: '#991B1B', // Deep Red
          light: '#FEE2E2'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif']
      }
    },
  },
  plugins: [],
}
