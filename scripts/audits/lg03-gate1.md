# SR2-LG-03 门一对抗深审（Gate 1）

日期：2026-08-27 ｜ 审者：门一子代理（独立于实现者）｜ 输入：lg03-diff.patch（2031 行，含 5 未跟踪新文件）/ LineageBoard.tsx 票面五层 / lg03-impl.report.md / red·green·mutation·verify 四日志
技能清点：用 code-review-excellence（对抗深审）+ test-driven-development（红证四档核对）+ verification-before-completion（数字对账）；不用 git-workflow/browser/数据工程类（只读审计、无浏览器面、无交集）。

## 一、候裁项意见（主控终裁）

### A. LineageDomainError('CONFLICT') 升级 —— **支持，升级必要且正确**

1. **折叠行为核实为真**：`src/shared/app-error.ts:79-84`——无 code 的普通 Error 经 toAppError 折叠为 `{code:'INTERNAL', message:'发生未预期的内部错误', detail:e.message}`；renderer unwrap（client.ts:20-25）只见通用文案。**票面「reason 透传 toast」在原普通 Error 形态下机制性不成立**，实现者判断属实，升级不是可选优化而是票面机制的成立前提。
2. **家族同构核实**：ReaderDomainError（reader.service.ts:34）/NotesDomainError/ImportDomainError/EnrichDomainError/ExportDomainError/DomainError(library) 全部同形（文件私有 class extends Error + readonly code + this.name）——LineageDomainError 完全同构，零新范式。
3. **链路闭合核实**：LineageDomainError → register.ts:29 makeChannelHandler catch→toAppError 识别合法 code（CONFLICT 在 APP_ERROR_CODES，app-error.ts:55，export.service.ts:198 先例）→ Result error → unwrap 抛 ApiClientError(code,message) → store flush `e.code==='CONFLICT'` 分支——每一环已读源码确认。
4. **二分类与票面状态机不矛盾**：saveStatus 仍是三态枚举（saved/saving/error），CONFLICT 丢弃后回落**既有 saved 态**——不引入票面外第三态，而是迁移表内一条迁移规则。且二分类是票面两条字面要求的合成必要条件：若树拒绝走系统型保留重试，「动作型 toast（非保存失败）」与「dirty=保存态≠saved」会联合产生**dirty 永真误报+队列卡死**（retry 永失败）。状态机已按宪法前置登记（store 头注全量迁移表+受锁测试头注），自裁 2 已如实申报。支持采纳。
5. 微瑕两笔（不拦）：幽灵 paperId 用 CONFLICT 而非 NOT_FOUND 属码语义借用（APP_ERROR_CODES 注释 CONFLICT=「唯一性冲突」）——行为正确（永不成功→丢弃），备注即可；**数字更正**：实际升级 **7 处**（lineage.service.ts:272/284/289/292/299/307/314——upsertNode 幽灵 1 + upsertEdge 守卫 6），报告与派单均写「6 处」，属漏报非瞒报（diff 逐行核对 7 处均为纯类型包装，条件表达式/中文文案零变化）。

### B. 导入草稿 renderer 入口悬空 —— **缺口属实，建议回炉 03 补最小面**

1. 缺口证据：grep 全仓 `importDraft`/`lineage/import`——renderer 侧零调用（仅 main 侧 ipc/service/repo）；`src/renderer/features/lineage/` 八文件无导入按钮；LG-02 交付的 Canvas 空态文案「导入草稿或添加节点」导入半句悬空；LG-01 票面「renderer 确认对话框『导入将替换现有脉络图』」消费窗口未落。
2. 关键压力点：**LG-05 e2e 票面第一环就是「导入→渲染真实文本」**（registry.ts:200）——UI 无入口则 e2e 无法经界面完成导入，缺口必须在 05 开单前闭合。
3. 归位建议排序：**① 回炉 03 补工具栏按钮**（Board 工具栏+Dialog+confirm 语义+CONFLICT/CANCELLED 分支均已在本单交付，边际成本最小；ImportResult errors 清单呈现是 LG-01 既有契约面「消费方分支呈现 errors 清单」）；② 若主控裁定不回炉，必须显式写入 LG-04 票面（侧板单加工具条条目）——语义不如 ① 顺；③ 归 LG-05 前置**不可接受**（e2e 单不应补实现面）。禁止悬空无归位。

## 二、Findings（[B|W|N]+file:line）

- **W1** lineage.service.ts:272-314：守卫升级实为 7 处 throw，报告/派单写 6 处——收口单按 7 处为准（见候裁 A5）。
- **W2** tests/audits 流程：mutation.log（477KB）仅含三轮完整 vitest 输出+结论尾注（RESTORE-DIFF-EMPTY×3），**缺变异实施过程痕迹**（cp 备份/应用/还原命令未入 log）。变异-用例对应精确（M1→「最后写胜出」1 红；M2→「拒绝型丢弃」+「树拒绝三路径」2 红——M2 段 1194/1739 行核实 board 用例真实 FAIL；M3→「拖拽载荷」1 红），伪造成本高、可信；但可追溯性弱于 ai08 先例（其 log 含实施命令）。记档备查，建议后续单变异过程命令一并落 log。
- **W3** lg03-impl.report.md 红档措辞：「两测试文件先行（20 用例全量断言）……构造级红」——red.log 实际构成=board 10 用例断言级红 + **store-write 文件级环境错误 1**（node 环境下 client.ts 顶层读 window 崩，11 failed=10+1；@vitest-environment jsdom 为红档后补）。数字如实（11/573）、自裁 10 已坦白环境修正，仅「20 用例全红」表述不精确。措辞精度问题不拦。
- **N1** LineageBoard.tsx:91-94：props.selectedNodeId 传入**零消费**（无选中高亮）、onSelectNode 永不带 null（无「点空白取消选中」路径）。票面接口层本单只交付签名，合法；但 **LG-04 开单时票面须含**：Canvas 选中高亮+空白点击 onSelectNode(null)——当前 registry LG-04 摘要未提，接缝登记缺口。
- **N2** LineageBoard.tsx:110-118：pendingLink 模式下拖拽目标（超阈值）触发 moveNode 写且 pendingLink 不清空，须再点一次完成连线。UX 边缘。
- **N3** LineageCanvas.tsx 拖拽会话：落点换算用**松手时** k——拖拽期间滚轮改 k 存在微小偏差（jsdom 不可测；报告疑虑段已声明 zoom+drag 归 LG-05）。
- **N4** lineage.store.ts sameTarget（upsert-edge 按 from+to 合并）：flight 窗口内 reparent 加边与手动同端点 linkNodes 合并会丢 reparent 标记（N5 toast 前缀缺失）。极端边缘。
- **N5** LineageAddNodeDialog.tsx useEffect 依赖 props.existingPaperIds 数组引用——nodes 变化即重查 library.list（对话框开窗期多发请求）。行为正确，性能微小。
- **N6** LineageCanvas.tsx split 计数恰 250=上限（wc 249）——报告自报「后续扩展须先拆」属实，收口单提醒后续单注意。
- **N7** 树拒绝丢弃后无「重试该边/修正目标」模式（重试无意义）——报告疑虑段自报，票面未要求，不拦。

## 三、核对矩阵

### 母本符合度（票面行为层 11 项逐条）

| 票面条目 | 判定 | 证据 |
|---|---|---|
| 拖拽 x/y 覆盖经 upsert-node | ✓ | moveNode 全字段构造；board 用例断言 x:560/y:430（500+60/400+30）+title/coreIdea 保留 |
| 加节点两型（paperId 绑定 vs 主题） | ✓ | AddNodeDialog library.list 搜索选取/主题 title；store 两型载荷用例（paper-9 绑定+元数据默认 / paperId null+year null） |
| 加边菜单+树拒绝三路径 toast | ✓ | 菜单「连线到…」→pendingLink 提示条→点目标；三 reason 逐一断言 showToast+saveStatus=saved（丢弃非脏态） |
| 删节点删边 | ✓ | NodeMenu 删除父连线/删除节点；remove-node 级联镜像（悬空边全清）store 用例 |
| 改父=删+加两调用+部分失败 N5 | ✓ | reparentNode 两动作+reparent 标记；N5 用例：toast「旧连线已移除，新连线未建立：写入失败」+edges=[]合法中间态+retry 只重发加边（removeEdge 恰 1 次/upsertEdge 2 次断言） |
| core_idea textarea | ✓ | EditIdeaDialog（key 重挂载初值锚定）；载荷 x/y 保留断言（500/400） |
| 自动保存 INV-04 同型 | ✓ | autosave-first 无保存按钮；系统型失败 error 不推进+lastWriteError；脏投影=saveStatus≠saved |
| 动作排队最后写胜出 stale-guard | ✓ | sameTarget 合并+按身份 filter 出队；deferred promise 手控 flight 时序（总调用 2 次末值落发） |
| 退出聚合（App ∪+INV-22+tab-dirty:14） | ✓ | App.tsx:74 `\|\|` 组合根单点；invariants.md INV-22 行扩面；tab-dirty.ts:14 注释级三方锚定；组合根用例 setQuitDirty 末次 {dirty:true} |
| onSelectNode 出口预留（04 消费） | ✓ | 签名照票面；单击上抛用例（位移阈值内+upsertNode 负断言）；LineagePage 驻 state |
| 写四通道 schemas+ipc 委托 | ✓ | schemas 三新 Req（strict zod）；api-surface 四端点；ipc 装配归一（paperId/x/y→null、label→''）+Req camelCase→service 入参映射；allChannels 自动注册零额外接线 |

### 宪法红线

- 组件 ≤250：Board 218 / Canvas 250(split,恰线见 N6) / NodeMenu 78 / AddNode 163 / EditIdea 47 ✓；store 279 ≤500 ✓
- 分层单向：renderer 全经 client 门面零 Node/Electron 导入（grep 净）；ipc→service 委托零守卫（守卫宿主=service）✓
- 受锁 129：manifest diff=+2 新测试路径+schemas/api-surface 两 sha；verify log:26「locks 检查通过：129 个受锁文件与 manifest 一致」；流程 unlock→批内改→generate→apply 声明完整（lint/typecheck 修复轮再触受锁测试均闭环）✓；docs/invariants.md 非 manifest 成员（grep 0）——直接改合法 ✓
- UTF-8/乱码：quality 关过+独立 grep 零乱码 ✓；TODO/FIXME/placeholder：零 ✓
- 范围：git status 12 改+5 新增+dist_new/（mtime 2026-08-23 证实历史残留，本会话未触碰）——无蔓延 ✓
- 测试纪律：**未改任何既有测试**（两新测试为本单新增受锁）；「写完先红再绿」成立（red 11 failed EXIT:1）；恒真断言检查：全部用例有具体载荷/状态/文本断言，组合根用例非恒真（聚合失效时末次 {dirty:false} 会红）✓

### 代码与测试质量

- 红证四档：red（11/573, EXIT:1）→ green（84/593, EXIT:0）→ mutation 三轮（1/592、2/591、1/592，均 EXIT:1+RESTORE-DIFF-EMPTY）→ verify（EXIT:0，quality/tickets/locks129/lint/typecheck/test84-593/build）——四档齐全、退出码落盘 ✓
- 票面测试清单 10 项（拖拽载荷/加节点两型/树拒绝三路径/改父两调用/删节点级联/core_idea/失败不推进+重试/最后写胜出/退出聚合/选择上抛）**全覆盖**，另有拒绝型分类/removeEdge 回填/load 写读互锁补充用例，共 20 ✓
- 绿档间两实现缺陷被测试拦出（slice(1) 出队与合并冲突→按身份 filter；load 丢弃分支不回置 ready 卡 loading）——测试有效性实证 ✓

### 报告诚实性

- 自裁 1-12 逐条对 diff **全部属实**（唯自裁 1 的「6 处」实为 7 处，W1）
- 数字对账：84/593（green:1729+verify 双证）、129（verify:26）、red 11/573、mutation 三轮数字全对 ✓
- 受锁测试未被顺手改（两新测试即本单交付物，manifest 新增路径与票面预告一致）✓

### 接缝与后续单

- **04 消费面**：onSelectNode(id:string|null)+selectedNodeId?:string|null+LineageNode 类型齐备；缺口=N1（selectedNodeId 零消费+无 null 取消路径）——LG-04 票面须补选中高亮+空白取消面
- **05 e2e 面**：k≠1 视口换算/树拒绝 toast 真实渲染/保存失败退出拦截全链+**导入入口前置依赖**（候裁 B）——mock 出口为 api 门面/IPC 层，组件测试已锚定 INV-22 组件级
- **01 交付面**：lineage.service.ts 7 处 throw 类型升级——LG-01 受锁测试（lineage-import.test 22 用例，toThrow 子串断言）verify 全绿；INV-27 行为面零漂移（diff 逐行核对：仅类型包装，条件/文案零变化）✓

## 四、统计

findings：B=0 ｜ W=3（W1 数字更正/W2 变异过程痕迹/W3 红档措辞）｜ N=7 ｜ 候裁 2 项（A 支持+数字更正；B 缺口属实+建议回炉 03）

## 五、总评

**PASS（附主控两裁决）**。母本 11 项全符、宪法红线全绿、四档红证齐全可信、自裁申报诚实（一处计数误差）；无 BLOCKER、无回炉级缺陷。收口前主控须裁决：① 候裁 B 导入入口归位（门一意见=回炉 03 补最小面，或显式登记 LG-04 票面——禁悬空至 05）；② W1「6 处→7 处」在收口单与提交信息更正。

---

## 回炉复核（Gate 1 复审，2026-08-27）

审者：门一回炉复核子代理（独立，只读）｜复核对象：LineageBoard.tsx / lineage-import.ts / lineage-board.test.tsx 新 3 用例 / lg03-impl.report.md 回炉节+文书三处 / lg03-verify-rework.log·lg03-rework-red·green·mutation log
技能清点：用 code-review-excellence（对抗复核）+ verification-before-completion（数字/退出码对账）；不用 TDD（只读无测试面）/git 类/浏览器类（铁律禁改动性命令）。

### ① 候裁 A 追认落地 —— **核实通过**

- 「主控追认 2026-08-27」字样两处落地：自裁申报 1 条目（lg03-impl.report.md:155）+回炉记录节②（:253），追认理由（toAppError 折叠致 reason 透传不成立）已入条目 ✓
- 7 处计数落地：自裁 1「7 处 throw：upsertNode 幽灵 1+upsertEdge 六守卫」+回炉节「6→7 处」更正 ✓；**源码实测**：lineage.service.ts:272/284/289/292/299/307/314 恰 7 处 `throw new LineageDomainError('CONFLICT', …)`（类定义 :74-79，家族同构 reader.service 同型）——与门一 W1 更正数字精确吻合 ✓

### ② 候裁 B=回炉 ADDRESSED 判定 —— **ADDRESSED**

- **工具栏按钮** ✓：LineageBoard.tsx:138-146「导入草稿」按钮（data-testid="lineage-import"，与添加节点同工具条），onClick=importLineageDraft。
- **confirm 条款兑现** ✓：lineage-import.ts:20 `window.confirm('导入将替换现有脉络图')`——与 LG-01 票面（lineage.repo.ts:26「renderer 确认对话框『导入将替换现有脉络图』」）**字面精确一致**；.ts 模块 window.confirm 先例=tab-dirty.ts:103 confirmCloseDirty，属实。
- **CANCELLED 路径** ✓：lineage-import.ts:35-37 ApiClientError.code==='CANCELLED'→info toast「已取消导入」无其他动作（main 侧 dialog 文件选择取消语义）；confirm 拒绝=纯 return 零反馈（用户刚主动点按钮的第二轮取消，「取消=无操作」票面语义，合理）。
- **errors 单行汇总自裁合理性** ✓：toast 去重机制核实——toast-store.ts:26 DEDUPE_MS=1000 + :63 同文案同 kind 1s 窗口只生效一次，多条同 path/reason 的 errors 确会被吞；且逐条 error toast 各停 6s（AUTO_DISMISS_MS）刷屏属实。「汇总计数+首条明细」是 toast 通道下的合理最小面。**兑现度备注**：门一原文「消费方分支呈现 errors 清单」——实现接通了 errors 分支（计数+首条真实文本）但非逐条清单；toast 无滚动面非清单载体、对话框清单面超出「最小面」授权，形态降级有据且已申报 v2 候选（疑虑段+回炉节），不构成未兑现。
- **测试与红证** ✓：3 用例锚定（确认→importDraft({}) 调用+成功 toast 文本+graph 刷新；取消→通道与 graph 零调用；errors→「共 2 处+首条 path+reason」真实文本+失败不刷新）——lineage-board.test.tsx:420-481。MUT-RW 红证：变异代码实见于 lg03-rework-red.log:107（confirm 后强制 return），2 failed/594 passed exit 1，恰「确认+errors」两用例红、取消用例不红（守卫面在 confirm 分支）——与申报精确吻合；还原命令实录入 mutation log:5307-5309（cp 备份→变异→测→还原→diff 空）。

### ③ 新破坏扫描 —— **无新破坏**

- 行数关卡：Board wc 实测 **231** ≤250 组件上限；lineage-import.ts 实测 **41** 行 ✓。
- 拆分干净度：lineage-import.ts 单导出函数无状态零杂职责；Board 仅一行 import+onClick 接线；无死代码无重复 ✓。
- **导入刷新与 dirty 交互** ✓（重点核）：lineage.store.ts:202-218 load() 只写 status/nodes/edges，**不触碰 saveStatus**——导入成功时写面无未竟动作（saveStatus=saved）→ 导入后仍 saved，dirty 不误报。反向窄窗（dialog 开启期用户并发编辑：queue 非空/flushing）load 的 graph 落地被写读互锁丢弃（:210）——导入覆盖不踩写回填，语义正确。errors 分支不调 load（库未动不刷新），测试断言在档 ✓。
- 终局数字：rework-green 84 文件 **596** 全过、verify-rework 84/596（log:1789-1790）+build 终步完成 ✓；新 3 用例 always-active（顶层 describe 不经 guardedDescribe）✓。
- 微瑕一笔（N-RW1，不拦）：verify-rework.log **无显式「EXIT:0」尾注行**（终于 build 成功输出）——verify 链式前步任一失败链即断、终步成功输出在档+green 596 全过为旁证，证据链成立，仅尾注形态欠完整；收口单补一行尾注即可（建议后续单 verify log 统一以 EXIT 行收尾）。

### ④ 遗留疑虑裁定参考（树拒绝丢弃后无重试路径）—— **与票面一致，无需补票面**

- LG-03 票面（LineageBoard.tsx 头注 :40-41）状态机「error（失败：脏保持+toast+重试按钮）/error→retry→saving」——「重试按钮」条款限定域=**系统型保存失败（saveStatus=error 态）**；:65「树拒绝三路径=动作型 toast」明确树拒绝**非保存失败**，不进该条款覆盖面。
- store 头注迁移表：CONFLICT 拒绝型→丢弃动作继续+回落 saved——不进 error 态；且门一候裁 A4 已裁定该二分类是票面字面要求的合成必要条件（树拒绝若保留重试→dirty 永真误报+队列卡死）。
- 用户层等效重试存在：树拒绝后重新发起连线（再走菜单→目标选取）即重试——队列级重试对「永不成功」动作无语义。与门一 N7「票面未要求，不拦」维持一致；「修正目标模式」（保留 source 重选）为可选 UX 增强=v2 候选，实现者疑虑段已如实申报。

### 复核统计与结论

- 判定：候裁 A 追认**落地**；候裁 B 回炉 **ADDRESSED**；新破坏 **0**（微瑕 N-RW1 尾注形态+errors 清单形态降级已申报，均不拦）；遗留疑虑**票面一致**。
- **复核结论：PASS——回炉两项主控裁决均核实落地，LG-03 可入收口流程（收口单按 7 处计数+EXIT 尾注补行+提交信息 [locked-change] 尾注执行）。**
