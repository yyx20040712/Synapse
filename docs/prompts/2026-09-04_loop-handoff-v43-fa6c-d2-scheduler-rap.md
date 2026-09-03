# 2026-09-04 LOOP 交接 v43——F-A6-c 毕：rAF 调度+快路径落地（D2 根治面完成），四轮取证 200ms→50ms；用户令暂停

> 上段=v42（b2 主链几何源迁移）。本段=F-A6-c（D2 调度与快路径票·B 案）：
> rAF 对齐+快路径 evaluateVisual（INV-58 后半）→门一 Kimi PWW 回炉四闭合
> →门二 deepseek **PASS 零 findings**——**D2 根治面（5Hz 步进+全量冗余）完成**，
> F-A6 全战役仅剩 d 收口票。**§2=暂停注记（用户令 2026-09-04：完成 c 票后
> 暂停并维护交接文档群——下段待用户指示重启）**。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| 调度器改形 | selection-geometry.ts（141 行）：视觉路=首事件即排 rAF（leading ≤16ms——S1b 零反馈红线保持）+**帧内合帧去重**（raf 句柄非空不重排——同帧多事件恰一次 evaluateVisual）；settle 路=防抖 200ms **逐字保持**+mouseup cancel-before-evaluate 顺序保持；cancel 清 rAF+防抖双句柄（INV-14）；**旧 200ms leading+trailing 节流整体删除**（方案切换=删旧） |
| 快路径 | selection-evaluate.ts（320 行）createEvaluate 返回 {visual,full} 双路径：四道守卫前置（全四条）+G2 同门拖选抑制（静默）+轻量 probe（probeOffsetLen 复刻——Rule of Three 第 2 次保持重复，口径逐句对照头注）+page-items.store 直读+对账+itemSelectionGeometry=**INV-58 后半（快路径与 settle 同族项几何链）**；回退三层（快→全量视觉→DOM 量测[b2 在位]）头注声明；visualOnly 仅剩快路径回退一个活调用方（非死参）；SelectionPaint React.memo+props 稳定化 |
| 门二开工条件三件 | ①clampScale/ZOOM_SCALE_MIN/MAX 单源（pdf-item-geometry 导出,PdfPageCanvas+selection-evaluate 双消费）；②pitch 极限守卫夹具（pitch 缺省×多行高瘦碎片——绿=防线在 hComparable 可比带,MUT4 红证其牙,与 b2 W1 同范式）；③AnnotationLayer seam 头注入档（SelectionLayer+selection-evaluate 各一行——独立票面） |
| 第四轮取证 r4 | **mutations 7→20/20 全跟随+间隔中位 200.4→59.5ms**（=dispatch 界；50/60 交替=rAF 帧栅格量化,16.7ms 上限需更密口径[§12 申报③——主动削证据]）；delta med 32.3→**11.9ms**（含帧点等待,链亚毫秒级）；**gCS 685→87（仅末尾 settle 一次）+clientRects 8→1（快 tick 零）=clientRects/gCS 链尽消**（gBCR 18→24/Range.gBCR 8→21 绝对量随 tick 数上行——1.2~2.3 次/mutation 归一化净面披露在档）；**D1 面块数/右溢逐位不变**（42/10/3/3/3、0）——迁移与调度双面零回归 |
| 测试 | selection-paint.test S1b/S1c 改写 rAF 语义（帧前零渲染/单帧 ≤16ms/t=150 防抖窗锚/帧随动读当下选区）;selection-layer.test **零改 14/14**（票面预判兑现）;新 selection-geometry.test 4 it（**C1 合帧去重=唯一新逻辑单元锚**/C2 leading/C3 防抖逐字[距末事件 199/200ms 口径自纠申报]/C4 cancel）+selection-evaluate.test 4 it（快慢等价 INV-58/**同帧覆盖票面强制**[mid-drag zoom 差分——非空转断言]/跨页守卫/**W1 cancel-before-evaluate 顺序锚**[zoom 差分判别轴,先红=删 cancel 恰 W1 it 红]）;变异红证 4+MUT2 重跑留档（落点=调度器工厂防抖消费点,C3 与 S1b 流经同一消费点同红——机制说明在档） |
| 门一 W1 过程发现 | **portal DOM 结构插入诱发浏览器/jsdom 原生 selectionchange**（live range 对所在树变更的反应,S8 态同机制,不经 dispatchEvent——四轮探针定位）→新 rAF 排程→t+16ms 快路径**幂等重渲一次**；定性=**生产无害**（快/全量同族同产物=INV-58 等价性吸收,visual 不动 pending）——票外已知行为非 cancel 顺序缺陷;W1 终版预渲染形态隔离（portal 在场时全量重渲经 React 节点复用零诱发,mouseup 后 handler +0 实测）;**d 票裁量=是否入 e2e 断言面** |
| 门审链 | 门一 Kimi k3 **PWW 2W2N**（五维全过;归因链获「肯自曝上限」评价;W1 顺序锚无实证/W2 MUT2 落点→回炉四闭合;N1 头注笔误/N2 措辞收敛）→门二 deepseek **PASS 零 findings**（「rAF 合帧/leading/settle/cancel 逐字核验通过…均无功能缺陷;c 可提交收口,d 开工条件满足」）;审查档 f-a6c-gate1/2 在 scripts/audits/ |
| verify/locks | **154 文件/1325 用例/locks 277** 全绿亲验（VERIFY_EXIT=0;b2 基线 152/1316→+2 文件+9 用例）;e2e reader-text 13/13 主动跑绿（调度时序面保险）;grep TODO/FIXME/placeholder 零命中 [locked-change] |

## 2. 下段执行序（暂停注记——用户令 2026-09-04）

> **本段会话按用户指令暂停**（完成 c 票收口后）。下段待用户指示重启；
> 重启后按下列执行序继续（首项=F-A6-d 收口票）。

1. **F-A6-d 收口票**（F-A6 战役末票）：e2e 补断言——rotation×CropBox 组合页
   （b1 已知边界申报兑现）+拖选随动预算断言（可选——S1c 组件级已锚,d 票
   裁量）+**live range 诱发链 e2e 断言面裁量**（c 票 W1 发现——幂等重渲生产
   无害,是否锚 e2e 由 d 票面定）+reader-text:872 第 1 现指纹观察（全量 e2e）；
   INV-37 调度条款+INV-58 全文登记 docs/invariants.md；ADR-0019 R3 落笔
   （§6 草案段→正式 R3）;locks 收账；F-A6 registry 翻 done。
2. **AnnotationLayer 重锚域同族化/域间换算守卫**（b2/c 门二 seam_ruling
   排期项——独立票立案,票面=存量标注 rects 重锚域与项几何域的换算或迁移）。
3. **P7D-01 批一**（闲时可动）：动效 --dur-*+间距 inline 12 处+层级语义命名
   ——零视觉差（无头截图 diff 验收）;自产 .mjs 诞生即 locks。
4. **P7X-02 时长 outbox**（闲时——service 层非视觉）：设计面=与 saveProgress
   单通道关系+重启恢复语义;设计链外链双跳。
5. **P7D-01 批二**（在场轮）：字号语义刻度+mockup 用户逐档裁。

## 3. 本段方法论资产

- **「先红验证断言有牙」的判别轴设计**（门一 W1 回炉）：cancel-before-evaluate
  顺序的组件级可观察投影=「终态不被 post-mouseup 状态改写」——用 zoom 差分
  （mouseup 后改 zoom=3 推进 300ms,终态须仍=mouseup 时刻几何）作判别轴,
  删 cancel 即红（31.82% 覆盖）——时序类断言的「有牙」证明范式。
- **live range 诱发链的定性纪律**（c 票 W1 过程发现）：测试/生产中发现的
  「意外再触发」先探针定位机理（四轮 trace）→判生产语义影响（幂等+同族
  =无害）→隔离测试形态（预渲染）→留 d 票裁量 e2e 面——不静默吞掉也不
  过度反应。
- **材料完整性缺口的门权分级**（c 票门一 W1 前半）：diff 件数口径差/
  调用点不可见=「证据完整性问题」非「实现缺失」——主控核验源码+终审包
  说明补足+测试锚实补,三方闭合而非单方声明。

## 4. 成本账本

```
主控 GLM5.3×bigmodel-coding-plan：票面拟定（B 案六面）+验收（diff/四轮 JSON
  对照/verify 三次亲验）+门一四条编排（含 mouseup 顺序主控核验）+门二材料
  口径说明+收口三件+暂停交接
实现者子代理 GLM5.3flash 档两轮：c 票实现（13.7M tok/30min——A~F 六面+
  四轮取证+变异 4）+门一回炉（6.2M tok/12min——W1 顺序锚+live range 诱发
  链四轮探针/W2 落点重跑/N1/N2）
外链（gate-call 链）：
  Kimi k3 门一：in 19728 / out 6114 / 81s ✓ PWW
  deepseek v4flash 门二：in 25418 / out 22122 / 197s ✓ PASS（parsed ok）
```

## 5. 环境事实滚动

- 基线推进：**154 文件 1325 用例/locks 277/e2e 39**（c 票 +2 文件+9 用例）;
  e2e reader-text 单 spec 主动跑 13/13 绿。
- 四轮取证数据目录并存：f-a6-diag-out-a1/（原始）+f-a6-diag-out-b1/（T1/T9 后）
  +f-a6-diag-out-b2/（迁移后）+f-a6-diag-out/（rAF 后=r4）+r3a/r3b 事故档——
  **d 票若复跑先 mv 当前 out/**。
- jsdom 事实：portal DOM 结构插入会诱发原生 selectionchange（不经
  dispatchEvent）——测试时序面设计须意识此机制（c 票 W1 在档）。
- 多行 `node -e` 在子代理会话环境静默失效（零输出零报错,单行正常）——
  变异/对照脚本一律临时 .mjs（实现者申报,主控未复现——留意）。
- 任务池：open 3（F-A6 c 毕待 d/P7D-01 待批一/P7X-02 未动）+seam 独立票
  排期项（AnnotationLayer 同族化）。
- 沿用 v42/v41/v40 各条（gate-call 预算经验/reasoning 通道提取/verify ABI
  陷阱/数据目录 mv 惯例）。
