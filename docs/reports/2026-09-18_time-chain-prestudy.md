# [F-TIME-01] reading-time 链瘦身评估——立案骨架（票面载体）

> 评估票：产出降档方案呈裁，**不直接实施**（裁决 6 域归位战役群四项之四）。
> 对象：reading-time 链（reading-time.ts / reading-time-outbox.ts /
> reading-time-setup.ts 等约 1,100 行 vs「页码+秒数」两字段需求——
> 行数计数落笔前机器实测）。

## 待评清单

- 全链文件/行数盘点（wc 实测；含消费面：P7E-05/INV-57 注记四件）
- 各模块存废与合并候选（T1~T6 态机 / outbox 双层 / flusher 复合 / setup 装配）
- 降档方案（含回退面与 INV-57 注记面影响评估——INV 修订属受锁 [locked-change]）
- 呈用户裁决（已规划呈裁节点：产出即勾项不阻塞接力）

## 裁决与排程序

docs/design/2026-09-18_complexity-governance-ruling.md 裁决 6 / §3 梯队四
F-TIME-01 行。评估产出落本件（标题日期=立案日，内容日期以文内为准）。
