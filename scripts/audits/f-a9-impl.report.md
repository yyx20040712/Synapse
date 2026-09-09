# F-A9 实现者报告——标注带垂直几何（渲染时 DOM span 校准=方案 A）

## 1. 实现摘要

根因确认（简报 §0 起步+pdf.mjs 源码核实）：项盒（itemBoxOf）盒顶=基线−
**styles 声明 ascent**（pdf-item-geometry.ts:219-225）×fontH、盒高=item.height×
scale；而 pdf.js textLayer span 定位=基线−**#getAscent 量测 ratio**
（pdf.mjs:11079——measureText("") fontBoundingBox 像素量测回退字体，与声明值
不同源）×fontH、盒高=fontH（line-height:1，pdf.mjs:11098 fontSize=fontHeight）。
小字号（7~8px）下两系统差=带整体偏移 ~2.5~3px（缺陷①②共同的公共上游偏差源）。

修复=主控预裁方案 A「渲染时 DOM 校准」：项几何派生 bands 在渲染时刻经
textLayer span 盒（gBCR）实测校准——校准值落 RowBand 新域 calTop/calBottom，
matchBand 返回时替换 top/bottom（**匹配键仍派生 center——错绑零风险**），
rects 派生域与落库链零变。两条消费链同修（预览=selection-evaluate 两路径；
标注=annotation-resolve-layered 两个 item 分支含 AI 段）。

### 几何推导表（校准窗口径）

| 域 | 算式 | 备注 |
| --- | --- | --- |
| 派生 band px 顶 | topPx = band.top×base.h + spans.base.y | band 归一域→gBCR 视口域 |
| 命中窗（垂直） | span 中心 cy∈[topPx, bottomPx] | 中心归属语义——受锁 selection-item-chain 夹具（span 与项链刻意错开 116px/zoom2 错开 12px）按窗不命中=项链产物零变（既有测试零改保护） |
| 命中窗（水平） | span.right>x0Px 且 span.left<x1Px | band x0/x1 缺席→不校准（防邻列误收） |
| calTop/calBottom | (min(span tops)−base.y)/base.h、(max(span bottoms)−base.y)/base.h | 命中集盒并集=带 y=行盒顶/高=行盒高（票面验收口径） |
| 回退（零变） | 零有效 span/零宽零高 span/textLayer 盒退化/base 宽高差>1px/窗不命中 → cal 域缺席 → 消费回退派生值 | jsdom 无布局夹具（annotation-layer.test F-A8 门2/ai 同款）天然走此路=受锁面零扰 |
| underline 条 | top=calc(calBottom%−2px)、height=2px | rectStyle 既有式零改——条=span 行盒底内侧 2px（≈基线下 descent 区细线） |

## 2. 文件清单

新增：
- `src/renderer/features/reader/annotation-band-calibrate.ts`（校准域件：
  spanBoxesOf 一次量测/calibrateBands 纯匹配核/calibrateBandsWithSpans 组合形）
- `tests/unit/renderer/band-calibration.test.tsx`（always-active 新测试 10 用例：
  纯几何窗 4+matchBand 替换 2+标注链挂载 3+预览链挂载 1）
- `scripts/audits/f-a9-verify-real.mjs`（真机复测探针——新文件非改旧件）

修改（3 文件，band 计算与消费接线面）：
- `src/renderer/features/reader/annotation-resolve.ts`：RowBand 增
  calTop?/calBottom? 域+matchBand 返回替换（匹配仍派生 center）
- `src/renderer/features/reader/selection-evaluate.ts`：visual 快路径与
  evaluateCore item 分支两处 setPaint 前 bands 校准（快慢同款=INV-58 快慢等价保持）
- `src/renderer/features/reader/annotation-resolve-layered.ts`：
  resolveAnnotationRectsLayered 与 resolveAiNotesLayered 的 item 分支——spanBoxesOf
  每页/每 resolve 一次量测共享逐条 calibrateBands

未触碰：AnnotationEditor.tsx/AnnotationPopups.tsx（F-A11 并发面）、tests/e2e/、
既有测试文件、tickets/registry.ts、locks。

## 3. 红证/绿证/变异证（三屋 TDD）

- **红**（scripts/audits/f-a9-red.raw.txt）：两层——①import 级（新域件不存在
  →vite import-analysis 红）；②断言级（最小骨架[类型域+空壳函数]下 6 failed：
  纯几何命中 1+matchBand 替换 1+标注链挂载 3+预览链挂载 1——几何断言对修前
  实现有判别力）。
- **绿**（f-a9-green.raw.txt）：定向 10/10；renderer 全量 85 文件/1028 用例
  （既有回归面零回退：selection-item-chain/selection-evaluate/annotation-layer/
  ai-annotation-layer/selection-paint 全绿——受锁「span 与项链判别性错开」
  夹具经校准窗天然不命中）。
- **变异红证**（f-a9-mutation.raw.txt）：M1=matchBand 删 cal 替换
  （`calTop ?? top`→`top`）→5 failed（matchBand 替换+3 挂载+预览链接线面）；
  cp 备份法还原（diff 确认空+备份即删，非 git checkout）。
- 实现中途一次自查修复：jsdom gBCR 桩面只有 x/y/width/height（无 top/left
  ——mock 形态与 bandsNearRects 消费面同款）——校准量测取 g.x/g.y（轴对齐盒
  上 x/y≡left/top），非测试文件改动。

## 4. 真机复测对照（f-a9-verify-real.raw.txt；白名单用户库副本+a9390ef7 文献
第 1 页——与简报 f-a9-real6 同场景同探针口径）

| 场景 | 修前（f-a9-real6） | 修后 | 判据（容差 0.75px） |
| --- | --- | --- | --- |
| 缺陷②underline 第 1 行条 top | 514.34（span [511.43,519.40] 37% 处，img3 低位切字） | 517.400（期望 517.400） | **16/16 行全 ok**（逐行配对各自 span 底−2px） |
| 缺陷①预览带 paint [top,bottom] | [177.05,183.43]（整体上移 2.5px，img1 灰带偏移） | [179.5375,185.900] vs span [179.550,185.925] | **ok**（偏差 0.0125/0.025px） |

跑前 `node scripts/sqlite-abi.mjs use electron` 已执行（build 内含）；npm run
test 的 pre 步骤已自愈回 node 绑定。

## 5. 状态迁移表（校准域引入的态空间）

| 输入态 | cal 域 | 消费端渲染 |
| --- | --- | --- |
| 项几何 bands+量测材料在+窗命中 | calTop/calBottom 在场 | band 值（校准后） |
| 量测退化（jsdom/空层/零宽 span 全滤） | 缺席 | 派生 band 值（=修前行为） |
| 窗不命中（span 中心域外/水平域外/x0x1 缺席/base 域错配>1px） | 缺席 | 派生 band 值（=修前行为） |
| DOM 回退链 bands（S4/存量——bandsForTextNodes/bandsNearRects） | 不经校准（未接线） | 原样（票面「回退语义零变」） |

## 6. 自裁申报（超票面决定）

1. **matchBand 返回替换**形态：预裁给的两个候选（「bandFromItems 产 band 后
   夹取修正」或「underline 直接用 span 盒底」）落第三变体——校准值放 RowBand
   独立域+matchBand 单点替换：三消费点（SelectionPaint/AnnotationLayer/
   AiAnnotationLayer）零改自动获益；匹配键保持派生 center=错绑零风险（校准
   位移不参与行归属判定）。
2. **校准窗**=span 中心∈band 派生垂直域+水平重叠（预裁未定窗形——自裁依据：
   受锁 item-chain/selection-evaluate 夹具「span 与项链刻意错开」形态按中心
   窗天然不命中=既有测试零改通过；真机两形态（偏 2.5px/底差 3.06px）均命中）。
3. **AI 段链顺带覆盖**（resolveAiNotesLayered item 分支同校准）：票面两条链
   =预览/标注；AI 段走同一 matchBand 消费——同族接线一致性（不校准则 AI 段带
   与标注带在同类页上几何口径分裂）。
4. **域一致防御**（spans.base 与 base 宽高差 >1px 不校准）+**量测取 g.x/g.y**
   （jsdom 桩面兼容——bandsNearRects 同款取法）。
5. **INV-58 C5 张力**：「禁项源 rect×DOM 量测 band 混用」字面与方案 A 的关系
   ——派生域不变（rects 与 bands 仍同由项几何+styles 派生、同链产出），calTop/
   calBottom=派生后的显示域校准（主控预裁方案 A 授权在案 f-a9-brief §1）；
   混用错绑风险由「匹配键=派生 center」消解；落库 rects 零变（预览链挂载级
   it 断言 y=派生域）。
6. **G3A 开放项②**（f-a8-gate1-lib.mjs 的 bottom 锚 rect 收集窗定义）与本次
   改动面不交（校准只加显示域，不碰 rect 收集/取证窗）——不动（票面预裁「不
   交则不动并申报」）。
7. **e2e 渲染真实文本**（受锁 tests/e2e/）留主控（票面简报 §2 明示）。

## 7. 疑虑

1. **性能面无实测锚**：拖选快路径每帧全页 span gBCR（现量零缓存——zoom 变更
   即真值；布局稳定时缓读）。真机探针拖选随动正常；若门审要求可补帧耗时锚。
2. **紧排边界**：行距<半行高时相邻行 span 中心可能同落 band 垂直域→带扩张为
   两行并集（罕见形态——真库 43 行取证页行距 10.45px/行高 7.97px 免疫；同族
   偏差量级下不劣于修前）。未加最近行聚类防护（过度设计判断——申报留门审定）。
3. **预存 lint 红 2 处非本票面**：scripts/audits/f-a9-diag.mjs:43（主控诊断件
   xrefStart 未用）+tests/e2e/reader-text.spec.ts:297（userData 未用——并发/
   主控面残留）。禁令禁改——主控收口 verify 前须清。
4. **基线数字**：全量 159 文件/1496 用例（票面基线 157/1482 + 本票 1 文件/10
   用例 + F-A11 并发 +1 文件/+4 用例——git status 并发残留可解释，非本票虚报）。

## 8. 门一回炉 1/2 处置表（2026-09-09 轻量补证轮）

| 门一项 | 处置 | 证据 |
| --- | --- | --- |
| B2 变异补 | M2=水平窗删右界臂（`g.left < x1Px` 删）→「水平不重叠」用例精确红；M3=垂直窗删下界臂（`cy > bottomPx` 删）→「窗口不命中」用例精确红。**门一示例形态勘误**：`>=` 边界/`<=0` 阈值两形态经查对既有断言无判别力（夹具无边界值/半像素形态 span——`<=0` 变异下零宽桩 width=0 仍被滤、`>=` 变异下 cy=418.2<bottomPx=418.9 仍命中），取同面等效形态（删臂）如实记录 | f-a9-mutation2.raw.txt（M2/M3/M4 三段，cp 备份法还原 diff 空、备份即删） |
| C3 防御分支用例 | 补两用例：「域错配回退」（量测盒宽 620 vs base 612 差 8px→cal 缺席原样）+「盒退化回退」（textLayer 盒高 ≤1→原样）；M4 变异（BASE_MISMATCH 防御短路）→域错配用例精确红=判别力证（非恒真） | band-calibration.test.tsx 纯几何 describe +2 用例（12 用例全绿）；M4 段在 mutation2.raw.txt |
| C2 消费面证据 | 主控核销（AiAnnotationLayer.tsx:70 import matchBand+pool 结构）——无动作 | 门一指令原文 |
| C4/C5 留观察 | 紧排边界带扩张+快路径性能锚——不补夹具不补锚，留观察项（真机页免疫在档；后续真机复现紧排问题立新票） | 本表即登记 |

**locks 操作申报（超票面禁令决定）**：门一回炉需改受锁测试文件（band-calibration.test.tsx 已被门审场 locks:apply 登记+R 锁——manifest 293 含之），按宪法「受锁文件修改前 unlock、改完即时 apply」执行 unlock→补用例→locks:generate+apply（297 条，check-locks 绿）；generate 顺带登记诞生即属受锁面的自产件 f-a9-verify-real.mjs 与主控欠账 f-a9-diag.mjs/f-a9-real.mjs（audits mjs 入锁=71 条先例常态——本报告 §7 疑虑 3 中「audits mjs 不触发锁红」的旧判断作废）。主控收口时 locks:check 已绿，提交带 [locked-change] 尾注。

**回炉后基线**：定向 12/12；全量 159 文件/1498 用例（+2=C3 用例）；typecheck 绿；lint 仍只余 2 处预存非本票面红（f-a9-diag.mjs:43/reader-text.spec.ts:297——主控/并发面，禁触碰申报在案）。
