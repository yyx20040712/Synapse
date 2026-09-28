# 交接书 v71 —— T3-P8 交互收口（theme-trio 八票战役收官，2026-09-28 深夜段）

> 前承 v70。排程真相源=本档 §2。本场=v70 会话续段：P8 立案核（检查面板已裁
> 亲核——设计链免行）+立案 7cea26b66dd+实现两轮（首轮+回炉 R1-R8）+门一双席
> FAIL→主控探针实证→回炉→门二 probe 12/12+裁决部 GWC C1-C4 全兑现+翻票
> 归档——**P1-P8 八票全毕，theme-trio 战役收官**。

## §0 额度与预算预警

- 本段消耗（账本随记）：ops-executor 两轮（35.6M+9.6M subagent tokens）+门一
  双席（k1 126.8k+d1 177.0k）+probe 1.56M（12 项矩阵）+裁决部 631k+主控
  （含独立探针实证轮）。
- **门链教训一条（新形态）**：e2e 断言全终态（style 清空/DOM 序/reload 持久）
  会**掩盖动画路径缺陷**——B-1（settle FLIP inline 残留+rowshift margin 掺入
  →飞行终点偏 62px+清场瞬跳+零位移分支泄漏）与 T9 全绿并存三日机理：终态
  断言不捕过程缺陷。**对抗双席独立同中 B-1 而三轮 e2e 全绿**——门一推演
  与绿证矛盾时主控以独立探针（逐帧采样 rect/style/cls）实证终裁。教训回流
  候选=「终态断言≠过程正确性：交互动画面须有过程级断言或探针实证面」。
- 次项=T3-U1 挂账批（用户裁决「战役末批统一处理·P8 之后」——P8 已毕到期）。

## §1 批次完成情况（段间衔接基线——对不上禁提交）

| 项 | 终值（脚本实测） |
| --- | --- |
| verify | **183 件 / 2022 用例** EXIT=0（三跑：主控首轮+回炉后+收口终验 16 号档；基线 179/1978→+4 件[4 新测试件]+44 例[首轮 35+回炉 9]） |
| e2e | app **54 用例**（52+T9 拖拽调序全流+T10 改月全流；主控亲跑两轮+probe 一轮全绿；实现者轮 ai-notes-section/corpus-export 两非确定首现复跑绿未达立案线 2 次，指纹登记见 §3） |
| 指纹门 | base **194 files/1994 cases/6175 assertions** → cur **200 files/2076 cases/6418 assertions**/skip12（cur 增量全数 P8=+4 files[4 新测试件]+46 cases[44 unit+T9/T10]+177 assertions；**base 落后=前票基线再生成欠账**——NEW 列表揭底：preload-surface 事件桥[SR-IPC-10]+reader-text app-file[SR-SEC-01]两用例 base 缺位，⑮ 行退役触发器族登记维持，见 §3） |
| locks manifest | **267**（263+4 新测试件入锁） |
| 豁免台账 | **129 条 hits=6 stale=123**（+5：锁测 7 断言契约演进——主控追认+裁决部复算最小性一致；旧 hits1+新 5=6） |
| 战役进度 | **P1-P8 全毕——theme-trio 战役收官**（P1 主题/P2 壳/P3 文献库/P4 阅读器/P5 数据层/P6 时间线/P7A 路由/P7B 编辑/P8 交互收口）；插队批全毕；**open 面=4**（F-TESTREF-S1/S3+F-CONSOL-02+T3-U1） |
| 提交 | …（前链略）…；F-GOV-01 收口 5674597a250+滚动 v70；**P8 立案 7cea26b66dd+实现+翻票+本档** |
| 证据仓外档 | **T3-P8/**（简报 00+impl 两轮报告+审包 21+门一 30/31+回炉裁定+probe 50 号系 12 log+裁决部 60+verify 四档+独立探针 probe-drag.mjs） |

本场门链实录（零 B 级终态）：
1. **立案前核**：检查面板定稿态=已裁（design §2.5 规格行+mockup .lg-inspector
   完整 DOM 亲核+现行 LineageSidePanel 功能面已在[aside w-72=288px 同宽]）——
   设计链免行，直接立案。
2. **实现首轮**：ops-executor（20 改+8 新 +731/−95；TDD 先红+变异 9 支+锁测
   7 断言契约演进申报[主控追认——timeline-edit 自载「P8 翻面」预留注/store-write
   载荷补 month/slot=防半更新清月潜伏缺陷修复]）。
3. **门一**：k1 B2W2N8+d1 B1W8N7 双席独立 FAIL——**B-1 settle FLIP inline 残留
   双席同中**（零位移短路泄漏+rowshift margin 62px 掺入 target）+B-2 陈旧
   fullRowInput 写窗回月（k1 独有）。主控独立 playwright 探针逐帧采样实证
   （t=0 cls='tl-card rowshift'/飞行 129.6→191.6 偏 62px/t=400 清场瞬跳
   156——**T9 绿与 B-1 并存=断言全终态不捕动画路径**）。
4. **回炉 R1-R8**：FLIP 清 inline 四键+回流再量 target（「target 必须在 flow
   态测量」契约）/测量 effect dragging‖settle 双期跳过/lazy 载荷（实现者自裁
   扩面两动作→五动作族，主控追认）/兜底定时器 600ms 幂等/pointercancel/click
   抑制清零/月标互斥/死参死 API 删。新增 9 用例先红后绿+变异 4 支（V-R2 首轮
   假绿→断言改造如实实录）。**回炉后探针复核：飞行终点 155.6=正确位无偏移
   无瞬跳无 rowshift 误挂——R1/R2 真机效果实证**。
5. **门二**：probe 12/12 全 PASS（verify/e2e 双独立跑+变异 R1/R3 复现红还原净
   +探针复核+锁/豁免/INV/树态/行数/代号/reason 抽核；异常①INV-83 计数滞后
   →收口勘正）；裁决部 GO_WITH_CONDITIONS[P0=0/回炉 0]——19 条逐条裁决+数字
   独立复算全一致+四问推演（六源无一静默缩水/R1-R8 无可证阻断新面/R3 反向
   跨格缺口=Q2 独立发现）。**C1-C4 全兑现**：C1 INV-83 勘正 22/7/10+13 支
   谱系；C2 指纹门数字链裁定自洽（base 落后=前票欠账，cur 全 P8）；C3 备案
   落纸（d1-W2 写窗闪回/d1-W8 口径分层/d1-W6 处置补记/509=raw 行 ESLint 有效
   410）；C4 fuseLazy 跨格语义终裁=后到 override 整替胜出可接受（store 注释
   +INV-83 注记锚定，B5 候选优化）。
6. **翻票**：T3-P8 done 走 F-GOV-01 新形态（结论句+archive 指针，归档件含
   五层规约原文+收口记录全文）；README 索引 238→239 行。

## §2 执行序（下一批次——新会话开工）

> 前批执行序见 v70 §2（P8 收口）。战役收官段后续=挂账批+小票池。

1. **T3-U1 挂账批（用户裁决「战役末批统一处理·P8 之后」——现已到期，三屋
   全链）**：保存语义可见性（状态条自动保存槽——信号聚合 TabState.dirty∪
   lineage saveStatus→worst-of 三态真文本）+FOUC 补漏（main 启动同步读
   settings→loadURL 附 theme 参→index.html 同步外链小脚本首帧前生效，
   INV-71 锚定）。票面=registry T3-U1 行（五层规约在册）。
2. 夜批池面：F-CONSOL-02（P5 遗留单源化收敛三件套）/F-TESTREF-S3（FILE 级
   豁免通道）小票暖场候选；F-TESTREF 系候选另含 SR-IPC-10 C4 完备性锚
   backlog+expect.poll 工具盲区+**基线再生成欠账清理**（SR-IPC-10/SR-SEC-01
   两用例 base 缺位——可并入 F-TESTREF 系票显式再生成）。
3. 收口轮视觉细调备案（v64-v68 全项沿用）择机处理。

## §3 悬挂事项（用户知悉/裁决口）

- **e2e 非确定红四指纹（各首现未立案，立案线=同用例 2 次）**：①v69
  reader-text P7BA-MARK 10s not-found；②v69 reader-scroll selectText detach；
  ③本场 ai-notes-section「AI 笔记面板全链」超时族（满载下长时用例）；④本场
  corpus-export F-SESS-01 streaming 时序——四指纹基线在档，第 2 现即按通则立案。
- **基线再生成欠账（P8 C2 裁定揭底）**：指纹门 base 落后=SR-IPC-10/SR-SEC-01
  批后未再生成（preload-surface 事件桥+reader-text app-file 两用例 base 缺位
  ——check 恒 NEW 不阻断；豁免台账 hits=6 与基线快照失配窗口同族[⑮ 行已
  登记]）——下次显式 `test-surface:baseline` 再生成时对账清点（再生成前核
  hits 真实性，当前 6 条均真实命中）。
- **P8 备案面（裁决部 P2/P3 维持）**：B3 拖拽失焦悬挂/settle 期卸载清理抽查；
  B4 删除节点与 lazy 写交错抽查；B5 写窗闪回优化候选（预演驻留同构
  movePreview）；useCardDrag 509 raw 行贴线监控（ESLint 有效 410）；fuseLazy
  跨格边界（C4 已注记锚定）。
- **SR-SEC-01 k1-N5 设计层回写备案（继续挂）**：候选挂点顺延至下次触及
  security 文档的票。
- 旧备案维持：P7B 备案面（乐观 toast 双 toast 语义/Popover 250 顶格/
  saveLineTypes 失败路径无专测/expect.poll 不入指纹账）；selection-geometry.ts:12
  历史注释；lineage-canvas.test 文件名错位；scripts/audits 残留 ignored 6 件
  治理轮清出；版本号显示位=用户未裁 open（T3-U1）；ai-sensor 域 D1-D8 open；
  v56 坑第五变体 doc 批统一处理维持。
- F-TESTREF-S3/F-CONSOL-02/F-TESTREF-S1 open 面 4 票现状。

## §4 开工三态指针

**HEAD=本档提交**。A 干净树=直接接 §2 首项（**T3-U1 挂账批**——保存语义
可见性+FOUC 补漏，三屋全链；票面=registry T3-U1 行五层规约在册）。B 脏树=
先重跑 git status 核实树态再判；C 非交接提交=查门审在档。技能清点先行
（宪法开工纪律）。**本场无新用户裁决；v64 三裁决沿用。收口提交尾注面=
[locked-change] 单尾注**（P8 实现笔含 tests 混合面仍单尾注——v66 §4 口径）；
push 处方=URL 级代理键同键名覆盖直连+**失败重试 ≥8 次（退避 25s）**；
机检命令禁裸管道接 &&、禁 if/循环判定接 `cmd | tee`；bash 控制台回显中文
乱码≠文件损坏（文件层判定只认 node 替换符计数/Read 工具）；**计数类数字
脚本实测落笔**（本场实证：实现者报「豁免 6 条」实测 5 条——申报数字必核）；
**node -e 隔层四坑实录再现**（本场两次静默未生效——探针/替换一律 Write
脚本文件直跑）。done 票翻票走新形态（结论句+archive 指针）。

## §5 教训档回流状态行（裁决 9 固定段）

- CSS 注释星斜杠二次发生族：**已回流**（AI辅助开发经验教训.md §十三条 1）。
- 类名断言≠计算样式生效+字面全等跨机假红：**已回流**（§十三条 2）。
- v68 两条+次段三条+F-GOV-01 两条（2026-09-28）：在案待批回流（P8 收口轮
  已过——顺延至下次触及同族或教训批）。
- **本场新增一条（2026-09-28 深夜段）**：终态断言≠过程正确性——e2e 断言
  全终态（style 清空/DOM 序/reload 持久）会掩盖动画路径缺陷（B-1 与 T9
  全绿并存实录：飞行终点偏 62px+清场瞬跳零终态足迹）；交互动画面须有
  过程级断言（逐帧采样）或独立探针实证面，门一推演与绿证矛盾时以探针
  终裁。已落本档 §0，并入教训档由下次触及同族时随批回流。
