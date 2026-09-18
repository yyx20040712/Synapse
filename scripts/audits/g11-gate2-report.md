# F-GEOM-01-G11 门二终审报告（ops-adjudicator，deepseek-flash $max；2026-09-19）

> 审对象=工作树未提交改动（HEAD=62ef3802ad）+两轮门审流产物。工作区根 `E:\class\智慧水务\Synapse_remake`，下文 file:line 均相对该根。只读面亲读全部关键证据（hex 级 sha 亲比、grep 亲扫、行号亲核），全程未亲跑（实证分工）。
> **裁决：GO_WITH_CONDITIONS**（P0=0；P1=3 收口执行条件；P2=4；N=4）。无回炉必要——门一 B1/W1 回炉经独立复扫成立，终稿可交付；全部条件落在主控收口序的执行面。

## ① 逐条裁决表（A~J）

| # | 原判断（审包断言） | 裁决 | 依据摘要 | 证据（file:line） |
|---|---|---|---|---|
| A | 门一 B1 回炉兑现：平铺旧径 0+INV-47 现行径+三处计数一致 | **成立** | 我独立 grep：`features/reader/` 全册 12 命中=11 行域前缀（:34/:48/:54/:61/:62/:70/:72/:73/:75/:76/:78）+1 行 :97 元叙述（`features/reader/<平铺>` 旧模式引用）；负向 lookahead 扫六域外=仅 :97 一处且非旧径。INV-47 :62=全路径 `src/renderer/features/reader/anchors/annotation-anchor.ts`（文件已亲验存在）。补强交叉印证：impl-brief 预列的回炉前 11 行行号 {34,48,54,61,62,70,72,73,75,76,78} 与现文件域前缀行**逐号相同**；patch `-` 侧平铺旧径恰 11 次刷新、`+` 侧 0 残留。三处书面「11 处」与册面实态一致 | docs/invariants.md:62,:97；scripts/audits/g11-gate2-diff.patch:9,18,25,33,34,44,47,48,52,53,57（旧）/10,19,26,35,36,45,49,50,54,55,58（新）；g11-impl-brief.md:25-28；docs/reports/2026-09-18_f-geom01-campaign-closeout.md:117-121；g11-impl-report.md:14,109-117 |
| B | 探针补强=真防线（未修复态会 FAIL）+v1/v2 双档并存 | **成立** | 亲读探针 [0] 段逻辑：正则 :51，判定 :61-68「段非六域且文件不存在=FAIL」，missing 驱动 EXIT=1（:111-113）。非恒真论证：未修复态下 :62 平铺路径→p=`annotation-anchor.ts`、非六域、existsSync=false→inv_path_bad=1→EXIT=1。v1 档（31 行，无 [0] 段）与 v2 档（43 行，含 [0]，inv_paths=10/inv_path_bad=0）并存互不覆盖 | g11-inv-anchor-check.mjs:47-72,111-113；g11-inv-anchor-check.log:1-31；g11-inv-anchor-check2.log:1-11,41-42 |
| C | e2e 双门 EXIT 亲读+flake 未触发纯绿+台账零 diff | **成立** | 双 log EXIT 标记为文件**末行**物理印记（43 passed/45 passed）；全 log 无 failed/skipped/flaky 字样。flake-ledger count=5、unpursued 原样；patch 文件清单不含 flake-ledger（零 diff）。指纹门含于 verify | g11-e2e-appgate.log:90-91；g11-e2e-allgate.log:92-93；docs/audits/flake-ledger.json:69-75；g11-gate2-diff.patch 文件清单（:1,91,247,300,314,1677）；g11-impl-verify2.log:27-29 |
| D | 构建恒等链第八票：三产物 sha 与 g8/g10 前链亲比 | **成立（64 位全同）** | 我逐值亲比：js `9c3b8b84…ca3f2a`、css `dcace2e7…a97d5`、worker `1baa1844…be36` 在 g11 两档与 g8（js/css）、g10（PRE/POST 三件）**完整 64 hex 同值**；尺寸 1,402,437/59,923/1,375,838 件件一致。门一 N4 前链不确定项闭合 | g11-build-hash.log:5-11；g11-build-hash2.log:4-9；g8-build-hash.log:4-5；g10-build-hash.log:6-8,16-18 |
| E | 记账全表算术独立复算 | **成立（净额面；毛额面注 P2-2）** | 亲算：Σfiles 10+4+14+7+8+27+1=71；Σ+313=8+5+160+48+21+71(+0)；Σ−309=8+5+88+55+21+112+20；净 +4 与逐域净和 0+0+72−7+0−41−20 双route 一致。逐票 +428(140+24+26+238)/−424(110+61+15+238)，Σnet=30−37+11=+4；迁移七票 Σ+238/−238 ✓。wc 1445+829+3121+1259+1173+3988=11,815，Δ+1 文件/+24 行，11,791+69=11,860 ✓。G2 删 26+33=59∈[50,60]（+2=61）✓。N2 销项：现值侧我以 Glob 亲核 reader 全树 **70=39 ts+30 tsx+1 css**（零非代码），基线侧见 P2-3 | g11-netstat.log:4-11,13-19,90-92；closeout:18-70；g11-impl-report.md:135-138（§8.4） |
| F | INV-68 十三锚独立抽核 ≥4 | **成立（13/13 全核）** | 亲读**全部 13 处**行内容命中：pdf-item-geometry:366 bandsFromItems 定义/:506 产出行；annotation-resolve:209/:237/:277/:302；selection-evaluate:43/:130/:207/:292/:296；AnnotationLayer:98；band-calibrate:77。与两档 log 全 PASS 互证 | 上述 6 文件各锚行（亲读）；g11-inv-anchor-check.log:2-14；g11-inv-anchor-check2.log:13-25 |
| G | 基线同值冻结+exemptions 保留裁决成立性 | **成立** | stats 亲核 187/1789/5411/skip15/eachRows261；前→后 183/1757/5334→187/1789/5411、875 行 diff、check 绿。豁免「惰性」论证：checker 仅在失配候选时咨询豁免（:252-256/:307-309，键=file+caseTitle 精确），两条旧题名均已不在新基线（baseline.json:16943/:16947 为新题名），运行态 hits=0/stale=2——**无法静默掩蔽现值面，裁决成立**；仅存「旧题名被未来基线原样重引入再删除」的极窄理论面（N-1） | scripts/test-surface.baseline.json:26207-26216,16943-16947；g11-baseline-diff.log:4,7-8,26-31；scripts/test-surface.exemptions.json:4-15；scripts/check-test-surface.mjs:89-98,252-256,307-309；g11-impl-verify2.log:27-28 |
| H | 红线（tests/registry/src 非注释行/relay/b22）+回炉计数+翻票未越权 | **成立** | patch 仅 6 文件；无 tests/**、registry.ts、relay.md、b22 log；唯一 src hunk 全注释行（`:1681-1707` 行首 `*`/`//`），consume 面未动；registry :302 G11 与 :280 母票**均仍 open**；回炉 #1=1 次（≤2）。测试消费面「9 处」我 grep 实证=8 件 import type+1 件组件本测，file:line 与头注逐字一致 | g11-gate2-diff.patch:1677-1707；tickets/registry.ts:280,302；tests/unit/renderer/{text-layer:41,pdf-item-geometry:18,anchor-item-verify:33,annotation-layer:21,ai-annotation-layer:25,pages-overlay:30,band-calibration:35,reader-search-text:21,pdf-page-canvas:23}；g11-impl-report.md:105-145 |
| I | 收口序预批（六步） | **条件成立（P1×3）** | 与包内证据相容的部分：open 10→双翻→8 ✓（恰好两票）；relay 现 `- [x]`=26（grep count=26，:112/:144 未勾）→双勾=28 ✓；终跑 verify 的 170/1744/指纹门/build 口径已在双 verify 档预演。三处修正见 P1-1/2/3 | g11-impl-verify2.log:38,3825；docs/handoff/relay.md:112,144（未勾行）；relay.md:349-353,250（教训/先例） |
| J | 证据件名册预核 | **勘误 2 处（非阻断）** | 逐件实测：.md 6 件（gate2-report 待本报告归档生成）/patch 2 件/.mjs 2 件/.log 11 件/b22 log/六改动文件——除 P1-3 两处外全部在档 | scripts/audits/ 全目录 Glob + b22-recovery-verify.log 在档 |

## ② 独立复算记录（关键数字重推，不采信转述）

1. **域分组**：71 files、+313/−309、净 +4（上文 E）——与 netstat log 和 closeout §1.1 表逐位一致。
2. **逐票**：Σ+428/−424、净 +4 自洽（telescoping：逐票链净额和=段净额，恒等式成立）。**未佐证项点名**：逐票毛额与段毛额差 +115/−115（Σ428−313）——机制（链式中途改写双计）未在报告注明，见 P2-2；逐票原始 numstat 属 git 侧，只读面不可重取（gate1 N5 同边界），包内只能核到和式与净额。
3. **wc**：11,815 vs 11,791，Δ+1 文件/+24 行；11,791+69=11,860（设计书口径差机制）✓。现值侧同域性我已独立实测（70 文件全为 ts/tsx/css）。
4. **指纹门/基线**：187/1789/5411/skip15 双档 verify 同值；before 183/1757/5334；875 行 diff；+4 新增测试文件（atomic-write/domain-error/sanitize/app-file-url）四件在档，与 +4 文件自洽。
5. **恒等链**：sha256 三件×最少两档 64 hex 全同（D 行）。
6. **INV 锚**：13/13 行号+符号亲核命中，0 漂移 0 缺失。
7. **未转述核项**：探针源码逻辑（B）、check-test-surface 豁免咨询路径（G）、flip/relay 计数（I）、9 处消费面（H）均为亲读/亲扫。
8. **无佐证断言点名**（包内不可独证，如实标注）：基线侧`af946a5324`非代码扩展=0 仅 impl-report §8.4 自报；e2e「两门串行跑」为流程声明（无时间线档）；工作树全貌（未列第七文件）依赖 patch 完整性——patch 面 0 命中+staging 显式清单兜底（N-4）。

## ③ 回炉建议与优先级

**回炉建议=0 件**（无返工面；门一 B1/W1/N2 回炉四件全部兑现且经独立复扫）。收口前条件与观察项如下：

**P1（收口执行前必办）**
- **P1-1 翻票脚本的锁面**：`g11-tickets-flip.mjs` 目前不存在（仓内仅 g10-tickets-flip.mjs 先例）。若按 G10 惯例落仓保留 → check-locks 的 walk（scripts/**/*.mjs，check-locks.mjs:48）即时覆盖，**必须先 locks:generate+apply，终跑 verify 读数=371 而非 370**；若用毕即删（g4/g9 先例：仓内仅存 flip log）则 370 维持。brief「翻票不改锁面」仅对 tickets/registry.ts 与 relay.md 成立（二者不在 locks/manifest.json 面，已 grep 证）。
- **P1-2 收口序⑤/⑥次序写反**：教训原文「health-scan 必须在账本终态后跑」（relay.md:352-353），G10 先例「账本 65→68 终态后跑」（relay.md:250）。须**先⑥账本补记（findings 对象形——字符串形过不了 findings-parser，relay.md:349）后⑤health-scan**；按简报字面 ⑤→⑥ 执行=复现 G9 时点缺陷。
- **P1-3 J 名册两处勘误**：(a) `g11-inv-anchor-check2.mjs` 不存在——双档并存的是 **log**（v2 落 g11-inv-anchor-check2.log），按名单 `git add` 将报 pathspec 错；(b) 名单缺 `g11-tickets-flip.mjs`+其 log（若落仓）与 `tickets/registry.ts`、`docs/handoff/relay.md`（双翻必然改动面）——staging 显式清单须补。

**P2（建议收口顺手处理）**
- 构建尺寸口径：closeout §3 用 vite 展示值（1,392.72kB/52.49kB，rollup 字符串长度基数）与字节实测（1,402,437/59,923 B，build-hash 档）并存未互注；路径名 `dist/` 实为 `out/renderer/assets/`——建议统一字节口径或注明。
- §1.2 毛额差 ±115 未注机制；§1.4「删侧吻合」131 vs 模型 90~120 略越上界、项 4「~37」为无推导近似——补 numstat 行/机制句即可（不涉净 +4 结论）。
- 基线侧非代码扩展=0 无 raw log（现值侧我已亲核）；建议后续票保留测量命令输出。
- 探针 [0] 盲区两处已披露：正则要求 `(src/)?renderer/features/reader/` 前缀（无 renderer/ 平铺写法不入扫描）、域内路径缺席仅注记非 FAIL——当前册面 0 残留不受影响，建议后续票补强并写明判定面边界。

**N（注记，不断点）**
- 豁免 2 条保留裁决成立；建议后续票清理 stale 或加 stale 阈值提示。
- e2e 串行为流程声明（包内不可独证）；EXIT 物理尾标记已亲读。
- brief 谓终稿 patch「1709 行」vs 实读 1710 行（尾换行 wc 口径差），不涉结论。
- 工作树全照不可独证类残项（gate1 N3 同边界）：patch 面 0 命中+staging 显式清单+提交后 health-scan 兜底。
