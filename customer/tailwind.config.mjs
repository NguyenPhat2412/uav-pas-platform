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
                // UavLoader: the ground shadow shrinks as the airframe rises; nav lights blink twice a cycle.
                "uav-shadow": {
                    "0%, 100%": {transform: "scaleX(1)", opacity: "0.18"},
                    "50%": {transform: "scaleX(0.78)", opacity: "0.08"},
                },
                "nav-blink": {
                    "0%, 60%, 100%": {opacity: "1"},
                    "70%, 90%": {opacity: "0.15"},
                },
                // Weather icons: clouds and rain drift a few pixels; the sun turns slowly.
                "weather-float": {
                    "0%, 100%": {transform: "translateY(0)"},
                    "50%": {transform: "translateY(-3px)"},
                },
                // WeatherBackdrop: falling drops/flakes, drifting clouds and fog, twinkling stars, lightning, sun glow.
                "sky-fall": {
                    "0%": {transform: "translate3d(0, -40px, 0)", opacity: "0"},
                    "10%": {opacity: "1"},
                    "100%": {transform: "translate3d(var(--sky-wind, 0px), 260px, 0)", opacity: "0.9"},
                },
                "sky-drift": {
                    "0%": {transform: "translate3d(-30%, 0, 0)"},
                    "100%": {transform: "translate3d(130%, 0, 0)"},
                },
                "sky-twinkle": {
                    "0%, 100%": {opacity: "0.25"},
                    "50%": {opacity: "1"},
                },
                "sky-flash": {
                    "0%, 86%, 100%": {opacity: "0"},
                    "88%": {opacity: "0.55"},
                    "90%": {opacity: "0.05"},
                    "92%": {opacity: "0.4"},
                },
                "sky-glow": {
                    "0%, 100%": {transform: "scale(1)", opacity: "0.75"},
                    "50%": {transform: "scale(1.12)", opacity: "1"},
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
                "rotor": "radar-sweep 0.28s linear infinite",
                "rotor-reverse": "radar-sweep 0.28s linear infinite reverse",
                "uav-bob": "uav-hover 1.8s ease-in-out infinite",
                "uav-shadow": "uav-shadow 1.8s ease-in-out infinite",
                "nav-blink": "nav-blink 1.2s steps(1, end) infinite",
                "weather-float": "weather-float 3.2s ease-in-out infinite",
                "weather-sun": "radar-sweep 18s linear infinite",
                "sky-fall": "sky-fall 1s linear infinite",
                "sky-drift": "sky-drift 60s linear infinite",
                "sky-twinkle": "sky-twinkle 3s ease-in-out infinite",
                "sky-flash": "sky-flash 7s linear infinite",
                "sky-glow": "sky-glow 6s ease-in-out infinite",
                "sky-rays": "radar-sweep 80s linear infinite",
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
