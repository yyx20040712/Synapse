# SR2-LG-08 联审审计档（门一·对抗深审）

> 联审代理：GLM 独立子代理（三屋模式门一）。技能清点：code-review-excellence /
> systematic-debugging / test-driven-development / verification-before-completion
> 四技能用（代码联审+时序推演复演+TDD 证据审计+完成前逐项核对）；其余不用
> （本任务只读仓库、禁 npm/禁测试/禁 git 写，无操作面）。
> 输入件 6 份全读 + 源码只读核对 9 处（ReaderPage/open-paper-bus/open-paper-anchor/
> anchor-locate/LineageSidePanel/App/main.tsx/AiNotesSection/OutlineAside）+
> check-tickets.mjs/registry/manifest/.gitignore 核对。
> 时间：2026-08-28。裁决先例=ENR-03/LG-06/AI-12。

## 统计行

```
SR2-LG-08 联审：B=0 W=3 N=3 —— 放行提交：是（PASS，附 N-1 收口面必读预警）
```

## A. 时序推演独立复演（最高优先）—— 通过，根因定性维持

### A.1 源码事实基线（全部亲读核对）

- `open-paper-bus.ts:42-45`：`requestOpenPaperAnchored` = `lastRequest = req` +
  **同步** `window.dispatchEvent`；`requestOpenPaper(paperId)`(:37-39) = 无锚转发。
- `ReaderPage.tsx:116-123`（终态）：效应体内序 = `addEventListener`(:119) →
  `takePendingOpenPaper`(:120) → `open(pending)`(:121) → cleanup 移除监听器。
- `open-paper-anchor.ts:30-43`：anchor 分支 notifyAiNoteHighlight → `void
  locateAnchor(...)`；无锚分支 `openPaper(paperId).catch(toast)`（不再发事件，链终止无环）。
- `anchor-locate.ts:247-274`：quote≥2 且 tab 非 ready → `await waitOpen`；waitOpen
  :148-151 同步段 tab 缺席/error → `requestOpenPaper`（**事件②在 open(pending)
  调用栈内同步派发**——`await waitOpen(...)` 先同步执行到 waitOpen 内首个
  await(sleep)，requestOpenPaper 先于此）。
- `App.tsx:88-92`：App 级监听器 = `setView('reader')`（已 reader 时同值 no-op）。
- `main.tsx:9`：**StrictMode 实际在用**（dev 双挂载真实存在）。

### A.2 旧序时间线（缺陷复现——独立推演与主控定性一致）

| 帧 | 动作 | 监听器在场？ |
| --- | --- | --- |
| t0 | 双击 → `requestOpenPaperAnchored({A,anchor,n1})` → 闩锁=带锚请求 + 同步 dispatch **事件①** | 仅 App |
| t1 | 事件① → App handler → `setView('reader')` | 仅 App |
| t2 | React 卸 Lineage 挂 ReaderPage → 挂载效应（旧序 :118 消费在前） | 仅 App |
| t3 | `takePendingOpenPaper` → {A,anchor} → openFromBus → notifyAiNoteHighlight → locateAnchor 同步段（tab A 缺席）→ waitOpen 同步段 → `requestOpenPaper(A)` → 闩锁被重设为**无锚 {A}** + 同步 dispatch **事件②** | **仅 App（setView no-op）→ 事件②自丢失** |
| t4 | 效应体返回继续执行 `addEventListener`（迟两行，事件已逝） | ReaderPage L 注册（无用） |
| t5 | waitOpen 轮询 tabs[A] 永不出现（无任何角色调 openPaper）→ 8s 超时 → toast「打开文献超时」→ 停留原 active tab | 现象①「总跳最后打开的文章」复现 ✓ |
| t6 | 闩锁滞留 {A} → 用户切走再回 → remount 消费 → 无锚 openPaper(A) | 现象②「迟到打开」复现 ✓ |

两用户现象均由同一时序缺陷导出——**主控根因定性（挂载时序竞态）成立，维持**。

### A.3 新序时间线（修复闭合证明）

t0-t2 同上；t3'：效应体先注册 L → 消费闩锁 → openFromBus → locateAnchor →
waitOpen 同步段 → dispatch 事件② → **L 在场** → handler（paperId 校验过）→
open({A}) → openFromBus 无锚分支 → **`store.openPaper('A')`**（真链：tab 创建
loading→ready）→ waitOpen 轮询见 ready → activateTab+setPage → verifyWhenReady
→ 定位链完整闭合。**链路闭合证明成立**。

### A.4 攻击面核查（换序后行为不变性 + 无未注册窗口）

| 攻击面 | 推演结果 |
| --- | --- |
| tab 已存在 ready | locateAnchor 不入 waitOpen，无事件②，行为不变 ✓ |
| tab 存在 loading | waitOpen:149 条件不满足**不重发**（N4 头注），行为不变 ✓ |
| tab 存在 error | 旧序丢失→8s 超时；新序事件②被接住→openPaper 重试（状态机 error→loading）——**行为改善**非回归 ✓ |
| OutlineAside 页内路径 | locateAnchor 调用点 OutlineAside:76/AiNotesSection:194 均**用户单击触发**（非挂载效应，头注核对无自动触发面），OutlineAside 在 ReaderPage 子树内→父监听器已在场，行为不变 ✓ |
| 无锚路径 | openFromBus 无锚分支直调 openPaper 不经事件，与顺序无关 ✓（it② 修复前后均绿实证） |
| StrictMode 双挂载 | 新序：首轮 effect 注册 L1→消费→事件②被 L1 接住→openPaper；cleanup 移除 L1；二轮注册 L2→消费事件②重设的无锚 {A}→openPaper **幂等**（状态机 loading→追加+激活）→ 成立 ✓（票面生命周期层声明经独立推演证实） |
| unmount/remount 间隙 | 监听器缺席期派发源=用户交互（library.store:90/PaperDetailPanel:199/LineagePage:48），闩锁承载=总线设计本意 ✓ |
| **P5 论断攻击** | 事件②全部派发点=anchor-locate.ts:150（waitOpen）+:260（篇级），均位于 locateAnchor 调用栈内；locateAnchor 全部生产调用点=①openFromBus（挂载效应消费链 or 已注册 handler 内）②页内用户单击（父已注册）。**挂载期外未注册窗口不存在——P5 维持，第二保险否决正确** |

附注（N-2）：StrictMode 下旧序缺陷被二挂消费滞留闩锁「意外部分自愈」——dev
复测与生产 build（e2e）表现分裂的合理解释，佐证定性，不构成对修复的否定。

## B. 竞态测试质量 —— 通过

- **it① 真锁时序**：mock 面三件（api/client、PdfDocProvider、PageColumn）均不在
  竞态链上——client=jsdom 顶层 `api = window.api` 必需 stub（app-quit-dirty 配方）；
  两组件=渲染隔离，测试渲染路径=tab 缺席空态（ReaderPage:172 提前 return，被
  mock 组件不在渲染树）。竞态本体三要素（bus 同步 dispatch×listener 注册顺序×
  React effect 体）**全真件**。首红（spy 0 次）→绿（1 次）→变异红（还原旧序复红
  同错同断言）双向翻转=测试对效应内两行顺序敏感=真锁时序，非绕开。
- **首红 log 与断言本体对应**：AssertionError `111:26 toHaveBeenCalledTimes(1)
  got 0` 与终态测试文件 :111 断言行**行号+断言精确吻合**（123 行终态文件；gate1.diff
  中 195 行号是 diff 文件自身偏移）。变异红同错（00:13:36 vs 首红 00:12:56）。
  两 log 中 describe 名为大写 SR2-LG-08、verify 终态为小写——与自裁②时间线
  （变异红之后、verify 前改小写）自洽，诚实。
- **spy 替换**=anchor-locate.test.ts:74 同型先例（亲读核对）；断言单参数 'p1' 与
  `openPaper(id: string): Promise<void>`（reader.store:114）签名吻合；
  `toHaveBeenCalledTimes(1)` 兼防事件环/重复消费。
- **it② 回归锁强度**：锁 openFromBus 无锚分支不依赖监听顺序；首红 log 中 it②
  passed（修复前已绿）=申报诚实；强度中（防未来改坏），定位准确不冒充竞态锁。
- **always-active**：无 guardedDescribe（ADR-0017 裁决 3），verify 全量跑过实证 ✓。
- **fake timers/滞留**：beforeEach 启用+afterEach 还原；waitOpen 悬 promise 冻结于
  fake 队列（Date.now 同被 fake，deadline 恒不达）不滞留；`void locateAnchor`
  fire-and-forget 无 unhandled rejection 面。beforeEach `takePendingOpenPaper()`
  清模块级闩锁跨用例隔离；setState 清 aiNoteHighlight（LG-06 面）防串扰——周全。

## C. 宪法红线 —— 通过（W-1）

- **受锁时间序**：generate（144→145）→apply→unlock（小写修正）→generate→apply，
  本单内闭环无跨提交延迟；manifest 实测 145 条（grep 计数），新条目 :389
  （sha ed8fa7…）；宪法同步条款由主控收口提交时最终成立（工作区态正确）。
- **行数**：ReaderPage split 口径 250 恰达标（quality:check 绿；verify log 留有
  258→250 两次中间失败诚实记录）；测试 123 行；LineageSidePanel 行数不变。
- **UTF-8**：quality mojibake 关卡绿 + 本审计目检全部中文可读。
- **TDD 四档**：①首红独立 log 在 ✓；②变异复红同错同行号 ✓；③还原 diff 空=
  报告声明+间接交叉验证（还原后 git diff --stat 3 files/16 insertions 与实现
  终态吻合、头注压缩后 8 insertions）——**原始 DIFF_EMPTY 输出未单独落盘
  （W-1）**；④复绿=全量 verify 746 绿 ✓。
- **占位扫描**：三改动文件 grep TODO/FIXME/placeholder 零命中 + quality 关卡绿。

## D. 母本符合度 + 报告诚实性 —— 通过（W-2）

- **diff vs 票面五预裁**：P1 换序+头注链声明 ✓；P2 LineageSidePanel:134
  `node.paperId`→`n.paperId` ✓（:162 实证列表按 node.paperId 过滤取数=当前行为
  等价；AiNotesSection:195 同链先例实证）；P3 it×2+always-active+新文件入锁 ✓；
  P4 SQL 三行誊录 ✓；P5 零越界（无 waitOpen 直调、无闩锁 TTL 改动）✓。
- **工作区与报告一致**：git status（只读）= 3 M（manifest/LineageSidePanel/
  ReaderPage）+ untracked 新测试+audits 文档；diff --stat 3 files, 10+/6- 与
  报告 §2 精确一致。无未申报面（ReaderPage 注释行改写=自裁①申报范围）。
- **自裁核对**：①行数压缩属实（头注 1 行单长声明+删 1 排版空行，两次中间失败
  落盘）；②小写工单号=工单 E 裁定合规；③it① 断言取票面括号第一形态=票面许可内
  且理由真实。
- **W-2（报告数字误记）**：疑虑③称「lineage-side-panel（22）+anchor-locate
  （11）共 33」——实际 anchor-locate **13** 用例（verify log :358 明证）、
  lineage-side-panel 约 **20**（grep it( 计数）。合计巧合相等 33，分布两数皆误。
  全绿事实不受影响，定报告瑕疵不计实质。

## E. 机器面 —— 通过（N-1 收口预警）

- **数理一致**：Tests 746 = 744+2 ✓（verify log 实证）；Test Files 96 = 95+1 ✓；
  locks:check 145 ✓；verify_exit=0 ✓（log 尾部亲验）。
- **小写工单号合规裁定**（读 check-tickets.mjs）：:72
  `ticketRefRe = /SR2?-[A-Z]+-\d+/g` 区分大小写——小写 `sr2-lg-08` 不入扫描面。
  进一步：规则 2 对 **done 工单的非注册文件引用必红**，而本单链声明所在
  ReaderPage.tsx 非 LG-08 注册文件（它是 SR-RDR-04 的）——若用大写，主控登记并
  翻 done 后 verify 会红。**小写是链声明在机检体系下永续存在的唯一兼容形态**
  （LG-06 规避法=注册文件自引用大写，本单不适用）。先例 anchor-locate.ts:22
  `sr2-f-05-brief.md` 全绿实证。规则 4b 残留检查对小写同样不可见，但本单无
  data-ticket/STUB 占位面，无规避实质。**裁定：合规**。
- **N-1（收口面必读预警，非本单缺陷）**：主控登记 SR2-LG-08 进 registry 时若
  `file` 指向 `src/renderer/features/reader/ReaderPage.tsx`——规则 6（v2 B4
  防线 :174-196）将红：ReaderPage 头注区无 `// b3: P7-X` 行，且文件已 250 贴顶
  （加一行即爆 quality）。可行路径：`file` 指向
  `src/renderer/features/lineage/LineageSidePanel.tsx`（头部 `// b3: P7-H` 实证
  在——LG-06 先例即用源文件做 file；P2 防御修所在文件，归属合理）；或先给
  ReaderPage 补 b3 行并同步再挤一行。**登记操作前必核此条**。

## F. 成本账本行

| 角色 | token | 时长 |
| --- | --- | --- |
| 实现者子代理 | ≈3.93M tok | 11.5 min（票面给定，照录） |
| 联审（本代理，自报） | ≈0.21M tok | ≈13 min（输入件 6 份+源码 9 处只读核对+本档） |

## 发现清单

- **W-1**：TDD 还原档「DIFF_EMPTY」原始输出未落盘（报告声明+间接证据充分，
  证据强度轻微弱化；后续单建议 cp 还原 diff 原样 append 进 verify log）。
- **W-2**：impl.report 用例分布数字误记（11/22 vs 实际 13/20，合计巧合相等）。
- **W-3**：三份证据 log 受 .gitignore `*.log`（:13）排除不入库——repo 全局惯例
  如此（「落盘」=本地备查，与报告表述不冲突），主控收口时知悉：如需入库须
  `git add -f` 或改非 .log 后缀。
- **N-1**：registry 登记预警（见工单 E，收口前必读）。
- **N-2**：StrictMode 观察注记（见 A.4 附注）。
- **N-3**：事件②重设无锚闩锁滞留 → remount 幂等激活（openPaper 状态机
  loading→追加+激活 / ready→幂等激活，reader.store:16-19 实证）=票面 P5
  「该开的终会开」语义，无害已核实。

## 终裁

**放行提交：是（PASS）**。B=0；W=3（皆证据/记录级，不动摇判定）；N=3（预警/
注记）。修复面（3 行换序+1 处防御取值）与票面精确一致，TDD 四档证据链闭合，
机检全绿数理一致，根因定性经独立逐帧推演维持。收口单写时请处理 N-1（登记
file 指向）并将 W-3 知悉入账。
