# F-TIME-02 门二实证终审报告（ops-adjudicator 归档——岗无写通道，主控逐字归档）

> 承载：ops-adjudicator 绑定（deepseek-flash $max）。只读工具面，审包全读+现源码亲读约
> 20 件。VERDICT=GO_WITH_CONDITIONS P0=0/P1=2/P2=2/N=10 回炉 0。

## ① 逐条裁决表（摘要——全文以岗返回原文为准，本档主控逐字归档要旨）

- A 删除面删净：成立（全仓 grep 残留=沿革注记 6 处+008/009 迁移本体+负断言/迁移列断言；
  已删模块符号全仓零活引用；M1 复活拦截+终跑 typecheck/lint/quality 绿物证链）。
- B 页码链零触碰：成立（patch 无 scroll-progress/reader.store；ProgressFlusher 接口
  原样；spView drain 逐字同序仅删 0 实参；**flusher 等价独立对源**——旧 page 缺席
  sec>0 currentPageOf 兜底确系时长搭车专属，切除后「页码缺席即无账可落」等价；
  flushAll 并集坍缩单支等价）。
- C outbox 队列本体等价：成立（4 hunk 仅头注/Entry/send 签名/dispatch 实参；T1~T6
  状态机/退避/replaying 闸门/死信上限零触碰；8 用例同名同断言数逐对核+新兼容用例+
  e2e 真链；dispatch 仅 send(paperId,page??0)）。
- D 迁移链：成立（009 亲读=6 行注释+单句 DROP；v9 登记；008 sha 未动；三路径用例+
  M2 四断言红对位；SQLite 3.4x≫3.35）。
- E 向后兼容：成立（isEntry 非必备键+mirror {...e} 物理保留+dispatch 不消费+兼容单测+
  e2e 注种 seconds:120 直证——三层联合锁）。
- F 新基线四数字：成立（183/1768/5368/skip14——基线 JSON 尾实测+我方自算删除面
  文件−4/用例−21/断言−43/skip−1 全对）。
- G 计数：35 文件/+522/−1547/净−1025/删除 6 件 829/豁免 15 条全部独立复算成立
  （raw 行计数法不依赖转述）。
- H 门一 W1~W5：W1 充分（独立数 15 新条=case5+assert10；12=命中数去重口径核实）/
  W2 已独立销项（009 亲读）/W3 **裁定成立但依据失实**（papers.repo.test.ts:81-85
  实存 updateReadPage('p-1',7)→last_read_page===7 直测——门一/主控「零覆盖」与实况
  不符；结论不受影响，案卷勘正 P2-2）/W4 **要件闭合+程序正当+一处内容错误**
  （③括注「main.tsx await replayOnStart」与实态冲突——实态 void 后台回放+replaying
  位承载闸门；setup.ts:12-13 同源陈句；P2-1）/W5 处置归位正确但对账基数勘正 43→42
  （b25 默认门实测 43 含将删 spec 1 件；静态 app 面=42）。
- I 追认两起+自裁 10 条：准（抽验 8/10；contracts strict 机械必然+FILE_MISSING 代码
  实据 :122-128 亲核）。
- J 收口序+尾注：**尾注裁单 [locked-change]**——ci.yml:127-153 实装范围闸：带
  [test-refactor] 的提交 diff 路径必须 ⊆ 白名单（^tests//scripts/test-surface*/
  locks/manifest.json$/docs/(methodology|invariants).md$/tickets/registry.ts$/
  scripts/audits/ 等无任何 src 路径）；本票 29 个 src 文件挂之必红；受锁面由 sha 锁+
  指纹门三重独立守护，单尾注足；拆双提交不可行（locks 即时纪律+一逻辑单元一 commit）。

## ② 新事实（收口指令）

- **P1-1 尾注=单 [locked-change]**（brief/relay 立案行双尾注预批撤回；案卷注明
  「F-TIME-02 非 TR 战役票，src 面授权改动，范围闸白名单不适用」）。
- **P1-2 e2e 对账=42 全绿**（非 43/44；--project=app 探针 2 件不进默认门）。
- P2-1 INV-69 ③ 括注+setup.ts:12-13 陈句勘正为实态（void replayOnStart 渲染先行+
  后台回放；排空闸门由模块内 replaying 位承载）——随收口同链（受锁 unlock→edit→
  apply）或微票。
- P2-2 W3 案卷勘正（repo 直测保留五层覆盖改述）。
- N-8：收口提交预计 36 件/+529 基数再叠翻票 ±1（009 未在 522/1547 口径内）——对账
  勿硬套 35/522。N-4：config 表仍留「17 条」字样=勘误段政策不回改。N-5 outbox.test
  516 行超 500 软关（lint 无硬闸）可另立拆件微票。N-10 被删 spec 带走 app 级 v7→v9
  升级链覆盖（迁由单测三路径锚定=授权删除面）。

## ③ 收口序预批（核可）

翻票→verify（预期指纹 183/1768/5368/skip14+vitest 167/1724+locks 376+open 5→4）→
e2e（42 全绿）→账本→health-scan→staging 显式列件（**009 必列**；.log git add -f）→
提交（单尾注）。

**总判：GO_WITH_CONDITIONS**——删除面/保留面/迁移面/兼容面/计数面全部独立复算成立；
两项 P1 系门一遗漏由本岗异源补齐（尾注范围闸实读 ci.yml+e2e 基数静态复算）。
