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
 * 6. [F-CSS-03 B-5 2026-09-10] synapse/no-inline-color——[F-LINT-04-T2
 *    2026-09-10 扩义] tsx 面颜色字面量负锚（原=tsx inline style 面；
 *    INV-11 颜色消费单源=--* token）。[F-LINT-04 ③
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
      'src/renderer/features/reader/state/PdfDocProvider.tsx',
      'src/renderer/features/reader/view/PdfPageCanvas.tsx',
      'src/renderer/features/reader/view/TextLayer.tsx',
      'src/renderer/features/reader/state/CorpusExtractor.ts'
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
              // [F-LAYER-01] L1 锁线：services 禁 electron——core 可抽包
              //（裁决书 §4 L1；shared/db 两块既有同款禁令，本块补齐=三域闭合）
              group: ['**/db/connection*', '**/db/migrate*', '**/db/migrations/**', 'electron'],
              message: 'services 只能经 repos 访问数据库（ipc→services→repos→db 单向）；不得上探 main/ipc（check-quality 按解析路径强制）；禁依赖 electron——core 可抽包（裁决书 §4 L1，F-LAYER-01）'
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
    // [F-CSS-03 B-5] tsx 颜色字面量负锚（设计=终裁档 §1 B-5，2026-09-10
    // 迁移毕落地）。[F-LINT-04-T2 2026-09-10] 语义扩义：原「tsx inline
    // style 面」→「tsx 面」（终裁档 §2 T2 行+§1.1 修正条款），新增两条
    // visitor 路径，AST 三路径全貌：
    // ① JSXAttribute[name='style']（原路径保留不动）→JSXExpressionContainer
    //   →ObjectExpression→Property.value=Literal 命中 COLOR_RE→report；
    //   var() 载体 Literal 不命中正则天然豁免；模板串/表达式值不检。
    // ② VariableDeclarator：init 递归 unwrap（TSAsExpression/
    //   TSSatisfiesExpression→expression；Object.freeze(...)→arguments[0]；
    //   深度上限 4 防御——超限原样返回即不判，不误报）后两形态判定：
    //   ObjectExpression=逐属性判定（弃「全 Literal 门」——混计算属性/
    //   引用值不豁免整对象；key=Identifier 或 string Literal 均入判，
    //   属性名只用于报错信息）+单值 string Literal 命中即报（主控裁决
    //   扩展：单值常量与对象表同绕过通道，对称闭合）。SpreadElement/
    //   嵌套对象/模板串/二元式等非 Literal 值=明示不检残留面（与 style
    //   面语义对称）。
    // ③ JSXAttribute 属性名域（style 外）：显式表 fill|stroke|color|
    //   stop-color|flood-color|lighting-color ∪ endsWith('Color') 后缀
    //   （camelCase 表 stopColor/floodColor/lightingColor 天然命中）；
    //   value=string Literal 命中即报（[N2 回炉] 含 JSXExpressionContainer
    //   包裹形态 fill={'#fff'} 同检——主控裁决加码）；域外属性名（data-x
    //   等）不报。属性域判定用字符串方法非正则——rule 内零内联 hex
    //   特征正则（check-quality 6b 哨兵扫本文件文本，内联 hex 正则=
    //   哨兵红）。
    // [F-LINT-04 ③⑦ 2026-09-10] COLOR_RE/stripUrlFunctions import 自
    // scripts/color-re.mjs 单源（本文件头注互指；url(#x)=id 引用非色值，
    // 剥离后再检）
    files: ['src/renderer/**/*.tsx'],
    plugins: {
      synapse: {
        rules: {
          'no-inline-color': {
            create(context) {
              const hitsColor = (s) => COLOR_RE.test(stripUrlFunctions(s))
              // [W1 回炉 2026-09-10] EXPLICIT_ATTRS 上提 create 级（与
              // hitsColor/unwrapInit 同级——代码实物与报告 §6 申报一致）
              const EXPLICIT_ATTRS = [
                'fill',
                'stroke',
                'color',
                'stop-color',
                'flood-color',
                'lighting-color'
              ]
              // init 层递归 unwrap（as const/satisfies/Object.freeze——
              // Object.freeze({...} as const) 双层等嵌套均经此递归）。
              // [W3 回炉 2026-09-10] depth >= 4 对齐票面字面「深度上限 4」
              //（最多解 4 层包裹；第 5 层起原样返回即不判，不误报）
              const unwrapInit = (node, depth = 0) => {
                if (!node || depth >= 4) return node
                if (node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression') {
                  return unwrapInit(node.expression, depth + 1)
                }
                if (
                  node.type === 'CallExpression' &&
                  node.callee.type === 'MemberExpression' &&
                  node.callee.object.type === 'Identifier' &&
                  node.callee.object.name === 'Object' &&
                  node.callee.property.type === 'Identifier' &&
                  node.callee.property.name === 'freeze'
                ) {
                  return unwrapInit(node.arguments[0], depth + 1)
                }
                return node
              }
              return {
                VariableDeclarator(node) {
                  const init = unwrapInit(node.init)
                  if (!init) return
                  const name = node.id.type === 'Identifier' ? node.id.name : '(destructured)'
                  if (init.type === 'ObjectExpression') {
                    // 逐属性判定：仅 string Literal 值入判——SpreadElement/
                    // 嵌套对象/模板串/二元式/调用式=明示不检残留面
                    for (const prop of init.properties) {
                      if (prop.type !== 'Property') continue
                      if (prop.key.type !== 'Identifier' && prop.key.type !== 'Literal') continue
                      const val = prop.value
                      if (!val || val.type !== 'Literal' || typeof val.value !== 'string') continue
                      if (hitsColor(val.value)) {
                        const keyName =
                          prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value)
                        context.report({
                          node: val,
                          message: `模块常量色值字面量 "${val.value}"（${name}.${keyName}）——颜色消费单源=--* token（INV-11）`
                        })
                      }
                    }
                  } else if (
                    init.type === 'Literal' &&
                    typeof init.value === 'string' &&
                    hitsColor(init.value)
                  ) {
                    context.report({
                      node: init,
                      message: `模块常量色值字面量 "${init.value}"（${name}）——颜色消费单源=--* token（INV-11）`
                    })
                  }
                },
                JSXAttribute(node) {
                  if (node.name.type !== 'JSXIdentifier') return
                  const attr = node.name.name
                  if (attr === 'style') {
                    // 原 B-5 style 路径（行为保留不动——仅 guard 子句拆分接入新域）
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
                    return
                  }
                  // [F-LINT-04-T2] SVG/attr 面属性名域：显式表 ∪ camelCase 后缀
                  //（EXPLICIT_ATTRS 已上提 create 级——W1 回炉）
                  if (!EXPLICIT_ATTRS.includes(attr) && !attr.endsWith('Color')) return
                  // [N2 回炉=主控裁决加码 2026-09-10] value 增判
                  // JSXExpressionContainer 包裹形态：fill={'#fff'} 与
                  // fill="#fff" 同罪（域内常见绕过通道）；style 分支不动
                  //（其本就走 container 判 ObjectExpression）
                  const v = node.value
                  if (!v) return
                  const lit = v.type === 'JSXExpressionContainer' ? v.expression : v
                  if (!lit || lit.type !== 'Literal' || typeof lit.value !== 'string') return
                  if (hitsColor(lit.value)) {
                    context.report({
                      node: lit,
                      message: `SVG/attr 颜色字面量 "${lit.value}"（${attr}）——颜色消费单源=--* token（INV-11）`
                    })
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
