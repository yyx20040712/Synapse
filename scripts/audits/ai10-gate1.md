# SR2-AI-10 门一对抗深审（gate1）

日期：2026-08-27 ｜ 审者：门一孙代理（独立于实现者）｜ 输入：ai10-diff.patch / 票面（HEAD 版 ZcodeLinkSection.tsx 头注）/ ai10-impl.report.md / ai10-{red,green,mutation,verify,e2e}.log
统计：**0B / 2W / 4N** ｜ 裁决：**PASS（不回炉；W1 报告数字失真需在收口/门二更正声明）**

## A. 母本符合度

- **五态逐态** ✓
  - zcode-not-found：`~/.zcode` 不存在即短路（service L98-101），不触 readStatus（单测 `expect(h.readStatus).not.toHaveBeenCalled()` 实证）——最弱信号语义+指引文案兜底（「已装但从未运行也可能显示未发现——首次运行后自愈」）与票面 N10-4 一字面对齐。
  - found-skill-missing+按钮：`.zcode` 在且 SKILL.md 缺 → 按钮 `data-action="install"`（ZcodeLinkSection L425-436）；overwrite 事实（目录在但 SKILL.md 缺）实现者自拟字段、自裁申报 2 成立——无该字段覆盖型确认无从触发，语义在 schemas 头注声明。
  - installed-idle：readStatus null（从未运行）与 running=false 两路径均有专测。
  - running：单源=`status.running` 直接消费（service L125），零阈值复写；state 自述+currentPaper 呈现（含 currentPaper=null 无后缀专测）。
  - error+重试：readStatus 上抛（status.json 损坏）折叠 error 含 reason；重试按钮两路径（Res.state=error / IPC 拒绝 failed）均测。
- **迁移序列** ✓：打开检测一次（useEffect 挂载即 `void run()`）；装→re-detect→idle（组件+服务双层测）；轮询 5s 门控（busyRef 在途暂停）+卸载 clearInterval（INV-14 成对，专测 15s 窗）。
- **跨格序列**：①组件级全链（not-found→skill-missing→装→idle）；②③合并——组件 seq②与服务跨格用例均实测 idle→running→idle（=票面③），票面②（running→退→idle）为其子序列已覆盖，但**标签混用**（见 N1）。
- **确认对话框两型** ✓：首装文案不含「覆盖」（否定断言）、overwrite=true 重申覆盖——两型分别断言，取消不调 install 专测。
- **INV-21 零 spawn** ✓：diff 级核对——新增实现文件（zcode-link.service/ZcodeLinkSection/ipc/bootstrap/services.index/schemas/api-surface）零 `child_process|spawn|exec`；e2e-env.ts 的 spawn 为既有 seed import 的 diff 上下文行（本单只改 launch 签名）；install=`fs.cp`、detect=`fs.stat`+readStatus；e2e 断言=纯 fs 落地（4 文件存在+SKILL.md 与仓库模板逐字节一致），零进程行为依赖。自裁申报 7 属实。
- **零路径展示面** ✓：UI 无绝对路径渲染；error 态 reason 透传与装技能失败 toast 含路径=票面「错误文案非展示面」明文许可。
- **双源解析单函数收敛** ✓：`resolveTemplateDir` 单函数+dev/prod 两用例（注入路径字符串，不依赖真打包产物——合主控预裁 2）。
- **extraResources 延展** ✓：`tools/ai-sensor → ai-sensor` 与 resolveTemplateDir prod 落点对齐；该文件不受锁。

## B. 宪法红线

- 分层 ✓：fs 全在 main（zcode-link.service），renderer 仅经 `api.ai_sensor`（ipc→service 薄分发两行）；无跨层。
- 受锁流程 ✓：manifest 121 条与 verify 日志「locks 检查通过：121 个受锁文件与 manifest 一致」对账一致；变更面=schemas/api-surface sha 更新+3 新增受锁路径（zcode-link.spec / 两单测）+e2e-env.ts 最小延展（launch 增可选 extraEnv，默认空——既有调用零改动）；docs/invariants.md 非受锁（manifest 无该路径，核对 manifest 121 条目无 invariants）。
- 行数 ✓：service 132 ≤500；组件 ~148 ≤250；无第二职责混入。
- UTF-8 ✓：diff 中文全部可读。无 TODO/FIXME/placeholder ✓。

## C. 代码与测试质量

- **红**：ai10-red.log exit=1，14 failed/474 passed——数字与报告一致；但组件文件红跑为「16 tests | 14 failed」即 **2 用例对占位恒绿**（见 W2）。
- **绿**：exit=0，**79 文件 / 520 用例**（报告写 504——见 W1）。
- **变异红证**：M1-M4 全部 `npm exit=1`（上批 W 改进项「npm 真退出码」已核对落实——mutation.log 逐条 exit=1）；还原 diff 空 ×4 入日志（上批 N-C1 挂账亦落实）。
- **verify**：exit=0 全链（quality+tickets+locks 121+lint+typecheck+test+build）。
- **e2e**：16/16 passed（基线 15→16）；新用例全真实文本断言（toHaveText 精确中文×3+toast 正则）+fs 存在性+逐字节一致；SYNAPSE_ZCODE_HOME 隔离经 launch extraEnv，无全局 env 篡改（主控预裁 2 通过——注入设计干净：bootstrap 仅 env→构造参数映射，服务不触 app/os）。
- error 态+status.json 损坏用例存在 ✓（服务 mock 上抛+组件 reason 渲染）。

## D. 报告诚实性（对 diff/日志逐条核）

- 自裁申报 1-8 逐条对 diff 核实**全部属实**（含 data-ticket 保留理由=check-tickets 关卡 3，主控预裁 3 已认；diff --stat 10 文件 221+/83- 与实际改动面吻合；dist_new/ 未触碰属实）。
- **W1 数字失真**：①绿跑写「79 文件 504 用例」，日志实为 **520**；②组件写 17 用例实为 16（grep 实数）；服务写 14 实为 13；③「+2 文件+13 用例」实为 +2 文件 +29 用例（491+29=520 恰对账）。失真方向均为**少报**（非虚增多报），日志全链可复核、无掩饰性——定性为计数口误族（AI-09 门二 N 同型），但一次三处且 verify 段照抄错数，升 W 要求收口时在提交信息/收口单更正。
- **W2 红证不完整**：红跑 14/16 failed=2 用例对占位首跑即绿（推证为否定路径用例：「确认取消不调 install」——占位无按钮 click 落空即断言过；「卸载清 interval」同型）。违反「每个测试必须能失败一次」字面。缓解：两用例均为防回归否定断言，且 M3 变异（去 clearInterval）已使卸载用例红过一次=事后补红；「确认取消」无变异覆盖。不构成回炉（实现面无缺陷），记流程债。

## E. 接缝与后续单

- ai_sensor 域六通道全景（requestAiRead/aiStatus/observe/importAll/listByPaper/zcodeDetect/zcodeInstall——实为七通道，含 AI-08 observe）自洽：新两通道纯 fs 不触协议写面，与 06/07/08 零耦合。
- 08 observe/aiStatus 消费无破坏：aiStatus/observe 处理器 diff 未触碰（ai_sensor.ts 仅追加两行）；readStatus 经 06 实例闭包注入=单源，无双写。
- INV-21 锚定文本质量良：锚定格含具体证据面（纯 fs 实现+e2e 逐字节断言+零进程依赖），非空洞翻格。
- 后续注意：resolveTemplateDir prod 路径无 e2e（自裁已报，归收口人工验收 extraResources）；轮询 STATUS_POLL_MS 第 3 处出现时抽 shared（RoT 已声明）。

## Findings 汇总

| 编号 | 级 | 位置 | 内容 |
| --- | --- | --- | --- |
| W1 | W | ai10-impl.report.md §红证四档/测试证据 | 绿跑用例数 504（实 520）、组件 17（实 16）、服务 14（实 13）、增量 +13（实 +29）三处失真——收口须更正 |
| W2 | W | tests/unit/renderer/zcode-link-section.test.tsx | 2/16 用例对占位恒绿（确认取消/卸载清 interval），红证未覆盖；「确认取消」路径无变异补红 |
| N1 | N | 组件 seq②/服务跨格用例标签 | 实测 idle→running→idle=票面③，标签写②；票面②为子序列已覆盖但命名混用 |
| N2 | N | zcode-link.service.ts L130-135 | detect fs 异常（非 ENOENT）reason 透传英文原文（如 EPERM）——头注已声明透传语义，票面中文 reason 仅约束 install 面 |
| N3 | N | ZcodeLinkSection.tsx onRetry | retry 按钮 run() 直调不经 busyRef 门控——busy 期可点，影响=装技能在途时 res 被覆写（呈现层瞬态，无数据面风险） |
| N4 | N | e2e 覆盖面 | resolveTemplateDir prod 分支（resourcesPath/ai-sensor）+extraResources 打包产物无自动验证（自裁已报，归收口） |

## 总评

**PASS（0B/2W/4N）**。实现面零阻断：五态状态机/迁移/INV-21 零 spawn/零路径展示面/分层/受锁流程全部达标，四档红证机制落实（npm 真退出码+还原 diff 空入日志——上批两项改进确认收敛）。两 W 均为报告/测试流程债非实现缺陷：W1 收口时更正数字即可；W2 记入当次简报供下批模板（否定路径用例红证策略）参考。建议门二终审关注 W1 更正落实。

## 回炉复核（主控裁回炉 1 轮后——独立复核）

日期：2026-08-27 ｜ 复审者：门一回炉复核子代理（独立身份，只读）｜ 对象：W2 测试两用例现内容 / ai10-mutation.log 末段 / ai10-impl.report.md「回炉 1 轮记录」+三处数字更正
开工技能清点：code-review-excellence 用（对抗审方法论）；verification-before-completion/systematic-debugging/TDD 不用——铁律禁 npm/test/git 改动性命令，验证以静态文本+既有日志机器输出对账为准；其余技能与本只读审计无关。

### W1（报告数字三处失真）——**ADDRESSED**（主项全部落实，残留 1 处旧数见 N5）

逐项与实物对账：

| 更正项 | 报告现文（行号） | 实物证据 | 判定 |
| --- | --- | --- | --- |
| 绿 504→520 | L48「79 文件 520 用例」+L49-50 更正注（含点名 verify 日志手写 echo「504」亦为错数） | ai10-green.log L1233-1234 机器输出 `Test Files 79 passed (79)` / `Tests 520 passed (520)`；ai10-verify.log L1266-1267 同数；verify.log L1311 手写 echo「Tests 504 passed (504) [回炉后口径：79 文件]」确为错数、报告点名属实 | ✓ |
| 组件 17→16 | L67「单测组件（16）」 | grep 实数 `it(`=16（zcode-link-section.test.tsx） | ✓ |
| 服务 14→13 | L62「单测 service（13）」 | grep 实数 `it(`=13（zcode-link.service.test.ts） | ✓ |
| 增量口径 | L47-48「+2 文件+29 用例（组件 16+服务 13）」 | 491+29=520、16+13=29 恰好对账 | ✓ |
| verify 终局 | L57-58/L128-129「79/520、exit=0」 | verify.log L1266/L1305 exit=0 | ✓ |

### W2（两用例对占位恒绿，触「每个测试必须能失败一次」）——**ADDRESSED**

- **①「确认取消」（现 L221-234）**：前置事实断言到位——L226 `expect(text()).toBe('已发现 zcode，技能未装')`（click 前真实态文本）、L231 `zcodeInstall` not.toHaveBeenCalled、L232 态保持、L233 按钮仍可用。对占位推演：空占位 `text()`=''≠期望文本即红；即使占位渲染态文本但无按钮，L233 `undefined≠false` 亦红。**真能对占位红**。
- **②「卸载清 interval」（现 L310-321）**：L314 `expect(calls).toBeGreaterThanOrEqual(1)` 前置（挂载期确有轮询）+L319-320 advance 15s 后 calls 不增。对占位推演：占位零 detect 调用→calls=0→前置断言红（旧版此处 0===0 恒绿洞已封）。**真能对占位红**。
- **红证存在性**：ai10-mutation.log L14-23——「回炉 W2：占位还原自验 R1 npm exit=1」在档（首节截断作废已声明，重跑节含 4 条具名 red 行）；关键交叉验证：red 行引用的用例标题**含新后缀**（「（按钮仍可用）」「（前置=已轮询）」）——证明 R1 是对**回炉后新测试**跑的占位还原红证，非旧版残留输出；L15/L18 双节均 `R1 npm exit=1`、`还原 diff 空`。

### 新破坏扫描（仅限回炉改动面）

- **测试文件**：以 ai10-diff.patch（11:00 回炉前快照）重构旧版与现文件 diff——仅两个 hunk，恰为上述两用例（标题后缀+前置断言+补充后置断言），其余 14 用例与 mock 脚手架零触碰；改动无语法/时序副作用（confirm 重 spy 覆写 beforeEach 默认 true，作用域仅本用例）。
- **ai10-mutation.log**：纯末尾追加两节，M1-M4 原始记录未被触碰。
- **ai10-impl.report.md**：编辑限于数字更正与「回炉 1 轮记录」节追加，其余章节原文未动。**发现 1 处残留（N5）**：L37-38 文件清单仍写「14 用例/17 用例」（服务/组件），与 L62/L67 更正后的 13/16 及实物互斥——主控代记更正漏改此两行，文档内部不一致。
- **locks 同步**：测试文件为受锁文件，回炉改动（mtime 11:03:54）后 manifest.json 已重锁（mtime 11:05，含 zcode-link 3 条目），verify 11:08 `locks 检查通过：121 个受锁文件与 manifest 一致`（verify.log L26）——无锁失同步破坏。
- **回炉后终局**：verify.log（11:08）test 79/520 全过且含两用例运行记录（44 行匹配）；时间线连贯：测试编辑 11:03→R1 占位红证 11:04→manifest 重锁 11:05→verify 11:08→报告代记 11:46。

### 结论

**回炉通过**：W1、W2 均 ADDRESSED——W1 三处数字与实物（机器输出 79/520、实跑 16+13）全部对账一致且错数 echo 已点名；W2 两用例前置事实断言到位、占位还原红证在档且证属新测试，宪法「每个测试必须能失败一次」缺口已闭合。新增 N5（impl.report.md L37-38 残留旧数 14/17，与 L62/L67 互斥）为文书一行修正项，归主控收口顺手处理，不构成再次回炉。
