/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./packages/**/*.{js,ts,jsx,tsx}",
    // The featuredraw plugin (file:../featuredraw) uses tailwind utilities; generate them here.
    "./node_modules/@flamapy/plugin-featuredraw/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VSCode-style / featuredraw surfaces (light theme defaults).
        surface: "#f6f7f9", // app body background
        panel: "#f3f4f6", // side / right panels
        tabbar: "#eceef2", // editor tab strip
        accent: "#2b6cff", // active / selected
      },
    },
  },
  plugins: [],
};
