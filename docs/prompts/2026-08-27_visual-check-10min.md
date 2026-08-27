# 视检走查 10 分钟卡（用户速查版 · 2026-08-27）

> 来源：迁移开工书 §2 五项累计挂账的合并走查速查卡；配套=P8 提案
> （`docs/reports/2026-08-27-p8-proposal.md`）建议开工序第 1 步（M0）。
> **走完本卡 = 五项挂账清账 + 顺带产出 D1 试点批的语料目录输入。**
>
> 前置：仓库根双击 `dev-launch.cmd` 启动应用；库内应有 2 篇旧测试文献
> （迁移包导入）。视觉项按用户指示可调 GLM5.3 flash 截图判读代目视
> （迁移开工书 §2 原注）。
>
> 纪律：**只走查不修**。发现的缺陷记文末回执表，交会话走「事件驱动：
> 用户验收缺陷→双门修复」流程（v8 交接书 §2.5 先例）。

## ① 设置页导出全流程（约 2 分钟）

- 【操作】设置 → AI 语料导出 → 选一个空目录 → 等跑完。
- 【看什么】进度行 streaming 计数递增（done/total）；终局有 toast；导出进行中
  再开一次导出会话=被拒（EXPORT_BUSY，单飞语义）。
- 【留用】这个导出目录**不要删**——它就是 D1 试点校准批的输入
  （判据：目录里有 `manifest.json` =就绪）。

## ② 五件套观感（约 1 分钟）

- 【操作】文件管理器打开导出目录。
- 【看什么】五件齐：`INTERFACE.md` / `manifest.json` / `corpus/<paperId>.md` /
  `fulltext/<paperId>.txt` / `figures/<paperId>/*.png`；corpus 的 md 有
  front-matter 元信息+引文块（`>` 原文+p.N 页码）；figures 页图能打开。
- 【抄录】打开 `manifest.json`，把 `papers[]` 里两篇的 `paperId` 抄下来——
  ④导入草稿要用（草稿里的 paper_id 必须是库内真实 id，幽灵 id 整图拒收）。

## ③ zcode 激活自检（约 3 分钟核心段 + 可选延伸 5 分钟）

核心段（清账下限）：

- 【操作 a】设置页 → zcode 联动节：看状态档位（未发现 zcode / 已装技能未运行 /
  运行中）→ 点「一键装技能」+确认 → 档位翻到「已装技能未运行」。
- 【操作 b】阅读器打开一篇 → 侧栏笔记 tab → 点「AI 读文献」→ 状态行出现
  （pending 态——工具未拉起时同呈现，不误报）。
- 【操作 c】另开一个 zcode/终端会话：
  `node tools/ai-sensor/companion.mjs <①的语料目录> "%APPDATA%\Synapse Remake\ai-sensor"`
  （协议目录=userData/ai-sensor——userData 实名=productName「Synapse Remake」带空格）
  → 应打印拾取到的 job（篇名/paperId）；应用内状态行随之变 queued/reading。
- 【看什么】状态行六态切换如实；心跳可用
  `companion.mjs <语料> <协议> --beat "视检中" reader` 维持。

可选延伸段（想一次清干净回灌面再加，否则留 D1 试点批自然覆盖）：

- 【操作】按 SKILL.md 第 3 步行形状（8 字段：
  `role/question/model/quote_text/prefix_text/suffix_text/anchor_page/content_md`）
  手写一份最小草稿 JSON（如 role=adjudicate、question=Q1、anchor_page=null、
  content_md=「视检回灌样例」）→ `companion.mjs <语料> <协议> --deliver
  <paperId> <草稿.json>` → 应用笔记面板「导入 AI 笔记」。
- 【看什么】面板出现 [ai:*] 分节+七问分色（只读）；AI 标注在阅读器渲染；
  面板条目与标注点击互跳。

## ④ 脉络视图全链（约 2 分钟）

- 【备料】新建 `lineage-draft.json`（paper_id 用 ② 抄的真实 id；v1 草稿只收
  文献节点，纯主题节点在应用内手工建）：

```json
{
  "nodes": [
    { "paper_id": "<篇A的id>", "title": "<篇A标题>", "year": 2020, "core_idea": "视检节点A" },
    { "paper_id": "<篇B的id>", "title": "<篇B标题>", "year": 2022, "core_idea": "视检节点B" }
  ],
  "edges": [
    { "from_paper_id": "<篇A的id>", "to_paper_id": "<篇B的id>", "label": "视检测试边" }
  ]
}
```

- 【操作】导航切「脉络」（第四视图）→ 工具栏「导入草稿」→ 确认 → 树渲染。
- 【看什么】纵向=年份分层，同层节点不重叠；**拖拽**一个节点→关掉应用重开→
  位置保持；**单击**节点→侧板四区（元信息/核心 idea/AI 笔记/人工笔记）；
  笔记条目**双击**→跳阅读器并定位（锚定失效时降级到页级+提示，属 INV-20
  预期行为非缺陷）。
- 【负例（可选 30 秒）】给同一篇再连第二条父边=树拒绝 toast（单父约束）。

## ⑤ RT 布局观感（约 1 分钟，与 ④ 同屏）

- 【看什么】同年密集区紧凑度可接受；单链跨年时 x 对齐属紧凑性特征**非缺陷**
  （战役报告 §3.2 布局语义）；滚轮缩放以鼠标位置为锚；空白拖拽=平移。
- 【判据】无节点视觉重叠、拖拽跟手。

## ⑥ 回执表（走完填一行，defect 附截图/描述）

| 项 | 结论 | 备注 |
| --- | --- | --- |
| ① 导出全流程 | PASS / DEFECT | |
| ② 五件套观感 | PASS / DEFECT | |
| ③ zcode 激活自检（核心段） | PASS / DEFECT | 延伸段做了打勾：□ |
| ④ 脉络全链 | PASS / DEFECT | |
| ⑤ RT 布局观感 | PASS / DEFECT | |

- 全 PASS → 五项挂账清账（P8 提案 M0 达成），①的语料目录移交 D1 试点批。
- 任一 DEFECT → 回执交会话，事件驱动修复（不动手自修）。
