# F-TOOL-01 门二终审报告（四清单+一）

> 档位声明：门二位应为 deepseek v4 flash 优先，但环境 Agent 工具无 model 参数——实际
> 统一档与实现者同源（GLM5.3），如实记欠账披露，禁冒充定档。
> 二审实证位：逐条裁决+独立复算+亲跑（机器面 8 条命令各自记 exit 码）。
> 纪律遵守：零 git 写操作；除本报告+两份 f-tool01-g2-*.json 探针产物外零文件改动。
>
> 会话开工技能清点（宪法硬规）：
> - verification-before-completion：**用**（终审验证场，亲跑+独立复算核心方法）
> - code-review-excellence：**用**（门审对抗审查方法论）
> - systematic-debugging：**不用**（审查场非调试场，无需假设-实验循环）
> - test-driven-development：**不用**（不写实现，纯审已有件）
> - browser-testing/e2e-testing/webapp-testing：**不用**（派发令明示 e2e 面不跑；被审件为
>   纯 CLI 工具，其 playwright 面已由工具自身实跑覆盖）
> - 其余技能与本案无涉，不用。

被审终态：`scripts/audits/visual-diff-locate.mjs`（333 行，git status `A` 已暂存，
工作树另有 `M locks/manifest.json`——主控收口流程已执行 locks:apply，见清单④）。

---

## ① 处置核对（门一 findings/主控处置 vs 终态实物——逐条对 `visual-diff-locate.mjs` 行号）

| 项 | 派发指令声称的处置 | 终态实物核对 | 裁决 |
|---|---|---|---|
| B-1 crop 尺寸不等退出码应 1 | 页内 sizeMismatch+Node bail(1) | :147-150 `cropInPage` 返回 `{sizeMismatch:{baseline,after}}`；:277-279 crop 主链 `bail(1)`；:304-306 差分同构 bail(1)；neg5 实测 `crop 两图尺寸不等…exit=1` 在档（f-tool01-negcases.raw.txt L14-16） | ✓ ADDRESSED 属实 |
| W-1 absDir 目录判定 | statSync().isDirectory() | :205-211 `statSync(r)`+`isDirectory()` 两分支（不存在=2/不是目录=2）；neg4 在档 exit=2 + 本审亲跑复现（见④） | ✓ ADDRESSED 属实 |
| W-2 mkdtemp/launch 泄漏 | try 内+判空清理 | :256-258 `tmpDir/browser` 先行 null 声明；:260-261 mkdtemp+launch 均在 try 内；:329-331 finally 双判空清理 | ✓ ADDRESSED 属实 |
| N-1 负例六支 | f-tool01-negcases.raw.txt（2/2/1/2/1/2） | 档在：neg1 无参=2/neg2 态缺文件=2/neg3 差分尺寸=1/neg4 目录传文件=2/neg5 crop 尺寸=1/neg6 伪 png=2——六支 exit 码逐行在档（L4/7/10/13/16/19） | ✓ ADDRESSED 属实 |
| N-2 双写面 | 头注对位表（主控裁量无运行时守卫） | :20-21 「参数对位表：Node 侧 BLOCK/TH/CNT=16/6/4 ↔ 页内 diffInPage 字面量 16/6/4（序列化不带闭包——改值双写面，两处须同步）」；页内 :90 注释「改值须同步头注与 meta」 | ✓ 按主控裁量落地属实 |
| N-3 crop+态清单互斥 | fail(2) | :66-68 `opts.crop !== null && pos.length === 3` → `fail(2, 'crop 模式不接受态清单参数（--crop 已指定态）')` | ✓ ADDRESSED 属实 |
| 回炉 1（门一前主控亲核）crop 上下顺序颠倒 | urlBase/urlAfter 语义直画+顺序验证 | :271-274 调用处语义命名；:158-163 页内按 `baseImg` 画上半/`afterImg` 画下半直画+根因注释；顺序验证=f-tool01-crop-order.raw.txt：合成纯蓝 baseline/纯红 after，独立 playwright 页解码读像素 y=30 蓝/y=64 洋红/y=98 红，order_assert=PASS（内容级判定，非 IHDR 尺寸恒真） | ✓ 属实 |

**R2 低置信清理顺序缺口的独立复裁**（派发令授权可独立复裁项）：`finally` 中
`browser.close()` 若 reject（chromium 已失联场景）会吞掉下一行 `rm(tmpDir)` 执行——
缺口真实存在（:329-331 线性顺序无嵌套容错）。但：触发条件=浏览器进程异常失联（本票
全部实跑含六负例+本审四跑均未触发）；后果=残留一个 os tmpdir 临时目录（系统临时面
非仓内）+退出码漂移为非预期非零。风险低+回炉 2 限额已满。**同意主控裁量不修**，
记录为已知边界（后续若 tools 族扩员可一并收）。

---

## ② 母本符合度（票面=registry :251 F-TOOL-01 行+实现者简报含主控预裁）

| 预裁条款 | 终态核对 | 裁决 |
|---|---|---|
| 1. CLI 双模式 | 差分 :8-10（态清单缺省=同名 PNG 交集 :216-226）/crop :11-14（--out 缺省 visual-diff-crop.png :44） | ✓ |
| 2. 算法钉死 v51 配方 | BLOCK/TH/CNT=16/6/4（:40-42）+页内字面量 16（:114/117/119）/>6 与 <-6（:125）/>=4（:127）；边缘块 `Math.min(x0+16,w)` 按实际尺寸（:117/119）；行带聚合=连续差分块行合并（aggregateBands :168-201），带 y 含端块全界（:191-192）/x=带内差分块 min/max 列块全界（:193-194）/附块数 | ✓ 逐行无偏差 |
| 3. 两图尺寸不等=非零 | 尺寸不等=bail(1)（对比前提破坏——合同「非零」细化为 1，与工单指令 B-1 应 1 一致） | ✓ |
| 4. 三坑规避内建 | ①goto file:// 载体页（:264-268 载体 HTML 自身 pathToFileURL）；②launch args --allow-file-access-from-files（:261）；③全部路径 pathToFileURL（:266/273-274/304——中文仓路径亲跑零失败） | ✓ |
| 5. chromium 引入+禁 _electron | :32 `import { chromium } from 'playwright'`；全文件零 electron 引用（import 面亲查见③） | ✓ |
| 6. 退出码合同+JSON | 有带/零带均 exit 0（:310-311 零带打印/:324）；参数错/文件缺=2（fail(2) 全路径）；尺寸不等=1；JSON 落盘 --json 缺省 visual-diff-report.json（:43/321-322），meta 自述算法与钉死值一致（blockPx 16/threshold TH6/minDiffPixels 4——亲读该 JSON 头部） | ✓ |
| 7. 工具头注 §6.2 语境 | :4-6 三件套①（带对位）→②（crop 本工具 --crop 模式）→③（调用方 DOM 断言）语境+用法两行+三坑各一句 | ✓ |
| 8. locks/git 不碰（实现者） | 实现者报告 §6 零触碰声明；locks:apply 由主控收口执行（见④核实已办） | ✓ |

验收判据（简报⑤）：八态 42 带对位（实现报告 §4 逐带归位顶栏/侧栏/卡片 meta/边标签/
图例/底部版本号+交叉自洽 lib≡ws-panel 卡片带值 93/40、lineage 三态≡dialog 带值
36/12/105）+同图零带+crop 自测 1608×194——三判据全过。实现者疑虑 1（reader「变化面
最大」预判与实测 135 块最少档不符）已如实申报且物理解释成立（探针 PDF 不消费 --fs-*
token；在档对位句亦仅列 UI 区），主判据不受影响。

七项自裁（洋红分隔线/半开区间记法/ToolError 清理链/负例补充/evaluate 真函数/JSON
指名/交集排序）均属预裁外合理裁量，无越权。

---

## ③ 宪法红线终审（全部亲查亲跑）

| 红线 | 核对法 | 结果 |
|---|---|---|
| 新文件 ≤500 行 | `wc -l` 亲数 | **333 行** ✓ |
| UTF-8 无乱码 | 逐字符扫描 U+FFFD | **replacement-chars=0** ✓ |
| 无新依赖 | import 面亲查（:32-37 全量六行）：`playwright`+`node:fs/promises`+`node:fs`+`node:os`+`node:path`+`node:url`——playwright 为既有依赖（package.json :43 @playwright/test ^1.49.1，playwright 为其同仓包，本审四跑亲证可解析），node: 全内置 | ✓ 零新增 |
| scripts/*.mjs 不在 eslint files 面 | eslint.config.js 亲读：files 面全部七处=src/renderer|src/main(含 db/services/ipc)|src/shared|tests——scripts 零覆盖 | ✓ 「不用跑 lint」理由成立 |
| 证据链四档 | ①同图零带先跑（先红形态——出带=算法 bug，f-tool01-sameimg.raw.txt）②八态实跑（f-tool01-diff-8states.raw.txt）③负例六支（f-tool01-negcases.raw.txt）④crop 顺序验证（f-tool01-crop-order.raw.txt） | ✓ 四档全在且全带 exit 码尾注 |
| 自产 .mjs 即 locks | `locks/manifest.json` 亲读：**已登记** `scripts/audits/visual-diff-locate.mjs`，sha256 亲算匹配（manifest16=actual16=`3b4aabe452593fac`）；`node scripts/check-locks.mjs` 亲跑=287 个一致 exit 0 | ✓ 无欠账（287=交接 v51 基线 286+本新件 1，段间衔接可解释） |

附：本审首次曾误判 manifest 未含新件——系本人把 manifest.files 数组当对象键查询的
工具面错误，改数组 find 后证实已登记。误判未流入任何裁决（当场纠正），如实记。

---

## ④ 机器面核对（亲跑矩阵——各自记 exit 码）

| # | 命令 | 期望 | 实测 | 裁决 |
|---|---|---|---|---|
| 1 | `node --check scripts/audits/visual-diff-locate.mjs` | 0 | **check-exit=0** | ✓ |
| 2 | 同图对比（baseline vs baseline，--json f-tool01-g2-sameimg.json） | 八态零带 exit 0 | 8×「（零带）」diff-blocks=0，**pipefail-exit=0**（注：首跑 exit 捕获为管道尾码不采信，pipefail 重跑取证） | ✓ |
| 3 | 单态差分 lib（--json f-tool01-g2-lib.json） | 8 带 exit 0 | 1 态/8 差分带，**lib-pipefail-exit=0**；与实现者证据 f-tool01-diff-8states.raw.txt :13-20 lib 段 **diff 逐带零差异**（BAND-BY-BAND-IDENTICAL） | ✓ |
| 4 | 负例：无参 | 2 | `[FAIL] 用法:…`，**neg1-noargs-exit=2** | ✓ |
| 5 | 负例：baselineDir 传 PNG 路径 | 2 | `[FAIL] baseline 不是目录（传了文件路径?）`，**neg2-dir-is-file-exit=2** | ✓ |
| 6 | verify 全链档抽查（不重跑） | 档真实+口径对 | f-tool01-verify.raw.txt：`Test Files 156 passed (156)`/`Tests 1543 passed (1543)`/`locks 检查通过：287 个`/尾部 `exit=0`；链头 :5 与 package.json verify 串一致；tickets 统计 :24「共 119 个」与本审独立解析 registry（objRe 亲测 parsed-count=119）一致 | ✓ 档真口径实 |
| 7 | `node scripts/check-locks.mjs` 亲跑（本审追加——澄清 manifest 覆盖） | 0 | 287 一致 **exit=0** | ✓ |
| 8 | 独立复算带几何 | 自洽 | band y=[16,64)=块行 1-3（1×16..4×16）、y=[944,992)=块行 59-61、x=[0,224)=块列 0-13——16px 网格全对位；八态带数独立加和 4+8+5+5+5+5+4+6=42=汇总值 | ✓ |

**registry 翻 done 推演**（check-tickets.mjs 亲读）：
- 规则 1 文件存在性：票面 file=`scripts/audits/visual-diff-locate.mjs` 存在（本审 wc/亲跑多次触达）。
- 关键事实：check-tickets objRe=`\{[^{}]*?\bid:\s*'(SR2?-[A-Z]+-\d+)'…`——**F- 前缀工单整体
  不在解析面**（亲测 F-TOOL-01-parsed=false、F 系样本=空、119 全为 SR/SR2 系）。
  故翻 done 不触发任何 check-tickets 规则（含存在性核对——该核对只遍历被解析工单）。
- src/tests 引用面：`grep -rn "F-TOOL-01" src/ tests/`=零匹配（exit 1）——无占位残留风险。
- 规则 3/4/4b/5/6：NotImplementedError/STUB/data-ticket/guardedDescribe/SR2 指针——
  均与本 .mjs 无涉（亲读确认）。
- **推演结论：翻 done 后 verify tickets:check 仍绿。** F 系 infra 工单游离于 check-tickets
  检查面为该脚本既有设计边界（非本票引入），如实记录供主控知悉，不构成本票阻塞。

**e2e 面**：派发令明示不跑——新件零 e2e 触点（verify test 段 156 文件已含全量），遵令。

---

## ⑤ 成本账本行（从实现者报告/门一 routing 头汇出+本审自报）

| 角色 | 模型×供应商 | token/时长 | 来源 |
|---|---|---|---|
| 实现者（含回炉 1/2） | GLM5.3flash 位（环境无 model 参数=实际统一档，欠账如实记） | **token/时长未记**——实现报告无 usage 行（欠账，如实披露） | f-tool01-impl.report.md |
| 门一 R1（兜底审） | deepseek-v4-flash（deepseek） | in=14020 out=17094 latency=135086ms switches=2（Kimi kimi-k3 双源 HTTP 403 五小时额度窗耗尽） | f-tool01-gate1-call.raw.txt :6 亲验 |
| 门一 R2 复核 | deepseek-v4-flash（deepseek） | in=7532 out=30471 latency=213250ms switches=0 | f-tool01-gate1-r2-review.md 头注亲验 |
| 门二（本审） | 统一档（GLM5.3 同源，deepseek 位欠账如实记——环境 Agent 工具无 model 参数） | 亲跑 8 命令+4 文件细读+2 探针产物+本报告；token 无工具面读数不自估 | 本报告 |

---

## 终评：**PASS**

依据：①门一六 findings+回炉 1 处置全部属实落地；②票面八条预裁+验收三判据全符；
③宪法红线六项全过（333 行/UTF-8/零新依赖/eslint 面外/四档证据/locks 已登记）；④机器
面八条亲跑全中——同图零带封假阳性、lib 逐带 IDENTICAL、负例两支复现、verify 档真
口径实、check-locks 绿、带几何独立复算自洽。附两条不阻塞记录：R2 低置信清理顺序缺口
（同意主控裁量不修）+ F 系工单游离 check-tickets 面及实现者 token 未记两笔欠账披露。
