import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17211b',
        leaf: '#2f7d5b',
        mint: '#dff4e8',
        coral: '#ef6f5e',
        yolk: '#f4bf45',
        cloud: '#f7faf7'
      },
      boxShadow: {
        soft: '0 18px 40px rgba(23, 33, 27, 0.08)'
      }
    }
  },
  plugins: []
}

export default config
