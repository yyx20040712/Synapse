# 交接书 v186 —— F-CIFLK-01 CI 债排查修复场收官（T3 首绿）+F-GEOMASSUME-01 挂账（2026-10-14）

> 前承 v185（§1-2 F-CIFLK-01 开场候选）。本档=**F-CIFLK-01 全链单源**
> （根因定谳+修复+烤验+CI 回执闭批）。**下场开工序=§1。**

## §0 本场总账（runId=20261014-ciflk1；账本五行在档）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 批次 B 收口回执核查（开场先导） | run 38498598888 唯一红=T3 已知指纹无新红——批次 B 回执闭环；同时构成 F-CIFLK-01 第 5 红 run | 回执在档 |
| 根因定谳 | **CI runner 虚拟屏 1024×768 钳制窗口（1280×800 被 clampBounds）→月框低容量区同月双卡分行（PITCH_Y 144=trace 纵差逐字吻合）+错位（OFFSET_O 100）推乙卡出视口（y=779.75>768）→attached 查询 boundingBox 视口外坐标→mouse.down 落空→拖拽会话未启动→置入槽零渲染**（五 run 同指纹含 retry 红）；引入窗=SLOTGRID U1（4ab86fcf 10-08）布局网格化（分行指纹只有 U1 体系产生——排除法；提交点=几何推定，71 笔积压窗无 CI 记录）；票面「六笔 AI 域 diff」初判证伪（引入窗实=101 文件）；同 spec 其他拖拽用例 CI 全绿排除平台级断裂；本地 Linux 探针三尺寸组复现（1024×768 红/1280×800 绿/**880×620 完全复刻 CI 形态——乙中心 y=779.75 与 trace 一字不差**） | 定谳注入 registry |
| 修复 | T3 拖拽前乙卡 scrollIntoView 滚动锚（T5 :321 先例同型）+behavior instant 显式化（k1-W2）+滚后视口兜底断言（d1-N1——间接签名→直接红）；探针红→绿实证+probe 变异红证两轮一致 | commit=134d4a88 已推 |
| 烤验 | 门一 k1 PWC B0W2N3+d1 PWC B0W2N3（W/N 全采纳落盘）→门二 probe 6/6 PASS（verify 303/3262/427 对账基线）→裁决部 GO_WITH_CONDITIONS 六条件全兑现（C1 verify EXIT=0/C2 [locked-change]+manifest d13ced13/C3 CI 回执/C4 回写四件/C5 挂账票/C6 归档） | 全链在档 |
| **CI 回执（闭批终据）** | run 38505931266（134d4a88）=✓ success：六道关卡绿+**e2e 114/114**+**T3 首绿 7.5s**+无新红 | 回执落批档 |
| 次生 | F-GEOMASSUME-01 立案（窄视口 .tl-card flex 压缩 119/49px≠CARD_W 128——命中数学卡宽假设失真，低危 open；开放问=1024 宽 rows=[1,1] 是否 U1 设计意图留产品面复核） | registry 新票 |

成本=主控亲跑（trace/探针 4 轮/定向 3/verify 5 轮）+四岗子代理
（k1 25,527+d1 53,490+probe 480,607+裁决 33,458 tokens）。

## §1 下场开工序（单源）

1. **DB-3 导出快照批**（沿承 v185 §1-3=v184 §1-2 全口径：manifest 格式+
   哈希引用+多用户可合并性；方向=DB-0 终裁「删事件日志」落纸 v1.3；
   派发输入必含=U3 终裁 C4 残余〔R4 snapshot_seq 空键高水位语义+R5 token
   库级粒度〕+A8 传输安全〔中继云不可信假设〕+v176 §1-3 沿承；
   **repos 299/300 压线预裁先行**——DB-3 动 repo 面，BLOCKED 解除须预裁
   记录在案）。
2. DB-4 治理收尾沿承 v169/v184。
3. 低优先顺带窗：F-GEOMASSUME-01（SLOTGRID 域下一票顺带——处置候选
   a=min-width:128 锁形/b=命中数学读实测/c=登记监控）。

## §2 沿承挂账

- v184 §2/v185 §2 沿承项全数沿承（k3-N6/d1-N8(a) 交错窄窗、d1-N5 水合
  窄窗、budget-form 互锚、N1 幻影带、F-WINGUARD-01、F-UIRES-04 C/D、
  repos 压线、E5 observing、FLK-01 open 沿承等）。
- 本场新增：①**CI 底色口径已定谳**（AGENTS 环境段——runner 1024 虚拟屏
  钳制窗口+窄视口布局形态不同构；新 e2e 用例凡 boundingBox+mouse 面对
  视口外元素须先滚动锚定〔T5/T3 先例〕；CI 再现 element-not-found 间接
  签名红首查视口外坐标）；②test-surface 基线存量债=缺 DB-2 UI 批 3 个
  e2e spec（ai-budget/ai-cascade-delete/ai-manage-tabs——C_after ⊇
  C_before 语义下不红；**下场任何基线再生成批顺带吸收**）；③registry
  长注回写教训（回写后立即 eslint+tsc 单文件快验——本场四处笔误两轮
  verify 红实录在批档）；④FLK-01 与 F-CIFLK-01 已定性分域（输入事件
  偶发族 vs 视口几何确定性族——后者已清偿）。
- v185 §3 待用户面沿承：automation 开工时段（不裁=按 a 执行=06:00+豁免
  口径）。

## §3 待用户面

1. F-GEOMASSUME-01 开放问（产品面复核）：1024 内容宽落低容量区
   rows=[1,1] 分行是否 U1 设计意图——若非意图另有产品票（不裁=维持
   登记+低优先挂账）。
2. 场景教训升格候选（用户裁决位）：「收口 push 后须挂 CI 完成复查回执」
   已在 AGENTS 环境段+本场首践行闭环——是否升格宪法工作流段（v185 §4
   遗留候选，本场再添一正例）。

## §4 基线与治理（本场终态）

- HEAD=134d4a88（origin/main 同步；未跟踪面 0）。
- verify 收口终验 EXIT=0：303 文件/3262 用例/locks 427——与 v185 基线
  零漂移。e2e：本地定向 T3 绿 4.6s+CI 全量 114/114（T3 首绿 7.5s）。
- registry：F-CIFLK-01 翻 done（open 12→12：-1 F-CIFLK-01+1
  F-GEOMASSUME-01）；台账 F-CIFLK-01 条 resolved（count 4→5）。
- ADR/architecture 触及=无（e2e 测试修复批零架构决策——如实申报）。

## §5 证据档指针（仓外档案区）

- 本场=/home/yyx/synapse-archive/scripts-audits/20261014-ciflk1/
  （session-open〔技能清点〕/evidence.md〔根因+探针实录〕/fix.diff+
  fix-final.diff/writeback-draft.md/batch-close.md〔含 CI 回执〕）。
- CI 面：run 38505931266（绿终态）+38498598888（第 5 红证据）。
- 账本：runId=20261014-ciflk1 五行在档。
