# P7E-07 工单票面——智能排序（引用数排序，五层规约）

> registry：`P7E-07` / file `src/main/services/library.service.ts` / area service / owner strong / open
> 排程真相源=v35 §2 第 1 项（=ROADMAP §P7-E 内序第 7 位末项——前六项 P7E-01~06 已毕）。
> 开工记录：本票段技能清点延续本会话开场（subagent-driven-development/TDD/
> verification-before-completion/systematic-debugging 已加载；gate-call.py 在位
> ——kimi-backup 主用/deepseek 64k 直起）。

## ⓪ 出处（三链在档）

1. B1 报告 §3（docs/reports/2026-08-23_v2-blueprint-b1.md:42）：
   `library.service.ts:20（智能过滤/引用数排序）`；:105-106「智能排序系代码
   预留点，归 P7-E 不入 P8+」。
2. ROADMAP §P7-E（docs/ROADMAP.md:387-388）：「… > 标签多选过滤 > 智能排序
   > 其余……智能排序源于代码预留点」。
3. library.service.ts:20 代码预留注记：「预留：智能过滤（引用数排序）在 v2
   经新 repo 方法扩展」。

- **价值**：被引数=学术影响力通行代理——「先读高被引」的文献筛选入口；
  与 year/added/title 三既有排序互补，cited_by_count 缓存列（ENR-01）已就绪。
- **依赖**：cited_by_count 列（005 迁移）+ORDER_BY 映射（queries.ts:17）+
  SORT_LABEL（FilterBar:29）+enrich 引用数抓取链全部既有；零新依赖零迁移。
- **风险**：①cited_by_count nullable（未缓存论文 NULL——排序语义须显式）；
  ②受锁 models/paper.ts 枚举扩展（加值=向后兼容，既有夹具零破坏——预扫
  确认测试面零涟漪：SORT_LABEL/ORDER_BY 测试零命中，类型 Record 全键约束
  强制两处补全=零遗漏）；③同键决胜稳定性（分页偏移）。
- **验收**：见 ⑥。

## ① 行为层（态空间表先行）

### 主控 Design 裁决：枚举加值 cited_desc+COALESCE 空值归零+双 Record 类型闭环

- **采**：librarySortSchema 枚举 +`'cited_desc'`（加值向后兼容——既有三值
  调用方零破坏；与 P7E-06「切换删旧」不同形态：排序是**新增维度**非方案
  替换，旧三值全部保留）。
- **SQL**：ORDER_BY +`cited_desc: 'COALESCE(p.cited_by_count, 0) DESC,
  p.rowid DESC'`——**COALESCE 显式归零**（不依赖 SQLite NULL 排序默认——
  未缓存论文与被引 0 同级垫底=「影响力低在后」语义显式化；决胜键 rowid
  同键分页稳定，循三先例）。
- **UI**：SORT_LABEL +`cited_desc: '被引（高到低）'`（FilterBar 下拉自动
  多一项——Object.entries 驱动零改）。
- **service**：零改（sort 经 query 直传 repo）；library.service.ts:20 预留
  注记兑现修订（「预留」→已兑现+票号——照 P7E-05 :20 修订形态）。

### 态空间跨格序列表（S1~S5）

| # | 序列 | 期望 |
|---|---|---|
| S1 | 三论文 cited=5/NULL/12，sort=cited_desc | 顺序=12,5,NULL（NULL 垫底） |
| S2 | S1 + cited 全 NULL | rowid 决胜稳定序（不崩不随机） |
| S3 | sort 缺省（不传） | added_desc 既有默认（兼容锚） |
| S4 | 旧三值各跑一遍 | 行为与改前全等（回归锚） |
| S5 | 分页：同 cited 两论文跨页界 | rowid 决胜不重不漏 |

## ② 接口层

枚举加一值+ORDER_BY/SORT_LABEL 各加一行+预留注记修订；无新通道无新迁移
无 repo 方法变更（:20 预留写「经新 repo 方法」实落=ORDER_BY 映射扩展——
勘误说明进注记）。

## ③ 架构层

- 受锁面（主控预解锁）：models/paper.ts 一件最小增量（枚举加值）；新测试
  收口入锁。Record<LibrarySort,...> 全键约束=FilterBar/queries 两处补全
  的类型强制闭环（typecheck 兜底零遗漏）。
- IPC/契约透传零改（sort 在 libraryQuery 既有字段）。

## ④ 生命周期层

- library.service.ts:20 预留注记兑现修订（含「经新 repo 方法」→「ORDER_BY
  映射扩展」勘误）。

## ⑤ 文化层（TDD 红→绿→变异红证）

新测试：

| 文件 | 覆盖 |
|---|---|
| tests/unit/db/repos/papers-cited-sort.test.ts（新） | S1 NULL 垫底/S2 决胜稳定/S3 缺省兼容/S4 旧三值回归/S5 分页跨界 |

- 变异红证 ≥3 组（cp 备份法）：M1=删 COALESCE（S1 NULL 序变化红——SQLite
  DESC NULL 垫底默认与 COALESCE 同向时 M1 不红则改用 ASC 探测变异：COALESCE
  改 `-cited` 反序——**实现者先实测 NULL 默认序再选真实红的变异**，红证
  不成立即申报换变异点）；M2=枚举值漏加 ORDER_BY（typecheck 红=类型闭环
  变异）；M3=决胜键 rowid 删除（S5 红）。
- 先红纪律：全量口径落 scripts/audits/p7e-07-red/；.raw.txt。
- 锁序：新测试诞生即 generate+apply 先于 verify（预期 268→269）。

## ⑥ 验收

- verify 全绿（基线 148 文件 1265 用例滚动，新增实测申报）；e2e 全量 39
  复验绿（主控——本票零新 e2e spec：排序链单测全锚+UI 下拉 Object.entries
  驱动无新交互模式；若门审要求 e2e 锚再补）。
- 门一 Kimi（backup 源）+门二 deepseek 64k 档。
- registry P7E-07 翻 done；library.service.ts:20 修订；提交 [locked-change]
  （models/paper.ts+新测试）。

## ⑦ 派发与成本申报

- 三屋照旧（实现者 GLM5.3 统一档；禁 git/registry/locks 除票面⑤锁序一次）。
- 主控亲验 verify 真退出码+变异红证抽查+diff 范围核对。
