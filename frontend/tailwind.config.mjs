/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "secondary-fixed": "#dae2fd",
        "tertiary-fixed-dim": "#bcc7de",
        "inverse-surface": "#213145",
        "surface-container": "#e5eeff",
        "surface-tint": "#0053db",
        "primary-container": "#2563eb",
        "on-primary-fixed": "#00174b",
        "on-tertiary-fixed": "#111c2d",
        "surface-variant": "#d3e4fe",
        "on-primary": "#ffffff",
        "secondary-fixed-dim": "#bec6e0",
        "surface-bright": "#f8f9ff",
        "surface-container-high": "#dce9ff",
        "inverse-primary": "#b4c5ff",
        "on-error": "#ffffff",
        "inverse-on-surface": "#eaf1ff",
        "on-surface-variant": "#434655",
        "tertiary-fixed": "#d8e3fb",
        "tertiary": "#4b566a",
        "on-secondary-fixed-variant": "#3f465c",
        "on-primary-fixed-variant": "#003ea8",
        "tertiary-container": "#636e83",
        "surface-container-highest": "#d3e4fe",
        "on-secondary-fixed": "#131b2e",
        "on-secondary-container": "#5c647a",
        "background": "#f8f9ff",
        "on-secondary": "#ffffff",
        "primary": {
          DEFAULT: "var(--primary, #004ac6)",
          hover: "var(--primary-hover, #003ea8)",
          foreground: "var(--primary-foreground, #ffffff)",
        },
        "border": {
          DEFAULT: "var(--border)",
          input: "var(--input-border)",
        },
        "ring": "var(--ring)",
        "brand": {
          zalo: {
            DEFAULT: "var(--brand-zalo)",
            hover: "var(--brand-zalo-hover)",
          },
        },
        "card": {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        "danger": {
          DEFAULT: "var(--danger)",
          hover: "var(--danger-hover)",
          foreground: "var(--danger-foreground)",
        },
        "success": {
          DEFAULT: "var(--success)",
        },
        "warning": {
          DEFAULT: "var(--warning)",
        },
        "on-error-container": "#93000a",
        "primary-fixed": "#dbe1ff",
        "secondary-container": "#dae2fd",
        "on-surface": "#0b1c30",
        "on-tertiary-container": "#ecf1ff",
        "secondary": "#565e74",
        "on-primary-container": "#eeefff",
        "on-tertiary-fixed-variant": "#3c475a",
        "surface": "#f8f9ff",
        "surface-container-lowest": "#ffffff",
        "outline-variant": "#c3c6d7",
        "error": "#ba1a1a",
        "on-tertiary": "#ffffff",
        "outline": "#737686",
        "surface-container-low": "#eff4ff",
        "on-background": "#0b1c30",
        "primary-fixed-dim": "#b4c5ff",
        "surface-dim": "#cbdbf5",
        "error-container": "#ffdad6"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "space-xl": "2rem",
        "space-md": "1rem",
        "space-sm": "0.5rem",
        "gutter": "1.5rem",
        "space-lg": "1.5rem",
        "margin-sm": "1rem",
        "gutter-sm": "1rem",
        "margin": "2rem",
        "space-xs": "0.25rem"
      },
      fontFamily: {
        sans: ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "body-lg": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "body-md": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "title-sm": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "title-md": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "body-sm": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "headline-md": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "headline-lg": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "label-lg": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "display-lg": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "label-caps": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "display-lg-mobile": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "label-md": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"],
        "headline-sm": ["var(--font-be-vietnam-pro)", "Be Vietnam Pro", "sans-serif"]
      },
      fontSize: {
        "body-lg": ["16px", { lineHeight: "24px", letterSpacing: "0", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", letterSpacing: "0", fontWeight: "400" }],
        "title-sm": ["16px", { lineHeight: "24px", letterSpacing: "0", fontWeight: "600" }],
        "title-md": ["18px", { lineHeight: "26px", letterSpacing: "0", fontWeight: "600" }],
        "body-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg": ["30px", { lineHeight: "38px", letterSpacing: "-0.015em", fontWeight: "600" }],
        "label-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.005em", fontWeight: "600" }],
        "display-lg": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "label-caps": ["11px", { lineHeight: "16px", letterSpacing: "0.06em", fontWeight: "700" }],
        "display-lg-mobile": ["28px", { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
        "headline-sm": ["20px", { lineHeight: "28px", letterSpacing: "-0.005em", fontWeight: "600" }]
      }
    }
  }
};

export default config;
