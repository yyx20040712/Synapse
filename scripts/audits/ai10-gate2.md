# SR2-AI-10 门二终审（gate2）

日期：2026-08-27 ｜ 审者：门二终审孙代理（独立于实现者与门一）｜ 铁律：只读，本文件为唯一产出
输入：票面头注（HEAD 版 ZcodeLinkSection.tsx）/ ADR-0015 §4 / ai10-diff.patch（回炉后重生成版）/ ai10-impl.report.md（含回炉节+W1 主控代记）/ ai10-gate1.md（含回炉复核节）/ ai10-{red,green,mutation,verify,e2e}.log / locks/manifest.json / docs/invariants.md / tickets/registry.ts / scripts/check-tickets.mjs

开工技能清点：**用** code-review-excellence（终审=对抗性审查方法论）+ verification-before-completion（本裁决自身完成前逐项对账）；**不用** TDD/systematic-debugging/subagent-driven-development 等——本角只读审计、禁 npm/test/git 改动性命令，无实现面与调试面。配置自查：本代理为终审身份，单模型单会话，无再派发。

**统计：0B / 0W / 1N（新增，收口清单提醒项）｜ 裁决：PASS**

---

## ① 处置核对（门一全 findings + 回炉复核 vs 终态实物）

| 编号 | 门一内容 | 终态实物核对 | 判定 |
| --- | --- | --- | --- |
| W1 | 报告数字三处失真（504/17/14/+13） | impl.report.md 现文 L47-48「+2 文件+29 用例（组件 16+服务 13）」、L57「test 79 文件 520 用例」、L62「service（13）」、L67「组件（16）」+L49-50 更正注（点名 verify 日志手写 echo「504」为错数）。机器输出亲自复核：green.log L1233-1234 `Test Files 79 passed (79)` / `Tests 520 passed (520)`（vitest 原生 ANSI 行）；verify.log L1266-1267 同数 | **ADDRESSED** |
| W2 | 两用例对占位恒绿（确认取消/卸载清 interval），触「每个测试必须能失败一次」 | 终态测试（diff L948-961/L1037-1048）：①前置 `expect(text()).toBe('已发现 zcode，技能未装')`+install not.toHaveBeenCalled+态保持+按钮仍可用；②前置 `calls>=1`（挂载期确已轮询）+advance 15s 不增——恒绿洞（0===0）已封。R1 占位红证在档（mutation.log L14-23）：`R1 npm exit=1`×2 节（首节截断作废已声明，重跑节 4 条 red 行），red 行用例标题含新后缀「（按钮仍可用）」「（前置=已轮询）」——证属回炉后新测试非旧残留 | **ADDRESSED** |
| N1 | seq②/③标签混用（实测 idle→running→idle=票面③，标签写②） | 终态未改（组件 L1020/服务 L1212 仍标②）。N 级存档：覆盖实质完整（序列本体已测），标签瑕疵不阻断 | 存档（维持门一裁定） |
| N2 | detect fs 异常 reason 透传英文原文 | 终态未改；服务头注「reason 原文透传不吞」已声明，票面中文 reason 仅约束 install 面 | 存档 |
| N3 | retry 直调不经 busyRef 门控（busy 期可点） | 终态未改（组件 L141 `onClick={() => void run()}`）；呈现层瞬态，无数据面风险 | 存档 |
| N4 | prod 模板源（resourcesPath/ai-sensor）+extraResources 无自动验证 | 终态未改；自裁申报 7/疑虑节已报，归收口人工验收（dev/prod 解析有注入字符串双用例） | 存档+收口提醒 |
| N5（回炉复核新出） | impl.report.md L37-38 残留旧数 14/17 与 L62/L67 互斥 | 现文 L37「13 用例」/L38「16 用例」——与实物（grep `it(` 计数 13/16）及机器输出一致，文档内部自洽 | **已修（ADDRESSED）** |

门一回炉复核节自身结论（W1/W2 ADDRESSED）经终态实物再对账全部成立，无翻案项。

## ② 母本符合度（票面五层 vs ADR-0015 §4 N4）

- **三档四态+error**：ADR §4 三档（未发现/已装未运行/运行中）实现为五态枚举（not-found/skill-missing/installed-idle/running/error，schemas strict enum 单一真相源）——四分解为「已装/未装之间须存在装技能动作面」的票面前置裁决，error=呈现态折叠（服务头注声明三态分离在 06 保持）。逐态检测事实与服务实现逐行对齐（not-found=stat 短路不触 readStatus 且有 not.toHaveBeenCalled 专测；skill-missing+overwrite 事实；idle=readStatus null 与 running=false 两路径；running=status.running 单源消费零阈值复写；error=readStatus 上抛/fs 异常折叠含 reason）。✓
- **error/INV-21 不代启**：全链零 spawn——新增六实现文件 grep 零 `child_process|spawn|exec`（diff 级核对：e2e-env.ts 的 spawn 为既有 seed import 的上下文行，本单只改 launch 签名增可选 extraEnv 默认空）；install=`fs.cp` 递归、detect=`fs.stat`+readStatus；e2e 断言=纯 fs 落地（4 文件存在+SKILL.md 与仓库模板逐字节一致+零进程行为依赖）。INV-21 登记册翻「已锚定」且锚定格含具体证据面非空洞翻格。✓
- **零路径展示**：UI 无路径渲染；Res 请求面=voidReqSchema（renderer 不传路径，INV-07 保持）；error reason 文案=票面「错误文案非展示面」明文许可。✓
- **纯 fs 装技能+确认**：确认对话框两型（首装不含「覆盖」否定断言/overwrite=true 重申覆盖）+取消不调 install；覆盖装=rm+cp 删除重建（残留不存活专测）；模板缺失上抛中文含路径。✓
- **心跳=06 单源**：readStatus 经 06 实例闭包注入（services/index.ts L205），无双写。✓
- **主控预裁三项**：两通道挂 ai_sensor 域（api-surface ai_sensor 域内 zcodeDetect/zcodeInstall，通道名 zcode-link/*）✓；detect 基目录注入=构造参数（ZcodeLinkDeps.zcodeBaseDir，bootstrap 仅 SYNAPSE_ZCODE_HOME env→参数映射、头注环境钩子清单登记，与 SYNAPSE_USER_DATA 同型）✓；data-ticket 待收口移除（现保留=check-tickets 关卡 4 对 open 工单的硬要求，PaperDetailPanel 同型先例）✓。

## ③ 宪法红线终审

- **分层**：fs 全在 main（zcode-link.service，node:fs/promises）；renderer 仅经 `api.ai_sensor`（ZcodeLinkSection 零 Node/Electron import，import 面=react/api/client/Toast/@shared 类型）；ipc 薄分发两行。ipc→services→装配单向，无跨层。✓
- **受锁（121 manifest 一致）**：manifest grep 实数 **121** 条；verify.log L26 机器行「locks 检查通过：121 个受锁文件与 manifest 一致」。变更面=3 sha 更新（api-surface/schemas/e2e-env）+3 新增路径（zcode-link.spec/两单测）——diff 内 manifest hunk 逐条可见；报告 unlock→批内改→generate→apply 实录完整，[locked-change] 尾注要求已声明。✓
- **安全禁令**：无 nodeIntegration/webSecurity 类改动（未触碰窗口配置）；零新增出网 host（服务零网络面）；零 SQL/eval/new Function；FTS 不涉及；renderer 无路径传递。全过。✓
- **行数**：service 132≤500、组件 148≤250、两单测 321/228≤500、spec 65≤500（wc -l 实测）。✓
- **UTF-8/占位**：改动文件中文全程可读（本审读取实证）；TODO/FIXME/placeholder grep 改动面 9 文件零匹配（exit=1）；quality:check 机器过（verify L11「无占位标记/无乱码/无跨域引用」）。✓
- **TDD 四档证据链**：
  1. 红（ai10-red.log）：`exit=1`（L1464 机器行）；组件文件 `16 tests | 14 failed` 且失败为**断言级红**（`expected '' to be '未发现 zcode'` 等——非 import 红）；服务文件 Failed Suite（import 级红，实现不存在）。L1458-1459 `2 failed | 76 passed (78)` / `14 failed | 474 passed (488)`。
  2. 绿（ai10-green.log L1233-1234）：`79 passed (79)` / `520 passed (520)`，exit=0。
  3. 变异红证（ai10-mutation.log）：M1-M4+R1 五条全 `npm exit=1`+「还原 diff 空」逐条在档（cp 备份法，无 git checkout——宪法还原纪律遵守）；R1 证属回炉后测试（标题后缀交叉验证，见①W2）。
  4. verify 终局：exit=0 全链（quality→tickets→locks 121→lint→typecheck→test 79/520→build）。
- **范围**：git status 改动面=11 M+5 新增，与票面交付面一一对应；git diff --stat 实测 11 文件 222+/84-，报告口径「10 文件 221+/83-」=排除 docs/invariants.md（+1/-1 单行翻格）后精确自洽；dist_new/ 为 2026-08-23 前残留未触碰（自裁 6 属实）。✓

## ④ 机器面核对

- **79/520 数理**：77+2 文件/491+29 用例（组件 16+服务 13=29）→ 79/520 恰闭合；16/13 经 diff 全文逐用例清点实证（组件 16 it/服务 13 it）。绿数采自 vitest 原生机器行（带 ANSI 色码的 L1233-1234），非手写行——手写 echo「Tests 504」错数行已被报告更正注点名（以机器输出为准）。
- **红跑基线漂移解释（门二新核）**：red `76 passed (78)`/`Tests (488)` 与 green 79/520 的差=**annotation-anchor.test.ts（19 用例）在红绿两时点之间并入基线**（两日志 ✓ 文件清单 diff 实证：green 多出的 passed 文件恰=该文件+AI-10 两新文件；472+16=488、491-19=472、76+1=77 三式全闭合）。该并入属并行工单收口（如 AI-09 系）非本单行为；AI-10 自身红证对象（组件断言级红+服务 suite 红）在 red.log 实锤，无补录/造假迹象。
- **locks 118→121 推演**：+3=两单测+zcode-link.spec（manifest 新增条目逐一在档）；e2e-env.ts=既有条目 sha 更新（0621…→f471…）非新增——与主控预裁口径一致。✓
- **registry 翻 done 预演（check-tickets 逐关卡推演+AI-06 先例实证）**——收口单必办清单：
  1. `ZcodeLinkSection.tsx:97` data-ticket 移除（**关卡 4b 机器红**：done 工单文件不得残留自身 data-ticket）——票面既有约定；
  2. **`zcode-link.service.ts:2` 头注「[SR2-AI-10]」须改写（本门二预演新发现）**——关卡 2：src 内非登记文件（t.file=ZcodeLinkSection.tsx）引用 done 工单号=占位残留，翻 done 即 verify 红。先例对照：ai-sensor.service.ts:3 头注「[SR2-AI-06]」合法正因 SR2-AI-06 的登记 file 即该文件自身。建议改「AI-10」简称（本 diff 内 ipc/装配/SettingsPage 注释均用「AI-10」简称，唯 service 头注带全号）；
  3. 组件头注 L4「工单：open / strong」字样随翻 done 同步更新（文书自洽项，非机器关卡；头注工单号在登记文件自身=关卡 2 豁免可留）；
  4. tests 三文件头注工单号引用：tests 规则宽松（仅占位调用受限），翻 done 后合法 ✓；docs/invariants.md 的「SR2-AI-10」=锚定记录惯例格式（INV-17/18 同型）且 docs 不在扫描面，保留合法 ✓。
- **e2e 面申明**：ai10-e2e.log 机器行 `16 passed (2.3m)`，第 16 位=zcode-link.spec 新用例；新用例含真实文本断言（toHaveText 精确中文×3+toast 正则）+INV-21 纯 fs 断言（4 文件存在+逐字节一致）——满足「e2e 必须断言渲染出真实文本」纪律。基线 15→16 ✓。

## ⑤ 成本账本行（门二终审自身，自估）

约 25 分钟；输入约 4.2 万 token（diff 1282 行+五日志关键段+门一/报告/ADR/invariants/check-tickets/registry 全文及四次核对命令回显），输出约 0.7 万 token（本文件+核对命令）；单会话无派发，模型 builtin:bigmodel-coding-plan/GLM-5.3。

---

## 总评

**PASS（0B/0W/1N）**。实现面与证据链终审全绿：五态状态机/INV-21 零 spawn/零路径展示/分层/受锁流程/安全禁令/行数/UTF-8 全达标；TDD 四档（断言级红→绿 79/520→M1-M4+R1 变异红证全 exit=1 且还原 diff 空→verify 全链真退出码 0）经机器输出行亲自复核成立。回炉两 W（数字更正/占位恒绿补前置断言+R1 红证）终态实物全部对账，N5 已修。红跑基线漂移（annotation-anchor 19 用例并行并入）经文件清单 diff 数学闭合，非造假面。唯一新增 N=收口清单提醒（zcode-link.service.ts 头注全工单号在翻 done 时触发关卡 2 红灯，须与 data-ticket 移除同批处理）——open 期间完全合法，非本单缺陷。**建议主控收口单按④预演清单四项执行后翻 registry。**
