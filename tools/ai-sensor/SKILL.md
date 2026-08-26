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

## 工作循环

1. `node tools/ai-sensor/queue.mjs <dir>` → 队列计划（断点续跑：已 done 篇
   不重跑——`progress.json` 是工具侧私有进度，与导出会话的断点互不相干）
2. 逐篇三读（prompts/ 驱动，配置读 `config.json`——从
   `config.template.json` 复制，模型三件可配）：
   - first-read：七问（Q1 核心 idea 必答+锚定段）——见 `prompts/first-read.md`
   - second-read：同构**盲读**（不看一读产物，保独立性）——`prompts/second-read.md`
   - adjudicate：分歧聚焦裁决（只读两读分歧点与锚定段）——`prompts/adjudicate.md`
   - synthesize（库级收尾）：四类核心贡献枚举+时间线——`prompts/synthesize.md`
3. 篇级产物落盘 `corpus-ai/<paperId>/`（工具侧产物区，应用导入器不做——
   v1 无回灌，AI-07 另立）**之后**才标记完成：
   `node tools/ai-sensor/queue.mjs <dir> --done <paperId> corpus-ai/<paperId>/first-read.md ...`
   （篇级产物落盘后才置 done——中断重跑不丢已读成果）

## 红线

- 禁写应用 DB 与导出目录内 manifest/corpus/fulltext/figures（真相源单向）
- 应用侧零 LLM 出网维持：模型调用全部发生在 zcode 会话内建模能力，本工具
  零 npm 依赖、不直连任何 API
- 密钥留 `config.json`（已 gitignore，不入库）
