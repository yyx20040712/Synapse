[routing]: run=20260902022045-jgks source=deepseek model=deepseek-v4-flash switches=0 usage=in=10072,out=29238 latency=268705ms (by ds-call.mjs 链)

# 门二终审简报——F-R3 排查票（AUDIT-C C-1）v2 版

## 〇、亲跑矩阵核验结论（先行）

四轮 raw 与 v2 报告的**逐场景计数、错误率、健康面完全一致**，无一处对不上：

| 项 | raw 事实 | v2 报告 | 一致性 |
| --- | --- | --- | --- |
| S0 | 4/4 轮 `rendered:true, pageErrors:0` | 「4/4 轮 S0 全绿」 | ✅ |
| S1 | r1 1/6、r2 1/9、r3 1/9（open#1）、r4 0/1 | 「3 错/24 开=12.5%」「r4 0 错」 | ✅ 12.5% 算术正确 |
| S2① | r1 0/18、r2 0/54 | 「0 错/72 开」 | ✅ |
| S2② | r3 2/54、r4 1/3 | 「3 错/57 循环=5.3%」 | ✅ 5.26%→5.3% 四舍五入正确 |
| S3 | 4/4 轮 `rendered:true, spanCount:260, pageErrors:0` | 「4/4 轮健康」 | ✅ |
| 总计 | r1=1、r2=1、r3=3、r4=1 → 6 错 | §1 触发画像合计 3+3=6 | ✅ |
| closeFail | r3/r4 均 0 | 表内「closeFail=0」 | ✅ |

**但矩阵不足以支撑两个子结论**：①「单次切换（已加载→另一篇）未观察到触发」——r4 S1 n=1 无切换动作；②「S2① ready tab 间切换=destroy 已加载文档无流窗口」——「幂等激活」形态可能不含 destroy。详见 W1/W2。

---

## B（结论性错误）

### B1｜v2 §5.2 轨一 d「renderer 侧指纹吞并」与报告自身仪表层事实矛盾，不能作为「当前唯一确定对因的应用层手段」

**证据**：
- v2 §2 自证：「两项排除性」（主世界 unhandledrejection 监听=0、console error=0）+「一项指向性」（pageerror 带 worker 栈）→ 错误经 **CDP worker auto-attach 汇入 pageerror**，不经主世界 DOM 事件通道。
- v2 §3.2 同表 P-worker 行：「M1 推断『真 worker 下不达 renderer pageerror，仅 worker console』推错在仪表层」——即该错误的可达通道是调试器/仪表层，不是 renderer 的 window error/unhandledrejection。
- v2 §5.2 轨一 d：「**renderer 侧**按『消息=Worker was terminated+stack 源=pdf.worker 资产』加密级指纹匹配，吞并+计数上报」。

**矛盾**：若错误不经过 renderer 的 DOM 事件（unhandledrejection=0 已排除主世界 rejection），则 renderer 侧没有任何事件接收器能收到它——「renderer 侧吞并」没有可挂的接收点。Electron renderer 无 DOM API 可监听 worker 世界 unhandledrejection（worker 是独立 realm）；`window.onerror` 也覆盖不到。可行的落点只能是**主进程 webContents 的 console-message / page-error 事件**层，但 v2 未论证该层与「renderer 侧」的关系。INV 增补草案（§5.3）「零未处置 pageerror（经 d 过滤）」同样悬空——过滤器宿主未定，断言无锚。

**严重性**：d 被 v2 标为「当前唯一确定对因的应用层手段」，若落点不可行，轨一只剩 e（待查证状态），二波修票主推路径直接卡壳。

**不确定声明**：我未穷尽 Electron renderer 侧全部 API（如 preload 经 ipcRenderer 由主进程转发这类间接方案），但 v2 原文未提供任何 renderer 接收机制——「唯一确定」的断言在现有证据下不成立。

---

## W（应修订）

### W1｜r4 S1 n=1 被当作「单次切换（已加载→另一篇）」的证据，但 n=1 无切换动作，该形态四轮从未直接测试

**证据**：
- r4 raw：`S1 快速连开 {"n":1,"elapsedMs":156,"pageErrors":0}`——n=1 只有一次打开，没有「打开第二篇」这一切换动作；S1 场景定义是「快速连开 N 篇」，n=1 时不存在 A→B 卸载。
- v2 §1：「**单次切换（已加载→另一篇）未观察到触发**（r4 S1 n=1 隔离实验——单样本，弱证据）」——用 n=1 的 S1 支撑「切换」结论，是数据形态错位。r4 S1 实际测的是「单开且不等加载完即结束（无第二个文档）」，它连「已加载 A」这个前置条件都不满足，遑论「A→B 切换」。

**影响**：这是用户最常规路径（老老实实看完一篇再开下一篇），其触发画像完全空白——不是「未观察到」，而是「未测试」。

### W2｜S2①「0 错/72 开」对「destroy 已加载文档无流窗口」的支撑依赖探针实现形态，当前证据不足

**证据**：
- v2 §2 表格 S2 ①：「同卡片重复开（tab 已 ready=**幂等激活**）」；v2 §1：「ready tab 间切换=0 错/72 开（**destroy 已加载文档**无流窗口）」。
- 语义跳跃：「幂等激活」如果只是激活既有 tab，则**没有卸载、没有 destroy**，0 错是平凡结果；用它证明「destroy 已加载文档无流窗口」逻辑不连贯。raw 只报 `opens:18/54` 计数，无 tab 创建/销毁明细，无法判定是否真有 destroy 形态。

**不确定声明**：我无探针源码，无法确认 S2① 每次 open 是否新建 tab 并关闭旧 tab。但即便是「开→关→开」循环，也与「已加载 A → 打开 B」的用户切换形态不同（后者是两文档并存时的卸载，不是同一文档的关闭重开）。

### W3｜「stack 首行恒为 ensureNotTerminated」的「恒」仍缺多轮证据——补遗仅含 r4 一轮 1 条

**证据**：
- 补遗 probe.json：meta.date=2026-09-02T01:45:22，与 r4 raw（01:45:23）吻合；pageErrors 仅 1 条（r4 S2 open1）。这是 r4 单轮留存。
- v2 §2：「stack 首行恒为…（f-r3-probe.json 留存）」——「恒为」需 r1/r2/r3 各自至少一条 firstLine 佐证，但未附。若探针输出单文件覆盖（f-r3-probe.json），r1~r3 的栈已不可追溯。
- 门一 W2 要求「补至少一条完整 stack」，v2 满足该字面要求；但「恒」的广义断言仍然超出证据。

**修复**：若 r1~r3 栈有留存则补入附录；否则改「r4 采样为」，并说明其余 5 个错误依赖 message 同质性（`Error: Worker was terminated` 全部一致）作为形态唯一依据。

### W4｜共享 workerPort（a 候选）在并行加载场景可能放大噪声而非仅「不治」——轨二 a 的风险评估缺失

**证据**：
- v2 §3.2 引证 C：Terminate 处理器 `a=!0` → `i.terminate` → 泵 continuation 经 `ensureNotTerminated` throw——**`a` 是 WorkerMessageHandler 级单变量**（证据 C 语境）。
- v2 §5.2 轨二 a：「共享 workerPort——消灭每篇 spawn/terminate 抖动…（destroy 仍发 Terminate，噪声不消失——B1 裁定）」——只断言「噪声不消失」，未评估「噪声可能变多」。

**机理风险**：若共享 worker 的终止标记是 worker 级全局（`a` 只有一份），则 A 文档 destroy 的 Terminate 置位后，同 worker 上 B 文档的在途加载泵同样会被 `ensureNotTerminated` 打断——即「快速连开 A→B」场景下，A 的切换会连坐中断 B 的加载。这会让 a 方案从「不治噪声」恶化为「放大噪声」。
**不确定声明**：pdfjs 共享 worker 是否按 taskId 隔离终止标记，需源码核验（pdf.mjs 未随票附全文）；若按 task 隔离，本条降级为 N。

---

## N（建议）

**N1｜「连开 12.5% > 开关循环 5.3%」的差异在样本量下无统计显著性。** 24 开 3 错 vs 57 循环 3 错，Fisher 精确检验双尾 p≈0.3，不显著。§1「按次率连开>开关循环」只应作描述，不宜作为「窗口内相位是真变量」的支撑——「相位是真变量」由「开关循环触发率 5.3% 而非 100%」直接成立，不依赖该对比。

**N2｜S0→S1 过渡是否等待 S0 的 destroy 完成未说明。** r3 S1 错误报 `#open1`——若 S0 结束关闭 tab 的 destroy 未落定即进入 S1，open#1 的错误可能含 S0 跨场景串扰。「open#1 时窗」归因需排除此串扰（探针在 S0/S1 边界是否 await destroy 或 sleep）。

**N3｜pdfjs 官方对 destroy-during-load 契约的明确表述未查证。** §5.1「应用层 task.destroy() 调用在 pdfjs API 契约内」建议补官方文档摘录或 R5 记录，否则「缺陷在库非应用不当」的定性缺契约锚。

**N4｜升级 pdfjs 5.x（e 路线）需重新评估 P1 TextLayer 泵形状变化。** §3.2 P1 行「上游 master 同形状」是当前版本结论；若升级 diff 改了 TextLayer 的 cancel/read 序，「同形状」需重新核验，否则升级可能引入新的 `_reader.read of null` 面。

**N5｜main.tsx:9 StrictMode 实证仅写「grep」未贴代码行。** 建议内联 `<React.StrictMode>` 包裹语句原文，形成可复核证据。

**N6｜「162 次开/关/切」的口径粒度不统一。** S2① 按 open 动作计数（72），S2② 按「循环」计数（57，含开+关）。若按统一动作粒度，应为 4+25+72+(57×2)+4=**219 次动作**。v2 已列明分项口径，透明可复核，但「162 次」与「开/关/切」的标题语义有偏差。

---

## 不确定项（明确列示）

1. **共享 workerPort 下 Terminate 消息是否照发**：门一已声明未逐行核验 pdf.mjs destroy 链；v2 将其作为断言写入轨二 a 括号注，建议二波前源码核验。
2. **探针 pageerror 通道的具体实现**：raw 命名 `pageerror@...`，但据 §3.2「CDP worker auto-attach」推测可能是 CDP Runtime.exceptionThrown 而非 Playwright/Electron 的 page error 事件；两者对「worker 异常是否计入」有本质区别，建议探针注释中明示。
3. **pdfjs 是否真「每 task 一个 worker 线程」且无进程级复用**：报告引 pdf.mjs:11409-11416，但随票未附该段源码；该事实同时是 P6 泄漏面与「每篇新 worker」论述的基数。
4. **「同族」归类边界**：原始 `_reader.read of null`（P1 TextLayer 泵）与本次 `Worker was terminated`（P-worker 加载泵）不同层、不同形态，「同族」按「pdfjs 取消泵竞态」归类是宽泛口径；§6 已做环境未定备案，不威胁结论，但 P1 若实发于 prod 仍存在第三子路径的可能，不可关闭。

---

## 总裁决：**条件 PASS**

**判定依据**：
- 门一「修订后采纳」的处置在 v2 中**大部分闭环**：W1/W3/W4/N1/N3/N4 已采纳到位；W2 以补录单条 stack 方式满足字面要求（但「恒为」过度断言——W3）；B1 以「重排」方式满足门一。
- 排查本体（P-worker 实锤、噪声非破坏型、触发画像按次率口径）方向成立，矩阵 raw 数字零出入。
- 但门一漏判两个新问题：**B1（renderer 侧吞并落点不可行）**、**W4（共享 worker 全局终止可能放大噪声）**，以及两个矩阵支撑不足（W1 单次切换未测、W2 S2①形态不明）。这些不推翻排查结论，但直接影响二波修票素材的可用性。

**放行条件（二波修票开工前必须满足）**：

1. **重设计 d 落点**：明确「指纹吞并」挂在哪一层（主进程 webContents console-message/page-error 过滤，或给出 renderer 侧可验证的接收机制）；落点实验（一轮主进程捕获探针）完成前，不得将 d 描述为「当前唯一确定对因的应用层手段」。
2. **补一轮「已加载 A→打开 B」单次切换测试**（R3_N=2、等待 A ready 后再开 B；若探针无该模式需加参数），否则删除「单次切换未观察到触发」结论，改「该形态未测试」。
3. **核验 S2① 探针实现**：若「幂等激活」无 destroy 形态，改写 §1/§2 相关归因（「destroy 已加载文档无流窗口」→「ready tab 激活无 destroy 形态」）；或补一轮「open→wait ready→close」循环直接验证。
4. **共享 worker 终止标记作用域源码核验**（pdf.mjs 共享 worker 路径），排除 W4 的「噪声放大」风险后再保留 a 入轨二。

以上条件满足前，v2 报告可归档，但**修票素材 §5 不得直接移交二波执行**。