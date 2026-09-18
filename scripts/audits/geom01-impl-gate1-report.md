# 门一审查报告：F-GEOM-01 实施票立案批（G1~G11）——relay batch 12

> 归档说明：ops-gate1-k2（zipoo 备源 k3 max 档）产出，主控逐字归档
> （岗无写通道）。派发实录：ops-gate1-k1 主源连续两次 Provider
> authentication failed → 换源状态机切 k2 承载（batch 7 先例）；
> log-triage --health 窗口推荐 k1（派发器链无 k1 绑定通道失效信号——
> 绑定子代理不经派发器，结构性盲区如实记）。

审查员：ops-gate1-k2（zipoo 备源 k3 max 档，按换源状态机承载）。审计方式=隔离一审：审包全文+仓库交叉核对（仅 Read）。

## A 事实核对（全项亲核，证据随行）

1. **registry 实况与审包逐字一致**：`E:\class\智慧水务\Synapse_remake\tickets\registry.ts:288-298` 的 G1~G11 条目与审包 §2.1 内联全文逐字相同；母票注记（registry.ts:280）与审包 §2.1 改动后形态逐字相同，母票 status 仍 `open`，其余母票文字未见改动迹象。
2. **骨架两件与审包 §2.2 逐字一致**：`src/renderer/features/reader/geometry-types.ts`（21 行，头注+`export {}`）与 `docs/reports/2026-09-18_f-geom01-campaign-closeout.md`（23 行）均与审包内联件一致；无 TODO/FIXME/placeholder，中文无乱码；五层规约要素齐（票号/目标/红线/裁决与排程序/验收）。
3. **切分与设计书一致性**（对照 `docs\design\2026-09-18_f-geom01-unification-and-reader-subdomains.md`）：
   - 文件清单：G4=state 10 件与 §3.2 state/（10）逐名一致（含 CorpusExtractor 终裁补列件）；G5=time 4 ✓；G6=anchors 13+geometry-types ✓；G7=interact 7 ✓；G8=panels 8 ✓；G9=M6a 14 ✓；G10=M6b 13 ✓。**M6b 补全 PageColumnView 正确**：§3.2 view 27 名单含 PageColumnView(73)（F-SPLIT-01 拆出件）且不在 M6a 14 名单内，27=14+13 算术闭合，G10 括注声明的对账逻辑成立。
   - 尾注：与 §5.3 表逐行一致（G1 无、G2 `[locked-change][test-refactor]`、G3 `[locked-change]`（INV 册受锁——`scripts\get-protected-files.ps1:16` 确认 `docs/invariants.md` 在受锁集合，条件成真）、G4~G10 双尾注、G11 `[locked-change]`）。
   - 技术内容：G1 切环三处+两 store 边+COLUMN_GAP 改向与 §3.3 一致；G2 保存门/probeOffsetLen/rectsFromRange 与 §2.4/§3.5 一致；G3 三档绑定与 §2.5 逐档一致；G11 五义务与 §3.5/§5.1/§5.4 一致；e2e 43/45 口径链自洽（W2 拆分 42/44→F-SESS-01  corpus-export 新用例→43/45，registry.ts:303、276、278 旁证）。
   - INV 号段：现尾号 67 有多重旁证（INV-63/64=W4、65=F-SESS-01、66/67=F-DEDUP-01），G3「接续现尾号 67」成立。
4. **check-tickets 规则推演**（`scripts\check-tickets.mjs`）：`F-GEOM-01-G1…G11` 匹配 ID_WHITELIST（:92，`F`+三段 `-[A-Z0-9]+`）；行级解析正则（:31）命中各条目；11 条 summary 与块注释内无 `id: '`/`status: 'open|done'` 干扰字面量，对账哨兵（:52-60）安全；无重复 id；file 空串校验过；规则 2/3/4/4b/5/6 对本批形态（F 系、open、非 tests 面）均不触发或合法。
5. **零锁面申报成立**：受锁集合（get-protected-files.ps1:11-25）=tests/**、src/shared/**、migrations、*.test.*、invariants.md、各配置、scripts/*.mjs|ps1——`tickets/registry.ts`、`src/renderer/features/reader/geometry-types.ts`、`docs/reports/*.md` 均不在内，本批零 [locked-change] 义务、零 locks 操作的自裁正确。
6. **机检证据亲核**（`scripts\audits\geom01-impl-verify.raw.txt`）：tickets 206/open 20（:76-77）✓；test-surface 183/1757/5334 base vs 187/1790/5417 cur 且 NEW 项全属 F-SESS-01/F-AIN-01/F-DEDUP-01 系既有纯增（:27-67）✓；locks 338 一致（:86）✓；test 170 文件/1745 用例全绿（:4027-4028）✓；build 绿（:4067）✓；`GEOM01_FILING_VERIFY_EXIT=0` 物理在 raw 尾（:4068）✓。lint/typecheck 段（:92-101）后续链条完整出现=&& 串联反证两关过。与 F-DEDUP-01 收口基线（registry.ts:279「170 文件/1745 用例」）零漂移 ✓。

## B 攻击发现

**W1 —— 迁移票票面缺「既有票 file 字段批量随迁改写」义务声明（规约真空，40+ 票次波及）**
证据：check-tickets 规则 1 对**全票无差别**要求 file 存在（check-tickets.mjs:106-110）。G4~G10 目录化迁移一生效，所有 file 指向被迁路径的既有票即硬红——可枚举实例如 SR-RDR-01（annotation-anchor.ts，registry.ts:101，G6 波及）、SR-RDR-04~09（:106-111，G4/G7/G8/G9/G10 波及）、SR2-TABS-01/03、SR2-UNDO-01、SR2-AI-02、SR2-C-03/04/05、SR2-F-01/02/03/05/06/07/08/09、F-A6/A7/A8/A9/A10/A11/A12、F-SNAP-01、F-R2/R3、P7X-02 等，粗数 40+ 票次；**含本批自身**：G1 file=geometry-types.ts（registry.ts:288）将被 G6 迁走、G2 file=selection-evaluate.ts（:289）将被 G7 迁走、母票 file=pdf-item-geometry.ts（:280）将被 G6 迁走，而 G1/G2 票面与 G11 的母票翻 done 义务均未声明自身 file 随迁。票面机制只写了「迁移票（G4~G10）翻 done 时 file 字段随迁移改写」（块注释，registry.ts:285-286），援引的 SR-RDR-02 先例（:102）原文语义是**单票改名随迁**（「注册文件随直系继承者迁移」），不覆盖目录化迁移对**他票** file 的全域波及——先例类比不完整。关卡硬红兜底使此缺陷不会静默失败（G4 verify 的 tickets:check 必红），故不定 B；但票面规约真空会在 G4 实施时迫使实现者做票面外批量 registry 改写（超票面申报或一轮回炉）。建议处置：立案批收口前在块注释补一句全域随迁义务，或由主控在 G4 开工前补票面。

**W2 —— 「锚定回归网 17 件」计数口径含糊，随 G6 票面继承**
证据：设计书 §5.1（设计书 :330-335 区域）与 §3.4 M3 行（:269）称「unit 17 件」，枚举名单为 17 个名字但其中含「selection-layer×2」——若 ×2 展开为两个物理测试文件，则总件数=18≠17。G6 票面照抄「锚定回归网 17 件 import」（registry.ts:293）作为受锁面规模声明。**不确定**：×2 的真实语义（两文件 vs 一文件双 describe 块）无法从本包材料裁决（tests 目录不在授权核对清单）。宪法明文「计数类数字落笔前经脚本实测，禁凭印象」（有 2026-09-02 拼包计数失实前科），建议 G6 开工时 grep 实测锚定回归网件数并在实现者报告对账，票面数字以实测核销。

**N1 —— relay.md 落板时态措辞张力**
审包 §4.2 称 11 子项「**将以**顶层 `- [ ]` 行追加」（未来时），§5 末条括注「收口时落板」，而 §4.5 称「本批进展以 11 子项**上板**+registry +11 为证」（字面完成时）。审包 §1 审计对象全量未列 relay.md diff，relay.md 现状不在授权核对清单内——**不确定**板上是否已有子项行。母票注记「板行=docs/handoff/relay.md 第四波子项逐票勾选」（registry.ts:280）读作排程机制声明而非现状断言，可接受；§4.5「上板」措辞建议主控澄清为「上板方案已定义」。落板时须核对子项 id 与 registry 一一对应（无机检覆盖此面）。

**N2 —— G1 变异红证有效性依赖 tsc 覆盖 tests 域的未明示前提**
G1 红证设计=「删 PdfPageCanvas 再导出→旧路径 import 编译红」（registry.ts:288）。该红证的机制是 ai-annotation-layer.test:25 等受锁测试 `import type` 自旧路径（设计书 §3.3/§1.6）；但 vitest/esbuild 转译会擦除 type-only import，运行时**不红**，红证唯一生效通道=tsc 关卡覆盖 tests 目录。间接证据支持覆盖成立（AGENTS.md「受锁 e2e spec 改动后必须全量 verify……tsc 关卡才能拦住类型注解缺陷」条款意味着 tests/ 在 tsconfig include 内），但票面未明示；**不确定** tsconfig.web.json/tsconfig.node.json 的 include 面（不在授权核对清单）。若 G1 实施时变异不红，应升级红证设计（如改删类型本体）而非放行。

**N3 —— 上游设计书表层瑕疵两则（非本批审计对象，随记备查）**
①设计书 :273 M6b 行受锁面细胞括号未闭合（「eslint 块（PdfDocProvider/CorpusExtractor 已随 M1 更新——四路径分步随迁」缺右括号）；registry G4/G10 继承其「四路径分步随迁」概念且语义自洽闭合（G4 首步两路径+G9 第 3/4 步两路径=eslint.config.js:89-92 四路径），无误导。②设计书 §2.4 末「INV 落点：INV-58 修订（保存链条款）+新 INV（§5.4）」在 G2 语境提及新 INV，而 §5.3 表将新 INV 落册归 G3；registry 切分按 §5.3（G2=INV-58 修订、G3=INV-68 新增）正确，设计书内部措辞张力不影响本批。

**主控自裁申报逐条拷问结论**：①锚选择（新骨架载体/代表存量件+翻 done 随迁）有 F-LAYER-01/F-TIME-01/SR-RDR-02 先例支撑，但随迁机制覆盖面不足见 W1；②板面形态见 N1；③零锁面亲核成立；④e2e 未跑合理（零 src 行为变更，geometry-types.ts 为无人 import 的空模块，不进 bundle，batch 1 同口径先例）；⑤no_progress+1 按规则字面申报且留痕，合规。

**强制审项适配说明**：本批=纯立案面（registry/骨架），无事件消费实现、无 CSS 皮肤变更——事件时间线逐帧推演与特异性推演两强制审项不适用，归 G2 等实施票门审。

## C 结论

立案批本体的全部机检面（registry 合法性、骨架在位、verify 全链、零锁面、与设计书 §5.3 切分一致性）经亲核全过，无 Blocker。两条 Warning：W1（迁移票票面缺全域 file 随迁义务，40+ 票次波及，关卡硬兜底非静默，处置窗口=G4 开工前）、W2（锚定回归网 17 件计数口径待实测核销）。三条 Note 记录。建议主控按三分法处置 W1/W2 后本批可收口。

统计：B=0，W=2，N=3。

MODEL-SELF: model-field:5e1abd9d-1f4f-41fb-afa1-ecb5ce76e256/k3$max
FINDINGS: B=0 W=2 N=3 VERDICT=PASS_WITH_WARNINGS
