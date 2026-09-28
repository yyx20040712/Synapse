# F-GEOM-01-G4 票面归档（F-GOV-01）

- id: F-GEOM-01-G4
- file: src/renderer/features/reader/state/reader.store.ts
- area: reader
- owner: strong
- status: done

## summary 原文

目录化 M1=state/ 域迁移（设计书 §3.2/§3.4；4/11）：10 文件迁 reader/state/——reader.store/tab-dirty/useActiveTab/annotation-undo/page-layer-z/ai-notes.store/ai-notes-phase/PdfDocProvider/CorpusExtractor/scroll-converge（scroll-converge 三消费方 anchor-locate/usePageColumnScroll/scroll-progress 置底避免 anchors→view 反向边——W7 处置；CorpusExtractor=终裁补列件）；受锁面随步同链 unlock→改→apply=CorpusExtractor 相关测试 import（corpus-extractor/corpus-export/pdf-factory）+eslint.config.js INV-16 块 PdfDocProvider/CorpusExtractor 两路径（四路径分步随迁首步）；域内单向核验=state 不依赖任何域（§3.1 置底）；翻 done 时 file 字段随迁改写 state/reader.store.ts（SR-RDR-02 先例）；验收=verify 全链；【收口 2026-09-18 batch16】受锁面实勘勘正=tests 30 件/41 行（票面 3 件系设计书 §3.4 起草漏计，pdf-factory 实为注释提名零 import 面）；实现者终验 tickets 红 18 行三类（9 路径不存在+4 占位+5 guardedDescribe 映射）全因 registry 随迁=主控后置面——九行落妥后 verify 全链 EXIT=0（g4-verify-master.log）；门一 PW B0W1N6（W1=报告 tests 括注枚举失实，勘误 :39）/门二 GWC P0=0P1=1P2=3N=6 全兑现（staging 名册 26 件实测校准+open 17→16+翻 done 前置本步）；[locked-change][test-refactor]

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
