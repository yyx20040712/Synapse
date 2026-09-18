# F-LAYER-01 实现报告（b24）——settings 下沉 services + L1 锁线

> 实现者=ops-executor（GLM5.3flash $max）；简报=同目录 b24-layer01-impl-brief.md。
> 基线锚=b24-verify-baseline.log（主控亲跑 verify EXIT=0：open 8/locks 372
> 〔HEAD 口径；工作树含主控 b24-claim 登记=373〕/170 文件 1744 用例/
> 指纹门 187·1789·5411·skip15）。禁 commit（简报令）——全部改动在工作树，
> 主控收口提交。

## 一、实现面逐项

### 1. service 真身（src/main/services/settings.service.ts，骨架→真实现）

- 业务原样下沉（零行为迁移）：readSettings（readFile+zod safeParse+任一
  环节失败回退 DEFAULTS）/ get（settings===DEFAULTS 时尽力写回，失败不阻断
  返回）/ set（atomicWriteFile 原子写+返回 req）/ diagNetwork
  （Promise.all 对 ALLOWED_REMOTE_HOSTS 并发 deps.ping）——与原
  ipc/settings.ts 实现逐行同构，仅 import 路径随目录深度调整
  （../../shared/* 两文件同深零变化；atomic-write 改 './shared/atomic-write'）。
- 接口层照票面：`createSettingsService(deps: { userDataDir: string;
  ping: PingFn }): Pick<ApiHandlers['settings'], 'get' | 'set' | 'diagNetwork'>`
  （PingFn 类型别名=票面明示允许项）。
- 架构层：import 面=node:fs/promises、node:path、shared/ipc/schemas、
  shared/constants、services/shared/atomic-write、shared/ipc/api-surface
  （type）——票面白名单六项全守，零 electron、零 ipc 上探
  （check-quality 分层方向检查绿）。
- 头注五层规约重写：保留 [F-LAYER-01] 票号引用+裁决书指针
  （docs/design/2026-09-18_complexity-governance-ruling.md 裁决 6/§3 梯队四
  /§4 L1）+方案 B（不挂 ServiceBundle，构造点=ipc 工厂）+测试指针
  （tests/unit/ipc/settings.test.ts 受锁零改）。骨架旧头注的
  `import 'electron'` 注释字样随重写消失（grep 实证见 §三）。
- 方案 B 落实：services/index.ts 零触碰（grep 确认其本无 settings 引用），
  ServiceBundle/受锁桩工厂 tests/utils/ipc-deps.ts 零触碰。

### 2. ipc 薄化（src/main/ipc/settings.ts，83→36 行）

- createSettingsIpc(deps: IpcDeps): ApiHandlers['settings']——内部构造
  createSettingsService({ userDataDir: deps.userDataDir, ping: deps.ping })
  后返回三透传 handler；handler 体=纯委托箭头（get/set/diagNetwork 各一行），
  零逻辑。
- import 面收敛至票面三项：IpcDeps（type）+ApiHandlers（type）+
  services/settings.service。node:fs/node:path/schemas/constants/atomic-write
  全部移出 ipc 层。
- 头注五层规约同步重写（[SR-IPC-08][F-LAYER-01] 双票号+裁决书指针+受锁
  测试指针；顺带修正旧头注测试路径笔误 tests/unit/ipc/ipc/→tests/unit/ipc/）。
- 唯一消费方 src/main/ipc/index.ts:17/:31 签名未变零触碰。

### 3. eslint L1 锁线（eslint.config.js services 块 :162-177，受锁单链）

- 实勘勘正确认（G4 先例口径引用）：shared 块（:136 group）与 db 块
  （:154 group 末）已含 'electron' 禁令，唯 services 块 group 无——本票
  落线=services 块 group 补 'electron' 一处，message 补 L1 语境句
  「禁依赖 electron——core 可抽包（裁决书 §4 L1，F-LAYER-01）」。三域闭合。
- 受锁单链全走：locks:unlock（UNLOCK_EXIT=0，373 文件）→改（group+message
  各一处，另加两行语境注释）→locks:generate（GEN_EXIT=0，373 条）→
  locks:apply（APPLY_EXIT=0，373 条重锁）→lint 复绿（EXIT=0）。全退出码
  物理在档 b24-layer01-eslint-lock.log。
- 改前实证：三域 `grep -rn "from 'electron'"` EXIT=1（零真命中；唯一
  字面命中=骨架注释，随头注重写消失）；改后 `grep -rn "'electron'"` 三域
  EXIT=1 零命中（新头注用无引号措辞「禁依赖 electron」）。

## 二、计数实测（脚本实测，禁印象）

- wc -l：src/main/services/settings.service.ts=100 行；
  src/main/ipc/settings.ts=36 行（原 83 行）。
- git diff --stat（本票三文件）：
  `eslint.config.js | 6 ±`（+4/−2）、`src/main/ipc/settings.ts | 79 ±`
  （净 −47）、`src/main/services/settings.service.ts | 109 ±`（净 +87，
  骨架 13 行→100 行）；三文件合计 +118/−76。
- 工作树另挂起：locks/manifest.json（本票 eslint.config.js sha256 更新+
  主控 b24-claim.mjs 登记共存）、docs/handoff/relay.md 与
  docs/reports/2026-09-18_time-chain-prestudy.md 修改态、b24-heartbeat.mjs
  ——均主控会话产物，非本实现者处置面（见 §四 观察①）。

## 三、验证证据（命令+退出码+关键输出，log 物理在档）

| # | 命令 | 退出码 | log |
|---|------|--------|-----|
| 1 | `npx vitest run tests/unit/ipc/settings.test.ts`（下沉毕首跑） | EXIT=0，6/6 passed | b24-layer01-t1-targeted.log |
| 2 | `npm run locks:unlock` / `locks:generate` / `locks:apply` | UNLOCK=0 / GEN=0 / APPLY=0（373） | b24-layer01-eslint-lock.log |
| 3 | `npm run lint`（L1 线落线后） | EXIT=0 | b24-layer01-lint-green.log |
| 4 | M1 变异：service 顶部加 `import { app } from 'electron'` → `npm run lint` | MUTATED_LINT_EXIT=**1**（no-restricted-imports，消息含「禁依赖 electron——core 可抽包（裁决书 §4 L1，F-LAYER-01）」） | b24-layer01-m1.log |
| 5 | M1 还原链：cp 还原→diff（空）→`npm run lint` | RESTORE_DIFF_EXIT=0 / RESTORED_LINT_EXIT=0 | b24-layer01-m1.log |
| 6 | M2 变异：service DEFAULTS theme 'system'→'dark' → 定向 vitest | MUTATED_TEST_EXIT=**1**（2 failed/4 passed——「get 无文件默认值」+「损坏回退默认」两用例红=受锁测试穿透薄层锁住 service 业务） | b24-layer01-m2.log |
| 7 | M2 还原链：cp 还原→diff（空）→定向 vitest | RESTORE_DIFF_EXIT=0 / RESTORED_TEST_EXIT=0（6/6） | b24-layer01-m2.log |
| 8 | `npm run verify`（Node 24=Volta PATH 前缀） | **VERIFY_EXIT=0** | b24-layer01-verify.log |

verify 全门关键输出（log 行号锚）：
- quality:check 通过（:18 无占位标记/无乱码/无跨域引用/无同值双常量新增）
- test-surface 指纹门（:27-29）：files 187/187 · cases 1789/1789 ·
  assertions 5411/5411 · skipSites 15/15——**与基线锚全同零漂移**
- tickets:check（:39）+ locks:check（:48，373 一致）+ lint + typecheck 绿
- test（:3810-3811）：Test Files 170 passed (170) · Tests 1744 passed (1744)
- build（:3828/:3834/:3847-3849）：renderer 产物**同名同尺寸**
  index-D3egZtl2.js 1,392.72 kB + index-BfpEygSE.css 52.49 kB（本票只动
  main 侧，renderer 输入零变——与 G9 档同名同尺寸一致）；main 产物
  out/main/index.js 181.89 kB（main 侧重构预期态，名称稳定哈希口径不适用，
  如实记录不禁恒同）；preload out/preload/index.cjs 137.96 kB；另
  pdf.worker.min-yatZIOMy.mjs 1,375.84 kB。

## 四、自裁申报与观察

自裁申报（偏离简报处，逐条）：
1. eslint services 块除 group+message 两处票面改动外，另加**两行语境注释**
   （「[F-LAYER-01] L1 锁线……三域闭合」）——本文件各块均有语境注释惯例，
   为对齐惯例的最小增面，语义零影响；如主控认定超面可删。
2. ipc/settings.ts 头注重写时**顺带修正旧头注测试路径笔误**
   （tests/unit/ipc/ipc/→tests/unit/ipc/）——注释级修正，零代码面。
3. 其余零偏离：方案 B/services/index.ts 零触碰/tests/** 零触碰/
   registry 零触碰/bootstrap 零触碰/禁 commit 全守；探针纪律全守
   （变异备份置 ~/.zcode/b24-mut/ 用毕即删——目录已确认不存在；零散件
   .bakdiff 中途产生即时清除；无自产 .mjs）。

观察（非本岗处置面，呈主控知悉）：
① 并行主控会话产物在场：docs/handoff/relay.md、
docs/reports/2026-09-18_time-chain-prestudy.md 修改态+未跟踪
b24-heartbeat.mjs（首查 git status 后新现）。**b24-heartbeat.mjs 属
scripts/**/*.mjs 受锁自动覆盖面——其生产者须按「写毕即时
locks:generate+apply」登记，否则下次 locks:check/verify 红**；本实现者
末次 locks:apply 后该件若未登记，收口前需主控补链。
② locks/manifest.json 本票改动与主控 b24-claim.mjs 登记共存于同一未提交
diff（解锁时点 manifest=373 条含 b24-claim），收口提交时两源合一属预期。
