import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import { brand, gris } from "./src/styles/tokens";

// Ver src/styles/tokens.ts para el significado de cada color.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neutral: gris,
        brand,
        success: colors.emerald,
        danger: colors.red,
        warning: colors.amber,
        info: colors.sky,
      },
      keyframes: {
        aparecer: { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        aparecer: "aparecer 150ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
