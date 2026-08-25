// b3: P7-G
/**
 * [SR2-AI-05] tools/ai-sensor queue —— zcode 工具骨架（工单：open / strong）
 *
 * ── 行为层 ──
 * - queue.mjs：manifest ↔ progress.json diff → 未建档队列 → 按篇三读调度
 *   （断点续跑：篇级产物落盘后才置 done；幂等重跑——已 done 篇不重跑）；
 *   进度写 progress.json（D1 三护栏的实现位）。progress.json schema：
 *   { schemaVersion, items: [{ paperId, status: 'pending'|'done',
 *   outputs: string[]（篇级产物相对路径）}] }；写入时机=篇级产物落盘后
 *   原子更新（tmp+rename 同型）。**断点续跑语义边界**：仅指工具内部三读
 *   队列（zcode 会话中断后 done 篇不重跑）；导出会话中断=无 manifest=工具
 *   不激活，应用侧重跑=清空重建全量（AI-03 INV-18——两层断点互不相干）
 * - SKILL.md：zcode 技能声明——激活条件（检测导出目录 manifest 就绪=唯一
 *   激活判据，ADR-0011 v1.1）/队列启动/配置读取；对 zcode 的操作说明书
 *   （应用侧零改动消费——「传感器」定位）
 * - config.template.json：{ models: { first, second, adjudicate }, rate,
 *   batchSize }——D2b 可配置面；用户复制为 config.json（.gitignore）
 * - prompts/（first-read 七问+锚定要求/second-read 同构盲读不看一读产物/
 *   adjudicate 分歧聚焦裁决/synthesize 四类核心贡献+时间线）：**实验迭代
 *   资产不走工单冻结**（每次读感调整即改——工程化工单只冻结骨架与契约）
 *
 * ── 接口层 ──
 * - export function diffQueue(manifest, progress): QueuePlan（纯函数核心，
 *   测试主面）；主循环读 config+manifest→写 progress（IO 与纯函数分离）
 * - 多文件工单声明（owner=strong 惯例）：registry file 字段=主文件
 *   （queue.mjs），交付面以本头注清单为准（SKILL.md/config.template.json/
 *   prompts//README.md）——P8「改动面以头注清单为准」条款
 * - 工具侧零 npm 依赖（node 内置模块；模型调用=zcode 会话内建模能力，
 *   工具只编排不直连 API——零出网面）
 *
 * ── 架构层 ──
 * - tools/ai-sensor/ 随应用仓库版本管理；不 import 应用 src（边界铁律：
 *   应用侧零 LLM 出网 D2b；DB 只读导出目录——禁写应用 DB，真相源单向）
 * - eslint 覆盖核对：tools/ 入 lint 覆盖（.mjs 平台规则核对，R14）
 *
 * ── 生命周期层 ──
 * - 预留：三读/梳理管线本体=提示词工程实验循环（不工单化）
 * - 不做：安装包/发布物；config.json 入库（gitignore）；应用内 UI
 *
 * ── 文化层 ──
 * - 测试：tests/unit/tools/queue.test.ts [受锁新增]（**vitest 宿主**，R11
 *   ——弃 node:test 防两套测试基建）：diff/幂等/断点续跑三面
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 工单骨架标记（实现单元替换为真实实现） */
export const AI_SENSOR_QUEUE_STUB = 'SR2-AI-05'
