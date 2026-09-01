# 2026-09-02 LOOP 交接 v20——体检场收口，下场=F-L3 主线+AUDIT-C 立场

> 上场=v19（R2 批次 P0+U1+U2 收口，U3 顺延）。本场=**v19 §5.0 场首
> 动作执行**：Kimi 全面体检（第四次 Ruling 设计位三源链首场）。
> 零代码改动（体检场只登记不修）；产出=体检四件套+台账登记+本书。

## 1. 本场终态

| 项 | 数值 |
| --- | --- |
| verify | 126 文件 1081（零代码改动，收口亲验 exit=0） |
| locks | 229（未触碰） |
| 体检链 | Kimi 拟定（kimi-main 一次命中 in=60771/out=8355/154s）→deepseek 审核（in=69294/out=30996/211s，无 B 级/W1~W7+N1~N10）→GLM5.3 终裁（独立复算 10 项） |
| 档案 | scripts/audits/{kimi-health-brief.md（体检包 198KB 五源）, kimi-health-report.md, ds-health-review.md, health-final-ruling.md} |
| 终裁 | **U3 不首项**（两源一致）；W4 双源复审欠账核销（6625952c0+v19 §8 在档亲验） |

## 2. 下场执行序（终裁版——出处=health-final-ruling.md §4）

1. **场首小票：e2e 信噪比双件**——①F-R2e 窗态种子隔离预防票（受锁 e2e
   [locked-change]；两案之一低成本，不必等再现）②「同一 e2e 用例 2 次非
   确定性失败=立案」写入 AGENTS 测试纪律节（通则化；顺带落「计数类快照
   数字落笔前脚本实测」条款——本场拼包两条失实教训）。
2. **F-L3 排查票（首项主票）**——保存高亮后视口 +2142px 漂移（台账 277-290，
   f-a3-out 取证在档）；范式 crib f-l2-probe.mjs（真实库副本+分段 scrollTop
   采样）；先分 Playwright scrollIntoView 工具面 vs 真机手工复现。结论喂
   AUDIT-C（若确认保存链程序滚动=INV-29/34 未登记旁路→开修票+INV 增补）。
   派发档位（§4.5）：排查=GLM5.3 只读子代理（关键裁决链）；实现者=GLM5.3flash；
   门一=Kimi 链（reader 滚动/几何复合面=必保）；门二=deepseek 异构。
3. **AUDIT-C 竞态面立案**——设计位链（Kimi 拟票面→deepseek 审→主控裁，
   本场分工链复用）；首波输入=F-R3（stream pump）+F-L3 结论+弱锚时序条目
   （INV-42 N6/INV-44 探针脆性/F-ARCH4-M1 root.contains 真浏览器可达性）。
4. **搭车池**（随主线同场收口）：
   - U3 F-L1-C 三条合票（台账 129-134；§4.5 小同形批量条款首例；票面模板
     crib p7a-ticket 紧凑形态；⑤f 真机实景验证）
   - SettingsPage 拆 UiScaleSection（244/250 余量 6；随 settings 改动强制）
   - 活文档防线票：invariants.md 入 locks（F-G4）+architecture §7.7 图纸
     指针化（72/49/23→134 全 done 勘误）+INV-19 升格核对（SR2-AI-09 done
     +测试三要素在场）+弱锚清单集中登记+node --version 前置断言入 verify
5. **用户侧**（不占开发预算）：16 项复测指引二次回收邀请（台账 §二；F-A1/
   F-L1 均出自复测反馈——未反馈面是验收真空）。

## 3. 体检核心发现速览（下场上下文）

- **结构面健康**（分层零违例/行数红线全过/locks 对账一致）；**行为面=出产区**
  （reader 滚动/几何/信号复合面最脆弱——INV-29~34/45 七条密集+ReaderPage
  churn 双口径 19/20 次；lineage 视口/布局面=下一个屎山候选——六 INV 三天
  密集+弱锚集中，再一轮反馈应触发「二次触发即重构」条款先出态空间文档）。
- **竞态族=两实锤（F-ARCH1/LG-08）+一待排（F-R3）+一翻案（F-ARCH2）**
  ——AUDIT-C P0-1 依据（「三连实锤」为 Kimi 夸大已修正）。
- 最危险欠账不是声明级「部分锚定」（INV-02/11/13 均低风险），而是**已锚定
  中的弱锚备案群**（INV-16 dynamic import 缺口/42 真机未直测/43 fit 回退
  /44 断言弱于注释/45 奇数页代锁）——弱锚清单登记防遗忘。
- registry 全 done=正常演化（边际价值=审计索引）；台账自身无人审计的
  「主控核验无第二道」风险在档——备案条目存活清点（>800 行或季度）建议留档。

## 4. 成本账本（模型×供应商×套餐）

```
Kimi 拟定：kimi-k3 × Kimi 企业版主源（一次命中 switches=0）
  in=60771/out=8355/154s（体检包 198KB=架构+INV 册+台账 626 行全量
  +registry+§4.5+宪法）
deepseek 审核：deepseek-v4-flash × 梁圣·套餐外按量（--source 单源直调）
  in=69294/out=30996/211s（审核包 221KB）
主控：GLM5.3 × bigmodel-coding-plan 主力（拼包+复算 10 项+终裁+收口，
  ~25 工具轮——预算健康，远低于 35~40% 锚）
```

## 5. 环境事实滚动

- PATH 前导 /d/nodejs24 不变（D:\nodejs v25 污染面待用户裁决——node
  --version 前置断言列为搭车票）；ds-call 链三源全就绪（本场 kimi-main
  一次命中+deepseek 单源直调均顺）；Kimi 60k tokens 大包实调通过
  （企业版套餐承载确认）。
- 拼包数字失实两条教训（INV 计数/e2e 次数）——计数类快照必须脚本实测
  （落笔前 grep/wc），候选入 AGENTS 完成定义节。
