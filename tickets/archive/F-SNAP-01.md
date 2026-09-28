# F-SNAP-01 票面归档（F-GOV-01）

- id: F-SNAP-01
- file: src/renderer/features/reader/anchors/anchor-blank-snap.ts
- area: reader
- owner: strong
- status: done

## summary 原文

anchor-blank-snap 撞名常量语义化（v57 §2-8 观察候选——F-LINT-03 收口备案「局部同名不同值易埋雷」）：本件局部 COLUMN_GAP_MIN_PX=20/COLUMN_GAP_H_FACTOR=2.5 与 pdf-item-geometry export 的 COLUMN_GAP_H_FACTOR=1.5 同名不同值不同用途（DOM 量测侧 vs pdf item 侧）——读者/import 混引风险;**收口 2026-09-10 三屋全链（主控自为实现——先例 F-AUDIT-01）**：改名 BLANK_SNAP_GAP_MIN_PX/BLANK_SNAP_GAP_H_FACTOR（声明 2+消费 2 全替换）+注释三行重写（明示与 pdf-item-geometry 同族判据值域区分 2.5 vs 1.5+撞名收敛由来）;零行为差实证=test 16/16 零漂移（行为锚不锚名——tests 对新旧名均零命中）+typecheck 双 project+B-1 红层 0（**措辞更正[门一 W]：红层判据=同名+同值跨 ≥2 文件,与 export 无关——本票不入红层真因=2.5≠1.5 同名不同值,非「局部常量免 B-1」;两个非 export 同名同值 const 跨文件同样红**）+新名全库唯一 4 处仅本件+本件旧名余 1 处=注释指名 pdf-item-geometry 侧（那边名字不变）;门一 GLM 同源降级（§4.5 可省面=≤3 文件小批非受锁——A/B/C/D 全 N+1W 措辞）+门二统一档 PASS 无条件（亲跑矩阵:16/16/grep 唯一性/dup-constants 红层 0/diff 两文件/typecheck 补跑 exit=0）;verify 全链 exit=0 亲验

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
