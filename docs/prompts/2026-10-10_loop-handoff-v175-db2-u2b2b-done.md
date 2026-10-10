# 交接书 v175 —— DB-2 020-U2b-2b 装配引擎（后半）收官·U2b 收官候场（2026-10-10）

> 前承 v174（取代制）。本档=接棒会话（runId=20261010-dbcamp-db2e，用户令
> 「[$ai-dev-org] v174 交接书」）完成 **020-U2b-2b L3 尾段现算+检索源扩展+校准
> 协议+代理拉取预算收官**的单源。**下场开工序=§1。**

## §0 本场总账（runId=20261010-dbcamp-db2e，账本 982-992〔非空行口径——首行 982 session-open/末行 992 batch-close=11 行〕）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 开工 | 技能清点+开工调研（服务/repo/DDL/FTS 实照全走查；两关键发现：001 三 FTS 表均 trigram〔报告「文献域 unicode61」与实照矛盾〕+ai_tasks 无回写消息关联列→信封识别制）+主控预裁四项（P-A core_idea 裁三列/P-B 系数维持冻结/P-C 词级代理参考/P-D 600 池拆 300+300） | 982 |
| 简报 | 六段全量（预裁 P1-P12+基线手算：预期 46 用例/291 文件/locks 406——分项合计自校 v174 教训兑现） | 仓外 u2b2b-brief.md |
| 实现 r0 | src 新 2（ai-tail.service/ai-search.repo）+校准脚本受锁+docs 结果档+改 4+INV-130/131+测试 +46+3 桩行；自裁 12 条；变异 M1-M8 | 983 |
| 门一首轮 | k1 回炉（B1=authors 检索域——裸 MATCH 全列与 P7 互斥+头注互斥接缝）+d1 有条件（W2 同面/W1 闸下界 cap=0 骨架）——双席独立收敛 authors 面，主控探针实证列过滤可行 | 984-985 |
| 回炉 r1 | 11 项实修（B1 列过滤 PAPERS_COL_FILTER/W1 下界注+R36/W2 literatureHits 条件赋值+T27/T28/W3 码点实测 49-172/N1 决胜键/N2-4 覆盖补强/N5-8 注记类型守卫）+8 用例；自裁 5 条（含 B1 前缀落 repo 绑定值侧字面偏差——裁决部后裁=唯一正路） | 986 |
| delta 复审 | k1 有条件（W1=match abstract 正例缺口——主控指认 r0 既有 S2 销）+d1 PASS（W1=五回归锁缺红证）+N 五项（含 k1r1-N5 抓出 d1-N4 漏账——r1 合并时漏派确认挂账） | 987-988 |
| r2（纯主控处置——零源码改动） | 主控亲跑 M9-M13 五定向变异红证销 d1r1-W1（S14/T28/T29/R36/R37 全红+还原 diff 空）+登记五项+verify 全量 EXIT=0 终态洁净证 | 989 |
| 门二 probe | 八项全 GREEN 批缺陷 0（P1 四腿算术 15/15/P2 识别 10/10/P3 文献域 16/16 含 authors 真库负证/P4 预算闸 17/17/P5 INV-131 双向证〔消息写不改前缀+epoch 集写前进 cacheKey〕/P6 校准独立重跑含 26.3% 舍入窗复核+Node 守卫 v25 拒执行负面证/P7 verify 四组数字全对账/P8 变异 13 件+sha256+零残留）；异常 6 条全探针侧/环境/既知面 | 990 |
| 裁决部终裁 | **GO_WITH_CONDITIONS**（六面全成立+独立复算 12 笔全过+P-C 假设拷问过〔60 样本零低估例+签名偏差三笔全正——过估安全向成立〕；条件四项=INV-104 补注/报告回写/architecture 申报/B1 偏差+M12 编号勘误登记——**全核销**；另抓账本 991 行 M12 连带编号笔误 R31→实为 R34） | 991 |
| 收口 | INV-104 册行补注+报告 §3.C 回写（unicode61→trigram 勘误+检索域接缝落地注）+architecture 无触及申报（020 表族回写=DB-2 阶段收口统一面沿承）→指纹门 regen（unlock→regen→apply→verify 序——case 级审计 +54 精确 removed=0）→**verify EXIT=0**（base=cur 319·3213·10447 全等）→提交 7ab5d10f6b5（20 件 +2809/-100） | 992 |

成本 ≈**40.6M subagent tokens**（executor 两轮 33.56M〔22.49+11.07〕+probe 5.63M+
审读面 1.43M〔k1 两轮 181k+d1 两轮 319k+裁决部 1.54M〕）+主控 host-max（含 r2
五变异亲跑+FTS 列过滤探针+delta 组包器亲笔）。kimi 面沿承 k1 席+裁决部 k3 座
（R6 同席三角色注记沿承，独立对冲=d1 双轮+probe 八项异源矩阵）。

## §1 下场开工序（单源）

1. **U2b 收官判定**：U2b-2a（L1/L2 前缀）+U2b-2b（L3 尾段）已毕——**装配引擎
   全链落地**。开工先对 U2b 批界做收官盘点（对照营地设计稿 DB-2 段+专项报告
   §6 预告面），确认无遗留子面后转：
2. **DB-2 UI 面**（会话入口/任务卡/审计抽屉/预算设置页〔裁定③〕——承载形态
   呈裁待用户：DB-4 窗或独立票——v174 §3-2 沿承）+e2e 面恢复（U2a 起挂起——
   基线 102/102 沿承）。UI 面同时消费本批交付：L3 装配接口
   （createAiTailService）+拉取预算闸+校准结果档。
3. **DB-3 导出快照批**（U2b 毕后序列沿承）。
4. **沿承挂账评估面**（非阻断，UI 批消费面定夺时一并）：digest 扩列（k3-N4/
   d1-N6）/appendAudit·finalizeRunning·listAudit 类型收窄（d1-N2）/d1-N6
   提交期窗口/d1-N4 shrinkEnvelopeToCap 谓词前置（U2b-2b 漏账确认——本批回写
   恒信封无现实差）/骨架累计上界口径（发数闸归对话管线批）/TailCapsOverride
   键跟踪注记/校准终校准（真实分词器落定后——对话管线批）。

## §2 沿承挂账（下场携带——均非阻断）

- **C3 计数失实红线**：本场零触发（46/54 两轮三方对账全精确）；r2 账本 991 行
  M12 连带编号笔误（R31→R34）被裁决部 raw 交叉抓出——变异连带用例编号以 raw
  实证为准的教训入册（账目级非源码级）。
- **简报元数据笔误**：probe 抓出主控派发指令「impl-r1/mutation-M1..M8」实在
  impl-r0/（13 件计数不受影响）——派发指令引用证据路径时先 ls 核对。
- **d1-N4 漏账机制**：双席发现合并处置时逐条对号（本次 k1r1-N5 抓出）——合并
  清单落笔后与双席原文逐条 cross-check 再派发。
- **shell 四坑复发两起**（executor r1 探针+probe p6-check）——Write 直写自愈
  纪律有效，探针类工作禁 node -e/argv 传参再实证。
- 沿承：flake :1030 count=2 filed/adjudicator R 清单（v169 §2）/R5 指纹门 Req
  形状=F-REQFP-01 已立票/N 级卫生票池（v168 §2）/物理命名漂移（一律物理名）/
  账本 ts 取系统时钟/打包切片纪律（delta 包取段先 grep 定位）/简报 §6 自验清单
  六件全套（quality:check 必列）/regen 锁序纪律（unlock→regen→apply→verify——
  本场再验证一次顺）。
- 会话技术事实：装配全链接口=createAiContextService.assemblePrefix（L1/L2 前缀
  可缓存）+createAiTailService.assembleTail（L3 现算不入缓存键 INV-131）——
  消费方=未来对话管线批（物理缓存同批）；拉取预算闸在 ai-tasks.service 回写
  路径（pullCaps 注入=测试面）；校准=scripts/calibrate-token-estimate.mjs
  （协议闸不进 verify 链——重跑 exit1 属预期）；检索域三列与 authors 列过滤=
  ai-search.repo（PAPERS_COL_FILTER）+INV-104 死置互指；受锁面
  =tests/shared/migrations/scripts/configs（src repo 件不入 locks）；repo ≤300/
  文件 ≤500 quality 门。
- **v174 勘误随批清偿**：v174 §4「账本 983 行（972-983=本场 12 行）」实况=
  db2d 占 970-983=14 行（起点边界差 2）——本场核实登记，账本本体健康。

## §3 待用户面（沿承 v174 §3 增量——均非即刻）

1. F-UIRES-04 C/D 呈裁（沿承——等批 1a 探针时机随批）。
2. DB-2 UI 面承载形态（DB-4 窗或独立票）——U2b 已毕，**呈裁时机已到**。
3. 预算设置页（裁定③）落位时机——随 UI 面呈。
4. 本场预裁四项（P-A/P-B/P-C/P-D）已按 v174 §3-4「预裁可代行」授权代行并在
   账本 984 行登记——用户复核异议随时翻案（P-B 系数冻结+挂账为最大影响面：
   若用户已定目标模型可提前终校准）。

## §4 基线与治理

- HEAD=U2b-2b 单笔 7ab5d10f6b5（20 件 +2809/-100 [locked-change][test-refactor]）+
  v175 本笔。工作树=clean（收口 git status 亲验 0 行）。
- verify：**EXIT=0 亲验**（close1——regen 后 base=cur 全等）；**291 文件/3111
  用例**；指纹门 **319·3213·10447·skipSites 10·豁免 0**（基线随批再生成——
  diff 审计=恰 2 新测试文件+54 新 case 标题〔case 级枚举在档〕+行号漂移 11 行
  removed=0；断言 10302→10447〔+145〕）；locks **406**（403+2 新测试件+1 校准
  脚本）；MIGRATIONS/user_version=**20** 不变；e2e 未跑（U2b-2b 零 UI/IPC 变更
  ——基线 102/102 沿承）。
- 数字对账注：+54=46（r0：S 12+T 26+run 6+memory-search 2）+8（r1：S13-15
  3+T27-29 3+R36-37 2）；cases 3159+54=3213；289+2 文件/3057+54=3111；
  403+3=406；ai-tail.service 302 行/ai-search.repo 139 行（≤500/≤300 门内）。
- 账本 992 行（非空行口径；本场 982-992=11 行：session-open/impl-r0/gate1×2/
  remediation-r1/gate1-delta×2/remediation-r2/gate2-probe/gate2-final/
  batch-close）。成本分列见 §0。〔行号勘误注：本档首版以 split 计数锚 984-993
  差 2=split 尾部幻影项所致，收口后权威复核修正；db2d 同口径勘误=实占
  968-981=14 行（v174 §4「972-983=12 行」双差：起点边界+计数口径）〕
- 治理：INV-130/131 新登记+INV-104 补注随批；报告 §3.C 回写两处（unicode61
  勘误+接缝落地注）；F-DBCAMP-01 恒 open（DB-2 阶段进行中）；U2b-2b 零 IPC 零
  shared 零 migrations（服务层读面+脚本件批）；architecture/ADR 无触及如实
  申报（020 表族 §6 实体表回写=DB-2 阶段收口统一面沿承——U2a 起同口径）。

## §5 证据档指针（仓外 scripts-audits/20261010-dbcamp-db2e/）

- 简报与审包：u2b2b-brief.md（六段+预裁 P1-P12+手算）；u2b2b-gate1-package.md
  （2206 行首轮自包含）；u2b2b-gate1-r1-delta.md（445 行 delta）；组包器
  build-gate1-package.mjs/build-delta-package.mjs。
- 主控：mc-w2-fts-colfilter-probe.mjs（authors 列过滤可行性探针——B1 修复方案
  实证）+impl-r2/（m9-m13 红证五件+verify-r2.raw.txt）+baseline-before.json+
  baseline-diff-audit.txt+baseline-case-audit.mjs（case 级 +54 removed=0）+
  u2b2b-verify-close1.raw.txt+regen/locks 输出+rows-*.json+append-ledger.mjs。
- 门二：probe/ 子目录（p0-p8 探针与输出+build-run.mjs harness+fixture+shim
  ——可复跑）。
- 实现：impl-r0/（first-red/green-full/mutation-M1..M8/calibration-output/
  verify-r0 13 件）+impl-r1/（first-red/green-full/mutation-RN1/guard-RN8/
  calibration-output/verify-r1）。
