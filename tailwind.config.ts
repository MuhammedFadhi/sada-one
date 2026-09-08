import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // SA'DA ONE brand
        navy:  { DEFAULT: '#0D1B2A', light: '#17294A' },
        teal:  { DEFAULT: '#17B8D0', dark:  '#0F8A9E' },
        gold:  { DEFAULT: '#C8A96E', dark:  '#A8894E' },
        // shadcn/ui CSS variable tokens
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        // Magic UI keyframes
        shimmer:        { from: { backgroundPosition: '0 0' }, to: { backgroundPosition: '-200% 0' } },
        shine:          { from: { backgroundPosition: '200% center' }, to: { backgroundPosition: '-200% center' } },
        borderBeam:     { '100%': { offsetDistance: '100%' } },
        meteor:         { '0%': { transform: 'rotate(215deg) translateX(0)', opacity: '1' }, '70%': { opacity: '1' }, '100%': { transform: 'rotate(215deg) translateX(-500px)', opacity: '0' } },
        ripple:         { '0%,100%': { transform: 'translate(-50%,-50%) scale(1)' }, '50%': { transform: 'translate(-50%,-50%) scale(0.9)' } },
        pulse:          { '0%,100%': { boxShadow: '0 0 0 0 var(--pulse-color)' }, '50%': { boxShadow: '0 0 0 8px var(--pulse-color)' } },
        marquee:        { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(calc(-100% - var(--gap)))' } },
        'marquee-vert': { from: { transform: 'translateY(0)' }, to: { transform: 'translateY(calc(-100% - var(--gap)))' } },
        gradient:       { to: { backgroundPosition: 'var(--bg-size) 0' } },
        'spin-slow':    { to: { transform: 'rotate(360deg)' } },
        'accordion-down':   { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':     { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in':      { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-up':      { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'number-ticker': { from: { transform: 'translateY(0)' }, to: { transform: 'translateY(calc(-100% * var(--count)))' } },
      },
      animation: {
        shimmer:        'shimmer 8s infinite',
        shine:          'shine var(--duration,3s) infinite linear',
        borderBeam:     'borderBeam calc(var(--duration)*1s) infinite linear',
        meteor:         'meteor var(--duration,5s) var(--delay,0s) infinite',
        ripple:         'ripple var(--duration,2s) ease calc(var(--i, 0)*.2s) infinite',
        pulse:          'pulse var(--duration,2s) ease-out infinite',
        marquee:        'marquee var(--duration,40s) infinite linear',
        'marquee-vert': 'marquee-vert var(--duration,40s) linear infinite',
        gradient:       'gradient var(--speed,8s) infinite linear',
        'spin-slow':    'spin-slow 3s linear infinite',
        'accordion-down':   'accordion-down 0.2s ease-out',
        'accordion-up':     'accordion-up 0.2s ease-out',
        'fade-in':      'fade-in 0.4s ease both',
        'fade-up':      'fade-up 0.5s ease both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
