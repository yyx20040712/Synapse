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
