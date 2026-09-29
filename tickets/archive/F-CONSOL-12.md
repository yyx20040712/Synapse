# F-CONSOL-12 票面归档（F-GOV-01 机制）

- id: F-CONSOL-12
- file: tests/unit/tools/check-tickets.test.ts
- area: infra
- owner: strong
- status: done（收口时翻）

## summary 原文（立案五层规约）

check-tickets 姊妹余面补强票（F-CONSOL-09 d1-N1/N3 申报豁免面兑现——v81 §2.2
池面裁量立案）：四组用例（CLI 探针法沿 09 先例）——①规则 2 src 分支双向②规则 2
tests 分支三向③DIR 豁免清单双向④SELF_REL 自身豁免锁（relative 真实脚本路径注入）。
纯新增=NEW delta 信息面零豁免；[locked-change][test-refactor] 双尾注；变异红证
四支+verify 真值+e2e 免跑[零 src]；零新依赖。

## 收口记录（2026-09-29 场，executor TDD+门一双席两轮+回炉 R1 主控亲执+probe+裁决部）

**实现**=ops-executor（session:host-tier；227.8 万 tokens/839s）。10 用例
T8-T17；自裁 6 条要点：T17 跨盘 relative 退化（C 盘 tmpdir vs E 盘脚本→绝对
路径→join 拼根存在性必红）→base=仓父目录同盘方案；T17 建后重写 registry；②组
落 4 用例（两绿拆开独立定位）；**DIR 双站点同构发现**（规则 3:181-185 与 4b:
218-222 同构但消息尾差——规则 3 带「新增目录票须同步豁免清单」提示语尾、4b 无；
M-3 须双摘才红——裁决部 A16 精确化在档）；`false &&` 短路形态；ADR/INV 无触及。

**门一首轮（k1+d1 并行异构）**：k1 FAIL（B-1+d1 PWC（W-1/W-2/W-3）。
- **B-1（T13 载荷驻根恒真假说）→拆封证伪降 N**：T13 实际 fixture 载荷在
  'tests/stub-call.ts'（tests/ 前缀）；'open-code.ts' 驻根仅承载 open 票注册
  file（规则 1 存在性，内容零引用零扫描语义）。k1 前席预裁路径（「键名以
  tests/ 开头→B-1 降 N」）忠实执行。**M-10 佐证**（k1 复审）：恒真用例不可能
  被恒真化变异翻红——M-10（tests 分支 done 判定恒真化）使 T13 恰红=tests 域
  扫描真实可达的非恒真证明。**根因**：主控审包「省略号为 fixture 同型构造」
  折叠致误读（检材内联纪律第四违例变体——教训回流 v82 候选）。
- **B-1 附带#2**：NotImplementedError 备选词形零红例→T12b+M-9 闭合。
- **d1-W-1**：src 分支双守卫（status/self 合取）不可证伪——T10 自身文件掩蔽+
  缺 done 自身绿例→T10 票 file 独立化+T18 补例+M-5/M-6 对偶红证。
- **d1-W-2/W-3**：四绿例无变异背书→M-5~M-10 六支定向红证；M-2 形态澄清
  （`false &&` 短路 while 条件，continue 保留——T14 的 continue 锁由 M-7
  独立背书）。

**tests 分支守卫矩阵澄清（d1-NF-W1 留档明示）**：tests 分支红条件=单守卫
（status==='done'）**无自身豁免**，与 src 分支双守卫不对称=有意设计——tests 域
占位桩调用形态（unimplementedObject/NotImplementedError 工单号字面量）无论驻
何文件皆=残留信号（含 done 票自身测试文件——样例应改非工单号串）；src 域票面
自身标识/注释引用合法故设自身豁免。补例候选（tests 自身文件占位调用红例）入池。

**回炉 R1（主控亲执）**：D0 证伪+D1 T12b+D2 T10 改造/T18+M-5~M-10 六支
（变异敏感矩阵终版 **10 支×12 用例全背书**：T8/T9←M-1、T10←M-5、T11/T12←M-2、
T12b←M-9、T13←M-10、T14←M-7、T15←M-3、T16←M-8、T17←M-4、T18←M-6；M-5~
M-10 各恰 1 failed，M-1/M-2 双红系 executor 首轮 10 用例期口径——k1 复审 N-1
措辞勘正在档）+T17 依赖声明注（脚本重构移除检测词字面量则退化恒真——重写须
重评估；DIR 去重票实施时该注=强制重评估触发点）。

**门一复审**（双席新席承审——原席会话均不可续话，自包含重建）：k1
PASS_WITH_CONDITIONS（B0W0N3）+d1 PASS_WITH_CONDITIONS（B0W1N6）。

**门二**：probe 矩阵 7/7 绿（定向 21/21=09 块 9+12 块 12/指纹门 EXIT=0
152/22/130/locks 276/verify 真值 EXIT=0 190 件/2094 用例/树态恰 3 路径+scripts/
零残留/计数六项/09 块 diff 零增删）。裁决部 **GO_WITH_CONDITIONS（P0=0/J=0）**：
A1-A20 逐条裁决+独立复算 12 组全闭合（含指纹门 +12 例+23 断言自洽：
6612−6589=23 恰等于逐例断言数之和）；C1-C7 收口条件全落实（本档+批次日志+
v81 增补+账本 8 席）。

**池面登记（随本票）**：①check-tickets DIR 双站点同构去重候选（[locked-change]
面——单点摘除对 T15 不可判别/真实运行双报同文/文案合并决策）②tests 自身文件
占位调用红例候选（不对称面断言级锁）。

**终态基线**：verify EXIT=0 真值（190 件/**2094 用例**=2082+12）；指纹门
EXIT=0（entries 152/hits 22/stale 130 维持——零豁免新增；+12 用例+23 断言=
NEW 信息面）；locks 276（sha 滚动同步）；e2e 免跑（零 src——U1 C3 先例）；
树态恰 3 路径。

**证据仓外档**=`E:/zcode_md/synapse-archive/F-CONSOL-12/`（rework 三件+
batch-log）+`E:/zcode_md/synapse-archive/scripts-audits/f-consol12-probe/`
（8 件）。
