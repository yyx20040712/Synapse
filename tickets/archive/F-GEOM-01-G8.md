# F-GEOM-01-G8 票面归档（F-GOV-01）

- id: F-GEOM-01-G8
- file: src/renderer/features/reader/panels/ReaderNotesPanel.tsx
- area: reader
- owner: strong
- status: done

## summary 原文

目录化 M5=panels/ 域迁移（设计书 §3.4；8/11）：8 文件迁 reader/panels/——OutlineAside/OutlinePanel/OutlineThumb/ReaderNotesPanel/AiNotesSection/AiNoteGroupList/AiNotesStatus/FragmentNotesList；受锁面=notes/outline 系测试 import+check-quality.mjs:96-97 两路径（ReaderNotesPanel）随步同链；域间单向=panels→anchors/state 核验（§3.1）；翻 done 时 file 随迁改写；验收=verify 全链；[locked-change][test-refactor]

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
