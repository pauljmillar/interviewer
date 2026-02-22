import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        landing: {
          heading: "var(--landing-heading)",
          muted: "var(--landing-muted)",
          accent: "var(--landing-accent)",
          "accent-hover": "var(--landing-accent-hover)",
        },
      },
    },
  },
  plugins: [],
};
export default config;

