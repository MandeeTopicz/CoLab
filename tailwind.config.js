/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Base Neutrals */
        canvas: "#F9FAFB",
        surface: "#FFFFFF",
        toolbar: "#F3F4F6",
        border: "#E5E7EB",

        /* Text Colors */
        text: {
          primary: "#111827",
          secondary: "#374151",
          muted: "#6B7280",
          disabled: "#9CA3AF",
          inverse: "#FFFFFF",
        },

        /* Primary Brand / Action */
        primary: {
          DEFAULT: "#C5BAAF",
          hover: "#B4A79B",
          active: "#A29182",
          subtle: "#F3EFEB",
        },

        /* Link color (keep classic blue for text links) */
        link: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          active: "#1E40AF",
        },

        /* Accent / Creative Colors */
        accent: {
          yellow: "#FDE68A",
          pink: "#FBCFE8",
          green: "#BBF7D0",
          purple: "#DDD6FE",
          orange: "#FED7AA",
          teal: "#99F6E4",
        },

        /* Status Colors */
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
        info: "#0EA5E9",
      },

      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.05)",
        sm: "0 2px 6px rgba(0,0,0,0.08)",
        md: "0 6px 16px rgba(0,0,0,0.12)",
        lg: "0 12px 32px rgba(0,0,0,0.16)",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
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

