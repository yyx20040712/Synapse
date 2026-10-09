# 交接书 v173 —— DB-2 020-U2b-1 任务系统收官·U2b-2 装配引擎候场（2026-10-09）

> 前承 v172（取代制）。本档=接棒会话（runId=20261009-dbcamp-db2c，用户令
> 「[$ai-dev-org] v172 交接书」）完成 **020-U2b-1 任务系统全链收官**的单源。
> **下场开工序=§1。**

## §0 本场总账（runId=20261009-dbcamp-db2c，账本 953-974）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 开工 | 技能清点+主控拆场预裁（U2b 拆两场：本场=任务系统单面——v172 §1-2 授权）+**呈裁四件**（裁决部 N1-N3 三件套+主控开工新发现设计单源互斥=代理检索可见集〔§3.D D1 并集 vs 裁定①「撤销并集」未同步——接缝归责停报〕） | 账本 953-954 |
| 用户四裁（14:35） | ①幽灵会话=四入口显式 NOT_FOUND+同锚重复 openSession 允许②拒写文案修「可淘汰的非置顶消息不足（置顶 N/共 M）」③形态先于存在性跨服务统一④代理检索可见集=目标锚∪global 并集（global 分类已重定位能力域无研究内容泄漏；用户检索路径隔离不动——两读者不同面） | ruling 954 |
| 实现 r0 | 新 src 3+扩写 3+接线 2+docs 2（INV-128+报告 §3.A 同步）+新测试 4+改 4=+79 用例；自裁 16 条 | 955-956 |
| 门一首轮 | k3 B0/W1/N7+d1 B0/W1/N13 双 PWC（W=三方对齐子串包含/摘要截断口径） | 957-958 |
| 回炉 r1 | 七项全处置（memoryDigest 每侧 ≤200+R23 出生红 388>200/G14 四方集合等值 sqlite_master 取证/G15 分类对齐/T18/R24/R6 epoch 断言/@internal）=+4 用例 2990 | 959-960 |
| delta 复审 | k3 B0/W1/N5+d1 B0/W1/N7 双 PWC——r1 两 W 均判闭环；k3-W1=主控打包切片失误亲验销（R6 断言 L156-189 在档） | 961-962,965-967 |
| 回炉 r2 | 四项轻量（handlerOverrides 白名单守卫 fail-fast+R25 出生红/G14 双侧 sort/R23b update 路下界断言/微清理）=+2 用例 2992 | 963-964,968-969 |
| d1 微 delta | PASS（W1 本体闭环）；条件项（R23b 断言全文）主控亲读销——L361 下界断言在档。**门一链终态=放行**（零 B/回炉 2/2） | 970-971 |
| 门二 probe | 八项全 GREEN（P1 状态机 44/44/P2 三闸序 6/6/P3 围栏 5/5/P4 并集 9/9+隔离回归 20/20/P5 超时 7/7/P6 审计 11/11/P7 全量对账 4/4/P8 幽灵文案幂等 13/13）+变异双独立复现（M-G1 摘守卫→R25 红/M-G2 digest 还原→双红 326>200）；异常 6 条全探针侧零实现缺陷 | 969-970 |
| 裁决部终裁 | **GO_WITH_CONDITIONS**（六面全成立/说了没改 7 抽属实/独立复算 85 精确/残余 6 条全 N 级；**主控勘正其复算句 cases 3053 系沿 v170 旧基线笔误——真口径 3009+85=3094**） | 972 |
| 收口 | verify 第一跑 EXIT=1（**quality 门：两 repo 超 300 行**——简报 §6 漏列 quality:check=主控简报缺陷落档）→r3 拆分（ai-tasks 376→277+ai-memory 305→266，沿 lineage.repo.rows.ts 先例，工厂签名零变 2992 零变化）→指纹门 M4/M8 标题随裁②改写=临时豁免 2 条→regen→终态空→**verify EXIT=0 两跑**（close3/4）→提交 ed8614a9081（25 件 +4599/-135 [locked-change][test-refactor]） | 973-974 |

成本 ≈**57.4M subagent tokens**（executor 四轮 52.27M〔26.86+12.09+6.56+6.76〕+probe 3.58M+审读面
1.56M〔k3 三席 1.28M+d1 三席 0.28M〕）+主控 host-max。kimi 面沿承 ops-gate1-k3=kimi-k3 源
（用户 00:08 令二路由令未见撤销即沿承——开工行申报在档；k1/k2 未用）；R6 注记=k3 座
同席三角色（首审+delta+裁决部），独立对冲=d1 三轮+probe 八项矩阵。

## §1 下场开工序（单源）

1. **U2b-2=020 服务层件三：装配引擎**（设计单源=专项报告 §3.C/§3.E+08:59 三轮终态
   〔aeb2697a3e8——L1 骨架常驻+按需展开/尾段 400-600-200 cap 1200〕+终裁补遗 B-1/W-3/
   N-4/N-5/N-7+020 头注 T1-T5）。装配引擎=L1-L3 三级（L1 骨架=锚摘要+记忆标题索引
   〔分类×计数+置顶 top-3+最近 3〕+能力清单〔仅 global〕+lineage 特化骨架〔标题+星标
   +全部连线+标签清单+笔记标题索引+记忆索引+文件夹名——@30 节点 ~1500/cap 1800/大图
   护栏 120〕+L2 结构摘录〔片=单行摘录 120 tok 原子舍弃+配额 15/13/8 非填充义务+排序键
   三型〕+L3 尾段现算〔消息窗 500/召回 300/代理 200——lineage 重分配 400/600/200 cap
   1200〕）+缓存键 (scope,anchor,ctx_ver) 字节相等+估计器 estimateTokens（cjk×1.0/
   other×0.25 初值）+L3① 检索源扩展（图内文献域 top-5 单篇 250 tok）+图元片源退化
   空片（graph_meta 键面无锚关联——前置①结论）。
   **U2b-2 前置输入包（本场新得+沿承，全携带）**：
   - **必接项三件**（本批挂账）：恢复扫描 bootstrap 接线+启动测试（裁决部/门一双席
     共识）；非 CAP 回写异常统一映射（d1-N3）；运行期输入闸（idempotencyKey/target
     null 态/listTasks 值域/limit 下限——d1-N9，IPC 批面若装配批出 IPC 则随批）；
   - INV 随批登记两件：INV-J 落地句（注入面⊆epoch 10 表集合）+排序键三型适配句
     （B 型 4 表「改名不升序」偏差措辞）；
   - ai-tasks.service.ts 物理 501 行（ESLint 口径绿）——**禁再膨胀**（装配引擎另起件）
     （裁决部 N-1）；顶层 appendAudit/finalizeRunning/listAudit 类型收窄评估（d1-N2）；
   - digest 扩列评估（category/pinned 退出=pin-only 突变 before/after 恒等——审计抽屉
     消费面定夺，k3-N4/d1-N6）；scope 换档变异候选（判别力已被 M3+P3+U/I 吸收——
     装配批变异规划沿用，裁决部 N-5）；
   - 会话技术事实直取：runTask 签名携 sessionId（DDL 无 session 列——自裁①已审）；
     messageOf/memoryDigest 摘要工具件=ai-tasks.actions.ts；并集原语=ai-memory.repo
     UNION_PREDICATE 三件；epoch 读=change_epochs 表。
2. 节奏沿承（≤2 件/场）：U2b-2 若超载（估计器校准+三级装配+缓存=大面）可再拆
   U2b-2a（L1+L2+缓存键）/U2b-2b（L3 尾段+校准协议），下场主控定。
3. U2b 毕后：DB-2 UI 面（会话入口/任务卡/审计抽屉/预算设置页〔裁定③〕——承载形态
   呈裁）+e2e 面恢复+DB-3 导出快照批。

## §2 沿承挂账（下场携带——均非阻断）

- **C3 计数失实两现红线沿承**——本场 executor 四轮申报全吻合亲核（79→85→85→85 零
  失实，红线未触第三现）；行数申报微陈两笔在档（裁决部 N-6：actions 213 vs 216/
  ai-tasks.service 496→501 未重报）——下场简报照旧预注+分项亲核。
- **简报自验清单补全教训（本场新得）**：简报 §6 必列 **quality:check**（本场漏列致
  收口门红一轮）——下场简报自验清单=quality/lint/typecheck/vitest/locks/model-names
  六件全套。
- **指纹门标题改写流程定型（本场新得）**：受锁测试用例标题随实现改写=旧 case 退役
  面——先登临时豁免（reason+rulingLink）→baseline regen→清空豁免→check 复验（终态
  空）；M4/M8=首例。
- **打包切片纪律（本场新得）**：delta 包取段须 grep 定位 it( 行号后按号取（本场
  L60-110 切片失误致 k3-delta-W1 悬挂——主控亲验销但浪费一轮问询）。
- 沿承沿承：flake :1030 count=2 filed（再现首取 error-context 快照）/adjudicator R
  清单（v169 §2）/R5 指纹门 Req 形状=F-REQFP-01 已立票/N 级卫生票池（v168 §2）/
  物理命名漂移（一律物理名）/账本 ts 取系统时钟。
- 会话技术事实：AppErrorCode 复用面=INVALID_REQUEST/NOT_FOUND/CONFLICT（禁新增封闭
  枚举）；受锁面=tests/shared/migrations/scripts/configs（src repo 件不入 locks——
  r3 拆分零 locks 操作实证）；repo ≤300 行 quality 门（本轮两件踩线实录）。

## §3 待用户面（沿承 v172 §3 增量——均非即刻）

1. F-UIRES-04 C/D 呈裁（沿承——等批 1a 探针时机随批）。
2. DB-2 UI 面承载形态（DB-4 窗或独立票）——U2b-2 毕后呈。
3. 预算设置页（裁定③）落位时机——随 UI 面呈。
4. U2b-2 开工呈裁候选：估计器系数初值确认（a=1.0/b=0.25——纯预裁可代行）+L3 检索
   源扩展范围（图内文献域四列——报告终态已定，无呈裁必要则跳过）。

## §4 基线与治理

- HEAD=U2b-1 单笔 ed8614a9081（25 件 [locked-change][test-refactor]）+v173 本笔。
  工作树=clean（收口 git status 亲验）。
- verify：**EXIT=0 亲验两跑**（close3/close4——regen 后）；**285 文件/2992 用例**；
  指纹门 **313·3094·10121·skipSites 10·豁免 0**（基线随批再生成——diff 审计=恰
  4 新测试文件+3 改〔epoch 8→11/repo 13→15/service 8→13〕+夹具 2 件零变化+stats 块，
  cases Δ=85 精确/断言 9843→10121〔+278〕/removed=0）；locks **399**；MIGRATIONS/
  user_version=**20** 不变；e2e 未跑（U2b-1 零 UI/IPC 变更——基线 102/102 沿承）。
- **数字对账注**：+85=79（r0：repo 17+memory 15+submit 14+run 23+sessions 7+epoch 3）
  +4（r1：R23/R24/G15/T18）+2（r2：R23b/R25）；cases 3009+85=3094；全量 281+4 文件/
  2907+85 用例；locks 395+4=399（4 新测试件；src 新 10 件不入受锁面）。
- 账本 974 行（953-974=本场 22 行）。成本分列见 §0。
- 治理：INV-128 落册（跨锚 source_task_id 不变量——强制=R6+R9/R12）；F-DBCAMP-01
  恒 open（DB-2 阶段进行中，无翻面）；U2b-1 零 IPC 零 shared 零 migrations（服务层
  纯新增面+收口拆分）；architecture/ADR 无触及如实申报（本批无新实体/ADR——ai_tasks
  表 U1 已落 §6，裁决部 N-3 同口径）。

## §5 证据档指针（仓外 scripts-audits/20261009-dbcamp-db2c/）

- 简报与报告：u2b1-brief.md（六段+冻结案+四裁+预期手算）；u2b1-impl-report.md
  （r0-r3 四段+自裁 16+4+3+3 条+分项计数表+M1-M10 变异红证）。
- 门一：u2b1-gate1-package.md（2313 行首轮自包含）+u2b1-gate1-r1-package.md（354
  行 delta）+u2b1-gate1-r2-mini.md（微 delta）；双席六轮报告=会话转档（账本 957/
  958/962/963/965/966/970 行）。
- 门二：u2b1-probe-report.md+u2b1-p1..p8 探针与 raw+harness 系+变异 mg1/mg2 件；
  裁决部终裁全文=会话转档（账本 972 行）。
- 主控：rows-* 10 件（账本写入）+baseline-before.json+diff-src-docs/diff-tests.txt
  +u2b1-verify-close1..4.raw.txt（EXIT=1→1→0→0 全留痕——第一跑 quality 红/第二跑
  指纹门红均完整在档）+build-gate1-package.mjs/build-r1-package.mjs（拼包件——
  切片纪律教训注记 §2）。
- 账本写入件：rows-{open,ruling,impl-r0,gate1-d1,gate1-k3,remediation-r1,impl-r1,
  gate1-d1-delta,gate1-k3-delta,impl-r2,gate1-d1-mini,probe,adjudicator,verify1}.json
  +复用 append-ledger.mjs（0630-takeover 座）。
