import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 開発時は /api を .NET バックエンドへ中継する。
// ビルド結果はバックエンドの wwwroot に出力し、同じポートで配信できるようにする。
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5080',
    },
  },
  build: {
    outDir: '../backend/PhotoCalendar.Api/wwwroot',
    emptyOutDir: true,
  },
})
