import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '化化姐的AI营养记录',
    short_name: '化化姐营养',
    description: '拍照识别、标准营养库校准、确认后记录、每日自动复盘。',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7faf7',
    theme_color: '#2f7d5b',
    orientation: 'portrait',
    categories: ['health', 'food', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      },
      {
        src: '/icons/maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable'
      }
    ]
  }
}
