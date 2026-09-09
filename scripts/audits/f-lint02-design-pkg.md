# F-LINT-02 设计任务书（第一跳：三案拟定——Kimi）

## 0. 票面（registry F-LINT-02）

B-1 同值双常量 lint 机器化（F-LINT-01 终裁档 §2 扩展面头票）:**设计链三跳强制**（跨文件聚合=架构问题——eslint 单文件 lint 隔离模型下 B-1 需独立聚合 pass 前置设计:Kimi 拟定三案[独立扫描脚本/eslint 复合 pass/AST 全域收集——含白名单边界:泛值 0/1/-1/空串/true/false+跨文件限定+常量名前缀规则]→deepseek 对抗审核→GLM5.3 终裁）;**设计期存量 dry-run 铁律前置**（⑤i 教训:设计书必须附存量统计输出——跨文件同值双常量实测清单,B-1 假阳面设计期即暴露）;终裁版实现+先红证（植入跨文件同值双常量反例→红→还原）+存量零误报+verify 全链;B-2 常量旁落清单/B-6 同名类型豁免/C-3 重复字面量 warn 随设计一并评估（合派或另立终裁定）;受锁面按终裁（eslint.config.js 或 check-quality）

## 1. 设计期存量 dry-run（⑤i 条款——已跑，全文见随附）

- 扫描面：src/** 生产面 214 文件（.test. 除外），模块级字面量值 const 声明 138 个/去重值 103。
- **跨文件同值组 18 组**（原始输出随附文末）。
- 显著假阳面：①文案常量（操作失败×7 文件——语义各表，跨 feature 复用同文案）②泛值（2/3/0.5/200/50/32 等——数字巧合海）③语义无关同值（HTTP_TIMEOUT_MS 15_000 等）。

## 2. 设计任务

拟定**三案**（票面预列方向：独立扫描脚本 / eslint 复合 pass / AST 全域收集——可越此列但须论证）。
每案必须覆盖：

1. **架构**：聚合 pass 形态（独立 npm script？eslint 插件规则？CI 关卡挂点？）——eslint 单文件隔离模型下跨文件聚合的实现路径。
2. **白名单边界**（从 18 组存量反推）：
   a. 泛值豁免清单（0/1/-1/true/false/空串——票面预列；从存量看 2/3/0.5/50/200/32 等小数值是否也须豁免？给出判据：值域豁免 or 字面量类型豁免 or 两者复合）
   b. 文案常量豁免形态（中文 UI 文案×7 文件——按值含 CJK 豁免？按命名后缀 _TEXT/_LABEL 豁免？给出判据）
   c. 跨文件限定（同文件同值多声明是否豁免——Rule of Three 口径？）
   d. 常量名前缀规则（命名空间约定如共享常量须 export 自 shared/——违反者红？）
3. **存量处置**：18 组按白名单过滤后剩余真命中几组？逐组定性（真重复待收敛 vs 白名单漏网）。
4. **验收面**：先红证配方（植入反例）+存量零误报推演+verify 挂点。
5. **B-2/B-6/C-3 随评**：常量旁落清单/同名类型豁免/重复字面量 warn——合派本票 or 另立，给建议。
6. **受锁面与成本**：实现落点（eslint.config.js/check-quality/新脚本——受锁面差异+维护成本）。

## 3. 输出

设计书全文（Markdown）——三案各一节（含上述 6 点）+推荐案+理由。直接给全文，不要省略号。

## 4. 存量 dry-run 原始输出（随附）

扫描文件：214（src 生产面，.test. 除外）
字面量值 const 声明总数：138（去重值 103）
同值跨文件组：18

值 '操作失败'（7 文件 / 7 声明）
  src/renderer/features/library/usePaperDetailActions.ts: ACTION_FAILED
  src/renderer/features/reader/AiNotesStatus.tsx: ACTION_FAILED
  src/renderer/features/settings/ZcodeLinkSection.tsx: ACTION_FAILED
  src/renderer/features/settings/SettingsPage.tsx: OP_FAILED
  src/renderer/features/settings/UiScaleSection.tsx: OP_FAILED
  src/renderer/features/workspaces/WorkspaceSection.tsx: OP_FAILED
  src/renderer/features/workspaces/WorkspaceSwitcher.tsx: OP_FAILED

值 2（4 文件 / 5 声明）
  src/shared/constants.ts: HTTP_MAX_RETRIES
  src/renderer/features/reader/annotation-anchor.ts: HEIGHT_RATIO_MAX
  src/renderer/features/reader/annotation-anchor.ts: INTRA_ROW_GAP_PX
  src/renderer/features/reader/pdf-item-geometry.ts: SELECTION_RIGHT_OVERFLOW_PX
  src/renderer/features/lineage/lineage-classify.ts: CORE_MIN_OUT_DEGREE

值 3（5 文件 / 5 声明）
  src/renderer/features/library/PaperRow.tsx: MAX_TAG_BADGES
  src/renderer/features/reader/SelectionLayer.tsx: DRAG_SELECT_THRESHOLD_PX
  src/renderer/features/reader/pdf-item-geometry.ts: ZOOM_SCALE_MAX
  src/renderer/features/reader/AiNotesStatus.tsx: POLL_FAIL_THRESHOLD
  src/renderer/features/lineage/LineageCanvas.tsx: DRAG_THRESHOLD

值 0.5（2 文件 / 4 声明）
  src/renderer/features/reader/annotation-anchor.ts: DEDUP_EPSILON_PX
  src/renderer/features/reader/annotation-anchor.ts: HEIGHT_RATIO_MIN
  src/renderer/features/reader/pdf-item-geometry.ts: ZOOM_SCALE_MIN
  src/renderer/features/reader/pdf-item-geometry.ts: HEALTH_EPS_PX

值 200（3 文件 / 3 声明）
  src/shared/ipc/schemas.ts: NOTE_TITLE_MAX
  src/shared/constants.ts: MAX_PAGE_SIZE
  src/renderer/features/reader/SelectionLayer.tsx: SELECTION_DEBOUNCE_MS

值 50（3 文件 / 3 声明）
  src/renderer/features/reader/annotation-undo.ts: UNDO_DEPTH_MAX
  src/renderer/features/reader/anchor-locate.ts: POLL_MS
  src/renderer/features/reader/reading-time-outbox.ts: OUTBOX_DEAD_LETTER_MAX

值 32（3 文件 / 3 声明）
  src/renderer/features/reader/selection-geometry.ts: TOOLBAR_HEIGHT
  src/renderer/features/reader/anchor-serialize.ts: CONTEXT_CHARS
  src/renderer/features/lineage/lineage-layout.ts: LAYER_LABEL_DY

值 15_000（2 文件 / 2 声明）
  src/shared/constants.ts: HTTP_TIMEOUT_MS
  src/renderer/features/reader/reading-time.ts: READING_TICK_MS

值 'ai-sensor'（2 文件 / 2 声明）
  src/main/services/ai_sensor/ai-sensor.service.ts: AI_SENSOR_DIR_NAME
  src/main/services/ai_sensor/zcode-link.service.ts: ZCODE_SKILL_NAME

值 100（2 文件 / 2 声明）
  src/preload/drag-import.ts: MAX_DROP_FILES
  src/renderer/features/reader/AnnotationEditor.tsx: HISTORY_MAX

值 0.1（2 文件 / 2 声明）
  src/renderer/features/reader/annotation-style.ts: TRIM_TOP
  src/renderer/features/reader/ReaderToolbar.tsx: ZOOM_STEP

值 1.5（2 文件 / 2 声明）
  src/renderer/features/reader/annotation-anchor.ts: COLUMN_GAP_H_FACTOR
  src/renderer/features/reader/pdf-item-geometry.ts: COLUMN_GAP_H_FACTOR

值 0.02（2 文件 / 2 声明）
  src/renderer/features/reader/annotation-anchor.ts: COLUMN_GAP_PAGE_RATIO
  src/renderer/features/reader/pdf-item-geometry.ts: COLUMN_GAP_PAGE_RATIO

值 '标注保存失败'（2 文件 / 2 声明）
  src/renderer/features/reader/SelectionLayer.tsx: SAVE_FAILED
  src/renderer/features/reader/AnnotationPopups.tsx: UPDATE_FAILED

值 'rounded border px-2 py-0.5 text-xs disabled:opacity-50'（2 文件 / 2 声明）
  src/renderer/features/reader/AnnotationMenu.tsx: btn
  src/renderer/features/reader/AnnotationEditor.tsx: btn

值 5000（2 文件 / 2 声明）
  src/renderer/features/reader/AiNotesStatus.tsx: STATUS_POLL_MS
  src/renderer/features/settings/ZcodeLinkSection.tsx: STATUS_POLL_MS

值 '标签操作失败'（2 文件 / 2 声明）
  src/renderer/features/tags/TagEditor.tsx: TAG_OP_FAILED
  src/renderer/features/tags/tags.store.ts: TAG_OP_FAILED

值 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'（2 文件 / 2 声明）
  src/renderer/features/tags/TagLifecycleMenu.tsx: ITEM_STYLE
  src/renderer/features/lineage/LineageNodeMenu.tsx: ITEM_STYLE
