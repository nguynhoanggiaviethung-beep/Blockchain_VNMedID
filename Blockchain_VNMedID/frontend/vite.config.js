import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Cấu hình cho Vite bản mới (Vite 6+)
    allowedHosts: 'all',
    // Cấu hình bẻ khóa bảo mật cho Vite bản cũ (Vite 5 trở xuống)
    disableHostCheck: true 
  }
})