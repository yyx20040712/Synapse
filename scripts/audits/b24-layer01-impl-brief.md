# F-LAYER-01 实现者简报（b24）——settings 下沉 services+L1 锁线

> 岗位=实现者（ops-executor，GLM5.3flash $max）；主控=GLM5.3 max。
> 禁 git 提交/禁改 tickets/registry.ts/禁动 tests/**——超票面的一切决定
> 停工申报（写本简报同目录 b24-layer01-impl-report.md §自裁申报）。

## ① 票面（五层规约——骨架 src/main/services/settings.service.ts 头注）

- **行为层**：零行为变更——ipc/settings.ts 现有业务（readSettings 读+zod
  校验+损坏回退默认+get 尽力写回/set 原子写/diagNetwork 并发 ping
  ALLOWED_REMOTE_HOSTS）原样下沉 services/settings.service.ts；ipc 层
  回归薄分发。受锁测试 tests/unit/ipc/settings.test.ts（6 用例锁
  createSettingsIpc 公开行为）**零改照过=验收硬条件**。
- **接口层**：`export function createSettingsService(deps: {
  userDataDir: string; ping: (host: string) => Promise<{ ok: boolean;
  latencyMs: number }> }): Pick<ApiHandlers['settings'], 'get' | 'set' |
  'diagNetwork'>`——返回三方法（行为签名与 ipc 现状一致；service 文件内
  可定义 PingFn 类型别名）。ipc/settings.ts 改为：createSettingsIpc(deps)
  内部构造 service 并返回透传 handlers（handler 体=纯委托，无逻辑）。
- **架构层（下沉方案 B——主控侦察裁定，勿改方案）**：
  - **不挂 ServiceBundle**（services/index.ts 零触碰）：settings 是文件域
    +网络诊断域、无 repos 依赖，与 ServiceBundle（repos 装配桶）语义不合；
    挂桶需改受锁桩工厂 tests/utils/ipc-deps.ts（services 字面量缺键=类型红）
    ——超票面受锁面，故 IpcDeps.userDataDir/ping 现成字段即注入面。
  - service 可 import：node:fs/promises、node:path、shared/constants、
    shared/ipc/schemas、services/shared/atomic-write、shared/ipc/api-surface
    （type）；**禁 import 'electron'**（L1 红线）、禁 import ipc 层任何件
    （services 不得上探 ipc——check-quality 强制）。
  - ipc/settings.ts 保留：IpcDeps/ApiHandlers type import+service import。
- **生命周期层**：bootstrap/装配面零触碰（方案 B 构造点=ipc 工厂内）。
- **文化层**：头注五层规约重写（骨架票号 [F-LAYER-01] 保留引用+裁决书
  docs/design/2026-09-18_complexity-governance-ruling.md 裁决 6/§4 L1 指针）；
  测试=tests/unit/ipc/settings.test.ts（受锁零改，行为面由它全锁）。

## ② L1 锁线（eslint 红线——受锁单链 [locked-change]）

- **实勘勘正（G4 先例口径，报告须引用）**：票面/裁决书 §4 写「三处新红线
  （src/main/services、src/main/db、src/shared）」——实勘 eslint.config.js：
  shared 块（:136 group）与 db 块（:154 group 末）**已含** 'electron' 禁令，
  唯 **services 块（:162-177）group 无 electron**。本票落线=services 块
  group 补 'electron' 一处（message 补 L1 语境——「core 可抽包（裁决书 §4
  L1，F-LAYER-01）」句式）。
- 受锁单链：`npm run locks:unlock` → 改 eslint.config.js services 块 →
  `npm run locks:generate`+`npm run locks:apply`（若 manifest 零变化则
  generate 免，apply 照跑）→ lint 复绿确认。改前 grep 实证三域真 import
  'electron' 零命中（唯一命中=骨架注释字样——AST 不检注释，改写头注后
  自然消失）。
- **红线有效性变异红证（义务）**：lint 绿后，临时在
  src/main/services/settings.service.ts 顶部加一行
  `import { app } from 'electron'`（备份→变异→lint 红 EXIT≠0→还原→
  diff 空→复绿），全退出码变量法落 b24-layer01-m1.log（lint 命令重定向
  落文件，echo EXIT 追加——禁管道吞码）。

## ③ TDD 证据链（零行为重构票=G 系列机制等价）

1. 基线锚：主控已跑 verify EXIT=0（b24-verify-baseline.log：open 8/
   locks 372/170 文件 1744 用例/指纹门 187·1789·5411·skip15）。
2. 实现（service 真身+ipc 薄化+eslint 补线）→ `npm run verify` 全绿
   （Node 24：`export PATH="/c/Program Files/Volta:$PATH"` 前缀跑；
   宿主 node=25 会被 check-quality 版本守卫拦——预期红非实现缺陷）。
3. **行为覆盖等价变异红证 M2**：service 内 DEFAULTS 的 theme 'system'
   改 'dark'（备份→变异→`npx vitest run tests/unit/ipc/settings.test.ts`
   红 EXIT=1→还原 diff 空→复绿 6/6）——证明受锁测试仍穿透薄层锁住业务，
   变量法落 b24-layer01-m2.log。
4. 定向回归：`npx vitest run tests/unit/ipc/settings.test.ts` 6/6 绿。
5. build：`npm run build` 绿——**renderer 产物应同名同尺寸**
   （index-D3egZtl2.js/index-BfpEygSE.css——本票只动 main 侧，renderer
   输入零变）；main 产物哈希会变（main 侧重构预期态，不适用恒等断言，
   报告如实记录三产物名+尺寸即可，禁写「恒等」）。

## ④ 探针/工具件纪律（宪法+b23 教训）

- 自产探针一律 Write 文件后 node 跑（禁 node -e 多行）；写前过 lint 自查
  （无未用变量）；.mjs 写毕即时 locks:generate+apply；临时件一律置仓外
  （~/.zcode/）用毕即删。
- 变异备份 cp 置仓外；还原后 diff 确认空再复绿。
- 一切命令输出重定向落 b24-layer01-*.log（.log 入库时主控收口 add -f——
  你只管落盘）。

## ⑤ 交付物（scripts/audits/）

- b24-layer01-impl-report.md：实现面逐项（service 头注/ipc 改写/eslint
  diff 三段）+计数实测（service/ipc 行数 wc、改写行数 git diff --stat——
  只读 git 命令可用，禁 commit）+M1/M2 变异红证记录+自裁申报段。
- b24-layer01-*.log：verify/定向/变异/build 各退出码物理在档。

## ⑥ 停工申报触发

- verify 无从解释的红（还原本票 diff 宁停勿烂）；
- 发现下沉方案 B 与现实冲突（如 service 需要的逻辑拿不到注入面）；
- 受锁测试 6 用例任一红（=行为漂移，禁改测试迁就）。
