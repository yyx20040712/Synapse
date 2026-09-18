# F-GEOM-01-G9 门一对抗式审查报告（ops-gate1-k2 / kimi k3 $max / zipoo）

> 主控逐字归档（岗无写通道）——原文未增删。FINDINGS: B=0 W=1 N=10
> VERDICT=PASS_WITH_WARNINGS。

审查材料（仅两件，隔离墙内）：
- `E:\class\智慧水务\Synapse_remake\scripts\audits\g9-gate1-brief.md`
- `E:\class\智慧水务\Synapse_remake\scripts\audits\g9-gate1-diff.patch`

## 指令① 零行为断言——逐 hunk 判读

patch 共 34 个文件条目：eslint.config.js×1 + src 消费面×3 + rename 对×14 + tests×16。逐 hunk 判读结论：**全部变更均为模块路径字符串改写，未见任何类型/逻辑/断言/CSS 规则/导入顺序/说明符集合的语义变化**。证据要点：

- 每个非 100% rename 恰含 1 个 hunk，hunk 内 `-`/`+` 行一一配对，说明符列表逐字相同（例：AnnotationLayer patch L110 vs L117 `{ normalizedLineHeight, matchBand, bandsNearRects, type ResolvedAnnotation, type RowBand }` 两侧恒等；ReaderPageView L247-261 七对行说明符全等）。
- `import type` / `export type` 修饰全数保留（PdfPageCanvas L231→L232 export-from 仍 `export type`）。
- 3 个 100% similarity rename（page-column-geometry L281-284、text-layer.css L307-310、usePageLazyWindow L327-330）零 hunk，CSS 规则面零触碰。
- TextLayer `import './text-layer.css'`（L275 上下文）未改——CSS 与组件同批迁入 view/，相对解析不变，正确。
- 全部 16 个 tests hunk 仅触及 import 行与 vi.mock 首参字符串；**无任何 `it(`/`describe(`/断言/标题行被触碰**（逐行核读确认）。
- eslint.config.js（L9-12）仅 files 数组两路径随迁；该数组 4 项在 hunk 窗口内完整可见，无第三处遗留。

**模块图拓扑保持**：每条改写边仅换路径字符串，importer→目标模块身份不变，未引入新环（PageColumn→PageColumnView→PageBox 链无回向边）。差集核对：14 个 rename 的 similarity 94-100%，其差集=hunk 内改写行=恰为申报 A 面 44 行（见②），无差额。

## 指令② 计数独立复算（patch 亲数）

**A=44 ✓** 分项全对账：

| 文件 | 行 | state | anchors | panels | interact | 上跨 | 根驻留 |
|---|---|---|---|---|---|---|---|
| AiAnnotationLayer (L80-95) | 8 | 3 | 5 | | | | |
| AnnotationLayer (L110-123) | 7 | 2 | 5 | | | | |
| AnnotationPopups (L138-149) | 6 | 2 | | | | 2 | 2 |
| PageBox (L164-165) | 1 | 1 | | | | | |
| PageColumn (L180-184) | 2 | 1 | | | | | 1 |
| PagesOverlay (L199-206) | 3 | 1 | 1 | | | | 1 |
| PdfPageCanvas (L221-232) | 4 | 1 | 3(含export-from) | | | | |
| ReaderPageView (L247-261) | 7 | 2 | | 1 | 1 | 1 | 2 |
| TextLayer (L276-277) | 1 | 1 | | | | | |
| scroll-progress (L296-303) | 4 | 3 | | | | 1 | |
| usePageColumnScroll (L322-323) | 1 | 1 | | | | | |
| **计** | **44** | **18** | **14** | **1** | **1** | **4** | **6** |

**B=7/3 ✓**：PageColumnView 3（L24-29）、ReaderPage 3（L41/46/51→L42/47/52）、reader-search 1（L64-65）。申报行号抽查三处全中：reader-search.ts:32、PageColumnView.tsx:25/26/27、ReaderPage.tsx:50/54/58 按 hunk 头独立推算逐一相符。

**C=30/16 ✓**：16 物理件逐件数=2+1+2+1+2+2+6+1+2+2+1+1+2+2+1+2=30；vi.mock=5（pages-overlay L454-455/463-464/471-472/479-480 + open-race L550-551）✓。

**E=2 ✓**（L9-12，:90/:91；:89/:92 上下文未动与申报相符）。

**rename 对=14 ✓**，similarity 区间 94-100% 与申报相符（94×1/95×2/96×1/97×3/98×3/99×1/100×3）。

## 指令③ 域序单向核验

patch 内 view 件全部出边：`../state/`×18、`../anchors/`×14、`../panels/`×1、`../interact/`×1、`../../../api|shared`×4、`../M6b根驻留`×6（PageColumnView/SearchHighlightLayer/AnnotationEditor/AnnotationMenu/TabBar/ReaderToolbar——与申报清单逐字相符，无未申报根向边）、`../time/`×0。**反向边（state/anchors/panels/interact/time→view）patch 内零见**；B 面 root→view 7 行为合法消费方向。结论：按简报转述的 §3.1 规则，patch 内出边全合规。

## 指令④ 受锁面合法性

C 面 30 行逐行核读：**全部纯路径改写，零用例增删、零断言/标题改动**。vi.mock 5 行仅首参模块路径随迁，工厂函数体在 hunk 上下文中原样可见、零触碰（pages-overlay L456-486、open-race L552-554）。open-race 的 PdfDocProvider mock（L546-548）未动=state 未迁，正确。

## 指令⑤ 残留拷问

patch 内证据：rename 件 hunk 上下文可见的残留 `./X` 引用全为 14 件域内互引（PagesOverlay 6/PageColumnView…ReaderPageView 4/PageBox 3/TextLayer 2/scroll-progress 1/usePageColumnScroll 1/AnnotationLayer 1/PageColumn 1=19 条），迁移后同目录解析不变，**正确零改写**；未见任何 `./state/`、`./anchors/`、`../../api` 等旧径残存，亦无旧径指向根驻留件。窗口外（hunk 未展开区域及全仓其他文件）无 patch 内证据可裁——列 N5/N6。

## 指令⑥ 自裁 7 条裁决

1. **正当**——程序性补正，无产物面影响。
2. **需处置（W1）**——v1 输出被覆盖未留档，「探针缺陷非实现缺陷」这一自利性断言的证据已灭失，属证据缺口；结论方向风险低（两修复均使 v2 更严格：假 0→全捕、误捕→限定件名），且本审 patch 内独立核验兜底，主控注记处置后可过。
3. **正当**——70 出边算术自洽（18+14+1+1+0+26+6+4=70）；`.textLayer` 误捕细节在窗口外不可验（并入 N10）。
4. **正当**——程序性，无产物面影响。
5. **正当**——patch 内可佐证部分成立：diff 34 文件条目零 relay/manifest/brief/recon 路径（「relay 零触碰」✓）；归因部分不可验（并入 N7）。
6. **正当**——与 ②F/③ 互洽（F 面排除→TICKETS 预期红）；EXIT=1 本身不可验（并入 N1/N2）。
7. **正当**——PdfPageCanvas export-from（L231→L232）确计入 anchors 14（亲数 5+5+1+3=14 相符）；A 面行号抽查（②节）三处零漂移实证。

## 指令⑦ 假设拷问——无法从本包独立验证项（列 N）

见下方 N 清单。

## 逐条发现

**B（阻断）**：无。

**W1（警告）**：自裁②——单向探针 v1 输出被 v2 覆盖、未单独留档（简报 L57-59 自述）。「v1 两缺陷=探针缺陷非实现缺陷」的原始证据已灭失，无法事后审计该归因；违反留档三桶口径「证据件随收口列入库」的精神。处置：主控在收口单注记一次，后续场探针各版本输出全量留档；不阻断（v2 PASS 在档+patch 内独立核验支持最终结论）。

**N1**：③ 段全部退出码/指纹/哈希恒等/M1/M2 变异红证/中探针 56 错——raw 日志不在本包（简报已明示「本包不含 raw」），无法独立验证；内部一致性核对无矛盾（基线 170/1744 vs 迁移后 170/1744 恒等、TICKETS_EXIT=1 与 ②F 排除互洽）。门二持仓读权限复核为必要闭环。

**N2**：registry.ts:300 票面、票尾注 [locked-change][test-refactor]、F 面随迁 12 行+4 条镜像面红——均不在本包，不可验。

**N3**：设计书 §3.1/§3.2 原文不在本包；按简报转述规则核验 patch 出边全合规（指令③）。附注：root↔view 双向边（B 面 7 行 root→view + A 面根驻留 6 行 view→root）为票面申报的 M6a/M6b 中间态，非缺陷，但应在 M6b 收口时复核消解。

**N4**：2212 行 wc、13 件 −1 无尾换行口径、PdfPageCanvas 146 vs 188——不在本包，不可验。

**N5**：D 跨特性=0、G 字符串面=0（theme.test 双扫）、旧径残留五通道全 0——patch 窗口外事实，不可验；patch 内未见任何反证线索。

**N6**：域内互引申报 26 条，patch 上下文可见 19 条（逐条确认零改写✓），余 7 条位于未展开区域（AiAnnotationLayer/AnnotationPopups/usePageLazyWindow 等文件的 hunk 窗外）；70 出边总数算术自洽，无矛盾但不可全量亲数。

**N7**：自裁⑤⑥ 的归因（开场非净态=主控遗留、4 镜像面红归主控）不可自包裁；可佐证部分（diff 零 relay 系路径）已核✓。

**N8**：PdfPageCanvas L228-230 的 G1 期注释（「受锁测试旧路径 import 本件零触（ai-annotation-layer.test:25/pdf-item-geometry.test:18 等）」）在 C 面改写上述测试路径后存在表述陈旧风险——本 diff 未触碰该注释（上下文行），非本票缺陷；建议 M 系列收口时刷新，避免后续读者误读「旧路径零触」为当前态。

**N9**：简报 ③「reader-page-open-race 仅 vi.mock 面=tsc 盲区（由 M2 运行时红证闭合）」归因精度欠佳——M2 红证对象为 page-column.test.tsx:23 的 import 行，并非 open-race 的 vi.mock 路径；open-race 实际由套件绿+路径一致性闭合（本审已核：rename 目标 `reader/view/PageColumn` 与 vi.mock 新径字符串逐字一致，L550-551 vs L169-175）。事实层面无矛盾，记录级。

**N10**：自裁①③④ 裁正当；其中 ③ 的 external=2（`.textLayer` className 正则误捕）细节位于 patch 窗口外，不可验。

## 统计与总评

- 文件条目 34（1 配置+3 src 消费+14 rename+16 tests），无范围蔓延（registry/relay 系零触碰）。
- 计数亲数全中：A=44（18/14/1/1/4/6）、B=7/3、C=30/16（vi.mock 5）、E=2、rename 14 对 similarity 94-100%。
- 零行为声明在 patch 内证据范围内**成立**：全部 hunk 为路径字符串改写，模块图拓扑保持，受锁测试面零用例/断言改动，eslint override 随迁防静默失效。
- 唯一处置项=W1（探针 v1 留档缺口，主控注记即可过）；全部「已在档」类证据链声明列 N 待门二持 raw 独立复核。

MODEL-SELF: model-field:5e1abd9d-1f4f-41fb-afa1-ecb5ce76e256/k3$max
FINDINGS: B=0 W=1 N=10 VERDICT=PASS_WITH_WARNINGS
