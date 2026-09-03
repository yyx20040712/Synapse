# P7E-06 工单票面——标签多选过滤（五层规约）

> registry：`P7E-06` / file `src/renderer/features/tags/TagFilter.tsx` / area renderer / owner strong / open
> 排程真相源=v34 §2 第 1 项（=ROADMAP §P7-E 内序第 6 位——前五项 P7E-01~05 已毕）。
> 开工记录：本票段技能清点延续本段开场（subagent-driven-development/TDD/
> verification-before-completion/systematic-debugging 已加载；门审外链
> gate-call.py 在位——kimi-backup 主用源/deepseek 64k 档直起纪律生效中）。

## ⓪ 出处（无出处默认不工单化——三链在档）

1. B1 报告 §3（docs/reports/2026-08-23_v2-blueprint-b1.md:47）：预留点清单
   含「（标签多选过滤）」。
2. ROADMAP §P7-E（docs/ROADMAP.md:387-388）：「阅读时长统计 > 标签多选过滤
   > 智能排序 > 其余……源于代码预留点」。
3. TagFilter.tsx:6 代码预留注记：「选中态变化 → props.onFilterChange
   (tagId | null)（v1 单选标签过滤，多选 v2）」——SR-TAG-02 落地时刻意
   收窄的单选形态，本票兑现 v2。

- **价值**：交叉主题检索是文献库标签系统的核心用法——「机器学习 × 水质」
  两标签交集=精准缩小文献面；单选形态下用户只能反复换选，多选=一次组配。
- **依赖**：tags.store/PaperRow 徽标/library load 链全部既有；INV-53 死 id
  清空链既有（多选形态适配）；零新依赖、零新迁移。
- **风险**：①libraryQuerySchema 契约切换（删 tagId 加 tagIds=「方案切换
  =删除旧方案」红线——受锁 models/paper.ts）；②SQL 多 EXISTS 交集的参数
  绑定形态；③INV-53 顺序锚在多选下的语义适配（消失 id 剔除 vs 全清）；
  ④受锁 golden 三处配套（预扫在档，见⑤）。
- **验收**：见 ⑥。

## ① 行为层（态空间表先行）

### 主控 Design 裁决：AND 交集语义+切换删旧字段+chip toggle

- **采**：多选语义=**AND 交集**（选 [A,B] → 文献须同时挂 A 且挂 B——逐选
  聚焦，与单选「缩小面」意图连续）；chip 左键=toggle 进/出选中集（无选中
  集概念性 UI 新增——选中态视觉沿用单选样式扩展）。
- **否决**（OR 并集）：扩大范围与「过滤=缩小」的用户心智相反（要看全部
  水相关文献时用户会想「换一个更宽的标签」而非「多选并集」）；Zotero 等
  先例同为交集语义。
- **否决**（tagId 保留+tagIds 并行双字段）：两套过滤字段并存=两方案并存
  违反切换红线；tagId 单选=tagIds 单元素特例，UI 面完全覆盖，删旧零功能
  损失。受锁配套三处（预扫清单见⑤）。
- **契约**：libraryQuerySchema **删 `tagId: z.string().optional()`**，
  加 `tagIds: z.array(z.string().min(1)).min(1).max(20).optional()`——
  空选集由 UI 层收敛为 undefined（空数组 schema 级拒收=防歧义）；max(20)
  =单查询爆炸上界（EXISTS 每标签一条，20 条=物理上限级防护）。
- **SQL**（papers.queries.ts buildFilters）：`for (const t of q.tagIds ?? [])
  where.push('EXISTS (SELECT 1 FROM paper_tags pt WHERE pt.paper_id = p.id
  AND pt.tag_id = ?)')`——逐标签 EXISTS AND 交集（既有单条形态的循环
  扩展，预编译参数绑定惯例不变；禁 IN+GROUP BY HAVING 形态——聚合查询
  与既有 where 拼接结构不兼容且语义隐蔽）。
- **UI**：
  - TagFilter props：`selectedTagIds: string[]`（替 selectedTagId）+
    `onFilterChange(ids: string[]): void`（空数组=清除全部选中）；
    onMutated 不变。chip 点击=toggle；再点取消（单选取消语义自然延伸）。
  - FilterBar：`selectedTagIds={query.tagIds ?? []}`+
    `onFilterChange={(ids) => onChange({ tagIds: ids.length > 0 ? ids :
    undefined })}`。
- **INV-53 多选适配**：标签变更（改名/合并/删除）涉及消失 id ∈ 选中集 →
  `onFilterChange(remaining)`（**剔除消失 id**，非全清——其余选中项保持
  有效过滤），剔除后空集→undefined→全列表（自然回退）；顺序锚不变
  （先 onFilterChange 后 onMutated）。
- **申报边界**（票面外不修只记）：①chip 计数静态（选中 A 后 B 的
  paperCount 不显示 A∩B 动态值——既有单选同口径）；②选中集无持久化
  （视图切换丢弃，query 生命周期既有）。

### 态空间跨格序列表（T1~T8——验收=逐格测试锚）

| # | 序列 | 期望 |
|---|---|---|
| T1 | 选 A→选 B（甲挂 A+B/乙挂 A） | 选中集 [A,B]；列表=甲（交集） |
| T2 | T1 后取消 A | 选中集 [B]；列表=挂 B 全部（甲乙） |
| T3 | 全部取消 | onFilterChange([])→FilterBar 收敛 undefined→零过滤全列表 |
| T4 | 单选特例（只选 A） | 行为与 v1 单选等价（回归锚——e2e 既有链不破） |
| T5 | 删除标签 X∈选中集 [X,Y] | onFilterChange([Y]) 先于 onMutated（顺序锚+剔除非全清） |
| T6 | 改名 X∈选中集 [X,Y]（id 不变） | 选中集不变（S5 id 稳定——过滤不动） |
| T7 | 合并 X→Z，X∈选中集 [X,Y] | X 消失→onFilterChange([Y])；Z 不自动入选 |
| T8 | tagIds 超 20 | schema 拒收（zod max(20)——IPC 层防线锚） |

## ② 接口层

一契约字段切换（tagId→tagIds）+一 SQL 循环扩展+TagFilter/FilterBar props
形态；无新通道无新迁移；api-surface/schemas.ts 零动（libraryQuery 在
models/paper.ts——预扫确认）。

## ③ 架构层

- 分层不变；TagFilter 仍零 import library.store（onFilterChange/onMutated
  上抛既有路径）；INV-53 顺序锚保持（先清筛选后通知刷新）。
- 受锁面清单（主控预解锁，配套=票面声明最小增量）：models/paper.ts
  （字段切换）+tests/unit/db/repos/papers.repo.test.ts:170-173（单选过滤
  锚→tagIds: ['t-1'] 语义等价迁移）+tests/unit/renderer/tag-lifecycle-
  ui.test.tsx（harness props 形态适配:46——断言语义零弱化）；新测试收口
  入锁。
- e2e tag-lifecycle.spec 零配套预期（单选交互=多选特例路径——spec 断言
  行为面不断言选中态样式；若实现跑红即停手申报，禁改 spec）。

## ④ 生命周期层

- TagFilter.tsx:6 预留注记兑现修订（「v1 单选，多选 v2」→v2 已兑现+票号）。
- 已知边界（票面外不修只记）：①计数静态（见①申报）；②选中集不持久化。

## ⑤ 文化层（测试规约——TDD 红→绿→变异红证）

新测试全 always-active：

| 文件 | 覆盖 |
|---|---|
| tests/unit/db/repos/papers-multi-tag.test.ts（新） | T1 交集（甲挂 A+B 乙挂 A：[A,B]→只甲）+T4 单元素特例+无 tagIds=零过滤（兼容锚）+T8 max(20) zod 拒收 |
| tests/unit/renderer/tag-filter-multi.test.tsx（新） | T1/T2/T3 toggle 序列+T5/T7 INV-53 剔除与顺序锚（先 onFilterChange 后 onMutated）+T6 id 稳定 |
| tests/e2e/tag-filter-multi.spec.ts（新） | 双文献双标签分化→选两标签交集→取消一个→全清回全列表（真实文本断言） |
| papers.repo.test.ts:170 / tag-lifecycle-ui.test.tsx:46（受锁配套） | 主控派发前已预扫：锚语义等价迁移（['t-1'] 单元素/harness 多选形态）——**主控收口配套或实现者经授权面改**（派发令声明） |

- **变异红证 ≥4 组**（cp 备份法）：M1=SQL 交集改 OR（任一 EXISTS 即命中
  ——T1 乙混入红）；M2=INV-53 全清改剔除反（T5 顺序/值红）；M3=FilterBar
  空数组传 [] 不收敛 undefined（T3 零过滤红——空数组 schema 拒收路径）；
  M4=toggle 只进不出（T2 红）。
- 先红纪律：全量套跑口径先红落盘 scripts/audits/p7e-06-red/；证据
  .raw.txt。
- **锁序纪律**：新测试文件诞生即 locks:generate+apply 先于 verify（预期
  265→268：+2 unit+1 e2e spec；受锁配套三件 hash 变更=预期内）。

## ⑥ 验收

- `npm run verify` 全绿（基线 146 文件 1255 用例滚动，新增数实测申报）。
- e2e 全量（38+1 新 spec=39 预期）全绿（tag-lifecycle 既有链不破=T4 回归锚）。
- 门一 Kimi 外链（backup 源）+门二 deepseek 64k 档异构终审。
- grep 无 TODO/FIXME/placeholder；中文 UTF-8 验证。
- registry P7E-06 翻 done（收口主控单写）；INV-53 多选适配语义在 invariants
  注记补一行（收口主控）。
- 提交尾注：受锁件 [locked-change]（models/paper.ts+两测试配套+新测试件）。

## ⑦ 派发与成本申报

- 三屋：实现者=子代理（GLM5.3 统一档——环境无 model 参数欠账披露）；门一
  =Kimi K3（backup 源）；门二=deepseek 64k 档直起。
- 实现者禁 git/registry/locks（locks 仅票面⑤锁序纪律明文的 generate+apply
  一次）；禁新增依赖；超票面决定停下申报（BLOCKED）。
- 主控亲验 verify 真退出码+变异红证抽查+diff 范围核对。
