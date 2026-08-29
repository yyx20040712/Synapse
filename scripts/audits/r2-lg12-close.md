# R2-LG12 收口单（主控）——综述多参考边数据面收官

> 2026-08-29。三屋全流程（零回炉）+e2e 26/26 终态。门二条件性动作三项全兑现。

## 1. 收口核验（主控亲验）

- verify 全链 exit=0（`r2-lg12-verify.log`：883 用例=875+service6+layout1+visual1
  精确命中/locks 165=164+006 迁移/lint/typecheck/build 末环）——registry 翻
  done 后重跑确认（顺序铁律）。
- e2e **26/26 终态**：全量 24 passed（T5 首跑即过）+2 flake 单跑复验双绿
  （corpus-export 2.5s=负载型超时；reader-text 剪贴板 2.0s=系统剪贴板时序
  ——`r2-lg12-e2e-corpus-retry.log`/`r2-lg12-e2e-clip-retry.log` 落盘）。

## 2. 申报栏（门二条件性动作+门一 W）

1. **W1（check-tickets R2 系正则盲区）**：`check-tickets.mjs:22` 正则
   `SR2?-`（S 必选）对 R2 前缀工单零解析——R2-LG9/10/11/12 不入统计与
   规则 4/6 检查。**建单时主动设计选择**（R2-LG11 起走免检路径——改造役
   data-ticket 占位要求不适用）；收口语义影响=open 计数不含 R2 系（门二
   推演：翻 done 零变化）。遗留池记口径盲区；**不修**（修受锁工具会把
   R2 系拉进规则 4/6 检查域，收益低风险中）。
2. **W2（主控 diff 包失误）**：LG12 门一 diff 包生成时误用 `git add`（非
   -N）致 3 件跟踪修改件（LineageEdges/NodeMenu/lineage-classify）进
   staged 溢出 diff 视野——门一工作区直读补全，内容与票面一致零实质影响。
   **教训回流候选**：diff 包纪律=新文件 -N、跟踪件零 add（生成前 git
   status 核对）。
3. **W3（剪贴板复验落盘）**：LG12 轮全量 e2e 剪贴板 flake 初时未单跑复验
   ——门二指出后补跑落盘（2.0s passed）。与 LG11 先例同型处置。
4. **N7（首红未落盘）**：实现者 TDD 首红 4/6 红点「日志在会话记录」未落
   盘文件（LG9 W1 同型——报告文字转述≠举证）。变异 4 档已落盘+M2/M4
   补足另 2 用例可红证明，证据链整体闭合；教训回流（首红落盘与变异同权）。
5. **locks 165**=164+006 迁移（generate 收录）；受锁批次 unlock→改→
   generate→verify→apply 时序合规（门二抽 4 hash 亲算 MATCH）。

## 3. 遗留池登记

- check-tickets R2 系正则盲区（W1——含修复代价评估：拉 R2 系入规则 4/6
  检查域需逐件核 b3 头注/data-ticket 前置）。
- draft 协议 ref 面（v2 若梳理智能体产物需参考关系再议——票面 §4）。
- e2e 剪贴板/corpus-export 双 flake 模式（系统共享资源+负载敏感——三次
  实录，可考虑 e2e 串行化或 retry 策略票）。

## 4. 成本账本

| 屋 | token | 调用 | 时长 |
| --- | --- | --- | --- |
| 实现者 | 10,045,711 | 122 | 18.4 min |
| 门一 | 1,300,658 | 33 | 9.7 min |
| 门二 | 1,563,152 | 31 | 5.5 min |
