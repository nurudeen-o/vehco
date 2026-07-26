import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0F6B4B",
          secondary: "#1E8E5A",
          accent: "#F4B400",
          background: "#F8FAFC",
          surface: "#FFFFFF",
          text: "#1F2937",
          border: "#E2E8F0",
          muted: "#64748B",
        },
      },
    },
  },
  plugins: [],
};
export default config;
