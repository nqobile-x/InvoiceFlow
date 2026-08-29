/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0A1628",
          gold: "#C9A84C",
          cream: "#F8F6F1",
          slate: "#4A5568",
        },
      },
    },
  },
  plugins: [],
};
