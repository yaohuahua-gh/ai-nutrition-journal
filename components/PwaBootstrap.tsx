'use client'

import { useEffect } from 'react'

export function PwaBootstrap() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // PWA still works without offline caching if registration is blocked.
    })
  }, [])

  return null
}
