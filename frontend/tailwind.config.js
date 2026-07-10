/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Rouge Papatchino (couleur principale)
        brand: {
          50: '#fdf2f2', 100: '#fce4e4', 200: '#f9bcbc', 300: '#f08c8c',
          400: '#e35454', 500: '#d62027', 600: '#c01c22', 700: '#a0171c',
          800: '#7d1216', 900: '#5c0d10',
        },
        // Or / jaune Papatchino (couleur secondaire)
        gold: {
          50: '#fef9ec', 100: '#fdf0cb', 200: '#fbe08e', 300: '#f8cd50',
          400: '#f6c84c', 500: '#f4b62c', 600: '#d99a1f', 700: '#b4781a',
          800: '#925e1b', 900: '#784d19',
        },
      },
      fontFamily: {
        display: ['"Lilita One"', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        flash: {
          '0%, 100%': { backgroundColor: 'rgba(239,68,68,0)' },
          '50%': { backgroundColor: 'rgba(239,68,68,0.4)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(110%)' },
          to: { transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(.6)' },
          '60%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        flash: 'flash 0.8s ease-in-out infinite',
        'fade-up': 'fadeUp .45s ease-out both',
        'slide-up': 'slideUp .35s cubic-bezier(.16,1,.3,1) both',
        pop: 'pop .3s ease-out both',
      },
    },
  },
  plugins: [],
};
