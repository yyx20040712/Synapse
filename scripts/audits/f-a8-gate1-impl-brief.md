# F-A8 门 1 取证对照票实现者简报——新旧重锚链同页双跑+G2 分离度验收

> 主控=GLM5.3；实现者=子代理（GLM5.3flash 定档,环境统一档欠账披露）。
> 票：F-A8 门 1（阶段票——取证面）。设计书=docs/design/2026-09-04_f-seam-reanchor-design.md
> §6 阶段化·门 1；CR2 验收项=终裁节 3。上游=门 0 毕（70b6aea5b3——
> resolveAnnotationRectsItem 纯域版在手,零消费方）。

## ① 身份与禁令

取证票纪律：**src/ 产品代码零改**（探针/库/页内采集器=新 .mjs 件）;禁 git
add/commit/push;禁碰 tickets//docs/invariants/ADR/交接书;门 2 的 NIT×2
（verifyQuoteItem 入口短路+注释编号统一）**归门 2 票,本票零涉及**。卡点=
BLOCKED 停手。

## ② 必读序

1. `AGENTS.md`（宪法——取证纪律/Electron 后台化）。
2. `docs/design/2026-09-04_f-seam-reanchor-design.md`——门 1 判据+CR2 验收项原文。
3. `scripts/audits/f-a6-diag.mjs`+`f-a6-diag-lib.mjs`+`f-a6-diag-page.mjs`——
   探针架构先例（Electron 单 launch 批量/五段探针/合成 PDF/9s 兜底/测后还原）。
4. `src/renderer/features/reader/annotation-resolve.ts`——resolveAnnotationRects
   （DOM 链）与 resolveAnnotationRectsItem（项几何链——门 0 产物）双入口。
5. `src/renderer/features/reader/anchor-serialize.ts`——verifyQuote/verifyQuoteItem。
6. `src/renderer/features/reader/pdf-item-geometry.ts`——selectionHealth
   （G2 检测器——CR2 复用验收对象）。
7. `scripts/audits/f-a6-forensic-verdict.md`——f-a6 裁决表形态先例（§9/§10/§11
   取证口径——健康 0~0.12% vs 病理 25~62.5% 的量化表达）。

## ③ 主控裁决（取证设计预定）

1. **双链对照形态**：Electron 起真应用（复用 f-a6-diag 架构）→页内造标注
   anchor（DOM Range→selectionToAnchor 等价——或直接对页文本取 quote 窗构造
   {prefix,quote,suffix,start,end}+rects——**anchor 构造走 DOM 链先例口径**=
   模拟存量标注的真实形状）→同 anchor 双跑：A=resolveAnnotationRects（DOM 链
   完整走——textLayer 在场）;B=resolveAnnotationRectsItem（entry=该页
   page-items.store 条目——真渲染回报值,可页内读取 store 快照或等价组装）。
   产物对比=逐块 IoU+块数+band 垂直几何差（top/bottom 逐对）。
2. **页集**：健康=real3882+real1c2d（f-a6 真实库两样本,若干代表页）;病理=
   s1rot/s2crop（合成——f-a6 同款 buildSyntheticPdf）+1c2d 扫描拼合页（f-a6
   病理形态在档页）。每集 ≥3 页,页内 anchor ≥5 条（跨行/单行/页首/页尾形态）。
3. **真值判据**（病理页项几何产物贴合）：项几何链产物 vs 项声明几何真值
   （f-a6-diag-lib.baselineRowTruth/itemPixelRects 先例）——右溢 px/outside
   计数口径对齐 f-a6 C4。
4. **G2 分离度验收（CR2）**：selectionHealth 输入=项几何 boxes vs 双链各产物
   blocks——健康/病理页的偏离率分布对比;判据=分离度保持（健康 0~0.12% 量级
   vs 病理 ≥25% 量级,间隔 ≥200 倍量级——对齐 f-a6 取证口径）。**可复现→S6
   格保留;不可复现→S6 裁撤**（裁决表记录判据形态与数字,主控终裁）。
5. **门 1 决策门判据**：a) 健康页双链 IoU≥0.99（对齐 F-A6「健康页逐位不变」
   口径——占比与最差值都报）;b) 病理页项几何链产物贴合真值（右溢 0/outside
   0——f-a6 C4 口径）而 DOM 链失真可示;c) CR2 分离度结论明确。三判据齐→
   门 2 放行建议;任一不齐→如实记录（门 1 不过=回设计,非实现者责任）。
6. **探针新件命名**：f-a8-gate1-diag*.mjs（诞生即 npm run locks:generate+
   apply）;产物落 scripts/audits/f-a8-gate1-out/（JSON——不入 git）;裁决表=
   `scripts/audits/f-a8-gate1-forensic-verdict.md`（入库——f-a6 先例形态）。
7. **Electron 纪律**：无头/后台批量单 launch;9s 兜底;失败必关 app 再退出
   （防残留进程）;猴子补丁测后还原;备份库路径同 f-a6（local-state-backup/
   .import-20260827-2035）。

## ④ 纪律

取证不改产品面=本票 verify 数字预期 155/1345/locks 278+新探针件数
（locks:generate 后 locks 数=278+探针件数——实测落笔）;npm run verify 真退出码
落盘;证据 .raw.txt;UTF-8;禁新依赖（探针仅 node/playwright 内置+既有
f-a6-diag-lib 可复制复用——**复制 vs import：探针件间 import f-a6-diag-lib.mjs
优先**（单源）,仅当签名不匹配时复制并申报）。

## ⑤ 报告契约

全文落 `scripts/audits/f-a8-gate1-impl.report.md`：取证设计摘要/数据文件清单/
三判据数字/locks 实录/自裁申报/疑虑。回复五行内。裁决表另落
f-a8-gate1-forensic-verdict.md（决策门记录——门 1 过/不过+判据数字+主控终
裁栏留空）。

## 产出文件清单（超出即 BLOCKED 申报）

1. `scripts/audits/f-a8-gate1-diag.mjs`（+必要时 -lib/-page 拆件）——新受锁件。
2. `scripts/audits/f-a8-gate1-out/*.json`——取证数据（不入 git）。
3. `scripts/audits/f-a8-gate1-forensic-verdict.md`——裁决表（入库）。
4. `scripts/audits/f-a8-gate1-impl.report.md`——实现者报告（入库）。
