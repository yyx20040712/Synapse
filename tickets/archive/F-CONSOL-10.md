# F-CONSOL-10 票面归档（F-GOV-01 机制）

- id: F-CONSOL-10
- file: docs/invariants.md
- area: infra
- owner: strong
- status: done

## summary 原文（立案五层规约）

P2-1 用户裁决销项票（2026-09-29 用户裁定选 a）：行为层=①INV-84 登记 saved 语义
②lineage.store.ts 状态机注释补语义行③CONFLICT 多条目续跑专测（k1-W2 承）。
接口层=invariants.md+lineage.store.ts（注释）+lineage-store-write.test.ts+registry
行。架构层=[locked-change] 单尾注（k1-W2 裁正：非测试重构战役票+diff 含
src/**——[test-refactor] 双尾注属战役票专属，误打触发 CI 范围闸 src 红）。
生命周期层=定向 20/20+verify 真值 EXIT=0+MUT-F10 变异红证。文化层=零新依赖。

## 收口记录（2026-09-29 场，主控亲执+k1/d1 双审+回炉）

**裁决原文**：「待裁问题选 A……对于一个研究方向的 100~300 篇文献组成的文献
网络而言，研究者发现自己新建的线未出现是相当自然的，不需要额外说明。」

**门一**=k1 PASS_WITH_CONDITIONS（B0/W2/N7）+d1 PASS（B0/W3/N6）。

**回炉 R1（主控亲执）**：
- k1-W1=d1-W2（注释转译双向偏差：收窄「持久提示态」+语气升级「不做」）→
  改按裁决原话口径「无需额外说明面」；INV-84 行补否定面半句（册内可检索）。
- k1-W2（尾注口径）→ 采纳单 [locked-change]（宪法 [test-refactor]=战役票
  专属；本票 diff 含 src——双尾注将触发 CI 范围闸）。
- d1-W1（pending 窗口乐观回显疑虑）→ 包外证据：INV-83 明示「写路径无乐观写
  （settle 落定后排队）」+F-CONSOL-05 回炉实证 lineTypes 预置保持——括注
  「本地值只经服务器成功回显更新」与实现一致，INV-84 行回炉补「写路径无
  乐观写=INV-83」交叉引用。
- d1-W3（INV-22 互斥核验）→ INV-22=「≠saved 即拦截」聚合链路，与 INV-84
  「排空回 saved=退出放行」一致无互斥；行内补 INV-22 交叉引用。
- k1-N1 → settle(10) 节拍理由注释入用例。
- 登记不补做：变异归因混合（continue→return 同时截断尾部复位——纯拖停
  隔离变异 continue→break 为候选）/双 CONFLICT 组合盲区/「重试永不成功」
  全称措辞精度（CONFLICT 语境=结构约束类限定）/toast 断言变异背书（既有
  单条目族传承+mock 未调用必失败）。

**核验注记**：toast reason=既有实现面（203 用例与 linkWithLine 用例在档），
非本票新增（d1-N-2）；edges toEqual 深比较形态=丢弃误回填会红（d1-N-3b）。

**终态基线**：定向 20/20；verify EXIT=0 真值；指纹门 NEW delta=新用例 5 断言
绿面直过；locks 276 同步。
