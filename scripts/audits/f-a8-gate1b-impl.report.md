# F-A8 门 1b 前置修票实现者报告——ascent≤0 兜底（缺省常量 0.8 同源）+staged 复跑

> 票：F-A8 门 1b（简报 `scripts/audits/f-a8-gate1b-impl-brief.md`）。
> 上游=门 1（ea2b8819e3——裁决表 `f-a8-gate1-forensic-verdict.md` 终裁动作①+
> staged 验收序+探针升级 W1+N4 待核）。工作树基线=ea2b8819e3（干净）。
> verify 终态：**155 文件/1347 用例（基线 1345+新 it 2）/locks 281/exit=0 亲验**。

## 0 技能清点（开工记录——AGENTS.md 会话开工纪律）

| 技能 | 用/不用 | 理由 |
|---|---|---|
| test-driven-development | 用 | 票面强制先红+变异红证 |
| verification-before-completion | 用 | test/verify 真退出码落盘 .raw.txt |
| systematic-debugging | 用 | 复跑数字归因（修补有效性/残余定性） |
| javascript-testing-patterns | 用（轻量） | 新 it 夹具构造参考 |
| 其余（git-workflow/browser/e2e-patterns 等） | 不用 | 禁 git add/commit/push（铁律）；e2e 本票零新增（既有面跑绿即可）；纯修票无部署/文档面 |

配置自查：本会话=实现者子代理定档（GLM5.3flash 档环境统一欠账沿简报披露）；node=24.20.0
（Volta PATH 前缀绕行——AGENTS.md 环境事实，全部 npm/node 命令同口径）。

## 1 修点 diff（票面 §③-1——修面=:218 一行+头注；门 1 后行号 217→218）

```diff
--- a/src/renderer/features/reader/pdf-item-geometry.ts
+++ b/src/renderer/features/reader/pdf-item-geometry.ts
@@ -50,7 +50,8 @@
- *   ascent 非有限 → 0.8 兜底（pdf.js #appendText 同款缺省）。
- *   ascent 非有限或 ≤0 → 0.8 兜底（缺省常量与 pdf.mjs DEFAULT_FONT_ASCENT
+ *   同源、链语义类比——#getAscent 三级量测链在无 canvas 环境的退化形态未在
+ *   档核实；0=字体未声明非合法度量，F-A8 门 1b）。[回炉 W1 措辞终态]
@@ -215,7 +216,7 @@
-  const ascent = style !== undefined && Number.isFinite(style.ascent) ? style.ascent : 0.8
+  const ascent = style !== undefined && Number.isFinite(style.ascent) && style.ascent > 0 ? style.ascent : 0.8
```

缺省常量同源面（只读核实——回炉 W1 措辞降级）：pdf.mjs:10894
`DEFAULT_FONT_ASCENT = 0.8`；#getAscent（pdf.mjs:11225-11267）三级量测链
（fontBoundingBox→墨带扫描→0.8）；消费点 pdf.mjs:11079
`fontAscent = fontHeight * TextLayer.#getAscent(...)`——DOM 链（TextLayer）
从不用声明 ascent。本修与该**缺省常量 0.8 同源、链语义类比**（#getAscent
三级量测链在无 canvas 环境的退化形态未在档核实——非逐级对齐声明）。
descent 零消费（门 1 已核）——bands/descent/其他零涉及，实际未触碰。

## 2 TDD 证据（受锁 unlock→改→apply 全程）

- **unlock**：`f-a8-gate1b-unlock.raw.txt`（281 解锁，exit=0）。
- **先红**（修点未动）：新 it「ascent≤0 兜底 0.8」红——`f-a8-gate1b-first-red.raw.txt`
  （exit=1：`expected 92 to be close to 84`——ascent:0 直消费给盒顶=基线 92，
  行膨胀缺失形态逐位复现）；回归 it（0.7 直消费/样式缺席 0.8）同轮即绿（现状已对）。
- **绿**：修点落盘后 24/24（`f-a8-gate1b-green-unit.raw.txt`，exit=0）。
- **变异红证**（文件备份法，非 git checkout）：>0 条件删除（翻回旧实现）→ 同一
  断言红 `expected 92 to be close to 84`（`f-a8-gate1b-mutation-red.raw.txt`，
  exit=1）→ cp 还原 → `restore-diff-empty` + 24/24 绿
  （`f-a8-gate1b-post-restore.raw.txt`，exit=0）。
- 新 it ×2 落 `tests/unit/renderer/pdf-item-geometry.test.tsx`（受锁）：
  ①ascent:0/负值 → 盒顶=基线−0.8×fontH（84@fontH10）；②0.7 逐位不变（85）
  +fontName 无 styles 条目缺席兜底（84）回归。

## 3 门 0 两 NIT 顺带（票面 §③-7，门二 NIT 转门 1b 面）

1. `anchor-serialize.ts` verifyQuoteItem 入口空 quote 短路（拼接前返回——与
   verifyQuote 对齐）：代码 3 行+注释 2 行；同件 verifyQuote 旧注
   「=verifyQuoteItem 路径防线」表述随守卫就位改为「两入口共用兜底防线」
   （注释-代码一致性，非行为）。行为零变（locateQuote 内同检查保留=双防线），
   `anchor-item-verify.test.tsx`+`selection-evaluate.test.tsx` 20/20 绿
   （`f-a8-gate1b-nit-tests.raw.txt`，exit=0）。
2. `annotation-resolve.ts` :304「S0–S3a」→「S0–S3b」（与列举态 S0/S1/S2/S3b
   统一；全库 grep S3a 仅此一处）。

## 4 探针升级（裁决表 W1——3882 六锚块配对错位计数）

- `f-a8-gate1-lib.mjs` 新增 `mispairBlocks(rectsA, rectsB)`：A/B 各按文档序
  (y,x) 排序后逐 A 取最近 y 中心 B（blockIouPairs 同配对器独立指派）；结构
  一致时正确配对必同秩，秩错位=错对块（错行/双绑/漏绑统称）；countA≠countB
  时分叉点后秩整体位移全数计错（保守上界——常规页实测 countA=countB）。
- `f-a8-gate1-diag.mjs` 接线：cmp.mispair 逐锚+页级 mispairAnchors/mispairBlocks
  汇总+日志行。`-page.mjs` **零涉及**（错对计数=Node 侧产物后处理，页内采集
  面无需增项——修面申报）。
- **修前错对数**（在档门 1 数据直算，`f-a8-gate1b-mispair-prefix.raw.txt`）：
  3882 六多行锚 **6/6 全错对**（p2：top 3/9+bottom 5/12+multi 6/10=14 块；
  p7：top 8/10+bottom 12/15+multi 10/15=30 块——合计 44 块）；单行锚 0；1c2d
  三页 0/0（对照干净）；s2crop 0；s1rot 2 锚 4 块（旋转形态）。

## 5 staged 第一步：修后全量复跑（旧口径——归因修补有效性）

运行：`node scripts/audits/f-a8-gate1-diag.mjs`（npm run build 先行，
`f-a8-gate1b-build.raw.txt` exit=0）→ `f-a8-gate1b-run.raw.txt` **exit=0**
（Electron 单 launch 批量 4 文献 7 页×5/5 锚、页内 9s/采集器 20s 兜底、
失败关 app——门 1 纪律同款；reconcile 7/7 真、relocate 35/35 零）。
修前在档数据已存档 `f-a8-gate1-out-prefix/`（17 文件），复跑覆盖写
`f-a8-gate1-out/`（目录选择申报：覆盖+修前档另存）。

### 判据 a 主数字（口径未动——过/不过归于修补）

| 分层 | n | 修前 ≥0.99 | 修后 ≥0.99 | 修前区间 | 修后区间 |
|---|---|---|---|---|---|
| 健康集全量 | 20 | 6/20（30%） | **10/20（50%）** | 最差 0.6232，中位 0.9074 | 最差 0.6584，中位 **0.9745** |
| ─ 整行边界锚@1c2d-p4/p9 | 6 | 6/6（100%） | 6/6（100%）不变 | 0.9919~0.9998 | 0.9919~0.9998（对照零扰动） |
| ─ 整行边界锚@3882-p2/p7 | 6 | **0/6** | **4/6** | 0.6232~0.7617 | 0.6584~0.9983 |
| └ 项内部分选中单行锚（全页集） | 8 | 0/8 | 0/8 | 0.8816~0.9745 | 0.8816~0.9745（区间逐位不变） |

**3882 逐锚改善（IoU1D / 错对块）**：

| 锚 | 修前→修后 IoU1D | 错对块 | 判定 |
|---|---|---|---|
| p2-top | 0.7608→**0.9968** | 3→0 | 修补生效 |
| p2-bottom | 0.6820→0.6820（逐位不变） | 5→6 | 非 ascent 因果（见 §6） |
| p2-multi | 0.6232→**0.9978** | 6→0 | 修补生效（修前最差锚） |
| p7-top | 0.6338→**0.9942** | 8→0 | 修补生效 |
| p7-bottom | 0.6518→0.6584（≈采集轮次漂移） | 12→13 | 非 ascent 因果（见 §6） |
| p7-multi | 0.7617→**0.9983** | 10→3 | 修补生效（残余 3 块=窄边栏条带副块，IoU 已过门） |
| p2/p7 单行×4 | 逐位不变 | 0 | 与 ascent 无关（细分近似面） |

**错位计数终态**：3882 六多行锚错对锚 6→3（p2-bottom 6 块/p7-bottom 13 块/
p7-multi 3 块=22 块，修前 44）；1c2d/s2crop 0；s1rot 2 锚 4 块（同修前——
旋转形态域）。ascent 因果面（top/multi×2）错对清零——**「y 膨胀→x 错对」
因果链钉死且修补验证有效**。

**判据 a 终裁口径申报（供主控）**：旧口径下健康集 10/20（50%）/最差 0.6584
——**仍不过**；但归因分解清晰：①ascent-0 膨胀面全消（4 锚恢复 ≥0.9942）；
②残余两 bottom 锚=新根因（§6，非修补无效——其 IoU 修前修后逐位相同）；
③单行锚 8/8=grapheme 比例细分近似面（区间与修前逐位相同——结构性上限，
分层口径裁决面=主控设计书增补）。

### 判据 b/c 随复跑确认（不预断方向）

- G2/CR2：健康 20 锚三形态 0 误伤（全 healthy）；病理 s2crop-top 三形态
  unhealthy（裁剪缘真越界真阳性保持）、s1rot-top dom/span unhealthy（旋转
  伪迹右溢保持）——与门 1 §6 同判（方向保持/弱式）。
- s1rot/s2crop/p6 IoU 形态与门 1 在档一致（s2crop-top outside=1/1 真阳性
  越界保持；p6 无分叉保持）。

## 6 残余 bottom 锚新根因定性（如实记录——新根因待析，非回炉责任）

> **[回炉 W2 修正]** 本节「修前修后 IoU1D 逐位相同=与 ascent 修补零因果」的
> 推断链已被证伪（项级/产物级 diff 非零——修补实际触及 bottom 窗 ascent-0 行，
> IoU 逐位同是 y 门配对稳定+x 区间未动的聚合层巧合）；修正表述与直接证据见
> 「回炉一轮补记」W2——bottom 残余非 ascent 因果的结论本身反而获得强化
> （膨胀已消而 IoU/错对不动），表述改判归主控。

p2/p7-bottom（页尾窗）修前修后 IoU1D 逐位相同（0.682→0.6820；0.6518→0.6584
≈轮次漂移）——**与 ascent 修补零因果**。数据面（`f-a8-gate1-out/` dual JSON）：

1. **页缘竖排边栏条带**：两链首块均含窄高块（w≈0.013~0.020，y 0.21~0.79
   跨半页——DOM 序在页尾窗内的边栏文字）；项链分 2 块（0.2124 巨块+0.2496
   副块）vs DOM 链 1 块——分段差直接制造秩错位起点。bottom 窗内 ascent-0 项
   y 分布佐证（p2：min 0.259/med 0.861——边栏项在窗内偏移域但 y 在页中部）。
2. **参考文献区行分段差**：A 行节距均匀 0.0152；B 行节距 0.0107~0.0139 不
   规则且末两行 0.9513/0.9881 错位——上下标/引文编号基线族在两链容差边界
   （基线分组 tolPx vs mLR y 聚类）分段不同（B 缺 A 的行+多行）。

析因与处置=主控面（本票只取证：错对计数器已把残余定位到锚/块粒度）。

## 7 N4 核验结论（票面 §③-5——二值）

**结论：覆盖——F-A6 取证锚覆盖了 ascent-0 项，f-a6 存在假阴面（更要申报）。**

核验方法（`f-a8-gate1b-n4.raw.txt`+`-n4-fontcount.raw.txt`，均 exit=0）：
f-a6 在档两目录（`f-a6-diag-out`/`-b2`）3882 cap 的 C1 锚窗
[start=2079,end=4704)（span 30%→60%——evalCRaw 公式）× 3882 p7 Node pdfjs
声明数据（diag 同参加载器）：剔空串偏移表映射 → 窗内 250 项中 **66 项
（26.4%）属 ascent=0/descent=0 声明字体**。即 F-A6 的 C1 原始矩形/度量与
E bands 采集面**包含该缺陷形态的项**，而 F-A6 全档未检出/未申报该缺陷——
「F-A6 取证锚未覆盖」的待核假设被证伪，**b2 漏网定性不成立，f-a6 假阴面
坐实**（门 0 提交注记中「双重身份候选」的 F-A6-b2 侧证据链需主控改判归档）。
附注：页级字体计数复核与门 1 裁决表 §4 严丝合缝（p7 ascent-0 字体 228/839
项=27.2%；p2 145/522=27.8%——`-n4-fontcount.raw.txt`）；字体编号 g_d0_fN
随页加载序漂移（p2+p7 顺序加载与单页加载异名），归因按 ascent 值锚定非编号。

## 8 分层口径数字表（staged 第二步数据面——主控写设计书增补的消费源）

复跑 JSON 直接分层统计（`f-a8-gate1b-strat.raw.txt`，含 35 锚逐锚明细）：

| 分层 | n | IoU1D≥0.99 占比 | 区间 | 中位 | 错对块合计 |
|---|---|---|---|---|---|
| 健康集·整行边界锚（top/bottom/multi） | 12 | 10/12（83.3%） | 0.6584~0.9998 | 0.9946 | 22 |
| ─ 其中 1c2d 干净字体页 | 6 | 6/6（100%） | 0.9919~0.9998 | 0.9946 | 0 |
| ─ 其中 3882（含 ascent-0 字体+边栏/文献区） | 6 | 4/6（66.7%） | 0.6584~0.9983 | 0.9942 | 22 |
| 健康集·项内部分选中锚（single×2） | 8 | 0/8（0%） | 0.8816~0.9745 | 0.9074 | 0 |
| 病理集·整行边界锚 | 10 | 8/10（80%） | 0.1335~0.9999 | 0.9999 | 4 |
| 病理集·项内部分选中锚 | 5 | 2/5（40%） | 0.7031~0.9938 | 0.9796 | 0 |

分层观测（修后）：整行边界锚在干净行结构页全部 ≥0.99；0.99 门对项内部分
选中锚 0/8（区间 0.8816~0.9745 与修前逐位相同——grapheme 比例细分近似
上限面）；残余不过锚集中于 3882-bottom（新根因 §6）与 s1rot（旋转域）。

## 9 locks 与 verify（受锁流程+真退出码）

- unlock（281）→ 改（tests/pdf-item-geometry.test.tsx+diag/lib 两探针）→
  `locks:apply`（`f-a8-gate1b-locksapply.raw.txt` 281 重锁 manifest 281）→
  `check-locks` 281 一致（`f-a8-gate1b-lockscheck.raw.txt` exit=0）。受锁
  面无新增路径（locks 数 281 不变——修改均为在册文件）。
- `npm run test` 全量：155 文件/**1347 用例**（=基线 1345+2）全绿
  （`f-a8-gate1b-test-full.raw.txt` exit=0）。
- `npm run verify`：quality+tickets+locks 281+lint+typecheck+test 1347+build
  全绿，**exit=0 亲验**（`f-a8-gate1b-verify.raw.txt` 尾行）。
- selection 既有 e2e（`reader-text.spec.ts`，npm run build 修后产物+electron
  ABI 口径）：**16/16 绿 44.4s**（`f-a8-gate1b-e2e-reader-text.raw.txt`
  exit=0）。
- grep 自查：修改面零 TODO/FIXME/placeholder 增量。

## 10 实现者自裁申报（超票面决定/数据缺口/已知限制）

1. **修面偏差申报**：头注实为 2 行改 3 行（净 +1 行——票面「头注一行」口径
   内的折行形态，语义单条）；NIT-1 实为代码 3 行+注释 2 行（含 verifyQuote
   旧注同步改 1 处——注释-代码一致性，非行为）。
2. **-page.mjs 零涉及**（修面清单允许）：错对计数=Node 侧 rects 后处理，
   页内采集面无增项需求——W1 目的（3882 六锚错对计数）经 -lib/-diag 全达。
3. **变异红证首轮作废重做**：首轮变异用多行 `node -e` 静默失效（本 shell
   多行 -e 不可靠——变异未生效那轮跑出假绿已废弃）；重做=分步核态
   （backup→变异 grep 核→红→还原→diff 空+绿），红证档为真红轮。同因弃用
   多行 node -e（后续全走临时脚本文件）。
4. **e2e 前两轮作废申报**：直接 `npx playwright test` 跳过 abi 切换
   （`npm run test` 后 binding=node 版），Electron 主进程 DB 模块 ABI 失配
   →无窗→30.2s 全中断+teardown 超时——纯实现者工具面失误非代码问题；
   第三轮 `sqlite-abi.mjs use electron` 后 16/16 绿。
5. **复跑数据目录选择**：覆盖 `f-a8-gate1-out/`+修前档另存
   `f-a8-gate1-out-prefix/`（17 文件）——对比面保全。
6. **字体编号域差**：g_d0_fN 编号随页加载序漂移（f-a6 双目录与门 1 裁决表
   编号差即此因），归因一律按 ascent 值锚定（§7 附注）。
7. **lockscheck 码页伪迹**：apply 同轮追加的 check 行在批处理重定向下有
   mojibake（控制台码页），独立重跑取证干净（§9）——源文件 UTF-8 未动。
8. **p7-multi 残余错对 3 块**：窄边栏条带副块族，IoU1D=0.9983 已过门——
   错对计数>0 与 IoU 过门可并存（错对块宽度可忽略），如实并陈。

## 11 疑虑（移交主控）

1. bottom 锚新根因（边栏分段+文献区上下标行分段——§6）是否立票析因/修域，
   主控裁决；错对计数器已提供锚/块粒度取证面。
2. N4=覆盖 → **f-a6 假阴面**：F-A6-b2「双重身份」表述需主控改判（漏网假设
   证伪）；f-a6 取证结论中经 3882-p7 C1/E 锚的度量面是否需要复核申报面，
   控制面归主控。
3. IoU2D 全系 0.39~0.75（dy 系统顶差压制——门 1 §3 已申报口径面），复跑
   同形态，无新信息。
4. 判据 a 分层口径落设计书（终裁动作②）+单行锚近似上限面表述（W2 修正：
   0.97 上限已被 0.9745 越过，禁当立约数字）——数字源=§8 表。

---

## 回炉一轮补记（门一 Kimi K3 PWW 处置——2026-09-04）

### W1 先例措辞降级——已完成

- `pdf-item-geometry.ts` 头注（:52-54）：「pdf.mjs #getAscent
  DEFAULT_FONT_ASCENT=0.8 先例」→「缺省常量与 pdf.mjs DEFAULT_FONT_ASCENT
  同源、链语义类比——#getAscent 三级量测链在无 canvas 环境的退化形态未在
  档核实」（3 行折行形态，语义单条）。src 件不在锁面（manifest 在册仅测试
  件）——无需 unlock/apply，locks 281 不变。
- 报告三处：标题行/§1 diff 引文（标注「回炉 W1 措辞终态」）/§1 断言段
  （「先例对齐面」→「缺省常量同源面」+非逐级对齐声明）。
- 残留申报：新 it 标题内「pdf.mjs #getAscent DEFAULT_FONT_ASCENT=0.8 先例」
  措辞在受锁测试件内——W1 票面范围=「src 头注一处+报告」，未动；是否随改
  归主控裁（改则 unlock→改→apply 一行）。

### W2 bottom 零因果项级 diff——**BLOCKED（非零——按票面停报）**

证据 `f-a8-gate1b-bottomdiff.raw.txt`（exit=0；方法=两档 dual JSON+diag 同参
Node pdfjs 直算，viewportTransformFor rot=0 分支/修前修后两公式逐项复刻——
Node 直算口径，无新 .mjs 入库，locks 无涉）。**三层结果全部非零**：

| 层 | p2 bottom | p7 bottom | 内容 |
|---|---|---|---|
| 项级（窗内 ascent-0 项盒顶逐项 diff） | **13/13 非零**，Δtop=−7.58px（=−0.8×fontH9.5） | **16/16 非零**，Δtop=−6.79px（=−0.8×fontH8.5） | 修补机制本身——ascent-0 项盒顶上移 0.8×fontH |
| 产物级（rectsB 逐块 diff） | 5/12 块变化：dy=−0.96px、dh=−5.67px；dx/dw 全零 | 7/15 块变化：dy=−0.86px、dh=−5.07px；dx/dw 全零 | ascent-0 行膨胀 16.1px→10.4px（消除）；x/宽不动（angle=0 行修补只动盒顶） |
| 对比级（IoU1D/错对） | 0.682→0.682（逐位同）；错对 5→6 | 0.6518→0.6584；错对 12→13 | y 门配对稳定（中心移 ≤0.96px 在门内）+Σx 区间未动→p2 恰同；p7 +0.0066=一门界配对翻转 |

**判定与改判需求（归主控）**：
1. 票面预期「全零」证伪——§6 原「IoU 逐位相同=零因果」推断链作废（聚合层
   巧合非构造性不变），§6 已加指针行（上方）。
2. 但修正后因果反而强化「bottom 残余非 ascent」结论：**膨胀已消（dh=−5.5px
   实测）而 IoU1D/错对计数不动**——bottom 失败对修补不敏感的直接证据（原
   §6 双根因定性[边栏分段+文献区上下标行分段]不变，证据面上移为直接级）。
3. 「那是修补副作用,性质完全不同」的预案定性不成立——非零 diff=修补按设计
   生效于 bottom 窗 ascent-0 行（与 top/multi 恢复同机制），非副作用形态。

### W3（主控面——本报告未动）

N4 收口注记由主控采限定措辞「采集面覆盖缺陷形态而未检出」；本报告 §7 原文
保留（「假阴坐实」的补充实测[66 项矩形膨胀]未做——如需：f-a6 锚窗 [2079,
4704) 的项级膨胀可与 W2 同法补测，主控指令再启）。

### W4/N1——转第二步（记入待办）

**第二步待办**（口径分层统计时一并）：
- W4 双根因比例分解：bottom 残余错对块中「页缘竖排边栏分段」vs「参考文献
  区上下标行分段」的块数占比（错对块按 y 域归属分桶——p2 6 块/p7 13 块）。
- N1 3 块宽度量化：p7-multi 残余错对 3 块（IoU1D=0.9983 已过门）的块宽 px
  与页宽占比——「错对>0 与 IoU 过门并存」的宽度可忽略性定量。
- N2：主控收口时确认（清单项，无实现面）。

### 回炉轮关口与 exit 码

- 本轮改动面：`pdf-item-geometry.ts` 头注 3 行（非受锁）+本报告；无新受锁
  文件（W2=Node 直算无新 .mjs）——locks 281 不变。
- 全量 verify：`f-a8-gate1b-rework1-verify.raw.txt`（尾部 exit=0——含
  locks:check 281/test 1347/build）。
- W2 证据：`f-a8-gate1b-bottomdiff.raw.txt` exit=0。
