import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * electron-vite 三段构建配置。
 * - main：Node 侧，better-sqlite3 等原生依赖 external，SQL 迁移经 ?raw 内联打包
 * - preload：沙箱桥（CJS .cjs——沙箱渲染器不支持 ESM preload；zod 打进 bundle，
 *   沙箱 preload 只允许 require('electron')，不能加载外部模块）
 * - renderer：React SPA，root 限定 src/renderer，禁止访问 main/preload 源码
 */
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['zod'] })],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
          chunkFileNames: '[name].cjs'
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') }
      }
    }
  }
})
