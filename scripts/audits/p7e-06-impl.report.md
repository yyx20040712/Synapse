# P7E-06 实现者报告——标签多选过滤（三屋·实现者子代理）

> 票面 `scripts/audits/p7e-06-brief.md`；派发令=票面执行补充。
> 结论：**DONE**——两项票外申报（e2e spec 配套/registry area 笔误）已由主控配套
> 落地，续跑收口：e2e 双绿（2 passed）+ verify 全链 exit=0（148 文件/1265 用例）。

## 开工记录（技能清点）

- test-driven-development：用（红→绿→变异红证全流程）
- verification-before-completion：用（verify 真退出码 PIPESTATUS 落盘）
- systematic-debugging：用（e2e tag-lifecycle 红的根因定位=快照证据链）
- javascript-testing-patterns / e2e-testing-patterns：不用（票面已给完整测试矩阵与先例池）
- subagent-driven-development / dispatching-parallel-agents：不用（实现者无派发职责）
- git 类：不用（禁 git add/commit；只读 git 用于 diff 范围自查）
- 配置自查：GLM 实现者档（派发令显式定档，无 model 参数欠账——与环境前科一致申报）

## 一、实现摘要

按票面① Design 裁决（AND 交集+切换删旧+chip toggle）完成四件实现：

1. **契约切换**（src/shared/models/paper.ts:72-83）：删 `tagId: z.string().optional()`，
   加 `tagIds: z.array(z.string().min(1)).min(1).max(20).optional()`——空数组 schema 级
   拒收（防歧义），max(20)=单查询爆炸上界。strict() 保留。
2. **SQL 循环 EXISTS**（src/main/db/repos/papers.queries.ts:96-101）：`for (const t of
   q.tagIds ?? [])` 逐标签 push EXISTS + 参数绑定，where 数组 `join(' AND ')`=交集
   （票面①明文形态，未用 IN+GROUP BY）。片段固定进语句缓存惯例不变。
3. **TagFilter 多选**（src/renderer/features/tags/TagFilter.tsx）：props 切换
   `selectedTagIds: string[]` / `onFilterChange(ids: string[])`；chip 点击=toggle
   （active→filter 剔除 / inactive→append）；handleMutated 剔除语义——消失 id∈
   选中集时 `onFilterChange(selectedTagIds.filter(≠disappearedId))`（**剔除非全清**），
   顺序锚不变（先 onFilterChange 后 onMutated）；:6 预留注记兑现修订（v2 已兑现+票号）。
4. **FilterBar 装配**（src/renderer/features/library/FilterBar.tsx:112-116）：
   `selectedTagIds={query.tagIds ?? []}` + `onChange({ tagIds: ids.length > 0 ? ids :
   undefined })`（空选集收敛 undefined）+头注 v1 表述更新。

零新依赖、零新迁移、零新 IPC 通道（api-surface/schemas.ts 零动——预扫确认成立）。

## 二、文件清单

### 实现面（4 件，票面内）

| 文件 | 改动 |
|---|---|
| src/shared/models/paper.ts | tagId→tagIds 契约切换（+4 行净增） |
| src/main/db/repos/papers.queries.ts | buildFilters tagId 单条改 tagIds 循环（6 行） |
| src/renderer/features/tags/TagFilter.tsx | 多选 props/toggle/剔除/头注（45 行差，174 行总量 ≤250 组件红线） |
| src/renderer/features/library/FilterBar.tsx | 装配面 tagIds 收敛（6 行） |

### 新测试（3 件，全部 always-active 裸 describe）

| 文件 | 覆盖 | 行数 |
|---|---|---|
| tests/unit/db/repos/papers-multi-tag.test.ts | T1 交集/T4 单元素特例/无 tagIds 兼容锚/T8 max(20) 双爪/空数组拒收 | 86 |
| tests/unit/renderer/tag-filter-multi.test.tsx | T1/T2/T3 toggle 序列+aria-pressed/T5 剔除+顺序锚/T6 id 稳定/T7 合并剔除+目标不入选/T3 装配收敛（FilterBar） | 261 |
| tests/e2e/tag-filter-multi.spec.ts | 双文献双标签分化→交集→取消一个→全清（三态 .lib-card 计数锚+真实文本断言） | 75 |

### 受锁配套 diff（单列节——授权面=票面⑤预扫清单，[locked-change] 主控收口统一申报）

| 文件 | 改动 | 断言语义说明 |
|---|---|---|
| src/shared/models/paper.ts | 同上（受锁件） | 契约字段切换本体 |
| tests/unit/db/repos/papers.repo.test.ts:170-175 | `searchSummaries({tagId:'t-1'})`→`{tagIds:['t-1']}`；测试名补注记 | **断言值零弱化**：期望命中集 `['p-2']` 不变（语义等价迁移） |
| tests/unit/renderer/tag-lifecycle-ui.test.tsx | harness `render(selectedTagId: string\|null, onFilterChange:(tagId)=>…)`→`render(selectedTagIds: string[], onFilterChange:(ids)=>…)`（:44-59）；8 处调用点 `'t-1'/'t-2'/null`→`['t-1']/['t-2']/[]`；S2/S3 断言 `toHaveBeenCalledWith(null)`→`([])`；:131 注释 tagId→tagIds；头注 :5-6 顺序锚描述同步 | **断言语义零弱化**：S2/S3 顺序锚（invocationCallOrder）与调用次数断言原样保留；null→[] 是「清除死 id 筛选」语义在多选形态下的等价载荷（选中集恰单元素时剔除后=空集） |
| locks/manifest.json | 265→268（+2 unit+1 e2e spec，票面⑤预期值） | locks:generate+apply 产物 |

## 三、红证（先红纪律，scripts/audits/p7e-06-red/）

- `p7e-06-red-targeted.raw.txt`：实现前定向四文件 **9 红 exit=1**——T1 交集、T8
  边界爪（20 放行）、toggle 序列、T5、T7、T3 装配、S2/S3（配套②）、repo tagIds
  锚（配套①）。
- 红阶段天然绿项（等价保持型，如实申报）：T4 单元素/兼容锚/空数组爪（未实现时
  tagIds 被忽略=零过滤，恰好等于期望的全量面）、T6（「零调用」断言未实现时天然
  成立）——其失败能力由 M2/M4 变异与 e2e 回归覆盖。
- T8 双爪说明：21 拒收爪红阶段亦绿（未实现时因 strict() 未知字段抛=巧合通过），
  20 放行爪红——两爪合取保证绿阶段红因必为「长度校验」而非「字段缺席」。

## 四、测试证据

- 绿·定向：四文件 41/41 exit=0。
- 绿·全量 unit（`p7e-06-green-unit.raw.txt`）：**148 文件 / 1265 用例 exit=0**
  （基线 146/1255 +2 文件 +10 用例，与新增 5+5 吻合）。
- 变异红证（cp 备份法，`p7e-06-mutation-m{1..4}.raw.txt`，全部 exit=1+还原 diff 空）：
  - **M1** SQL 交集改 OR（join AND→OR）：T1 红（单挂乙混入）。
  - **M2** INV-53 剔除改全清（filter→[]）：T5/T7 红（期望 ['t-y'] 得 []）。
  - **M3** FilterBar 空数组不收敛（三目→直传）：T3 装配红（onChange 收到 tagIds:[]）。
  - **M4** toggle 只进不出（active 分支→恒 selectedTagIds）：toggle 序列红+T3 装配红。
- e2e 定向（`p7e-06-e2e-targeted.raw.txt`）：**tag-filter-multi.spec 首跑 passed**；
  tag-lifecycle.spec 红（见§六）。

## 五、locks 实录（`p7e-06-locks-apply.raw.txt` + `p7e-06-locks-apply2.raw.txt`）

三新测试文件诞生后 `locks:generate`（268 条 manifest）+`apply`（268 只读）exit=0；
主控 spec 配套（tag-lifecycle.spec）hash 变更后再一轮 generate+apply（268 持平，
spec 原已在锁内）exit=0；verify 内 locks:check 268 一致通过。无 unlock、无手改
manifest。

## 六、申报一：e2e tag-lifecycle.spec 确定性红——票面「零配套预期」预扫误判（已由主控配套落地收口）

- 现象（两次复跑同指纹，`p7e-06-e2e-targeted.raw.txt` + `p7e-06-e2e-taglifecycle-rerun.raw.txt`）：
  :108 `getByText('P7E 乙文献')` 不可见。
- 快照铁证（error-context.md）：标签筛选组 `button "水质监测（1）" [pressed]`、
  列表仅 `P7E 甲文献 水质监测`——选中集=['t-水治']、过滤生效中、剔除链工作正常。
- 根因（**确定性红，非竞态、非实现缺陷**）：spec :62 点选「水治」→:94 点选「水质」
  的序列，v1 单选=**换选**（tagId 替换为 t-水质），v2 多选=**toggle 叠加**（tagIds=
  [t-水治,t-水质] 交集）。随后 :99-102 删除「水质」，按票面① INV-53 多选适配
  （**剔除非全清**）语义→tagIds=['t-水治']→列表=挂「水质监测」的甲 only，乙出局。
  spec :107-109 断言全列表（甲乙丙）锚的是 v1「删除唯一选中→全清」语义。
- 判断：票面③「单选交互=多选特例路径」预扫在**连续点击两个不同 chip** 的序列上
  不成立——单**元素**是特例，单**选换选行为**不是（v1 点击=替换选中，v2 点击=
  加入选中集，两语义在该序列下分歧）。实现按票面 Design（toggle+剔除非全清）是
  正确行为，unit T5/T7+M2 变异红证三重锁定。
- 处置：按派发令③-3「红即停、禁改 spec」——未改 spec 一字；处置权归主控。
- **处置结果（主控配套已落地，续跑收口）**：主控在 spec :94 前插入「点击
  『水质监测（1）』取消」+三行注释（v2 toggle 下点新 chip=叠加非换选——先取消
  改名段选中的「水质监测」恢复「单选水质」换选序列语义，断言面零改），
  [locked-change] 主控配套同批。定向复跑（`p7e-06-e2e-targeted2.raw.txt`）：
  **tag-lifecycle.spec + tag-filter-multi.spec 双绿（2 passed exit=0）**——T4
  回归锚恢复，新 spec 保持绿。

## 七、申报二：verify 票外阻塞——tickets/registry.ts:240 area 类型错（主控已修，verify 全链绿）

- 首跑（`p7e-06-verify.raw.txt` 覆盖前版本）：quality ✓ / tickets:check ✓ /
  locks:check 268 ✓ / lint ✓ → typecheck 红：`tickets/registry.ts(240,69):
  error TS2322: Type '"renderer"' is not assignable to type 'TicketArea'`。
- 根因：主控建单行 `P7E-06 … area: 'renderer'`——TicketArea 枚举无 'renderer'
  （TagFilter 属 'tags-ui'）。该行=工作树中主控建单修改（开工前已存在，git
  status M 亲验），非本票改动。
- **处置结果（主控已修）**：registry.ts:240 `area: 'renderer'`→`'tags-ui'`。
- **续跑 verify 全链（`p7e-06-verify.raw.txt` 终版）**：quality ✓（无占位/无乱码/
  无跨域引用）+ tickets:check ✓（注册表与代码一致）+ locks:check ✓（268 一致，
  spec 配套 hash 变更经 generate+apply 同步，`p7e-06-locks-apply2.raw.txt`）+
  lint ✓ + typecheck ✓ + test ✓（**148 文件/1265 用例**）+ build ✓ →
  **exit=0 全链真退出码落盘**。

## 八、自裁申报

1. **e2e 夹具加丙**：票面⑤ e2e 覆盖描述「双文献双标签分化」——我种了甲乙丙三篇
   （丙无标签）。理由：双文献下「[A] 态列表」与「全清态列表」同为甲乙=断言不可
   区分；丙=全列表对照锚使三态列表（1/2/3 卡）计数可区分。分化主体仍是双文献
   （甲挂 A+B/乙挂 A），与票面描述不冲突（tag-lifecycle.spec 同款丙先例）。
2. **空数组拒收用例**：票面⑤矩阵未单列，但票面①契约声明「空数组 schema 级拒收=
   防歧义」+M3 变异锚=「空数组 schema 拒收路径」——该用例是契约声明的直测，
   属票面内（非新增行为）。
3. **头注注释更新**：TagFilter.tsx 头注（:6 预留注记兑现=票面④明文）+FilterBar.tsx
   头注 v1 表述同步（接缝归责——防两处声明互斥）；tag-lifecycle-ui.test.tsx 头注
   :5-6 顺带同步（票面⑤只明示 :131，头注 S2/S3 描述含 null 表述，不同步=注释与
   断言互斥）。
4. **删减面 diff 自查**：无删减。git diff --stat=8 文件 74+/46-，全部在票面
   （4 实现+2 受锁配套+locks manifest+tickets 建单行[主控]）；未跟踪新增=3 测试
   +p7e-06-red/ 证据目录（审计留存惯例）。
5. 票面①申报边界维持不修：chip 计数静态、选中集不持久化（只记不实现）。

## 九、疑虑

- 无。两项申报（§六/§七）均已由主控配套落地并续跑验证收口（e2e 双绿+verify
  全链 exit=0）。
- e2e 全量（38+1=39 预期）仍归主控收口跑（派发令③-3；两定向 spec 已双绿）。

## 十、成本自述

- 工具调用约 40 次（读件 12+编辑 18+bash 验证 12）。
- 大耗时命令：npm run test 全量 ~60s（两次）；npm run verify ~90s（typecheck 段断）；
  playwright 定向 ~16s×2 + 复跑 ~15s；build ~15s。
- 全部测试/验证命令经 Volta PATH 前缀（node 24.20.0——宿主 25.2.1 jsdom localStorage
  破损规避，AGENTS 环境事实）；退出码一律 PIPESTATUS 取 npm 真值落盘。

## 证据文件索引（scripts/audits/p7e-06-red/）

p7e-06-red-targeted.raw.txt（红 9/exit1）· p7e-06-green-unit.raw.txt（148/1265/exit0）·
p7e-06-mutation-m{1..4}.raw.txt（四变异红证+还原）· p7e-06-locks-apply.raw.txt（268）·
p7e-06-locks-apply2.raw.txt（spec 配套后 268）· p7e-06-e2e-targeted.raw.txt（首跑：
新 spec passed+taglifecycle 红）· p7e-06-e2e-taglifecycle-rerun.raw.txt（复跑同指纹）·
p7e-06-e2e-targeted2.raw.txt（配套后双绿 2 passed/exit0）· p7e-06-verify.raw.txt
（终版全链 exit=0：quality/tickets/locks268/lint/typecheck/test 148-1265/build）
