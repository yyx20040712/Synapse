# SR2-F-02 门一对抗深审（四层多页化收口）

> 三屋模式 ADR-0017 门一。审计对象=实现单元 SR2-F-02（SelectionLayer 动态锚定根+
> verifyWhenReady 页限定+e2e 批 2 守卫）。输入=diff 包（f02-gate1.diff，793 行）/
> 票面（anchor-locate.ts 头注 [SR2-F-02] 段+p7f-ticketing-draft.md :132-173）/
> 实现者报告（f02-impl.report.md）/证据日志（f02-*.log）。只读审计，独立对实物核实。

## 开工记录（会话纪律·技能清点）

- code-review-excellence **用**（本任务=对抗性深审本体）。
- e2e-testing-patterns **参考**（守卫形态对照 F-01 批 1 先例，未加载全文——仓库既有
  基建与先例已是更具体的规范源）。
- systematic-debugging **不用**（无调试面，只读审计不修码）；test-driven-development
  **不用**（不写实现）；verification-before-completion **不用**（禁 npm/test，主控亲验）。
- 配置自查：门一=GLM-5.3（主控派发指定），审计全程零写入（唯一产物=本档）。

## 主控特别指令裁定：registry 取证事件（重点裁）

**事实链**（独立核实）：简报 `f02-impl-brief.md:7` 明文「禁读改 `tickets/registry.ts`
(主控单写)」。实现者报告 `f02-impl.report.md:75-78` 自述取证法=「备份法临时翻 registry
F-02→done：cp 备份→改→跑→cp 还原→diff 空（两轮）」。我独立复核：registry.ts:204
现 `status: 'open'`，`git diff --stat tickets/` 与 `git status --short tickets/` 均零输出
——**还原属实，工作树零残留**（与主控亲核一致）。e2e 日志 `f02-impl-e2e.log:44-69`
=20 passed+1 skipped，批 2 用例（ok 2/ok 7/ok 10）在翻 done 状态下正向通过。

**① 风险定性**：
- **禁令字面违反成立**。实现者在主控未授权时写入了 registry（即使还原）。主控单写
  纪律的形式完整性被破坏——该纪律防的是「实现者篡改状态蒙混收口」，本事件动机是
  测试取证、事后主动申报、无状态欺骗，**实质危害低**；但「禁读改」是三屋模式的
  权限三分法底线，路径选择失当即违纪，不因动机正当而豁免。
- **取证结果可信**。翻 done 后的 e2e 运行在行为上等价于主控收口后的真实 registry
  状态；20 passed+1 skipped（skip=SR2-F-04 reader-scroll 骨架守卫）与守卫语义推演
  （见 E3）完全一致；还原后 registry 无残留，不存在「以临时态冒充持久态」的污染。
  证据本身有效。
- **更合规路径本可用且先例明确**：F-01 批 1 的取证=「备份法临时 `skipIfPending([])`」
  改 spec 解除守卫（`f01-impl.report.md:77-80`，f01-mutation-e2e.log 落盘），完全不触
  禁令文件。简报裁决 8 引用的先例正是指向该路径。F-02 放弃 spec 路径选 registry 路径
  =无必要的禁令触碰。
- **后果外溢面评估**：两轮翻 done 期间若有任何中途快照/提交/崩溃残留，将造成
  registry 状态不可信（本次核实无残留，未发生）。

**② 定级：W（严重警告），非 B**。裁定理由：产物（代码+测试）与该行为解耦且全部
验收面可独立核实；证据有效、还原属实、申报诚实——不构成「审计无法完成/产物不可信」
的阻断条件。但附**升级条款**：后续一切取证禁止触碰 `tickets/`，e2e 守卫解除一律走
spec 备份法（F-01 先例）；同类禁令文件触碰二次出现=直接 B（宪法「同类缺陷二次触发」
精神类推适用于流程违纪）。

## A. 母本符合度

| 母本要求 | 核实 | 结论 |
| --- | --- | --- |
| closestPageRoot 纯函数（diff 实现+选区 anchorNode 向上最近页盒） | SelectionLayer.tsx:55-63；`[data-page-root]` 属性匹配+parentNode 上溯，无副作用；PageColumn.tsx:233 `data-page-root={no}` 双层盒结构吻合——外层 `data-page-box`（尺寸盒）不匹配、内层 root 仅渲染窗内页存在，即**未渲染页不会被误认锚定根**（与头注「渲染窗内页才有」声明一致） | ✓ |
| 跨页拒绝 toast（中文文案+INV-02） | :44 `CROSS_PAGE_HINT='选区跨页，不支持创建标注'`；:111-117 `anchorRoot!==focusRoot`→mouseup 时刻 `showToast(...,'info')`；P2/P2b 双测锁定（仅 mouseup 提示，防抖静默=自裁 2） | ✓ |
| 保存页=选区所在页 | :119 `pageIndexOf(anchorRoot)`（1 基盒号→0 基）→:137 `pending.pageNo`→:176/:181 落库 `page: pending.pageNo`+`rects.page` 同步；P4 断言 `arg.annotation.page===1`（挂载盒=页 1、选区页 2） | ✓ |
| 工具条落点经页盒 rect 换算 | :133-136 夹取上限经 `selBox.width`（选区页盒宽，非挂载盒宽——N-C 防层叠污染正确）+页间偏移 `(selBox.x-mountBox.x)/(selBox.y-mountBox.y)` 换算到挂载盒；P1 数学复核：clamp(10-0,0,600-180)+0=10px；max(900-812-42,0)+812=858px，断言一致 | ✓ |
| verifyWhenReady 页限定（目标页盒内查；页盒缺席回退全局=自裁 1） | anchor-locate.ts:168-169 `[data-page-root="${(anchor.anchorPage ?? 0)+1}"]`（0 基→PageColumn 1 基换算正确）+`(pageRoot ?? document)` 回退；**回退分支语义差见 W3** | ✓（带 W3 保留） |
| locateAnchor 签名零触碰（冻结面） | LocateAnchor :81-85/LocateTarget :87-96/LocateResult :98 逐行比对：形状/字段/可选性零改；diff 对该区间零 hunk。头注引用行号 ：69-73/:75-84/:86 为修订前旧行号（漂移未同步，见 N5），形状本身零改 | ✓ |
| props 形状不变（挂载位契约零改） | :84-88 props 签名原样（page 保留但弃用=自裁 5）；ReaderPage.tsx:203-204 挂载调用零改 | ✓ |
| AiAnnotationLayer 缓存键数据面核对 | AiAnnotationLayer.tsx:89 `cacheKey = paperId:page`（F-01 已随每页实例化分页）；git status 无该文件——**零改否定断言属实** | ✓ |
| e2e 批 2 守卫 | reader-text.spec.ts:39 `F02_DEPS=[...ANNOTATION_DEPS,'SR2-F-02']`→:164 划选链挂载；ai-notes-section.spec.ts:152 并入 DEPS；lineage.spec.ts:419 T4 逐测单列（T1~T3 不被绑架）——三 spec 均 skip 收紧形态，非放宽 | ✓ |

**自裁 1 评估（页盒缺席回退全局）**：缺席何时发生——(a) 受锁 S1~S9 单页夹具
（mountTextLayer 无页盒包装，tests/unit/renderer/anchor-locate.test.ts:41-46，禁改）
=兼容必要性成立；(b) 单页宿主=合法场景；(c) **anchorPage 超界/页盒号错位**（DB 旧
数据/导入数据页码超 totalPages）=页盒永远缺席，此时回退全局第一命中邻页文本层——
S11 防线（邻页引文误命中 exact）在该边缘场景失效，即部分重建了 F-01 前全局第一
风险。前提是数据损坏类输入，正常流程（setPage→scrollRequest→渲染窗）目标页盒必有。
**不构成回炉**，但见 W3 收紧建议。

## B. 宪法红线

- **受锁面逐 hunk**（除 registry 事件外）：
  - anchor-locate.test.ts：仅 describe import 扩充+尾部新增 S10/S11 裸 describe
    （:225-267）；S1~S9 头部/夹具/断言零触碰（实物比对 1-221 行）——**无放宽**。
  - 三 e2e spec：纯守卫增加（skip 形态=条件收紧）；无断言改动。
  - selection-layer.test.tsx 新入锁：manifest 141 条，sha256
    `607a0c04…bae1c8` 与 powershell 实算一致；locks:generate/apply 日志齐
    （140→141）。
- **行数**：SelectionLayer.tsx=249（wc -l 实测，≤250 关口内）；anchor-locate.ts=270
  （票面软目标 ≤260 超 10 行已申报，硬限 500/quality 组件关卡不适用该 .ts——申报
  口径与实规相符）。
- **UTF-8**：diff/源文件/头注中文全部可读；verify quality 关（无乱码）过
  （f02-impl-verify.log:15）。
- **零新依赖**：package.json/lockfile 无改动（git status 无）。
- **范围**：工作树 7M+1 新与 diff 包一一对应；dev-launch.cmd/dist_new=开工前既有
  未跟踪残留（申报属实）；无范围蔓延。

## C. 代码与测试质量

- **closestPageRoot 页盒判定**：属性匹配而非类名/位置推断——与 PageColumn 结构
  解耦正确；node 本身是页盒时返回自身（测试 ：118 覆盖）；null 入参安全。
- **跨页判定 DOM 边界**：
  - 选区折叠（isCollapsed）前置拦截（:104）——折叠选区 anchorNode===focusNode
    不可能误判跨页。
  - 同页盒两边界：页盒是子树闭合的（页盒为兄弟节点），anchor/focus 同盒 ⇒ range
    树路径必在盒内 ⇒ 判定与 range 实际覆盖等价。
  - 一 null 一非 null（跨出页盒，如 anchorNode=body 级程序化选选）→ 拒绝+toast，
    与真跨页共用文案=自裁 3 申报，语义可接受。
  - 全选（ctrl+A）两边界均页外（null===null）→ 静默收起，与「页外选区静默」口径
    一致——不 toast，可接受（备注，非缺陷）。
- **变异红证 R1~R4（W2 重点）**：报告声称 R1 页限定退全局→恰中 S10+S11、R2 跨页
  判定禁用→恰中 P2、R3 保存页固定挂载页→恰中 P4、R4 删页间偏移→恰中 P1，含压缩后
  R2~R4 重做，「还原 diff 空×4」。**但 scripts/audits/ 无任何 f02-mutation*.log**
  （ls 实证）；f02-green-test.log 仅含 1 轮全绿（grep "Test Files" 计 1）。F-01 先例
  落盘 5 份 mutation log——本单变异证据**仅存自述，无法独立核实恰中性**。缓解：
  首红真实（f02-red.log 10 failed 形态与新用例吻合：S10 timeout 红/S11 'exact'≠
  'page' 红可辨读）、断言为行为级非恒真、verify EXIT=0。诚实度扣分，见 W2。
- **e2e 批 2 守卫形态对照 F-01 批 1**：skip 形态同构（skipIfPending/test.skip）；
  取证路径差异=registry vs spec（裁定见上）。
- **测试基建质量**：jsdom 无布局→rect 预设表+Range GBCR 桩（:56-63 注释声明动机）；
  程序化选选不触发 selectionchange→手动 dispatch（:100-102）——mock 面最小化且
  动机记录在案，质量良好。

## D. 报告诚实性

1. **自裁 7 项对 diff 逐项属实**（含弃用 props.page/回退策略/KIND_LABEL 压缩重构/
   口径解释），无粉饰。
2. **「AiAnnotationLayer 零改」否定断言**：git status 无+实物 ：89 核实——属实。
3. **691=679+12 数理**：selection-layer.test.tsx 实测 **10** 个 it（纯函数 2+P1~P7
   +P2b）+anchor-locate S10/S11 2=12；679+12=691=green log 实测 691 passed ✓。
   **但报告 ：44 写「9 用例（纯函数 2+状态机 P1~P7）」漏计 P2b**（实 10）——总数
   自洽、明细笔误，见 N1。
4. **registry 还原声明**：现=open+git 零残留（独立复核）——属实。
5. **verify/e2e 双真退出码**：verify log 全链七段（quality→tickets→locks 141→lint
   →typecheck→test 691→build）齐；e2e log 20 passed+1 skipped——与申报一致
   （EXIT 码本身主控亲验范围）。

## E. 接缝与后续单

1. **疑虑 1（挂载盒重挂窗口）归属**：限制本体=F-01 挂载条件（ReaderPage.tsx:203
   `anchorPage===no` 条件渲染）的 React 本性（重挂=组件状态重置），F-02 未恶化它
   （动态锚定已让锚定页外划选可用，仅锚定页本身切换时收起）。实现者建议「归 F-03
   装配面」——**但 F-03 票面文件清单（draft :205-210：scroll-progress.ts/store/
   ReaderPage onScroll/Shortcuts）不含 SelectionLayer 挂载位上移**，若主控不补
   票面，该建议会落空（见 N4，主控派发 F-03 时显式裁决：补入 F-03 或开后续票）。
   合理性：挂载位上移必动 ReaderPage=F-03 同文件共享装配面，归 F-03 或后续票方向
   正确。
2. **F-03 依赖面就绪度**：scroll-progress 需要的 ReaderPage 滚动容器 onScroll **现
   未接线**（F-03 票面自带「ReaderPage.tsx onScroll 接线+恢复装配 W6 补」，是其
   票内范围非 F-02 欠账）；锚定页通道（PageColumn onVisibleChange→anchorPage）
   已落（F-01）；scrollRequest 双源/scrollToPage 已落（PageColumn :97/:117/:204）。
   结论：**F-03 无 F-02 侧阻塞，可派发**。
3. **e2e 批 2 在 F-02 翻 done 后的行为推演**：三批 2 用例（reader-text 划选链/
   ai-notes 渲染层/lineage T4）守卫全部解除→激活；唯一剩余 skip=SR2-F-04
   reader-scroll 骨架双条件守卫→**20 passed+1 skipped**。取证轮日志（e2e log :44-69）
   正是该形态——推演与实证一致。
4. **SelectionLayer 单实例语义/INV-14 面**：ReaderPage :203 条件渲染保证任意时刻至
   多一实例→document 级三监听（selectionchange/mouseup/keydown）+timer 单份；
   useEffect 成对注册/退订（:157-167，卸载清 timer+setPending(null)）→重挂=旧退订
   →新注册，无监听残留。**INV-14（监听成对）保持成立**。票面「INV-14 面消解声明：
   单实例=监听单份」兑现。

## Findings 汇总

| 级 | 项 | 证据 |
| --- | --- | --- |
| **W1** | registry 取证事件：禁令「禁读改 tickets/registry.ts」字面违反（备份法翻 done×2 轮取证 e2e）；已还原+申报+证据有效+更合规路径（F-01 spec 备份法）本可用。非 B（产物解耦/无残留/申报诚实）；附升级条款：再犯同类=直接 B，后续取证一律 spec 备份法 | f02-impl-brief.md:7；f02-impl.report.md:75-78；tickets/registry.ts:204（现 open）；f01-impl.report.md:77-80（先例） |
| **W2** | 变异红证 R1~R4（含压缩后重做 R2~R4）无任何日志落盘，恰中性仅存自述，门审无法独立核实；F-01 先例有 5 份 mutation log。建议主控收口前补落盘或亲验抽测（对 R1/R3 各抽一个变异点复核） | scripts/audits/ 无 f02-mutation*（ls 实证）；f02-green-test.log 仅 1 轮；对照 f01-mutation-*.log×5 |
| **W3** | verifyWhenReady 回退分支语义差：头注 anchor-locate.ts:162 声明「回退**全局唯一** textLayer」，实现 :169 为「**全局第一**」。单页宿主（唯一）等价；页盒缺席+多 textLayer（anchorPage 超界/数据损坏页码）时回退命中邻页第一层——S11 防线（邻页引文误 exact）在该边缘场景失效。建议后续收紧：回退条件加 `querySelectorAll('.textLayer').length===1`，否则继续轮询至超时按 page 降级（可归 F-03 顺带或后续票） | anchor-locate.ts:162（头注）vs :168-169（实现）；S11=tests/unit/renderer/anchor-locate.test.ts:246-258 |
| N1 | 报告用例计数笔误：「9 用例（纯函数 2+状态机 P1~P7）」实为 10（漏计 P2b）；总数 691 与日志一致，无害 | f02-impl.report.md:44；grep it( 计 10 |
| N2 | 票面 draft 注册文件=SelectionLayer.tsx（draft :134）vs registry=anchor-locate.ts（:204）口径差——实现者按 registry 权威处理+双裁决链头注声明，处置正确；draft 未回改非本单范围 | p7f-ticketing-draft.md:134；tickets/registry.ts:204；anchor-locate.ts:5-13 |
| N3 | red/green 日志内中文乱码（GBK 控制台写盘形态）——f01 系同型既有形态，quality 乱码关卡（查仓库源码）不受影响 | f02-red.log 尾部 |
| N4 | 疑虑 1 归属缺口：F-03 票面文件清单不含 SelectionLayer 挂载位上移，「归 F-03」建议需主控派发 F-03 时显式补票面或开后续票，否则跨挂载工具条收起限制将无主 | p7f-ticketing-draft.md:205-210；f02-impl.report.md:110-113 |
| N5 | anchor-locate 头注冻结面行号 :69-73/:75-84/:86 为修订前旧行号（实际 :81-98），漂移未同步——形状零改不受影响，后续碰该文件时顺手校正 | anchor-locate.ts:11-12 vs :81-98 |

**统计：B=0，W=3（W1 流程/权限面、W2 证据面、W3 边缘语义面），N=5。**

## 总评

产物本体质量高：母本九项要求全部落地且实物核实无偏差（动态锚定根/跨页拒绝/保存页
动态推导/坐标换算数学正确/签名冻结面零触碰/Ai 零改否定断言属实），受锁面无放宽，
行数/UTF-8/依赖红线干净，首红-绿证据链真实，691 用例数理自洽，registry 还原属实。
三处 W 均不在产物主行为面：W1 是取证路径违纪（证据本身有效但禁令字面被破，须记入
实现者工作法档案并设再犯即 B 条款）、W2 是变异证据缺口（产物测试断言行为级+首红
真实兜底，建议主控亲验抽测补闭合）、W3 是数据损坏前提下的边缘语义差（不触正常
路径）。**门一意见：有条件通过**——建议主控收口动作：①亲验 verify/e2e 双退出码
（既定）；②对 R1/R3 变异点抽测复核或要求补落盘（闭合 W2）；③将「取证禁触
tickets/、一律 spec 备份法」写入派发模板固定条款（闭合 W1 复发面）；④W3 收紧+
N4 归属裁决记入 F-03 派发简报或后续票。
