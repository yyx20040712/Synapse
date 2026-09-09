# F-REG-01 实现简报（主控直改处置+流程债闭合）

## 1. 流程债声明（门二 W-4——下不为例）

本票主控直改未派实现者子代理（自裁申报在门一审包 §4）。裁定接受的缓解：
侦查证据链（形态盘点/引用盘点/前缀普查）由主控掌握、红证链 6+3 件 raw 在档、
locks 全程纪律（unlock→改→apply 三轮）、verify 双轮 exit=0。**流程债处置：
①本简报入档；②同窗后续代码票（F-A11 已按三屋派发实现者子代理）恢复标准
流程；③受锁 infra 票主控直改仅限「无测试面的纯文档面」——有测试面必派。**

## 2. 门二回炉（1B/4W 处置）

| finding | 处置 | 锚 |
| --- | --- | --- |
| B-7 规则 3 自匹配（check-tickets.mjs 含 unimplementedObject 字面量×4，翻 done 必红） | ✅ SELF_REL 自身豁免（fileURLToPath+relative 归一）；**翻 done 推演绿 raw**（f-reg01-done-simulation.raw.txt exit=0） | diff 规则 3 段 |
| W-1 哨兵盲于多行对象 | ✅ 计数源改 status 字段（值域受控；summary 实测无该字面量；多行对象 status 行恒在→对账不等硬红） | diff 哨兵段 |
| W-2 P7D/E/X 裸形态过白名单 | ✅ 后缀系 `(P7D|P7E|P7X)(-[A-Z0-9]+)+`；裸仅 B7/P7A | diff 白名单段 |
| W-4 流程债 | ✅ 本简报 §1 | 本件 |
| W-8 证据待补 | ✅ 重审包内联 verify 尾部+关键 raw 片段 | gate2r 包 |

## 3. 红证链全集（scripts/audits/，17 件）

- redproof-a（盲区直证：旧版 F-A6 变异绿）→ stock-run（165 绿）→ b1（同变异新红）/b2（T-99 白名单红）→ rework-run（门一回炉后绿）→ b3（空 file 红）/b4（格式漂移哨兵红）→ rework2-run（门二回炉后绿）→ done-simulation（翻 done 推演绿）→ verify/verify2（exit=0 双轮）+verify3（本轮）

## 4. 自裁申报

- 规则 4（data-ticket 骨架占位）未加目录守卫（门二 N-6 附带）：触发条件=
  open+SR 系+file 以 .tsx 结尾的目录名，现实不可达，不加。
- 变异还原两次误用 git checkout（registry.ts 当时均无未提交改动=无损），
  已自记纪律违章；后续一律 cp 备份法。
