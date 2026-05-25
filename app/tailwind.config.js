/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        pink: {
          50: '#FFF5F7',
          100: '#FFE4EC',
          200: '#FFB6C1',
          300: '#FF9EB5',
          400: '#FF69B4',
          500: '#E850A0',
        },
        sidebar: {
          bg: '#1A1025',
          hover: '#2A1A3A',
          active: '#3D2652',
          text: '#B8A9C9',
          icon: '#E8D5F5',
        },
        'rose-gold': '#E8A0BF',
        'gold': '#D4A574',
        plum: {
          50: '#FAF5FA',
          100: '#F0E6F0',
          700: '#A093A5',
          800: '#6B5B6E',
          900: '#2D1B2E',
        },
        'purple-memory': '#C8A8E9',
        'pink-memory': '#FFB6C1',
        'gold-milestone': '#D4AF37',
      },
      fontFamily: {
        display: ['"ZCOOL QingKe HuangYou"', 'serif'],
        body: ['Nunito', 'sans-serif'],
        number: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        sm: '0 1px 3px rgba(45,27,46,0.06)',
        md: '0 4px 16px rgba(45,27,46,0.08)',
        lg: '0 8px 32px rgba(45,27,46,0.12)',
        glow: '0 0 24px rgba(255,182,193,0.25)',
        sidebar: '4px 0 24px rgba(26,16,37,0.15)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        breathing: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float-orb': {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '0.3' },
          '33%': { transform: 'translate(30px, -40px) scale(1.1)', opacity: '0.5' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)', opacity: '0.4' },
          '100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.3' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,182,193,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255,182,193,0.6)' },
        },
        'ring-pulse': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        breathing: 'breathing 8s ease infinite',
        'float-orb': 'float-orb 12s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'ring-pulse': 'ring-pulse 1.5s ease-out infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
