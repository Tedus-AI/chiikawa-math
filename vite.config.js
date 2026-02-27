import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/chiikawa-math/', // 加上這一行，這是為了 GitHub Pages 設定的
})