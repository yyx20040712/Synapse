# F-GEOM-01-G5 票面归档（F-GOV-01）

- id: F-GEOM-01-G5
- file: src/renderer/features/reader/time/reading-time-outbox.ts
- area: reader
- owner: strong
- status: done

## summary 原文

目录化 M2=time/ 域迁移（设计书 §3.4；5/11）：4 文件迁 reader/time/——reading-time/reading-time-setup/reading-time-outbox/reading-time-outbox-store；受锁面=reading-time 系测试 import 同链 unlock→改→apply；域间单向=time→state 核验（§3.1）；翻 done 时 file 随迁改写；验收=verify 全链；[locked-change][test-refactor]；【file 锚随迁 2026-09-19 F-TIME-02】原锚 reading-time.ts 已随时长功能移除整件删除——file 锚改指同域存留件 reading-time-outbox.ts（time/ 域本身存续，outbox 三件留驻）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
