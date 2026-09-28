# F-GEOM-01-G6 票面归档（F-GOV-01）

- id: F-GEOM-01-G6
- file: src/renderer/features/reader/anchors/annotation-anchor.ts
- area: reader
- owner: strong
- status: done

## summary 原文

目录化 M3=anchors/ 域迁移（设计书 §3.4；6/11——受锁面最重迁移步）：13 存量+geometry-types（G1 产物）迁 reader/anchors/——pdf-item-geometry/annotation-anchor/annotation-merge/annotation-resolve/annotation-resolve-layered/annotation-band-calibrate/anchor-serialize/anchor-blank-snap/anchor-locate/page-items.store/open-paper-anchor/annotation-style/ai-note-style+geometry-types；受锁面=anchor-locate 跨特性消费 import 改向（lineage×2+open-paper-bus——§5.2 风险 3 一次改向+check-quality 跨域规则同步核）+锚定回归网 18 物理件 import（§5.1 名单 17 项中 selection-layer×2=selection-layer.test+selection-layer-fa12.test 双文件——tests/unit/renderer ls 实测=18；selection-evaluate/selection-layer×2/selection-item-chain/selection-geometry/selection-paint/selection-mode/annotation-anchor/annotation-layer/ai-annotation-layer/annotation-merge/anchor-blank-snap/anchor-item-verify/anchor-locate/band-calibration/pdf-item-geometry/pages-overlay/pdf-page-canvas）+pdf-factory（CorpusExtractor import）；验收=verify 全绿+锚定回归网专项跑；翻 done 时 file 随迁改写；[locked-change][test-refactor]

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
