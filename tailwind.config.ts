import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          500: "#1f7ae0",
          600: "#1a63b8",
          700: "#154e91",
        },
      },
    },
  },
  plugins: [],
};

export default config;
