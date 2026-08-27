# SR2-AI-09 实现者报告 —— AiAnnotationLayer（AI 标注渲染对等）

日期：2026-08-27 ｜ 实现者子代理（strong，三屋模式）｜ 工单状态：open（registry 翻状态归人类/主控收口）

## 摘要

- AiAnnotationLayer 落地：AI 锚定段经 verifyQuote 重锚（annotation-anchor 唯一 DOM
  遍历点）→ findRangeAtOffset 同几何管线渲染高亮块；分色=ai-note-style
  QUESTION_COLOR 单源；重锚失败该段不渲染 rects；篇级/无锚行不入层；点击=该段
  全部 rects 高亮+onJumpToNote 上抛（不弹菜单，只读，INV-19）。
- 渲染节点带 data-ai-note-id；anchor-locate exact 层延展（LocateTarget.aiNoteId
  → flashAiNote 滚动+闪烁，三防线结构不动，annotationId 既有行为保留）；
  AiNotesSection 条目单击随锚传 aiNoteId（W08-3 对侧兑现）。
- 数据流定式（主控裁决 1）：ReaderPage 经 ReaderAiLayer 宿主装配（AiAnnotation
  Layer.tsx 内导出）订阅 ai-notes.store 单源分发 props；点击上抛→reader.store
  notifyAiNoteHighlight 信号（C-05 notifyNoteHighlight 同型）→OutlineAside 切笔记
  tab+highlightAiNoteId 分发 ReaderNotesPanel→AiNotesSection→AiNoteGroupList
  （data-highlight+滚动进视野）。
- 重锚缓存按 paperId+页键失效（cacheKey，键变即弃旧 rects 重算——翻页/换篇用例覆盖）。

## 文件清单

实现面（均非受锁）：
- src/renderer/features/reader/AiAnnotationLayer.tsx（实现+ReaderAiLayer 宿主装配，205→209 行 ≤250）
- src/renderer/features/reader/anchor-locate.ts（exact 层延展：aiNoteId+flashAiNote）
- src/renderer/features/reader/reader.store.ts（aiNoteHighlight 信号+notifyAiNoteHighlight）
- src/renderer/features/reader/OutlineAside.tsx（消费信号：切笔记 tab+分发）
- src/renderer/features/reader/ReaderNotesPanel.tsx（highlightAiNoteId 透传）
- src/renderer/features/reader/ReaderPage.tsx（挂 ReaderAiLayer，247 行 ≤250）
- src/renderer/features/reader/AiNotesSection.tsx（onLocateNote 传 aiNoteId+头注接缝更新）
- src/renderer/features/reader/AiNoteGroupList.tsx（高亮条目滚动进视野）

测试面（tests/** 受锁，unlock→改→generate→apply 全程留痕）：
- tests/unit/renderer/ai-annotation-layer.test.tsx（新增 [locked-change]，9 用例）
- tests/unit/renderer/ai-notes-section.test.tsx（1 断言随契约演进更新——见自裁申报）
- tests/e2e/ai-notes-section.spec.ts（新增 09 用例 [locked-change]）

## 红证四档（TDD）

1. 红：tests/unit/renderer/ai-annotation-layer.test.tsx 首跑套件失败（组件 props/
   anchor-locate 延展未实现），scripts/audits/ai09-red.log，exit=1。
2. 绿：npm run test 77 文件 491 用例全过，scripts/audits/ai09-green.log，exit=0。
3. 断言级变异红证（cp 备份法，禁 git checkout；还原后 diff 空输出已入日志，
   scripts/audits/ai09-mutation.log）：
   - M1 去 onJumpToNote 上抛 → 点击用例红（1 failed）；还原 diff 空。
   - M2 去 anchor-locate aiNoteId flash 分支 → exact 滚动闪烁用例红（npm exit=1）；还原 diff 空。
   - M3 分色变异（QUESTION_COLOR→硬编码他色）→ 分色用例红（npm exit=1）；还原 diff 空。
   （注：M1 行的 exit=0 是 grep 管道退出码，红由 FAIL 行证明；M2/M3 已改用 npm 真退出码。）
4. verify 终局：scripts/audits/ai09-verify.log，exit=0。

## 测试证据

- 单测：tests/unit/renderer/ai-annotation-layer.test.tsx 9 用例 always-active：
  verifyQuote 真→rects+data-ai-note-id+七问分色 / 重锚失败零 rects 他段不受扰 /
  篇级无锚不入层 / 点击高亮+上抛+只读（无菜单无编辑元素）/ 翻页缓存失效重算 /
  anchor-locate aiNoteId exact 滚动+闪烁 / annotationId 既有行为不回归。
- e2e：scripts/audits/ai09-e2e.log，15/15 passed（基线 14→15）。新用例：fixture
  导入含锚行（quote=PDF 真实渲染文本）→AI 高亮块可见（真 textLayer 重锚——
  渲染真实文本断言）→点击→侧栏切笔记 tab+对应条目 data-highlight 可见。

## locks 实录

- 受锁面：tests/unit/renderer/ai-annotation-layer.test.tsx（新增）、tests/unit/
  renderer/ai-notes-section.test.tsx（1 断言更新）、tests/e2e/ai-notes-section.spec.ts
  （扩用例）。流程：locks:unlock → 批内改 → locks:generate（117→118）→ locks:apply
  → verify 内 locks:check 通过（118 一致）。提交须带 [locked-change] 尾注。
- anchor-locate.ts / ReaderPage 等实现文件非受锁，无 unlock 需求。

## 自裁申报（超票面决定）

1. **受锁 08 单测断言更新**：tests/unit/renderer/ai-notes-section.test.tsx 条目单击
   用例 toHaveBeenCalledWith 精确匹配旧调用形状；票面强制的 aiNoteId 传递（W08-3
   对侧兑现）使该断言必然红。最小更新=期望对象加 `aiNoteId: 'a1'`（+注释）。
   属受锁合约演进，请门审/主控追认；若不认可可回退该字段传递（exact 延展本身
   及其用例不受影响）。
2. **store 信号替代纯 props 链**：onJumpToNote 接线采用 reader.store
   notifyAiNoteHighlight（C-05 notifyNoteHighlight 的实际形态即 store 信号——侧栏
   tab 态住 OutlineAside 本地，纯 props 无法驱动切 tab）。与简报「照 C-05 同型」
   一致，与「ReaderPage/面板 props 链」字面有出入，按「具体宿主形态以 08 现有
   实现为准」取 store 形态。
3. **ReaderAiLayer 宿主装配组件**：ReaderPage 加接线后超 250 行（quality 关卡红），
   将 ai-notes.store 订阅+点击上抛封装为 AiAnnotationLayer.tsx 内导出的
   ReaderAiLayer（ReaderPage 247 行达标）。
4. **open 期 data-ticket 保留**：check-tickets 规约 4 要求 open 工单 tsx 渲染
   data-ticket 占位——实现版在层容器保留 `data-ticket="SR2-AI-09"`（含删除注释），
   registry 翻 done 时随收口删除（规约 4b 才允许去除）。
5. **flashAiNote 目标优先级**：data-ai-note-id 同属性值也出现在 08 面板条目
   （AiNoteGroupList）——flash 优先取 reader-aside 之外的渲染 rect（定位语义=在
   PDF 里看见该段），面板命中兜底；已注释声明。
6. **删减面 diff 自查**：git diff --stat 共 11 文件（8 实现+3 测试+manifest），
  无范围蔓延；未触碰 AnnotationLayer.tsx/annotations 相关 ipc/services/repos/迁移。
   未跟踪 dist_new/ 目录非本单产物（未动）。
7. **INV-19 annotations 写面零触碰证明**：diff 文件清单不含任何 annotations 写
   路径文件（AnnotationLayer/annotation-undo/reader.service/annotations.repo 均
   未修改）；AiAnnotationLayer 零 DB/零 IPC（纯 props 消费），grep 无
   api.reader/insertAnnotation 引用。

## 疑虑

- ReaderPage 换文献丢弃旧页文本的 effect 被压缩为单行（内容不变，行为等价）——
  纯行数达标需要，如嫌可读性损失可收口时还原两行式。
- AI 段视觉用 0.45 透明度+选中描边与用户标注区分（票面未定具体样式），供门审裁量。
