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
