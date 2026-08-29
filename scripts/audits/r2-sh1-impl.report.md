# R2-SH1 实现报告——应用重命名+userData 数据迁移（三屋·实现者屋）

> 工单：R2-SH1（owner: strong / status: open——归主控收口翻状态）
> 实现者自报：模型 GLM-5.3（builtin:bigmodel-coding-plan），思考等级=默认（standard，思考开启）
> 基线锚：HEAD=6d1077d；起点 verify=106 文件 883 用例/locks 165/e2e 26

## 0. 开工记录（技能清点+配置自查——AGENTS 会话纪律）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| test-driven-development | 用（已加载） | 票面 TDD 红→绿→变异红证强制 |
| verification-before-completion | 用（收口前加载） | verify 真退出码+证据先行 |
| systematic-debugging | 不用 | 本单无深调试面（首红一次到位）；若卡点即补加载 |
| javascript/e2e-testing-patterns | 不用 | repo 自有成熟测试范式（workspace.test 先例），遵循先例成本更低 |
| receiving/requesting-code-review | 不用 | 门一/门二对抗审归独立子代理，非实现屋职责 |
| subagent-driven-development | 不用 | 实现者屋无再派发权限 |

配置自查：GLM-5.3 默认思考等级（开启），与派单要求一致；未派发子代理。
数据安全红线遵守：全程未触碰真实 %APPDATA%（单测用 tmp 目录；e2e 用
SYNAPSE_USER_DATA 隔离）。dev 模式冒烟未做（预裁⑥可选项——e2e smoke 已验收）。

## 1. 行为层（交付面）

- **重命名**：package.json `name:"synapse"` / `productName:"Synapse"`；
  main-window.ts 窗口 title、App.tsx 品牌行+注释、renderer/index.html `<title>`
  （超票面发现，见 §6-W2）均改「Synapse」；受锁 smoke.spec:22 getByText 断言+
  app-shell.test it 名/断言/头注同步（「在侧栏内」语义保持，零结构改动）。
- **迁移分支矩阵**（migrate-user-data.ts，与票面 §1.2 逐格对齐）：
  - 新路径在（含首迁中断残留）→ 跳过：零改动旧目录（天然备份）、零 setPath、
    info 一行——幂等（二启命中）；
  - 旧在新无 → `renameSync` 整体迁移（同卷原子，无半迁移态）+ 显式
    `setPath('userData', 新路径)`（Electron 启动期已缓存旧派生值，不 setPath=
    指向已不存在的旧目录）+ info 中文一行；
  - 皆无 → 全新安装语义：零动作（现行为保持）；
  - rename 抛错（占用/权限）→ 不 fallback 复制、不动旧目录：`setPath` 回落旧
    路径继续运行（数据安全优先于重命名完成）+ warn 中文留痕。
- **触发条件**：bootstrap 内 `SYNAPSE_USER_DATA` override 分支的 else 支（override
  时跳过——e2e/取证零影响）；路径自 `app.getPath('appData')` 派生，不硬编码
  %APPDATA%；判定以路径存在性为准（existsSync，不比对内容）。
- 调用点在 ensureWorkspaceLayout 之前（课题布局消费 userData 根——票面 §3）。

## 2. 接口层

- 新模块导出：`migrateLegacyUserData(app, deps?)`——`UserDataPaths`（Electron
  App 路径子集结构接口：getPath('appData'|'userData')/setPath('userData',…)，
  App 天然满足，tsc 双 project 已验证）+`MigrateDeps`（exists/rename 注入面，
  默认真 node:fs）。
- `LEGACY_DIR_NAME`/`NEW_DIR_NAME` 常量驻模块内（旧目录名=f1 取证器实证的
  productName 派生目录；新名=package.json productName 单源语义）。
- 日志：info「已迁移用户数据目录：旧→新」/「已就位，跳过迁移」；warn「迁移
  失败，沿用旧路径继续运行」（均中文+`[bootstrap]` 前缀，票面 §2 口径）。

## 3. 架构层

- **独立文件 `src/main/migrate-user-data.ts`**（票面 §2「实现者定」裁量）：bootstrap.ts
  运行时 import electron 全家桶（BrowserWindow/Menu/dialog/net/protocol/screen/
  session/shell），node 环境 vitest 无法加载——独立文件与 workspace-layout.ts
  同级同性质（main 根启动最早段纯 fs 件）。只 import node:fs/node:path；不触
  db、不触 electron（零 electron 运行时与类型依赖——路径子集自持）。
- bootstrap 接线=override else 支一行调用+头注顺序行更新；分层单向未破坏
  （main 根装配方，非 services 层）。
- 零新依赖；bootstrap 224 行（≤500 限）；新模块 95 行。
- 幂等形态语义参照 WS1 先例（workspace.fs：存在性判定+原子 rename+断点安全）
  未引代码。

## 4. 生命周期层

- 受锁改写三件：`src/shared/constants.ts`（DEFAULT_CONTACT_EMAIL 域名同步——
  §6-W3）、`tests/e2e/smoke.spec.ts`、`tests/unit/renderer/app-shell.test.tsx`
  （unlock→批内改→generate→apply 全流程，manifest 165→166=+新测试）。
- 新测试 `tests/unit/main/migrate-user-data.test.ts`（目录新建）5 it 分支矩阵
  ①迁移②跳过③全新④回落（红线：旧数据零损伤+显式 setPath 旧路径）⑤集成锚
  （迁移后 ensureWorkspaceLayout 以新路径消费——遗留库随迁入 default 课题）；
  always-active（不经 guardedDescribe）；真 tmp 目录+真 rename；fake app 结构
  注入（含 setPathCalls 记录——「显式 setPath」可断言）；旧目录名字面量逐处
  硬写=契约钉死（防常量被改后迁移静默失效）。
- 兼容：e2e 全套 SYNAPSE_USER_DATA override 面零影响（smoke 4 passed 实测；
  其余 spec 预判零影响归主控收口全量跑）；真机首启迁移/二启幂等验证归主控
  收口段（票面 §4 明文）。

## 5. 文化层（证据链）

- **TDD 首红**：`scripts/audits/r2-sh1-firstraw.log`——模块缺失致套件红（exit=1，
  失败原因=feature missing 正确形态）；GREEN 后 5/5 过。
- **变异红证 ≥2**（cp 备份法，diff 确认空后复绿 5/5）：
  - `r2-sh1-mutation-1.log`：删 rename 调用 → ①④⑤ 红（3 failed）；
  - `r2-sh1-mutation-2.log`：删回落动作（catch 体 setPath+warn，语法保持合法）
    → ④ 精准红（1 failed/4 passed）。（首试整段 catch 删除=语法红（no tests），
    降级为断言级变异重做——留痕同档）
- **全量回归**：`npm run test`=107 文件 **888 用例全绿**（=预测 883+5 精确命中）；
  lint+typecheck 绿；build 绿（`r2-sh1-build.log`）；e2e smoke 4 passed
  （getByText('Synapse') 无 strict 冲突——预裁⑤ title 属性不入 DOM 文本实证）。
- **verify 真退出码**：`npm run verify` exit=**0** 落盘 `r2-sh1-verify.log`
  （quality+tickets+locks+lint+typecheck+test+build 全过，与 CI 同口径）。
- **locks**：165→**166**（+tests/unit/main/migrate-user-data.test.ts；constants/
  smoke/app-shell 三 hash 更新；generate→apply 后 manifest 与工作区同步）。
- **diff 范围**：9 文件+2 新文件（见 §6）；`git diff --stat` 无蔓延——
  `tickets/registry.ts` 的 M 为主控建单既有未提交内容（R2-SH1 建单+R2-LG12
  微调），实现者未触碰（禁令面干净）。
- 中文 UTF-8；npm run test 正规入口（曾误用裸 vitest 致 ABI 状态红 131 例——
  即刻定位为 better-sqlite3 处 Electron ABI，换正规入口后全绿，无残留）。
- 成本账本：实现者屋单会话，约 0.4M token/约 25 分钟（首红 19:23→verify 落盘）。

## 6. 自裁申报（B/W 清单——超票面决定+遗留移交）

**B（BLOCKED）=0。W（WARN/自裁申报）=5：**

- **W1【grep 验收口径结构性张力——需门审/主控裁决】**预裁④「grep 零命中」与
  票面 §1.2 迁移规约互斥：迁移判定/搬移必须持有旧目录名字面量（模糊匹配
  用户目录更危险，票面明文旧路径=精确名）。处置=字面量最小化到纯功能面
  **6 处**（src/main/migrate-user-data.ts:54 常量 1 处+新测试契约钉死 5 处），
  注释面全部改写已清零（票面「注释一并」满足）。若主控要求字面清零只能
  拼串混淆——工程上更差，故未做，留裁决。
- **W2【超票面消费位×1】**`src/renderer/index.html:8` `<title>Synapse Remake</title>`
  ——票面 4 消费位清单未列，但 grep 清零验收（预裁④）强制覆盖；改为
  「Synapse」（与 main-window title 同值，页面加载后窗口标题一致）。
- **W3【受锁 shared 改动×1】**`src/shared/constants.ts:26`
  DEFAULT_CONTACT_EMAIL=`'synapse-remake-user@example.com'` 含旧名——grep 清零
  验收强制；改 `'synapse-user@example.com'`（消费面 bootstrap 回落值+settings
  DEFAULTS，无测试断言精确值，行为面=礼貌池标识字符串微变，票面未列——
  已走 unlock→改→generate→apply，**提交需 [locked-change] 尾注**）。
- **W4【票外受锁脚本陈旧引用×2——移交主控】**`scripts/installer-smoke.mjs:48-50`
  （安装器产物名 Reg 键/EXE 名——票面 §1.3 明文票外「installer-smoke.mjs 仅
  脚本」）与 `scripts/local-state.mjs:38`（硬编码 join(appData,'Synapse Remake')
  ——真机迁移后该取证器将查旧路径；受锁 .mjs，改需 [locked-change]，建议随
  主控收口段处置）。
- **W5【npm banner/产物名波及提示】**package.json name/productName 改后，
  npm script banner 已显示 synapse@0.1.0；electron-builder 产物名将变
  Synapse-0.1.0-setup.exe（dist/ 旧 Synapse-Remake-*.exe 为历史构建残留，
  非源面，未动）。

**主控收口段待办移交**（票面明文归主控）：registry 翻状态；[locked-change]
提交（manifest+constants+smoke+app-shell 四受锁面）；真机迁移验证（真实库
副本取证器：旧目录造→首启→断言新位数据在+二启幂等）；e2e 全量 26 复跑；
W4 两脚本陈旧引用处置。

## 附：证据文件清单（均在 scripts/audits/）

r2-sh1-brief.md（票面）/ r2-sh1-firstraw.log / r2-sh1-mutation-1.log /
r2-sh1-mutation-2.log / r2-sh1-build.log / r2-sh1-verify.log（exit=0）/
本报告。新源文件：src/main/migrate-user-data.ts、tests/unit/main/
migrate-user-data.test.ts。
