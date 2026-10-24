/** @type {import('tailwindcss').Config} */
const config = {
    darkMode: "class",
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                "secondary-fixed": "#e8f5e9",
                "tertiary-fixed-dim": "#cbd5e1",
                "inverse-surface": "#202020",
                "surface-container": "#f8f9fa",
                "surface-tint": "#ab2523",
                "primary-container": "#ab2523",
                "on-primary-fixed": "#5b0f0e",
                "on-tertiary-fixed": "#1e293b",
                "surface-variant": "#f1f3f5",
                "on-primary": "#ffffff",
                "secondary-fixed-dim": "#c8e6c9",
                "surface-bright": "#ffffff",
                "surface-container-high": "#f1f3f5",
                "inverse-primary": "#fca5a5",
                "on-error": "#ffffff",
                "inverse-on-surface": "#f9fafb",
                "on-surface-variant": "#4b5563",
                "tertiary-fixed": "#e2e8f0",
                "tertiary": "#4b5563",
                "on-secondary-fixed-variant": "#2e7d32",
                "on-primary-fixed-variant": "#8f1c1a",
                "tertiary-container": "#64748b",
                "surface-container-highest": "#e5e7eb",
                "on-secondary-fixed": "#004d25",
                "on-secondary-container": "#004d25",
                "background": "#f8f9fa",
                "on-secondary": "#ffffff",
                "primary": {
                    DEFAULT: "var(--primary, #ab2523)",
                    hover: "var(--primary-hover, #8f1c1a)",
                    foreground: "var(--primary-foreground, #ffffff)",
                },
                "border": {
                    DEFAULT: "var(--border, #e5e7eb)",
                    input: "var(--input-border, #d1d5db)",
                },
                "ring": "var(--ring, #ab2523)",
                "brand": {
                    zalo: {
                        DEFAULT: "var(--brand-zalo)",
                        hover: "var(--brand-zalo-hover)",
                    },
                },
                "card": {
                    DEFAULT: "var(--card, #ffffff)",
                    foreground: "var(--card-foreground, #202020)",
                },
                "danger": {
                    DEFAULT: "var(--danger, #ba1a1a)",
                    hover: "var(--danger-hover, #8b0000)",
                    foreground: "var(--danger-foreground, #ffffff)",
                },
                "success": {
                    DEFAULT: "var(--success, #007f3e)",
                },
                "warning": {
                    DEFAULT: "var(--warning, #f59e0b)",
                },
                "on-error-container": "#93000a",
                "primary-fixed": "#fce7e7",
                "secondary-container": "#ecfdf5",
                "on-surface": "#202020",
                "on-tertiary-container": "#f1f5f9",
                "secondary": "#007f3e",
                "on-primary-container": "#ffffff",
                "on-tertiary-fixed-variant": "#334155",
                "surface": "#f8f9fa",
                "surface-container-lowest": "#ffffff",
                "outline-variant": "#e5e7eb",
                "error": "#ba1a1a",
                "on-tertiary": "#ffffff",
                "outline": "#9ca3af",
                "surface-container-low": "#fafafa",
                "on-background": "#202020",
                "primary-fixed-dim": "#f8b4b4",
                "surface-dim": "#f3f4f6",
                "error-container": "#fee2e2",
                toast: {
                    success: {
                        border: "#007f3e",
                        bg: "#ecfdf5",
                        text: "#065f46",
                        icon: "#007f3e",
                        progress: "#007f3e",
                    },
                    error: {
                        border: "#ab2523",
                        bg: "#fdf2f2",
                        text: "#991b1b",
                        icon: "#ab2523",
                        progress: "#ab2523",
                    },
                    warning: {
                        border: "#f59e0b",
                        bg: "#fffbeb",
                        text: "#92400e",
                        icon: "#d97706",
                        progress: "#f59e0b",
                    },
                    info: {
                        border: "#004ac6",
                        bg: "#eff4ff",
                        text: "#1e40af",
                        icon: "#004ac6",
                        progress: "#004ac6",
                    },
                },
                uav: {
                    red: {
                        DEFAULT: "#ab2523",
                        hover: "#8f1c1a",
                        light: "#fdf2f2",
                    },
                    green: {
                        DEFAULT: "#007f3e",
                        hover: "#006632",
                        light: "#ecfdf5",
                    },
                    blue: {
                        DEFAULT: "#004ac6",
                        hover: "#003799",
                        light: "#eff4ff",
                    },
                    amber: {
                        DEFAULT: "#f59e0b",
                        hover: "#d97706",
                        light: "#fffbeb",
                    },
                },
            },
            keyframes: {
                "slide-in-right": {
                    "0%": {transform: "translateX(115%)", opacity: "0"},
                    "65%": {transform: "translateX(-4px)", opacity: "1"},
                    "100%": {transform: "translateX(0)", opacity: "1"},
                },
                "slide-out-right": {
                    "0%": {transform: "translateX(0)", opacity: "1"},
                    "100%": {transform: "translateX(115%)", opacity: "0"},
                },
                "toast-progress": {
                    "0%": {width: "100%"},
                    "100%": {width: "0%"},
                },
            },
            animation: {
                "slide-in-right": "slide-in-right 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                "slide-out-right": "slide-out-right 0.28s cubic-bezier(0.7, 0, 0.84, 0) forwards",
                "toast-progress": "toast-progress linear forwards",
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
                sans: ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "body-lg": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "body-md": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "title-sm": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "title-md": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "body-sm": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "headline-md": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "headline-lg": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "label-lg": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "display-lg": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "label-caps": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "display-lg-mobile": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "label-md": ["var(--uav-font-sans)", "Arial", "sans-serif"],
                "headline-sm": ["var(--uav-font-sans)", "Arial", "sans-serif"]
            },
            fontSize: {
                "body-lg": ["16px", {lineHeight: "24px", letterSpacing: "0", fontWeight: "400"}],
                "body-md": ["14px", {lineHeight: "20px", letterSpacing: "0", fontWeight: "400"}],
                "title-sm": ["16px", {lineHeight: "24px", letterSpacing: "0", fontWeight: "600"}],
                "title-md": ["18px", {lineHeight: "26px", letterSpacing: "0", fontWeight: "600"}],
                "body-sm": ["12px", {lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "400"}],
                "headline-md": ["24px", {lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600"}],
                "headline-lg": ["30px", {lineHeight: "38px", letterSpacing: "-0.015em", fontWeight: "600"}],
                "label-lg": ["14px", {lineHeight: "20px", letterSpacing: "0.005em", fontWeight: "600"}],
                "display-lg": ["36px", {lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700"}],
                "label-caps": ["11px", {lineHeight: "16px", letterSpacing: "0.06em", fontWeight: "700"}],
                "display-lg-mobile": ["28px", {lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "700"}],
                "label-md": ["12px", {lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500"}],
                "headline-sm": ["20px", {lineHeight: "28px", letterSpacing: "-0.005em", fontWeight: "600"}]
            }
        }
    }
};

export default config;
