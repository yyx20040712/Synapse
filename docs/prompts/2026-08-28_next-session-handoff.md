# 任务：P8 传感器点亮战役续推（ENR 实施→P7-F 工单化→同型雷清扫）

> 用法：新会话粘贴「按 docs/prompts/2026-08-28_next-session-handoff.md 开工」。
> 前任=2026-08-27 夜间+日间主控会话（P8 规划批→用户在场拍板→三缺陷修复
> →ENR 工单化；提交链 3d60675→8dc4fb0 共 7 个）。

## 0. 开工前置（强制）

1. 第一动作=核对/执行 push（`git log origin/main..HEAD`——前任已推净则跳）。
2. 分级阅读：AGENTS.md（工单工作流三屋节）；本文；ADR-0017+methodology §4
   模板三件；ROADMAP（P7-F 节+P8 工单化起步注记）；**下一单票面**=
   src/main/services/enrich/cited-by.service.ts 头注（ENR-01，五层规约
   完整任务书）+票面终稿 scripts/audits/enr-ticketing-draft.md。
3. 技能清点+配置自查；实现者/门一/门二子代理与主控同级配置。
4. 开工自检：verify **87 文件 621 用例** exit 0；e2e **20/20**（需先
   build）；locks **134**；工单 106 **open 2**（ENR-01/02）；Node24 PATH
   铁律与禁裸 npx vitest 照旧。
5. 会话节奏：多单元连续（60% 边界+终止条件内）；逐单提交不变。

## 1. 任务序列（按序，用户已授权「先修 bug 后规划继续开发」的日间指令已
   消化完毕——本序为 P8 提案 M2+编外项的执行面）

1. **SR2-ENR-01 三屋实施**（methodology §4.1 简报派发；票面=文件头注；
   W2W3 收口机检项已入票面文化层——缺=拒收）。依赖无。
2. **SR2-ENR-02 三屋实施**（依赖 ENR-01 数据面；注册文件=src/shared/
   venue-tier.ts 头注；corpus.assemble.ts 头指针保持 P7-C 勿动）。
3. **P7-F 连续滚动工单化战役**（双 plan 门须用户在场——发起前问用户
   时段；素材=ROADMAP P7-F 节+findings 发现 1；F-aware 接口冻结面：
   locateAnchor 签名/annotation-order 文档序；预计 3~4 票，参照 LG 役
   成本量级 60~75M；**票面重量预拆实现段**防 LG-03 型 30M 单元）。
4. **同型雷清扫单元**（五雷清单=findings 发现 3；优先=corpus.assemble.ts
   :104 orderAiNotes 末级 id 决胜——触发面最高；其余 lineage×2/papers×2/
   notes×1 低频）。
5. **M1 试点校准批**（等用户走查①导出语料目录后：主控跑 companion
   拾取验证→zcode 侧三读（config.json 已建 D2-B 全 GLM）→回灌→渲染→
   synthesize 小库草稿；激活纪律=用户手动触发）。

## 2. 用户视检项（findings §2 用户自填区——用户声明亲自走查后填）

五项卡待回填；①导出目录路径是 M1 前置。视觉项可调 GLM5.3 flash。

## 3. 已知遗留与教训（本会话沉淀）

- **W4a 教训**：票面/注释声明「不依赖 X」类断言会被后续事实证伪
  （e2e aria-label 子串碰撞）——e2e 前移纪律继续执行（渲染链改动收口必跑）。
- 排序雷模式：`ORDER BY created_at, id`（uuid 彩票）——新工单 SQL 面
  审计点。
- locks/manifest.json CRLF 警告=git LF 归一口径内（门二核过无假绿窗口）。
- dev-launch.cmd 与 dist_new/ 未跟踪残留照旧（用户侧/历史）。

## 4. 成本账本（本会话全录，ADR-0017 裁决 5）

| 单元 | 子代理合计 |
| --- | --- |
| ENR 工单化（门一+复核+门二） | ≈2.02M tok/17.3min |
| 缺陷②标签标题（实现者×3 轮+双门×2 复核） | ≈8.08M tok/36.1min |
| 缺陷③ ai_notes 排序（实现者×2 轮+双门） | ≈2.40M tok/23.7min |
| 主控直做（提案包/票面/物化/文档群） | 本体会话（无独立账） |

## 5. 关键指针

| 对象 | 位置 |
| --- | --- |
| P8 提案（D1~D5 预裁+战役编排） | docs/reports/2026-08-27-p8-proposal.md |
| M0 视检发现台账（三缺陷全案+五雷+自填区） | docs/reports/2026-08-27_visual-check-findings.md |
| 视检 10 分钟卡（路径已修正版） | docs/prompts/2026-08-27_visual-check-10min.md |
| ENR 票面终稿+审计三件 | scripts/audits/enr-ticketing-* |
| 缺陷②③审计档案 | scripts/audits/tabs-title-*/ainotes-order-* |
| 协议目录实名（SKILL.md 已修正） | %APPDATA%\Synapse Remake\ai-sensor |
| 桌面预填草稿（④视检用） | C:\Users\Administrator\Desktop\lineage-draft.json |
