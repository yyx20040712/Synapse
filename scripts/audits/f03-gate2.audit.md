# SR2-F-03 门二终审档（滚动进度回写恢复与键位迁移）

> 审计人=门二终审子代理（三屋 ADR-0017）；对象=SR2-F-03 实现单元终态。
> 输入=f03-impl-brief.md（主控简报）/票面（scroll-progress.ts 头注五层）/f03-impl.report.md/
> f03-gate1.audit.md（0B/3W/4N）/f03-gate1.diff（1164 行）/f03-*.log 九件。
> **只读独立核实**（禁 npm/test——主控收口亲验）。
> 开工技能清点：code-review-excellence **用**（终审=对抗审计核心面）；
> verification-before-completion / TDD / systematic-debugging **不用**（铁律禁跑命令，
> 只读审计无实现/调试面）；subagent/dispatching **不用**（门二无派发权）；其余技能
> 与本单无关联不用。配置自查：门二=GLM-5.3（主控派发指定）。
> 方法=diff 逐面实读 × 源/测试/registry/manifest 独立复测（wc/grep/sha256/python 计数）
> × 日志交叉 × git HEAD blob 核对。

## ① 处置核对（门一 3W/4N+主控裁量 vs 终态；抽核两条——实抽六条）

### 主控裁量复核

- **W1 裁量成立**：宪法口径「文件 ≤500（ESLint max-lines）/repo ≤300/组件 ≤250」——
  scroll-progress.ts 为 .ts 普通模块（非 .tsx 组件非 repo 根脚本），500 上限，
  wc -l 实测 339 合规（lint 关卡在 verify 链内背书，log :5 链序实证）。「三职责一文件」
  中三段（createScrollProgress/createReaderScrollProgress/useScrollProgressWiring）
  **均为票面接口层字面规约**（头注 :27-31），非实现者私增第二职责；简报④
  「组件/模块行数 ≤250」字面确系笔误（宪法无「模块≤250」条款）。不回炉+增长预案
  与 W3 处置联动——裁量**维持**。
- **W2 备案知悉**：mutation.log 实读确证九轮摘要式（各一行：变异点+EXIT+失败数+
  还原 diff 空），无目标 it 名明细；九轮可经报告↔测试↔diff 三角交叉自洽。
  「变异日志应含目标 it 名」列为后续简报标准条款候选——同意。
- **W3 处置确认**：PageColumn.tsx wc -l 实测 245；F-04 派发简报预置拆分预案
  （几何纯函数独立文件，F-01 门一 E 面建议复用）——主控已声明，执行面归 F-04。
- **N1-N4+疑虑 4 条**：备案，无回炉处置（N1 fire 双 tab 锚定缺口——flushLedger
  全账循环语义在位，S5 锚单 tab；N2 恢复链重复触发等价冗余；N3 修饰键计接管
  =「三类信号」字面；N4 F-04 缩放联测提示；疑虑 1-4 门一 E4 已逐条评估接受）。

### 门一结论抽核（抽两条指标，实抽六条，全部复核成立）

| 门一结论 | 独立复核 | 结果 |
| --- | --- | --- |
| C3 依赖单向（store 不 import scroll-progress） | grep 实测：reader.store.ts 中 "scroll-progress" 仅 :37/:319 **两处注释**，零 import | ✓ 成立 |
| D3 719=691+28 | verify log :1921-1922 实读「93 passed (93)/719 passed (719)」；28=scroll 22（grep -c it 实数）+shortcuts 3+store 净+1+anchor 2 | ✓ 精确 |
| B2 .tsx 非重命名 | git ls-tree HEAD：reader-shortcuts.test.tsx blob=ad528cb（=diff 旧 index hash）；scroll-progress.test.tsx 不在 HEAD | ✓ 成立 |
| E3 翻 done 推演 | 见④——registry+spec 双侧独立推演 21+1 | ✓ 成立 |
| A 表夹取链（W-A） | store :312 `Math.max(0,Math.min(...,totalPages-1))` clamp 在位+PageColumn :206 scrollIntoView block:'start'+:83 nearestPage 导出 | ✓ 成立 |
| （门二新增接缝核点）data-page-box 双侧声明 | PageColumn :228 `data-page-box={no}` 产出 ↔ scroll-progress 装配工厂 getPageBoxes 消费 '[data-page-box]'——两侧一致无互斥（宪法「接缝归责」核对） | ✓ 一致 |

## ② 母本符合度（六态+五序列+W3/N4 并入裁决抽验）

- **六态逐格**：实现实读（scroll-progress.ts :174-242）与票面状态表逐格对应——
  idle 默认态/scrolling 记账+arm 2000ms/pending 决定档（fire 内失配校验+setPage
  同步执行，stateOf==='pending' 可观察性经 mockImplementation 锚）/writing writeSeq+
  态双重守卫（W2 新格：迟到完成不回落 idle）/restoring W-B（程序自发 scroll 仅到达
  判定）+onUserTakeover（INV-32 取消目标）/loading→onColumnReady 恢复链+就位快径。
  测试 22 it 三 describe（六态全格 11/跨格五序列 5/回写几何与容错 6）实数在位。
- **跨格五序列**：S1（失配丢弃+恢复记忆页）/S2（滚动中关 tab flushPending 不双写）/
  S3（pending 中关 tab 立即 flush）/S4（程序跳页与用户滚动竞态接管）/S5（回写竞
  tab 切换只丢 setPage 账照落）——describe('跨格五序列') diff :216-258 实读在位。
- **W3 并入**：anchor-locate.ts :172-179——pageRoot 缺席回退分支 querySelectorAll
  断言 `all.length===1` 才用、>1→null 继续轮询→3s 超时 page 降级 toast；S12a/S12b
  裸 describe always-active 双锚+M5 变异（≥1 取首）1 failed 红。形态与裁决一致。
- **N4 并入**：ReaderPage.tsx :242-250——内容级稳定包装盒（relative div 包
  PdfDocProvider+PageColumn，ref=setSelectionMount），SelectionLayer page=0 弃用位
  （F-02 动态锚定），滚动中锚定页切换不重挂；M8 忠实变异（pageRoot 随锚定页重绑）
  →e2e selection-toolbar toBeVisible 精确红（首试 key={anchorPage} 过烈弃用有留档）。
- **键位/口径杂项**：writing 用 {scroll:'none'}（M1 红）/PAGE_KEYS 四键 scrollByRatio
  ±0.9+空格 spaceScroll(1)（M6/M9 红）/ctrl+wheel 段 diff 零触碰行/STUB 删净
  （src/tests 域 grep 零命中——命中仅 scripts/audits 审计档自身，非代码面）。
- **结论：母本符合度全项成立**。

## ③ 宪法红线终审

1. **受锁 manifest=142**：python json 计数 files=142 实数 ✓；diff 面=4 处 sha 原位更新
   （reader-text.spec/anchor-locate.test/reader.store.test/reader-shortcuts.test）
   +1 新增（scroll-progress.test.tsx）→141→142 净增 1 ✓；
   **五受锁文件 sha256 本档独立重算全部=manifest 值**（3a3a846b/c3203c77/077d4f02/
   7b4981d3/c6635365）——spec 备份法还原干净双佐证（当前工作树=manifest=verify
   locks:check「142 个受锁文件与 manifest 一致」log :34 三方一致）。
2. **行数**：339（模块≤500）/415（store）/249（ReaderPage 组件≤250 达标）/121
   （shortcuts）/282（anchor-locate .ts≤500）/245（PageColumn 组件≤250）——wc -l
   全实测合规 ✓。
3. **invariants**：INV-31（:45）/INV-32（:46）在册，编号 INV-30→31→32 严格延续无撞号
   无跳号；声明处+锚定方式+状态三列齐（Read 工具实读中文 UTF-8 可读——bash 终端
   显示乱码系 codepage 非文件问题，DoD「无乱码」以工具可读为准）✓。
4. **TDD 链**：26 红→69 绿→719 全量→M1-M9 变异红证。红档构成独立分解：scroll
   22（createScrollProgress is not a function）+store 3（registerProgressFlusher
   is not a function ×2+拆链 5s 零调用断言红）+anchor 1（S12b 'exact'≠'page'）=
   **26 精确**；shortcuts 整文件 import 未导出常量模块错误（0 test 计数外，仍属红）；
   57 total=22+22+13 自洽；绿档 69=57+12（shortcuts 全量）自洽 ✓。先红后绿纪律成立
   （四文件测试面先行，无恒真面——M1-M9 各轮红证非恒真背书）。
5. **零依赖/安全禁令**：diff 面无 package.json/lockfile 触碰；scroll-progress 无
   Node/Electron API（纯 DOM 量测+store/api 消费）；无 SQL/eval/出网面 ✓。
   [locked-change]/[dep-change] 尾注归主控收口提交（本单未提交，不适用）。
6. **零触 tickets**：registry :205 SR2-F-03=status:'open' 实读（实现者未翻单）；
   取证 spec 备份法（f03-e2e-newcase.log：1 passed EXIT=0）零触 tickets ✓。

## ④ 机器面（719=691+28 精确数理；翻 done 推演；受锁 e2e 面核对）

- **719=691+28** ✓：verify log :1921-1922「Test Files 93 passed (93)/Tests 719
  passed (719)」；93=92+1（scroll-progress.test.tsx 新文件）；28=22+3+1+2 精确
  （见①抽核表）。
- **src 全号引用**：grep "SR2-F-03" src/ 唯一命中 scroll-progress.ts:3（注册文件
  头注）——**注册文件外零残留** ✓（简报③7「注册文件全号合法」兑现）。
- **e2e 翻 done 推演（独立双侧推演）**：
  - F03_DEPS（reader-text.spec :347）=[DEPS(4)+SR2-F-01+SR2-TABS-01+SR2-F-03]——
    registry 实读 6 项 done+唯 F-03 open → 翻 done 后全满足 → 批 3 激活（+1 passed）。
  - reader-scroll.spec（F-04 骨架）:42 仅 1 个 test，其 DEPS 含 SR2-F-04（open）→
    翻 F-03 后仍 skip。
  - 当前 20 passed+2 skipped（f03-impl-e2e.log :69-71，E2E_EXIT=0；skip 构成=批 3
    守卫+F-04 骨架，ok 序号缺 12=批 3 skip 实证）→ **翻 done 后 21 passed+1 skip
    成立** ✓。
- **受锁 e2e 面核对**：reader-text.spec.ts 当前 sha256=manifest（3a3a846b…）✓；
  批 3=纯增量（+92 行新用例，既有用例零触碰——diff 逐 hunk 实读）✓；批 3 用例
  断言面覆盖键位滚动步（top0<50+0.9 屏+页码防抖不翻）/N4 工具条滚动不闪收/滚动→关→
  重开恢复页（P2 可见+第 2 页+poll scrollTop>100 真滚回）——与票面文化层「批 3=tab
  序列段」对应 ✓。

## ⑤ 成本账本行

| 单元 | token（约） | 时长 |
| --- | --- | --- |
| 实现者 | 13.20M | 62.9min |
| 门一深审 | 0.81M | 6.7min |
| 门二终审（本档） | ≈0.15M | ≈10min |

（门二数字为会话自估，精确值待主控台账汇总。）

## 总评

**PASS（终审通过，无回炉项）。** ①门一 0B/3W/4N 维持——三项 W 均非行为缺陷，
主控三项裁量（W1 行数口径/W2 简报条款候选/W3 F-04 拆分预案）独立复核**全部成立**；
②母本符合度全项成立（六态逐格+五序列逐序列+W3/N4 并入裁决形态与红证齐备）；
③宪法红线零违反——受锁 142 数理+五文件 sha 独立重算一致+行数全合规+INV-31/32
编号延续三列齐+TDD 链四档自洽（红档 26=22+3+1 精确分解）；④机器面 719=691+28
精确、src 全号引用注册文件外零残留、e2e 翻 done 推演 21+1 双侧独立成立、受锁
e2e 面还原干净；⑤成本账本入账。门二新增独立核点（data-page-box 接缝双侧声明、
红档构成精确分解、F03_DEPS 逐项 status 实读）均无新发现。移交主控收口：亲验
verify+e2e 双真退出码→locks 确认→翻 registry SR2-F-03=done→[locked-change]
提交（触碰 invariants/tests/migrations 面）。
