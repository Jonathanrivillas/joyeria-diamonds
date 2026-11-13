import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        oro: {
          50: "#fbf8ef",
          100: "#f4ecd2",
          200: "#e8d6a1",
          300: "#dbbd6c",
          400: "#d0a645",
          500: "#b98a30",
          600: "#9a6c27",
          700: "#7a5123",
          800: "#654323",
          900: "#563921",
        },
      },
    },
  },
  plugins: [],
};

export default config;
