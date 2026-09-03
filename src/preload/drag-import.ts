/**
 * [P7E-02] 拖拽导入纯函数（preload 桥的可测性拆分；W2 回炉补类型门）。
 *
 * ── 行为层 ──
 * planDroppedImports(files, pathFor)：
 * - 过滤序：File.type 空剔除（目录项 type 恒 ''——目录可合法命名 *.pdf 击穿
 *   后缀滤，类型门先剔；.pdf 在注册类型系统下 type='application/pdf' 非空）
 *   → 逐个 pathFor 解析 → '' 剔除（合成 File/不可解析——Electron webUtils
 *   对非 OS 拖拽手势的 File 解析得 ''，天然拒）→ 后缀 .pdf（大小写不敏感）剔除
 *   → 计数判定；
 * - 滤后 1~100 → { kind: 'ok', paths }；全滤除 → { kind: 'none' }；>100 →
 *   { kind: 'too-many' }；
 * - 目录拖入 = 类型门剔除（Electron dataTransfer.files 不递归目录——已知边界：
 *   递归导入走「导入文件夹」按钮）。
 *
 * ── 架构层 ──
 * 路径串生命周期限 preload 堆内（INV-07 修订/INV-54）：本模块产物只供
 * apiDrag.importDropped 组装 import/from-paths 载荷，不得流向其他任何面。
 *
 * ── 生命周期层 ──
 * 已知残余（保守拒口径，W2）：无注册类型的真实 PDF（type=''）会被类型门保守
 * 拒——提示语引导走按钮导入（main 侧对话框路径无此限）。
 *
 * ── 文化层 ──
 * 测试：tests/unit/preload/drag-import.test.ts（八分支 always-active）。
 */

/** 单次拖入数量上限（与 importPathsReqSchema 的 max 同值——preload 过滤与 schema 校验双层门） */
export const MAX_DROP_FILES = 100

export type DropPlan =
  | { kind: 'ok'; paths: string[] }
  | { kind: 'none' }
  | { kind: 'too-many' }

export function planDroppedImports(files: File[], pathFor: (f: File) => string): DropPlan {
  const paths: string[] = []
  for (const f of files) {
    if (f.type === '') continue // 目录项（type 恒 ''）——*.pdf 目录名击穿后缀滤，类型门先剔（W2）
    const p = pathFor(f)
    if (p === '') continue // 合成 File（e2e/被攻陷 renderer 造的假 File）解析为空——剔除
    if (!p.toLowerCase().endsWith('.pdf')) continue // 非 PDF——剔除
    paths.push(p)
  }
  if (paths.length === 0) return { kind: 'none' }
  if (paths.length > MAX_DROP_FILES) return { kind: 'too-many' }
  return { kind: 'ok', paths }
}
