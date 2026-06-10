/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tvde: {
          dark: '#0f172a',      
          primary: '#3b82f6',   
          secondary: '#64748b', 
          accent: '#10b981',    
          danger: '#ef4444',    
          bg: '#f8fafc'         
        }
      }
    },
  },
  plugins: [],
}