# P7E-04 实现报告（导出剪贴板——三屋第一屋·实现者子代理）

> 票面：scripts/audits/p7e-04-brief.md ｜ 派发：主控 P7E-04 派发令
> 实现者：GLM5.3 统一档（环境无 model 参数——欠账披露同 P7E-03 先例）
> 日期：2026-09-03 ｜ 禁 git/registry/locks 全程遵守

## 0 技能清点（开工纪律）

| 技能 | 用/不用 | 理由 |
|---|---|---|
| test-driven-development | 用 | 票面 TDD 红→绿→变异红证纪律 |
| verification-before-completion | 用 | 完成前分链自检真退出码 |
| systematic-debugging | 备用未触发 | 全程无不可解释红（红均为预期先红/变异红） |
| javascript-testing-patterns | 用 | 新单测编写参考（桩/mock 形态循既有 crib） |
| e2e-testing-patterns | 用 | 新 e2e spec（P7-A 主进程读回先例/种子配方） |
| subagent-driven-development | 不用 | 实现者屋不派发子代理 |
| code-review-excellence / receiving-code-review | 不用 | 门审归门一/门二，实现者不审查 |
| 其余（frontend-design 等） | 不用 | 本票无视觉面、纯 IPC+hook 逻辑 |

配置自查：node v24.20.0（Volta 项目 pin 生效）；自身=GLM5.3 统一档（派发令档位）。

## 1 实现摘要

- **契约**：单通道 `export/clipboard`——req `{ format: 'bibtex'|'csv', paperIds: string[] }`
  （schema 层 min(1) 空选集拒），res `{ count }`（exportRes 的 count 子集，值位 inline）。
- **main 侧**：handler 先构建（buildBibtex/buildCsv 单源直用零改）后经
  `deps.clipboard.writeText` 写系统剪贴板；bootstrap 装配 `electron.clipboard`；
  无对话框→无 CANCELLED 分支（E7，export_.ts 头注+测试 saveFile 零调用锚双声明）。
- **renderer 拆件**：runAction 分发+enriching/exporting busy 态+toast 收口整体迁
  `usePaperDetailActions.ts`（新 hook，props 面零变，按钮驻面板）；action 联合扩
  `'bibtex-clip' | 'csv-clip'`；按钮区导出组相邻位 +「复制 BibTeX」「复制 CSV」；
  toast 逐字：成功「已复制 N 条题录到剪贴板」/「已复制 N 行列表到剪贴板」、
  失败「复制到剪贴板失败」。
- **生命周期**：export.service.ts:27 原「v2 预留：ipc 加通道」注记兑现修订；
  PaperDetailPanel 头注动作清单同步（+P7E-04 拆件说明）。

## 2 文件清单（括号=行数，全件 ≤500、组件 ≤250）

改动（7）：
- src/shared/ipc/schemas.ts（461，门一 N2 后）—— +clipboardReqSchema（受锁件，主控预解锁授权面）
- src/shared/ipc/api-surface.ts（227）—— export_ 域 +clipboard 通道（同上）
- src/main/ipc/ipc-deps.ts（28）—— +clipboard 可选注入面（见 §6-1 超票面申报）
- src/main/ipc/export_.ts（148）—— +exportClipboard（先构建后写+E7 头注）+handler 挂载
- src/main/bootstrap.ts（258）—— electron import +clipboard；deps 装配 +clipboard
- src/main/services/export_/export.service.ts（233）—— 仅 :27 生命周期注记修订（零行为改动）
- src/renderer/features/library/PaperDetailPanel.tsx（218，门一 N3 后；原 248）—— 拆件瘦身+两按钮+头注票内增量

新建（4）：
- src/renderer/features/library/usePaperDetailActions.ts（112，门一 N1 后）
- tests/unit/ipc/export-clipboard.test.ts（108，always-active，6 用例）
- tests/unit/renderer/paper-detail-clip.test.tsx（194，jsdom，always-active，6 用例）
- tests/e2e/export-clipboard.spec.ts（63，1 综合用例，test.setTimeout(120_000)）

## 3 先红证据（scripts/audits/p7e-04-red/）

- unit-full.raw.txt：`npm run test` → **exit=1**，Test Files 2 failed | 140 passed (142)、
  Tests 6 failed | 1219 passed (1225)——恰两个新 unit 文件红（ipc 6 用例逐个红：
  `ipc.clipboard is not a function`/`clipboardReqSchema` undefined；renderer 文件=
  import usePaperDetailActions 缺失模块级红），既有 1219 全绿零波及。
- e2e-build.raw.txt：未实现态 `npm run build` exit=0（红不来自构建）。
- e2e-targeted.raw.txt：`npx playwright test tests/e2e/export-clipboard.spec.ts` →
  **exit=1**，红因=「复制 BibTeX」按钮 element(s) not found（选中→详情面板链路已通，
  红因正确锚在缺失功能面）。

## 4 绿证据+用例数实测（scripts/audits/p7e-04-green/）

- unit-full.raw.txt：`npm run test` → **exit=0**，**Test Files 142 passed (142)、
  Tests 1231 passed (1231)**。基线 140/1219 → **+2 文件 +12 用例**（ipc 6+renderer 6，
  实测非估算）。
- **拆件正确性判据成立**：受锁 tests/unit/renderer/paper-detail-export.test.tsx
  零改、含在全绿 142 内通过（report/bibtex 入口与 CANCELLED toast 断言原样绿）。
- e2e 定向（scripts/audits/p7e-04-e2e-targeted.raw.txt）：build exit=0 + playwright
  **exit=0**，`1 passed (2.1s)`——「复制 BibTeX」→toast 可见+主进程 clipboard.readText
  含 @+title。e2e 面 36→37（+1）。

## 5 变异红证四组（cp 备份法：cp 备份→变异→定向测→cp 还原→diff 确认空）

| # | 变异 | 定向测 | 红 | 还原 diff |
|---|---|---|---|---|
| M1 | handler 删 format 分支恒走 buildBibtex | export-clipboard.test.ts | exit=1，1 failed——csv 用例红（buildCsv 零调用） | 空（mut-m1.raw.txt） |
| M2 | 换序先写剪贴板（writeText('') 前置）后构建 | 同上 | exit=1，3 failed——含 E5「剪贴板零调用」断言红 | 空（mut-m2.raw.txt） |
| M3 | hook busy 门删（enriching/exporting 双 if-return 摘除） | paper-detail-clip.test.tsx | exit=1，1 failed——E4 零重复 invoke 断言红（变 2 次） | 空（mut-m3.raw.txt） |
| M4 | toast 文案删 N 计数（`已复制 条题录到剪贴板`） | 同上 | exit=1，2 failed——E1 逐字断言红（E4 完成段 toast 同面连带） | 空（mut-m4.raw.txt） |

四组均先证命中再断红；备份经 /tmp，未用 git checkout（未提交实现保护）。

## 6 超票面自裁申报（逐项——请主控/门审查看）

1. **IpcDeps.clipboard 设为可选属性（非必填）+handler 响亮守卫**。卡点：受锁
   tests/utils/ipc-deps.ts（makeIpcDeps 桩工厂，返回类型标注 IpcDeps）在
   tsconfig.node.json include（tests/**）内——设必填即其返回字面量 TS2739 类型红，
   而该文件属禁改面。处置：`clipboard?: { writeText(text: string): void }` 可选+
   注释固化原因；handler 首行 undefined 守卫抛错（装配缺失响亮失败不静默丢写）；
   bootstrap 恒装配→生产路径恒有值；票面「ipc-deps 注入口」设计语义保持。
   该守卫不在 E1~E8 态空间内（配置错误面，非用户态）。
2. **两受锁件编辑时文件系统仍带只读位**（-r--r--r--）：票面称「已预解锁可直接改」
   与实况不符。处置：仅对这两件 chmod u+w 后编辑（授权面内）；未触
   unlock/lock-protected.ps1、check-locks.mjs 与 locks/ 目录；收尾未自 relock
   （按派发令留主控统一收口）。
3. **剪贴板失败 toast 统一「复制到剪贴板失败」**（E5 构建失败与 E6 写失败同面）：
   票面③只给一条失败文案且剪贴板路径无 CANCELLED（E7）——构建/写入失败对用户
   同呈现为动作失败（INV-02 动作型），不透传底层 message。
4. **E4 单测经 hook 直测 harness**（裸 button 不带 loading/disabled）：组件面
   Button loading=disabled 已挡 DOM 双击——不解除 DOM 面则 M3 变异（hook 门删）
   无法红（门被 DOM 挡板遮蔽）。harness 使 hook 门本身成为被测面，M3 红证成立。
5. **e2e 读回带 P7-A 同型竞态防线**（清场标记 `__p7e04_cleared__`+条件重读
   5×200ms+失败信息带末次读值）——循受锁 reader-text.spec.ts 先例，断言锚未放宽。
6. **E7 以「saveFile 零调用」测试锚落地**（票面 E7 为声明性条目——单测锚+头注双声明）。
7. **diff 划界**：`git status` 中 `M tickets/registry.ts` =主控派发预置的 P7E-04
   工单条目（status: 'open'，我读到的初始态即含），本实现者零触碰；
   scripts/audits/ 下大量非 p7e-04 前缀未跟踪文件=既有场次残留，与本票无关。
   本票新增未跟踪面=4 新文件+p7e-04-* 证据件；改动面=上表 7 文件（registry 除外）。
8. **删减面自查**：无删减——票面声明的全部件（schema/通道/deps/bootstrap/hook/
   两按钮/注记修订/三测试文件/四变异）全数落地；未顺手实现票外任何面。

## 7 分链自检（scripts/audits/p7e-04-selfcheck.raw.txt，各链真退出码）

quality:check=0 ｜ tickets:check=0 ｜ lint=0 ｜ typecheck=0 ｜ test=0 ｜ build=0
（verify 全链与 locks:check 按派发令未跑——新测试入锁归主控收口；
预期 locks 256→259：+2 unit+1 e2e spec，见票面 ⑤ 锁序纪律）

## 8 疑虑与披露

- IPC 契约测试为结构推导（无硬编码通道枚举），新通道经 contracts 三方对账自动
  覆盖——typecheck+contracts 测试绿已证。
- e2e 全量（36+1）未跑（派发令口径=定向）；定向 1.7s 一次性绿，无 flake 面。
- 本票时间线无环境事件（无换绑窗破坏/无 Node 版本漂移）。
- M4 变异连带 E4 完成段 toast 红（同文案面），红证效力不受影响（E1 逐字锚在列）。

## 9 门一回炉 R1（Kimi PWW 0B/1W/4N——主控裁决三小修一登记一记档）

四大重点面（拆件/守卫/竞态防线/文案逐字）全过。处置与复跑：

- **N1（修）**：usePaperDetailActions catch 的 isClip 分支在 showToast 前补
  `console.error('[PaperDetailActions] 剪贴板导出失败', e)`——repo 惯例
  `[模块] 中文描述`（AnnotationLayer/App/reader.store 同型实测核对）；「剪贴板
  依赖未装配」类配置缺陷控制台可区分。零新测试面，E1~E8 断言零改。
- **N2（修）**：schemas.ts `export type ClipboardReq` 死导出删除——本仓 grep
  实测零消费（api-surface 消费 schema 值非推断类型）；typecheck 绿复核。
- **N3（修）**：PaperDetailPanel 头注票外 C-06 叙述回退——①状态翻回
  `工单：open`（翻 done 归 C-06 自己的场次）；②架构层「改动面/白名单删条目
  [locked-change]」原段逐字恢复（压缩版删除）。保留票内增量：行为层 P7E-04
  动作清单+拆件说明块。**N3 回退零红**（无断言锚定头注文案——若红将停报
  BLOCKED，未触发）。
- **W1（登记不修）**：IpcDeps.clipboard 可选化还原项已按主控令登记交接书
  （下次合法触碰 tests/utils/ipc-deps.ts 的场次补必填+桩工厂同步）——本票零改动。
- **N4（记档不修）**：busy 门闭包竞态=原组件既有语义保真迁移，非本票引入。

复跑证据（scripts/audits/p7e-04-gate1-r1/）：
- targeted-2files.raw.txt：两定向文件 `npm run test -- <2 文件>` → **exit=0，
  12/12 passed**。
- unit-full.raw.txt：全量 `npm run test` → **exit=0，142 文件/1231 用例不变**
  （主控预期「零用例数变化」兑现）。
- lint-typecheck.raw.txt：lint **exit=0** + typecheck **exit=0**。
- locks/registry/invariants 未动（派发令）。
