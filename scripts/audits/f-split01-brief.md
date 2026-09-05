# F-SPLIT-01 实现者简报——五件贴线组件纯结构拆件（主控→实现者子代理）

> 档位声明（§4.5 单一调用者）：实现者=**GLM5.3flash**（供应商=体验套餐优先，
> 思考等级=中）。本简报自包含——你无会话历史，一切任务信息以本文+票面为准。

## ① 身份与禁令

- 你是实现者子代理，领单 **F-SPLIT-01**（tickets/registry.ts:249 票面=完整任务书）。
- **禁 git add/commit/push、禁翻 registry 状态、禁碰 tickets/**（控制面单写者纪律）。
- 禁新增依赖；禁修改 tests/**、src/shared/**、一切受锁面（CI sha256 对账）。
- 禁动 `scripts/audits/p7d01-out/` 目录（主控已采 baseline 双跑在档——你的任何
  写入会污染对比基线）。
- 卡住=BLOCKED 停手报告，不自裁放行。

## ② 必读序（文件清单化）

1. `AGENTS.md`——宪法（代码组织/测试纪律节重点）。
2. `tickets/registry.ts` F-SPLIT-01 条目——票面全文。
3. 五件标的（全文读，头注即架构文档）：
   - `src/renderer/features/reader/PageColumn.tsx`（249 行）
   - `src/renderer/features/reader/AnnotationLayer.tsx`（249 行）
   - `src/renderer/features/reader/AiNotesSection.tsx`（249 行）
   - `src/renderer/features/lineage/LineageBoard.tsx`（249 行）
   - `src/renderer/features/reader/ReaderPage.tsx`（248 行）
4. 先例池（拆件范式参照，看头注分节与职责段迁移形态）：
   - `src/renderer/features/reader/page-column-geometry.ts`——纯函数拆件先例
     （PageColumn 旁系，头注「[SR2-F-01] 增补」段=职责随迁样板）；
   - `src/renderer/features/reader/PageBox.tsx`——子组件拆件先例（单双页共用，
     F-R1 场景从 PageColumn 拆出）；
   - `src/renderer/features/reader/annotation-resolve-layered.ts`——域模块拆件
     先例（F-A8 门 2 新件，头注态空间 S0~S6 分节）。

## ③ 主控裁决（票面范围内澄清——不再自裁这些点）

1. **红线数字口径**：组件物理行关卡=check-quality.mjs:124（`split('\n')` 口径
   上限 250；wc -l 口径即 ≤249 且尾行有换行）。ESLint max-lines=500 之外还有
   此更紧关卡。**拆后每个 .tsx 文件（含原文件与全部新拆文件）wc -l ≤169**
   （=距关卡 ≥80 行余量，票面条款）。新拆 .ts 文件（纯函数/hook）受 300/500
   口径，无 80 行余量要求。
2. **切分建议（方向性——你现场核块边界，更优切分须申报）**：
   - PageColumn：懒渲染窗口（IntersectionObserver effect+visible/rendered 状态
     对）抽 `usePageLazyWindow` hook 或 JSX 页行块抽组件；**禁动就绪管线 deps、
     段⑥缩放锚程序滚动、F-ARCH3 零变纪律（不加 useCallback/useMemo）**。
   - AnnotationLayer：弹层块（四选项 menu+AnnotationEditor 编辑 JSX）抽子组件
     （文件内私有组件或同域新件均可）；**F-A8 门 2 编排语义零改——
     resolved/fallbackBands/lineH 状态、三层编排（resolveAnnotationRectsLayered
     域标记 item/dom）、MutationObserver+rAF 合并、CR1 订阅域，全部禁触**。
     纯搬运=props 传递可用，但禁改状态归属（弹层可无本地状态）。
   - AiNotesSection：状态行+「AI 读文献」按钮块（STATUS_POLL_MS 轮询+六态判定
     呈现）抽子组件；derivePhase 纯函数随迁或留原处均可（申报）。
   - LineageBoard：节点菜单+pendingLink 连线目标选取流程 JSX 抽子组件；
     INV-27 树守卫呈现（toast 消费面）零改。
   - ReaderPage：空态引导块或装配 JSX 分组抽子组件；**sr2-lg-08 时序红线——
     挂载效应内「监听器注册先于闩锁消费」语句顺序禁动**（F-03 三口接线
     onScroll/wheel/pointerdown+keydown 零改）。
3. **头注纪律**（票面条款）：头注职责段**随代码迁移**——拆出的块，其在原文件
   头注中的对应描述段迁到新文件头注（新文件头注=迁移段+一句「[F-SPLIT-01]
   自 <原文件> 拆出 2026-09-05」）；原文件头注改写被拆走的描述为一句指针
   （「X 职责归 <新文件>」）。**信息量禁删减**——拆后两文件头注合计覆盖
   原头注全部架构信息。头注中的历史增补段（[F-R1 增补]/[F-A7 增补] 等）归
   其职责现所属文件。
4. **探针验收=主控位**：baseline 已采+双跑 DETERMINISM PASS（byte-identical
   在档）。你完成拆件后主控跑 after+COMPARE。你不跑探针、不碰 p7d01-out/。
5. **TDD 面豁免申报**：本票=纯结构搬运零行为差，无新行为面→无新测试（票面
   验收=现有测试全绿+探针零视觉差，均非实现者位新增）。此豁免依票面成立，
   非你自裁。

## ④ 纪律

- **纯搬运**：代码块搬移禁改写逻辑（重排 import/调 props 传递允许；禁改任何
  条件/依赖数组/语句顺序/默认值字面量）。
- 每件拆毕跑 `npm run test`（禁裸 npx vitest）确认零红；五件毕跑
  `npm run verify` 真退出码落盘 `scripts/audits/f-split01-verify.raw.txt`
  （`echo exit=$? >> 日志`——verify 全链含 build，~数分钟）。
- 证据日志统一 `.raw.txt` 后缀入库（.log 被 .gitignore 拦）。
- 新文件被引用检查：拆出件必须被原文件 import（死代码即删纪律）。
- UTF-8；中文注释保持可读。
- 分层单向：renderer 组件拆件仍在 renderer 域内，禁跨层 import。

## ⑤ 基线数字（自检参照）

- verify：**156 文件/1422 用例全绿**、locks 286、e2e 43（基线 2026-09-05
  HEAD=b1b28e4d0e 亲验在档 scripts/audits/f-audit01-verify-closeout.raw.txt）。
- 五件行数（wc -l）：249/249/249/249/248——你拆后目标每件 ≤169。
- lint/typecheck 基线全绿。

## ⑥ 报告契约

全文落 `scripts/audits/f-split01-impl.report.md`：
实现摘要（每件拆出什么/新文件名+行数）/文件清单（新建+修改）/verify 退出码+
用例数/自裁申报（切分点选择理由+任何超票面决定+删减面 diff 自查）/疑虑。
回复五行内：状态（DONE/BLOCKED）+新文件数+每件拆后行数+verify 结果+报告路径。
