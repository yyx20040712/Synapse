# F-CSS-02 门二终审报告（四清单+一）

> 档位声明：门二位应为 deepseek v4 flash 优先，但环境 Agent 工具无 model 参数——
> 实际统一档与实现者同源，如实记欠账披露，禁冒充定档。
> 二审实证位：逐条裁决+独立复算+亲跑（本报告一切 ✓ 均有亲跑/亲读证据，禁只审不跑）。
> 审查对象：tests/unit/renderer/theme.test.ts（455 行终态）+docs/invariants.md
> :77 INV-61+全证据链（scripts/audits/f-css02-*）。

## 开工技能清点（会话开工纪律）

- code-review-excellence——**用**（门二对抗深审核心，已加载）
- verification-before-completion——**用**（亲跑验证面，已加载）
- systematic-debugging——**不用**：审计验证位非缺陷定位（本次无红需排查）
- test-driven-development——**不用**：门二不改实现；TDD 证据链=核对档，
  变异红证亲跑一支已覆盖验证义务
- javascript-testing-patterns——**不用**：本票不新写测试，正则语义审查为主
- 其余技能（前端/数据库/k8s 等）——**不用**：与票面无对应面

---

## 清单① 处置核对（门一 Kimi R1 PWW 0B/4W/9N→R2 三修 ADDRESSED+主控处置 vs 终态实物）

### W1 新文件通道（FS_CSS 七件硬编码 vs 票面「新文件自动被拦」歧义）→主控裁决不修

- ✓（复裁支持）门一 W1 本体成立：亲读 theme.test.ts :413-421，FS_CSS 确为
  七件硬编码二元数组——新增第八件 CSS 不会自动入锚，票面「新文件自动被拦」
  措辞与实物有落差。
- ✓（免责链成立）实现者属忠实执行预裁：简报③2 明文「七 CSS 件各一 it
  （it.each 七件或七个 it——7 用例）」，钉死七件面，非实现者越权缩面。
- ✓（承接面存在）F-LINT-01 票在 registry :253（status: 'open'，INV-11 lint
  机器化设计书链 Kimi→deepseek→GLM5.3 终裁）——新文件通道转 lint 面设计
  输入有承接主体。
- ⚠（提醒项，非缺陷）registry 注记未落笔：F-LINT-01 行 summary 现文未含
  「新文件通道/font-size 文件枚举」显式输入文字；F-CSS-02 行 :252 仍为原始
  票面。主控收口翻 status 时应随注记落笔（「W1 新文件通道→F-LINT-01 设计
  输入」一句）。收口流程未完成是门二审查的时点属性，不定级。

### W2 calc 绕行→回炉修正则 v2 值段中缀

- ✓ 亲读 :425：`const FS_DECL = /font-size:[^;{}]*[\d.]+\s*[a-z%]/gi`——
  `[^;{}]*` 值段中缀扫全且 `;`/`{`/`}` 即停（不跨声明界），与主控回炉裁决
  方向「font-size: 后值段内任意 数字+单位 字面量，不跨声明界」一致。
- ✓ 独立复算（不采信报告，f-css02-g2-regex.raw.txt）：七 CSS 件 hits=0×7；
  四反例全对——'font-size:13.5px}' 咬 / 'font-size: calc(12px +
  var(--fs-body))' 咬 / 'font-size: var(--fs-body)' 不咬 /
  'font-size: calc(var(--fs-body) * 2)' 不咬。
- ✓ 变异红证亲跑（见清单④第 3 项）：calc 载体植入→恰 1 红→还原→绿。
- ✓ 头注同步：:396-407 注明 calc/clamp/min/max 载体通道+var 载体不误咬
  前提（六 token 名全字母无数字且无 fallback 字面量）——前提依赖显式登记。

### W3 报告数理→§7 更正节

- ✓ 亲读 impl.report.md §7：更正节在档（454 起点勘误+单文件口径归因+
  回炉后 455 终态重述）。
- ✓ 独立复算：`git show HEAD:tests/unit/renderer/theme.test.ts | wc -l`=454；
  `git diff --numstat`=theme.test.ts 20+/19− + invariants.md 1+/1−；
  `wc -l` 终态=455。454+20−19=455 自洽 ✓（门一 R2 复算同结论，门二独立
  重算复核）。

### W4 注释误咬→知悉不修

- ✓ 无文件动作；头注/册文均无注释豁免声明（与「严格性非缺陷」裁定一致，
  两侧口径无漂移）。

### N9 头注「三通道」列四项→五通道实列

- ✓ 亲读 :404：「闭合其漏通道（新值/无分号/大小写/非 px 单位/calc 载体——
  五通道）」——数与列一致（五项对五通道）。

### R2 三 N 主控处置

- N-R1-1 册文绝对化→主控直改：✓ 亲读 invariants.md :77 现文=「FS 正则全域
  负锚（font-size 声明**值段内 数字+单位** 字面量归零……**font 简写/冒号前
  空白/无单位零=已知边界不入锚**；2026-09-09 F-CSS-02 升级+回炉 1）」——
  措辞降级（「任意数字归零」→「值段内 数字+单位」）+三残余形态入册均落。
  门二独立验证三形态确实不咬（反例 'font: 12px/1.5 serif'/'font-size: 0'/
  'font-size : 12px' 全 false，f-css02-g2-regex.raw.txt）——册文与正则
  实际能力一致，绝对化矛盾消除。
- N-R1-2 calc 未入册→已入册：✓ :77「新值/无分号/大小写/非 px 单位/calc
  载体五通道闭合」与测试头注 :404 五通道口径逐字同构——两处通道列项一致
  性修复。
- N-R1-3 声明内注释→知悉：✓ 无动作（与 W4 同机理同处置）。

---

## 清单② 母本符合度（票面=registry :252 F-CSS-02 行+简报 f-css02-impl-brief.md）

| 票面要求 | 终态实物 | 裁定 |
|---|---|---|
| 正则全域「任意数字 font-size 声明归零」 | FS_DECL v2（:425）：`[\d.]+` 通配任意数字（含小数/点开头）+`[a-z%]` 任意单位首字符+`i` 大小写 | ✓ |
| 去分号依赖（现行锚尾分号绕过通道闭合） | 模式无 `;` 尾依赖；无分号块末形态拦——首轮先红证 red1-13p5-nosemi（raw 亲查 1 failed exit=1）+门二反例 'font-size:13.5px}' 咬 | ✓ |
| tsx 形态锁同步升级评估 | FS_TSX 两形态锁+@theme 正锚原样保留（:440-454）；评估结论=维持（两锚已是全域正则）+全域证据 grep `fontSize:\s*['\"\`]?[0-9]` 与 `text-\[[0-9]` 全 src/**/*.tsx 零匹配——**门二亲验**两模式 exit=1（零匹配） | ✓ |
| INV-61 测试列注记回注 | :77 已回注（回炉后含五通道+已知边界+回炉 1 标记，见清单① N-R1-1/2） | ✓ |
| 用例数 84→7/全量 1543→1466 | 门二亲跑全量=156 文件/1466 用例 passed exit=0 | ✓ |
| 改动面=恰两文件 | git status：M theme.test.ts+M invariants.md+M locks/manifest.json（后者=locks:apply 机械同步产物，受锁流程预期第三件）；皮肤件零残留（门二变异后 diff 空复核）；30 件 audits 证据待随收口提交（三桶口径①证据件入库） | ✓ |

---

## 清单③ 宪法红线终审

- ✓ **受锁两件流程**：主控预 unlock→实现者不碰 locks（impl.report §6.4 自报
  +diff 面无 locks 脚本触碰痕迹）→主控 apply 重锁——locks:check **门二亲跑绿**
  （「287 个受锁文件与 manifest 一致」）；verify.raw :34 同口径。
- ✓ **UTF-8**：两件 grep U+FFFD 零匹配（theme.test.ts:0 / invariants.md:0）。
- ✓ **测试语义未越预裁**：v1=主控推荐形态逐字原样（简报③1 的
  `/font-size:\s*[\d.]+\s*[a-z%]/gi`）；v2=回炉主控裁决方向内（值段中缀
  `[^;{}]*`）——两轮均无实现者私自扩面/缩面；FS_TSX/@theme 正锚 diff 零触碰。
- ✓ **TDD 证据链四档（raw 原文抽查，不采信报告转述）**：
  - 先红：f-css02-red1-13p5-nosemi.raw.txt=1 failed | 131 passed，exit=1 ✓
  - 变异 a 双段（回炉后基于终态重跑）：r1-mut-a-enum-green=132 passed exit=0
    （批二枚举锚漏无分号实锤）→r1-mut-a-v2-red=1 failed exit=1 ✓
  - 变异 b：r1-mut-b-red（16px 枚举外新值）=1 failed exit=1 ✓
  - 变异 c（calc 双段）：r1-c-v1-green=132 passed exit=0（v1 缺口实锤）→
    r1-c-v2-red=1 failed exit=1 且红消息样例含「font-size: calc(12p」（与
    正则吃到单位首字符的截断形态自洽）✓
  - 沙箱：r1-regex-sandbox 尾部=七件 hits=0×7，exit=0 ✓

---

## 清单④ 机器面核对（亲跑矩阵）

1. ✓ **全量 test**：`npm run test` 后台跑毕——Test Files 156 passed (156) /
   Tests 1466 passed (1466)，exit=0（f-css02-g2-full-test.raw.txt，vitest
   Duration 35.44s）。
2. ✓ **独立正则复算**（node 单行脚本，f-css02-g2-regex.raw.txt）：七 CSS 件
   （theme/theme-shell/theme-buttons/theme-reader/theme-lineage/library/
   workspace）hits=0×7；四反例判定全对（咬/咬/不咬/不咬）；另验三残余
   边界形态（font 简写/无单位零/冒号前空白）全不咬——与 INV-61 已知边界
   声明一致。
3. ✓ **变异红证亲跑一支（cp 备份法）**：cp theme-buttons.css→/tmp 备份→
   node 植入 `font-size: calc(11px + var(--fs-micro));` 于 .syn-btn-primary
   块末（:26，grep 在场确认——实现者教训「植入后 grep 前置」照做）→
   npx vitest run tests/unit/renderer/theme.test.ts=**恰 1 failed**（
   theme-buttons.css 用例）| 131 passed，exit=1（f-css02-g2-mutation-red.raw.txt）
   →cp 还原→diff 空（RESTORE-DIFF-EMPTY）→备份即删（零驻留）→植入串
   grep 零残留→复跑=**132 passed** exit=0（f-css02-g2-restore-green.raw.txt）。
   全程未触碰测试文件（变异只动 CSS 皮肤件，非受锁面）。
4. ✓ **verify 档核对**：f-css02-verify.raw.txt 尾 exit=0；:3997-3998
   Test Files 156 passed (156)/Tests 1466 passed (1466)；:34 locks 检查通过
   287 个受锁文件与 manifest 一致；:24-25 tickets 段检查通过——真实口径
   抽查无出入。
5. ✓ **registry 翻 done 推演**：工单文件 theme.test.ts 存在；src/tests 中
   F-CSS-02 字面量引用=仅工单文件自身 1 处（翻 done 后规则 2 自身豁免）；
   无 guardedDescribe('F-CSS-02') 挂载；`npm run tickets:check` **门二亲跑
   绿**。**附新发现（见下）**：F-CSS-02 不在 check-tickets 的 objRe 解析面
   ——翻 done 对该关卡零影响（平凡绿，方向安全）。
6. ✓ **附加亲验**：locks:check 绿（287）；tsx 全域 grep 两模式零匹配
   （exit=1×2，修正管道 exit 码口径后复核）；mtime 时间线自洽（registry
   03:14 < r1-full-test 03:35 < impl.report 03:36 < verify.raw 03:42——verify
   为最晚主控收口跑；registry 当前=HEAD 无未提交改动，「open 0」与现状
   无矛盾，见新发现 1 的机理）。

### 门二新发现（N 级观察×2，均非阻断、均非本票引入）

1. **check-tickets 不覆盖非 S 前缀工单号**：objRe=`/\{[^{}]*?\bid:\s*'(SR2?-
   [A-Z]+-\d+)'[^{}]*?\}/g` 只认 S/SR/SR2 前缀——亲测 parsed=119 vs registry
   id 字段总数 157，**38 个非 S 系 id 不可见**（F-A8/F-CSS-02/F-LINT-01/
   P7E-*/R1-*/R2-*/F-A* 全列，node 探针输出在案）。后果：这些工单不受
   K3 防作弊链（占位残留/data-ticket/引用一致性/file 存在性）机器覆盖。
   对本票=翻 done 推演的「绿」是平凡绿（更弱但方向安全）；对仓库治理=
   F 系命名工单的防线缺口——**提请主控知悉**是否属有意豁免（若无意，
   可立票扩 objRe 前缀集或加「未解析 id 字段」对账断言）。非本票引入
   （正则与 F 系命名均先于本票存在），不入阻断。
2. **registry W1 注记未落笔**（清单① W1 ⚠ 项）——主控收口翻 status 时随注。

---

## 清单⑤ 成本账本行

| 角色 | 模型×供应商 | token/时长 | 备注 |
|---|---|---|---|
| 实现者（两轮：首轮+回炉 1） | GLM5.3flash（环境统一档如实记） | token/时长自报缺——环境 Agent 工具不暴露读数，**如实记欠账** | 简报/报告档位声明在档 |
| 门一 Kimi R1 | kimi-k3（ds-call.mjs 链） | in=8780/out=10493/189485ms/switches=0 | gate1-audit.md :1 routing 头亲读 |
| 门一 Kimi R2 | kimi-k3（ds-call.mjs 链） | in=5460/out=4704/151083ms/switches=0 | gate1-r2-review.md :1 routing 头亲读 |
| 门二（本审） | 统一档（deepseek v4 flash 优先位不可达——环境 Agent 工具无 model 参数，**欠账披露**） | token 不可自读（环境不暴露）；机器面实测时长：全量 test 35.44s+靶向两跑+脚本探针若干 | 禁编造数字，如实记缺 |

---

## 终评

**PASS**（无阻断项）。

- 门一 R1 四 W 九 N→主控三修两不修→R2 复核三 ADDRESSED→N-R1-1/2 主控直改
  落册——处置链闭环，终态实物逐条对上。
- 语义面：正则 v2 与票面「正则全域归零/去分号依赖」+回炉裁决方向（calc
  值段中缀）全符；tsx 评估结论（维持+全域零匹配）门二亲验成立。
- 机器面：全量 1466 绿+独立复算七件零匹配/四反例全对+变异红证恰 1 红→
  还原 diff 空→132 绿——三重亲证。
- 宪法面：受锁流程/UTF-8/未越预裁/TDD 四档 raw 原文抽查全过。
- 遗留两 N 级观察（check-tickets 非 S 前缀盲区+registry W1 注记待落笔）
  ——均提请主控收口时处置/知悉，不阻断。

> 门二证据件：f-css02-g2-full-test.raw.txt / f-css02-g2-regex.raw.txt /
> f-css02-g2-mutation-red.raw.txt / f-css02-g2-restore-green.raw.txt（均含
> 原始输出+exit 码）+本报告。备份件已删（变异还原毕即删纪律）。
