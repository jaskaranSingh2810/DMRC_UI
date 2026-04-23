/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0B3A6F",
        sidebar: "#0B2A5B",
        borderLight: "#E5E7EB",
        dashboardBg: "#F5F7FA",
      },
      fontFamily: {
        sans: ["poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        xl: "12px",
      },
      backgroundImage: {
        'custom-gradient': 'linear-gradient(180deg, #003975 -44.76%, #7C1937 78.29%, #ED1C24 148.52%)',
        'button-gradient': 'linear-gradient(91deg, #003975 -5.96%, #7C1937 103.27%)',
      }
    },
  },
  plugins: [],
};
