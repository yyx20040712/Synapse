# F-GEOM-01-G3 门一对抗深审报告（ops-gate1-k1 逐字归档——岗无写通道，主控落盘）

> 归档说明：门一岗物理工具面无写通道（仅 Read+RespondToCoordinator），报告全文
> 随回复在档，主控逐字落盘本件（batch 12/13 先例同型）。档位=kimi-main k3 $max。
> 总评：**PASS_WITH_WARNINGS（B=0 W=2 N=7）**

审材：diff 包（g3-gate1-diff.patch）/票面 registry.ts:294/设计书 §2.3（140-143)/§2.5(160-170)/§2.6(172-184)/§5.4(362-370)/实现者报告+六段简报/g3-verify-final.log。审计方式=Read 只读逐件开卷（无 grep 通道；消费面扫描以逐件 import 面+调用点核验代替，穷举性界限见 E 节声明）。

## A 母本符合度——六要件全中

- INV-68 落册：docs/invariants.md:84，接续 INV-67(:83）表尾，落号 68 ✓；四列风格对齐 INV-66/67 且条文列含「登记性质」句（设计书 §2.5 原话「事实升为 INV 登记…非行为变更」）✓。
- §2.5 三档绑定逐格 vs INV-68 条文：档1 bandsFromItems=selection 快/全量主链+S2/S3a ✓；档2 bandsForTextNodes=S4(Annotation+AI)+selection 全量显示回退、产物不入库（C5 精神）✓；档3 bandsNearRects=S3b 存量 ✓；禁跨档+禁第四推导+calibrateBands 三档之上现状不变 ✓。
- §2.6 终态收口句：#3 显式档+同源 bands 绑定 ✓；#4 transient 引用 selection-evaluate.ts:43/292 不重复登记 ✓（:43「仅显示不入库（F-GEOM-01-G2 保存门）」、:292 G2 注释均实测在位）；#2 引用 INV-58 既有「S6 名实（门一 W1 补注）」✓（INV-58 行内实测在册）。#1/#5 归 G2 落款，本票未越界 ✓。
- §2.3 坐标域三处「登记不物理收敛」：三处头注+INV-58 边界注的处置与设计书逐字对应 ✓。
- INV-58 边界注=行内追加段（diff @70 hunk 旧文逐字保留、纯追加）✓；受锁单链 unlock→改→apply ✓（B 节）。

## B 宪法红线——无违

- 零行为变更：6 文件全部 hunk 逐行核——invariants(+2/-1 条文）、manifest(+2/-2)、lineage-viewport(+3/-0 注释）、annotation-resolve(+4/-1 注释）、selection-geometry(+3/-1 注释）、selection-paint(+7/-3 注释）。无任何代码语义行。声明成立。
- 受锁链时序：manifest diff 恰 2 行（generatedAt+invariants.md sha256 887c6385→ac9999b5）与唯一受锁改动同步；locks:check 绿（log:87「338 个受锁文件与 manifest 一致」）；四件 src 头注文件不在锁内之声明与 manifest diff 形态相容 ✓。
- UTF-8：五件落地中文全部抽读可读（invariants:84/selection-geometry:61-63/lineage-viewport:79-81/annotation-resolve:378-380/selection-paint:10-12,51-53）+quality 关卡「无乱码」绿（log:18）✓。
- ≤500 行：143/283/411/88/91 实测全中（selection-geometry.ts=143 尾行亲见、lineage-viewport.ts=283、annotation-resolve.ts=411、selection-paint.tsx=88、invariants.md=91）✓。

## C 登记质量（核心面）

**C① 行号/消费面抽核——声明锚全部实测命中**：bandsFromItems=pdf-item-geometry.ts:366 ✓、itemSelectionGeometry 内消费=:506 ✓、selection-evaluate.ts:130/:207(itemSelectionGeometry 两路）✓、:233/:290(calibrateBandsWithSpans 档1 校准版两喂入点）✓、:296(bandsForTextNodes 显示回退）✓、annotation-resolve.ts:209(bandsForTextNodes)/:235(bandsNearRects)/:275(resolveAnnotationRectsDom)/:300(S4 bands 消费行）/:327(resolveAnnotationRectsItem)/:335(itemViewportOf 消费）✓、AnnotationLayer.tsx:98(bandsNearRects 唯一调用；import 见 :42)✓、annotation-band-calibrate.ts:77(calibrateBands)/:116(WithSpans)✓。

**C② 三处头注域声明技术准确性——全成立**：localScale 唯一文件内消费=toolbarMountPos:93（工具条 UI 定位），锚定链 anchor-serialize.ts:36-37 import 面不含 localScale——「不参与锚定/归一化数学」实测成立；rootToLocalScale 消费域单一驻 lineage 件（头注 :67 自述+:263 拖拽增量消费），INV-43 svg 口径段 :26-34 在案，「跨域出 reader 几何战役范围」成立；itemViewportOf 三消费（annotation-resolve:335→itemSelectionGeometry、layered:93→rectsForOffsetRange、layered:184→itemSelectionGeometry）全部只入项族数学 ✓。crib 互指成立（selection-geometry.ts:12-13 既有 crib 声明 ↔ lineage-viewport.ts:80-81）。

**C③ selection-paint 勘正句无新谎言面**：「band 匹配=matchBand，与标注层渲染同基准」——matchBand 同函数三渲染层共用实测（selection-paint.tsx:69/AnnotationLayer.tsx:135/AiAnnotationLayer.tsx:170）✓；「档1 校准版或档2 显示回退」喂入口径与 selection-evaluate:233/290/296 实物一致 ✓。

**C④ INV-58 边界注 r3a 支撑**：仓内佐证=pdf-item-geometry.ts:363-364 头注（同名事故 f-a6-diag-out-r3a，「减原点域差会令全部项盒判盒外触发 G2 全抑制」=盒本地域 vs gBCR 域混用同语义）；事故件实体未入库（`scripts/audits/*out*/` gitignore 目录形态，直读探针不存在）——表述有支撑，实体存在性标**不确定**（未直验）。

## D 报告诚实性——如实

- 自裁 1（域界宿主落 INV-58）：selection-geometry.ts:63 落文「（INV-58 坐标域边界注；r3a 型域差防线参照）」与申报一致 ✓（③-6 原文「INV-68 域界」与③-4 互斥的判断成立——INV-68 条文确无 localScale 域界内容）。
- 自裁 5(:290 备案未扩）：INV-68 条文 selection 锚保持 130/207/296 原单未扩 ✓ 如实。
- numstat 分件与 diff 逐 hunk 相符（+2/-1,+3/-1,+3/-0,+4/-1,+7/-3,+2/-2=**+21/-8**）；五件行数实测全中；疑虑 2/3 如实（relay.md 3 行=调度件已剔出 diff 包；CRLF 提示=.gitattributes 归一常态）。
- N4：简报「6 文件 +21/-9」与 diff 实测 +21/-8 差 1 删行——简报侧总数瑕疵，实现面与实现者报告无责。

## E 接缝与后续单

- 消费面扫描（逐件开卷代替 grep：SelectionLayer/selection-paint/AnnotationLayer/AiAnnotationLayer/annotation-resolve/layered/calibrate/open-paper-anchor/anchor-serialize/anchor-locate/pdf-item-geometry 全部核 import 面+调用点）：档1/档2/档3/calibrateBands 全部声明消费点成立，未发现漏列 src 消费点；bandsNearRects 全仓 src 唯一调用=AnnotationLayer.tsx:98 实测成立（AiAnnotationLayer.tsx:70 仅 import matchBand、layered:45-52 import 面无 bandsNearRects）。**穷举性不确定声明**：无 grep 通道，未开卷件（annotation-style/annotation-merge/PdfPageCanvas/PagesOverlay 等）经职责判定非推导消费面，残余风险低。
- N5（断锚债）：INV-68 行号锚 10 处，G6/G7/G9 迁移+G11 头注扫尾后必漂移；G11 票面④「INV-68 核验」覆盖收口义务（registry.ts:302），维护规则（invariants.md:86-91）无行号锚维护条款=册级空白（非本票引入），建议 G11 刷新或去行号化。
- N6（同族残留，G11 雷达）：SelectionLayer.tsx:42-43「AnnotationLayer 存量重锚域仍 DOM 量测域——INV-58 票外边界」系 selection-evaluate:54 同族陈旧句，票面 #5 只点名后者（G2 已消），本处归 G11 全域扫尾（registry.ts:302①），非 G3 漏面。
- 测试注释引用零影响：tests 零触碰+指纹门绿（log:27 187/1789/5411、:67-68 豁免 2hits/0stale+C⊇）。

## 逐条发现

- **W1**（登记质量/接缝归责）：annotation-resolve.ts:231 bandsNearRects 头注仍称「三消费点公共面：自绘选区/标注存量回退/AI 段」，与本票落册的 INV-68「档3…AnnotationLayer.tsx:98 唯一消费」（invariants.md:84）及本票自改 selection-paint.tsx:53「真实消费仅 AnnotationLayer S3b」两处互斥；实测唯一消费成立（E 节），头注为 F-A5 时代陈旧。本票已按预裁③-5 修 selection-paint 两处同族句，却漏改同一编辑文件内档3 锚点 :235 上方 4 行的同族头注——正是本票要消的谎言面残留。零行为。处置：随收口或归 G11 扫尾，把该头注消费面句改为「现状唯一消费=AnnotationLayer S3b/S6 存量回退（INV-68 档3）」。
- **W2**（预裁项 4 裁决）：INV-68 状态列「已登记」系第四词，与 invariants.md:88 维护规则三档词表（已锚定/部分/未锚定）互斥；其自陈「机检锚=未来跨档消费走 review 拦截位，非 CI 负锚」正属 88 行定义的「未锚定（纯声明或人审）」格。**门一裁：推翻主控「保留」倾向，改词「未锚定」**（括注保留「登记性质=事实升格防漂移，防线=review 拦截位」）；次优=维护规则补第四档定义句（扩词表属另一改动面，一词之改优于册内词表互斥）。推翻依据=同册 :88 明文规则行，非口味之争。
- **N1**：INV-68「S4（annotation-resolve.ts:300 resolveAnnotationRectsDom…）」——函数定义实为 :275，:300 为档2 消费行；简报③-3 原单如此、报告证据段已如实标注「:275 函数/:300=bands 行」。作 band 档位锚 :300 更贴题，作函数锚偏 25 行，知会。
- **N2**：档1 枚举「S2/S3a（resolveAnnotationRectsItem）」未显式覆盖 AI 段 S2（layered:203 直调 itemSelectionGeometry+calibrateBands:213）；源码锚列含 layered 兜底，禁跨档规则不受影响；设计书 §2.5 同口径继承。
- **N3**：档3 命名「S3b 存量专用」狭义——AnnotationLayer:98 的 failed 集实含 S3b 缺席+S6 抑制后存量直显两格（layered 头注 :14-15/:20；INV-59「S5/S6…抑制后的存量直显」同口径）；语义覆盖无漏，命名沿设计书，知会。
- **N4**：简报 +21/-9 vs 实测 +21/-8（见 D 节）。
- **N5/N6/N7**：见 E 节/C④（断锚债 G11 覆盖/SelectionLayer:42-43 同族残留入 G11 雷达/r3a 事故件实体不确定）。

## 预裁项复核

1. TDD 豁免——认同（零行为变更逐 hunk 核成立，无可变异对象，batch 12 先例同型）。2. selection-paint 勘正——认同且实测准确（C③）。3. e2e 不跑——认同（零运行时值变；G11 票面 registry.ts:302③ 含验收门全跑）。4. INV-68 状态词——**推翻**，裁改词（W2）。

## 统计与总评

B=0 W=2 N=7。票面要件全中、引用锚全真、验证链真退出码落盘（log:3835-3836 170/1744、:3875-3876 build 绿+EXIT=0）、报告诚实；W1/W2 均册面一致性级、零行为、一词一注可修，不阻断收口。**PASS_WITH_WARNINGS**（W1/W2 处置建议随收口一词一注修复，或显式归 G11 扫尾挂单）。
