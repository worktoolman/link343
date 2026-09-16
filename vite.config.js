import { defineConfig } from 'vite'

export default defineConfig({
  // 相对路径：部署到 GitHub Pages 这类子目录时也能正常加载
  base: './',

  server: {
    host: true, // 监听 0.0.0.0，方便局域网调试
    port: 5173,
  },

  build: {
    outDir: 'dist',
    // 个人项目不需要 sourcemap
    sourcemap: false,
  },
})
