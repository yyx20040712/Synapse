import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import { cspHeaderValue } from './src/main/security/csp'

/**
 * CSP 单真相源：策略常量在 src/main/security/csp.ts，本插件把它的完整值作为
 * meta 注入 index.html（dev 与 build 一致）。生产走 file://，onHeadersReceived
 * 不拦截本地文件请求——meta 是实际生效的 CSP，必须与策略常量完全一致
 * （tests/security/csp-meta.test.ts + e2e 运行时断言双重强制）。
 */
function cspMetaPlugin(): Plugin {
  return {
    name: 'synapse-csp-meta',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: cspHeaderValue() },
        injectTo: 'head-prepend'
      }
    ]
  }
}

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
    plugins: [cspMetaPlugin(), react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') }
      }
    }
  }
})
