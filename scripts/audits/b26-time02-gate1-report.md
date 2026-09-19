# F-TIME-02 门一对抗一审报告（ops-gate1-k2 归档——岗无写通道，主控逐字归档）

> 承载：ops-gate1-k2 绑定（kimi k3 $max，zipoo——用户指令 k1 封顶 k2 承载）。
> 审包四件+四日志全读，隔离纪律合规（未读任何包外仓库文件）。
> FINDINGS: B=0 W=5 N=9 VERDICT=PASS_WITH_WARNINGS
> 审包缺口一处先行声明：新增件 009_reading_time_drop.sql 不在 diff 内（SQL 文本仅经
> 实现报告转述）——计 W2（主控收口 cat 即销）。

## 0. 计数独立复算（全部亲算）

| 项 | 报告口径 | 复算 | 结果 |
| --- | --- | --- | --- |
| 删除 6 件行数和 | 829 | 303+13+287+61+69+96=829 逐件核 | 吻合 |
| 总插入 | +522 | 逐文件累加（含 manifest +23/baseline +159/exemptions +90） | 精确吻合 |
| 总删除 | −1547 | 改造 718+删件 829 | 精确吻合 |
| 净 | −1025 | 522−1547 | 吻合 |
| 指纹门文件数 | 187→183 | −4 删测试件 | 吻合 |
| 用例数 | 1789→1768 | −23 删件+2 新增 | 精确吻合 |
| 断言数 | 5411→5368 | −43 逐文件 | 精确吻合 |
| skipSite | 15→14 | −1（reader-reading-time.spec test.skip） | 吻合 |
| locks | 379→376 | −4 删件出册+1（009 入册）；manifest +23/−35 逐 hunk 复算 | 吻合 |
| vitest | 170→167/1744→1724 | baseline :3875-3876 vs final :3859-3860 | 吻合 |
| 构建模块 | — | renderer 202→200（恰删 2 src 件）/main 91→92（恰 009 raw import=009 存在性强旁证） | 吻合 |
| quality 扫描面 | — | 225→223=恰两 src 删件 | 吻合 |

**唯一不吻合=豁免条目数（W1）。**

## 1. K1~K10 逐条

- K1 双轨链成立：predelta 21 红物理在档且与授权面逐条对齐=真零意外（4 FILE_MISSING
  =恰 4 删件 :26/31/43/45；5 MISSING_CASE；12 MISSING_ASSERT 文本一一对应 :30-42；
  :38/:41 同文本第二命中证豁免按 (file,assertionText) 去重——W1 关键物证）；基线
  审计 GONE/ADDED 逐项映射授权面零授权外差异。豁免计数失实另立 W1。
- K2 准：负断言 `safeParse({...base,secondsDelta:60}).success===false` 对「不复活」
  恰好等效锁（复活→拒收消失→红；去 strict→同红）；base 过+page −1 拒保留。
- K3 准：isEntry 删 seconds 必备键+头注明示；兼容用例断言 loaded=1/page=2/id=ob-old；
  dispatch 只取 send(paperId, page??0) 旧 seconds 永不进载荷；e2e 注种 seconds:120
  =存量形态直证（物理驻留措辞见 N3）。
- K4 准：008 sha 原样；009 入册+migrate v9 登记+三路径用例（新库 9/v8[9]/v7[8,9]+存量
  无损）终跑绿；M2 四断言红+还原复绿在档（SQL 文本直验缺口=W2）。
- K5 准：scroll-progress/reader.store 不在 diff；schemas page 保留；service 薄转调二参；
  repo SQL 退回单参；spView dispose 排干原样仅删 seconds 实参；wiring 五参不变；
  flusher 逐路比对等价（旧「page 缺席且 sec≤0=no-op」≡新「takePending undefined=
  no-op」；currentPageOf 兜底仅服务时长搭车——旧 R6 用例可证专属性，切除正确）；
  ReaderPage 装配级测试绿。
- K6 准（§0 全数）。
- K7 准：file→同域存留件随迁+summary 注记+status 零触碰；随迁先例 registry 本文可验
  （G4 SR-RDR-02）。
- K8 准：改存优于删（outbox 保留→页码重放承重面须留 e2e 锚）；断言收窄 row.p===1
  ——队头阻塞序下 ob-2 派发蕴含 ob-1 已排空，间接但有效；双发直证性弱于旧累加断言
  （实话标注）。e2e 绿证不在包内（W5）。
- K9 准：退役前缀+原文整行保留+四款映射+008→009 反转+归口指针（存续 outbox 登记
  缺口另立 W4）。
- K10 准：新名 ReaderPage 随动；getReaderOutbox/replayOnStart 名留+main.tsx 零改动；
  typecheck 绿=零遗漏物证。

## 2. 追认两起+自裁 10 条

- 追认①（contracts 超预列）：机械必然核实成立，处置方向正确。裁：准。
- 追认②（FILE_MISSING 无豁免通道→基线再生成+上探两件）：实勘声明与两段链一致；
  再生成风险三控对冲（predelta 逐条+全量审计+门一独立算术）；上探系 P7E-05 同型
  先例。裁：准。
- 自裁 10 条全裁准（第 8 条 M2 首轮作废诚实申报重做链在档；第 10 条 git 禁令主控
  收口 git status 一验即销）。

## 3. 分级清单

**B：0 条。**

**W：5 条**
- W1 豁免计数失实（宪法 DoD 计数实测违例）：新增恰 **15 条 JSON**（case 5+assert
  **10**）非「17（5+12）」；「12」=MISSING_ASSERT 命中数（同文本双命中去重）；
  「17」=豁免册总数（2 旧+15 新，终跑 :28 实证）；「跨用例同文本复用 1 条」条目
  不存在。功能面零影响，处置=报告勘误（主控已追加 §⑧ 勘误段）。
- W2 009 SQL 文本包内不可直验：主控收口 cat 即销（**主控已销：009=恰单句 DROP
  COLUMN reading_seconds+头注沿革三行，预期态**）。
- W3 存续行为单测锚点净减：papers-reading-time.test 删除带走 repo 级 updateReadPage
  页码直断言（papers.repo.test 零覆盖）；剩余=e2e replay 真链 DB 直断言+schema 层+
  outbox mock 层。主控裁（**已裁：现有覆盖足够——updateReadPage 退化为单参平凡
  UPDATE；被删断言测的是已移除的三参原子累加行为；页码落账 e2e 真链兜底**）。
- W4 INV 册登记缺口：存续 outbox 页码通道（跨时间×跨模块）不变量归「P7X-02 设计书
  承载」——宪法明文设计书≠登记册。主控裁（**已裁：补登 INV-69 一条——主控代执
  落档，executor flash 模型窗口不可用+文档面=回炉三分法主控级**）。
- W5 e2e 绿证不在包内：主控收口跑默认门销项（44→43 对账预告知）。

**N：9 条**（N1 M1 无字面标记但还原蕴含证明/N2 基线审计比对措辞过强但链闭合/
N3 兼容语义精确性（LS 物理驻留至 remove）/N4 豁免册累积陈列态 hygiene/N5 报告
malformed 行/N6 outbox.test 516 行超 500 软关——lint 绿为事实，可裁拆件微票/
N7 flusher 退化无专属变异由定向回归承载/N8 两日志尾部无字面 EXIT 标记蕴含证明/
N9 INV-57 锚列指已删件=历史留档属性）

## 4. 总判

**PASS_WITH_WARNINGS**。删除面「删净无残留」（typecheck/lint/quality 绿+M1 复活
拦截+豁免类残留逐处圈定联合证明）；保留面「行为等价」（页码链零触碰实证+outbox
断言面计数不变仅载荷迁移+迁移链三路径锚定）；四红线全过；计数面除豁免数外全部
独立复算精确吻合。主控两起追认与自裁 10 条全裁准。W 五条均主控收口单点销项/
裁决项（W1 勘误✓/W2 cat✓/W3 裁✓/W4 INV-69✓/W5 收口机检），不构成回炉理由。

## §勘正（门二 P2-2——2026-09-19 主控追加）

W3 依据勘正：本档「papers.repo.test 零覆盖」与实况不符——papers.repo.test.ts:81-85
实存 updateReadPage('p-1',7)→last_read_page===7 repo 级直测（未随本票改动）。实际
覆盖=repo 直测+service+ipc+contracts schema+e2e 真链五层。裁定（现有覆盖足够）不变，
依据改述如上。
