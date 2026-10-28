# ADR-0031 zod 3.25.76 → 4.6.7 安全升级（F-DEP-02）

> 日期：2026-10-28 · 状态：已裁决（用户裁决 A=升级专项批） · 上游：安全通报 GHSA-mrhx-c7xc-m3w5（zod<4.6.6 全线受影响：超大受限集合校验可致内存耗尽；首次暴露=CI run 40625051076 audit 步红，2026-10-28） · 工单正文=tickets/registry.ts F-DEP-02 · 编号说明：0028-0030 已被 F-VISFB-67/F-RECOV-01/F-SNAPCLEAN-01 占用（registry 在案），本批取 0031

## 背景

CI 依赖审计步（npm audit --omit=dev --audit-level=high）因该通报转红，其余关卡全绿，定性=第三方新通报、与本仓变更无关（本地 npm audit 复现同指纹：zod<4.6.6 high，fix=zod@4.6.7）。校验面盘点=renderer IPC 载荷 + 外部 API 响应（crossref/openalex/arxiv）+ 本地持久化文件（settings.json〔settings.service.ts:98,120〕、recovery envelope〔src/shared/recovery/schemas.ts〕、renderer localStorage 三处〔nav-pane-prefs/recoveryEntry/reading-time-outbox-store〕）。实际暴露评估=低（单机本地应用，输入面以自家产物为主）；用户裁决取升级线（A），弃豁免线（B）。

## 决策

1. `package.json` 精确固定版本 `zod: 4.6.7`（沿用全仓精确固定版本惯例；lockfile integrity 钉扎）。
2. 迁移改写最小化，仅两处：`src/main/services/enrich/providers/crossref.ts` 两处 `.default({})` → `.prefault({})`——zod4 `.default()` 语义改为输出侧类型（含必带默认字段的对象不再接受 `{}` 字面量），`.prefault()` 为 zod4 提供的输入侧默认值（语义与 v3 `.default()` 等价：先补 `{}` 再走内层 parse，逐次浅克隆新对象，无共享可变状态）。配套回归锚两例入 tests/unit/services/providers/crossref.test.ts（缺 message→默认形状/null 而非异常；变异红证在档：撤 prefault→恰两例红→还原 7/7 绿）。
3. **接受既有 API 形态原地保留**：`.strict()`（193 处，机检口径 grep 实数；zod4 弃用但仍可用——`catchall: never()` 语义、未知键仍拒绝，仅错误文案变化〔v4「Unrecognized key: x」〕，且 detail 不进 renderer UI）；双参 `z.record(z.K, z.V)`（6 处，v4 兼容）；`z.discriminatedUnion`（6 处——字面 grep `z\.discriminatedUnion(` 计 5 为漏检口径，paper.ts:133 一处 `z` 与 `.discriminatedUnion` 跨行；接受/拒绝行为不变，无效判别值错误码由 invalid_union_discriminator 改 invalid_union）。弃用面在后续触及对应文件时顺带消化。
4. **语义收紧接受在档**：zod4 起 `z.number()` 拒非有限数（Infinity/NaN）、`.int()` 改 safe-int——受影响点=lineage.ts:222/346-347、ipc/schemas.ts ctmX/Y 与 patch x/y、paper.ts impactFactor；方向=正确收紧（坐标/计量面拒 Infinity 是期望行为），service 层有限数守卫保留为纵深防御，src/shared/models/lineage.ts:359-360 受锁注释已随批勘正。
5. 测试面：存量 4206 例在 zod4 下零改动通过（装机后首轮）；双审后新增 2 例 prefault 回归锚（终态 vitest=398 文件/4208 例）；test-surface 基线随批重冻结（28 行纯增；终态 stats=442 文件/4362 例/14762 断言，含 e2e 面口径）。

## JIT/new Function 动态代码路径（安全面披露）

zod4 classic 对象快路径首次同步 parse 时经 `Doc.compile()` 使用 `new Function`（v3 无此路径）。main 进程无 CSP 限制、schema 为静态可信源，不构成阻断；renderer 侧三处运行时 parse 在页面 CSP 下由 zod4 `allowsEval` 探测回退到非 JIT 路径（zod core util 探测+回退在库内）。**jitless 暂不启用**：本地 e2e 全量（真实 CSP）验证回退路径可用（结果随 F-DEP-02 交付注记闭账）；未来 renderer parse 面扩大时再议 `z.config({ jitless: true })`。本项目自有代码的 eval/new Function 禁令（安全禁令段）不因此豁免——该路径属第三方库内部实现，已在此显式登记。已知噪声：探测在 renderer 首次构造对象 schema 时执行一次被吞的 `new Function`，CSP 下产生一条一次性 securitypolicyviolation/console 记录——接受该一次性日志（无功能/安全影响），不因消噪引入 jitless 配置面。

## 后果

- CI 依赖审计恢复绿；供应链高危面消除；U1/U2 两批 CI 回执随本批绿闭账。
- 类型关口径变化由 tsc 双 project 把守（本批全绿）。后续新增 schema 注意：含默认对象的 schema 用 `.prefault` 或给全形状默认值（`.default()` 输出侧语义）；新增非空嵌套默认值须用函数形/prefault（v4 值形 default 仅浅拷贝）。
- 升级 zod 前先跑 `npm run typecheck`+全量测试（本批先例=仅两处类型红即收敛）。

## 备选（各一行否证）

- B=维持 3.25.76+ci.yml audit 豁免登记：否——安全面弱化且豁免需持续维护（用户裁决弃）。
- 升级至 4.6.6（恰好修复版）：否——同窗已有 4.6.7 补丁版；尽调限制如实声明：未复核 4.6.6→4.6.7 间 diff，选版依据=advisory 修复线最新版+lockfile sha512 integrity。
- 3.x 本地 backport（patch-package 自维护补丁）：否——上游无 3.x 修复，长期自维护成本高于一次受控大版本升级。
- `zod/v4` 子路径（3.25.76 内嵌 v4）：否——内嵌 v4 同样 <4.6.6，不解通报。
- zod-mini：否——同一 core 的精简发行，非安全修复线。
