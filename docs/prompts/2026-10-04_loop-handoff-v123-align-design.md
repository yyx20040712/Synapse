# 交接书 v123 —— 对齐批设计稿三段通道完成场+呈裁挂起（2026-10-04）

> 前承 v122（方向轮四裁决）。本档=同日第四轮：对齐批设计稿三段通道
> （拟定→对抗审→主控终裁）完成+终裁版落档+呈裁三问发出未答挂起。

## §0 本场消耗与开工记录

用户指令=「继续开工，指引 v122」。技能：ai-dev-org=用（三段通道组织
规范）；verification-before-completion=用（收口亲验）；subagent-driven-
development=用（drafter/auditor 绑定子代理）；systematic-debugging=不用
（无诊断）；test-driven-development=不用（设计批无实现面）。配置=主控
单岗（GLM5.3 宿主）；ops-drafter（kimi-third 座）/ops-auditor（deepseek
座）均绑定档案自带 $max 档。

消耗：主控亲执（事实底座收集——lineage.service/012 DDL/import.service/
moveFolder/FilterBar/FolderNav/LineageBoard 族/LineagePage/store/api-surface
/e2e 面精读+活库只读探针+四清单亲核销项+终裁稿+A 批设计稿连带修订+本档+
账本）。子代理两岗：drafter 39.9k tokens（277s）；auditor 74.4k tokens
（303s）。**本轮零代码改动**（纯设计面：docs 三件）。

## §1 基线终态（对不上禁提交）

- 仓库=1fc6b953147（v122 收尾补记）已推送；CI 首查完成：
  ①3717414119（7ec055079c docs）=**cancelled**（concurrency 连续 push
  取消非失败——被 1fc6b953147 的 push 取消，取消前 69 passed 零红）；
  ②3717788697（1fc6b953147 docs-only）=**success** ✓。
- 活库无变化（本日 v122 场已处置：nodes/papers 各 14 全主图，null-folder=0）。

## §2 本场产出：对齐批设计稿三段通道全链

**终裁版落档**：docs/design/2026-10-04_f-align01-design.md（实施依据稿，
呈裁落定后 final 化）。

1. **任务书**（自包含，仓外=2026-10-04_align-batch-task-brief.md）：四裁决
   语义+亲核事实底座（DDL/service/renderer/契约/测试/INV/活库）+九决策点。
2. **drafter 草案 v0.1**：D1 通道拆分/D2 应用层全退 DDL 归 D 批/D3 导入
   落夹/D4 删夹闸/D5 未归档一揽子/D6 分层引导/D7 测试收紧/D8 四单元+
   测试先行序/D9 INV 改写+K1 完备性矩阵。
3. **auditor 对抗**：B0/W11/N7=**有条件放行**（C1-C5）。关键 W：W10 两
   假设互锁未证/W8 A 批交叉未盘/W4 双侧绿未举证/W2 D2 押未登记假设/
   W9 空主图≠空库反例/W6 词表口径/W11 治理面生命周期。
4. **主控终裁（C1-C5 全处置）**：§0 清偿记录+W/N 逐条处置；**C2 四清单
   亲核销项**（本场核心增量事实）：
   - **调用方链**：`service.upsertNode` 唯一调用方=`src/main/ipc/lineage.ts:20`；
     import.service:175/library.service:141/:228/:236 全 `deps.repos.lineage`
     repo 直调——W10 两假设成立，D1 拆通道后 service 新建+主题分支=死码随删。
   - **null 入口**：fromDialog/fromFolder Req=voidReq（api-surface:47-48
     不带目标）；collection=null 两来源（对话框单文件+文件夹根散文件）；
     **renderer 两跳后挂接链**（ImportDropZone:152-155 逐个 moveFolder+
     LibraryPage:102 targetFolderId 恒非 null）——D3 推荐案改 main 侧
     事务内单跳（消除中间失败窗口）。
   - **测试符号清单**：主题节点（paperId:null）用例分布 10 文件
     （lineage-v2-service:87-123 族/folders-move-paper:136/:142/:146/:194
     族等）；保留用例装置改造=service 建节点装置→repo 直插装置。
   - **A 批交叉**：LineageBoardDialogs 三对话框共宿主（各删各自挂点）；
     LineageSideTags:11 注释引用通道名（连带改写）；**patch-node 白名单
     临时含 tags+coreIdea**（A1b/A3 遗留面，注记随各自单元删）——否则
     对齐批先行即 typecheck 红。
5. **活库探针**（只读，仓外=2026-10-04_theme-node-inventory.mjs）：主题
   节点存量=**0 行**（挂边 0）——退役零数据损失；folders 仅主图。
6. **A 批设计稿连带修订**：contracta01 §3 表后加「对齐批连带修订」段
   （A1b/A3 写队列面改 patch-node 口径+次序以用户指令为准）。

**呈裁三问（已发出未答，挂起）**：D3 导入落夹（推荐=默认落当前文件夹/
全部视图落主图，main 侧单跳）；D4 删夹处置（推荐=禁删非空夹；b 案附
边级联损失警示）；D6 空图文案（可选，推荐交实现批）。

## §3 下场开工序

1. **呈裁落定**（用户答 D3/D4/D6 或主控重呈）→设计稿 §5 裁决记录段
   补记 final 化。
2. **单元一启动**（不依赖呈裁）：通道拆分+主题节点+新建路退役——
   executor TDD→门一双审 k1+d1→门二实证终审→主控亲验收口。票面要点=
   终裁稿 §3 单元一行+§0 四清单销项事实。
3. 单元二开工前置=呈裁落定；单元四 B=D 批台账登记（W2 条件：
   lineage_nodes 重建顺带 paper_id NOT NULL+退出条件）。
4. A 批余项（A1b/A2/A3）穿插视用户指令——票面已按 patch-node 口径
   对齐（本场连带修订）。

## §4 挂账与登记

- 呈裁挂起三问（§2-5）——下场首办。
- 悬浮笔记设计稿（对齐批收口后，v122 §3 要点）。
- R2 反馈滚动收集承 v120/v121。
- 待核实项（单元票面开工前复核）：迁移序号 016 占用实况；INV-87 引导态
  作用面（预期=仅隐藏未归档行）。

## §5 操作条款存续

承 v122 §6 全项。本场新增口径：**呈裁挂起纪律**（用户裁决位问题发出
未答=挂起不代裁；不阻塞的单元可先行，前置含呈裁的单元冻结——本场
单元一可先行但为保持设计稿 final 化后实施的批次纯度，选择挂起待呈裁
一并落定）；**node -e 隔层坑再现**（本场 JSON.parse 空输入实证——一律
Write 文件后 node，宪法条目在档）。账本 609→612（本场 3 行：drafter/
audit/commit）。
