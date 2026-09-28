# 交接书 v72 —— T3-U1 挂账批收口+停段（2026-09-29 凌晨）

> 前承 v71。排程真相源=本档 §2。本场=v71 会话续段：T3-U1 实现+门一双席 PWW
> （零 B）+主控真机 probe+回炉 R1-R4+门二 probe 9/9+裁决部 GWC C1-C2 兑现+
> 翻票归档。**用户指令（2026-09-29）：T3-U1 彻底收口后停段，不开下一批**——
> 本场在 T3-U1 提交毕即收段（停止条件=用户指令，非任务池尽）。

## §0 额度与预算预警

- 本段消耗（账本随记）：ops-executor 两轮（12.8M+4.1M）+门一双席（k1 63.9k+
  d1 92.9k）+probe 736k+裁决部 658k+主控（真机 probe+MR2/C2 亲执）。
- **门链实录两条**：①门一推演与实现申报矛盾时主控真机 probe 一锤定音再成
  先例（W1 Electron 假设实证排除——CSP 居首+query 链实测；W3 pending 语义
  实证=「在途+失败混合」双席同中警告成立）；②node 与 bash 的 /tmp 路径解析
  漂移（MR2 变异备份落盘 C:\tmp 族而非 Git Bash /tmp——还原失手一次，Edit
  直还原+diff 面核对净；**教训：变异备份路径用仓库外绝对路径带盘符**，勿用
  /tmp 相对形式——宪法「变异还原安全」条目的环境变体）。
- **停段记录**：用户指令「彻底做完 T3-U1 后就停下，不再开工下一批次」——
  本场收口毕即停。任务池现状=open 3（F-TESTREF-S1/S3+F-CONSOL-02，全小票
  候选）+悬挂事项若干（§3）——下次开工直接读 §2。

## §1 批次完成情况（段间衔接基线——对不上禁提交）

| 项 | 终值（脚本实测） |
| --- | --- |
| verify | **187 件 / 2048 用例** EXIT=0（=183/2022+4 新测试件+26 例[首轮 23+回炉 3]；三跑：主控首轮+probe+收口终验 50 号档） |
| e2e | app **54 用例** 零增（probe 亲跑 2.1m 全绿；本票 e2e 面零增减——jsdom 覆盖为主票面口径） |
| 指纹门 | cur **cases 2102 / assertions 6453 / skip12**（+26/+12 全数本票构成；base 滞后面维持 v71 §3 登记欠账不变） |
| locks manifest | **273**（267+6=StatusBar/theme-boot.js/4 测试件；锁收集器双侧扩面 public 整面+StatusBar——check-locks+ps1 跨语言对齐） |
| 豁免台账 | **129 条 hits=6 stale=123 零增**（本票零锁测改动——app-shell.test cmp=HEAD 逐字节实证） |
| 战役进度 | T3-U1✓（UAT 挂账批毕）；**open 面=3**（F-TESTREF-S1/S3+F-CONSOL-02） |
| 提交 | …（前链略）…；P8 立案 7cea26b66dd+实现 04ed1e766de+翻票 1d42a9232d7+滚动 2922c54ed6a；**T3-U1 实现+翻票+本档**（本批三笔） |
| 证据仓外档 | **T3-U1/**（简报+impl 两轮+审包 13+门一 30+probe 40 号系 9 log+裁决部+verify 三档+真机探针 probe-fouc+变异件） |

本场门链实录（零 B 级）：
1. **实现首轮**：ops-executor（13 改+5 新；TDD 先红 21 红→绿 44；变异 5 支；
   受锁 app-shell.test 逐字节零改——用例落姊妹件 app-shell-t3u1[617 行超
   max-lines 自裁，主控追认]）。
2. **门一**：k1 B0W4N5+d1 B0W2N4 双席独立 PWW——双席同中 W1（FOUC 两接缝
   零自动化锁：index.html 标签/bootstrap 传参删即全绿）+双席同中 W3（notes
   pending→error 语义）。主控真机 probe 三值实证（CSP 居首 idx 55<668+
   location.search="?theme=light"——loadFile {query}→file:// 链 Electron 44
   实测通+dataset.theme 写入）=W1 Electron 假设风险排除；W3 终裁=成立须修
   （pending=「edit 置 true/save 成功清/失败不动」在途+失败混合→打字防抖窗
   常显红色假失败）。
3. **回炉 R1-R4**：静态锁两接缝（theme-boot.test 新 describe+INV-71 锚列）/
   pending 分档（annoDirty→error+notePending→saving——useTabDirtySignals
   facade 拆源+MR3 变异红证；quitDirty 链零触碰）/light 正例（三值闭合）/
   settings 头注补档。变异新增 3 支全还原净。
4. **门二**：probe 9/9 零差异；裁决部 GWC[P0=0]——W1-W4 全闭合+备案 7 项
   成立+数字复算六数字自洽+独立发现 1 条（notes 持久失败子态恒显「保存
   中…」→C1 登记级）。**C1-C2 全兑现**：C1=本档 §3 登记行；C2=接缝二变异
   红证主控亲执（MR2 摘 readThemeSync→静态锁 1 failed→还原绿 8/8——还原
   过程 /tmp 路径漂移一次，Edit 直还原 diff 核对净）。
5. **翻票**：T3-U1 done 走新形态；README 索引 239→240 行。

## §2 执行序（停段后下次开工——本档为排程真相源）

> **本场按用户指令停段**（2026-09-29）。下次开工首动作=开场三态+技能清点，
> 然后按下列池面取票（池面已就绪无空池）：

1. 小票暖场候选：F-CONSOL-02（P5 遗留单源化收敛三件套）/F-TESTREF-S3
   （FILE 级豁免通道）。
2. F-TESTREF 系候选票：SR-IPC-10 C4 完备性锚 backlog+expect.poll 工具盲区+
   **基线再生成欠账清理**（SR-IPC-10/SR-SEC-01 两用例 base 缺位——⑮ 行
   退役触发器，显式 `test-surface:baseline` 再生成时对账）。
3. 收口轮视觉细调备案（v64-v68 全项+P8 备案 B3/B4/B5）择机。
4. 版本号显示位=用户未裁 open 勿动。

## §3 悬挂事项（用户知悉/裁决口）

- **[C1 登记行·裁决部条件]notes 持久失败子态在状态条面不可与在途区分**
  （pending 混合语义下恒显「保存中…」；缓解=notes 草稿面板级四态 save-status
  既有+退出拦截覆盖退出时点；无数据丢失面，仅状态条显示失真向——UAT 复发
  即立票）。
- **e2e 非确定红四指纹**（各首现未立案，立案线=同用例 2 次）：reader-text
  P7BA-MARK/reader-scroll selectText detach/ai-notes-section 超时族/corpus-
  export F-SESS-01 streaming——第 2 现即按通则立案。
- **基线再生成欠账**：指纹门 base 落后=SR-IPC-10/SR-SEC-01 批后未再生成
  （⑮ 行登记；下次显式再生成时对账清点，当前 hits=6 均真实）。
- P8 备案面（B3 失焦悬挂/B4 删除节点 lazy 交错/B5 写窗闪回/509 贴线/
  fuseLazy 边界）；T3-U1 备案面（lineageDirty 假已保存窗[方向与 W3 相反=
  假绿，P2 候选对齐 saving 档]/module-defer 负锚缺[一行补强候选]/静态锚
  误红维护面/walk 守卫不对称/三值三处并存/装配级首帧执行=旁证级）。
- SR-SEC-01 k1-N5 设计层回写（挂）；旧备案维持（P7B 面/selection-geometry
  注释/lineage-canvas.test 错位/scripts-audits 残留 6 件/ai-sensor D1-D8/
  v56 五坑 doc 批）。
- F-TESTREF-S3/F-CONSOL-02/F-TESTREF-S1 open 面 3 票现状。

## §4 开工三态指针

**HEAD=本档提交**。A 干净树=直接接 §2 池面首项（小票暖场候选——需按三屋
全链或分级烤验裁量）；B 脏树=先重跑 git status 核实树态再判；C 非交接提交=
查门审在档。技能清点先行（宪法开工纪律）。**本场收段=用户指令**（非任务池
尽非真阻塞——三停止条件之外的指令停段，如实记录）；尾注面=[locked-change]
单尾注；push 处方=URL 级代理键覆盖直连+重试 ≥8 次（退避 25s）；机检禁裸管
道接 &&/tee 假阳性；bash 乱码≠文件损坏；计数数字脚本实测；**变异备份路径
用带盘符绝对路径**（本场 /tmp 漂移实录）；done 票翻票走新形态。

## §5 教训档回流状态行（裁决 9 固定段）

- CSS 注释星斜杠族/类名断言族：**已回流**（§十三条 1/2）。
- v68 两条+次段三条+F-GOV-01 两条+v71 一条（终态断言≠过程正确性）：在案
  待批回流（下次触及同族或教训批）。
- **本场新增一条（2026-09-29 凌晨）**：变异备份路径禁用 /tmp 相对形式——
  node 与 bash 的 /tmp 解析漂移（Git Bash→Temp 目录 vs node→盘根\tmp）致
  cp 还原失手实录（MR2 C2 执行面）；变异备份一律带盘符绝对路径（仓外档案
  区），还原毕 diff 核对+备份删除。已落本档 §0，随批回流。
