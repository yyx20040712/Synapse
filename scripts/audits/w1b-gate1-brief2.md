# F-TESTREF-W1B 门一审包·补件一（B1/W1/W2/W3 处置）

## B1 处置：审包缺件补齐

根因：factories.ts 为**未跟踪新文件**，`git diff tests/` 不含未跟踪路径——审包
生成方式缺陷，非交付缺失。补件：

- **factories.ts 全文**（118 行）=E:\class\智慧水务\Synapse_remake\tests\utils\factories.ts
  （本轮复审可直接 Read；头注含 node 域禁用边界声明+收敛面口径）
- **locks/manifest.json diff**：`git diff locks/manifest.json`——generatedAt 更新+
  新增 tests/utils/factories.ts 条目（sha256），总条目 328→329（与 locks:apply
  输出「已锁定 329 个文件」一致）
- W2 调序后 diff 已更新至 scripts/audits/w1b-gate1-diff.patch（复生成）

## W1 处置：计数修正（门一正确）

实测（git status）：37 个 M tests/unit 文件+1 M tests/utils/geometry.ts+1 ??
factories.ts=tests 域 39 件。原简报「36/重叠-2」错在把 anchor-blank-snap（几何
族）与 anchor-locate（工厂族）名字看混——**交集仅 ai-annotation-layer 1 个**
（几何 17+工厂 21-1=37 unit 文件）。修正口径：17 几何+21 工厂-1 交集=37 unit
+2 utils=39 tests 域文件。

## W2 处置：九文件调序+契约收窄表述

**机械修复**：9 文件（ai-notes-section/annotation-popups-autosave/outline-aside/
reader-notes-panel/selection-mode/paper-detail-cited/clip/export/notes-off）
factories import 行已统一移至 api-client-mock 之后（diff 已更新）。调序后 9
文件 62 测试绿+指纹门绿（import 行不在断言面，C 面不变）。

**因果收窄（原文「W1A 顺序契约再实证」措辞过宽，收窄如下）**：
vi.mock 是路径级替换，注册后**之后加载**的模块拿 mock，**之前加载**的模块持
真引用。factories 顶层 useLineageStore 值 import 会拉真 api/client 进模块图；
lineage 三文件的红=被测组件经 store 动作（upsertNode/upsertEdge）消费了 store
模块图内持有的真 api 引用。纯数据工厂消费文件（makeTab/makeDetail/
makeAnnotation）不调 store 动作、组件自身的 api 消费走 vi.mock 注册后加载的
组件 import 链——故原序全绿。**统一调序=防呆收口**（未来任何文件新增
seedLineage 消费不再依赖 import 顺序纪律），非语义修复。

## W3 处置：行数实测修正

geometry.ts：git diff --stat=+147/-9（净 +138；文件 11→149 行）。原简报
「+107」为凭印象数字，违反计数落笔前实测纪律（宪法在册），本补件以
`git diff --stat` 机器输出为准。tests/ 域全量=38 files +324/-639（不含未跟踪
factories.ts 118 行）；全仓含 manifest=40 files +370/-681。

## N 级闭合声明

- N1（scroll-converge right 字段 top+10→10）：src/renderer/features/reader/
  scroll-converge.ts 全文仅消费 elRect.top/elRect.height/scRect.top/
  clientHeight（grep 实证），right 零消费。
- N2（scale right 0→gBCRWidth）：同文件消费面=width/clientWidth，right 零消费。
- N3（Range orig undefined 跳过=桩残留）：与存量逐字同形态，vitest 文件级
  jsdom 隔离无跨文件污染——parity 保持闭合。
- N4（selection-mode 裸调用点）：该文件 makeTab 调用仅 2 处（L122 'p-1' 在
  ①用例无 selectionMode 断言；L156 已显式双键），8/8 绿+指纹门断言多重集
  全同为旁证。
- N6（api/client 模块图边）：W2 调序后 21 文件统一为 mock 注册后加载，
  lineage.store 持 mock api——面收敛。

## 复审请求

针对补件复核：①factories.ts 全文（工厂体字段/patch 展开序/node 域头注/
useLineageStore import）；②manifest diff（factories 条目在场）；③W1-W3
处置是否闭合。原 N 级条目按上述声明裁处。
