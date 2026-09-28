# SR2-AI-12 票面归档（F-GOV-01）

- id: SR2-AI-12
- file: src/renderer/features/reader/anchors/ai-note-style.ts
- area: reader
- owner: strong
- status: done

## summary 原文

AI 笔记组头补原始命题（b3: P7-G；复测缺陷 P2 修复——组头仅「第N问」短标签读者对不上号，七问原始命题仓内零存在唯一源=蓝图 §4.2 表：QUESTION_TEXT 映射新增（七值机器抽取 diff 证逐字誊自蓝图；类型 Record<Exclude<AiNoteQuestion,divergence>,string>——divergence 为角色节非七问成员保持短标签，Exclude=编译器强制两消费位分歧唯一形态）+两消费位组头拼「第N问：原始命题」（AiNoteGroupList h4+LineageSideAiNotes h5——跨域单源自动同达合 INV-11）；纯 renderer 呈现面零 IPC 零 shared；受锁必然红 5 处先行留证（ai-notes-section×3+lineage-side-panel:291+e2e 两 spec）+ai-note-style.test TEXT 键集非空新 it；联审 0B/3W/5N PASS——誊录逐字性联审独立机器重演 diff 空，W3 Q4~Q7 文案持续锁定缺口记遗留池（键集断言拦键漂移不拦值漂移））[locked-change]——票面 scripts/audits/sr2-ai-12-brief.md；依赖 AI-11 转置组头位

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
