# SR2-LG-07 实现报告（脉络布局非单调年份树修复+边 label 渲染——缺陷 E1）

> 实现者子代理交付报告。票面：`scripts/audits/sr2-lg-07-brief.md` v1。
> 结论：**verify 真退出码 0（全量，对最终树态）**；单测 95 文件 737 用例
> （基线 734+3）；e2e lineage 4/4 加跑全过；locks 144 重锁同步。

## 1. 实现摘要

- **P1 布局修**：`lineage-layout.ts` Frame 增根占位 `rootLo/rootHi`（叶子
  =[0,NODE_W]，内部节点=归一化后 [x−NODE_W/2, x+NODE_W/2]，与 spans 同
  坐标系）；place() 兄弟合并增补约束 2：`need = max(need, mergedRootHi +
  SIBLING_GAP − f.rootLo)`（mergedRootHi=已合并兄弟根占位 offset 后 max
  右缘；首兄弟 null 无下限）。**共享层约束 1 原样保留**——深层不共享层
  子树交错不受影响（紧凑性保持，it ② 锁定）。
- **P2 边 label 渲染**：贝塞尔中点近似 ((from.x+to.x)/2, mid) 渲染真实
  文本；空串不渲染（无 text 节点）；`data-edge-label={e.id}` 测试钩。
  样式自裁：fontSize 11、fill var(--text-dim)、paintOrder=stroke +
  stroke var(--bg) 3px 底色描边（「白描边或等价可读性处理」之等价侧——
  随主题底色的 halo，跨层带横线/连线可读）。
- **P5 性质登记**：lineage-layout.ts 头注行为层新增「兄弟根占位分离」
  条——直接兄弟节点对不论年份层必横向错开 ≥ NODE_W+SIBLING_GAP。
- **LineageBoard.tsx** 头注「预留：…边 label 富化；…」摘除该项（渲染
  已交付，其余预留项原样）。
- P3 auto-fit 未做（票面注记即可）：初始视口 {0,0,1} 保持；M1 树修后
  finalWidth=400px（实测），常规视口内。

## 2. 文件清单

| 文件 | 变更 | 说明 |
|---|---|---|
| `src/renderer/features/lineage/lineage-layout.ts` | 改（249→286 行） | P1 修+P5 头注（≤500 机检面远低于线） |
| `src/renderer/features/lineage/LineageEdges.tsx` | **新增**（62 行） | Canvas 拆件：连线+边 label 渲染（组件 ≤250 红线，自裁①） |
| `src/renderer/features/lineage/LineageCanvas.tsx` | 改（249→234 行） | 边渲染段替换为 `<LineageEdges>` 消费+头注补 label 语义 |
| `src/renderer/features/lineage/LineageBoard.tsx` | 改（1 行） | 摘「边 label 富化」预留声明 |
| `tests/unit/renderer/lineage-layout.test.ts` | 改（受锁，unlock→改→apply） | +2 it（P4 ①②）；既有 17 it 零改全绿 |
| `tests/unit/renderer/lineage-canvas.test.tsx` | 改（受锁，unlock→改→apply） | +1 it（P4 ③）；既有 14 it 零改全绿 |
| `locks/manifest.json` | 改（locks:apply 产出） | 两受锁测试 sha 更新，144 条同步 |

新文件被引用核验：LineageEdges 由 LineageCanvas.tsx import（非死码）。

## 3. 首红证据（TDD 档 1——当前实现下新 it 必红）

```
× SR2-LG-07 缺陷 E1：非单调年份树兄弟全不共享层不退化单列（M1 同构…）
  → expected 0 to be greater than or equal to 220        ← 两孙 x 差 0=单列退化实锤
× SR2-LG-07 紧凑性保持：深层不共享层兄弟子树仍可交错（…）
  → expected -220 to be 220                              ← 旧实现 B 不被推开（offset=0）
× SR2-LG-07 边 label：沿贝塞尔中点渲染真实文本；空 label 边不渲染 text
  → expected undefined to be '方法继承链'                  ← label 未渲染
Tests  3 failed | 31 passed (34)                          ← 既有 31 全绿（回归面完好）
```

## 4. 态空间表（兄弟放置约束 need 的构成）+ M1 跨格序列推演

### 4.1 四格态空间（本树=当前被放置兄弟；前树=已合并左侧兄弟集）

| 格 | 前树存在 | 与前树共享层 | 旧 need | 新 need | 行为变化 |
|---|---|---|---|---|---|
| 1 | 无（首兄弟） | — | 0 | 0 | 无（单链/首子） |
| 2 | 有 | 无 | 0 | `mergedRootHi+SIBLING_GAP−rootLo` | **缺陷格：旧恒 0=E1 单列退化；新=根占位下限** |
| 3 | 有 | 有（共享层项 ≥ 根占位项） | 共享层项 | max(共享层项, 根占位项)=共享层项 | 无（既有 it 不动的机制面） |
| 4 | 有 | 有（根占位项 > 共享层项） | 共享层项 | 根占位项 | 仅在此格新约束生效（下限抬升） |

不变量（跨全四格）：同年层内任意两节点 x 区间分离（W1 层索引性质原样）；
直接兄弟根横向错开 ≥ NODE_W+SIBLING_GAP（新增性质，格 2/4 承载）。

### 4.2 M1 树跨格序列（Brown 2002 → Reynolds 1883 → Cross 1936 + SH 2007）

层序：1883→0、1936→1、2002→2、2007→3（y=0/140/280/420）。

| 步 | place 调用 | 格 | 数值 |
|---|---|---|---|
| 1 | place(Cross) 叶 | — | spans={1:[0,180]}，root=[0,180]，selfRel=90 |
| 2 | place(SH) 叶 | — | spans={3:[0,180]}，root=[0,180]，selfRel=90 |
| 3 | place(Reynolds)·Cross | 1 | offset=0；merged={1:[0,180]}；mergedRootHi=180 |
| 4 | place(Reynolds)·SH | **2（缺陷格）** | 旧 need=0／新 need=180+40−0=**220**；offset=220；merged={1:[0,180],3:[220,400]}；mergedRootHi=400 |
| 5 | Reynolds 自身 | — | minL=0，width=400；myLayer 0 无冲突 x=**200**（居中 (90+310)/2）；root=[110,290] |
| 6 | place(Brown)·Reynolds | 1 | offset=0；myLayer 2 无冲突 x=**200**（单子链同 x） |
| 7 | assign | — | **Brown=Reynolds=200，Cross=90，SH=310**（错开恰 220=NODE_W+SIBLING_GAP） |

实测复核（esbuild 转译 layout 模块直跑，type-only import 剥离无 alias）：
`{"Brown":{"x":200,"y":280},"Reynolds":{"x":200,"y":0},"Cross":{"x":90,"y":140},"SH":{"x":310,"y":420}}`
——与手推逐位一致，与主控简报「Reynolds 居中、Cross 左/水锤史右错开 220px+、
Brown 单子链同 x、宽约 400px」吻合（finalWidth=400）。推演值已入测试注释。

紧凑夹具实测：`P=310, A=310, A1=90, A2=310, A3=530, B=530, B1=530`——
B−A=220（恰下限，A 的 2022 层宽轮廓 [0,620] 不推 B）；B1(2024 层)与
A3(2022 层)同 x=530（异层交错未死）。

## 5. 变异红证全日志（cp 备份法，禁 git checkout；变异→红→还原→diff 空）

- **变异 ①**（删 `if (mergedRootHi !== null) { need=…rootLo }` 约束块，
  恢复旧比较语义）→ layout 19 it 中 **2 红**：
  `缺陷 E1 it → expected 0 to be greater than or equal to 220`（回退单列）；
  `紧凑性 it → expected -220 to be 220`。`cp` 还原 diff 空确认。
- **变异 ②**（删边 label text 块）→ canvas **1 红**：
  `边 label it → expected undefined to be '方法继承链'`。还原 diff 空确认。
  拆件（自裁①）后对**最终形态**补做同枚变异：改 LineageEdges.tsx 删
  label 块 → 同一 it 同断言红 → cp 还原 diff 空确认。

## 6. verify 真退出码与 locks 实录

- `npm run verify` 全量（quality+tickets+locks+lint+typecheck+test+build）：
  **EXIT_CODE=0**（两轮：拆件定稿轮与 b3 指针补行后终轮，均对各自树态；
  终轮 log 留档 `scripts/audits/.sr2-lg-07-verify-tail.txt`）。
  关键行：quality 通过（无占位/乱码/跨域）；tickets 114 一致；locks
  144 一致；**Tests 737 passed (95 files)**；三段 build ✓。
- e2e（票面外加跑兜底）：`lineage.spec.ts` **4 passed**（15.5s，0 skip）。
- locks 流程：`locks:unlock`（144 解锁）→ 改两受锁测试 → `locks:apply`
  （144 重锁，manifest 记 144 条同步）→ verify 内 locks:check 绿。
- 无 TODO/FIXME/placeholder（diff 0 命中）；全部改动文件 UTF-8 字节级验证
  过（node utf8 decode 无 U+FFFD）。

## 7. 自裁申报（票面外决定）

1. **组件行数红线拆件**：预读只核了 ESLint max-lines=500，漏
   check-quality.mjs 的「组件 ≤250 行」关——加 label 后 Canvas 269 行，
   verify 首跑红。按 Board 头注拆分预案拆出 `LineageEdges.tsx`（62 行，
   渲染语义原样搬迁：data-edge-id/data-edge-label 钩子与贝塞尔路径不变），
   Canvas 收敛 234 行。P2 落点由「Canvas 边渲染段」变为「Canvas 消费+
   LineageEdges 承载」。
2. **src 注释工单号改溯源标记**：SR2-LG-07 未入 tickets/registry.ts
   （登记/翻状态归主控收口，本人禁触），而 tickets:check 对 src 引用
   未注册工单号判红 → src 注释一律用「缺陷 E1（2026-08-28 验收）」
   （不匹配 `SR2?-` 正则）；**tests 保留 SR2-LG-07 标记**（tests 扫描面
   仅查占位桩调用，合法且保溯源）。主控登记工单后 src/tests 均不会引起
   tickets:check 波动（已推演：src 零引用、tests 无占位桩调用）。
3. 边 label 空串判定 `e.label !== ''`（票面字面，未扩 trim——空白串
   渲染为不可见 text 属数据面问题不入渲染面猜测）。
4. 新增 it 实数 **+3**（layout 2 + canvas 1），单测 734→737，落在 ⑤
   预测 737~738 下沿。
5. e2e 零改（票面）：预读核 lineage.spec 断言面=真实文本可见/path 计数/
   拖拽 transform，无布局数值断言——无 BLOCKED 面；加跑 4/4 过（票面外
   主动兜底，渲染面变更防御）。

## 8. 疑虑

1. 票面/派单称 lineage-layout.test.ts「既有 12 it」——**实数 17**（+2 后
   19）；canvas 14（+1 后 15）。基线对账以实数为准（734 总数吻合无误）。
2. 派单称「lineage.spec 既有 7 用例」——实数 4 个 test 句柄（八验收面
   映射 4 场景，spec 实现注裁决 1），全过。
3. `locks/manifest.json` 为 CRLF（PS 脚本产出常态；git 例行警告，locks:
   check 全绿=磁盘态与 manifest 一致，提交时 gitattributes 归一不影响
   manifest 内记录的文件 sha）。
4. 主控收口需登记 SR2-LG-07 并翻状态；如需在 src 注释回填工单号属注释
   级追加（登记后 tickets:check 对 open/done 引用均合法——done 自文件
   例外=工单登记文件，src 其他文件引 done 号会红，故**不建议回填**，
   维持「缺陷 E1」溯源即可）。
