import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
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
          bg: "var(--landing-bg)",
          "bg-hero": "var(--landing-bg-hero)",
          "bg-section": "var(--landing-bg-section)",
          "bg-section-alt": "var(--landing-bg-section-alt)",
          "card-bg": "var(--landing-card-bg)",
          heading: "var(--landing-heading)",
          text: "var(--landing-text)",
          muted: "var(--landing-muted)",
          primary: "var(--landing-primary)",
          secondary: "var(--landing-secondary)",
          tertiary: "var(--landing-tertiary)",
          "primary-hover": "var(--landing-primary-hover)",
          "accent-pink": "var(--landing-accent-pink)",
          border: "var(--landing-border)",
          green: "var(--landing-green)",
        },
      },
      backgroundImage: {
        "landing-gradient-hero": "var(--landing-gradient-hero)",
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;

