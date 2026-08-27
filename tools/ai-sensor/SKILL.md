# AI Sensor —— zcode 技能声明（SR2-AI-05 交付）

> 应用侧零改动的「传感器」消费端：本技能在 zcode 会话内运行，读取 Synapse
> 导出的语料目录，对全库文献做三读与梳理。**应用永不 spawn zcode/会话，
> AI 工作只由用户在 zcode 侧启动**（ADR-0015 E1=B'，INV-21）。

## 激活条件（唯一判据）

语料目录存在 `manifest.json`——「manifest 存在=导出完整就绪」（ADR-0011
v1.1）。目录中断无 manifest（导出会话被中断）时**不得激活**，应提示用户回
应用「设置 → AI 语料导出」重跑导出（清空重建，INV-18）。

激活自检（zcode 会话内执行）：

```
node tools/ai-sensor/queue.mjs <语料目录>
```

- exit 0：打印待读队列 → 激活，按队列开工
- exit 1（manifest 不存在）：不激活，向用户说明须先完成应用侧导出

## 目录契约（消费面五件套）

| 成员 | 消费方式 |
| --- | --- |
| `INTERFACE.md` | 目录结构与字段口径的说明书（先读） |
| `manifest.json` | 篇清单+sha 校验值；**只读**——工具永不改写 |
| `corpus/<paperId>.md` | 每篇的结构化语料（front-matter+引文块+笔记+`[ai:*]` 节） |
| `fulltext/<paperId>.txt` | 全文纯文本，页界 `\f`（页码 1 基） |
| `figures/<paperId>/*.png` | 页快照（2×分辨率）与标注包围盒裁剪图 |

## 工作循环（companion 模式，SR2-AI-06）

双目录 CLI：`node tools/ai-sensor/companion.mjs <语料目录> <协议目录>`——
语料目录=应用「设置 → AI 语料导出」五件套产物；协议目录=应用 userData 下
`ai-sensor/`（四成员：`pending/` job 请求区、`status.json` 会话心跳、
`corpus-ai/` 产物区（07 导入器扫描面）、`archive/` 导入后归档区）。

协议目录平台惯例路径（应用 userData 按 productName `Synapse Remake`（带空格）
——Electron 无 setName 覆盖、SYNAPSE_USER_DATA 仅 e2e 隔离用（bootstrap.ts）；
zcode 会话侧发现机制，AI-10 B10-1 联动；2026-08-27 修正：旧表误写包名
`synapse-remake`，照旧表传参会建幽灵协议目录=应用侧永不可见）：

| 平台 | 协议目录 |
| --- | --- |
| Windows | `%APPDATA%\Synapse Remake\ai-sensor` |
| macOS | `~/Library/Application Support/Synapse Remake/ai-sensor` |
| Linux | `~/.config/Synapse Remake/ai-sensor` |

1. **拾取**：`node tools/ai-sensor/companion.mjs <语料> <协议>`——打印下一个
   pending job（jobId/paperId/篇名/语料消费指针）并写心跳；无 job=空转退出
   （exit 0）。全库三读流（无按钮请求的整库阅读）先用
   `node tools/ai-sensor/queue.mjs <语料>` 列队列，逐篇同样走 2~4 步。
2. **三读**（prompts/ 驱动，配置读 `config.json`——从 `config.template.json`
   复制，模型三件可配）：
   - first-read：七问（Q1 核心 idea 必答+锚定段）——见 `prompts/first-read.md`
   - second-read：同构**盲读**（不看一读产物，保独立性）——`prompts/second-read.md`
   - adjudicate：分歧聚焦裁决（只读两读分歧点与锚定段）——`prompts/adjudicate.md`
   - 长调用间隙刷新心跳：`companion.mjs <语料> <协议> --beat <状态自述> [角色]`
     （应用判活阈值 10 分钟=HEARTBEAT_FRESH_MS——state/role 是自由文本自述，
     应用永不按值分支）
3. **草稿**：三读产物整理为 JSON 行式锚定段数组（**行形状 8 字段**：
   `role/question/model/quote_text/prefix_text/suffix_text/anchor_page/content_md`
   ——与 ai_notes 同形 N2 粒度；role ∈ first-read|second-read|adjudicate，
   question ∈ Q1..Q7|divergence，篇级回答 anchor_page=null。旧版
   `corpus-ai/<paperId>/` 分角色 md 形态已由 ADR-0015 §1 行式 JSON 收口取代）。
4. **交付**：`node tools/ai-sensor/companion.mjs <语料> <协议> --deliver
   <paperId> <草稿.json...>`——companion 规范化校验草稿→原子写
   `corpus-ai/<paperId>.json`（落**协议根**，非语料目录）→移除 pending job→
   queue 进度置 done。**红线：移除 job 以产物落盘成功为前提**（任何失败路径
   job 一律保留——INV-26；交付幂等：重交付=产物覆盖）。
5. **库级收尾（synthesize）**：队列打空（pending 无 job 且 queue 全 done）后
   触发——四类核心贡献枚举+时间线（`prompts/synthesize.md`；库级产物非逐篇
   流，无 paperId 维度，不经 companion --deliver）。

## 红线

- **移除 pending job 以产物落盘成功为前提**（INV-26）——任何失败路径 job
  保留；协议文件一律 tmp+rename 原子写，首写 mkdir recursive 幂等
- 禁写应用 DB 与导出目录内 manifest/corpus/fulltext/figures（真相源单向）
- 应用侧零 LLM 出网维持：模型调用全部发生在 zcode 会话内建模能力，本工具
  零 npm 依赖、不直连任何 API
- 密钥留 `config.json`（已 gitignore，不入库）
