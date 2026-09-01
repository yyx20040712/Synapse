# P7A 工单票面——e2e P7-A 剪贴板竞态 flake 专项（五层规约）

> registry: `P7A` / file `tests/e2e/reader-text.spec.ts` / area e2e / strong
> 依据：v18 §2 U2 + 台账 F-G10（492 行）+ 六场六现记录（F-A3/L2/L4/R1+v17 两现）。

## ① 现象与根因
`reader-text.spec.ts:550-567` P7-A test：`selectText → press('Control+c') → app.evaluate(({clipboard})=>clipboard.readText())` 断言 `toContain(PDF_KNOWN_TEXT)`。假红机制：读回的是**真实系统剪贴板**——e2e 运行期用户/系统其他进程占用剪贴板时，读到外部文本（写入链未落盘或写入后被覆盖）→ 断言红但非产品缺陷。六场六现已达专项立案线。

## ② 修复方案（主控裁决=清场标记+条件重读，否决 mock 注入隔离——保留「真实系统剪贴板」集成语义，注释 :560 明示该语义是本测试价值）
1. ctrl+c **之前**：`await app.evaluate(({ clipboard }) => clipboard.writeText('__p7a_cleared__'))`——清场标记（外部内容即被覆盖）。
2. 读回改**条件重读循环**：最多 5 次 × 200ms 间隔读 `clipboard.readText()`——值含 `PDF_KNOWN_TEXT` 即断言过；值为 `'__p7a_cleared__'` 或空串=写入未落盘，继续轮询；轮询超时=真红。
3. 诊断语义保留：超时失败信息里带末次读值（标记值→写入链断；其他值→外部再改写）——失败可归因。

## ③ 主控裁决
- 不引入任何 wait/hard sleep（轮询即条件等待）；不触碰该 spec 其他 test；`skipIfPending(P7A_DEPS)` 零变。
- 断言锚不放宽：最终仍必须 `toContain(PDF_KNOWN_TEXT)`（重读是时序容忍不是断言弱化——门审攻击点预答）。

## ④ 测试规约
- 本票改动即测试本身（受锁 e2e spec）——头注 `[locked-change]` 一行+受锁改向先红纪律：**对 HEAD 先红实证**（用「故意断言外部文本」不可行——正确先红形态=变异法：临时把重读循环去掉+读回改 `writeText` 清场后立即读，断言在剪贴板被外部占用模拟下红）——实操按受锁改向三步先例（F-A4/F-N1）：对 HEAD 旧断言形态做「外部占用注入」红证（e2e 内 evaluate writeText 外部文本模拟用户占用→旧实现读到外部文本≠期望→红）证明旧形态真脆弱，再上新实现绿。
- e2e 全量跑（29 条）+**连跑 3 次首跑即绿**（六场六现基线的稳定性判据，3 次全量）。
- 全量 verify 铁律（playwright 不查类型，tsc 拦类型缺陷）。

## ⑤ 验收与申报
- registry 翻 done 归主控；报告落 `scripts/audits/p7a-impl.report.md`（含 3 次 e2e 运行原始输出落盘 `.raw.txt`）；自裁申报一切超票面决定；基线=verify 126 文件 1081 用例/locks 228。
