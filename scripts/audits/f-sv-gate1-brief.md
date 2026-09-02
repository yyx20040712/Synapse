# F-SV 门一对抗深审材料包（Kimi 链）

> 你是门一对抗审查员（Kimi）。工单=F-SV settings.save 并发互斥：store 层链式全序（写方向互斥——INV-03 写方向同族第三变体「同通道写全序」）。病根母本=AUDIT-C C-3 扫描报告 §1.1 settings.save 行+§五-4。对抗审查四件：票面母本符合度/宪法红线/代码与测试质量/报告诚实性（自裁逐条对 diff）。只报告有证据支撑的问题，每条【B/W/N+file:line 或 diff 摘录】。用中文。

## 主控预裁项（可攻击，推翻需更强依据）

1. **实现者自裁①（票面字面形态修订）**：票面 §一写「saveChain 初始 resolved」——实现者实证该形态击红既有锁定用例「乱序守卫格 2」（save() 同步返回后测试立即调 resolveSave，链形态下 set 调用被推迟到 microtask、resolveSave 尚 undefined→TypeError）→改 **null 哨兵**：链空直发（单 save invoke 同步即发=行为零变验收线）/链忙排队。主控复核：既有锁定用例的时序形状（pSave=save();pLoad=load() 同步连续调用）依赖 invoke 即发，票面字面形态确实破坏它——自裁成立，且更优（空闲路径零 microtask 开销）。
2. **实现者自裁②（用例②红证路径）**：票面建议的直 throw 桩在 null 哨兵形态下不能产生可控「save₁ 在途+save₂ 排队」窗（throw 即 settle），改受控 reject 桩——RED 首红的用例②失败态由变异 M1（删链直发→用例①②时序断言红）补证。
3. UI 守卫分层：SettingsPage runSave/pickScale 的 if(saving) return 保留=第一道门（帧快照毫秒窗+跨入口不互斥的兜底归 store 链=第二道）。
4. e2e 零改：设置页 e2e 无并发连点面；单 save 行为零变由既有锁定用例+verify 全量兜底。
5. **已知微瑕（主控自查发现，供你定级）**：INV-03 扩写的第三列（锁定列）已加「F-SV 同通道写全序三用例」，但第二列（先例列）未同步加「settings save 链」——列间轻微不同步，主控倾向收口前补齐（一行文字），你裁是否必须。

## 审查清单（六问）

1. 母本符合度：票面 §一时序表四格逐格对照实现；null 哨兵形态与票面修订后语义（链空直发/忙排队/链永不断/inflight 归零才复位）的边界推演——save₁ settle 与 save₂ 起跑之间有无竞窗（链清理时机：inflight===0 才 saveChain=null——排队者在途时永不清链，推演）？
2. 语义保持：既有锁定用例全数绿=「单 save 行为零变」验收线成立？settingsSeq 抬升/set({settings:saved}) 搬入 doSave 后语义零变（含 INV-03 版本计数四用例）？错误契约（动作型上抛各自调用方）在链形态下的保持（run.then 双 noop 只为续链，await run 原样上抛）？
3. 并发正确性：三个并发场景（双 save 成功/save₁ 失败+save₂ 排队/saving 帧连续）的断言是否真能失败（对照 RED 3 红+变异 M1 用例①②红/M2 用例③红）？flush(10) 微任务排空的轮数是否充分（链深 2 需几轮——推演）？
4. 宪法红线：受锁流程（settings.store.test [locked-change]+unlock/apply）？新 describe always-active？行数（store 138/测试 216？实测）？UTF-8/中文注释？禁新依赖？
5. 接缝：SettingsPage 两调用点的 then/catch 链在 save 排队下的表现（await run 的 reject 仍被各自 catch→toast——INV-02 可见性保持）？load 与链的交互（版本计数守卫零变的理由）？
6. 报告诚实性：自裁 2 项+疑虑逐条对 diff 核实；locks 238 两侧一致实录；--stat 四文件与票面改动面（store+test+invariants+manifest）吻合？

## 证据关键段（全文在库，此为摘录）

### f-sv-verify.raw.txt 尾部（verify 真退出码）

```
[1m[33m[plugin:vite:reporter][39m[22m [33m[plugin vite:reporter] 
(!) E:/class/智慧水务/Synapse_remake/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url is dynamically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/CorpusExtractor.ts but also statically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfDocProvider.tsx, dynamic import will not move module into another chunk.
[39m
rendering chunks...
[2m../../out/renderer/[22m[32mindex.html                          [39m[1m[2m    0.88 kB[22m[1m[22m
[2m../../out/renderer/[22m[32massets/pdf.worker.min-yatZIOMy.mjs  [39m[1m[2m1,375.84 kB[22m[1m[22m
[2m../../out/renderer/[22m[35massets/index-BnbUs7aC.css           [39m[1m[2m   44.34 kB[22m[1m[22m
[2m../../out/renderer/[22m[36massets/index-DALEOyS8.js            [39m[1m[33m1,308.74 kB[39m[22m
[32m✓ built in 1.59s[39m
exit=0
```

### f-sv-red.raw.txt 尾部（首红，恰 3 红）

```
    [90m172| [39m      [33m.[39m[34mmockImplementationOnce[39m(() [33m=>[39m [35mnew[39m [33mPromise[39m[33m<[39m[33mSettingsOk[39m[33m>[39m((r) [33m=>[39m { r…
    [90m173| [39m    [35mconst[39m useStore [33m=[39m [35mawait[39m [34mloadStore[39m({ settings[33m:[39m { [35mset[39m } })
[90m [2m❯[22m Object.mockCall ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/@vitest/spy/dist/index.js:[2m61:17[22m[39m
[90m [2m❯[22m Object.spy ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/tinyspy/dist/index.js:[2m45:80[22m[39m
[90m [2m❯[22m Object.save src/renderer/features/settings/settings.store.ts:[2m69:24[22m[39m
[90m [2m❯[22m tests/unit/renderer/settings.store.test.ts:[2m174:40[22m[39m
[90m [2m❯[22m processTicksAndRejections node:internal/process/task_queues:[2m104:5[22m[39m
[90m [2m❯[22m ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/@vitest/runner/dist/index.js:[2m533:5[22m[39m
[90m [2m❯[22m runTest ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/@vitest/runner/dist/index.js:[2m1056:11[22m[39m
[90m [2m❯[22m runSuite ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/@vitest/runner/dist/index.js:[2m1205:15[22m[39m
[90m [2m❯[22m runSuite ../../%E6%99%BA%E6%85%A7%E6%B0%B4%E5%8A%A1/Synapse_remake/node_modules/@vitest/runner/dist/index.js:[2m1205:15[22m[39m

[31mThis error originated in "[1mtests/unit/renderer/settings.store.test.ts[22m" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.[39m
[31mThe latest test that might've caused the error is "[1msaving 连续：save₁ settle 后 save₂ 起跑前不闪 false（订阅帧 false 仅在全部 settle 后出现一次）[22m". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.[39m
[31m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[39m

[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m126 passed[39m[22m[90m (127)[39m
[2m      Tests [22m [1m[31m3 failed[39m[22m[2m | [22m[1m[32m1103 passed[39m[22m[90m (1106)[39m
[2m     Errors [22m [1m[31m1 error[39m[22m
[2m   Start at [22m 21:17:31
[2m   Duration [22m 35.38s[2m (transform 20.59s, setup 0ms, collect 68.75s, tests 16.63s, environment 417.13s, prepare 63.63s)[22m

exit=1
```

### f-sv-mutation-m1.raw.txt / m2 尾部（变异红证）

```
    [90m   | [39m                [31m^[39m
    [90m180| [39m    [34mrejectSet1[39m([35mnew[39m [33mError[39m([32m'写盘失败'[39m))
    [90m181| [39m    [90m// save₁ 的失败上抛 save₁ 的调用方（动作型契约零变，不吞不串）[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯[22m[39m

[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m126 passed[39m[22m[90m (127)[39m
[2m      Tests [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m1104 passed[39m[22m[90m (1106)[39m
[2m   Start at [22m 21:22:38
[2m   Duration [22m 27.88s[2m (transform 13.15s, setup 0ms, collect 50.22s, tests 13.96s, environment 296.40s, prepare 73.39s)[22m

exit=1
```

```
    [90m   | [39m                                  [31m^[39m
    [90m212| [39m    [34mexpect[39m(frames[33m.[39m[34mlastIndexOf[39m([35mfalse[39m))[33m.[39m[34mtoBe[39m(frames[33m.[39mlength [33m-[39m [34m1[39m)
    [90m213| [39m    [34mexpect[39m(useStore[33m.[39m[34mgetState[39m()[33m.[39msaving)[33m.[39m[34mtoBe[39m([35mfalse[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m

[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m126 passed[39m[22m[90m (127)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m1105 passed[39m[22m[90m (1106)[39m
[2m   Start at [22m 21:23:59
[2m   Duration [22m 28.25s[2m (transform 12.97s, setup 0ms, collect 50.41s, tests 13.99s, environment 300.19s, prepare 75.02s)[22m

exit=1
```

## 票面全文

# F-SV 修票票面 —— settings.save 并发互斥（store 层链式全序）

> 来源=AUDIT-C C-3 扫描报告 §1.1 settings.save 行+§五-4（scripts/audits/audit-c-scan.md）。
> 五波场首票（交接书 v25 §2.1）。小票：3 文件+manifest。
> 病根=save 间无互斥：saving 标志仅驱动 UI 不拒并发；settings 版本计数只防
> 「load 旧快照覆盖 save 终态」，**不防 save₁ 旧全量迟到落盘覆盖 save₂**
> （INV-39「set 必须组装全量」放大此面——全量写互相整体覆盖）。

## 〇、病根证据与 UI 守卫不足推演

- settings.store.ts:63-76：save 无互斥——并发两个 save 的 invoke 各自在途；
  ipcMain.handle 对 async handler 不序列化（settings.store.ts:41-44 头注机事实在案，
  INV-03 收口时已录）→save₁ 交错迟到落盘→**settings.json 终值=旧全量=档位回跳**
  （可达性=毫秒级连点×后果=可恢复 W：重点一次即正）。
- UI 守卫不足两路（为何必须 store 层）：①SettingsPage pickScale :99
  `if (saving…) return` 读的是渲染帧快照——zustand set 同步但 React 重渲异步，
  双击第二击时快照仍 false→两 save 齐发；②runSave(:90)与 pickScale(:102)是两个
  入口，各有守卫也不构成跨入口互斥。UI 守卫保留=第一道门（防常规重复），
  store 链=第二道（兜毫秒窗+跨入口）——分层语义头注写明。

## 一、行为层（状态机前置）

save 链式全序（写方向互斥——INV-03 写方向同族第三变体）：

| 序列 | 现行为 | 修后预期 |
| --- | --- | --- |
| save₁ 挂起中 save₂ 进入 | 两 invoke 并发在途，落盘序不定→回跳窗 | save₂ 排队；save₁ settle（成功/失败）后 save₂ 才发 invoke；终态恒=save₂ 值 |
| save₁ 失败+save₂ 排队 | 各自独立 | 链不断：save₂ 照常发出（save₁ 错误上抛 save₁ 的调用方，不吞不串） |
| 单 save（无并发） | 直发 | 行为零变（既有锁定用例全数保持绿=验收线） |
| save 期间 load | 版本计数守卫 | 零变（INV-03 既有四用例不动） |

- 实现形态：闭包内 `saveChain: Promise<void>`（初始 resolved）+
  `inflight` 计数；save 入口 inflight++/set({saving:true})；执行体
  `await saveChain.then(() => doSave(patch))`；`saveChain = run.then(noop, noop)`
  （**链永不断**——中间失败不阻塞后继）；调用方 `await run`（错误各自上抛，
  动作型契约零变）；finally inflight--，归零才 set({saving:false})
  （排队者不闪断 saving——UI 禁点连续）。doSave=原 try 体（settingsSeq 抬升+
  set({settings:saved}) 原样搬入）。
- saving 语义：true 的窗口=队列非空（含排队等待+在途）；「归零才复位」防
  save₁ settle 与 save₂ 起跑之间的瞬态 false。

## 二、接口层

签名零变（`save(patch: Partial<AppSettings>): Promise<void>`）；错误契约零变
（动作型上抛，设置页 catch toast 既有）。

## 三、架构层

- 只动 settings.store.ts 一个生产文件；SettingsPage/其余零改。
- 链状态=store 工厂闭包（与 settingsSeq 同层，先例同文件 :48）。

## 四、生命周期层（测试锚——TDD 红→绿先行）

tests/unit/renderer/settings.store.test.ts（受锁，[locked-change]）新增三用例
（always-active 独立 describe，照 F-SL 头注先例）：
1. 「并发全序：save₁ 挂起中 save₂ 进入→save₂ 的 set 在 save₁ settle 前不被调，
   settle 后恰一次；终态=save₂ 值；saving 归零」——set 桩 mockImplementationOnce
   可控 promise×2，记录调用序（时序断言：resolve₁ 之前 expect(set).toHaveBeenCalledTimes(1)）。
2. 「链不断：save₁ reject 后排队的 save₂ 照常发出成功，save₁ 错误上抛其调用方」。
3. 「saving 连续：save₁ settle 后 save₂ 起跑前不闪 false」（微观断言可选——若
   jsdom 调度下不可稳定观测，降级为「两 save 全 settle 后 saving===false+期间订阅
   无 false 帧」或如实申报不可观测面，禁造恒真断言）。

变异红证≥1：删链（save 直发不排队）→用例 1 的「settle 前不被调」断言红。

## 五、文化层

- settings.store.ts 头注行为层补链式全序语义+UI 守卫分层声明（第一道 UI/第二道
  store）。
- docs/invariants.md：INV-03 扩写一句（写方向同族第三变体=**同通道写全序**：
  settings save 链式排队，落盘序=发出序，终态恒=最后一次意图——与 undo 身份寻址/
  addAnnotation 按身份寻址并列）。格式照既有括号段。
- 禁新依赖；UTF-8；中文注释；≤500 行。

## 六、纪律与证据契约（三屋）

- TDD：先红（新用例，全量套跑口径）→实现→绿→变异红证≥1（文件备份法还原禁
  git checkout）。
- npm run test 禁裸 npx vitest；verify 真退出码 `echo exit=$? >>` 落盘。
- 受锁测试改动走 locks:unlock→改→locks:apply（无新受锁路径不 generate）。
- **verify 运行期间禁动受锁面**。
- 证据落盘 `.raw.txt`（scripts/audits/）：f-sv-red / f-sv-green / f-sv-mutation-m1 /
  f-sv-verify。
- 基线：verify=127 文件 1103 用例、locks=238（volta node24，`export PATH=
  "/c/Program Files/Volta:$PATH"` 后 npm run verify；新增用例后如实报实测值）。
- 禁 git add/commit/push；禁翻 tickets/；卡点=BLOCKED 停手。
- 报告全文落 scripts/audits/f-sv-impl.report.md（含自裁申报/疑虑）；回复五行内。
- 必读序：AGENTS.md→本票面→audit-c-scan.md §1.1 settings.save 行→settings.store.ts
  全文→tests/unit/renderer/settings.store.test.ts 全文→SettingsPage.tsx :87-107
  （UI 守卫两入口）→docs/invariants.md INV-03 行（F-SL 写方向同族段——扩写接续点）。


## 实现报告全文（含自裁申报 2 项）

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


## diff 全文（4 文件：store+测试+invariants+manifest）

### --stat

```
 docs/invariants.md                               |  2 +-
 locks/manifest.json                              |  6 +-
 src/renderer/features/settings/settings.store.ts | 54 ++++++++++---
 tests/unit/renderer/settings.store.test.ts       | 97 +++++++++++++++++++++++-
 4 files changed, 145 insertions(+), 14 deletions(-)

```

```diff
diff --git a/docs/invariants.md b/docs/invariants.md
index cc6c4349f..0eec5205f 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -14,7 +14,7 @@
 | --- | --- | --- | --- | --- |
 | INV-01 | 文档永不滚：所有滚动只发生在应用内 overflow 容器（main / 阅读器滚动区） | theme.css html/body/#root overflow:hidden | e2e 计算样式断言（reader-text.spec 三层 overflow 必须全 hidden） | 已锚定（2026-08-23 UBS；取证注记：内容度量可合法超出被裁剪，几何断言形状不可用——锁的是声明形状，见 95c3f3f） |
 | INV-02 | 用户触发的动作失败必须可见（toast / 内联红条），禁止静默吞错 | AGENTS 文化层；U1（内联红条）/U6（store.error+watch）两个修复模式 | 人审 + 工单模板条款（规约锚定；模板=scripts/new-ticket.ps1 文化层） | **部分**（lint 化不可行有实证：blanket 空 catch 禁令误伤三处合法尽力而为——ipc/settings.ts:52/reader.store.ts:90/import.service.ts:171，见 b774d5c；规约化已落 new-ticket.ps1 文化层） |
-| INV-03 | 一切含异步 load 的 store 必须有请求序号 stale-guard（旧响应/旧失败不得覆盖新状态；跨通道乱序面见 settings 版本计数变体；异步 hook 同族见 useAsync 请求令牌——被取代调用的迟到 settle 一律丢弃，loading 只由最新请求熄灭；**per-tab 变体（2026-08-24 SR2-TABS-01）：多 tab 并发加载下守卫粒度=tab 级——迟到响应三规则：①tab 已关→丢弃 ②tab 被新一轮加载顶替→丢弃 ③tab 存在且最新→写入该 tab 自身（不得覆盖展示中的其他 tab），换 tab 不失忆**；**写方向同族（2026-09-02 F-SL）：写回动作必须发起前捕获身份+落笔时按身份寻址——目标 tab 缺席（已关）→ no-op（DB 已落，重开自 DB 读对齐）；双先例=reader undo（activeId 捕获+tabs[paperId] 核对后追写）与 addAnnotation（签名 (paperId,a) per-paperId 寻址——SelectionLayer 保存 await 窗内切 tab 幽灵标注修复）**） | library/notes/tags/reader 四 store 先例（闭包 loadSeq）+ settings 版本计数（仅成功落地抬升）+ useAsync runSeq + reader.store per-tab（loadSeq 总序+tabLoadSeq 字典）+ reader 写方向双先例（undo 与 addAnnotation 按捕获身份寻址，F-SL） | 五 store 单测锁定（notes/tags/library 既有 + reader/settings 2026-08-23 UBS 补；reader 2026-08-24 SR2-TABS-01 重锚为 per-tab 18 用例）+ useAsync.test 三面锁定（迟到旧失败/迟到旧成功/loading 误熄）+ F-SL 写方向两用例（activeId 切走仍写发起 tab/目标 tab 已关 no-op，always-active） | 已锚定 |
+| INV-03 | 一切含异步 load 的 store 必须有请求序号 stale-guard（旧响应/旧失败不得覆盖新状态；跨通道乱序面见 settings 版本计数变体；异步 hook 同族见 useAsync 请求令牌——被取代调用的迟到 settle 一律丢弃，loading 只由最新请求熄灭；**per-tab 变体（2026-08-24 SR2-TABS-01）：多 tab 并发加载下守卫粒度=tab 级——迟到响应三规则：①tab 已关→丢弃 ②tab 被新一轮加载顶替→丢弃 ③tab 存在且最新→写入该 tab 自身（不得覆盖展示中的其他 tab），换 tab 不失忆**；**写方向同族（2026-09-02 F-SL）：写回动作必须发起前捕获身份+落笔时按身份寻址——目标 tab 缺席（已关）→ no-op（DB 已落，重开自 DB 读对齐）；双先例=reader undo（activeId 捕获+tabs[paperId] 核对后追写）与 addAnnotation（签名 (paperId,a) per-paperId 寻址——SelectionLayer 保存 await 窗内切 tab 幽灵标注修复）**；**同通道写全序（2026-09-02 F-SV 写方向同族第三变体）：settings save 链式排队——落盘序=发出序，终态恒=最后一次意图（全量写互相整体覆盖，INV-39 放大此面），与 undo 身份寻址/addAnnotation 按身份寻址并列；链永不断（中间失败不阻塞后继排队者），inflight 归零才复位 saving（不闪断）**） | library/notes/tags/reader 四 store 先例（闭包 loadSeq）+ settings 版本计数（仅成功落地抬升）+ useAsync runSeq + reader.store per-tab（loadSeq 总序+tabLoadSeq 字典）+ reader 写方向双先例（undo 与 addAnnotation 按捕获身份寻址，F-SL） | 五 store 单测锁定（notes/tags/library 既有 + reader/settings 2026-08-23 UBS 补；reader 2026-08-24 SR2-TABS-01 重锚为 per-tab 18 用例）+ useAsync.test 三面锁定（迟到旧失败/迟到旧成功/loading 误熄）+ F-SL 写方向两用例（activeId 切走仍写发起 tab/目标 tab 已关 no-op，always-active）+ F-SV 同通道写全序三用例（排队时序/链不断/saving 不闪断，always-active） | 已锚定 |
 | INV-04 | 保存失败不推进 savedAt（失败 = 未保存态延续，下次编辑自然重试） | notes.store 错误契约 | notes.store.test 锁定 | 已锚定 |
 | INV-05 | 标注矩形两路径同口径：划选保存与重开重锚走同一 mergeLineRects 几何 | annotation-anchor.ts rectsBetweenPoints 单点收口 | 单测 + e2e 计数断言 | 已锚定 |
 | INV-06 | e2e「看见」类断言必须含计算样式（颜色/opacity/blend）——几何可见 ≠ 视觉可见（教训 D1/L7 两度兑现） | reader-text.spec 先例（highlight/underline/note 三链） | e2e | 已锚定（2026-08-23 UBS 补 underline 2px 实条+底边贴合+宽度、note ≥8px 色块两链，三 kind 全覆盖） |
diff --git a/locks/manifest.json b/locks/manifest.json
index a90dfe836..85a8a241a 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-02T13:01:12.9375627Z",
+    "generatedAt":  "2026-09-02T13:26:20.8822188Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -7,7 +7,7 @@
                   },
                   {
                       "path":  "docs/invariants.md",
-                      "sha256":  "9bcaeddb00c842fff3db1e972f5ca465188dbfac8e09ff1b93e9f2b4242a2c5a"
+                      "sha256":  "3438ec1889c1dcf81c1e09730153dd6d961d0cfd5479621ae912522b9a0b0ba0"
                   },
                   {
                       "path":  "electron.vite.config.ts",
@@ -747,7 +747,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/settings.store.test.ts",
-                      "sha256":  "d557938d94b69d9c07ca8e556acdaf986431db85196e9208c1848b25c2b2eb5d"
+                      "sha256":  "b750b8cf8020e3369e81ecc15332a9c0ab8632094cfc67d0326364f6e9bd0fbc"
                   },
                   {
                       "path":  "tests/unit/renderer/split-pane.test.tsx",
diff --git a/src/renderer/features/settings/settings.store.ts b/src/renderer/features/settings/settings.store.ts
index d53528570..ed48cc064 100644
--- a/src/renderer/features/settings/settings.store.ts
+++ b/src/renderer/features/settings/settings.store.ts
@@ -5,11 +5,21 @@
  * - { settings: AppSettings | null; saving: boolean; diag: NetDiagItem[] | null }
  * - load()：api.settings.get({})；带 settings 版本守卫（仅 save 成功落地抬升；
  *   跨通道乱序晚到的旧快照丢弃，失败期间在途 load 照常应用——INV-03 收口）
- * - save(patch)：api.settings.set → 整体替换本地 settings
+ * - save(patch)：api.settings.set → 整体替换本地 settings；链式全序（写方向
+ *   互斥，INV-03 写方向同族第三变体「同通道写全序」）：并发 save 排队，前一
+ *   settle（成功/失败）后才发下一 invoke——落盘序=发出序，终态恒=最后一次
+ *   意图；单 save（无并发）直发（invoke 同步即发，行为零变）；链永不断
+ *   （中间失败只上抛各自的调用方，不阻塞后继排队者）；
+ *   saving=true 的窗口=队列非空（排队等待+在途），inflight 归零才复位
+ *   （排队者不闪断——UI 禁点靠 saving 连续）。守卫分层：设置页
+ *   runSave/pickScale 的 if(saving) return=第一道门（防常规重复，帧快照有
+ *   毫秒窗+两入口互不感知），store 链=第二道（兜毫秒窗+跨入口）
  * - diagnose()：api.settings.diagNetwork({}) → diag
  *
  * ── 接口层 ──
  * - export const useSettingsStore: UseBoundStore<...>
+ * - save 签名/错误契约零变：排队只影响 invoke 发出时序，失败仍动作型上抛
+ *   各自的调用方（不吞不串）
  *
  * ── 架构层 ──
  * - 只 import api/client 与 shared 模型；禁止 import 组件
@@ -47,6 +57,28 @@ export const useSettingsStore = create<SettingsStore>()((set) => {
   // settings 且页面有 busy 守卫，不参与本计数
   let settingsSeq = 0
 
+  // save 链式全序（写方向互斥）：ipcMain.handle 对 async handler 不序列化，
+  // 并发 save 的 invoke 各自在途，旧全量迟到落盘会整体覆盖新全量（INV-39
+  // 「set 必须组装全量」放大此面）→ 档位回跳。链空（null）时直发——单 save
+  // 的 invoke 同步即发（锁定用例在 save() 后同步 resolve 桩依赖此形状，行为
+  // 零变验收线）；链忙时排队到链尾，前一 settle（成功/失败）后才发下一
+  // invoke（落盘序=发出序）。链永不断（run.then 双 noop 吞掉中间失败，错误
+  // 由各自调用方 await run 上抛）；inflight 归零才复位 saving 且链清空——
+  // save₁ settle 与 save₂ 起跑之间不闪 false（守卫窗）。与 settingsSeq 同层
+  // （工厂闭包，单例私有）
+  let saveChain: Promise<void> | null = null
+  let inflight = 0
+
+  const doSave = async (patch: Partial<AppSettings>): Promise<void> => {
+    // 原样透传（锁定测试断言 set 收到的参数恰为 patch）：contactEmail 必填的
+    // 前置条件由调用方（设置页）先校验，此处只做类型收窄不做合并
+    const saved = await unwrap(
+      api.settings.set(patch as Parameters<typeof api.settings.set>[0])
+    )
+    settingsSeq += 1
+    set({ settings: saved })
+  }
+
   return {
     settings: null,
     saving: false,
@@ -61,17 +93,21 @@ export const useSettingsStore = create<SettingsStore>()((set) => {
     },
 
     async save(patch) {
+      inflight += 1
       set({ saving: true })
+      // 链空直发（单 save 行为零变）；链忙排队（并发互斥的核心）
+      const run =
+        saveChain === null ? doSave(patch) : saveChain.then(() => doSave(patch))
+      saveChain = run.then(() => undefined, () => undefined)
       try {
-        // 原样透传（锁定测试断言 set 收到的参数恰为 patch）：contactEmail 必填的
-        // 前置条件由调用方（设置页）先校验，此处只做类型收窄不做合并
-        const saved = await unwrap(
-          api.settings.set(patch as Parameters<typeof api.settings.set>[0])
-        )
-        settingsSeq += 1
-        set({ settings: saved })
+        await run
       } finally {
-        set({ saving: false })
+        inflight -= 1
+        // 归零才复位：排队者存在时 saving 保持 true（不闪断），链同时清空
+        if (inflight === 0) {
+          saveChain = null
+          set({ saving: false })
+        }
       }
     },
 
diff --git a/tests/unit/renderer/settings.store.test.ts b/tests/unit/renderer/settings.store.test.ts
index ed382ff93..34dbb0ee8 100644
--- a/tests/unit/renderer/settings.store.test.ts
+++ b/tests/unit/renderer/settings.store.test.ts
@@ -1,4 +1,4 @@
-import { beforeEach, expect, it, vi } from 'vitest'
+import { beforeEach, describe, expect, it, vi } from 'vitest'
 import type { AppSettings } from '../../../src/shared/ipc/schemas'
 import { guardedDescribe } from '../../utils/guard'
 
@@ -118,3 +118,98 @@ guardedDescribe('SR-SET-02', 'settings.store —— 载入与保存', () => {
     expect(useStore.getState().saving).toBe(false)
   })
 })
+
+// ── F-SV（2026-09-02 settings.save 并发互斥修票，always-active——不经 guardedDescribe）──
+//    病根（AUDIT-C §1.1）：save 间无互斥——saving 仅驱动 UI 不拒并发，
+//    ipcMain.handle 对 async handler 不序列化，并发 save 的 invoke 各自在途；
+//    INV-39「set 必须组装全量」放大此面：save₁ 旧全量迟到落盘整体覆盖 save₂
+//    → 档位回跳。修复=store 层链式全序（INV-03 写方向同族第三变体「同通道
+//    写全序」）：save₂ 排队，save₁ settle 后才发 invoke；链永不断（失败只
+//    上抛各自调用方）；inflight 归零才复位 saving（排队者不闪断）。UI 守卫
+//    （SettingsPage runSave/pickScale 的 if(saving) return）=第一道门防常规
+//    重复，store 链=第二道兜毫秒窗+跨入口。 ──
+describe('F-SV settings.save 链式全序（并发写互斥）', () => {
+  beforeEach(() => {
+    vi.unstubAllGlobals()
+  })
+
+  /** 排空微任务队列：让链式回调充分展开后再做时序断言（轮数冗余无副作用） */
+  async function flush(times = 10): Promise<void> {
+    for (let i = 0; i < times; i += 1) {
+      await Promise.resolve()
+    }
+  }
+
+  it('并发全序：save₁ 挂起中 save₂ 排队——settle 前 save₂ 的 set 不被调，settle 后恰一次；终态=save₂ 值；saving 归零', async () => {
+    let resolveSet1!: (v: SettingsOk) => void
+    let resolveSet2!: (v: SettingsOk) => void
+    const set = vi.fn()
+      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet1 = r }))
+      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet2 = r }))
+    const useStore = await loadStore({ settings: { set } })
+    const pSave1 = useStore.getState().save({ contactEmail: 'one@x.y' })
+    const pSave2 = useStore.getState().save({ contactEmail: 'two@x.y' })
+    await flush()
+    // save₁ 在途：save₂ 已进入但必须排队，不得发出第二个 invoke
+    expect(set).toHaveBeenCalledTimes(1)
+    expect(set).toHaveBeenCalledWith({ contactEmail: 'one@x.y' })
+    resolveSet1({ ok: true, data: { contactEmail: 'one@x.y', theme: 'system' as const, uiScale: 'small' } })
+    await flush()
+    // save₁ settle 后 save₂ 恰补发一次，载荷为 save₂ 自身的补丁
+    expect(set).toHaveBeenCalledTimes(2)
+    expect(set).toHaveBeenNthCalledWith(2, { contactEmail: 'two@x.y' })
+    resolveSet2({ ok: true, data: { contactEmail: 'two@x.y', theme: 'system' as const, uiScale: 'small' } })
+    await Promise.all([pSave1, pSave2])
+    // 落盘序=发出序：终态恒=最后一次意图（save₂ 的值）
+    expect(useStore.getState().settings?.contactEmail).toBe('two@x.y')
+    expect(useStore.getState().saving).toBe(false)
+  })
+
+  it('链不断：save₁ reject 后排队的 save₂ 照常发出并成功，save₁ 错误上抛其调用方', async () => {
+    let rejectSet1!: (e: Error) => void
+    let resolveSet2!: (v: SettingsOk) => void
+    const set = vi.fn()
+      .mockImplementationOnce(() => new Promise<SettingsOk>((_r, rej) => { rejectSet1 = rej }))
+      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet2 = r }))
+    const useStore = await loadStore({ settings: { set } })
+    const pSave1 = useStore.getState().save({ contactEmail: 'one@x.y' })
+    const pSave2 = useStore.getState().save({ contactEmail: 'two@x.y' })
+    await flush()
+    // save₁ 在途（受控悬挂）：save₂ 必须排队不得发出
+    expect(set).toHaveBeenCalledTimes(1)
+    rejectSet1(new Error('写盘失败'))
+    // save₁ 的失败上抛 save₁ 的调用方（动作型契约零变，不吞不串）
+    await expect(pSave1).rejects.toThrow('写盘失败')
+    await flush()
+    // 链未被失败折断：save₂ 照常发出
+    expect(set).toHaveBeenCalledTimes(2)
+    resolveSet2({ ok: true, data: { contactEmail: 'two@x.y', theme: 'system' as const, uiScale: 'small' } })
+    await pSave2
+    expect(useStore.getState().settings?.contactEmail).toBe('two@x.y')
+    expect(useStore.getState().saving).toBe(false)
+  })
+
+  it('saving 连续：save₁ settle 后 save₂ 起跑前不闪 false（订阅帧 false 仅在全部 settle 后出现一次）', async () => {
+    let resolveSet1!: (v: SettingsOk) => void
+    let resolveSet2!: (v: SettingsOk) => void
+    const set = vi.fn()
+      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet1 = r }))
+      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet2 = r }))
+    const useStore = await loadStore({ settings: { set } })
+    const frames: boolean[] = []
+    const unsubscribe = useStore.subscribe((s) => { frames.push(s.saving) })
+    const pSave1 = useStore.getState().save({ contactEmail: 'one@x.y' })
+    const pSave2 = useStore.getState().save({ contactEmail: 'two@x.y' })
+    await flush()
+    resolveSet1({ ok: true, data: { contactEmail: 'one@x.y', theme: 'system' as const, uiScale: 'small' } })
+    await flush()
+    resolveSet2({ ok: true, data: { contactEmail: 'two@x.y', theme: 'system' as const, uiScale: 'small' } })
+    await Promise.all([pSave1, pSave2])
+    unsubscribe()
+    // 首帧即 true（save 进入立即置位）；false 仅出现在末尾一次（中途闪断=守卫窗）
+    expect(frames[0]).toBe(true)
+    expect(frames.indexOf(false)).toBe(frames.length - 1)
+    expect(frames.lastIndexOf(false)).toBe(frames.length - 1)
+    expect(useStore.getState().saving).toBe(false)
+  })
+})

```

## 输出纪律（必读）

先统计行「B:N/W:N/N:N+总评一句」；逐条展开引证据（文件/行/摘录）；末行放行判定（放行/回炉+回炉点）；200 行内；你看不见仓库——结论只能来自本材料包；不确定写存疑。
