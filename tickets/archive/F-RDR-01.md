# F-RDR-01 票面归档（F-GOV-01）

- id: F-RDR-01
- file: src/renderer/features/reader/interact/selection-evaluate.ts
- area: reader
- owner: strong
- status: done

## summary 原文

选区空白区下拖「先选下→约半秒回正」闪烁修复（设计文档 §2.6 P7，D8=三段设计链已毕——**设计定稿=docs/design/2026-09-20_f-rdr01-design-final.md（主控终裁 12 修正，实施以定稿为准）**，链档=仓外 f-rdr01-{design-kimi,review-ds,design-kimi-v2,review2-ds}.md 两轮拟定两轮审）；【毕 2026-09-20 三屋全链】A 路径=anchor-blank-snap.ts snapVisualBoundary（守卫 closest(.textLayer)/末行判据[标记中心越过真实文本末行盒底，空白标记不入行构造防自吞——行源同一性 W-6 头注]/rowEndOf 复用零行尾几何）+markerAt/isBlankMarker 导出（修正 12 约束）；B 路径=selection-evaluate.ts TTL=100ms 三函数+visual() 插桩 B 前 A 后（修正 1）+**docOrderPair**（[W-4 回炉真修]包含形态 compareBoundaryPoints 点对点——旧患包含错序静默降级被判别用例+变异 M-B 钉死）；SelectionLayer mark/clear 接线（免缓存修正 3）；测试=10 it（A 三态对拍/TTL 99/100/101/主路径/W-4 反向+包含判别锚）+探针 z-f-rdr-01（S4 起无减序+末帧==末行底 0.0px+[门二 C1 强化]s4Idx≥0 下界+post 非空）+变异五面（守卫/TTL/序调换/包含回退/判据反转）全还原 diff 空；门一三跳（FAIL B-1 审包缺 diff→补发→回炉三证→**PASS B0/W0/N7**）+门二 GO（C1 探针假绿通道独立发现+四链交叉互证——C1-C3 主控自为修+终验）；verify 亲验 EXIT=0（169/1746/locks 250/指纹门新基线 189·1794·5463·skip15 三轮冻结）+reader-text 17 passed+锚定回归网绿+model-names 0；性能暖段 max 1.000ms/中位 0.300（口径注档）；**移交用户 UAT=真实 PDF 全程拖选终证**（合成夹具 A/B 判别不可达申报）；批档=仓外 f-rdr01-batch-record.md（含 W-2 黑洞指纹+主控双失误教训[翻票注记引号+编辑后必重验/审包 diff 全文硬要求]）；[locked-change][test-refactor]（两新测试件/manifest/baseline/exemptions 248→250）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
