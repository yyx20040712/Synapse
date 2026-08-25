# 任务：SR2-AI-04 实现 → AI-05（预算内）→ 站间停点

> 用法：新会话粘贴一行「按 docs/prompts/2026-08-27_next-session-handoff-v4.md 开工」。
> 前任会话（2026-08-27 第三段）：**SR2-AI-03 收官**（c9ea6ec——五件套导出
> 会话全状态机+双门两轮半+INV-17/18 锚定；verify 409 用例）。本文取代 v3
> （其任务一 AI-03 已完成）。

## 0. 开工前置（强制，不可跳过）

1. **分级阅读**：
   - 必读：`AGENTS.md` 重点节；本文件；`docs/ROADMAP.md` P7-G 节（08-27
     三段执行实况注记）；`docs/invariants.md`（25 条——16/17/18/25 全锚定）。
   - 任务首站选读：**AI-04 票面**=`src/renderer/features/settings/
     CorpusExportSection.tsx` 头注；`src/renderer/features/settings/`
     目录现状（SettingsPage 挂载点+行数防线）；toast-store 消费惯例
     （`src/renderer/shared/` 或 features 内）；AI-02 交付的
     CorpusExtractor.ts（生产 deps 组装=loadPdfDocument+window.api
     export_.corpusItem——useExportCorpusEvents 是组装点）。
2. 技能清点+配置自查（简报必含）。
3. 全程纪律同前（unlock→全改完→统一 apply+[locked-change]；先红后绿；
   双门齐备；verify 重定向真退出码；**verify 单飞**——并发会撞 electron-vite
   临时文件）。
4. 开工先跑 `npm run verify`（预期 exit 0，**69 文件 409 用例**）+ e2e 12/12。
5. **摩擦常量（v3 八条全数有效，另加两条本段实录）**：
   ⑨python replace **无 count 参数会全量替换**（assemble 双插实录——注释区
   与代码区同名锚双中）⑩长内容禁 heredoc（截断）——用 Write 工具；测试
   import 深度按目录层级数（tests/unit/X=三级）。

## 1. 背景与当前基线

2026-08-27 三段会话：push 清积压→工单化五票→AI-01（INV-25）→AI-02（INV-16
锚定+真 pdfjs 集成）→AI-03（五件套会话全状态机+通道更名 corpus-session+
corpusSet 隔离守卫+INTERFACE 单源；INV-17/18 锚定）。当前：**verify 69 文件
409 用例 exit 0、e2e 12/12、locks 107、工单 94 open 2（AI-04/05）、INV 25 条
全锚定（16/17/18/20/22/23/24/25——17/18 本日）、领先 origin 2 提交（docs
收官后随批 push）**。

## 2. 任务序列

### 任务一：SR2-AI-04 实现——设置页导出节+App 层订阅（首站）
票面已就位，实现要点速记：
- CorpusExportSection.tsx（data-ticket 骨架→实现）：目录选择按钮（invoke
  export/corpusSession——**main 侧 pickFolder 在通道内**，ipc 层已接线）+
  进度行（corpus-export.store 消费 progress 事件 phase+done/total）+
  errorCount 呈现+会话中按钮 disabled（EXPORT_BUSY 折叠分支 INV-13——
  toast 提示）。
- corpus-export.store.ts（zustand）：进度态 {phase,done,total,errorCount,
  busy}——ExportCorpusEvent progress 载荷驱动；终局（invoke resolve/reject）
  重置。
- useExportCorpusEvents.ts：App 层订阅（apiEvents.onExportCorpus——
  INV-14 成对清理）；extract-request→createCorpusExtractor 生产组装
  （loadPdfDocument+window.api.export_.corpusItem）；complete/error 载荷
  忽略（main 侧驱动）；完成/失败 toast（INV-02——设置页外可见性）。
- SettingsPage 挂载新节（行数防线——组件已拆）。
- e2e 全链 [受锁新 spec]：导入夹具→导出→磁盘五件套+manifest 一致
  （app.evaluate 读文件）+篇失败序列（夹具源缺失→errors[] 可见）+残留
  清理断言；**渲染面（真 PDF render→PNG）在本 e2e 首次真环境覆盖**
  （AI-02 的 DOM canvas 面单测不可达面）。**会话超时兜底观察项**（AI-03
  r2 W1 不采记录）：e2e 中评估 renderer 挂死场景是否可接受（v1=进程组
  同死语义）。
- INV-18 e2e 面+INV-14 消费方级随单锚定（登记册回写）。

### 任务二：SR2-AI-05（预算内）——tools/ai-sensor 骨架
queue.mjs diff/幂等（vitest 宿主 tests/unit/tools/）+SKILL.md+config
template+.gitignore+eslint 覆盖核对。票面已就位。

### 站间停点：AI-04 一单一会话（含 e2e 面较大）。

### 事件驱动：用户人工验收缺陷 → 双门修复。

## 3. 执行批次

1. §0 前置+双基线绿。
2. AI-04（TDD+双门+提交）→ AI-05（预算内）。
3. 收官：ROADMAP 回写+**AI-01~05 五单全役收官战役报告**（docs/reports/
   2026-08-27_ai-campaign.md——P7-C 报告同型：交付清单/审计链/教训/随手验）
   ——若 AI-04/05 均完则 P7-G 应用面第一批全役 ✅。
4. push 前问询用户（除非明示）。

## 4. 终止条件（沿用战役契约）

- 回炉 ≤2 升级用户；BLOCKING 携机器事实证伪重审一次；测试/契约问题→停下
  [locked-change]；60% 上下文预告单边界停。

## 5. 基础设施

- 双门审计器（净增量 diff 策略+reasoning 伪影处置——v3 §0.5④）；双门存档
  本日：Temp audits/{ai-ticketing-plan,ai01-impl,ai02-impl,ai03-impl}-glm.md。
- 版本口径：Electron 42.9.3+Node 24；npm run test。

## 6. 关键指针

| 对象 | 位置 |
| --- | --- |
| AI-04 票面（首站） | settings/CorpusExportSection.tsx 头注 |
| AI-05 票面 | tools/ai-sensor/queue.mjs 头注 |
| 会话服务（AI-03 交付） | corpus.export.service.ts（exportCorpusSession 形态 {dir,paperIds?}） |
| 事件订阅桥 | preload onExportCorpus（apiEvents）；载荷=extract-request/progress |
| 提取器生产组装点 | CorpusExtractor.ts loadPdfDocument+createCorpusExtractor(deps) |
| EXPORT_BUSY 折叠消费 | AI-04 接线（app-error 码已落） |
| 全役收官报告位 | docs/reports/2026-08-27_ai-campaign.md（待产） |
