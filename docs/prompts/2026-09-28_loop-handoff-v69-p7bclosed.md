# 交接书 v69 —— T3-P7B 连线编辑交互收口（2026-09-28 晨段收口·五段）

> 前承 v68。排程真相源=本档 §2；战役真相源=docs/design/2026-09-26_theme-trio-final-design.md §6；
> P7 设计真相源=docs/design/2026-09-27_t3p7-line-connection-design-final.md（§4 线型系统 UI 本票全兑现）。
> 本场=v68 会话续段：T3-P7B 立案+实现三屋全链（回炉 2）+门二 GO_WITH_CONDITIONS+收口。
> v68 用户裁决「新任务下一会话开工」已履行（本会话=P7B 专段）。
> **2026-09-28 次段滚动**：C-A4 收口第二段（push+CI 首推）→三连红→插队票 F-CI-01
> （CI npm ci 红修复）→CI 首绿（08-27 以来第一次）→C-A4+F-CI-01 双翻票收口。

## §0 额度与预算预警

- 本段消耗（账本随记 9 条）：ops-executor 三轮（69.1M+19.7M+15.8M）+门一四席
  （k1 首审 3.2M+d1 首审 1.8M+k1 复审 2.5M+d1 复审 5.6M）+probe 2.0M+裁决部 6.5M+orchestrator。
- **门链教训三条**：①CSS 假绿双形态同批两现（星斜杠吞规则[机检空白]+特异性压栈
  [类断言/CSS 文本锁盲区]）——关键视觉态须 computed style 判别断言+数值容差域
  （DPR 吸附教训）——已回流教训档 §十三；②B 级根因再证 v68 §4 判断（设计/简报层数字
  会照抄进产物——C2 popover 15 笔误源头=主控回炉简报，简报数字也须实测落笔）；
  ③回炉 2 小批免独立审（P7A 先例）实测可行——文书勘正类处置主控亲验成本远低于独立审。
- **次段消耗（账本 3 行）**：orchestrator（F-CI-01 立案+根因诊断+fixture A/B+实现+三轮
  verify 亲验+提交推送+双翻票）+ops-gate1-k1 两轮（24.6k+29.6k tokens，纯内联零 Read）。
  R5 单点配置批=k1 单审+主控亲验（k1 认定不升级双审——失败成本=CI 继续红无增量损失）。
- **次段教训三条（§5 详）**：①`cmd | tee` 管道退出码污染（tee 恒 0→if 判定假阳性
  「PUSH OK」——v68 教训④同族扩记：if/循环判定禁接裸管道）；②bash 控制台回显中文
  乱码≠文件损坏（文件层编码判定只认 node 替换符计数/Read 工具——坑②变体，曾诱发
  误删好行一次，git diff 恒等还原）；③「本地绿≠CI 绿」新形态：install/ci 形态行为差
  +lifecycle PATH .bin 顶替 npm 自带 node-gyp（INV-81+F-CI-01 票面在案）。
- 下一会话/次项：SR-SEC-01 ACAO 通配收束（治理五票批序 3）。

## §1 批次完成情况（段间衔接基线——对不上禁提交）

| 项 | 终值（脚本实测） |
| --- | --- |
| verify | **179 件 / 1978 用例** EXIT=0（SR-IPC-10 +2 件/+24 例后；closure 树亲验 18 号档 exit=0——含 A 案豁免+票号清理后终态） |
| e2e | app **52 用例**（SR-IPC-10 零增量） |
| 指纹门 | **194 文件（cur 196）/ 2030 用例 / 6241 断言 / skipSite12**（冻结基线 194/1994/6175/12；累计增量=SR-SEC-01 +12 例/26 断言+SR-IPC-10 +24 例/40 断言——裁决部逐条复算全过） |
| locks manifest | **261**（generate 收 4 新受锁件：events.schemas+type-test+两 unit 测试） |
| 豁免台账 | **124 条**（A 案 +1：preload-surface 陈旧断言豁免 hits=1；全 stale=123 跨票观察项移交 F-GOV-01；**台账 124 vs baseline 快照 123 失配窗口**——check 不读快照轴风险有界，显式基线再生成时对账） |
| 战役进度 | P1-P7B✓；治理五票批：F-CONSOL-03✓+C-A4✓+SR-SEC-01✓+**SR-IPC-10✓（次段三收口 035da2f6556）**——**四票毕仅余 F-GOV-01**；插队票 F-CI-01✓；T3-U1 挂账批；**open 面=5**（F-TESTREF-S1/S3+F-CONSOL-02+F-GOV-01+T3-U1） |
| 提交 | …（前链略）…；SR-SEC-01 收口 d716f08e95f+滚动 db9cc156b0f；**SR-IPC-10 收口 035da2f6556** |
| **CI 状态** | **run 36372251379 success=2026-08-27 以来首绿**（绿头=318cd79c521；npm ci 步过+指纹门步真实执行绿+lock-change-guard 绿+e2e 51 passed 2.6m；此前三连红 36369814511/36364274452/36329103053 均=F-CI-01 域 npm ci 断因） |
| 证据仓外档 | F-CONSOL-03/（impl+probe 报告+k1/d1 两轮+裁决部四门审档+raw 40+件+开工记录）；**C-A4/（31-push～36 取证链+fixture 实验场）；F-CI-01/（impl 报告+k1 两轮档+raw 15 件）** |

本段门链实录（B 级根因与教训在档）：
1. **首审双 FAIL——B-1 双席独立同中**：`.tl-card.link-src`(0,2,0) 被编辑态基线
   (0,3,0) outline 全量压栈=拾取源高亮唯一相位 100% 不可视；类断言 toHaveClass+
   CSS 锁文本正则双假绿（「52 测试全绿但文字不可见」同族第三形态）。
2. **回炉 1 六改一勘正**（R1 选择器升 (0,4,0)+e2e computed 判别/R2 pickChip 陈旧守卫/
   R3 deps 补 formOpen/R4 startLinkPick 显式关 popover[结构性互斥]/R5 飞行窗禁建
   [主控裁定窗口禁建——store 全域无乐观写前提]/R6 死声明两处/R7 措辞）→复审双过线
   （k1 PASS+d1 PASS_WITH_WARNINGS）→回炉 2 五项免独立审（R8 staleEdge 双挂/R9
   容差 [2,3]+0.8px 勘正[RPR≈1.25 吸附]/R10 注释依据/R11 INV 三笔/R12 措辞）。
3. **过程自拦两缺陷**（实现者）：CSS 注释星斜杠吞 .timeline 规则（CSSOM 探针实证
   ——P1 同族二次发生，教训档 §十三回流）+e2e P1b 量测坐标系竞态（终版单 evaluate
   原子取值闭合）。
4. **probe 异常 3 条均非阻断**：popover 计数 15/16 笔误（源头=主控简报数字——C2 勘正）
   /简报侧 6226 vs 实测 6230（主控误差）/tinypool 瞬态一轮复跑两轮全绿（低于 e2e
   非确定立案线——指纹登记：EXIT=1+用例全绿+ProcessWorker.initialize）。

**次段门链实录（2026-09-28 下午段——C-A4 收口第二段+F-CI-01 插队票）**：
1. **push 处方生效**：URL 级代理键同键名覆盖直连 push 一次成功（ab485272acc..45619a7ba76）；
   F-CI-01 笔 push 直连间歇（1 次 reset+6 次连不上）第 7 次成功——**直连 push 需重试韧性**。
2. **CI 三连红取证**：首推 run 36369814511 失败步=npm ci（非 C-A4 指纹门步——根本没执行到）；
   前两笔历史 run 同步红+末绿=08-27 → 判=环境级断因非票面所致。
3. **根因诊断（fixture A/B 全实证）**：npm 11.19 对「binding.gyp+无 install 脚本」包在
   npm ci 形态触发缺省 node-gyp rebuild（npm install 形态不触发=本地一个月无感分叉）→
   lifecycle PATH 解析项目 .bin 的 node-gyp@9.4.1（@electron/rebuild←electron-builder 传递）
   → 无法解析 runner VS 18 → npm ci 红。fixture 复刻链：触发实证（debug log info run
   code 0）+deny 后跳过实证（897ms 零编译零 info run）+require prebuilds 功能绿。
4. **F-CI-01 门链**：R5 单点配置批=k1 两轮（首轮 PWW B0W3N3+delta 复审 PASS B0W0N2，
   纯内联零 Read；W1 allowScripts CI 零实证史→首绿销项/W2 全树 binding.gyp 静态枚举恰
   1 命中+不采全量重装[代理已死毁绿态树风险不对称]/W3 INV-81 随票登记）。
5. **CI 首绿**：run 36372251379 success（5m10s+e2e 51 passed）——C-A4 C2 锚与 F-CI-01
   终验收同 run 兑现；双翻票收口（5f738f3afd7+841969ba61e）。

## §2 执行序（下一批次——新会话开工）

> **2026-09-28 治理加固五票批并入**（用户裁决「全部立案+完整规划链+并入下批」；
> 规划链三段毕+真相源=docs/design/2026-09-28_gov-batch-design-final.md
> D-GOV-1..20；执行序定档=设计终裁 §6）。五票均双审（各触受锁/CI/安全/
> src/shared——不适用 R5 小批减免）。

1. **F-CONSOL-03 测试资产清出✓（2026-09-28 收口）**：四探针移仓外+W2 勘正+audits 六件
   清出+基线重跑 194/1994/6175/skip12/snap123+manifest 257；门链=k1 PASS+d1 补正后
   PWW+probe 8/8+裁决部 GO_WITH_CONDITIONS（C1-C4 全兑现）。**教训两条已回流本档 §3/§5**：
   ①票面「指纹门零影响」系设计层存量假设失实（⑤i 纪律当场证伪——主控前置实测拦截，
   实现改走删基线显式重跑）；②门一 d1 席代理档隔离墙**禁 Read**——门一简报禁授权
   Read，审包必须全内联（首轮 FAIL 系检材不合规，重派补正后过线）。
2. **C-A4 CI 口径对齐✓（2026-09-28 次段收口）**：三屋链全毕+**CI run 36372251379 首绿
   =C2 终验收锚兑现**（绿头=318cd79c521；本票指纹门步真实执行绿+lock-change-guard 绿；
   注记：实现笔 c484f330578 首推三连红系 F-CI-01 域环境断因，非本票 diff 所致）。
   C1-C5 全兑现；W1 表述修正建议随记入翻票 summary（主登记位=本档 §3，触发点=
   F-GOV-01 立案核或微票）；实现笔=c484f330578+翻票笔=841969ba61e。
2a. **F-CI-01 CI npm ci 红修复✓（2026-09-28 次段插队票当日闭环——非五票批新票）**：
   package.json allowScripts deny better-sqlite3（npm 11.19 install-scripts 审批机制）+
   INV-81 登记。根因=npm ci 缺省 node-gyp rebuild→项目 .bin 的 node-gyp@9.4.1 无法解析
   runner VS 18；修复=deny 跳过零产物需求的编译动作（v13 自带 prebuilds）。门链=k1 两轮
   （PWW B0W3N3→delta PASS B0W0N2，R5 单点配置批定档）；verify 三跑 EXIT=0；**终验收=
   CI 首绿同 run**；实现笔=318cd79c521[dep-change][locked-change]+翻票笔=5f738f3afd7；
   证据=仓外 F-CI-01/。**本票为 CI 验收链路解锁票——后续票 CI 验收依赖已修复**。
3. **SR-SEC-01 ACAO 通配收束✓（2026-09-28 次段二收口 d716f08e95f）**：三屋全链毕
   [实现六自裁+门一 k1 PASS B0W0N5/d1 PWW B0W2N6 纯内联+probe 6/6+裁决部 GWC P0=0
   C1-C4 全兑现]。**取证重大发现：Origin 头 protocol.handle 层恒不可观测**（Electron
   剥离 forbidden headers，dev+prod 双态实测）——设计前提实测推翻在案，实现按终裁
   原样落地=休眠防线（INV-07 已登记激活前提）；白名单语义全向攻击推演无逃逸。
   基线滚动：verify 177/1954·e2e 52·指纹门 cur 2006/6201（超集）。W1（休眠面落
   INV-07）已修；C3 勘误（分项行数/用例计数）登记 16 号批次日志。
4. **SR-IPC-10 契约缺口双修✓（2026-09-28 次段三收口 035da2f6556）**：三屋全链毕
   [实现九自裁+门一 k1 PWW B0W5N6/d1 PWW B0W3N8 零 B 双席+probe 7/7+裁决部 GWC
   P0=0 C1-C4 全兑现]。A 案处置链在档（陈旧样例勘正+豁免 1 条——指纹门真实拦截
   证据）；收口增处=src 注释五处票号清理（done 票号非自身文件引用触 check-tickets
   占位规则——**教训：src 注释禁带非自身工单号**）。基线滚动：verify 179/1978·
   locks 261·exemptions 124。
5. **F-GOV-01 治理减容役**（双审+抽查链亲验；两单元两提交）：registry/INV
   存量瘦身+归档[check-tickets 三约束]+防线生命周期登记+治理面退出条件宪法
   条款+日落规则；验证面=抽查 5 票三段链+KB 对照。
6. **P8 交互收口（战役收官重票，三屋全链）**：负债三源汇流=①槽位拖拽重排
   （design §2+P6 备案——x/y 退役后 moveNode 重接槽位语义）；②编辑模式改月飞行动画
   （mockup month-pop L1100+——P7B mode 态共用面已备）；③检查面板（design §2 待裁面
   ——立案时核 design §2 是否已裁，未裁=设计链先行）；④shift 挂摘平滑过渡重接
   （P6 备案——.tl-measure 冻结代价解除路径）；⑤飞行中连线脱节重算（W8/D-12——
   rAF/位置订阅）；⑥drag-hint view 态双文案恢复（P7B 备案——拖拽接入时）。
   **P8 立案前核 design-final §2 检查面板形态是否定稿——未定稿部分走设计链**
   （Kimi 拟定→deepseek 审→主控终裁，v67 先例）。
7. T3-U1 挂账批（用户裁决「战役末批统一处理·P8 之后」）。
8. 夜批池面：五票+P8 分段近夜批容量；F-CONSOL-02/F-TESTREF-S3 小票暖场候选。

## §3 悬挂事项（用户知悉/裁决口）

- **SR-IPC-10 终帧残余登记（裁决部 C2）**：safeParse 丢弃仅畸形帧；**畸形 done 帧被
  丢弃=进度条停留、无自愈路径**（「陈旧一拍自愈」对终帧不成立）——可信生产者
  （同仓同版本 main=受信）下不可达，登记为防御面边界。
- **SR-IPC-10 快照失配窗口（裁决部 C3）**：豁免台账 124 vs baseline exemptionsSnapshot
  123（A 案 +1 后未再生成基线——check 不读快照轴=风险有界）——**F-GOV-01 立案核
  或下次显式 baseline 再生成时对账**（再生成前核该条仍真实命中，当前 hits=1 成立）。
- **SR-IPC-10 完备性锚 backlog（裁决部 C4，F-TESTREF 系候选）**：新增第 4 事件通道
  =接线表+events.schemas 两处对齐，**无测试因此变红**（无 Record<keyof
  PreloadEvents> exhaustiveness 锚）；P2 备录=main-window.ts L274 windowState send
  形参内联结构→改引 shared WindowStateEvent（类型单源缝隙）。
- **SR-SEC-01 设计层回写备案（k1-N5，裁决部 C2 兑现）**：本票取证证伪设计前提
  （Origin 可观测假设）——威胁模型已从「现行威胁修复」实测转为「透传形态变化时
  既位防线」（休眠+激活前提已登记 INV-07）。ADR/设计文档层面回写超本票范围——
  候选挂点=F-GOV-01 立案核或下次触及 security 文档的票（docs/security.md §3 与
  app-file 段核对时顺带）。
- **push 直连间歇性经验（次段实证）**：处方命令（URL 级代理键同键名覆盖=直连）非一次
  必成——次段两 push：首 push 一次成功、F-CI-01 笔 1 reset+6 连不上后第 7 次成功。
  **push 失败=重试（建议 ≥8 次退避 25s）非换法**；代理 7890 口本段全死（connection
  refused）勿走代理路径；gh API（api.github.com）同间歇——盯 CI 命令须带重试包裹。
- **C-A4 W1 表述修正登记（裁决部 C3 主登记位）**：AGENTS.md DoD 行「verify⊇CI：另含
  指纹门」子句被 C-A4 自身 ci.yml 落地即两侧收敛（D-8 成文锚定前态）+严格集合读法
  方向存疑（落地后 CI 关卡集实为 verify 链超集——CI 另含 e2e/审计）。触发点=下次
  触及 AGENTS.md DoD 行/verify-CI 口径的票（F-GOV-01 立案时核或独立微票）；修正方向
  =「指纹门 verify/CI 两侧同含」类精确化+「不是 README 数字」挂靠点微调（k1-N4）。
- **P7-B flake 指纹登记（F-CONSOL-03 门二 V2 首现，C4 兑现——落本档非 flake-ledger
  以免扩票面 diff）**：reader-text.spec.ts:221 P7-B 收官三序列
  `getByText('P7BA-MARK')` 10s 超时 not-found；串行第 41 位；复跑同用例 2.6s 绿；
  **非确定失败第 1 现（立案线=同用例 2 次）**；与本批改动面零交集。第 2 现比对
  基线=本指纹（not-found 型/41 位/10s）。候选归属=next e2e 触及场或 W4 flake
  台账批量补登。
- **exemptions 123 条全 stale 观察**（门二 F1）：跨票累积历史形态非 F-CONSOL-03
  引入（移出前即 124/0/124）；**移交 F-GOV-01 防线生命周期登记面评估**。
- **v56 坑第五变体**（F-CONSOL-03 实现者实录）：node -e 含 `=>` 时 `>` 被 shell
  吃掉→命令截断+意外空文件——「node -e 仅限纯 ASCII 单行」口径应再加「禁 `>`/
  `=>` 字符」；AGENTS.md 四坑并五坑由后续 doc 批统一处理（本档备案）。
- 收口轮视觉细调备案（v64-v68 全项沿用+新增：--signal-a08/--shadow-lg-* 暗护眼
  hue 微差[三稿同值权威维持，用户实感违和则细调]；catalog_no 前缀形态）。
- **P7B 备案面**：乐观 toast 双 toast 语义（P2 观察项）；Popover 250 顶格零余量
  （+1 行即红——P8 触该件先拆）；saveLineTypes 失败路径无专测（缺口登记）；
  expect.poll 不入指纹账（工具盲区——F-TESTREF 系候选）。
- **P8 负债登记**（design §7+P6/P7A/P7B）：飞行中连线脱节重算/shift 平滑过渡/
  mode 态共用面/月标改月+拖拽调序+虚线槽。
- F-TESTREF-S3 open（P6/P7A/P7B 三轮 baseline 首装=场景再证×3——轴二全效
  三连验）；F-CONSOL-02 三件套 open；selection-geometry.ts:12 历史注释；
  lineage-canvas.test 文件名错位（F-CONSOL 系候选）。
- P3 遗留：scripts/audits 残留 ignored 6 件治理轮清出（裁决部 P3）。
- 版本号显示位=用户未裁 open（T3-U1）；ai-sensor 域 D1-D8 open（survey §7）。

## §4 开工三态指针

**HEAD=本档提交**。A 干净树=直接接 §2 首项（**F-GOV-01 治理减容役**——治理五票
批序 5 收官，双审+抽查链亲验；两单元两提交[D-GOV-15 不拆票]；W1 表述修正核=
本票立案时触发点）。B 脏树=先重跑 git status 核实树态再判（v66 §1-1
教训）；C 非交接提交=查门审在档。技能清点先行（宪法开工纪律）。**本场无新用户裁决；
v64 三裁决+v68 收段指令沿用。收口提交尾注面=[locked-change] 单尾注（v66 §4/P5-P7B
先例；触 package 件时叠 [dep-change]——F-CI-01 先例双尾注）**；push 处方=URL 级代理键
同键名覆盖直连+**失败重试 ≥8 次**（§3 经验——直连间歇本日实证）；机检命令禁裸管道
接 &&、**禁 if/循环判定接 `cmd | tee`（tee 恒 0 假阳性——次段 PUSH OK 误判实录）**；
**bash 控制台回显中文乱码≠文件损坏——文件层编码判定只认 node 替换符计数/Read 工具**
（坑②变体，次段误删好行实录）；简报内数字也须实测落笔（v69 段 C2 教训沿用）。

## §5 教训档回流状态行（裁决 9 固定段）

- CSS 注释星斜杠二次发生族：**已回流**（AI辅助开发经验教训.md §十三条 1）。
- 类名断言≠计算样式生效+字面全等跨机假红：**已回流**（§十三条 2）。
- v68 两条教训（设计层 B 级根因/React 子 effect 先于父）：v68 登记未入档——
  触发场次=v67/v68 会话，性质=「当初为什么立规则」成立，P8 收口轮补回流或
  下次触及同族时随批回流（在案待办）。
- F-CONSOL-03 两条（2026-09-28 段）：①设计层存量态假设（「零影响」类）必须设计期
  实测——⑤i 纪律已有，本票=主控前置拦截正例（若未拦截=实现中段 verify 红回炉）；
  ②门一简报对 d1 席禁授权 Read（其代理档隔离墙）——审包全内联纪律（ai-dev-org
  ORG-12 红旗「给门一的包里含任何仓库访问信息」的宿主子代理形态）。两条均已
  落本档 §2/§3，并入教训档由下次触及同族时随批回流。
- **次段新增三条（2026-09-28 下午段）**：①`cmd | tee` 管道退出码污染——if/循环判定
  接裸管道取 tee 恒 0 退出码产「PUSH OK」假阳性（v68 教训④「禁裸管道接 &&」同族
  扩记：判定面一律先取真实 rc）；②bash 控制台回显中文乱码≠文件损坏——文件层编码
  判定只认 node 替换符计数/Read 工具（坑②变体；次段曾据此误删好行，git diff 恒等
  还原+Edit 通道重写闭环）；③「本地绿≠CI 绿」新形态=install/ci 形态行为差+lifecycle
  PATH .bin 顶替 npm 自带工具链（F-CI-01 全案在档+INV-81 锚定）。三条均已落本档
  §0/§3/§4，并入教训档由下次触及同族时随批回流。
