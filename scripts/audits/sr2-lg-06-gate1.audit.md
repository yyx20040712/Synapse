# SR2-LG-06 门一深审（对抗性）——脉络跳转接笔记面板信号（缺陷 E2）

> 审计人：门一+门二联审孙代理（ENR-03 联审先例，主控裁量两门合并）。
> 对象：`scripts/audits/sr2-lg-06-gate1.diff`（5 文件）+ 票面 + 实现报告。
> 方法：只读静态深审（源码逐行比对 / check-tickets 规则正则核验 / manifest
> sha 独立复算 / git status 范围核对）；禁 npm/test/构建/tickets 触碰。
>
> **开工记录·技能清点**：code-review-excellence=用（审计本体）；
> verification-before-completion=用（逐项核对申报 vs 静态可验事实）；
> javascript-testing-patterns=用·轻量（评估 invocationCallOrder 断言强度
> 与 stub 先例一致性）；systematic-debugging=不用（无待隔离缺陷，审计非
> 调试）；test-driven-development=不用·执行面（不写测试，仅审 TDD 证据链）；
> requesting/receiving-code-review=不用（本角色是审查方非作者）；git 类
> 技能=不用（禁 git 写，仅只读 status/diff）。配置自查：本子代理按派单
> 联审配置执行，无独立档位可调。

## A. 接线位置与顺序（vs 票面 P1/P2）——过

实测 `src/renderer/features/reader/open-paper-anchor.ts:28-34`：

- 接线位于 `if (req.anchor !== undefined)` 分支内、`void locateAnchor(...)`
  之前一行，条件 `req.aiNoteId !== undefined`——与 P1 逐字一致（票面预给
  的正是该条件原式）。notify 与 locateAnchor 均为同步调用，顺序确定。
- **无锚路径零触碰**：`openPaper` 分支（:35-40）在 diff 中仅作上下文出现，
  一字未动；it「无锚请求→openPaper 既有链路」（test:246-251）未改仍在。
- **裸锚路径零触碰**：anchor 有值而 aiNoteId 缺省 → 条件假 → 不发 notify，
  locateAnchor 照常透传 `aiNoteId: undefined`（it② test:230-244 锁定）。
- P2「annotationId 场景不切笔记 tab」：OpenPaperRequest 类型本无
  annotationId 字段（`src/shared/open-paper-bus.ts:28-32` 实核：
  `{ paperId: string; anchor?: OpenPaperAnchor; aiNoteId?: string }`），
  标注跳转走 OutlineAside:71-87 `locateFragment` 直调 locateAnchor 链，
  不经本消费点——生产链层面该场景物理不可达，P2 语义成立。
- 微瑕（非缺陷，记录不回炉）：`aiNoteId !== undefined` 对空串 `''` 为真
  会 notify('')。票面 P1 原文即此条件（实现照票逐字），且现有生产者
  （LineageSidePanel 双击 / AiAnnotationLayer AI-09）均发真实 id，无空串
  载荷来源；若未来扩生产者须自保证非空。不构成回炉项。

## B. invocationCallOrder 断言强度——过（真锁「面板先行」语义）

it①（test:207-228）断言链：`toHaveBeenCalledTimes(1)` →
`toHaveBeenCalledWith('a1')` → 双方 `invocationCallOrder[0]` 各先
`toBeDefined()` 守卫 → `notify[0] < locateAnchor[0]`。

对抗性推演三种破坏形态，全部能红：

1. **notify 移到 locateAnchor 之后**（同步换序）→ 序号反转 → 红。
2. **notify 包进 setTimeout/微任务**（晚发）→ flush(6) 内 locateAnchor
   先记序号 → 红。这正是「持久 state 早发不丢」语义的机器化：瞬态事件
   晚发形态被顺序断言排除。
3. **notify 挪进 locate 成功回调**（条件化）→ 同 2，红。

结论：不是「只锁调用发生」，是把「面板信号先于定位」这一票面行为层
规约锁成了序号序。边界（如实登记）：本测试是消费方级——OutlineAside
实际切 tab 的效应不在本文件验（reader.store 被 mock），由 AI-09 既有
outline-aside.test.tsx 消费侧覆盖，两层合成全链。分层正确，非缺口。
断言依赖 `beforeEach vi.clearAllMocks()` 重置调用信息（vitest mockClear
语义含 invocationCallOrder），与文件既有 18 用例同一前提，20/20 绿为
实现报告实录佐证。

## C. 两自裁复核——均过（一附事实修正）

**① 头注 `[LG-06]` 简写**：实核 `scripts/check-tickets.mjs:72`
`ticketRefRe = /SR2?-[A-Z]+-\d+/g`——裸 `LG-06` 无 SR/SR2 前缀，**永不
匹配**，故无论 registry 有无此号都恒安全（比实现者论述的还强一档：不是
「registry 无此号所以安全」，是「正则结构性看不见」）。与同文件 LG-04
头链（「LG-04 接缝落地」，无前缀）及测试文件头 `[LG-04]` 同款，风格
一致。**主控建单后是否回写**：规则面非必需（建 SR2-LG-06 后若换
`[SR2-LG-06]` 亦合法——规则 2 对 `t.file === rel` 自引用豁免，见
check-tickets.mjs:100）；回写与否是排版选择，不构成收口阻塞。**但建单
另触发规则 6**（SR2-* 工单文件头须有 `// b3: P7-X` 指针行且 P7-X ∈
ROADMAP 已裁决集 P7-A~H，check-tickets.mjs:169-196）——open-paper-anchor.ts
现无此行，建单时须同步补（详见门二行动项）。
自裁程序合规：第一轮 VERIFY_EXIT=1 被机检拦截后改向、超票面决定如实
申报（§5.1），链路完整。

**② it② 裸锚支**：票面 P3 原文「（annotationId 或裸锚）」明文二选一；
tsc 实证 OpenPaperRequest 无 annotationId（本审计独立复核类型源码确认，
且 OutlineAside:71-87 证实标注链不经总线消费点）——annotationId 支
类型不合法，取裸锚在授权范围内且附类型事实说明（test:237-238 注释）。
合规，无越权。

## D. stub 池 notifyAiNoteStub 形态 vs 既有先例——过

- `vi.hoisted` 池追加 `notifyAiNoteStub: vi.fn()`（test:26-36）与
  openPaperStub/locateAnchorStub/requestAnchoredStub 四兄弟完全同型。
- reader.store mock 由单键 `getState: () => ({ openPaper })` 扩为双键
  `({ openPaper, notifyAiNoteHighlight })`（test:55-59）——票面 P3
  「stub 需含 notifyAiNoteHighlight」的最小满足，未顺手多 mock 任何
  其他 store 面；覆盖说明注释同步更新，与先例（注释解释 mock 边界）同构。
- 清理面：notifyAiNoteStub 无需 resolved value（同步 void 语义），
  `vi.clearAllMocks()` 统一清理，与既有 stub 无特例分支。

## E. 受锁面与 diff 范围——过

- 受锁改动=票面申报唯一面 `tests/unit/renderer/lineage-side-panel.test.tsx`
  + `locks/manifest.json`（sha 机械同步，144 条，独立复算见门二）。
- `git status` 实测：改动恰为 3 文件（manifest / open-paper-anchor.ts /
  测试），+62/-7 与实现报告 §2 逐文件账目吻合（12+53+4）。未跟踪面中
  `sr2-ai-11-brief.md`、`sr2-lg-07-brief.md`、`sr2-lg-06-gate1.diff` 为
  主控侧其他在建票面/本审 diff 包，非实现者蔓延。
- 头注 LG-04 链不动：diff 上下文 :210-212 显示原 LG-04 段原样保留，
  新段仅插入其后——P4「LG-04 头链不动」字面兑现。
- 新 2 it 为顶层 `it()`（不经 guardedDescribe）——三屋 K3 要求的
  always-active 兑现（test:207/230）。

## 门一裁决

**过，零回炉项**。A~E 全过；两自裁均在授权内且申报如实；一处事实增强
（正则结构性不可见）与一处微瑕记录（空串载荷无生产来源，票面原文如此）。
移交门二收口核。
