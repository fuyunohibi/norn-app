/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./App.tsx", 
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./modules/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // NORN Brand Colors
        primary: {
          accent: '#FF7300',    // Primary accent color
          button: '#306DEE',    // Primary button blue
          DEFAULT: '#FF7300',
        },
        secondary: {
          button: '#383839',    // Secondary button black/charcoal
          DEFAULT: '#383839',
        },
        // Headspace-inspired neutral palette
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EEEEEE', 
          300: '#E0E0E0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
        },
        // Status colors inspired by Headspace
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
      },
      fontFamily: {
        // Custom Helvetica fonts - font names must match exactly what's registered in useFonts
        'hell': 'Helvetica',
        'hell-round-bold': 'HelveticaRoundedBold',
        // Default fonts (using Helvetica as base)
        'sans': 'Helvetica',
        'display': 'Helvetica',
      },
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
        '5xl': '48px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.15)',
        'large': '0 8px 32px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};
