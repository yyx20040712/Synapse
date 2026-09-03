# P7E-04 门二终审材料包（deepseek 异构二审）

## 0. 任务与职权（四清单+一）
你是门二终审。门一（Kimi）链已毕：初审 PWW(0B/1W/4N)→回炉 R1 三修一登记一记档→定点复核 **PASS**（余 1 NIT=E6 用例预期内 console 噪音）。任务：
①处置核对：门一全 findings+主控裁决 vs 终态 diff（防说了没改/改了没说）；
②母本符合度：票面五层逐节（态空间 E1~E8 逐格/Design 两否决案未采/拆件设计/预留注记兑现）；
③宪法红线终审：分层/受锁面（声明两件最小增量+既有测试零改——含受锁 paper-detail-export.test.tsx 零改通过=拆件判据）/行数（组件 215≤250）/UTF-8/TDD 证据链四档；
④机器面核对：单测 142 文件/1231（140+2 文件+12 用例实测）；locks 256→259 预期（收口主控 generate+apply——两受锁件 chmod 编辑的锁态漂移=主控 reapply 收账，已在材料诚实申报）；e2e 36→37（定向 1 passed）；翻 done 推演不红；
⑤成本账本行核对（§5）。
特别申报（诚实度面）：①两受锁件 chmod 后编辑（主控派发令误称预解锁——实况在锁态；实现者按授权面处置仅 chmod 该两件）；②IpcDeps.clipboard 可选化（受锁 makeIpcDeps 桩工厂必填即类型红——可选+handler 响亮守卫+bootstrap 恒装配；还原项已登记交接书）。
输出同门一 JSON 格式。判级 BLOCKING=必须回修。

## 1. 票面（完整任务书）
```markdown
# P7E-04 工单票面——导出剪贴板（五层规约）

> registry：`P7E-04` / file `src/main/ipc/export_.ts` / area ipc / owner strong / open
> 排程真相源=v32 §2 第 1 项（=v31 §2 第 1 项 P7-E 余序续首项）。
> 开工记录：本票段技能清点延续本段开场（subagent-driven-development/TDD/
> verification-before-completion/systematic-debugging/loop-engineering 已加载；
> 门审外链 gate-call.py 在位——本段已战 Kimi 504 重试与 deepseek 64k 档）。

## ⓪ 出处（无出处默认不工单化——三链在档）

1. B1 报告 §3（docs/reports/2026-08-23_v2-blueprint-b1.md:47）：
   `export_/export.service.ts:27（导出剪贴板，ipc 加通道）`。
2. ROADMAP §P7-E 内序第 4 位：「… > 页内高亮搜索 > 导出剪贴板 > …」
   （docs/ROADMAP.md:384——前三项 P7E-01/02/03 已毕）。
3. export.service.ts:27 生命周期层预留注记：「不做：导出到剪贴板（v2 预留：
   ipc 加通道）」。

- **价值**：复制 BibTeX 到剪贴板是文献管理器最高频动作（写论文插引用）——
  现有 bibtex 导出必经保存对话框+落盘三步，剪贴板路径一步到位；CSV 剪贴板
  对称补齐（贴 Excel/Sheets）。
- **依赖**：main 侧 Electron clipboard 模块（main-window 已放行
  clipboard-sanitized-write 权限=渲染侧写剪贴板既有面）；buildBibtex/buildCsv
  既有构建器零改；零新依赖。
- **风险**：①PaperDetailPanel 248 行已贴组件 250 红线——加动作必超，票面含
  拆件设计（见 ①）；②受锁面=schemas/api-surface 两件最小增量+新测试；③无
  对话框=无 CANCELLED 面（与文件导出的语义差异须声明，防审计混淆）。
- **验收**：见 ⑥。

## ① 行为层（态空间表先行）

### 主控 Design 裁决：main 侧构建+main 侧写剪贴板（内容不过 renderer）

- **采**：单通道 `export/clipboard`——req `{ format: 'bibtex'|'csv',
  paperIds: string[] }`，ipc 层经 deps.clipboard.writeText 写系统剪贴板，
  res `{ count: paperIds.length }`。构建复用 service 既有 buildBibtex/buildCsv
  （**单一构建器**——文件路径与剪贴板路径同源，题录格式漂移不可能）；
  DB 派生内容全程 main 侧，renderer 只发 ids+format。
- **否决**（内容回传 renderer+navigator.clipboard.writeText）：内容跨 IPC 面
  无必要扩大（渲染侧写剪贴板虽有权限先例，但导出内容构建本就驻 main——
  多一跳零收益且写失败面分裂为两处）。
- **否决**（两独立通道 bibtex-clip/csv-clip）：同形载荷异通道=接口面膨胀；
  format 枚举单通道即可承载后续格式扩展。

### IPC/契约（受锁面最小增量）

- schemas.ts：`clipboardReqSchema = { format: z.enum(['bibtex','csv']),
  paperIds: z.array(z.string().min(1)).min(1) }.strict()`（schema 层空选集拒）；
  res 复用既有形状 `{ count: number }`（不新起 schema——bibtex/csv 通道 res
  子集）。
- api-surface.ts：export_ 域 +`clipboard: { channel: 'export/clipboard', Req,
  Res }`（Res 可 inline `{ count: number }` 或复用——循域内既有 res 形态）。
- ipc/export_.ts：`clipboard: async (req) => { const content = req.format ===
  'bibtex' ? await buildBibtex(req.paperIds) : await buildCsv(req.paperIds);
  deps.clipboard.writeText(content); return { count: req.paperIds.length } }`
  （先构建后写剪贴板——构建失败零剪贴板副作用；无对话框=无 CANCELLED）。
- ipc-deps.ts：+`clipboard: { writeText(text: string): void }`（注入面——
  bootstrap 装配 electron clipboard；测试桩零 electron 依赖）。
- bootstrap.ts：装配 `clipboard: electron.clipboard`（+~3 行，255→258 在
  repo 300 红线内）。

### renderer 拆件（组件 250 红线解——hook 抽取）

- 新文件 `src/renderer/features/library/usePaperDetailActions.ts`：runAction
  分发+enriching/exporting busy 态+toast 收口整体迁入（~110 行）；组件瘦身
  至 ~160 行， props 形为零变（按钮仍驻面板——纯逻辑拆件，既有受锁测试
  paper-detail-export.test.tsx 经组件面断言零破坏）。
- PaperDetailPanel：action 联合类型扩 `'bibtex-clip' | 'csv-clip'`；按钮区
  +「复制 BibTeX」「复制 CSV」（detail 面板导出组相邻位——report/bibtex/
  corpus 按钮既有布局语言）；成功 toast 逐字：「已复制 N 条题录到剪贴板」
  （bibtex）/「已复制 N 行列表到剪贴板」（csv）。

### 态空间跨格序列表（E1~E8——验收=逐格测试锚）

| # | 序列 | 期望 |
|---|---|---|
| E1 | idle→复制 BibTeX（单篇） | busy 门→invoke clipboard{bibtex,[id]}→toast「已复制 1 条题录到剪贴板」 |
| E2 | idle→复制 CSV | 同构 csv→toast「已复制 1 行列表到剪贴板」 |
| E3 | schema 层空选集（paperIds=[]） | INVALID_REQUEST 拒（零 service 调用——schema min(1) 第二道门） |
| E4 | exporting busy 期再点 | 既有 exporting 门短路（零 invoke） |
| E5 | buildBibtex/buildCsv 抛错（取数失败） | error toast+busy 复位；**剪贴板零写入**（先构建后写） |
| E6 | clipboard.writeText 抛错 | error toast「复制到剪贴板失败」（INV-02 动作型）+busy 复位 |
| E7 | 取消面对比声明 | 剪贴板路径无对话框→**无 CANCELLED 分支**（与文件导出 exportTo 的语义差异，头注声明） |
| E8 | 多篇 paperIds（通道能力，UI 暂单篇） | ids 顺序保持+多条目拼接（buildBibtex 既有语义零改） |

## ② 接口层

一 schema+一通道+一 deps 注入口+一 renderer hook+两按钮；service 层零新方法
（buildBibtex/buildCsv 直用）；export.service.ts:27 预留注记兑现修订。

## ③ 架构层

- 分层不变：renderer→window.api→ipc→services（clipboard 写在 ipc 层经 deps
  注入——与 dialogs 同位 UI 胶水语义，非 service 职责）。
- **INV-56 新登记**（docs/invariants.md，收口时主控统一改）：导出内容构建器
  单源——文件路径与剪贴板路径共用 buildBibtex/buildCsv，禁复制第二份序列化
  （格式漂移不可能）；剪贴板写唯一口=ipc deps.clipboard 注入（main 侧单点）。
- PaperDetailPanel 拆件=逻辑/表现分离（AGENTS「出现第二职责就拆文件」），
  既有受锁测试面零破坏。

## ④ 生命周期层

- export.service.ts:27 v2 预留注记兑现修订；PaperDetailPanel 头注动作清单
  同步。
- 已知边界（票面外不修只记）：①UI 面暂只接单篇（多篇批量复制待库侧多选
  UI——通道已具备能力）；②markdown 报告不进剪贴板（长内容剪贴板非合理
  载体，文件路径独占）；③剪贴板历史/格式化（HTML 富文本）不做。

## ⑤ 文化层（测试规约——TDD 红→绿→变异红证）

新测试全 always-active：

| 文件 | 覆盖 |
|---|---|
| tests/unit/ipc/export-clipboard.test.ts | handler 三分支（bibtex/csv 委托 service 逐参+count 回传）/E5 先构建后写（service 抛错→clipboard 零调用）/E6 写失败上抛——deps 桩零 electron |
| tests/unit/renderer/paper-detail-clip.test.tsx | E1/E2/E4（jsdom api 桩+按钮点击+toast 文案逐字+busy 短路零 invoke）+拆件回归（report/bibtex/corpus/enrich 既有动作经 hook 路径仍工作） |
| tests/e2e/export-clipboard.spec.ts | 装配级：种子 1 篇→详情面板→「复制 BibTeX」→app.evaluate 主进程 clipboard.readText 含 @+title（P7-A 主进程读回先例——渲染侧 readText 无权限） |

- **变异红证 ≥4 组**（cp 备份法，先证命中再断红）：
  M1=handler 删 format 分支恒走 bibtex（csv 用例红——buildCsv 零调用）；
  M2=handler 换序先写剪贴板后构建（E5 service 抛错时 clipboard 已被调——
  零调用断言红）；M3=hook busy 门删（E4 零 invoke 断言红）；M4=toast 文案
  删 N 计数（E1 逐字断言红）。
- 先红纪律：全量套跑口径先红落盘 scripts/audits/p7e-04-red/；证据 .raw.txt。
- **锁序纪律**：新测试文件诞生即 locks:generate+apply 先于 verify（预期
  256→259：+2 unit+1 e2e spec）。
- 受锁面（主控预解锁）：schemas.ts/api-surface.ts 两件最小增量；新测试收口
  入锁。**renderer 拆件后 paper-detail-export.test.tsx 零改**（组件面断言
  不变——如实现中发现必须改既有断言=B 级停下申报）。

## ⑥ 验收

- `npm run verify` 全绿（基线 140 文件 1219 用例滚动，新增数实测申报）。
- e2e 全量（36+1 新 spec）全绿。
- 门一 Kimi 外链+门二 deepseek 异构终审（材料含新文件全文+diff 包；deepseek
  直接 64k 档——v32 §3 纪律）。
- grep 无 TODO/FIXME/placeholder；中文 UTF-8 验证。
- INV-56 登记+预留注记修订+registry P7E-04 翻 done（收口主控单写）。
- 提交尾注：受锁件 [locked-change]。

## ⑦ 派发与成本申报

- 三屋：实现者=子代理（GLM5.3 统一档——环境无 model 参数欠账披露）；门一=
  Kimi K3（gate-call.py，504 重试优先换源）；门二=deepseek（64k 档起步）。
- 实现者禁 git/registry/locks；禁新增依赖；超票面决定停下申报（BLOCKED）。
- 主控亲验 verify 真退出码+变异红证抽查+diff 范围核对。
```

## 2. 终态完整 diff（新文件 add -N；registry 行=主控建单非实现面）
```diff
diff --git a/src/main/bootstrap.ts b/src/main/bootstrap.ts
index 27a7d4694c..b62f93ec34 100644
--- a/src/main/bootstrap.ts
+++ b/src/main/bootstrap.ts
@@ -24,6 +24,7 @@ import { join } from 'node:path'
 import {
   BrowserWindow,
   Menu,
+  clipboard,
   dialog,
   net,
   protocol,
@@ -169,7 +170,9 @@ export async function bootstrap(app: App): Promise<BootstrapContext> {
       setQuitDirty,
       // R2-SH3：闭包直引下方 const window（TDZ 不可能触发——IPC 调用来自
       // renderer，必然晚于窗口创建；dialogs 惰性 getter 同段先例）
-      controlWindow: (action) => controlWindow(window, action)
+      controlWindow: (action) => controlWindow(window, action),
+      // P7E-04：剪贴板写口（electron.clipboard 结构兼容 deps.clipboard 注入面）
+      clipboard
     }),
     workspaces: workspaceService
   })
diff --git a/src/main/ipc/export_.ts b/src/main/ipc/export_.ts
index ed19228f3f..537607bc06 100644
--- a/src/main/ipc/export_.ts
+++ b/src/main/ipc/export_.ts
@@ -8,6 +8,10 @@
  * - csv：同上（文件名 synapse-export.csv，扩展 csv）
  * - report：先取 detail 得标题 → buildReport(paperId) → saveFile(`${title安全化}.md`)
  *   → writeToFile → count 固定 1
+ * - clipboard（P7E-04）：format 枚举单通道——先构建（buildBibtex/buildCsv 单源
+ *   复用，构建失败零剪贴板副作用）后经 deps.clipboard.writeText 写系统剪贴板，
+ *   res { count }；无保存对话框 → 无 CANCELLED 分支（与 exportTo 文件导出的
+ *   语义差异——取消面不存在，失败面只有构建/写入两种）
  * - 文件名安全化：替换 Windows 非法字符 \\ / : * ? " < > | 与全角冒号为下划线、
  *   空白归一为下划线，截断 80 字符
  *
@@ -67,6 +71,24 @@ export function createExportIpc(deps: IpcDeps): ApiHandlers['export_'] {
     return { filePath: target, count }
   }
 
+  /** 剪贴板导出（P7E-04，E7 语义声明：无对话框→无 CANCELLED 分支）：先构建后
+   *  写（E5——构建失败零剪贴板副作用）；写口经 deps.clipboard 注入（main 侧
+   *  单点，INV-56），构建复用 buildBibtex/buildCsv（单源禁复制第二份序列化） */
+  async function exportClipboard(
+    format: 'bibtex' | 'csv',
+    paperIds: string[]
+  ): Promise<{ count: number }> {
+    if (deps.clipboard === undefined) {
+      throw new Error('剪贴板依赖未装配（bootstrap 接线缺失）')
+    }
+    const content =
+      format === 'bibtex'
+        ? await deps.services.export_.buildBibtex(paperIds)
+        : await deps.services.export_.buildCsv(paperIds)
+    deps.clipboard.writeText(content)
+    return { count: paperIds.length }
+  }
+
   return {
     corpusItem: (req) => deps.services.export_.corpusItem(req),
 
@@ -91,6 +113,8 @@ export function createExportIpc(deps: IpcDeps): ApiHandlers['export_'] {
       exportTo('synapse-export.csv', CSV_FILTER, () =>
         deps.services.export_.buildCsv(req.paperIds), req.paperIds.length),
 
+    clipboard: (req) => exportClipboard(req.format, req.paperIds),
+
     report: async (req) => {
       const detail = await deps.services.library.detail({ paperId: req.paperId })
       return exportTo(`${safeFileName(detail.title)}.md`, MD_FILTER, () =>
diff --git a/src/main/ipc/ipc-deps.ts b/src/main/ipc/ipc-deps.ts
index d60dd4f79a..9910480711 100644
--- a/src/main/ipc/ipc-deps.ts
+++ b/src/main/ipc/ipc-deps.ts
@@ -21,4 +21,8 @@ export interface IpcDeps {
   setQuitDirty: (dirty: boolean) => void
   /** R2-SH3 frameless 窗控：四 action 落点（bootstrap 闭包包主窗口） */
   controlWindow: (action: WindowControlAction) => { maximized: boolean }
+  /** P7E-04 剪贴板写口（bootstrap 装配 electron.clipboard；测试桩零 electron）。
+   *  可选=受锁 makeIpcDeps 桩工厂（tests/utils/ipc-deps.ts）零改——设必填即其
+   *  返回字面量类型红；装配缺失时 export_ handler 响亮抛错（接线缺陷不静默丢写） */
+  clipboard?: { writeText(text: string): void }
 }
diff --git a/src/main/services/export_/export.service.ts b/src/main/services/export_/export.service.ts
index f10bb1aa69..71b85d3a90 100644
--- a/src/main/services/export_/export.service.ts
+++ b/src/main/services/export_/export.service.ts
@@ -24,7 +24,9 @@
  *   取数与拼装；保存对话框在 ipc 层（UI 胶水）
  *
  * ── 生命周期层 ──
- * - 不做：导出到剪贴板（v2 预留：ipc 加通道）
+ * - 剪贴板导出（P7E-04 兑现原「v2 预留：ipc 加通道」注记）：ipc 层
+ *   export/clipboard 通道——构建复用本层 buildBibtex/buildCsv（单源，INV-56），
+ *   写剪贴板经 deps.clipboard 注入驻 ipc 层（UI 胶水语义），本层零新增方法
  *
  * ── 文化层 ──
  * - 测试：tests/unit/services/export.service.test.ts（已锁定，repos 桩）
diff --git a/src/renderer/features/library/PaperDetailPanel.tsx b/src/renderer/features/library/PaperDetailPanel.tsx
index 53b3c5cd88..c9487200e1 100644
--- a/src/renderer/features/library/PaperDetailPanel.tsx
+++ b/src/renderer/features/library/PaperDetailPanel.tsx
@@ -9,6 +9,9 @@
  *   两标识符）；编辑面唯一归阅读器侧栏（C-03/04 已就绪，C-06 排其后为此）
  * - 替代入口：按钮「去阅读器写笔记」→ requestOpenPaper(detail.id)
  *   （open-paper-bus.ts:17 同总线——App 切视图+ReaderPage 打开链既有零新增）
+ * - P7E-04：动作清单=enrich/report/bibtex/corpus/doi（既有）+ bibtex-clip/
+ *   csv-clip（复制 BibTeX/复制 CSV——runAction 分发+busy 态+toast 收口迁
+ *   usePaperDetailActions hook，纯逻辑/表现分离；按钮驻本面板，props 面零变）
  *
  * ── 接口层 ──
  * - export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element（签名不变）
@@ -28,17 +31,14 @@
  */
 import { useEffect, useState } from 'react'
 import type { PaperSource, EnrichStatus } from '@shared/models/paper'
-import { api, unwrap, ApiClientError } from '../../api/client'
+import { api, unwrap } from '../../api/client'
 import { useAsync } from '../../shared/hooks/useAsync'
 import { Button } from '../../shared/ui/Button'
 import { DiamondRule } from '../../shared/ui/DiamondRule'
-import { showToast } from '../../shared/ui/Toast'
 import { requestOpenPaper } from '../../shared/open-paper-bus'
 import { TagEditor } from '../tags/TagEditor'
 import { MetaEditDialog } from './MetaEditDialog'
-
-/** 意外异常（非 ApiClientError）时的兜底中文消息 */
-const ACTION_FAILED = '操作失败'
+import { usePaperDetailActions } from './usePaperDetailActions'
 
 const SOURCE_LABEL: Record<PaperSource, string> = {
   local: '本地导入',
@@ -72,8 +72,6 @@ export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element
   // 元数据/标签变更后 bump 触发重读（TagEditor onChanged 亦走这里）
   const [reloadKey, setReloadKey] = useState(0)
   const [editing, setEditing] = useState(false)
-  const [enriching, setEnriching] = useState(false)
-  const [exporting, setExporting] = useState(false)
 
   const { data: detail, error, run } = useAsync(
     () => (paperId === null ? Promise.resolve(null) : unwrap(api.library.detail({ paperId }))),
@@ -85,44 +83,10 @@ export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element
     void run()
   }, [run, paperId, reloadKey])
 
-  /** 动作型按钮统一收口：错误 toast + 成功后的刷新/提示 */
-  async function runAction(action: 'enrich' | 'report' | 'bibtex' | 'corpus' | 'doi'): Promise<void> {
-    if (detail === null) return
-    if (action === 'enrich') {
-      if (enriching) return
-      setEnriching(true)
-    } else if (action === 'report' || action === 'bibtex' || action === 'corpus') {
-      if (exporting) return
-      setExporting(true)
-    }
-    try {
-      if (action === 'enrich') {
-        const refreshed = await unwrap(api.enrich.fetch({ paperId: detail.id }))
-        if (refreshed.enrichStatus === 'failed') {
-          showToast('元数据增强失败：上游未响应或无匹配', 'error')
-        } else {
-          showToast('元数据增强完成', 'success')
-        }
-        setReloadKey((k) => k + 1)
-      } else if (action === 'report') {
-        const r = await unwrap(api.export_.report({ paperId: detail.id }))
-        showToast(`已导出 ${r.count} 条内容：${r.filePath}`, 'success')
-      } else if (action === 'bibtex') {
-        const r = await unwrap(api.export_.bibtex({ paperIds: [detail.id] }))
-        showToast(`已导出 ${r.count} 条题录：${r.filePath}`, 'success')
-      } else if (action === 'corpus') {
-        const r = await unwrap(api.export_.corpus({ paperId: detail.id }))
-        showToast(`已导出语料 md：${r.filePath}`, 'success')
-      } else if (detail.doi !== null) {
-        await unwrap(api.system.openExternal({ url: `https://doi.org/${detail.doi}` }))
-      }
-    } catch (e) {
-      showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
-    } finally {
-      setEnriching(false)
-      setExporting(false)
-    }
-  }
+  // P7E-04 拆件：动作逻辑（busy 门+invoke+toast）整体驻 hook，面板只保留按钮
+  const { enriching, exporting, runAction } = usePaperDetailActions(detail, () =>
+    setReloadKey((k) => k + 1)
+  )
 
   if (paperId === null) {
     // 回炉 R4：空态居中+菱形分隔夹持（文案逐字保留——e2e/断言面）
@@ -212,6 +176,12 @@ export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element
         <Button size="sm" loading={exporting} onClick={() => void runAction('bibtex')}>
           导出 BibTeX
         </Button>
+        <Button size="sm" loading={exporting} onClick={() => void runAction('bibtex-clip')}>
+          复制 BibTeX
+        </Button>
+        <Button size="sm" loading={exporting} onClick={() => void runAction('csv-clip')}>
+          复制 CSV
+        </Button>
         <Button size="sm" loading={exporting} onClick={() => void runAction('corpus')}>
           导出语料 md
         </Button>
diff --git a/src/renderer/features/library/usePaperDetailActions.ts b/src/renderer/features/library/usePaperDetailActions.ts
new file mode 100644
index 0000000000..bfedd94762
--- /dev/null
+++ b/src/renderer/features/library/usePaperDetailActions.ts
@@ -0,0 +1,112 @@
+/**
+ * [P7E-04] usePaperDetailActions —— 详情面板动作逻辑 hook
+ * （runAction 分发+busy 态+toast 收口自 PaperDetailPanel 迁入——组件 250 红线
+ * 拆件，纯逻辑/表现分离；props 面零变，按钮驻面板）
+ *
+ * ── 行为层 ──
+ * - 动作联合：enrich/report/bibtex/corpus/doi（既有）+ bibtex-clip/csv-clip（P7E-04）
+ * - busy 门：enrich 独占 enriching；report/bibtex/corpus/两 clip 共享 exporting
+ *   （busy 期再触发短路零 invoke——E4）；doi 不占 busy（既有语义零变）
+ * - 剪贴板成功 toast 逐字：「已复制 N 条题录到剪贴板」（bibtex）/
+ *   「已复制 N 行列表到剪贴板」（csv）；失败统一「复制到剪贴板失败」
+ *   （INV-02 动作型——剪贴板路径无对话框即无 CANCELLED 面，构建/写入失败
+ *   对用户同呈现为动作失败，E7）
+ * - 其余动作错误面零变：ApiClientError.message / 意外异常兜底「操作失败」
+ *
+ * ── 接口层 ──
+ * - export function usePaperDetailActions(detail: PaperDetail | null, onRefresh: () => void):
+ *     { enriching: boolean; exporting: boolean; runAction(action: PaperDetailAction): Promise<void> }
+ *
+ * ── 架构层 ──
+ * - 只 import api/client+shared/ui/Toast（域内零跨域引用）
+ *
+ * ── 生命周期层 ── / ── 文化层 ──
+ * - 测试：tests/unit/renderer/paper-detail-clip.test.tsx（E1/E2/E4/E6+拆件回归；
+ *   受锁 paper-detail-export.test.tsx 经组件面断言零改全绿=拆件正确性判据）
+ */
+import { useState } from 'react'
+import type { PaperDetail } from '@shared/models/paper'
+import { api, unwrap, ApiClientError } from '../../api/client'
+import { showToast } from '../../shared/ui/Toast'
+
+/** 意外异常（非 ApiClientError）时的兜底中文消息 */
+const ACTION_FAILED = '操作失败'
+
+/** 剪贴板动作失败文案（E6/E7：无 CANCELLED 面，失败统一动作型） */
+const CLIP_FAILED = '复制到剪贴板失败'
+
+export type PaperDetailAction =
+  | 'enrich'
+  | 'report'
+  | 'bibtex'
+  | 'corpus'
+  | 'doi'
+  | 'bibtex-clip'
+  | 'csv-clip'
+
+export function usePaperDetailActions(
+  detail: PaperDetail | null,
+  onRefresh: () => void
+): {
+  enriching: boolean
+  exporting: boolean
+  runAction: (action: PaperDetailAction) => Promise<void>
+} {
+  const [enriching, setEnriching] = useState(false)
+  const [exporting, setExporting] = useState(false)
+
+  /** 动作型按钮统一收口：busy 门 → invoke → 成功 toast/刷新；错误 toast */
+  async function runAction(action: PaperDetailAction): Promise<void> {
+    if (detail === null) return
+    const isClip = action === 'bibtex-clip' || action === 'csv-clip'
+    if (action === 'enrich') {
+      if (enriching) return
+      setEnriching(true)
+    } else if (action !== 'doi') {
+      if (exporting) return
+      setExporting(true)
+    }
+    try {
+      if (action === 'enrich') {
+        const refreshed = await unwrap(api.enrich.fetch({ paperId: detail.id }))
+        if (refreshed.enrichStatus === 'failed') {
+          showToast('元数据增强失败：上游未响应或无匹配', 'error')
+        } else {
+          showToast('元数据增强完成', 'success')
+        }
+        onRefresh()
+      } else if (action === 'report') {
+        const r = await unwrap(api.export_.report({ paperId: detail.id }))
+        showToast(`已导出 ${r.count} 条内容：${r.filePath}`, 'success')
+      } else if (action === 'bibtex') {
+        const r = await unwrap(api.export_.bibtex({ paperIds: [detail.id] }))
+        showToast(`已导出 ${r.count} 条题录：${r.filePath}`, 'success')
+      } else if (action === 'corpus') {
+        const r = await unwrap(api.export_.corpus({ paperId: detail.id }))
+        showToast(`已导出语料 md：${r.filePath}`, 'success')
+      } else if (action === 'bibtex-clip') {
+        const r = await unwrap(api.export_.clipboard({ format: 'bibtex', paperIds: [detail.id] }))
+        showToast(`已复制 ${r.count} 条题录到剪贴板`, 'success')
+      } else if (action === 'csv-clip') {
+        const r = await unwrap(api.export_.clipboard({ format: 'csv', paperIds: [detail.id] }))
+        showToast(`已复制 ${r.count} 行列表到剪贴板`, 'success')
+      } else if (detail.doi !== null) {
+        await unwrap(api.system.openExternal({ url: `https://doi.org/${detail.doi}` }))
+      }
+    } catch (e) {
+      if (isClip) {
+        // 配置缺陷（如剪贴板依赖未装配）与运行失败在控制台可区分（AnnotationLayer
+        // 意外异常 console 先例——门一 N1）；用户面仍统一动作型文案（E6/E7）
+        console.error('[PaperDetailActions] 剪贴板导出失败', e)
+        showToast(CLIP_FAILED, 'error')
+      } else {
+        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
+      }
+    } finally {
+      setEnriching(false)
+      setExporting(false)
+    }
+  }
+
+  return { enriching, exporting, runAction }
+}
diff --git a/src/shared/ipc/api-surface.ts b/src/shared/ipc/api-surface.ts
index 691bd64cec..789cfcf144 100644
--- a/src/shared/ipc/api-surface.ts
+++ b/src/shared/ipc/api-surface.ts
@@ -54,6 +54,13 @@ export const API_SURFACE = {
   export_: {
     bibtex: { channel: 'export/bibtex', Req: S.exportSelectionReqSchema, Res: S.exportResSchema },
     csv: { channel: 'export/csv', Req: S.exportSelectionReqSchema, Res: S.exportResSchema },
+    // P7E-04：剪贴板导出（main 侧构建 main 侧写——内容不过 renderer）；Res=
+    // exportResSchema 的 count 子集（无落盘路径），值位 inline zod 先例=ai_sensor listByPaper
+    clipboard: {
+      channel: 'export/clipboard',
+      Req: S.clipboardReqSchema,
+      Res: z.object({ count: z.number().int().min(1) }).strict()
+    },
     report: { channel: 'export/report', Req: S.reportReqSchema, Res: S.exportResSchema },
     corpus: { channel: 'export/corpus', Req: S.corpusReqSchema, Res: S.exportResSchema },
     corpusSet: { channel: 'export/corpus-set', Req: S.corpusSetReqSchema, Res: S.corpusSetResSchema },
diff --git a/src/shared/ipc/schemas.ts b/src/shared/ipc/schemas.ts
index 8edf8c9435..9a3a763fd5 100644
--- a/src/shared/ipc/schemas.ts
+++ b/src/shared/ipc/schemas.ts
@@ -108,6 +108,12 @@ export const exportResSchema = z
 
 export const reportReqSchema = z.object({ paperId: z.string().min(1) }).strict()
 
+/** P7E-04 剪贴板导出请求：format 枚举单通道（bibtex/csv 同一构建器单源——
+ *  INV-56 禁复制第二份序列化）；paperIds min(1)=空选集第二道门（E3） */
+export const clipboardReqSchema = z
+  .object({ format: z.enum(['bibtex', 'csv']), paperIds: z.array(z.string().min(1)).min(1) })
+  .strict()
+
 // ── export_ corpus-item（AI-02：五件套提取回传 renderer→main 常规 invoke）──
 /** 逐项回传判别联合（背压：每页/每图一 invoke，await ack 后发下一项） */
 export const corpusItemReqSchema = z.discriminatedUnion('kind', [
diff --git a/tests/e2e/export-clipboard.spec.ts b/tests/e2e/export-clipboard.spec.ts
new file mode 100644
index 0000000000..1c8275ac63
--- /dev/null
+++ b/tests/e2e/export-clipboard.spec.ts
@@ -0,0 +1,63 @@
+import { test, expect } from '@playwright/test'
+import { mkdtemp } from 'node:fs/promises'
+import { createHash } from 'node:crypto'
+import { mkdirSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { dirname, join } from 'node:path'
+import { isTicketDone } from '../../tickets/registry'
+import { createTinyPdf } from '../utils/pdf-factory'
+import { launch, seedPaperRow } from './e2e-env'
+
+/**
+ * P7E-04 导出剪贴板 e2e（装配级，1 综合用例）。
+ * 全链：种子 1 篇真实 PDF → 文献库列表选中 → 详情面板「复制 BibTeX」→
+ * 主进程 clipboard.readText 读回断言含 @+title（P7-A 先例——渲染侧 readText
+ * 无权限，主进程读取即真实系统剪贴板，集成语义不打折）+toast 可见（INV-02）。
+ * 剪贴板竞态防线同型 reader-text.spec P7-A 用例：清场标记覆盖外部旧值+
+ * 条件重读 5×200ms（标记值/空串=写入未落盘继续轮询，超时红带末次读值）。
+ * 激活条件：库列表/详情面板链既有工单（本票面随实现原子生效，不依赖自身状态）。
+ */
+const DEPS = ['SR-LIB-01', 'SR-LIB-02', 'SR2-C-06'] as const
+
+test.setTimeout(120_000)
+
+test('P7E-04 导出剪贴板：详情面板「复制 BibTeX」→主进程剪贴板读回含 @+title', async () => {
+  const pending = DEPS.filter((d) => !isTicketDone(d))
+  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)
+
+  const title = '智慧水务 剪贴板 e2e 文献'
+  const userData = await mkdtemp(join(tmpdir(), 'synapse-clip-'))
+
+  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——corpus-export 同型）
+  const seedApp = await launch(userData)
+  await (await seedApp.firstWindow()).waitForTimeout(500)
+  await seedApp.close()
+
+  // 种子：1 篇真实单页 PDF（sha 唯一约束——content-addressed files/ 布局）
+  const bytes = createTinyPdf(title)
+  const sha = createHash('sha256').update(bytes).digest('hex')
+  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
+  const abs = join(userData, 'files', ...fileRef.split('/'))
+  mkdirSync(dirname(abs), { recursive: true })
+  writeFileSync(abs, bytes)
+  await seedPaperRow(userData, fileRef, sha, title, 'e2e-clip-paper')
+
+  const app = await launch(userData)
+  const win = await app.firstWindow()
+  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
+  await win.getByText(title).first().click()
+  await expect(win.getByRole('button', { name: '复制 BibTeX' })).toBeVisible({ timeout: 20_000 })
+
+  await app.evaluate(({ clipboard }) => clipboard.writeText('__p7e04_cleared__'))
+  await win.getByRole('button', { name: '复制 BibTeX' }).click()
+  await expect(win.getByText('已复制 1 条题录到剪贴板')).toBeVisible({ timeout: 20_000 })
+  let clipped = ''
+  for (let i = 0; i < 5; i++) {
+    clipped = await app.evaluate(({ clipboard }) => clipboard.readText())
+    if (clipped.includes('@') && clipped.includes(title)) break
+    await win.waitForTimeout(200)
+  }
+  expect(clipped, `剪贴板末次读值（标记=写入未落盘；其他=外部再改写）：${JSON.stringify(clipped)}`).toContain('@')
+  expect(clipped, `剪贴板末次读值（标记=写入未落盘；其他=外部再改写）：${JSON.stringify(clipped)}`).toContain(title)
+  await app.close()
+})
diff --git a/tests/unit/ipc/export-clipboard.test.ts b/tests/unit/ipc/export-clipboard.test.ts
new file mode 100644
index 0000000000..7255b3ceff
--- /dev/null
+++ b/tests/unit/ipc/export-clipboard.test.ts
@@ -0,0 +1,108 @@
+/**
+ * P7E-04 ipc/export_.clipboard 单测（always-active——三屋新测试不经 guardedDescribe）。
+ * 覆盖态空间：E1/E2 委托逐参+count 回传、E3 schema 层空选集拒（零 service 调用）、
+ * E5 先构建后写（service 抛错→剪贴板零调用）、E6 写失败上抛、E7 无对话框
+ * （saveFile 零调用——与文件导出 exportTo 的语义差异锚）、E8 多篇 ids 直通
+ * （顺序保持=buildBibtex 既有语义，handler 零加工）。deps 桩零 electron。
+ */
+import { describe, expect, it, vi } from 'vitest'
+import { createExportIpc } from '../../../src/main/ipc/export_'
+import { makeChannelHandler } from '../../../src/main/ipc/register'
+import { clipboardReqSchema } from '../../../src/shared/ipc/schemas'
+import { makeIpcDeps } from '../../utils/ipc-deps'
+
+function makeExportService() {
+  return {
+    buildBibtex: vi.fn(async () => '@misc{zhang_smart,\n  title = {T}\n}'),
+    buildCsv: vi.fn(async () => '\uFEFFTitle,Authors\n'),
+    buildReport: vi.fn(async () => '# 报告'),
+    writeToFile: vi.fn(async () => undefined)
+  }
+}
+
+/** 组装 deps：clipboard 写口桩（零 electron）+dialogs.saveFile 间谍（E7 无对话框锚） */
+function makeDeps(
+  exportService: ReturnType<typeof makeExportService>,
+  clipboard: { writeText: (text: string) => void }
+) {
+  const saveFile = vi.fn(async () => 'E:/out/x')
+  const deps = {
+    ...makeIpcDeps({
+      services: { export_: exportService as never },
+      dialogs: { saveFile }
+    }),
+    clipboard
+  }
+  return { deps, saveFile }
+}
+
+describe('ipc/export_.clipboard —— 先构建后写剪贴板（无对话框即无 CANCELLED）', () => {
+  it('bibtex 分支：委托 buildBibtex 逐参+写剪贴板收构建内容+count 回传+零对话框', async () => {
+    const exportService = makeExportService()
+    const clipboard = { writeText: vi.fn(() => undefined) }
+    const { deps } = makeDeps(exportService, clipboard)
+    const ipc = createExportIpc(deps)
+    const r = await ipc.clipboard({ format: 'bibtex', paperIds: ['p-1', 'p-2'] })
+    expect(exportService.buildBibtex).toHaveBeenCalledWith(['p-1', 'p-2'])
+    expect(exportService.buildCsv).not.toHaveBeenCalled()
+    expect(clipboard.writeText).toHaveBeenCalledWith('@misc{zhang_smart,\n  title = {T}\n}')
+    expect(r).toEqual({ count: 2 })
+  })
+
+  it('csv 分支：委托 buildCsv（buildBibtex 零调用），count=1', async () => {
+    const exportService = makeExportService()
+    const clipboard = { writeText: vi.fn(() => undefined) }
+    const { deps } = makeDeps(exportService, clipboard)
+    const ipc = createExportIpc(deps)
+    const r = await ipc.clipboard({ format: 'csv', paperIds: ['p-1'] })
+    expect(exportService.buildCsv).toHaveBeenCalledWith(['p-1'])
+    expect(exportService.buildBibtex).not.toHaveBeenCalled()
+    expect(clipboard.writeText).toHaveBeenCalledWith('\uFEFFTitle,Authors\n')
+    expect(r).toEqual({ count: 1 })
+  })
+
+  it('E5 先构建后写：service 抛错上抛且剪贴板零调用（零副作用）', async () => {
+    const exportService = makeExportService()
+    exportService.buildBibtex.mockRejectedValue(new Error('db 取数失败'))
+    const clipboard = { writeText: vi.fn(() => undefined) }
+    const { deps } = makeDeps(exportService, clipboard)
+    const ipc = createExportIpc(deps)
+    await expect(ipc.clipboard({ format: 'bibtex', paperIds: ['p-1'] })).rejects.toThrow('db 取数失败')
+    expect(clipboard.writeText).not.toHaveBeenCalled()
+  })
+
+  it('E6 写失败上抛：clipboard.writeText 抛错时 handler rejects（register 层折叠既有面）', async () => {
+    const exportService = makeExportService()
+    const clipboard = { writeText: vi.fn(() => { throw new Error('clipboard locked') }) }
+    const { deps } = makeDeps(exportService, clipboard)
+    const ipc = createExportIpc(deps)
+    await expect(ipc.clipboard({ format: 'csv', paperIds: ['p-1'] })).rejects.toThrow('clipboard locked')
+  })
+
+  it('E7 无对话框：剪贴板路径全程零 saveFile 调用（与文件导出语义差异）', async () => {
+    const exportService = makeExportService()
+    const clipboard = { writeText: vi.fn(() => undefined) }
+    const { deps, saveFile } = makeDeps(exportService, clipboard)
+    const ipc = createExportIpc(deps)
+    await ipc.clipboard({ format: 'bibtex', paperIds: ['p-1'] })
+    expect(saveFile).not.toHaveBeenCalled()
+  })
+
+  it('E3 schema 层空选集拒：paperIds=[] → INVALID_REQUEST（零 service 调用）', async () => {
+    const exportService = makeExportService()
+    const clipboard = { writeText: vi.fn(() => undefined) }
+    const { deps } = makeDeps(exportService, clipboard)
+    const ipc = createExportIpc(deps)
+    const handler = makeChannelHandler(
+      clipboardReqSchema,
+      ipc.clipboard as unknown as (req: unknown) => Promise<unknown>
+    )
+    const r = (await handler({ format: 'bibtex', paperIds: [] })) as {
+      ok: boolean
+      error: { code: string }
+    }
+    expect(r.ok).toBe(false)
+    expect(r.error.code).toBe('INVALID_REQUEST')
+    expect(exportService.buildBibtex).not.toHaveBeenCalled()
+  })
+})
diff --git a/tests/unit/renderer/paper-detail-clip.test.tsx b/tests/unit/renderer/paper-detail-clip.test.tsx
new file mode 100644
index 0000000000..2c2f17141d
--- /dev/null
+++ b/tests/unit/renderer/paper-detail-clip.test.tsx
@@ -0,0 +1,194 @@
+// @vitest-environment jsdom
+/**
+ * P7E-04 剪贴板导出 UI 面（always-active——三屋新测试不经 guardedDescribe）。
+ * E1/E2：按钮存在+invoke 形状+toast 文案逐字；E4：busy 门短路零重复 invoke
+ * （hook 直测——harness 按钮不带 disabled/loading，门本身是被测面，组件面
+ * disabled 已由 Button 既有契约覆盖）；E6：动作型失败 toast「复制到剪贴板失败」
+ * +busy 复位；拆件回归：report/bibtex/corpus/enrich 既有动作经
+ * usePaperDetailActions hook 路径仍工作（拆件零行为漂移判据——受锁
+ * paper-detail-export.test.tsx 零改全绿之外的补充面）。
+ */
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { afterEach, beforeEach, expect, it, vi } from 'vitest'
+import type { PaperDetail } from '../../../src/shared/models/paper'
+import type * as clientModule from '../../../src/renderer/api/client'
+import type * as toastModule from '../../../src/renderer/shared/ui/Toast'
+
+const { stubApi, toastSpy } = vi.hoisted(() => ({
+  stubApi: {
+    library: { detail: vi.fn() },
+    enrich: { fetch: vi.fn() },
+    export_: { report: vi.fn(), bibtex: vi.fn(), corpus: vi.fn(), clipboard: vi.fn() },
+    system: { openExternal: vi.fn() }
+  },
+  toastSpy: vi.fn()
+}))
+
+// client 只 stub api 门面；unwrap/ApiClientError 保留真实现（Result 解包契约同型）
+vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
+  const real = await importOriginal<typeof clientModule>()
+  return { ...real, api: stubApi }
+})
+vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
+  const real = await importOriginal<typeof toastModule>()
+  return { ...real, showToast: toastSpy }
+})
+
+import { PaperDetailPanel } from '../../../src/renderer/features/library/PaperDetailPanel'
+import { usePaperDetailActions } from '../../../src/renderer/features/library/usePaperDetailActions'
+
+function makeDetail(): PaperDetail {
+  return {
+    id: 'paper-1',
+    title: '样例论文',
+    authors: ['张三', '李四'],
+    year: 2026,
+    venue: 'Journal of Testing',
+    doi: '10.0000/demo',
+    tagNames: [],
+    collectionNames: [],
+    annotationCount: 2,
+    noteCount: 1,
+    lastReadPage: 0,
+    addedAt: '2026-08-24T00:00:00Z',
+    abstract: '摘要内容',
+    arxivId: null,
+    source: 'local',
+    enrichStatus: 'pending',
+    fileUrl: 'app-file://paper-1',
+    fileName: 'demo.pdf',
+    updatedAt: '2026-08-24T00:00:00Z',
+    tags: [],
+    collections: []
+  }
+}
+
+let root: Root | null = null
+let host: HTMLDivElement | null = null
+
+async function renderPanel(): Promise<void> {
+  stubApi.library.detail.mockResolvedValue({ ok: true, data: makeDetail() })
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+  await act(async () => {
+    root?.render(<PaperDetailPanel paperId="paper-1" />)
+  })
+}
+
+/** hook 直测 harness：裸按钮不带 disabled/loading——busy 门本身是被测面 */
+function Harness(props: { detail: PaperDetail | null; onRefresh: () => void }): JSX.Element {
+  const { runAction } = usePaperDetailActions(props.detail, props.onRefresh)
+  return (
+    <button type="button" onClick={() => void runAction('bibtex-clip')}>
+      bare-clip
+    </button>
+  )
+}
+
+async function renderHarness(): Promise<HTMLButtonElement> {
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+  await act(async () => {
+    root?.render(<Harness detail={makeDetail()} onRefresh={() => {}} />)
+  })
+  return host.querySelector('button') as HTMLButtonElement
+}
+
+function findButton(label: string): HTMLButtonElement | undefined {
+  return [...(host?.querySelectorAll('button') ?? [])].find((b) => b.textContent === label)
+}
+
+async function click(label: string): Promise<void> {
+  const btn = findButton(label)
+  expect(btn, `按钮存在：${label}`).toBeDefined()
+  await act(async () => {
+    btn?.click()
+  })
+}
+
+beforeEach(() => {
+  vi.clearAllMocks()
+})
+
+afterEach(async () => {
+  await act(async () => {
+    root?.unmount()
+  })
+  host?.remove()
+  root = null
+  host = null
+})
+
+it('E1 复制 BibTeX：clipboard 以 {format:bibtex, paperIds:[id]} 调用，toast 逐字含条数', async () => {
+  stubApi.export_.clipboard.mockResolvedValue({ ok: true, data: { count: 1 } })
+  await renderPanel()
+  await click('复制 BibTeX')
+  expect(stubApi.export_.clipboard).toHaveBeenCalledWith({ format: 'bibtex', paperIds: ['paper-1'] })
+  expect(toastSpy).toHaveBeenCalledWith('已复制 1 条题录到剪贴板', 'success')
+})
+
+it('E2 复制 CSV：clipboard 以 {format:csv} 调用，toast「已复制 1 行列表到剪贴板」', async () => {
+  stubApi.export_.clipboard.mockResolvedValue({ ok: true, data: { count: 1 } })
+  await renderPanel()
+  await click('复制 CSV')
+  expect(stubApi.export_.clipboard).toHaveBeenCalledWith({ format: 'csv', paperIds: ['paper-1'] })
+  expect(toastSpy).toHaveBeenCalledWith('已复制 1 行列表到剪贴板', 'success')
+})
+
+it('E4 busy 门：exporting 进行期再触发短路（零重复 invoke），完成后 toast 正常', async () => {
+  let resolveClip: (v: unknown) => void = () => {}
+  stubApi.export_.clipboard.mockReturnValue(
+    new Promise((res) => {
+      resolveClip = res
+    })
+  )
+  const btn = await renderHarness()
+  await act(async () => {
+    btn.click()
+  })
+  await act(async () => {
+    btn.click()
+  })
+  expect(stubApi.export_.clipboard).toHaveBeenCalledTimes(1)
+  await act(async () => {
+    resolveClip({ ok: true, data: { count: 1 } })
+  })
+  expect(toastSpy).toHaveBeenCalledWith('已复制 1 条题录到剪贴板', 'success')
+})
+
+it('E6 写失败：动作型失败 toast「复制到剪贴板失败」+busy 复位（可再次触发）', async () => {
+  stubApi.export_.clipboard.mockResolvedValue({
+    ok: false,
+    error: { code: 'INTERNAL', message: '写剪贴板失败' }
+  })
+  await renderPanel()
+  await click('复制 BibTeX')
+  expect(toastSpy).toHaveBeenCalledWith('复制到剪贴板失败', 'error')
+  await click('复制 BibTeX')
+  expect(stubApi.export_.clipboard).toHaveBeenCalledTimes(2)
+})
+
+it('拆件回归：report/bibtex/corpus 文件导出经 hook 路径仍工作（toast 逐字）', async () => {
+  stubApi.export_.report.mockResolvedValue({ ok: true, data: { filePath: 'C:\\e\\r.md', count: 1 } })
+  stubApi.export_.bibtex.mockResolvedValue({ ok: true, data: { filePath: 'C:\\e\\a.bib', count: 1 } })
+  stubApi.export_.corpus.mockResolvedValue({ ok: true, data: { filePath: 'C:\\e\\corpus', count: 1 } })
+  await renderPanel()
+  await click('导出读书报告')
+  await click('导出 BibTeX')
+  await click('导出语料 md')
+  expect(toastSpy).toHaveBeenCalledWith('已导出 1 条内容：C:\\e\\r.md', 'success')
+  expect(toastSpy).toHaveBeenCalledWith('已导出 1 条题录：C:\\e\\a.bib', 'success')
+  expect(toastSpy).toHaveBeenCalledWith('已导出语料 md：C:\\e\\corpus', 'success')
+})
+
+it('拆件回归：enrich 经 hook 路径仍工作（成功 toast+触发详情重读）', async () => {
+  stubApi.enrich.fetch.mockResolvedValue({ ok: true, data: makeDetail() })
+  await renderPanel()
+  await click('增强元数据')
+  expect(stubApi.enrich.fetch).toHaveBeenCalledWith({ paperId: 'paper-1' })
+  expect(toastSpy).toHaveBeenCalledWith('元数据增强完成', 'success')
+  expect(stubApi.library.detail).toHaveBeenCalledTimes(2)
+})
diff --git a/tickets/registry.ts b/tickets/registry.ts
index 85d260d64a..6ae471ea16 100644
--- a/tickets/registry.ts
+++ b/tickets/registry.ts
@@ -235,6 +235,7 @@ export const TICKETS: readonly Ticket[] = [
   { id: 'B7', file: 'src/main/services/tags.service.ts', area: 'service', owner: 'strong', status: 'done', summary: 'tags upsert 纯空格名空判守卫（AUDIT-B W1 修票——B7 探针实锤 upsert 空格串入库 name 空行；修=对齐 rename 先例 trim 空 INVALID_REQUEST；主控压缩票 SR2-F-09 形态；先红 2/绿 3/变异 M1 定点撤卫 2 红还原核毕；门一 Kimi PWW（W=程序序 registry 翻态在收口——历票惯例+N1 票面同步+N2 locks 收口兑现）+门二 deepseek PASS 零发现；verify 135 文件 1163/locks 251；票面 scripts/audits/b7-brief.md+双门审档在案）' },
   { id: 'C-A3', file: 'src/renderer/features/notes/notes.store.ts', area: 'reader', owner: 'strong', status: 'done', summary: 'AUDIT-C C-3 扫描 §1.2-a 主候选修票（二波场 2026-09-02）：notes 防抖悬置写三件套=①discard API（discardPendingEdit/discardAllPendingEdits——清 timer+四元数据+条目，幂等）②in-flight 代际守卫（discardGen 派发快照+.then/.catch 回调首行全 no-op——防回调复活条目）③接线两点（tab-dirty confirmCloseDirty 守门内弃改收口=一切 tab 关闭路径必经；workspace.store switchTo 确认后 discardAll——check-quality 白名单受控例外）；main 归属校验已在职零改动（notes.service findById→NOT_FOUND——扫描报告「FK 偶然兜底」口径修正）；跨格序列①②③④逐一测试锚（含 e2e 复活面端到端「已保存」载入锚）；INV-50 登记+INV-35④ 兑现修订；门一 Kimi 0B/3W/8N 条件 PASS（W1 reject 版序列②主控压缩票补销+变异恰红/W3 App 聚合含 notes pending 代码面核验成立/W2 load×discard 裁定接受残余=重建条目为服务器基线复活不可能）+门二 deepseek 终审；实现者 GLM5.3 统一档 6.18M tok+主控压缩票 W1 补锚；票面 auditc-a3-brief.md+报告 auditc-a3-impl.report.md+两门审档在档' },
   { id: 'P7E-03', file: 'src/renderer/features/reader/ReaderToolbar.tsx', area: 'reader', owner: 'strong', status: 'done', summary: '页内高亮搜索（P7-E 预留点清扫三票；b3: P7-E+B1 §3 预留 ReaderToolbar.tsx:7,163+ReaderShortcuts.ts:38；Design=索引全文档（逐页 getTextContent 文本域，未渲染页也计数）+高亮仅渲染窗口（TextLayer DOM span 建 Range 取 clientRects——pdfjs 4.10 每项恰一 span 前提，数量不符降级零高亮只计数）+代际守卫（submit 自增/close/reset 失效）+ReaderToolbar searchBox slot 兑现占位（缺席=旧占位兜底——受锁夹具零破坏）+ctrl+f 独立 keymap id reader-search（不经 ReaderShortcuts 受锁面）；新五源文件（reader-search.ts 纯函数域/store/ReaderSearchBox/SearchHighlightLayer/useReaderSearch）+Enter 提交制（再按=下一处/Shift+Enter 上一处/Esc 关）+两段式滚动（pageTurner→setPage scroll:to 页盒顶+active scrollIntoView 居中）；态空间 S1~S12 逐格锚+INV-55 登记；门一 Kimi FAIL 1B/3W/5N→回炉 R1 七修（S11 MO 重算锚+M6 代偿/bindDoc 会话身份记账修重挂漏洞/lastCentered store 记账防滚动劫持/wiring 三测/逐项安全降小写/S2 spy/descriptor 还原）→复核 PWW 新 2W→回炉 R2 三改（Enter trim 比较/IME isComposing 守卫——中文主路径/非保长语料注释诚实化）→定点复核 PASS 零发现+门二 deepseek PASS 零发现（首调 32k 截断 PARSE_ERROR→64k 重试通过）；实现者 GLM5.3 统一档三轮 ~32.0M tok（环境无 model 参数欠账披露）；单测 140 文件 1219（既有实测 136/1163——v31 基线 135 勘误+56 新增）/locks 256（251+5）/e2e 36（35+1）；环境事件=e2e 超时硬杀砸中 seedPaperRow 换绑窗（绑定残留已恢复+md5 亲验 electron-v146——隐患记档属受锁共享面）；票面 scripts/audits/p7e-03-brief.md+报告+三轮门审档在案）' },
+  { id: 'P7E-04', file: 'src/main/ipc/export_.ts', area: 'ipc', owner: 'strong', status: 'open', summary: '导出剪贴板（P7-E 预留点清扫四票；b3: P7-E+B1 §3 预留 export.service.ts:27；Design=单通道 export/clipboard（format bibtex|csv 枚举）+main 侧构建 main 侧写（内容不过 renderer——deps.clipboard 注入）+构建器单源（buildBibtex/buildCsv 复用）；PaperDetailPanel 248 行贴 250 红线→usePaperDetailActions hook 拆件；态空间 E1~E8+INV-56 登记）' },
 ] as const
 
 export const TICKET_MAP: ReadonlyMap<string, Ticket> = new Map(TICKETS.map((t) => [t.id, t]))
```

## 3. 实现者报告全文（含 §9 回炉处置）
```markdown
# P7E-04 实现报告（导出剪贴板——三屋第一屋·实现者子代理）

> 票面：scripts/audits/p7e-04-brief.md ｜ 派发：主控 P7E-04 派发令
> 实现者：GLM5.3 统一档（环境无 model 参数——欠账披露同 P7E-03 先例）
> 日期：2026-09-03 ｜ 禁 git/registry/locks 全程遵守

## 0 技能清点（开工纪律）

| 技能 | 用/不用 | 理由 |
|---|---|---|
| test-driven-development | 用 | 票面 TDD 红→绿→变异红证纪律 |
| verification-before-completion | 用 | 完成前分链自检真退出码 |
| systematic-debugging | 备用未触发 | 全程无不可解释红（红均为预期先红/变异红） |
| javascript-testing-patterns | 用 | 新单测编写参考（桩/mock 形态循既有 crib） |
| e2e-testing-patterns | 用 | 新 e2e spec（P7-A 主进程读回先例/种子配方） |
| subagent-driven-development | 不用 | 实现者屋不派发子代理 |
| code-review-excellence / receiving-code-review | 不用 | 门审归门一/门二，实现者不审查 |
| 其余（frontend-design 等） | 不用 | 本票无视觉面、纯 IPC+hook 逻辑 |

配置自查：node v24.20.0（Volta 项目 pin 生效）；自身=GLM5.3 统一档（派发令档位）。

## 1 实现摘要

- **契约**：单通道 `export/clipboard`——req `{ format: 'bibtex'|'csv', paperIds: string[] }`
  （schema 层 min(1) 空选集拒），res `{ count }`（exportRes 的 count 子集，值位 inline）。
- **main 侧**：handler 先构建（buildBibtex/buildCsv 单源直用零改）后经
  `deps.clipboard.writeText` 写系统剪贴板；bootstrap 装配 `electron.clipboard`；
  无对话框→无 CANCELLED 分支（E7，export_.ts 头注+测试 saveFile 零调用锚双声明）。
- **renderer 拆件**：runAction 分发+enriching/exporting busy 态+toast 收口整体迁
  `usePaperDetailActions.ts`（新 hook，props 面零变，按钮驻面板）；action 联合扩
  `'bibtex-clip' | 'csv-clip'`；按钮区导出组相邻位 +「复制 BibTeX」「复制 CSV」；
  toast 逐字：成功「已复制 N 条题录到剪贴板」/「已复制 N 行列表到剪贴板」、
  失败「复制到剪贴板失败」。
- **生命周期**：export.service.ts:27 原「v2 预留：ipc 加通道」注记兑现修订；
  PaperDetailPanel 头注动作清单同步（+P7E-04 拆件说明）。

## 2 文件清单（括号=行数，全件 ≤500、组件 ≤250）

改动（7）：
- src/shared/ipc/schemas.ts（461，门一 N2 后）—— +clipboardReqSchema（受锁件，主控预解锁授权面）
- src/shared/ipc/api-surface.ts（227）—— export_ 域 +clipboard 通道（同上）
- src/main/ipc/ipc-deps.ts（28）—— +clipboard 可选注入面（见 §6-1 超票面申报）
- src/main/ipc/export_.ts（148）—— +exportClipboard（先构建后写+E7 头注）+handler 挂载
- src/main/bootstrap.ts（258）—— electron import +clipboard；deps 装配 +clipboard
- src/main/services/export_/export.service.ts（233）—— 仅 :27 生命周期注记修订（零行为改动）
- src/renderer/features/library/PaperDetailPanel.tsx（218，门一 N3 后；原 248）—— 拆件瘦身+两按钮+头注票内增量

新建（4）：
- src/renderer/features/library/usePaperDetailActions.ts（112，门一 N1 后）
- tests/unit/ipc/export-clipboard.test.ts（108，always-active，6 用例）
- tests/unit/renderer/paper-detail-clip.test.tsx（194，jsdom，always-active，6 用例）
- tests/e2e/export-clipboard.spec.ts（63，1 综合用例，test.setTimeout(120_000)）

## 3 先红证据（scripts/audits/p7e-04-red/）

- unit-full.raw.txt：`npm run test` → **exit=1**，Test Files 2 failed | 140 passed (142)、
  Tests 6 failed | 1219 passed (1225)——恰两个新 unit 文件红（ipc 6 用例逐个红：
  `ipc.clipboard is not a function`/`clipboardReqSchema` undefined；renderer 文件=
  import usePaperDetailActions 缺失模块级红），既有 1219 全绿零波及。
- e2e-build.raw.txt：未实现态 `npm run build` exit=0（红不来自构建）。
- e2e-targeted.raw.txt：`npx playwright test tests/e2e/export-clipboard.spec.ts` →
  **exit=1**，红因=「复制 BibTeX」按钮 element(s) not found（选中→详情面板链路已通，
  红因正确锚在缺失功能面）。

## 4 绿证据+用例数实测（scripts/audits/p7e-04-green/）

- unit-full.raw.txt：`npm run test` → **exit=0**，**Test Files 142 passed (142)、
  Tests 1231 passed (1231)**。基线 140/1219 → **+2 文件 +12 用例**（ipc 6+renderer 6，
  实测非估算）。
- **拆件正确性判据成立**：受锁 tests/unit/renderer/paper-detail-export.test.tsx
  零改、含在全绿 142 内通过（report/bibtex 入口与 CANCELLED toast 断言原样绿）。
- e2e 定向（scripts/audits/p7e-04-e2e-targeted.raw.txt）：build exit=0 + playwright
  **exit=0**，`1 passed (2.1s)`——「复制 BibTeX」→toast 可见+主进程 clipboard.readText
  含 @+title。e2e 面 36→37（+1）。

## 5 变异红证四组（cp 备份法：cp 备份→变异→定向测→cp 还原→diff 确认空）

| # | 变异 | 定向测 | 红 | 还原 diff |
|---|---|---|---|---|
| M1 | handler 删 format 分支恒走 buildBibtex | export-clipboard.test.ts | exit=1，1 failed——csv 用例红（buildCsv 零调用） | 空（mut-m1.raw.txt） |
| M2 | 换序先写剪贴板（writeText('') 前置）后构建 | 同上 | exit=1，3 failed——含 E5「剪贴板零调用」断言红 | 空（mut-m2.raw.txt） |
| M3 | hook busy 门删（enriching/exporting 双 if-return 摘除） | paper-detail-clip.test.tsx | exit=1，1 failed——E4 零重复 invoke 断言红（变 2 次） | 空（mut-m3.raw.txt） |
| M4 | toast 文案删 N 计数（`已复制 条题录到剪贴板`） | 同上 | exit=1，2 failed——E1 逐字断言红（E4 完成段 toast 同面连带） | 空（mut-m4.raw.txt） |

四组均先证命中再断红；备份经 /tmp，未用 git checkout（未提交实现保护）。

## 6 超票面自裁申报（逐项——请主控/门审查看）

1. **IpcDeps.clipboard 设为可选属性（非必填）+handler 响亮守卫**。卡点：受锁
   tests/utils/ipc-deps.ts（makeIpcDeps 桩工厂，返回类型标注 IpcDeps）在
   tsconfig.node.json include（tests/**）内——设必填即其返回字面量 TS2739 类型红，
   而该文件属禁改面。处置：`clipboard?: { writeText(text: string): void }` 可选+
   注释固化原因；handler 首行 undefined 守卫抛错（装配缺失响亮失败不静默丢写）；
   bootstrap 恒装配→生产路径恒有值；票面「ipc-deps 注入口」设计语义保持。
   该守卫不在 E1~E8 态空间内（配置错误面，非用户态）。
2. **两受锁件编辑时文件系统仍带只读位**（-r--r--r--）：票面称「已预解锁可直接改」
   与实况不符。处置：仅对这两件 chmod u+w 后编辑（授权面内）；未触
   unlock/lock-protected.ps1、check-locks.mjs 与 locks/ 目录；收尾未自 relock
   （按派发令留主控统一收口）。
3. **剪贴板失败 toast 统一「复制到剪贴板失败」**（E5 构建失败与 E6 写失败同面）：
   票面③只给一条失败文案且剪贴板路径无 CANCELLED（E7）——构建/写入失败对用户
   同呈现为动作失败（INV-02 动作型），不透传底层 message。
4. **E4 单测经 hook 直测 harness**（裸 button 不带 loading/disabled）：组件面
   Button loading=disabled 已挡 DOM 双击——不解除 DOM 面则 M3 变异（hook 门删）
   无法红（门被 DOM 挡板遮蔽）。harness 使 hook 门本身成为被测面，M3 红证成立。
5. **e2e 读回带 P7-A 同型竞态防线**（清场标记 `__p7e04_cleared__`+条件重读
   5×200ms+失败信息带末次读值）——循受锁 reader-text.spec.ts 先例，断言锚未放宽。
6. **E7 以「saveFile 零调用」测试锚落地**（票面 E7 为声明性条目——单测锚+头注双声明）。
7. **diff 划界**：`git status` 中 `M tickets/registry.ts` =主控派发预置的 P7E-04
   工单条目（status: 'open'，我读到的初始态即含），本实现者零触碰；
   scripts/audits/ 下大量非 p7e-04 前缀未跟踪文件=既有场次残留，与本票无关。
   本票新增未跟踪面=4 新文件+p7e-04-* 证据件；改动面=上表 7 文件（registry 除外）。
8. **删减面自查**：无删减——票面声明的全部件（schema/通道/deps/bootstrap/hook/
   两按钮/注记修订/三测试文件/四变异）全数落地；未顺手实现票外任何面。

## 7 分链自检（scripts/audits/p7e-04-selfcheck.raw.txt，各链真退出码）

quality:check=0 ｜ tickets:check=0 ｜ lint=0 ｜ typecheck=0 ｜ test=0 ｜ build=0
（verify 全链与 locks:check 按派发令未跑——新测试入锁归主控收口；
预期 locks 256→259：+2 unit+1 e2e spec，见票面 ⑤ 锁序纪律）

## 8 疑虑与披露

- IPC 契约测试为结构推导（无硬编码通道枚举），新通道经 contracts 三方对账自动
  覆盖——typecheck+contracts 测试绿已证。
- e2e 全量（36+1）未跑（派发令口径=定向）；定向 1.7s 一次性绿，无 flake 面。
- 本票时间线无环境事件（无换绑窗破坏/无 Node 版本漂移）。
- M4 变异连带 E4 完成段 toast 红（同文案面），红证效力不受影响（E1 逐字锚在列）。

## 9 门一回炉 R1（Kimi PWW 0B/1W/4N——主控裁决三小修一登记一记档）

四大重点面（拆件/守卫/竞态防线/文案逐字）全过。处置与复跑：

- **N1（修）**：usePaperDetailActions catch 的 isClip 分支在 showToast 前补
  `console.error('[PaperDetailActions] 剪贴板导出失败', e)`——repo 惯例
  `[模块] 中文描述`（AnnotationLayer/App/reader.store 同型实测核对）；「剪贴板
  依赖未装配」类配置缺陷控制台可区分。零新测试面，E1~E8 断言零改。
- **N2（修）**：schemas.ts `export type ClipboardReq` 死导出删除——本仓 grep
  实测零消费（api-surface 消费 schema 值非推断类型）；typecheck 绿复核。
- **N3（修）**：PaperDetailPanel 头注票外 C-06 叙述回退——①状态翻回
  `工单：open`（翻 done 归 C-06 自己的场次）；②架构层「改动面/白名单删条目
  [locked-change]」原段逐字恢复（压缩版删除）。保留票内增量：行为层 P7E-04
  动作清单+拆件说明块。**N3 回退零红**（无断言锚定头注文案——若红将停报
  BLOCKED，未触发）。
- **W1（登记不修）**：IpcDeps.clipboard 可选化还原项已按主控令登记交接书
  （下次合法触碰 tests/utils/ipc-deps.ts 的场次补必填+桩工厂同步）——本票零改动。
- **N4（记档不修）**：busy 门闭包竞态=原组件既有语义保真迁移，非本票引入。

复跑证据（scripts/audits/p7e-04-gate1-r1/）：
- targeted-2files.raw.txt：两定向文件 `npm run test -- <2 文件>` → **exit=0，
  12/12 passed**。
- unit-full.raw.txt：全量 `npm run test` → **exit=0，142 文件/1231 用例不变**
  （主控预期「零用例数变化」兑现）。
- lint-typecheck.raw.txt：lint **exit=0** + typecheck **exit=0**。
- locks/registry/invariants 未动（派发令）。
```

## 4. 门一链 verdict 汇总
- 初审 p7e-04-gate1.json：PWW 0B/1W/4N——四重点面（拆件/守卫/竞态防线/文案逐字）全过。裁决：N1(console.error)/N2(死导出删)/N3(头注票外叙述回退)=修；W1(可选化还原项)=登记交接书；N4(busy 门闭包竞态=既有语义)=记档。
- R1 复核 p7e-04-gate1-r1.json：**PASS**（「三修定点复核全部 ADDRESSED…新破坏扫描干净…判 PASS」；余 1 NIT=E6 预期内 console 噪音）。

## 5. 机器面数字（主控亲验）与成本
- 主控亲跑：新 2 文件 12/12 绿；全量链归收口（主控将跑 verify 全链+locks 三连+全量 e2e 37）。
- 成本：实现者 GLM5.3 统一档两轮 8.25M tok/96 工具/25min（6.39M+1.86M）；门一 Kimi in=19656/out=6904/183s+r1 in=12562/out=2307/80s；门二=本次调用（回执后补数）。
