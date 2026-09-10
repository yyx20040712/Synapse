import tseslint from 'typescript-eslint'
import { COLOR_RE, stripUrlFunctions } from './scripts/color-re.mjs'

/**
 * ESLint 扁平配置 —— 架构规则的可执行化（教训 C1：文档无强制等于没写）。
 * 关卡：
 * 1. max-lines 500（error）——文件是 AI 上下文的基本单位（教训 B1）
 * 2. 分层边界 no-restricted-imports——依赖方向违规即红
 * 3. renderer 禁 Node/Electron——最小权限（安全 §6.1）
 * 4. 禁 any / eval——弱模型幻觉的第一道闸
 * 5. features 跨域互引由 scripts/check-quality.mjs 静态检查（glob 表达不了的相对路径规则）
 * 6. [F-CSS-03 B-5 2026-09-10] synapse/no-inline-color——tsx inline style
 *    颜色字面量负锚（INV-11 颜色消费单源=--* token）。[F-LINT-04 ③
 *    2026-09-10] COLOR_RE/stripUrlFunctions 单源=scripts/color-re.mjs，
 *    本件与 check-quality.mjs 第 6 段均 import 该件——双写面物理消失；
 *    内联回退哨兵=check-quality 6b 段对本文件文本 matchAll 计数>0 即红；
 *    import 失败 fail-closed 抛错（禁 try/catch 回退内联）。
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
              // INV-16：pdfjs-dist 运行时 import 白名单四文件（PdfDocProvider/
              // PdfPageCanvas/TextLayer/CorpusExtractor——2026-08-28 F-01 随
              // PdfCanvas 拆分迁移，类型再导出单点随之迁移）——本条对白名单外
              // renderer 文件生效；白名单 override 块在下方重申完整 patterns
              // （flat config 同规则后块覆盖，无法只豁免一条）
              group: ['pdfjs-dist', 'pdfjs-dist/**'],
              message: 'pdfjs-dist 只许白名单四文件 import（PdfDocProvider/PdfPageCanvas/TextLayer/CorpusExtractor，INV-16——白名单变更=[locked-change]）'
            }
          ]
        }
      ]
    }
  },
  {
    // INV-16 白名单 override：四文件重申 renderer 全部禁令但不含 pdfjs 条目
    // （与上方 renderer 块的其余 patterns 保持同步维护——漂移即防线破口；
    // F-01 拆分迁移：PdfCanvas.tsx → PdfDocProvider.tsx + PdfPageCanvas.tsx）
    files: [
      'src/renderer/features/reader/PdfDocProvider.tsx',
      'src/renderer/features/reader/PdfPageCanvas.tsx',
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
    // [F-CSS-03 B-5] tsx inline style 颜色字面量负锚（设计=终裁档 §1 B-5，
    // 2026-09-10 迁移毕落地）。AST 面：JSXAttribute[name='style']→
    // JSXExpressionContainer→ObjectExpression→Property.value=Literal 命中
    // COLOR_RE→report；var() 载体 Literal 不命中正则天然豁免；模板串/表达式
    // 值不检（单文件态面）。[F-LINT-04 ③⑦ 2026-09-10] COLOR_RE/
    // stripUrlFunctions import 自 scripts/color-re.mjs 单源（本文件头注
    // 互指；url(#x)=id 引用非色值，剥离后再检）
    files: ['src/renderer/**/*.tsx'],
    plugins: {
      synapse: {
        rules: {
          'no-inline-color': {
            create(context) {
              return {
                JSXAttribute(node) {
                  if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return
                  const v = node.value
                  if (!v || v.type !== 'JSXExpressionContainer') return
                  const obj = v.expression
                  if (!obj || obj.type !== 'ObjectExpression') return
                  for (const prop of obj.properties) {
                    if (prop.type !== 'Property') continue
                    const val = prop.value
                    if (!val || val.type !== 'Literal') continue
                    const s = String(val.value)
                    if (COLOR_RE.test(stripUrlFunctions(s))) {
                      context.report({ node: val, message: `inline style 颜色字面量 "${s}"——颜色消费单源=--* token（INV-11）` })
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    rules: { 'synapse/no-inline-color': 'error' }
  },
  {
    files: ['tests/**/*.ts', '**/*.test.ts'],
    rules: {
      'max-lines': 'off'
    }
  }
)
