# P7-G 批二（AI 回灌与联动组）战役报告（2026-08-27）

> 范围：SR2-AI-06~10 五单全役（06 伴随进程文件协议试点→07 回灌导入器→08
> 笔记面板 AI 面→09 AI 标注渲染对等→10 设置页 zcode 联动）；本批为
> **ADR-0017 三屋模式推广后的首批实战**（06=试点、07~10=推广四连单）。
> 前置基线：verify 73 文件 452 用例 + e2e 13/13 + locks 112 + 工单 99
> open 4（v8 交接书 §1）。
> 终态基线：**verify exit 0（79 文件 520 用例）+ e2e 16/16 + locks 121 +
> 工单 99 open 0**；INV-21/26 锚定；P7-G 全域完成。

## 1. 交付清单（全役）

| 单元 | 提交 | 要点 |
| --- | --- | --- |
| SR2-AI-06 伴随进程协议（试点） | c2bfc4f | 应用侧 createAiSensorService（幂等 job 原子写/心跳新鲜度单源/三态分离）+工具侧 companion.mjs 四步序+IPC 两通道+SKILL.md；INV-26 入册；三屋试点全链（v8 §4 账本首录） |
| SR2-AI-07 回灌导入器 | 8be7f91 | **前置步=ai_sensor 域迁移**（API_SURFACE 新立域+06 两通道迁入+契约测试十域穷举——消费者未建窗口兑现）；回灌导入器 archive 账本 sha256 三路径幂等+部分成功三桶+幽灵 paperId 拦截；「v1 无生产者」声明解除 |
| SR2-AI-08 笔记面板 AI 面 | fb53e63 | **主控三分法预裁：ai-sensor/observe 第五通道**（per-paper 四事实聚合——实现者 BLOCKED 上报后裁决方向 B，aiStatus 不动）；六态状态行（hidden/idle/pending/queued/reading/done-unimported）+跨格序列①③⑤用例；ai-note-style 七问分色单源+ai-notes.store 新 store（notes.store 零触碰）；「AI 读文献」写 job+「导入 AI 笔记」三桶 toast+门控轮询 5s；e2e 受锁新 spec（fixture status.json 模拟心跳全链） |
| SR2-AI-09 AI 标注渲染对等 | 78e4b5d | verifyQuote 重锚同几何管线（annotation-anchor 唯一 DOM 遍历点不另写几何）；重锚失败段不渲染 rects 他段不扰；anchor-locate exact 层扩 [data-ai-note-id]（INV-20 三防线结构不动）；notifyAiNoteHighlight 反向同步（C-05 noteHighlight 同型 seq 信号）；INV-19 annotations 写面 diff 级零触碰；重锚缓存 paperId+页键失效 |
| SR2-AI-10 设置页 zcode 联动 | 58986be | detect 五态（not-found 最弱信号/found-skill-missing/installed-idle/running 单源/error 含 status.json 损坏）+一键装技能纯 fs 递归复制（**INV-21 零进程——diff 级零 spawn+e2e 纯 fs 断言双面**）+resolveTemplateDir 双源解析单函数；zcode-link 两通道挂 ai_sensor 域；extraResources 打包面；e2e SYNAPSE_ZCODE_HOME 隔离 |

## 2. 三屋模式批二运行数据（ADR-0017 裁决 5 账本汇总）

| 单元 | 实现者 | 门一（含复核） | 门二 | 合计 |
| --- | --- | --- | --- | --- |
| AI-06（试点） | 9.96M tok/30.2min | 1.49M/7.7min | 1.07M/3.6min | ≈12.53M/41.5min |
| AI-07 | 2.05M/9.0min | 0.16M/1.9min | 0.48M/1.4min | ≈2.69M/12.3min |
| AI-08（含阻塞轮 0.26M/1.1min） | 9.30M/38.5min | 0.40M/1.8min | 0.40M/1.9min | ≈10.10M/42.2min |
| AI-09 | 5.82M/23.9min | 0.22M/2.1min | 0.34M/2.1min | ≈6.38M/28.1min |
| AI-10 | 4.09M/18.4min | 0.29M+0.20M 复核/5.8min | 0.75M/8.0min | ≈5.33M/32.2min |
| **全役** | **31.22M/120.0min** | **2.76M/19.3min** | **3.04M/17.0min** | **≈37.03M tok/156.3min** |

- 单均 ≈7.4M tok/31min（06/08 重单 10M+，07 轻单 2.7M——票面重量决定成本）。
- 门审成本占比 <16%，质量收益=四单双门共 **0B**；W 级 5 条（07×2 轻微挂账、
  09×1 流程改进、10×2 → 回炉修复）；两单零回炉（08/09）、两单回炉 1 轮
  （06 试点、10 宪法测试纪律）。
- **BLOCKED 上报机制实战 1 次**（08：六态判定事实无通道暴露）——三分法第 2
  款预裁（observe 通道方向 B）后重启，阻塞轮成本仅 0.26M。
- **主控代记 1 次**（10 回炉 W1 文书：zcode 宿主崩溃中断实现者收尾——主控
  代记+门一复核 N5 一行漏改即修；机制韧性证据：宿主崩溃未损任何工作树产物）。

## 3. 技术要点与裁决记录

### 3.1 ai_sensor 域与六通道终局形态

- 域迁移（07 前置步，用户 2026-08-27 裁决）：`requestAiRead`/`aiStatus` 自
  export_ 迁入 ai_sensor（通道名 ai-sensor/* 不变，register/preload/renderer
  动态机制零改动——grep 实证消费者未建窗口兑现）。
- 六通道=ai-sensor/request-read、ai-sensor/status、**ai-sensor/observe（08
  预裁新增——{status, hasPendingJob, productExists, archivedExists} per-paper
  聚合，六态判定事实单源）**、ai-notes/import、ai-notes/list、zcode-link/
  detect+install（共七端点）。契约测试十域穷举（api-surface.test.ts）。
- 受锁面扩张轨迹：112→121（+9：07 新测试/08 四件/09 一件/10 三件）。

### 3.2 六态状态机与跨格序列（08 核心）

hidden（无任何痕迹）/idle（有 DB 数据稳态）/pending（job 在+心跳未起——
迟拾取/工具未拉起/工具失败三者同呈现不误报）/queued（心跳新鲜+currentPaper
≠P 或 null——他篇在读中途格）/reading（currentPaper=P）/done-unimported
（产物在+未归档+无 job）。跨格序列①③⑤入测试（正常全链/心跳过期回 pending/
换 tab 全态重评估）；imported=瞬时态（toast+刷新→回 idle 不入稳态枚举）。
按钮禁用=pending/queued/reading（UI 禁用+服务幂等双保险）。

### 3.3 重锚渲染与反向同步（09 核心）

- AI 锚定段经 verifyQuote（annotation-anchor 唯一 DOM 遍历点）→同几何管线
  （rectsFromRange+mergeLineRects）渲染——几何对等=同函数族不另写；重锚失败
  段不渲染 rects（面板条目仍在；跳转降级归 INV-20 三防线单入口，渲染面禁
  各写降级）。
- anchor-locate exact 层滚动目标扩 [data-ai-note-id]；locateAnchor 增可选
  aiNoteId 参数（**受锁 08 单测断言随之演进——主控追认：合约演进断言变严
  非放宽**）。
- 反向同步=reader.store notifyAiNoteHighlight（C-05 noteHighlight 同型 seq
  递增信号）：AI 段点击→OutlineAside 切笔记 tab→highlightAiNoteId 分发→08
  面板滚动高亮。

### 3.4 INV-21 不代启会话（10 核心）

按钮永不 spawn：install=fs 递归复制（cpRecursive 零进程）；detect=fs stat+
readStatus；e2e 断言=装技能全流程后 skills 目录文件存在+SKILL.md 与仓库模板
逐字节一致（纯 fs 落地验证，不依赖进程行为面）。INV-21 入 docs/invariants.md。

### 3.5 挂账与遗留（移交下批/用户）

- **用户视检挂账（v8 §3）**：①设置页导出全流程视检+五件套观感（批一）；
  ②**zcode 激活自检并入 08 联动验**——现在 08+10 均落地，建议一次视检覆盖：
  设置页装技能→zcode 拾取 job→「AI 正在读」状态行→回灌导入→面板分节分色→
  标注渲染→点击互跳（含 06 pending→reading→done 状态行）。
- 工程挂账（全部 N/W 级，无阻断）：07 空数组产物用例缺+rm+rename 非原子窗口
  （已自裁申报）；08 e2e-env.ts 抽取后既有两 spec 未收敛（Rule of Three 反向
  收敛机会）；09 selectedId 无清除路径+anchorPage=null 多页渲染；10 prod 模板
  源无 e2e（extraResources 经 dist 人工验收更稳——随打包视检）；dist_new/
  未跟踪残留（2026-08-23 前遗留，本役未触碰，待用户处置）。
- 流程改进沉淀（入下批派发模板）：①变异还原 diff 空输出并入 mutation 日志
  （09 起已执行）；②变异/回炉退出码一律 npm 真退出码（grep 管道 exit 不可用
  ——10 起已执行）；③报告数字以 vitest 机器输出为准、禁手写 echo 计数行
  （10 W1 教训：手写 504 vs 实际 520）。

## 4. 三屋模式批二评估（对比试点 AI-06 与批一旧模式）

- 质量维持：四单门一 0B；全部宪法红线（分层/受锁/安全禁令/行数/UTF-8/TDD
  四档）零违例；恒绿测试（10 W2）被门一拦截并回炉修复——「每测试须能失败
  一次」纪律在门审面生效。
- 成本可测：账本五单全录（§2），实现者成本与票面重量强相关；门审+复核
  合计 5.76M（<16%）。
- 韧性实证：宿主崩溃（10 回炉中段）零工作树损失，主控代记+门一复核机制
  兜底收尾。
- 结论：ADR-0017 推广决策批二全程无反例；下一阶段 P7-H（脉络图）建议沿用，
  弱模型直领流程保留给 weak 工单（当前 open 0）。

## 5. 证据档案

- 各单实现者报告/门一/门二/diff：scripts/audits/ai0{6..9}-*、ai10-*（含
  回炉复核与 R1 红证）；运行日志同目录（gitignore，不入库）。
- 交接书链：v8（批二任务书）→本报告（收官）；ADR-0015/0016/0017；
  idle-handoff-v2（闲时线——§2 顺延记录待 idle 会话更新）。
