# F-REQFP-01 设计书 v2.1（终裁定稿）——指纹门 Req 形状覆盖扩展

> 状态：**设计先行定稿（待实施）**。裁决链=拟定者 v1（kimi-third 座）→ ops-auditor
> 对抗审核 round 1（B1/W8/N11 返工）→ 主控终裁 20 条回炉 → 拟定者 v2 →
> ops-auditor 增量复审 round 2（B0/W3/N8 有条件放行+20/20 吸收）→ 主控终裁
> 三 W 落定（§终裁记）＝本档 v2.1。runId=20261016-dragremount01（设计链账目）。
> 票面=tickets/registry.ts F-REQFP-01（用户裁决 2026-10-09 立票）。

## 一、问题陈述与目标非目标

### 1.1 问题（事实单源=票面+交接书 v169 §2-R5/§3-5）

指纹门 C 面=用例标题+expect 规范化文本+guardedDescribe 工单号+skip 标记
（多重集 ⊇ 判定），扫描域 tests/**；src/shared/ipc/api-surface.ts 的 81 通道
Req/Res zod schema 无逐通道形状 golden 对账。U4 实证：tags/list Req 由
`z.object({}).strict()`（void 形态）变更为 folderId 形状，指纹计数恒等
（303·2943·9609），漂移由门二人审拦截。既有 contract 测试锁「是 zod
schema/strict 拒未知/个别值域」与通道计数 pin，形状指纹缺位。用户裁决
（2026-10-09）：集合语义类方案否决删除；时机=数据面完成后（已到窗）。

### 1.2 目标

- G1：81 通道 Req（O-2 裁同批则含 Res）形状=**字段集+字段类型签名+内建约束
  +refine 存在性**机检覆盖，漂移即红，红消息含通道名+字段路径；
- G2：有意契约演进必携 reason+rulingLink 台账登记，差集−台账覆盖对账机检
  闭环（拒写级）；
- G3：并入 verify/CI 两侧同一入口；零新增依赖；Node 24；
- G4：日常实现层重构零红；契约面演进红=裁决事件（特性语义入档）；
- G5：首装=现状 81 通道快照+门二独立复核审计；再生成沿「滞后批累积清偿」
  实践（**该窗口仅指 test-surface baseline 面——本门金件/台账恒同批零滞后**，
  终裁 N-08 钉死）。

### 1.3 非目标

不做 zod 全语义理解（refine 谓词等价、parse 行为全覆盖）；不做消费侧一致性
（tsc 既有职责）；不做 preload/window.api 方法面指纹；不做通道集增删唯一锚
（计数 pin 既有——边界见 §七）；不改动指纹门既有 C 面抽取/判定语义；不做
格式迁移机制（格式演进走 FORMAT_VERSION 全量再生成事件）。

## 二、候选方案（三候选全展开）

### 候选① 静态 TS 分析·并入现有 baseline（票面候选一）

机制：scripts/test-surface/ 新增 lib，import 'typescript' 解析 api-surface.ts
AST，定位 API_SURFACE，对每通道 Req 表达式跑迷你 zod-DSL 解释器
（object/strict/string/min/enum/union/optional/default+const 单跳解析——沿
it.each 先例）；描述符写入 baseline 新段（schema v1→v2）。落点=
check-test-surface.mjs（改）+req-shape.mjs（新，诞生即锁）+baseline 全量
再生成+豁免扩 channel 键型；verify/CI 零接线。失败语义=
SHAPE_CHANGED/CHANNEL_ADDED/CHANNEL_REMOVED/SCHEMA_UNRESOLVABLE（保守红），
exit 码域复用。误报面：空白/字段重排/常量更名零红；**写法形态变更**（helper
抽提、跨文件 import、spread）即 UNRESOLVABLE 红——覆盖度外写法全是红源。
风险：解释器语义漂移最大；baseline v1→v2 强制**全域再生成事件**（366 文件
全量重快照+审计）——为 81 条形状付全局再基线风险。

### 候选② 静态分析·独立形状清单+独立对账（票面候选二）

机制：同①解释器核心；金件独立 scripts/req-shape.baseline.json；新门
check-req-shape.mjs（CLI/exit 自定义）；npm scripts+verify 插段+CI 同步。
落点约 4 新件+package.json+verify 链+ci.yml。失败语义独立 exit 码域。豁免与
再生成：独立台账+双轴对账**复刻第二套**（策略密集件重复代价高于普通逻辑）。
误报面同①；隔离收益=不触 test-surface 门与 baseline v1。

### 候选③ 运行时 zod 反射·vitest 契约测试+独立金件+演进台账（**推荐**）

机制：新受锁测试 tests/contracts/api-req-shape.test.ts 于 vitest 运行时
import API_SURFACE（api-surface.test.ts 已证同路径可行），walker 读 zod
运行时结构（_def/shape/innerType）产出规范化描述符（§三），与金件深比对。
**Node24 实测口径**（主控探针实证）：纯 node 直跑 .ts 路线不可行——原生
类型剥除半支持+无扩展名导入 ERR_MODULE_NOT_FOUND+自写 loader 估 30-50 行
且属新锁件；③经 vitest 运行时零此成本。组合形态（helper/import/spread/
const 组合）**免建模**（非免疫未知：未枚举 typeName/check kind 首装即抛
保守红）。

数据流：src schema（运行时对象，通道名 keyed 遍历——**注册表域键重组/条目
重排=零红**）→walker→描述符→金件比对；入口=verify/CI 的 test 段（两侧
同含，零新接线）。

落点清单（8 项）：
1. tests/contracts/helpers/req-shape-walk.ts（walker lib，约 130-180 行）
2. tests/contracts/helpers/req-shape-walk.test.ts（稳定性锚+哨兵自检，
   约 80-120 行）
3. tests/contracts/api-req-shape.test.ts（比对+update 模式+覆盖闸，
   约 160-220 行）
4. tests/contracts/api-req-shape-ledger.test.ts（台账 schema+快照等价
   对账，约 50-80 行）
5. tests/contracts/api-req-shape.golden.json（首装=81 通道 req/res 双清单
   ——O-2 若裁 Req 先行则暂只 req）
6. tests/contracts/api-req-shape.changes.json（演进台账，首装空 entries）
7. scripts/check-locks.mjs（显式清单+2 行）+locks/manifest.json 同步
8. package.json scripts（req-shape:baseline）

代码合计约 420-600 行（分项和口径）；各文件 ≤500 行约束满足。

失败语义：vitest 红消息前缀统一 **[req-shape:类别]**——SHAPE_CHANGED
（channel+字段路径 diff）/CHANNEL_ADDED/CHANNEL_REMOVED/GOLDEN_MISSING/
LEDGER_SCHEMA/LEDGER_SNAPSHOT/LEDGER_UNCOVERED/BOOTSTRAP_REQUIRED/
**UNSUPPORTED**（终裁 N-04：保守红独立类别名——未知 typeName/未枚举
check kind）。测试头注载明：「红=契约演进裁决事件，禁盲复跑——先以
req-shape:baseline 读差集」。

豁免与再生成闭环：
- **首装 bootstrap**：金件缺失+台账空=合法首装窗口，update 模式直写 81
  通道快照并打印全量 diff（供门二审计）；金件存在即退化为受闸 update。
  状态组合全枚举（终裁 N-01）：（金件缺、台账非空）=BOOTSTRAP_REQUIRED
  红（疑似金件被删——锁哈希+git 可见性兜底，主控收口审计认领重入面）；
  （金件在、台账文件缺/损）=LEDGER_SCHEMA 硬红。bootstrap 重入风险=锁
  哈希（金件/台账均在 manifest）+git 历史+[locked-change] 复核三层兜底，
  登记于 defense-lifecycle 拦截实绩栏预期面。
- **演进流**：src 改→红→补台账条目 {id:seq 整数, kind:"channel",
  channel, categories∈{SHAPE_CHANGED,CHANNEL_ADDED,CHANNEL_REMOVED},
  reason, rulingLink}→主控收口跑 update（**主控收口专用**：env 标志，CI
  环境拒写硬错；读差集=只读模式不限）→**覆盖闸=差集三类别逐条按通道名
  匹配台账新增条目，缺即拒写 LEDGER_UNCOVERED**；通道改名=删+增两条目→
  写金件+ledgerSnapshot。演进批=src+金件+台账同批 **[locked-change] 单
  尾注**（禁 [test-refactor]——范围闸按尾注键控，带了反触闸）；rulingLink
  沿豁免通道先例（用户裁决链或票面+实录档，主控收口核）。
- **格式升级**（终裁 W-01 强化）：FORMAT_VERSION bump（含 zod 升级表示
  位移、walker 枚举补全）=金件全量再生成+全量审计+**单条**
  kind:"format-upgrade" 台账条目。**放行前置三元组机检**（终裁钉死，防
  单条目绕过 G2）：①实测变更在案——金件内 formatVersion ≠ walker 当前
  FORMAT_VERSION（update 拒绝「条目在而版本未动」的复用形态）；②唯一性
  ——同 formatVersion 值下 format-upgrade 条目恰一条（LEDGER_SCHEMA 红）；
  ③全量审计协议=与首装同款（门二独立复核+仓外 runId 档——终裁 N-06 统一
  协议）。矩阵补 S21（真 bump+单条目=放行）/S22（无 bump 带 format-upgrade
  条目=拒写红）。
- **截断检测**：常态台账测试断言金件 ledgerSnapshot 与 changes.json
  entries id 集**等价**——双向红 LEDGER_SNAPSHOT（演进批内先补条目后跑
  update 的中间红=预期工序态——**终裁 N-02 钉死：该豁免话术仅适用
  entries⊃snapshot 方向（新增待落地）；entries⊂snapshot（截断）恒红禁
  工序态处置**）。
- 台账只增不改（既有条目内容改写/重复 id 不入 id 集等价对账可见面——
  终裁 N-03：实际防线=锁哈希+[locked-change] 复核+diff 人工审，如实登记
  于 defense-lifecycle 该行限制注）；再生成窗口仅指 test-surface baseline
  面，本门金件/台账恒同批（终裁 N-08）。

误报面：walker 消费求值后结构——空白/重排/常量更名/helper 抽提/import
组合/spread/域键重组全零红；红源=形状真实变更+refine 增删（存在性）+zod
大版本升级（FORMAT_VERSION 事件承接——**终裁 N-07 加锚**：U1 锚测试钉死
现役 zod 大版本号断言，zod 升级=锚红=提示走 FORMAT_VERSION 流程，防表示
位移被误入演进流逐通道登记）。

Res 成本声明：Res 同批覆盖使首装金件体量约×2（81 通道 req/res 双清单）；
常态演进成本按通道计不变——单通道演进=一次工具运行+一条台账+一笔
[locked-change] 提交；新增响应字段即一次演进批（量化预期呈用户）。

## 三、形状描述符规范化格式

- 递归 JSON：object={t,policy:strict|strip|passthrough,fields{名→描述符，
  序列化名序排序}}；string/number={t,constraints{min/max/regex source/
  int/finite/format 种类，键排序}}；boolean/null/void/unknown/any/date=
  {t}；literal={t,v}；enum={t:"enum",vals 按 JSON 串排序}（无序语义成立）；
  **union={t:"union",of 保序不排序}**（解析优先级语义）；array={t,of,
  constraints}；tuple/record 同式递归；optional/nullable={t,of}；default=
  {t,of,value JSON 可序列化否则 {unserializable:true}}；
  **refine/superRefine={t:"refined",of}**（存在性锚，无源文本）。
- **未枚举 check kind/修饰子型**（length/multipleOf/positive/startsWith/
  trim/z.coerce/transform/preprocess 等）**一律抛保守红**
  [req-shape:UNSUPPORTED]（同未知 typeName）——首装即暴露；walker 枚举
  补全=FORMAT_VERSION bump（补全改变既有序列化）。
- 金件顶层：{version:1,formatVersion:1,channels:{名:{req,res}},
  ledgerSnapshot:[id…]}——无易变字段；通道键排序。
- void 区分：z.object({}).strict()→{t:"object",policy:"strict",fields:{}}
  ；z.void()→{t:"void"}（异形即红=U4 场景正是目标）。
- 金件存全量描述符非哈希：81 通道体量小，红时字段级 diff 直读。

## 四、对比与推荐

| 维度 | ①静态并入 | ②静态独立 | ③运行时反射（推荐） |
| --- | --- | --- | --- |
| 机制可靠性 | 解释器语义漂移，持续纳税 | 同① | 真实 zod 语义，零解释层；Node24 实测免 loader |
| 组合形态覆盖 | 覆盖度外即保守红 | 同① | 免建模（未枚举面 UNSUPPORTED 兜底） |
| 既有门冲击 | baseline v1→v2 全域再生成 | 零冲击 | 零冲击 |
| 对账机器 | 复用（扩 schema） | 复刻第二套 | 金件比对+台账测试件 |
| verify/CI 接线 | 零（门内扩） | +1 段+CI 步 | 零（test 段两侧同含）+check-locks 两行登记 |
| 误报面 | UNRESOLVABLE 随写法演进 | 同① | refine 存在性+zod 版本事件（通道化承接） |
| 新增代码量 | 约 350-500 行 | 约 400-550 行 | 约 420-600 行 |
| 失败语义 | exit 码+类目 | exit 码+类目 | [req-shape:类别] 消息（test 段） |
| 首装体量 | 全域 366 文件再快照 | 81 通道外科 | 81 通道外科（req/res 双清单） |

**推荐=③**。理由：消除最大技术风险类（解释器漂移——裁决基础设施判定
语义必须零歧义）；组合形态免建模，src 写法演进零摩擦；外科手术首装；
verify/CI 零接线（test 段天然两侧同含）；代价项均有通道化对冲。**后备=①**
（若③暴露 zod 反射硬墙则回退——回退决策权在主控）。

## 五、实施拆单元（三屋节奏，每单元独立 verify 收口）

- **U1 walker 核心**：helpers/req-shape-walk.ts+锚测试。锚定位=**walker
  输出稳定性锚**（语义正确性归 U2 首装审计）；含**哨兵自检测试**（读 walker
  源断言无 `\b(it|test|describe)\s*\(` 文本形态）；**zod 大版本锚**
  （终裁 N-07）；**断言级变异红证矩阵**（每描述符类至少一支：删 object
  分支→object 锚红/constraints 键错置→string 锚红/union 保序破坏→union
  锚红/refined 误带 src→格式锚红）。收口=新件+测试绿。尾注
  [locked-change][test-refactor]。
- **U2 门上线**（两笔提交——**终裁 W-02 配位定稿**）：
  - 笔一 [locked-change][test-refactor]：比对测试+台账测试+golden 首装
    （bootstrap 直写+全量 diff 打印）+changes.json 空件+manifest 测试件
    哈希同步（落点=tests/**+locks/manifest.json，均战役白名单内）；
  - 笔二 [locked-change][dep-change]：check-locks.mjs 显式清单+2 行+
    package.json scripts（req-shape:baseline）+manifest 金件/台账哈希
    同步——**package.json 移本笔**（终裁：dep-change guard 按文件名键控
    任何 package.json 变更〔ci.yml:50 实证〕，scripts 项非依赖变更但文面
    须尾注——笔二恰需 [dep-change]，一注两得；check-locks.mjs 不在战役
    白名单本就不得入笔一）；
  - **首装审计**=门二裁决部独立复核：81 通道全量结构 diff 过目+按类型族
    抽样 ≥20 通道逐字段比对源 schema，证据落仓外 runId 档；
  - S1-S22 变异红证全支（.raw.txt 落仓外）；verify 全链绿。
- **U3 治理回写**：invariants.md 登记「API_SURFACE Req(/Res) 形状指纹覆盖
  +演进必携台账」不变量；docs/defense-lifecycle.md 登记行（退出条件+
  触发器+拦截实绩栏）；architecture §5 ADR 索引/§6 对照回写（无触及如实
  申报）；AGENTS.md 门清单一句；本设计书定稿落 docs/design/（本档即）；
  收口呈报+CI 回执。
- 节奏：U1/U2 各一实现者单元（实现→门一→门二），U3 主控收口随批；兼容
  「一次一到两件」裁决。

## 六、测试策略（变异红证矩阵 S1-S22，随 U2 全支跑）

| # | 变异 | 预期 |
| --- | --- | --- |
| S1 | Req 增字段（U4 复盘形态） | [req-shape:SHAPE_CHANGED] 红含 channel+字段路径 |
| S2 | Req 删字段 | 红 |
| S3 | 内建约束收窄 string→min(1) | 红 |
| S4 | enum 值集增删 | 红 |
| S5 | optional→required | 红 |
| S6 | 字段重排+空白重排 | 绿（零误报锚） |
| S7 | union 成员重排 | 红（保序语义） |
| S8 | enum 成员重排 | 绿（无序语义） |
| S9 | .refine() 增/删 | 红（存在性锚） |
| S10 | 通道新增 | CHANNEL_ADDED 红（计数 pin 同红=已知同向冗余） |
| S11 | 通道删除 | CHANNEL_REMOVED 红 |
| S12 | 通道改名 | REMOVED+ADDED 红，台账两条目覆盖 |
| S13 | Res 形状变更（Req 不动） | SHAPE_CHANGED 红含 res 路径；金件双清单对账 |
| S14 | 注册表域键/条目重排 | 绿（通道名 keyed） |
| S15 | 金件删除/损坏 | GOLDEN_MISSING 硬失败（台账空=BOOTSTRAP_REQUIRED 指引） |
| S16 | 台账条目缺 reason/rulingLink | LEDGER_SCHEMA 红 |
| S17 | 台账截断/多登（snapshot↔entries 不等价） | LEDGER_SNAPSHOT 红 |
| S18 | update 差集未被台账新增条目按通道名覆盖 | LEDGER_UNCOVERED 拒写，金件不变 |
| S19 | 未知 typeName/未枚举 check kind 注入 | [req-shape:UNSUPPORTED] 保守红 |
| S20 | CI 环境触发 update 写模式 | 拒写硬错 |
| S21 | 真 FORMAT_VERSION bump+单条 format-upgrade 条目 | 放行（全量再生成+审计流） |
| S22 | 无版本 bump 带 format-upgrade 条目（复用形态） | 拒写红（放行前置①不满足） |

纪律：还原一律 cp 备份法；先红后绿；新测试 always-active；首装全量 diff
审计入证据；跑毕核对执行数（显式路径过滤防零执行假绿）。

## 七、与既有防线关系（边界声明，防双源）

- **api-surface.test.ts**：保留——schema 类型断言与值域行为归它；**形状指纹
  归新门**。计数 pin 同向冗余暂留（O-3 另案呈裁）。
- **schemas.test.ts**：实体 schema 行为面，正交，不动。
- **preload-surface.test.ts**：renderer 消费面，正交，不动。
- **check-test-surface.mjs 指纹门**：扫描域 tests/** 不变；新测试四件入其
  C 面=新文件绿+delta（下次 baseline 清偿吸收）；双闸正交——指纹门守测试
  文本面，形状门守 src 契约形状面。
- **双台账边界**：C 面豁免台账（test-surface.exemptions.json）=测试文本面
  消减豁免（⊆ 语义，standing waiver）；shape 台账（api-req-shape.changes.
  json）=src 契约演进登记（差集覆盖语义，append-only changelog）。字段同名
  reason/rulingLink 同形可容（Rule of Three 第 2 次保持重复）；校验语义
  各自独立，禁互相引用抵销。
- **tsc typecheck**：守消费一致性（契约与调用方同改则绿——不替代指纹；
  指纹守「演进须裁决」），互补不重叠。

## 八、治理面生命周期（F-GOV-01）

- **退出条件**：(a) API_SURFACE 注册表机制退役（src 契约单源迁移）；
  (b) 更强契约门上线经主控裁决吸收本门——**终裁 W-03 强化判据**（与
  「形状+行为面」声明深度匹配）：退役评审须同时过两锚——①通道集包含
  （金件通道集 ⊆ 新门覆盖集，集合脚本可判）+②**抽样形状等价对账**（随机
  抽样 ≥20 通道，新门形状指纹与本门描述符逐通道等价比对记录在档）——
  仅过①的「壳门」不得援引吸收。
- **评审触发器**（满足其一触发主控评审）：(i) walker 保守红（UNSUPPORTED）
  累计 ≥3 次/年；(ii) FORMAT_VERSION bump ≥2 次/年；(iii) 连续 3 个演进批
  台账条目与真实语义演进不符（噪声登记）；(iv) API_SURFACE 退役/取代事件。
- **登记**：docs/defense-lifecycle.md 随 U3 登记本行（退出条件+触发器+
  拦截实绩栏——bootstrap 重入面与台账内容改写面的兜底防线〔锁哈希+git+
  人工审〕在该行限制注如实登记）；防线撤/并一律主控裁决，实绩栏空≠撤除
  理由。

## 九、开放问题（须主控/用户裁决）

- **O-2 Res 同批覆盖**：主控倾向=同批（对称静默面，walker 同源边际成本≈
  金件体量翻倍+常态成本不变）；**呈用户终裁**（备择 Req 先行=res 键下批
  补入走 format-upgrade 单条登记）。实施不受阻：U1（walker 核心）与 O-2
  无耦合，U2 金件形态待 O-2 落定。
- **O-3 计数 pin 去留**：推荐暂留同向冗余，另案评估退役。
- 已关闭：O-1（内建约束入+refine 存在性）/O-4（tests/contracts/+
  check-locks 显式清单入锁）/O-5（seq 整数）/O-6（FORMAT_VERSION 事件立）。

## 十、不足声明

- zod 大版本号未载——U1 锚测试钉死现役版本（N-07 锚）+分派以现役安装
  版本为准；版本差异入风险登记。
- 81 通道实际组合形态未载——③免建模免疫该未知；未枚举面首装 bootstrap
  即抛 UNSUPPORTED 暴露（兜底语义在档）。
- 「滞后批累积清偿」窗口=仅 test-surface baseline 面（终裁 N-08 钉死）；
  本门金件/台账恒同批。

## 终裁记（主控 2026-10-16，round 2 三 W+N 处置全录）

| 项 | 处置 | 落点 |
| --- | --- | --- |
| W-01 format-upgrade 放行前置 | 采纳=放行三元组机检（版本实测变更/唯一性/审计协议）+S21/S22 矩阵 | §二、§六 |
| W-02 U2 笔一 [dep-change] | 采纳=package.json 移笔二（[locked-change][dep-change]——ci.yml:50 文件名键控实证） | §五-U2 |
| W-03 退出判据深度 | 采纳=双锚（通道集包含+抽样形状等价对账记录） | §八 |
| U-a 白名单配位 | 已核实：tests/ 全放行+package.json 在白名单+check-locks.mjs **不在**（两笔拆分成立） | §五-U2 |
| U-b 落点前缀 | 已核实：全部落 tests/ 下 | §二落点 |
| N-01 bootstrap 组合 | 状态全枚举+重入面三兜底登记 | §二、§八 |
| N-02 工序态话术 | 钉死=仅新增方向可工序态，截断恒红 | §二 |
| N-03 只增不改防线 | 如实登记=锁哈希+[locked-change]+人工审 | §二、§八 |
| N-04 保守红类别 | 定名 [req-shape:UNSUPPORTED] | §二、§三、§六 |
| N-05 format-upgrade 条目 schema | 并入 §二条目族（kind/formatVersion 差值/reason/rulingLink 必填） | §二 |
| N-06 全量审计口径 | 统一=与首装同款协议（门二复核+仓外档） | §二 |
| N-07 zod 联动锚 | U1 锚测试钉死大版本号断言 | §二、§五-U1、§十 |
| N-08 滞后窗口口径 | 钉死=仅 test-surface baseline 面，本门恒同批 | §一-G5、§二、§十 |

**呈用户面（随下场集中呈裁）**：O-2（Res 同批与否——主控推荐同批）；
O-3（计数 pin 退役评估另案——默认暂留）。
