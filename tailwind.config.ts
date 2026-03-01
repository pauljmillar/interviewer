import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'media',
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
          text: "var(--landing-text)",
          primary: "var(--landing-primary)",
          secondary: "var(--landing-secondary)",
          tertiary: "var(--landing-tertiary)",
          "primary-hover": "var(--landing-primary-hover)",
        },
      },
    },
  },
  plugins: [],
};
export default config;

