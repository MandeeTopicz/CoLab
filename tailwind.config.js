/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Base Neutrals */
        canvas: "#F0F4F8",
        surface: "#FFFFFF",
        toolbar: "#E8EEF4",
        border: "#D1DDE8",

        /* Text Colors */
        text: {
          primary: "#0F172A",
          secondary: "#334155",
          muted: "#64748B",
          disabled: "#94A3B8",
          inverse: "#FFFFFF",
        },

        /* Primary (buttons and focus rings) */
        primary: {
          DEFAULT: "#8093F1",
          hover: "#6B7FED",
          active: "#5A6BDB",
          subtle: "#E0E5FC",
        },

        /* Link color */
        link: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
          active: "#1D4ED8",
        },

        /* Accent / Creative (blue-green-purple theme) */
        accent: {
          blue: "#93C5FD",
          green: "#6EE7B7",
          purple: "#C4B5FD",
          yellow: "#FDE68A",
          pink: "#FBCFE8",
          orange: "#FED7AA",
          teal: "#99F6E4",
        },

        /* Status Colors */
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#DC2626",
        info: "#3B82F6",
      },

      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #3B82F6 0%, #10B981 50%, #8B5CF6 100%)",
        "gradient-brand-hover": "linear-gradient(135deg, #2563EB 0%, #059669 50%, #7C3AED 100%)",
        "gradient-subtle": "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 50%, rgba(139, 92, 246, 0.08) 100%)",
      },

      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.05)",
        sm: "0 2px 6px rgba(0,0,0,0.08)",
        md: "0 6px 16px rgba(0,0,0,0.12)",
        lg: "0 12px 32px rgba(0,0,0,0.16)",
      },

      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },

      transitionTimingFunction: {
        soft: "cubic-bezier(0, 0, 0.2, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "180ms",
        slow: "260ms",
      },
    },
  },
}

