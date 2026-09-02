# A3 悬置写修票 实现报告（AUDIT-C 二波修票场 · 实现者子代理）

> 单号=A3（audit-c-scan.md §1.2-a/§5-1 主候选，ds-审 W-5 三件套补强）。
> 票面=scripts/audits/auditc-a3-brief.md。开工技能清点：TDD/verification 用、
> systematic-debugging 备用（未触发）、subagent-driven-development 不用（本人即
> 实现者，无再派发）、其余 web/前端类不用（纯 store 层任务无 UI 测试面）。

## 1. 实现摘要（按简报③三件套）

- **notes.store.ts（改动一）**：新增 `discardPendingEdit(paperId)` /
  `discardAllPendingEdits()` 两公开动作（NotesStore 接口+实现）；私有
  `discardOne`=clearTimer+pendingEdit/touchedFields/lastEditedAt/editSeq 四元数据
  delete+`discardGen` 自增+noteByPaper 删键（全幂等）；discardAll 遍历
  `[...pendingEdit]` 快照逐篇调同一私有实现（防遍历中变异）。模块级新增
  `discardGen = Map<string, number>()`；saveSoon 派发处快照
  `genAtDispatch`，**.then/.catch 回调首行**代际守卫
  `if ((discardGen.get(paperId) ?? 0) !== genAtDispatch) return`（全 no-op，
  既有 editSeq 守卫原位其后）。头注行为层/行内注释按票面声明四跨格序列语义
  （①重开整版落地②回调到达零变更③discardAll 零 timer 零草稿④closeAll 不
  discard——autosave-first 保持）。
- **tab-dirty.ts（改动二）**：confirmCloseDirty 改两路汇合形态
  `const allow = !isTabDirty(...) || window.confirm(...)`，汇合处调
  `useNotesStore.getState().discardPendingEdit(paperId)`（clean 直通=no-op 幂等）；
  头注声明「兼任弃改收口点——一切 tab 关闭路径必经本守门（接缝归责）+
  reader.store.closeOne 不接的理由（白名单外+反向成环）」。白名单现状零改动
  （tab-dirty.ts 已在表）。
- **workspace.store.ts（改动三）**：switchTo 内 confirm 通过后、
  `await unwrap(api.workspaces.switch)` 前接
  `useNotesStore.getState().discardAllPendingEdits()`（clean 直达=no-op）；
  import notes/notes.store；头注域边界声明同步补受控例外句。
  check-quality.mjs COMPOSITION_ROOT_ALLOW 增
  `['src/renderer/features/workspaces/workspace.store.ts', ['notes/notes.store']]`
  +头注区理由段（票面模板原文）。

## 2. main 归属校验核验声明（简报 3.4——本单零改动）

`src/main/services/notes.service.ts:46-51`：`save` handler 首行
`if (papers.findById(req.paperId) === null) throw new NotesDomainError('NOT_FOUND', …)`
——repos 经 facade 绑**当前课题库**（liveProxy 访问即取当前），即跨课题归属
校验，已在职；`git diff -- src/main/services/notes.service.ts` 输出 0 行
（亲验），本单零改动。扫描报告「FK 偶然兜底」口径修档归主控收口。

## 3. 文件清单（绝对路径，10 件触碰+证据）

实现（3）：`src/renderer/features/notes/notes.store.ts`（221→279 行）、
`src/renderer/features/reader/tab-dirty.ts`（107→117）、
`src/renderer/features/workspaces/workspace.store.ts`（108→117）。
受锁追加（5）：`tests/unit/renderer/notes.store.test.ts`（+117 行文末新
describe，5 it）、`tests/unit/renderer/tab-dirty.test.tsx`（+27，1 it）、
`tests/unit/renderer/workspace.store.test.ts`（+33，1 it）、
`tests/e2e/reader-text.spec.ts`（+47，文末 1 test）、
`scripts/check-quality.mjs`（白名单 1 行+头注段）。全部 ≤500 行红线内。

## 4. 测试面（简报 3.5——always-active，全部不经 guardedDescribe）

单测 +7：①discard 清 timer/条目（save 零调用）②序列①重开整版落地③序列②
in-flight 代际 no-op（Deferred 桩未 resolve→discard→resolve→条目未被重建+
load 复核）④序列③两篇 discardAll 零 timer 零调用⑤discard 后再 edit 正常
重新起步（gen 派发时重取不误伤）⑥confirmCloseDirty 弃改收口（真实 store
状态断言：接受→条目删/取消→不弃改/clean 直通幂等）⑦switchTo discardAll
（取消不弃改/接受→两篇零条目+switch+reload 既有断言面/clean 直达幂等）。
e2e +1：复活面端到端（种子→开文献→笔记输入→「未保存」锚→confirm 自动接受
先例关脏 tab→跨 2.2s 防抖窗→重开→「已保存」载入锚→textarea='' 且
≠输入值）。跨格序列①②③④逐一有锚（④=既有语义显式不触碰+用例组头注声明）。

## 5. 首红 / 绿 / 变异红证（.raw.txt 证据文件）

- 基线：`npm run test`=126 文件 **1084** 全绿 EXIT=0（简报预期 1081+F-R3
  新增=实测 1084，如实报告）。
- 首红：`scripts/audits/auditc-a3-first-red.raw.txt`——7 新用例全红
  （discardPendingEdit is not a function 族），既有 31 绿，EXIT=1。
- 绿：`scripts/audits/auditc-a3-green-unit.raw.txt`——126 文件 **1091**
  （=1084+7）全绿 EXIT=0；`auditc-a3-e2e-targeted.raw.txt`——新增 e2e
  1 passed EXIT=0（先 `npm run build` EXIT=0，`auditc-a3-build.raw.txt`）。
- 变异红证（cp 备份法，还原后 diff 空四连，禁 git checkout 遵守）：
  - M1 摘 discardOne 内 clearTimer→`auditc-a3-mutation-m1.raw.txt` EXIT=1
    （用例1 红+序列③ 红）；
  - M2 摘 .then 回调首行代际守卫→`auditc-a3-mutation-m2.raw.txt` EXIT=1
    （序列② 红：条目被回调重建）；
  - M3 摘 confirmCloseDirty 内 discard 接线→`auditc-a3-mutation-m3.raw.txt`
    EXIT=1（用例6 红）；
  - M4 摘 switchTo 内 discardAll→`auditc-a3-mutation-m4.raw.txt` EXIT=1
    （用例7 红，票面可选档已做）。

## 6. verify 真退出码（含 locks）

受锁面改完即时 locks:apply（`auditc-a3-locks-apply.raw.txt` /
  `auditc-a3-locks-apply2.raw.txt`，233 件两连 EXIT=0，manifest 同步）。
**`npm run verify` EXIT=0**（`auditc-a3-verify.raw.txt`）：quality（占位/
乱码/跨域白名单）✓ / tickets ✓ / locks 233 一致 ✓ / lint ✓ / typecheck ✓ /
test 126 文件 1091 ✓ / build ✓。

## 7. 自裁申报（超票面决定，全部一处一行）

1. **用例 1 形态加强**：票面字面「advance 1600→save 未被调」在 M1 变异下
   **不红**——timer 回调首部既有 `draft === undefined` 早退（条目已删则残留
   timer 派发不出）。为兑现票面意图「M1→用例1红」，加强为
   `vi.getTimerCount()` 直接断言 timer 清除（vitest 2.1.8 支持，先例无——
   属断言面自裁）。
2. **confirmCloseDirty 改两路汇合结构**（票面「两路汇合处」原文落地）：
   `!isTabDirty || confirm` 短路——既有锁定用例（clean 不弹窗/取消不放行/
   文案）全绿，行为面零变化。
3. **e2e 补「已保存」载入完成锚**：entry 未落地时 textarea 恒空串，直接断
   toHaveValue('') 在 bug 场景会假绿（52 绿但文字不可见教训同族面）——先锚
   load 已整版落地再断值。
4. **verify 首跑 typecheck 红**（TS2493：用例5 save 桩未声明参数致
   `mock.calls[0]?.[0]` 索引错）→ unlock→修桩签名→apply→重跑全绿。tsc 关口
   拦住 esbuild 不查的类型面（宪法条款同场实证一次）。
5. **workspace.store.test.ts 增一行 import useNotesStore**（受锁件文末追加
   语义内，票面 3.5 允许）。
6. **删减面 diff 自查**：本单触碰=上述 8 代码/测试件+locks/manifest.json+
   本单证据文件，无蔓延；同场 F-R3 单文件（CorpusExtractor.ts/
   corpus-extractor.test.ts/f-r3-* 证据）开工前已在工作区，非本单触碰；
   main 侧零改动（§2 亲验）；tickets/registry 未翻（只读查工单状态以选
   e2e skipIfPending 依赖面）。

## 8. 疑虑（上报门一审，未擅修）

- **load 回调 × discard 窄窗**：discard 发生在 load in-flight 期间时，load
  合并路径会重建条目+补存排程——此面不在票面态空间（3.0 只含 save 回调代际
  守卫）。现实时序不可达（load 于面板挂载即发、本地 IPC 毫秒级落地，用户
  须先输入再关 tab），单测/e2e 均未构造；未修，如实上报。
- **e2e 时序敏感**：fill→关 tab 须 <1.5s 防抖窗（两动作典型 <300ms，5 倍
  余量）；CI 极慢超窗则 save 先落库→红——失败指纹=「未保存」锚超时或重开
  值不匹配，按 e2e 非确定性立案线（同用例 2 次）处置。
