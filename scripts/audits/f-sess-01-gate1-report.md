# F-SESS-01 门一对抗深审报告（gate1，备源承载 k2——源A 两次认证失败换源；主控代落盘，回复即原件）

> 承载注：本岗工具面仅 Read，无写通道——报告全文由主控按回复原件代落盘（本文件）。审计者模型自证见文末。

## 精简版（逐条一行）

- B：无阻断项。
- W1：新增跨模块行为「renderer 重载/崩溃→中止在途导出会话」及其安全前提「renderer 无 in-page 导航（pushState/hash/锚点）」未登记 docs/invariants.md——宪法「新增跨模块行为不登记本册视同未完成」（bootstrap.ts:236-239 + corpus.export.service.ts:31/40；对照 INV-18 在册文本 invariants.md:32 未含 abort 路径）。
- W2：报告引用的还原安全标记 M1_RESTORE_DIFF_EMPTY/M2_RESTORE_DIFF_EMPTY 未落入归档 raw（m1 raw 止于 `M1_EXIT=1`/m2 raw 止于 `M2_EXIT=1`）；还原正确性仅由后续 verify（VERIFY_EXIT=0，raw 行 4015）+e2e 双绿传递证明，「diff 空」缺直接归档。
- N1：advance 守卫只拦 manifest 终写，abort 后悬挂 finishPaper 仍落 fulltext/papers 残留（与票面措辞「拦悬挂终写 manifest」一致，下次 cleanRebuild 自清）——corpus.export.service.ts:215-217 vs 271-294。
- N2：abort 与 finalizing rename 微窗：rename await 内 abort→reject 先 settle→manifest.json 完整存在而会话报 failed；产出完整、消费方已死、重跑自愈；改序不放大此窗——corpus.export.service.ts:231-239 × 298-309。
- N3：e2e 固定 `waitForTimeout(1500)`——失败形态=响亮超时非假绿，abort 实际在 reload 起步（did-start-navigation）即完成，裕量充足——tests/e2e/corpus-export.spec.ts:211。
- N4：「二次 abort」与「悬挂推进撞同目录新会话」两格无直接单测——前者与 t2 终局后=false 同码路径；后者真实时间线（点击秒级 vs setImmediate 毫秒级）不可达，e2e 已实证真实序列。
- N5：render-process-gone 接线无运行时红证（实现者 §7 已申报）——与 did-start-navigation 同一 abort 通道（后者经 M2 红证+e2e 实证），typecheck 锁签名，可接受。
- N6：failSession 改序本身未单独做变异红证；t3 在旧序下按相位推演必红+M1 旁证，属 nice-to-have。
- N7：relay.md 认领行与本票同树（实现者 §7 申报零触碰、简报已列明知悉）——收口 staging 须显式排除，勿扫入本票 commit。
- N8：首载 did-start-navigation 监听挂于 createMainWindow 返回后（bootstrap.ts:189→236），理论可漏首事件；首载必 idle、abort 空转无害，注释口径成立。
- N9：课题切换（INV-35 reload 路径）中导出：abort 命中的已是新层（返回 false），旧会话随旧闭包死亡、无 BUSY 泄漏——本票前后语义一致，非引入面。

统计：B=0 W=2 N=9。总评：**PASS_WITH_WARNINGS**（零阻断；W1=不变量登记缺口建议主控裁决补登或并入 F-EXPORT-01；W2=还原证据归档缺口）。

## 全文（按工单 A~E）

### A 母本符合度——符合

- 缺陷修复方向「session 生命周期与 renderer 存活解耦」：落地=abortActiveSession（corpus.export.service.ts:436-443）+bootstrap 两事件接线（bootstrap.ts:236-244），renderer 死而 main 活时单飞锁同步释放（failSession `session=null` 前置，:306）。
- 态空间表：头注六态定义（:7-17）+迁移表 abort 行（:31）+interrupted 补句（:32）+跨格序列八行（:33-43，新增「renderer 重载（streaming 中）」行 :40），与 registry:285 票面「六态×renderer 存活/死亡/重载跨格序列」对应；与 F-EXPORT-01（registry:292）六态枚举同源无漂移。
- 验收两项：悬挂态可恢复=单测 t1（corpus.export.test.ts:337-357）+e2e 重载格（corpus-export.spec.ts:157-221）；e2e 全链不破=旧 test 在 app 门 43 passed（raw 行 48-49,90-91）与 all 门 45 passed（raw 行 92-93）双绿。

### B 宪法红线——全过（一处归档瑕疵见 W2）

- 状态机前置：态空间+跨格序列随实现同 diff 交付 ✓。
- 受锁链：两测试文件 sha 随 manifest 同步（diff 行 34-49），verify 内 locks:check 334/334 绿（verify raw 行 53）；[locked-change] 尾注=主控收口职责，实现者未越权翻 registry（F-SESS-01 仍 open，registry:285 实测）✓。
- 变异还原：cp 备份法申报；还原 diff 空的直接归档缺席（W2），由后续全链绿传递闭合。
- 安全禁令：无新 IPC 通道/preload 面/host/eval——abortActiveSession 仅 main 内消费（ipc/export_.ts:95-106 接线面零改动；api-surface 闭包测试 21 用例绿，verify raw 行 109）✓。
- 行数：445/273 ≤500 ✓（测试 519 行经 lint 绿=CI 口径合规）。UTF-8 抽查无乱码 ✓。

### C 代码与测试质量——事件时间线逐帧推演（强制审项）

① **t3 竞态窗相位序**：deferOutcome 的 setImmediate=check 相位；fs.rm 完成=线程池→下一轮 poll 相位投递。abort 同步段（failSession 入口至首个 await 前）`session=null` 先于一切异步落定；JS 栈空后当前轮 check 相位必先于下一轮 poll——故 setImmediate 终局推进跑时守卫必已激活。反证：旧序（rm 后才 null）下该窗守卫失活、manifest 被悬挂终写，t3 必红；M1 删守卫实证恰 t3 红（m1 raw 行 11-13：`expected true to be false`=manifest 存在）。预裁①采纳有据，推翻未果。

② **abort 后防御闭环**：迟到 corpusItem→`session===null`→INVALID_REQUEST（t4，corpus.export.test.ts:395-410）；二次 abort→false（同码路径 :439-440）；并发新会话→BUSY 解除（t1）且旧悬挂推进按对象身份被守卫拦截（`session !== s`，新旧会话不同对象——新会话不受旧推进污染）。闭环成立。

③ **did-start-navigation 三面**：首载=idle 空转无害（N8）；子帧=`isMainFrame` 过滤正确（bootstrap.ts:237）；SPA 内路由=组件态切换无导航事件（App.tsx:22-29 `ViewId` useState 实证，INV-35 的 location.reload() 为全量导航不踩坑）。**包外不确定项**：Electron 42 的 did-start-navigation 是否对 same-document 导航（pushState/hash）同样触发——包内无法裁决；若触发则 isMainFrame 单条件过滤存在误杀在途导出的潜伏面。该安全前提本身未入册即 W1。

④ **advance 守卫对既有 failSession 路径影响**：写盘失败窗行为不变且更稳——`session=null` 同步前置使二次 failSession 被入口守卫（:301）拦截，旧序下理论双 reject 窗消失；存量 12 用例零漂移（指纹门 1757 基线侧零变化，verify raw 行 27-34），落盘失败用例绿（raw 行 101）。另推演：abort 撞上 finalizing 的 writeFile(tmp)→rename 窗时，rm(tmp) 致 rename ENOENT→run().catch→failSession 守卫吞没——无 manifest、会话已 reject，failed 语义正确（N2 为反向微窗）。

### D 报告诚实性——6 自裁+数字全核（一处归档瑕疵）

自裁逐条对 diff：①改序 ✓（:306-307）；②e2e 无 skip 守卫 ✓（spec:157 起无 test.skip，skipSites 15/15 raw 行 27）；③轮询两篇任一 page-1.png ✓（spec:203-207）；④头注七→八行+接口层补行 ✓（:33,:86-88）；⑤t4 先红后绿 ✓（first-red raw 行 18-19 TypeError）；⑥4 用例置 guardedDescribe('SR2-AI-03') ✓（SR2-AI-03 done→恒激活，guard.ts:21-26 机制+verify 中 16 用例实跑）。数字抽查：183/1762/5350/15（raw 行 27）、vitest 166/1717（行 3974-3975）、e2e 43/45（raw 行 90/92）、locks 334（行 53）、tickets 195/open15（行 43）、VERIFY_EXIT=0（行 4015）全符。瑕疵=W2（还原标记未归档）。M2 红证（m2 raw 行 7/12：接线掐断后新 test 60s 超时、旧 test 2.3s 绿）证明新 e2e 非空转绿 ✓。

### E 接缝与后续单——无互斥声明

bootstrap 头注顺序段（:1-20）与新接线无冲突（接线位=主窗口段内）；export.service.ts corpusSet 守卫（:195-203）与 abort 语义互洽（abort 不留 manifest.json→守卫不误触发）；INV-17/18 在册文本语义不被破坏（但见 W1 登记缺口）；F-EXPORT-01「F-SESS-01 修后拆」承袭关系一致。liveProxy 动态转发（data-layer.container.ts:60-71）+export_ 展开装配（services/index.ts:109-116）使 abortActiveSession 经容器 facade 可达且热换安全 ✓。

## 主控预裁 5 项攻击结论

预裁①（改序）：**维持**——逐帧推演+M1 反证闭环（见 C①）。预裁②（e2e 不带 skip）：**维持**——always-active 口径+skipSites 15/15 机检。预裁③（复用 SR2-AI-03 守卫组）：**维持**——done 票恒激活有机制与实跑双证。预裁④（IO_ERROR 复用）：**维持**——reject 消费方=已死 renderer，注释在案（:86-88）。预裁⑤（轮询不写死篇序）：**维持**——与 t1 单测同思路，防 flake 合理。

MODEL-SELF: model-field:5e1abd9d-1f4f-41fb-afa1-ecb5ce76e256/k3$max
FINDINGS: B=0 W=2 N=9 VERDICT=PASS_WITH_WARNINGS
