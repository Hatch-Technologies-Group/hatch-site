import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    fontSize: {
      xs: ['0.75rem', '1.15rem'],
      sm: ['0.875rem', '1.35rem'],
      base: ['0.95rem', '1.5rem'],
      lg: ['1.125rem', '1.65rem'],
      xl: ['1.25rem', '1.75rem'],
      '2xl': ['1.5rem', '1.9rem'],
      '3xl': ['1.875rem', '2.2rem']
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-satoshi)', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#f5f8ff',
          100: '#e6efff',
          200: '#c5d8ff',
          300: '#97b7ff',
          400: '#6992ff',
          500: '#1f5fff',
          600: '#1a54e6',
          700: '#1543b4',
          800: '#103384',
          900: '#0c2665'
        },
        hatch: {
          primary: '#1f5fff',
          primaryAccent: '#0078ff',
          surface: '#f8faff',
          card: '#ffffff',
          text: '#1c1c1e',
          muted: '#6b7280',
          border: '#e5e7eb',
          success: '#00c853',
          warning: '#ffb300',
          danger: '#ff3b30',
          neutral: '#e5e7eb',
          gradient: 'linear-gradient(90deg, #1F5FFF 0%, #396CFF 50%, #2A47FF 100%)'
        }
      },
      backgroundImage: {
        'hatch-glass':
          'linear-gradient(135deg, rgba(31,95,255,0.82) 0%, rgba(57,108,255,0.68) 100%)'
      },
      boxShadow: {
        'hatch-card': '0 12px 24px -12px rgba(15,52,119,0.25)'
      }
    }
  },
  plugins: []
};

export default config;
