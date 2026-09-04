# F-A8 门 1b 前置修票 ·门一审材料包（Kimi 链,零仓库接触）

你是门一对抗审查员。审 F-A8 门 1b：ascent≤0 兜底修（pdf-item-geometry 核心几何一行——selection+annotation 双链共消费）+staged 复跑+N4 翻案核验。你拿不到仓库,只审本包材料。

## 0. 上游

门 1 判据 a 不过（IoU1D≥0.99 占比 6/20 最差 0.6232）——根因①ascent=0 直消费（可修域）②grapheme 细分近似③dy 域差。终裁 staged 序：第一步=旧口径复跑验收修补（归因清晰）→第二步=口径分层。本票=第一步+修点+N4 核验+门 0 两 NIT 顺带。

## 1. 审查任务（工单 A~E）

- **A 母本符合度**：修面=简报清单 5 项;:218 一行（Number.isFinite && >0）+头注+verifyQuoteItem 入口短路+S0~S3b 注释统一+测试新 it×2+探针错位计数——超出即查。
- **B 宪法红线**：先红证据（92≠84 期望差）;变异红证;受锁流程;TDD。
- **C 修点正确性**：`>0` 边界（ascent 恰 0/负值/正常 0.7——三分支）;pdf.mjs #getAscent 先例语义对齐（DEFAULT_FONT_ASCENT=0.8——材料声明先例=三级兜底,本修=单点,语义差是否成立:pdf.mjs 的量测兜底链在无 canvas 环境退化到 0.8,项几何域无 canvas 面=直接 0.8 是否等价于先例的语义）;selection 链行为变化面（真实文档块贴合改善——e2e 16/16 绿+单测回归绿是否充分）。
- **D 报告诚实性**：自裁§10（变异首轮作废/e2e 前两轮工具面失误/-page.mjs 零涉及/字体编号漂移按 ascent 值锚定）——是否如实。
- **E 复跑结论与 N4**：staged 第一步归因（ascent 因果清零:错对 44→22 块且残余定位 bottom 2+单行 8）;bottom 锚新根因定性（边栏分段+上下标行分段——两域聚类语义差）是否证据充分;**N4 翻案**（f-a6 锚窗 66/250=26.4% ascent-0 项——「f-a6 假阴面坐实,b2 漏网证伪」）的方法与结论是否成立（剔空串偏移表映射+声明数据同加载器——核验路径可复核性）。

## 2. 实现者声明摘要

- 修点 :218 加 `&& >0`;新 it×2 先红（ascent:0 夹具盒顶=基线-0.8×fontH,期望 92≠84 红）→绿 24/24;变异红（条件删 >0→新 it 红,备份还原 diff 空）。
- staged 复跑（修前档另存 -out-prefix/）:健康集 6/20→**10/20**;3882 多行锚 top/multi×2 全恢复 ≥0.9942;错对 6 锚 44 块→3 锚 22 块（ascent 因果面清零）;bottom 2 锚逐位不变=新根因;单行 8 锚区间逐位不变（细分近似面）。
- N4=覆盖:66/250=26.4% ascent-0 项在 f-a6 C1 锚窗采集面——f-a6 假阴面坐实,b2 漏网假设证伪。
- verify 155 文件/1347 用例（+2）/locks 281/build 全绿 exit=0;selection e2e 16/16 绿。

## 3. 主控已预裁项（可攻击,推翻需更强依据）

- 修点单行+>0 边界三分支语义（0/负=未声明→0.8;正常声明值逐位不变）。
- N4 翻案接受=「f-a6 采集面覆盖缺陷形态而未检出」的限定性勘误（非 F-A6 结论整体推翻——其逐位不变实测在混合行形态下真实;块级行并集掩盖机制在档）。门 2 前主控面将落 ADR 勘误注记。
- bottom 残余+单行锚=第二步口径分层对象+异形态区已知边界申报（不阻塞门 2——非回退层失真,是两链对异形态行的分段语义差）。

## 4. 实现者报告全文

# F-A8 门 1b 前置修票实现者报告——ascent≤0 兜底（pdf.mjs #getAscent 先例对齐）+staged 复跑

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
+ *   ascent 非有限或 ≤0 → 0.8 兜底（pdf.mjs #getAscent DEFAULT_FONT_ASCENT=0.8
+ *   先例——0=字体未声明非合法度量，F-A8 门 1b）。
@@ -215,7 +216,7 @@
-  const ascent = style !== undefined && Number.isFinite(style.ascent) ? style.ascent : 0.8
+  const ascent = style !== undefined && Number.isFinite(style.ascent) && style.ascent > 0 ? style.ascent : 0.8
```

先例对齐面（只读核实）：pdf.mjs:10894 `DEFAULT_FONT_ASCENT = 0.8`；#getAscent
（pdf.mjs:11225-11267）三级兜底（fontBoundingBox→墨带扫描→0.8）；消费点
pdf.mjs:11079 `fontAscent = fontHeight * TextLayer.#getAscent(...)`——DOM 链
（TextLayer）从不用声明 ascent，与本修兜底语义同源。descent 零消费（门 1 已核）
——bands/descent/其他零涉及，实际未触碰。

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


## 5. diff 全文（7 文件,64+/12-）

```diff
diff --git a/locks/manifest.json b/locks/manifest.json
index a88553f4f3..f60fc603e2 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-04T02:25:50.7755513Z",
+    "generatedAt":  "2026-09-04T03:24:29.1124381Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -127,11 +127,11 @@
                   },
                   {
                       "path":  "scripts/audits/f-a8-gate1-diag.mjs",
-                      "sha256":  "d8a7c4855c67d885f00180aea4cc39d5a8bd51061a727bf1c8f83551d862bb27"
+                      "sha256":  "7da18d1d936e42a1f43fe6f3d85b612bf02ede6caa8324555d9b8163f46b87e8"
                   },
                   {
                       "path":  "scripts/audits/f-a8-gate1-lib.mjs",
-                      "sha256":  "270ee271604cff6f7183c58bed1fc30340e18f9fdb88319449e5bd37a418c67f"
+                      "sha256":  "15919cc46ce938e08d55474aa2487715e3312422e47d635f69888c21c71546af"
                   },
                   {
                       "path":  "scripts/audits/f-a8-gate1-page.mjs",
@@ -803,7 +803,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/pdf-item-geometry.test.tsx",
-                      "sha256":  "58a1ef10073dff66f0f3cb726a07aebb02586d0af1baba260e8674ff6de985cd"
+                      "sha256":  "1d9bb9e5c9959d6a63249d498242ee81c1ab4dce12edd9900086d131ce398be4"
                   },
                   {
                       "path":  "tests/unit/renderer/pdf-page-canvas.test.tsx",
diff --git a/scripts/audits/f-a8-gate1-diag.mjs b/scripts/audits/f-a8-gate1-diag.mjs
index b9752c7fe5..c512e682ea 100644
--- a/scripts/audits/f-a8-gate1-diag.mjs
+++ b/scripts/audits/f-a8-gate1-diag.mjs
@@ -39,7 +39,7 @@ import {
 import { evalScrollPage } from './f-a6-diag-page.mjs'
 import { evalCollectPage } from './f-a8-gate1-page.mjs'
 import {
-  areaIou, iou1D, blockIouPairs, bandPairs, itemViewportOfReplica, offsetsOfItems,
+  areaIou, iou1D, blockIouPairs, bandPairs, mispairBlocks, itemViewportOfReplica, offsetsOfItems,
   spanBoxesAsItemBoxes, annotationOf
 } from './f-a8-gate1-lib.mjs'
 
@@ -304,11 +304,13 @@ async function main() {
         const rectsB = rb !== undefined ? rb.rects : null
         const bandsB = rb !== undefined ? rb.bands : null
         // 对比：1D x 轴 IoU（f-a6 口径——判据 a 主数字）+2D 面积 IoU（申报：
-        // 行盒 vs 声明字形盒系统顶偏压制 2D 值）+逐块 IoU+band 逐对差
+        // 行盒 vs 声明字形盒系统顶偏压制 2D 值）+逐块 IoU+band 逐对差+块配对
+        // 错位计数（门 1b W1——y 膨胀→x 错对因果钉死，修复预期错对=0）
         const cmp = rectsB === null ? null : {
           io1d: iou1D(rectsA, rectsB, 2 / tlBox.h),
           area: areaIou(rectsA, rectsB),
           blocks: blockIouPairs(rectsA, rectsB, 2 / tlBox.h),
+          mispair: mispairBlocks(rectsA, rectsB),
           bands: bandsB === null ? null : bandPairs(bandsA, bandsB),
           countA: rectsA.length, countB: rectsB.length, bandsA: bandsA.length, bandsB: bandsB.length
         }
@@ -370,9 +372,11 @@ async function main() {
         iou1d: oks.map((r) => r.cmp.io1d.iou),
         iouArea: oks.map((r) => r.cmp.area.iou),
         dyMedianPx: oks.length > 0 ? medOfPx(oks.flatMap((r) => r.cmp.blocks.map((b) => b.dy))) * tlBox.h : null,
+        mispairAnchors: oks.filter((r) => r.cmp.mispair.mispairedBlocks > 0).length,
+        mispairBlocks: oks.reduce((s, r) => s + r.cmp.mispair.mispairedBlocks, 0),
         guardAllEqual: rows.every((r) => r.guardEqual !== false)
       }
-      log(`双链 ${key}（${pg.set}）: reconcile=${reconcile} anchors=${rows.length} resolved=${oks.length} IoU1D=[${fmt(summary.pages[key].iou1d)}] IoU2D=[${fmt(summary.pages[key].iouArea)}] dyMed=${summary.pages[key].dyMedianPx === null ? 'null' : summary.pages[key].dyMedianPx.toFixed(2)}px guard=${summary.pages[key].guardAllEqual}`)
+      log(`双链 ${key}（${pg.set}）: reconcile=${reconcile} anchors=${rows.length} resolved=${oks.length} IoU1D=[${fmt(summary.pages[key].iou1d)}] IoU2D=[${fmt(summary.pages[key].iouArea)}] dyMed=${summary.pages[key].dyMedianPx === null ? 'null' : summary.pages[key].dyMedianPx.toFixed(2)}px mispair=${summary.pages[key].mispairAnchors}锚/${summary.pages[key].mispairBlocks}块 guard=${summary.pages[key].guardAllEqual}`)
     }
   }
 
diff --git a/scripts/audits/f-a8-gate1-lib.mjs b/scripts/audits/f-a8-gate1-lib.mjs
index d3b2259870..7b6d48a4f2 100644
--- a/scripts/audits/f-a8-gate1-lib.mjs
+++ b/scripts/audits/f-a8-gate1-lib.mjs
@@ -1,6 +1,7 @@
 /**
  * F-A8 门 1 取证库（f-a8-gate1-diag.mjs 依赖件）——双链产物对比数学（纯 Node）：
- * 逐块 IoU/聚合面积 IoU/band 逐对差/entry→viewport 复刻/Annotation 组装。
+ * 逐块 IoU/聚合面积 IoU/band 逐对差/块配对错位计数（门 1b W1）/entry→viewport
+ * 复刻/Annotation 组装。
  *
  * 纪律声明：本件零 DOM/零副作用；真函数（esbuild bundle）不在本件——主脚本
  * 消费 bundle 导出面（resolveAnnotationRectsItem/mergeLineRects/mergeRects/
@@ -134,6 +135,29 @@ export function bandPairs(bandsA, bandsB) {
   return out
 }
 
+/** 块配对错位计数（F-A8 门 1b W1——y 域行膨胀→x 轴 IoU1D 错对因果钉死）：
+ *  A/B 各按文档序 (y,x) 排序后逐 A 取最近 y 中心 B（blockIouPairs 同配对器
+ *  独立指派）；结构一致时正确配对必同秩（同序同位），秩错位=错对块（错行/
+ *  双绑/漏绑统称——y 膨胀行结构分叉后该对的 x 区间对照不可信）。countA≠countB
+ *  时分叉点后秩整体位移，全数计错（保守上界——结构分叉=所有配对不可信，
+ *  常规页实测 countA=countB）。修复预期=错对锚数 0/错对块数 0。 */
+export function mispairBlocks(rectsA, rectsB) {
+  const byDoc = (r1, r2) => r1.y - r2.y || r1.x - r2.x
+  const A = rectsA.map(normRect).sort(byDoc)
+  const B = rectsB.map(normRect).sort(byDoc)
+  let mispaired = 0
+  for (let i = 0; i < A.length; i += 1) {
+    let best = -1
+    let bestD = Number.POSITIVE_INFINITY
+    for (let j = 0; j < B.length; j += 1) {
+      const d = Math.abs(B[j].y + B[j].h / 2 - (A[i].y + A[i].h / 2))
+      if (d < bestD) { bestD = d; best = j }
+    }
+    if (best !== i) mispaired += 1
+  }
+  return { countA: A.length, countB: B.length, mispairedBlocks: mispaired }
+}
+
 /** entry → ItemViewport 复刻（annotation-resolve.ts itemViewportOf:373-382 同式——
  *  私有函数不导出故复刻；scale 自 entry.box 反推=真函数口径） */
 export function itemViewportOfReplica(entry) {
diff --git a/src/renderer/features/reader/anchor-serialize.ts b/src/renderer/features/reader/anchor-serialize.ts
index e212371a8a..c60f5032a2 100644
--- a/src/renderer/features/reader/anchor-serialize.ts
+++ b/src/renderer/features/reader/anchor-serialize.ts
@@ -67,7 +67,7 @@ export function verifyQuote(
   selector: { prefix: string; quote: string; suffix: string; start: number }
 ): number | null {
   // 空 quote 短路在 fullTextOf 之前（提取前旧码同序——空引文不触 DOM 遍历，
-  // 触达面还原[门一 N1]；locateQuote 内同检查保留=verifyQuoteItem 路径防线）
+  // 触达面还原[门一 N1]；locateQuote 内同检查保留=两入口共用兜底防线）
   if (selector.quote.length === 0) {
     return null
   }
@@ -87,6 +87,11 @@ export function verifyQuoteItem(
   items: ReadonlyArray<{ str: string }>,
   selector: { prefix: string; quote: string; suffix: string; start: number }
 ): number | null {
+  // 空 quote 短路在 items 拼接之前（与 verifyQuote 入口对齐——空引文不触
+  // 拼接遍历，触达面对称[门二 NIT 转门 1b 顺带]；locateQuote 内同检查保留=双防线）
+  if (selector.quote.length === 0) {
+    return null
+  }
   const text = items
     .map((it) => it.str)
     .filter((s) => s.length > 0)
diff --git a/src/renderer/features/reader/annotation-resolve.ts b/src/renderer/features/reader/annotation-resolve.ts
index 7e849d299b..c82ab4d865 100644
--- a/src/renderer/features/reader/annotation-resolve.ts
+++ b/src/renderer/features/reader/annotation-resolve.ts
@@ -301,7 +301,7 @@ export function resolveAnnotationRects(args: {
 }
 
 /**
- * [F-A8 门0] 重锚纯域版（项几何族——S0–S3a 状态机的纯函数核，设计书
+ * [F-A8 门0] 重锚纯域版（项几何族——S0–S3b 状态机的纯函数核，设计书
  * docs/design/2026-09-04_f-seam-reanchor-design.md §1.1/§3）：
  * - S0：entry null → {}（页项缺席——接线层走 DOM 回退链，纯函数不编排回退）；
  * - S1 DOM 对账=门 2 接线面（接线时有 textLayer DOM 可对账），本域 entry
diff --git a/src/renderer/features/reader/pdf-item-geometry.ts b/src/renderer/features/reader/pdf-item-geometry.ts
index 36c2ba9fed..45473341db 100644
--- a/src/renderer/features/reader/pdf-item-geometry.ts
+++ b/src/renderer/features/reader/pdf-item-geometry.ts
@@ -50,7 +50,8 @@
  * - ascent 口径声明：取 styles 声明值（pdf.js TextStyle.ascent）而非 canvas
  *   量测值——乙轨已实证口径（b1 §2 T9 分解：声明 0.718×18=12.92 vs 量测
  *   14.33；项矩形=声明几何，构造不含量测伪迹）；fontName 查 styles 缺席/
- *   ascent 非有限 → 0.8 兜底（pdf.js #appendText 同款缺省）。
+ *   ascent 非有限或 ≤0 → 0.8 兜底（pdf.mjs #getAscent DEFAULT_FONT_ASCENT=0.8
+ *   先例——0=字体未声明非合法度量，F-A8 门 1b）。
  * - 依赖单向：本件→annotation-merge（mergeRects 终裁——INV-A~D 保证，乙2
  *   验证管线同构[diag normB2]）；零环；纯函数零 DOM/React 依赖
  *
@@ -214,7 +215,7 @@ function itemBoxOf(
   const vertical = style?.vertical === true
   if (vertical) angle += Math.PI / 2
   const fontH = Math.hypot(tx[2]!, tx[3]!)
-  const ascent = style !== undefined && Number.isFinite(style.ascent) ? style.ascent : 0.8
+  const ascent = style !== undefined && Number.isFinite(style.ascent) && style.ascent > 0 ? style.ascent : 0.8
   const sinA = Math.sin(angle)
   const cosA = Math.cos(angle)
   const ox = tx[4]! + ascent * fontH * sinA
diff --git a/tests/unit/renderer/pdf-item-geometry.test.tsx b/tests/unit/renderer/pdf-item-geometry.test.tsx
index 55defbc23c..21189481b9 100644
--- a/tests/unit/renderer/pdf-item-geometry.test.tsx
+++ b/tests/unit/renderer/pdf-item-geometry.test.tsx
@@ -73,6 +73,24 @@ describe('pdf-item-geometry 项矩形（viewport transform 合成——pdf.mjs 
     expect(boxes[0]!.fontH).toBeCloseTo(10, 6)
   })
 
+  it('ascent≤0 兜底 0.8（F-A8 门 1b——pdf.mjs #getAscent DEFAULT_FONT_ASCENT=0.8 先例：0=字体未声明非合法度量）：ascent:0 样式 → 盒顶=基线−0.8×fontH=84（修前直消费 0：盒顶贴基线 92=行膨胀缺失必红）', () => {
+    const styles = { g1: { ...STYLE_H, ascent: 0, descent: 0 } }
+    const { boxes } = rectsForOffsetRange([mkItem('ASC', 72, 700)], styles, VP0, 0, 3)
+    expect(boxes[0]!.rect.y).toBeCloseTo(84, 6)
+    expect(boxes[0]!.rect.h).toBeCloseTo(10, 6)
+    // 负 ascent（有限但非法度量）同兜底 0.8
+    const neg = rectsForOffsetRange([mkItem('NEG', 72, 700)], { g1: { ...STYLE_H, ascent: -0.05, descent: -0.2 } }, VP0, 0, 3)
+    expect(neg.boxes[0]!.rect.y).toBeCloseTo(84, 6)
+  })
+
+  it('ascent 正常度量逐位不变回归（门 1b）：0.7 直消费 → 盒顶=85；样式缺席（fontName 无 styles 条目）→ 0.8 兜底口径不变（=84）', () => {
+    const ok = rectsForOffsetRange([mkItem('N7', 72, 700)], { g1: { ...STYLE_H, ascent: 0.7, descent: -0.3 } }, VP0, 0, 2)
+    expect(ok.boxes[0]!.rect.y).toBeCloseTo(85, 6)
+    expect(ok.boxes[0]!.rect.h).toBeCloseTo(10, 6)
+    const absent = rectsForOffsetRange([mkItem('N0', 72, 700, { fontName: 'g9' })], STYLES, VP0, 0, 2)
+    expect(absent.boxes[0]!.rect.y).toBeCloseTo(84, 6)
+  })
+
   it('旋转 90 页：viewportTransformFor=[0,1,1,0,0,0]，项盒轴随行进角 π/2 旋转（手算 {698,72,10,100}）+vProj=−tx4（行分隔随旋转轴换）', () => {
     const { boxes } = rectsForOffsetRange([mkItem('ROT', 72, 700)], STYLES, VP90, 0, 3)
     expect(boxes[0]!.rect.x).toBeCloseTo(698, 6)

```
