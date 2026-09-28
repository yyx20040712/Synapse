# F-TIME-02 票面归档（F-GOV-01）

- id: F-TIME-02
- file: src/renderer/features/reader/time/reading-time-setup.ts
- area: reader
- owner: strong
- status: done

## summary 原文

阅读时长功能移除（用户裁决 2026-09-19 第六档——查证 Zotero/Mendeley/EndNote/ReadCube 均无内置时长统计，条件成立裁决生效；取代 F-TIME-01 五档降档）：删计时器（reading-time.ts 本体+visibility 门+tick）+落库链（reading_seconds 列 009 DROP COLUMN 新增 migration/papers.repo 第三参/schemas secondsDelta/shared PaperDetail.readingSeconds）+显示行（PaperDetailPanel 阅读 Row+reading-time-format.ts）；**页码链零触碰**——outbox 机制保留（P7X-02 后为页码三收尾口通道），仅删时长载荷（OutboxEntry.seconds/enqueueReaderProgress 三参化二参/chunkSeconds/复合 flusher 退化页码单发）；件名 reading-time-* 保留（头注说明沿革，防改名面扩大）；受锁面重=shared 模型+schemas+migrations 新增+受锁测试删除/改写（unit 6 件+e2e 2 件+fixtures 路过面 5 件+factories）+test-surface 指纹门收紧豁免（reason=用户裁决 2026-09-19 板面增补二 rulingLink）+check-quality/eslint 白名单随迁；INV-57（时长账本唯一宿主）随票退役登记；[locked-change][test-refactor]；中票

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
