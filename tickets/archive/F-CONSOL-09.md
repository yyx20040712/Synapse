# F-CONSOL-09 票面归档（F-GOV-01 机制）

- id: F-CONSOL-09
- file: tests/unit/tools/check-tickets.test.ts
- area: infra
- owner: strong
- status: done

## summary 原文（立案五层规约）

check-tickets 姊妹测试面补强（2026-09-29 v78 交接场立案——F-CONSOL-08 池面候选兑现）：行为层=新件 tests/unit/tools/check-tickets.test.ts——CLI 探针法（execFile 真子进程+mkdtemp fixture 根+受控 exit 捕获；check-tickets root=process.cwd() 天然 fixture 化；fixture 预建空 src/+tests/+docs/ROADMAP.md——walk=readdirSync 缺目录 throw、ROADMAP=规则区硬读件）。接口层=测试件（受锁面 unlock→改→即时 apply）+locks manifest（generate 275→276 新件入锁）+registry 行。架构层=[locked-change][test-refactor] 双尾注（diff 含 tests/**）。生命周期层=定向 9/9+全量 verify EXIT=0 真值亲验（`> log 2>&1; echo $?`）+指纹门 NEW_FILE 9 用例绿面直过+树态零蔓延。文化层=零新依赖；票号双查重零命中。

## 收口记录（2026-09-29 场，主控亲执+k1/d1 双审+回炉 R1）

**实现**=主控亲执（F-CONSOL-05/S3 先例——纯测试新增）。过程事故如实申报：
首版 fixture 缺 docs/ROADMAP.md（规则区硬读件——5/5 假红暴露后补件）；M-3 变异
首版经 node -e 转义失败（GUARD_NOT_FOUND）改 Edit 工具变异（node -e 多行坑
本场第三犯）。

**门一**=k1 PASS_WITH_CONDITIONS（B0/W3/N7）+d1 首轮 FAIL（**B1 检材不合规**——
审包只给语义摘要未内联四件正文，F-CONSOL-03 首轮同型先例：非实现缺陷，
主控全内联补正包重派）。

**回炉 R1（主控亲执）处置矩阵**：
- k1-W1（T3b 定位声明与 M-3 实证矛盾）→ T3b 改标签「规则 1 存在性回归锁」
  +头注标注 guard 前移=等价变异体（规则 1 独立兜底，无判别差非测试盲区）。
- k1-W2=d1-W1（4b 面无锁无举证）→ 补 T6（done 票 .tsx 含自身 data-ticket →
  EXIT=1 红向）+T7（json 含骨架标记字面 → guard 放行+note）——**4b guard 从
  vacuous 升级为有锁**（defense-lifecycle ②行同步更新）。
- d1-W2（哨兵红形态缺失）→ 补 T5（registry 全文计数失衡 → exit 1「registry
  对账失败」——锁非恒真化）。
- k1-W3（变异只覆盖 T1）→ 补 M-4（掏空规则 3 扫描 `false &&` 短路 → T2 红）
  +M-5（撤 4b guard → T7 红）——变异矩阵四支（M-1/M-2/M-4/M-5）全红证+备份法
  还原 diff 空；T3/T4 变异以「断言含规则专属 stderr 文本=恒真假阳性概率低」
  推断性申报豁免（书面理由：变异成本递增边际收益低）。
- d1-N1/N4 → 断言不比较路径字面（只断言 code/输出文本）+note 整句断言定性
  =行为锁（文案变更走 [locked-change]）——k1-N3 同裁维持。
- d1-N3 → roots 创建即登记（mkdtemp 后立即 push）+rm 补 maxRetries:3
  （Windows 子进程退出 EBUSY 防御）。
- d1-N2 → cli() 已有 timeout:30_000+killed 检查（首轮简报漏报非实现缺失）；
  vitest 默认单测 5s 时限下探针毫秒级（~40ms）远低——CLI 探针先例同型无改。
- k1-N2 → 头注补「非解析器测试」边界声明（fixture registry 最小形态保真度
  声明——真 registry 注释/多行对象不在覆盖面）。
- k1-N7 → 本票无 ADR/架构段触及（纯测试新增+治理面登记行更新）——如实申报。

**d1 补正包重派**=全内联（测试件全文+票面+变异输出+终验数字）→ **PASS
（B0/W0/N6）**。N 项处置：N1 豁免认定充分（残余=DIR 分支归属——08 guard 位于
DIR 检查后未触及，注释已声明）；N2 哨兵红形态达成（残余=idAnyCount 侧等价
变异不红=低风险留档）；N3 SELF_REL 无锁——申报：SELF_REL=08 前历史豁免
（门二 B-7 自身豁免）非 08 修复面；N4 T6 缺变异——与 T2/M-4 对称推理注记
（4b 检查移除→T6 exit 1→0 红，同型变异已由 M-4 在规则 3 侧实证）；N5 变异
版本口径——M-1/M-2=6 用例期、M-4/M-5=9 用例期（回炉补用例所致），终版
9/9 复跑绿；N6 超时诊断分支（vitest 5s 先于 execFile 30s 触发→killed 分支
难到达）——无假绿（仍红），留档不改。

**终态基线**：定向 9/9；verify EXIT=0 真值（189+1 件/2066+9 用例——以收口树
verify 实测为准）；指纹门 NEW_FILE 9 用例绿面；manifest 276；e2e 免跑（零 src
改动——U1 C3 先例）。

**证据仓外档**=E:/zcode_md/synapse-archive/F-CONSOL-09/（双席审档+变异四支
输出记录——批次日志登记）。
