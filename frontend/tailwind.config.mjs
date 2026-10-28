/** @type {import('tailwindcss').Config} */
const config = {
    darkMode: "class",
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                muted: {
                    DEFAULT: "var(--muted)",
                    foreground: "var(--muted-foreground)",
                },
                primary: {
                    DEFAULT: "var(--primary)",
                    hover: "var(--primary-hover)",
                    foreground: "var(--primary-foreground)",
                },
                secondary: {
                    DEFAULT: "var(--secondary)",
                    hover: "var(--secondary-hover)",
                    foreground: "var(--secondary-foreground)",
                },
                border: {
                    DEFAULT: "var(--border)",
                    input: "var(--input-border)",
                },
                ring: "var(--ring)",
                brand: {
                    zalo: {
                        DEFAULT: "var(--brand-zalo)",
                        hover: "var(--brand-zalo-hover)",
                    },
                },
                card: {
                    DEFAULT: "var(--card)",
                    foreground: "var(--card-foreground)",
                },
                danger: {
                    DEFAULT: "var(--danger)",
                    hover: "var(--danger-hover)",
                    foreground: "var(--danger-foreground)",
                },
                success: {
                    DEFAULT: "var(--success)",
                },
                warning: {
                    DEFAULT: "var(--warning)",
                },
                error: "var(--danger)",
                surface: {
                    DEFAULT: "var(--card)",
                    bright: "var(--card)",
                    variant: "var(--surface-variant)",
                    dim: "var(--surface-dim)",
                    tint: "var(--primary)",
                    "container": "var(--background)",
                    "container-low": "var(--surface-container-low)",
                    "container-high": "var(--surface-variant)",
                    "container-highest": "var(--border)",
                    "container-lowest": "var(--card)",
                },
                "on-surface": "var(--foreground)",
                "on-surface-variant": "var(--muted)",
                "on-background": "var(--foreground)",
                "on-primary": "var(--primary-foreground)",
                "on-secondary": "var(--secondary-foreground)",
                "on-error": "var(--danger-foreground)",
                "outline": "var(--outline)",
                "outline-variant": "var(--border)",
                toast: {
                    success: {
                        border: "var(--toast-success-border)",
                        bg: "var(--toast-success-bg)",
                        text: "var(--toast-success-text)",
                        icon: "var(--toast-success-icon)",
                        progress: "var(--toast-success-progress)",
                    },
                    error: {
                        border: "var(--toast-error-border)",
                        bg: "var(--toast-error-bg)",
                        text: "var(--toast-error-text)",
                        icon: "var(--toast-error-icon)",
                        progress: "var(--toast-error-progress)",
                    },
                    warning: {
                        border: "var(--toast-warning-border)",
                        bg: "var(--toast-warning-bg)",
                        text: "var(--toast-warning-text)",
                        icon: "var(--toast-warning-icon)",
                        progress: "var(--toast-warning-progress)",
                    },
                    info: {
                        border: "var(--toast-info-border)",
                        bg: "var(--toast-info-bg)",
                        text: "var(--toast-info-text)",
                        icon: "var(--toast-info-icon)",
                        progress: "var(--toast-info-progress)",
                    },
                },
                uav: {
                    red: {
                        DEFAULT: "var(--uav-color-primary)",
                        hover: "var(--uav-color-primary-hover)",
                        light: "var(--uav-color-primary-light)",
                    },
                    blue: {
                        DEFAULT: "var(--uav-color-blue)",
                        hover: "var(--uav-color-blue-hover)",
                        light: "var(--uav-color-blue-light)",
                    },
                    amber: {
                        DEFAULT: "var(--warning)",
                        hover: "var(--uav-color-warning)",
                        light: "var(--uav-color-warning-light)",
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
                "radar-sweep": {
                    "from": {transform: "rotate(0deg)"},
                    "to": {transform: "rotate(360deg)"},
                },
                "laser-scan": {
                    "0%": {top: "0%", opacity: "0"},
                    "15%": {opacity: "1"},
                    "85%": {opacity: "1"},
                    "100%": {top: "100%", opacity: "0"},
                },
                "uav-hover": {
                    "0%, 100%": {transform: "translateY(0px) rotate(0deg)"},
                    "50%": {transform: "translateY(-7px) rotate(1deg)"},
                },
                "pulse-ring": {
                    "0%, 100%": {transform: "scale(0.95)", opacity: "0.8"},
                    "50%": {transform: "scale(1.15)", opacity: "0.3"},
                },
            },
            animation: {
                "slide-in-right": "slide-in-right 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                "slide-out-right": "slide-out-right 0.28s cubic-bezier(0.7, 0, 0.84, 0) forwards",
                "toast-progress": "toast-progress linear forwards",
                "sweep": "radar-sweep 4s linear infinite",
                "scan": "laser-scan 2.6s ease-in-out infinite",
                "uav-hover": "uav-hover 3.2s ease-in-out infinite",
                "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },
            borderRadius: {
                // Shape scale lives in CSS variables (src/styles/globals.css) so a portal can override it.
                panel: "var(--radius-panel)",
                control: "var(--radius-control)",
                badge: "var(--radius-badge)",
                overlay: "var(--radius-overlay)",
                DEFAULT: "0.25rem",
                lg: "0.5rem",
                xl: "0.75rem",
                full: "9999px",
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
                "space-xs": "0.25rem",
            },
            fontFamily: {
                sans: ["var(--uav-font-sans)", "Arial", "Helvetica", "sans-serif"],
                mono: ["var(--uav-font-sans)", "Arial", "Helvetica", "sans-serif"],
                serif: ["var(--uav-font-sans)", "Arial", "Helvetica", "sans-serif"],
            },
        },
    },
};

export default config;
