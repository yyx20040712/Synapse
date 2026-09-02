[routing]: run=20260902015908-buco source=kimi-main model=kimi-k3 switches=0 usage=in=0,out=9117 latency=1173205ms (by ds-call.mjs 链)

# 门一审简报——F-R3 排查票（AUDIT-C C-1）

审查对象：`scripts/audits/f-r3-investigation.md` 全文 + 随票证据 A~D。重点四问逐项核对如下。

---

## B（结论性错误）

**B1｜修法候选 a/b 不触及报告自定的根因，排序首推的机理不成立**

- 报告 §5.1 自证根因：「缺陷在库的 worker 泵错误终接——`ensureNotTerminated` 抛出的 Error 成为 worker 世界 unhandled rejection，**无终接 catch**」。
- 但 §5.2 首推 a（共享 workerPort）的理由是「destroy 只销毁 transport 不杀线程」——**杀不杀线程与噪声逃逸无关**。证据 C occurrence 4 显示 Terminate 处理器（`a=!0` → `i.terminate` → 泵 continuation 走 occurrence 1/2/3 的 `ensureNotTerminated` throw）挂在 WorkerMessageHandler 文档级作用域，与 `worker.terminate()` 杀线程是两个独立动作。只要 destroy 落在加载窗口内，Terminate 消息照发、`a` 照置位、泵 continuation 照抛、库内照旧无 catch——**workerPort 下 pageerror 噪声预期仍在**。
- b（destroy 序列化）同理：await 旧 destroy 并不能给库内泵链补 catch，destroy-during-load 窗口依旧存在（用户中途换文档是触发前提，序列化不改变 destroy 落在窗口内这一事实）。
- 后果：§5.3 INV 增补草案以「修复后探针断言连开+加载中关 tab **零 pageerror**」为强制方式——若二波按 a/b 落地，该断言**修不过**，锚会变成空转。真正对因的只有 d（指纹定向吞）和 e（上游修复查证+补丁）。
- 不确定声明：我对 pdfjs 4.10.38 workerPort 模式下 Terminate 消息是否照发未逐行核验（随票未附 pdf.mjs:12526-12556 destroy 全文）；但证据 C 的 worker 侧语境支持上述读法，且报告自己把根因定在「库内无终接 catch」，a/b 的排序论证必须补上「为何能消除 worker 世界 unhandled rejection」的机理链，否则首推不成立。

## W（应修订）

**W1｜§2 与 §3.2/§5.1 对到达通道的描述自相矛盾**

- §2 原文：「错误以**主世界未捕获异常形态**到达 pageerror 通道而非 promise rejection 通道」。
- §3.2 B 表与 §5.1 原文：「**worker 世界 unhandled rejection**，经 CDP worker auto-attach 汇入 pageerror」。
- 两句话不可能同真。从 §3.2 的完整论证看 §2 那句是措辞错误，但它恰好落在重点四问之 1 的归因链核心句上，必须修正为 worker 形态口径。

**W2｜「stack 首行恒为 ensureNotTerminated（pdf.worker.min…:21:1365306）」无随票证据支撑**

- 证据 D 四轮 raw 全文只有 message（`Error: Worker was terminated`），**无任何 stack 行**。
- 该 stack 是区分「worker 资产抛出」与「主世界 pdf.mjs 某守卫遗漏处同步抛出」的唯一判别证据——P-worker 实锤与 P4/P5「主世界出口全有守卫」的闭环都压在它上面。报告指向 `f-r3-probe.json` 留存，但随票材料无法复核。要求：补 probe.json 中至少一条完整 stack 摘录入报告附录，否则「指纹同值、非环境噪声」一句降级为待证。

**W3｜「加载中关 tab=最锐触发器」与自身数据不符**

- 按次错误率：S1 快速连开 = 3 错/24 开（r1 1/6 + r2 1/9 + r3 1/9）≈ **12.5%**；S2② 开关循环 = 3 错/57 循环 ≈ **5.3%**。按次率 S1 反而更锐。
- 「首循环即中」仅 r4 一轮 n=3 的样本（证据 D r4 raw：`cycles:3, pageErrors:1`）。
- §1/§2 触发画像应改为按次率口径，或显式标注 r4 样本量不足。顺带：S2② 每循环都保证 destroy 落在加载窗口内却只有 5.3% 命中，说明「destroy 在窗口内」非充分条件，窗口内相位才是变量——这点报告未讨论，建议补一句。

**W4｜「四轮 111 次开/关/切」计数与 raw 对不上**

- 按证据 D 累计：S0 4 + S1 6+9+9+1=25 + S2① 18+54=72 + S2② 54+3=57 + S3 4 = **162 次**。
- 111 的口径无从还原。该数字是 §3.2 P1 行「零 `_reader.read` 形态命中」强度的基数，基数不明则零命中的证明力不明。需说明口径或修正。

## N（建议）

**N1｜「unhandledrejection=0」的区分力被高估。** 注入监听在主世界，worker 世界 rejection 本就不会触发它；该事实只能排除「主世界 rejection 路径」，不能区分「worker rejection」与「主世界同步未捕获异常」。§3.2「三项仪表事实全对上」措辞建议改「两项排除性+一项指向性（stack 待 W2 补证）」。

**N2｜P1「dev（React.StrictMode）系统性可达」前提未证。** 随票无 StrictMode 装配证据，我不确定本应用 dev 是否启用 StrictMode；若不启用，「dev 系统性可达」降级为理论可达。另：§6 已备案 2026-08-31 原始观察「环境未定」，建议显式写出条件分支——**若该观察发生于 prod，则 P1 prod 静态闭合即被证伪**，当前的「双备案」处置隐含地回避了这一点。

**N3｜「单次切换不触发」宜改「未观察到」。** 依据仅 R4 S1 n=1 零错误（证据 D r4 raw：`n:1, pageErrors:0`），单样本不支持否定式结论。

**N4｜P6 定级二波基本恰当**（仅失败路径触发、泄漏速率未实测已备案 §6），但修法 c（保留 task 句柄+失败路径 destroy）体量极小且与 a 联动，建议修票时评估是否提波；头注状态机表证伪格「登记归二波、本票只注册」的处置妥当。

## 四问总答

1. **P-worker 归因链**：机制读法（worker 世界 unhandled rejection → CDP auto-attach → pageerror）与证据 C 的 minified 语境自洽，无更优解释浮出水面；但**内部表述矛盾（W1）+ 关键 stack 证据缺随票留存（W2）**，链的最后一环待补。
2. **P1 prod 闭合**：React 提交时序论证 + 四轮零命中方向可信，但命中基数（W4）与 StrictMode 前提（N2）有缺口；原始指纹「同族归档+双备案」处置可接受，条件是补 N2 的条件分支声明。
3. **误伤核对**：可靠。INV-30 三点位、INV-16 白名单四文件与证据 A 实读一致；CorpusExtractor R2 裁决不动摇与头注证伪格的分离处置干净。无异议。
4. **修法排序**：**不正确**（B1）——a/b 与报告自证根因脱节，首推论证缺机理链；P6 定级恰当（N4）。

## 总裁决

**修订后采纳**。

排查本体（P-worker 实锤、P1~P5 三态、P6 登记）结论方向成立、双路证据架构符合 F-L3 范式，不返工。但放行前必须完成：W1 矛盾句修正、W2 stack 证据补录（或降级声明）、W3/W4 数据口径修正、B1 修法候选重排或补机理论证（此项直接关系二波修票不走空）。B1 若二波开工前未修订，workerPort 落地后「零 pageerror」INV 断言会原地爆炸——这是本简报最重的一条。