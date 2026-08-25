import tseslint from 'typescript-eslint'

/**
 * ESLint 扁平配置 —— 架构规则的可执行化（教训 C1：文档无强制等于没写）。
 * 关卡：
 * 1. max-lines 500（error）——文件是 AI 上下文的基本单位（教训 B1）
 * 2. 分层边界 no-restricted-imports——依赖方向违规即红
 * 3. renderer 禁 Node/Electron——最小权限（安全 §6.1）
 * 4. 禁 any / eval——弱模型幻觉的第一道闸
 * 5. features 跨域互引由 scripts/check-quality.mjs 静态检查（glob 表达不了的相对路径规则）
 */
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'out/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'resources/**',
      'docs/**',
      '*.md'
    ]
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      'max-lines': [
        'error',
        { max: 500, skipBlankLines: true, skipComments: true }
      ],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' }
      ]
    }
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'node:*', 'fs', 'path', 'os', 'crypto', 'better-sqlite3'],
              message: 'renderer 是沙箱 UI 层，禁止接触 Node/Electron API（架构规则 §三）'
            },
            {
              // 含裸目录形式（'../main'）：glob '**/main/**' 不匹配无斜杠结尾的目录 import
              group: ['**/main/**', '**/main', '**/preload/**', '**/preload'],
              message: 'renderer 禁止直接 import main/preload 源码，只经 window.api（架构规则 §三）'
            },
            {
              // INV-16：pdfjs-dist 运行时 import 白名单三文件（PdfCanvas/TextLayer/
              // CorpusExtractor）——本条对白名单外 renderer 文件生效；白名单 override
              // 块在下方重申完整 patterns（flat config 同规则后块覆盖，无法只豁免一条）
              group: ['pdfjs-dist', 'pdfjs-dist/**'],
              message: 'pdfjs-dist 只许白名单三文件 import（PdfCanvas/TextLayer/CorpusExtractor，INV-16——白名单变更=[locked-change]）'
            }
          ]
        }
      ]
    }
  },
  {
    // INV-16 白名单 override：三文件重申 renderer 全部禁令但不含 pdfjs 条目
    // （与上方 renderer 块的其余 patterns 保持同步维护——漂移即防线破口）
    files: [
      'src/renderer/features/reader/PdfCanvas.tsx',
      'src/renderer/features/reader/TextLayer.tsx',
      'src/renderer/features/reader/CorpusExtractor.ts'
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'node:*', 'fs', 'path', 'os', 'crypto', 'better-sqlite3'],
              message: 'renderer 是沙箱 UI 层，禁止接触 Node/Electron API（架构规则 §三）'
            },
            {
              group: ['**/main/**', '**/main', '**/preload/**', '**/preload'],
              message: 'renderer 禁止直接 import main/preload 源码，只经 window.api（架构规则 §三）'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/main/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/renderer/**'],
              message: 'main 禁止依赖 renderer（依赖只能单向）'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/main/**', '**/renderer/**', '**/preload/**', 'electron', 'node:*'],
              message: 'shared 是两进程共享契约层，禁止依赖任何进程实现'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/main/db/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // 注意：不含 '**/ipc/**'——shared/ipc 是共享契约目录，glob 分不清；
              // services/ipc 方向的禁令由 check-quality.mjs 按解析路径强制
              group: ['**/services/**', '**/services', '**/http/**', '**/windows/**', '**/protocol/**', '**/security/**', 'electron'],
              message: 'db 层是最底层：禁止反向依赖上层或 Electron（ipc→services→repos→db 单向）'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/main/services/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/db/connection*', '**/db/migrate*', '**/db/migrations/**'],
              message: 'services 只能经 repos 访问数据库（ipc→services→repos→db 单向）；不得上探 main/ipc（check-quality 按解析路径强制）'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/main/ipc/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/repos/**', '**/db/**'],
              message: 'ipc 是薄分发层，禁止直查数据库（ipc→services→repos→db 单向）'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['tests/**/*.ts', '**/*.test.ts'],
    rules: {
      'max-lines': 'off'
    }
  }
)
