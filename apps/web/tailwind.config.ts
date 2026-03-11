import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 20px 50px rgba(47, 31, 18, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

