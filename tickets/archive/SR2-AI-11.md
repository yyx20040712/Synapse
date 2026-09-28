# SR2-AI-11 票面归档（F-GOV-01）

- id: SR2-AI-11
- file: src/renderer/features/reader/panels/AiNoteGroupList.tsx
- area: reader
- owner: strong
- status: done

## summary 原文

AI 笔记呈现轴转置（b3: P7-G；验收缺陷 F 修复——用户口径「问题一+一审:xxx。二审:xxx。裁决:xxx。」：groupNotes 按 AI_NOTE_QUESTIONS 单源序转置（{question,items}，空组剔除）+组头 QUESTION_LABEL 分色条+组内条目头 ROLE_LABEL 分段（QUESTION_LABEL 被顶替防冗余——门一核准贴口径，anchorPage/色点保留）；ROLE_LABEL 单源改值「一审/二审/裁决」（消费方两处=面板+脉络侧板——票面「三消费方」取证误差坐实，AiAnnotationLayer 仅消费 QUESTION_COLOR）；LineageSideAiNotes 同步转置不抽件（Rule of Three 维持）；shared 零触碰；受锁 3→5 扩容（门一核准必然红：lineage-side-panel.test+lineage.spec T4 接缝归责同步）；e2e ai-notes-section 2 test+lineage.spec T4 改写）[locked-change]——票面 scripts/audits/sr2-ai-11-brief.md；依赖 AI-08 分节件+AI-09 高亮

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
