# F-SV 实现报告 —— settings.save 并发互斥（store 层链式全序）

> 实现者子代理（三屋模式，F-SV 单号）；票面=scripts/audits/f-sv-brief.md。
> 结论：**完成，verify exit=0（127 文件 1106 用例），两处自裁申报见 §六**。

## 一、实现摘要

病根（AUDIT-C §1.1）：save 间无互斥——saving 仅驱动 UI 不拒并发，ipcMain.handle
对 async handler 不序列化，并发 save 的 invoke 各自在途；INV-39「set 必须组装全量」
放大：save₁ 旧全量迟到落盘整体覆盖 save₂ → 档位回跳。

修法（settings.store.ts 工厂闭包，与 settingsSeq 同层）：

```ts
let saveChain: Promise<void> | null = null   // null=链空闲（直发哨兵）
let inflight = 0

async save(patch) {
  inflight += 1
  set({ saving: true })
  const run = saveChain === null ? doSave(patch) : saveChain.then(() => doSave(patch))
  saveChain = run.then(() => undefined, () => undefined)   // 链永不断（双 noop 吞中间失败）
  try { await run }                                          // 错误各自上抛（动作型契约零变）
  finally {
    inflight -= 1
    if (inflight === 0) { saveChain = null; set({ saving: false }) }  // 归零才复位+链清空
  }
}
```

doSave=原 save 的 try 体原样搬入（settingsSeq 抬升+set({settings:saved})）。行为
契约对票面 §一 状态机四行全保持：排队全序/链不断/单 save 直发零变/save 期间 load
版本计数守卫零变（INV-03 既有四用例不动、全绿）。

**与票面字面形态的偏离（详见 §六-1）**：票面 §一 写「saveChain: Promise<void>
（初始 resolved）」——按此字面实现后锁定用例「格2」红（详见 §三 r1），验收线
（既有锁定用例全数保持绿=单 save invoke 同步即发）优先，改用 **null 哨兵**：空闲
直发、忙时排队、归零清空。行为层与票面状态机逐格一致。

## 二、文件清单（git diff --stat 亲验，恰四文件无蔓延）

| 文件 | 改动 | 说明 |
| --- | --- | --- |
| src/renderer/features/settings/settings.store.ts | +54/-14 区段，共 119 行（≤500） | 链式全序实现+头注行为层/接口层扩写（守卫分层：UI 第一道/store 链第二道；单 save 直发零变） |
| tests/unit/renderer/settings.store.test.ts | +97，共 215 行（≤500） | F-SV 三用例（always-active 独立 describe，照 F-SL 头注先例；vitest import 补 describe） |
| docs/invariants.md | INV-03 行 2 处 | 声明列+「同通道写全序（写方向同族第三变体）」括号段；锚定列+F-SV 三用例（格式照 F-SL 既有段） |
| locks/manifest.json | locks:apply 产物 | 受锁两文件（test+invariants）新哈希 |

证据文件（scripts/audits/）：f-sv-red / f-sv-green / f-sv-green-r1-fail /
f-sv-mutation-m1 / f-sv-mutation-m2 / f-sv-verify（.raw.txt，均含 `echo exit=$?`
真退出码）；f-sv-locks-apply / f-sv-locks-apply2（.raw.txt）；
f-sv-mut-backup-settings.store.ts（变异备份留档）。

## 三、TDD 红证

- **RED（f-sv-red.raw.txt）**：3 failed | 1103 passed（1106），exit=1。三红因逐条
  核对符合设计：用例①②「expected "spy" to be called 1 times, but got 2 times」
  （旧实现两 invoke 并发直发）、用例③「expected 3 to be 5」（旧实现中途闪 false
  帧：indexOf(false)=3 ≠ length-1=5）。首跑曾因缺 `describe` import 报 ReferenceError
  （错误态≠正确红），补 import 后重跑取得上述真红。
- **GREEN r1 中间态（f-sv-green-r1-fail.raw.txt）**：2 failed，两红各自归因：
  ① 锁定用例「格2」`TypeError: resolveSave is not a function`——票面字面形态
  （初始 resolved saveChain）使首个 invoke 延一微任务，锁定用例在 save() 后同步
  resolve 桩依赖 invoke 即发（单 save 行为零变=验收线）→ 改 null 哨兵直发。
  ② 用例②的 save₁ 失败桩为即弃 rejected promise，flush 期间整链排干致排队断言
  失义 → 改可控 reject（rejectSet1，与用例①同构）。
- **GREEN r2（f-sv-green.raw.txt）**：127 文件 1106 用例全绿，exit=0。
- **变异红证 M1（f-sv-mutation-m1.raw.txt，票面指定形态）**：删链直发
  （`run = doSave(patch)` 不排队）→ 用例①②红（2 failed | 1104 passed，exit=1），
  恰为票面预言「用例 1 的 settle 前不被调断言红」；同时补证改写后用例②非恒真
  （指纹与 RED 同：首计数断言 called 2 times）。
- **变异红证 M2（f-sv-mutation-m2.raw.txt，补充，超票面最低要求）**：去 inflight
  门控（`===0` 改 `>=0`，finally 无条件复位）→ 用例③红（1 failed | 1105 passed，
  exit=1）——证明用例③锁的就是归零门控。用例③文本自 RED 后未改，其红证本体在
  f-sv-red.raw.txt。
- 变异还原=文件备份法（cp 备份→变异→测→cp 还原→cmp 字节级验证 restore-ok），
  未用 git checkout；`inflight === 0` 复位亲验在档。

## 四、测试证据（全量套跑口径，`npm run test`，无裸 npx vitest）

| 阶段 | 文件 | 用例 | exit |
| --- | --- | --- | --- |
| RED | f-sv-red.raw.txt | 3 failed / 1103 passed（1106） | 1 |
| GREEN r1（中间态） | f-sv-green-r1-fail.raw.txt | 2 failed / 1104 passed | 1 |
| GREEN r2 | f-sv-green.raw.txt | 127 文件 1106 全绿 | 0 |
| M1 删链直发 | f-sv-mutation-m1.raw.txt | 用例①②红 | 1 |
| M2 去门控 | f-sv-mutation-m2.raw.txt | 用例③红 | 1 |
| verify 全管线 | f-sv-verify.raw.txt | quality+tickets+locks+lint+typecheck+test(1106)+build 全过 | 0 |

基线对账：票面基线 verify=127 文件 1103 用例 → 实测 127/1106（+3 新用例，
1106=票面预期「1106±」精确命中）。

verify 首跑曾在 typecheck 关卡红（exit=2）：`TS2741: Property 'uiScale' is missing`
×5（settings.store.test.ts:156/161/186/204/206）——vitest 不查类型，tsc 拦住
（票面 §六 预警的同族陷阱）。修法=数据对象补 `uiScale: 'small'`（照既有锁定
stale-guard 用例同模式，Promise<SettingsOk> 上下文类型要求全字段）。该失败原始
输出被最终 verify 覆盖（证据文件名固定四件），指纹已在此逐字记录。

## 五、locks 实录

- 改前自检：locks:check=238 一致（与票面基线同）。
- locks:unlock（238）→ 改 test+invariants → RED/GREEN/变异全程在解锁窗内完成
  （verify 运行期间未动受锁面）→ **第一次 locks:apply**（f-sv-locks-apply.raw.txt，
  exit=0，238 重锁）→ verify 首跑 typecheck 红 → 二次 unlock → 补 uiScale →
  typecheck 绿 → **第二次 locks:apply**（f-sv-locks-apply2.raw.txt，exit=0）→
  locks:check=238 一致 → 最终 verify（含 locks 关卡）exit=0。
- 无新受锁路径（未 locks:generate）；manifest 变更随工作区留待主控 [locked-change]
  提交。

## 六、自裁申报（超票面决定，逐条）

1. **空哨兵链偏离票面字面形态**：票面 §一 指定 `saveChain: Promise<void>`（初始
   resolved）；按字面实现使单 save 的 invoke 延一微任务发出，直接击红锁定用例
   「格2」（同步 resolve 桩依赖 invoke 即发——该用例是受锁合约不得改）。以票面
   自身验收线（§一 表「单 save 行为零变；既有锁定用例全数保持绿=验收线」）优先，
   改 null 哨兵：空闲直发（同步即发）/忙时排队/归零复位 null。语义效果=票面形态
   的超集（票面形态仅多一跳延迟），四行行为契约逐格保持。
2. **用例②失败桩改写**（r1 后）：即弃 rejected promise → 可控 reject。目的=让
   「排队不发出」断言有意义（非放宽——断言集不变，反而收紧为可控时序）。红证
   由 M1 变异补证（直发变异下同样红，指纹同 RED）。
3. **M2 补充变异**：票面要求≥1，实做 2（M2=去 inflight 门控证用例③非恒真）。
4. **证据文件超出票面四件清单**：f-sv-green-r1-fail / f-sv-mutation-m2 /
   f-sv-locks-apply(2) / f-sv-mut-backup-settings.store.ts——均为过程取证留档，
   落 scripts/audits 惯例位置（F-SL/F-A4 先例同）。

## 七、疑虑（如实移交）

1. **用例③未走降级路径**：票面 §四 授权「若 jsdom 调度下不可稳定观测可降级」；
   实际以「订阅帧序列 false 仅在末尾出现一次」实现——zustand set 为同步调用、
   序列完全确定，无调度依赖。申报为强化而非降级；M2 变异证其可红（非恒真）。
2. **locks/manifest.json CRLF 警告**：git diff 时提示「CRLF will be replaced by
   LF」——lock-protected.ps1（PowerShell）写出 CRLF、仓库 .gitattributes 归一
   LF，与历史提交流程同源（上一次 manifest 提交 22fc37a5c 同机器同脚本产出），
   locks:check 工作副本侧绿、verify（含 locks 关卡）绿。非本单引入，未处置。
3. **saving 语义边界**：本修使 store 层写方向全序，但 UI 帧守卫（pickScale 读
   渲染帧快照）与 store 链之间仍存在「第二击已入队」窗——此时 UI 已被 saving
   连续性保护（不闪断=禁点连续），语义=连点合并为两次排队落盘（终态=最后意图，
   不回跳）。这是票面设计意图（第二道门兜底）而非缺陷，如实现状申报。

## 八、门一收口义务（W1 书面解释——门一 Kimi 裁决 B:0/W:2/N:3 放行后追加；零代码改动）

**裁决点**：f-sv-red.raw.txt 除 `Tests 3 failed` 外有 `Errors 1 error`（堆栈
settings.store.ts:69:24 ← settings.store.test.ts:174:40，vitest 注记 latest
test='saving 连续…'），报告 §三未申报。主控预判=RED 期失败用例的悬挂 Promise
伴生信号——**源码级推演证实该定性，且来源可定死**（非「未定死」）。

**因果链（逐帧，全部对在档证据核验）**：

1. RED 期 store=旧无链实现：settings.store.ts:69 =旧 save 的 invoke 行
   （`api.settings.set(patch as …)`，:63-76 直发无排队——§一所引旧码）。
2. RED 期用例②为旧文本（即弃 reject 桩）：:171:52 =`Promise.reject(new
   Error('写盘失败'))`（mock#1，error 创建点=堆栈首帧）；:174:40 =`const
   pSave1 = …save(…)`（堆栈末帧，pSave1 创建点）。行号与旧文本逐行对账吻合
   （171 mock#1→172 mock#2→173 loadStore→174 pSave1）。
3. 旧 store 直发：flush() 排空期间，reject 沿 mock→unwrap→旧 save 的 await
   点（:69:24，堆栈第三帧=异常注入 save 异步帧之处）传播→finally→**pSave1
   终态=rejected**。
4. 用例②在 :177:17 计数断言（called 2 times）同步失败提前中止——**早于**
   旧文本下一行的 `await expect(pSave1).rejects`（唯一会挂接 handler 的时
   机），故 pSave1 以**零处理者**悬挂。
5. Node 的 unhandledRejection 在后续宏任务边界上报；此时 vitest 已进入用例
   ③ → 注记 latest test='saving 连续…'。注记原文自证非因果归属（f-sv-red
   .raw.txt :3807-3809）：「It doesn't mean the error was thrown inside the
   file itself…The latest test that might've caused…」。

**三点确认**：

- **① 三断言指纹与 error 无因果**：三红各自产生于自己的断言行——①:154:17、
  ②:177:17（计数断言「called 1 times, but got 2 times」）、③:208:35
  （「expected 3 to be 5」）——均为同步 expect 失败；error 是被中止用例②的
  pSave1 异步伴生（产生于 :171→:69→:174 链，上报时间在三断言之后）。红由
  断言产生、error 伴生——与主控预判一致。
- **② GREEN/verify 期零 Errors（在档佐证）**：f-sv-green / f-sv-mutation-m1
  / f-sv-mutation-m2 / f-sv-verify 四件 grep「Errors |Unhandled」计数均=0。
  附带如实申报：中间态 f-sv-green-r1-fail.raw.txt 含**同机制** 1 error（旧
  文本用例②同样中止悬挂 pSave1；堆栈 doSave:72:20←:95:40 为 r1 期实现行号，
  latest-test 注记同为③——机制不变仅行号平移，旁证定性）。用例②改可控
  reject 后（r2 起）该伴生信号消失：中止发生在 rejectSet1 调用之前，pSave1
  永悬不 reject——当前测试文本本身中止安全（M1 变异下用例①②红且零 Errors
  即其证）。
- **③ 来源已定死**：RED 期 error=用例②（旧文本 :174 创建）的 pSave1 未处理
  拒绝；store:69:24=旧 save invoke 行的 await 帧。

**处置**：仅本节记档，零代码改动；红证定性不受影响（红=断言，error=伴生，
GREEN/M1/M2/verify 全零）。N1（INV-03 先例列补记）与 W2（中间 verify 失败
留档不一致=流程教训）归主控收口，实现者无动作。
