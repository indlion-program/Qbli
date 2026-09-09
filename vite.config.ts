import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        // Stable identity for the installed app. Play's PWA tooling and Bubblewrap
        // both key off this — changing it later orphans existing installs.
        id: '/',
        name: 'Qbli — קבלות לעסקים קטנים',
        short_name: 'Qbli',
        description: 'צור וניהל קבלות בקלות, בחינם, ללא שרת',
        theme_color: '#1D9E75',
        background_color: '#F7F7F5',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'he',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/screenshots/home.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'מסך הבית — סיכום הכנסות וקבלות אחרונות',
          },
          {
            src: '/screenshots/new-receipt.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'יצירת קבלה חדשה',
          },
          {
            src: '/screenshots/clients.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'ניהול לקוחות',
          },
          {
            src: '/screenshots/reports.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'דוחות הכנסה',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        // Store-listing screenshots are only ever fetched by the browser's
        // install prompt. Precaching them would push ~380KB onto every device
        // for images the app itself never displays.
        globIgnores: ['**/screenshots/**'],
        navigateFallback: 'index.html',
        // The service worker must not rewrite these to index.html: Digital Asset
        // Links verification and the Play-required privacy policy have to be
        // served as themselves, or the TWA launches with a browser address bar.
        navigateFallbackDenylist: [/^\/\.well-known\//, /^\/privacy\.html$/],
      },
    }),
  ],
})
