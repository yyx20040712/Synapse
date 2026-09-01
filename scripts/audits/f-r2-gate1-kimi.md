[routing]: run=20260901182642-mlkn source=kimi-backup model=kimi-k3 switches=1 usage=in=0,out=11206 latency=231563ms (by ds-call.mjs 链)

# F-R2 门一审查报告

审计范围：本包自包含材料（票面/实现报告/全 diff/证据段/主控预裁）。逐项独立复算如下。

---

## B 级（阻断）——无

未发现实现与票面②③的实质性偏离。核心数学逐项复算通过：

- **B-1 折算式**：`scroll-converge.ts:57-60` start 分支 `scrollTop + (elRect.top − scRect.top)/z`、center 分支 `(elRect.top + elRect.height/2 − scRect.top)/z − clientHeight/2`——视觉项全除 z、clientHeight/clamp 保持本地，与票面②B-1 逐字一致；clamp 行（:62 注释所指）diff 中未动 ✓。
- **effectiveZoom**（:40-42）：`clientHeight > 0 ? gBCR.height/clientHeight : 1`，③-1 裁定式+除零 guard 精确命中。
- **B-2**：`scroll-progress.ts:280-283` `top=(r.top−base.top)/z+el.scrollTop, height=r.height/z`，z 经 import 单源（:49）非两处各写 ✓；装配侧旧内联式删除=方案切换纪律 ✓。
- **新用例复算**：start 30+(600−100)/1.25=430 ✓；center (1460+150−110)/1.5−200=800 ✓；clamp (2500−100)/1.25=1920→夹 1600 ✓；measurePageBoxes 三盒 (−137.5)/1.25+110=0、112.5/1.25+110=200 ✓。M2/M3 红因推演（z=1 时 −27.5/125；height=125 时中心 62.5 vs 262.5 距 160 为 97.5<102.5 判页 1）与报告数字自洽 ✓。
- **逃逸面真闭合**：新桩显式区分双空间（gBCR=本地×z / clientHeight=本地），z 由桩推出非硬编码 ✓。

## W 级（需处置/确认）

**W1 — e2e 回归护栏未跑且无证据**。票面④明文：「reader-scroll.spec 默认 profile uiScale=1……**跑全量确认零必然红**」。实现报告 §5 自认「e2e：零触碰；未单独跑（verify 链被 locks 中间态截断，e2e 本就不在 verify 内）」，证据段④的终验（f-r2-verify3.raw.txt，exit=0）亦不含 e2e 面。缓解因素：⑤e 给出 z=1 恒等的数学保证、真机探针复验（−512.6→−0.6）提供更强行为证据，残留风险低。**不确定点**：主控收口侧是否已补跑 e2e——包内无证据，需主控确认或补跑后销项。

## N 级（记录/次要）

**N1 — guard 分支零覆盖（测试盲区）**。`scroll-converge.ts:41` 的 `clientHeight=0→返 1` 分支无任何用例锚定：全部新旧用例 clientHeight 桩均 >0（既有 400/300、新 400、progress 100）。「删 guard」变异不会产生红。票面⑤e 称该退化「可测」但④未强制，属清单外盲区，建议登记后续单。

**N2 — z=0/异常值路径无防护**。`effectiveZoom` 仅 guard 分母；若桩/病态 DOM 下 gBCR.height=0 而 clientHeight>0，z=0 → 除法得 Infinity → `Math.min(Math.max(Infinity,0),max)` 静默夹到底部=错误落点无告警。真机不可达（zoom∈[0.5,3] 时两高同号，⑤e 已推演），仅桩面风险。记录即可。

**N3 — nearestPage 导入路径与实现不同源（不确定）**。实现 `scroll-progress.ts:49` `from './PageColumn'`；测试 diff 新行 `from '../../../src/renderer/features/reader/page-column-geometry'`。若 PageColumn 系 re-export 则同一函数（包外不可证，**不确定**）；若非同一源，新判页用例锚定的并非生产消费路径。请主控一句话核实。

**N4 — 首红为事后重建**。报告 §3/自裁5 自认首红=「`git show HEAD:` 旧实现+终版测试」重现，非首跑原始输出。已申报、还原 diff 空、纪律（禁 git checkout）字面未违，但「先红」证据链强度弱于原生首跑。记录。

**N5 — 高度口径与 fitWidth 宽度口径不同型（已申报疑虑，成立）**。`effectiveZoom` 用 `gBCR.height/clientHeight`——gBCR 含 border、clientHeight 不含 border 与水平滚动条；若容器有 border/横滚动条，z≠精确 Z。对照先例 `ReaderPage.tsx:149` 宽度侧用 offsetWidth（含滚动条）。真机阅读区容器无 border 且探针复验 |偏移|=0.6px 实证闭合，非阻断；建议在 INV-34 附注（主控收口动作）中携带此口径前提。

**N6 — 票面⑤e 前提失实，实现者补桩处理正当**。票面承诺「jsdom 桩同空间时 z=1 恒等=既有用例零破坏」，但既有桩实为 `stubRect(inner,100)`（height=10）vs clientHeight=400 → z=0.025，**不同空间**，不补桩则折算实现必崩既有断言（480→夹 1600）。实现者改 `stubRect(inner,100,400)` 等 4 处（diff :87/:101/:112/:133）使 z=1、断言值 480/640/0/1600/320 一字未动——是修复票面自身瑕疵而非放宽语义，自裁 1 定性「补桩≠放宽」经独立复核**成立**。

## 预裁项复核

- 预裁 5（五项自裁）：自裁 1 见 N6 成立；自裁 3（z=1.5 代 1.1）IEEE754 理由成立且票面「**或** z 由桩推出者至少 2 例」为选言分支，1.25+1.5 满足 ✓；自裁 4（scrollTop=110 避平手）复算成立——center=150 时折算空间 |150−50|=|150−250| 恰平手，110 必要性实证 ✓；自裁 2/5 见上文，均诚实申报。
- 预裁 2/3（B-3 不修、next 旁支同根归位）：diff 确认 PageColumn.tsx 零触碰 ✓；探针复验数值（dSt=1628.8×1.25≈2036、next 542.08×1.25≈677.6）内部自洽，包内无更强推翻依据。
- 报告一致性：用例数 35=6+29（首红）=9+26（分文件）、1074+7=1081（终验）、locks 226+2=228、M1-M4 红数与断言推演全部自洽；registry 逗号在 diff 终态已补（:229 `' },`），与证据段 exit=0 时间线一致 ✓。

## 统计与总评

**B: 0 / W: 1 / N: 6**

**总评：可收口**（附一条件）。实现与票面②③逐条符合，折算数学独立复算无误，变异红证链（M1/M2/M3/M4 红数与机制推演逐条自洽）真实支撑断言强度，五项自裁全部诚实且经复核正当，无宪法红线违例（受锁头注 marker 在场、断言锚未放宽、≤500 行、零新依赖、INV-34 语义原样、invariants.md 未越权触碰）。唯一待销项=W1：e2e 全量护栏（reader-scroll.spec，uiScale=1 回归面）在包内无执行证据——请主控确认收口侧已跑或补跑；以 ⑤e 数学保证+真机探针复验的强度，此项不构成回炉理由。N1/N3 建议携入后续单（guard 分支锚定、nearestPage 同源核实）。