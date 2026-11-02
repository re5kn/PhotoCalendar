import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 開発時は /api を .NET バックエンドへ中継する。
// Docker Compose で動かすときは API_URL=http://api:5080 が渡される。
// ビルド結果はバックエンドの wwwroot に出力し、同じポートで配信できるようにする。
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:5080',
    },
    watch: {
      // Windows 側のファイルシステムをマウントしているとファイル変更通知が届かないので、ポーリングに切り替える
      usePolling: process.env.WATCH_POLLING === 'true',
    },
  },
  build: {
    outDir: '../backend/PhotoCalendar.Api/wwwroot',
    emptyOutDir: true,
  },
})
