# ai-sensor —— Synapse 的 zcode 工具侧传感器（SR2-AI-05）

应用（Synapse Remake）负责导出 AI 语料五件套（设置 → AI 语料导出）；
本目录是**主动消费端**：在 zcode 会话内对导出语料做全库三读与梳理。
应用侧零 LLM 出网、零 spawn——AI 工作只由用户在 zcode 侧启动（ADR-0015）。

## 快速开始

1. 应用内完成「AI 语料导出」，得到含 `manifest.json` 的语料目录
2. `cp config.template.json config.json` 并填写三读模型（config.json 不入库）
3. zcode 会话内按 `SKILL.md` 工作循环执行（激活自检→逐篇三读→落盘标记）

## 文件面

| 文件 | 职责 |
| --- | --- |
| `queue.mjs`（+`queue.d.mts`） | 队列骨架：manifest↔progress diff/幂等/断点续跑+CLI（零 npm 依赖） |
| `SKILL.md` | zcode 技能声明与操作说明书 |
| `config.template.json` | 三读模型可配面模板（复制为 config.json，已 gitignore） |
| `prompts/*.md` | 三读+梳理提示词（**实验迭代资产**——每次读感调整即改，不走工单冻结） |
| `progress.json`（运行产物） | 工具侧私有进度（不入库；篇级产物落盘后才置 done） |

## 断点语义（两层互不相干）

- **工具层**（本目录）：zcode 会话中断后重跑 `queue.mjs`——done 篇不重读
  （`progress.json` 幂等 diff）
- **导出层**（应用侧）：导出会话中断=无 manifest=本工具不激活；回应用重跑
  导出即清空重建全量（INV-18）

## 边界铁律

不 import 应用 `src/`；禁写应用 DB 与导出目录的 manifest/corpus/fulltext/
figures（真相源单向：只读 manifest，只写 progress.json 与 `corpus-ai/`）；
`corpus-ai/` 产物 v1 不回灌应用（导入器=AI-07 另立工单）。
