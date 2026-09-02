# A3 悬置写修票 实现者简报——notes 防抖弃改三件套（cancel/discard+in-flight 代际+main 归属校验核验）

> 单号=A3（AUDIT-C C-3 扫描 §1.2-a / §5-1 主候选；ds-审 W-5 三件套补强在案）。
> 票面母本=scripts/audits/audit-c-scan.md §1.2-a+§5-1。定性=W 级：关脏 tab 确认
> 丢弃后 ≤1.5s 防抖仍落笔（DB 复活）+内存草稿重开合并回填（内存复活）+切课题
> 竞窗（INV-35④ 面）。

## ① 身份与禁令

- 你是**实现者子代理**（AUDIT-C 二波修票场）。领单号=A3。
- 禁 git add/commit/push；禁翻 tickets/registry.ts。
- 受锁文件触碰面（主控已解锁，**只许追加/票面声明的最小改动**）：
  `tests/unit/renderer/notes.store.test.ts`（**文末追加**新 describe，不动既有
  用例）、`tests/unit/renderer/tab-dirty.test.tsx`（同前）、
  `tests/unit/renderer/workspace.store.test.ts`（同前）、
  `tests/e2e/reader-text.spec.ts`（**文末追加**一个 test，不动既有）、
  `scripts/check-quality.mjs`（**仅** COMPOSITION_ROOT_ALLOW 增一行+头注区
  增补一段理由注释——模板见下）。其余受锁文件一律不碰。
- 禁新增依赖；一切超票面决定停下申报=BLOCKED。
- shell PATH 漂移：一切 node/npm 调用前 `export PATH=/d/nodejs24:$PATH`。

## ② 必读序

1. `AGENTS.md`（宪法——状态机前置/测试纪律/接缝归责）
2. 本简报全文
3. `scripts/audits/audit-c-scan.md` §1.2-a（缺陷三路径推演）+§5-1（含 ds-审
   W-5 三件套）+§二组② SelectionLayer 行除外
4. `src/renderer/features/notes/notes.store.ts` 全文（**实现对象一**）
5. `src/renderer/features/reader/tab-dirty.ts` 全文（**实现对象二**——
   confirmCloseDirty :97-107）
6. `src/renderer/features/workspaces/workspace.store.ts` :100-107（**实现对象三**
   ——switchTo）
7. `src/main/services/notes.service.ts` :46-51（**只读对照**——main 归属校验
   已在职：papers.findById null→NOT_FOUND，本单**零改动**，报告里核验声明即可）
8. `tests/unit/renderer/notes.store.test.ts` 头 45 行（loadStore 重置桩法——
   新用例同法）；`tests/e2e/reader-text.spec.ts` :220-240（dialog 自动接受先例）
9. `scripts/check-quality.mjs` :40-70（跨域互引白名单机制）
10. `docs/invariants.md` INV-35（④条款——本单是其「须显式防悬置写」的兑现）

## ③ 主控裁决（票面设计——实现者不再自裁）

### 3.0 态空间×迁移表（状态机前置——按「态空间+跨格序列」自审）

per-paper 草稿生命周期（noteByPaper 条目态 × 模块级元数据 pendingEdit/
touchedFields/lastEditedAt/editSeq/timers/新增 discardGen × 在途 ipc save
携带快照 seqAtDispatch/genAtDispatch）：

| 当前态 | 事件 | 迁移 | 动作/守卫 |
| --- | --- | --- | --- |
| absent | edit | →dirty | 五件套打点+镜像 pending=true（既有） |
| dirty | edit | dirty | 重打点+saveSoon 重排（既有） |
| dirty | 防抖到期 | →saving | 清 timer+派发 save（既有+**新增快照 genAtDispatch**） |
| saving | save 成功（seq 同且**gen 同**） | →saved | 既有 |
| saving | save 成功（seq 前进且 gen 同） | →dirty | 既有 |
| saving | save 失败（gen 同） | →dirty | 既有（重试面） |
| **dirty/saving/saved/absent** | **discard(paperId)** | **→absent** | **新**：clearTimer+pendingEdit/touchedFields/lastEditedAt/editSeq 全清+discardGen 自增+noteByPaper 条目删除 |
| **saving** | **save 回调到达（gen 已变）** | **无迁移** | **新：全 no-op**——不 setDraft、不动 pendingEdit/touchedFields（代际守卫，防回调复活条目/pending 镜像） |

跨格序列（审计面，逐条要有测试锚）：
- ①dirty→discard→重开：load 走**整版落地**（pendingEdit 已清，不合并回填）——
  内存复活面闭。
- ②saving→discard→回调到达：零状态变更（noteByPaper 不得被回调重建）——
  in-flight 残余=仅 DB 落地毫秒窗（已接受残余，宣告于票面，不修）。
- ③dirty×N 篇→switchTo 确认→discardAll→invoke switch→reload：reload 前零
  timer 零内存草稿——悬置写 renderer 面闭；跨课题残余由 main 归属校验
  （papers.findById NOT_FOUND，已在职）兜。
- ④dirty→closeAll（App 切视图，无确认）：**不 discard**——autosave-first
  草稿存活+timer 继续跑（既有语义显式保持，测试不动）。

### 3.1 notes.store.ts（改动一）

新增两公开动作（NotesStore 接口+实现）：

```ts
discardPendingEdit(paperId: string): void   // 单篇：关脏 tab 确认弃改
discardAllPendingEdits(): void              // 全量：切课题确认弃改
```

- 模块级新增 `const discardGen = new Map<string, number>()`（代际计数）。
- discard 单篇动作体：`clearTimer(paperId)`；pendingEdit/touchedFields/
  lastEditedAt/editSeq 各 delete；`discardGen.set(paperId, (get??)+1)`；
  `set({ noteByPaper: 从 get().noteByPaper 删该键 })`（条目不存在亦无害——
  全操作幂等）。头注/行内注释声明四跨格序列语义。
- discardAll：遍历 pendingEdit 快照逐篇调同一私有实现（防遍历中变异）。
- saveSoon 派发处快照 `const genAtDispatch = discardGen.get(paperId) ?? 0`；
  **.then 与 .catch 回调首行**：`if ((discardGen.get(paperId) ?? 0) !== genAtDispatch) return`
  （全 no-op——既有 editSeq 守卫在其后保持原位）。
- 头注行为层增补 discard 两动作语义+代际守卫一句话（「弃改后到达的保存回调
  不得复活任何本地状态」）。

### 3.2 tab-dirty.ts（改动二）

- confirmCloseDirty 守门通过后（confirm 返回 true 或 clean 直通两路汇合处）
  调 `useNotesStore.getState().discardPendingEdit(paperId)`（clean 直通=no-op，
  幂等安全）。头注注释更新：本函数兼任「弃改收口点」——**一切 tab 关闭路径
  必经本守门**（TabBar 双点两位在案；未来新增关闭路径同此约束——接缝归责）。
- 白名单现状：tab-dirty.ts 已在 COMPOSITION_ROOT_ALLOW（notes/notes.store），
  **零改动**。reader.store.closeOne **不接**（主控裁决：reader.store 无法直引
  notes.store——白名单外；且 tab-dirty→reader.store 已有 import，反向接会成
  环；守门内收口=单点覆盖全部关闭路径）。

### 3.3 workspace.store.ts（改动三）

- switchTo 内 confirm 通过后、`await unwrap(api.workspaces.switch(...))` 前接
  `useNotesStore.getState().discardAllPendingEdits()`（含 clean 直达——
  dirty=false 时无 pending，no-op）。import notes.store（跨域受控例外）。
- `scripts/check-quality.mjs`：COMPOSITION_ROOT_ALLOW 增
  `['src/renderer/features/workspaces/workspace.store.ts', ['notes/notes.store']]`
  +头注区理由段（模板循既有条目风格：「A3（2026-09-02）：workspace.store 是
  课题切换弃改收口点（INV-35④ 显式防悬置写兑现——切课题确认后 discardAll
  notes 悬置编辑，聚合职责即消费 notes.store），workspaces 域其余文件引用
  notes 仍是红线」）。
- workspace.store 头注若有域边界声明，同步补一句。

### 3.4 main 归属校验（零改动——核验声明）

notes.service.ts:47 `papers.findById(req.paperId)===null → NOT_FOUND` 即跨课题
归属校验（repos 绑当前课题库）——**已在职，本单零改动**；实现报告里给核验
声明（行号+语义两行），扫描报告「FK 偶然兜底」口径由主控收口时修档。

### 3.5 测试（受锁件追加，always-active——新用例禁 guardedDescribe，文末独立 describe）

notes.store.test.ts（loadStore 重置桩法，fake timers）：
1. discard 清 timer：edit+saveSoon→discard→advance 1600→save 未被调。
2. discard 清内存草稿（序列①）：edit→discard→load（服务器值）→整版落地
   （contentMd=服务器值非草稿值——不合并回填）。
3. in-flight 代际 no-op（序列②）：edit+saveSoon→advance 到派发（save 已调）
   但**未 resolve**（Deferred 桩）→discard→resolve→回调后 noteByPaper[paperId]
   **undefined**（条目未被重建）+pendingEdit 语义面经 load 整版落地复核。
4. discardAll：两篇 pending→discardAll→advance→save 零调用。
5. discard 后再 edit：正常重新起步（edit→pending=true——代际守卫不误伤后续
   编辑链，gen 快照在每次派发时重取）。

tab-dirty.test.tsx：
6. confirmCloseDirty dirty+confirm 接受→notes.store 该篇条目被 discard（经
   真实 notes.store 状态断言——非 mock 断言）；clean 直通不抛错（幂等 no-op）。

workspace.store.test.ts：
7. switchTo 确认接受→discardAll 生效（预置两篇 pending→switchTo→零 pending）
   +既有断言面零破坏（reload 桩维持既有形态）。

e2e reader-text.spec.ts（文末一个 test，循 :227 dialog 自动接受先例）：
8. 复活面端到端：开文献→笔记面板输入→防抖窗内（<1.5s）关 tab（confirm 接受）
   →重开同文献→笔记内容=基线（**非**输入值）。种子面循既有 fixture；断言
   锚=textarea 值（渲染出真实文本纪律）。

### 3.6 变异红证（≥3 档，各自落盘）

- M1：摘 discard 内 clearTimer→用例 1 红。
- M2：摘回调首行代际守卫→用例 3 红（条目被重建）。
- M3：摘 confirmCloseDirty 内 discard 接线→用例 6 红。
- （M4 可选：摘 switchTo 内 discardAll→用例 7 红。）

## ④ 纪律

同 F-R3 单（TDD 首红落盘→实现→绿→变异红证→cp 备份法还原→npm run verify 真退出码落盘；.raw.txt 后缀；一行一断言；npm run test 禁裸 npx vitest；≤500 行——四文件均余量充足；UTF-8；BLOCKED 停手）。**受锁 e2e spec 改动后必须全量 verify**（playwright esbuild 转译不查类型——tsc 关口才拦类型注解缺陷，宪法在册）。e2e 需先 `npm run build`。

**受锁面改完即时 `npm run locks:apply`**（更新 manifest 哈希——否则 verify 的
locks 步因哈希不匹配红；F-R3 单先例在册）。

## ⑤ 基线数字（自检参照）

- verify 基线=126 文件 **1081**（本单与 F-R3 单同场先后落——你开工前先
  `npm run test` 确认当前数并如实报告，预期=1081+F-R3 单新增数+本单 7 it）。
- locks=233（收口主控核对）。e2e=30+F-R3 后基数+本单 1。

## ⑥ 报告契约

全文落 `scripts/audits/auditc-a3-impl.report.md`：实现摘要/文件清单/首红/
绿/变异红证/verify 真退出码/main 归属校验核验声明（3.4）/自裁申报（含删减面
diff 自查）/疑虑。回复五行内。
