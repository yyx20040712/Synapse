# 门一对抗审查报告：F-GEOM-01-G5 目录化 M2=time/ 域迁移

**verdict: PASS_WITH_WARNINGS**（二进制尾栏映射=PASS；3 条 Warning 均为收口侧条件项，实现面零 Blocking）

隔离墙声明：本报告仅基于审包内联全文（票面/迁移地图/证据链/自裁/diff 附录），未 Read 任何包外文件，未跑任何命令。包内不可裁决处已显式标「不确定」。

---

## 一、逐 hunk 零行为核验（拷问 1/2 回答）

全部 9 个文件面逐 hunk 过堂，**除路径字符串与 1 行注释外零语义变化**，确认零行为断言成立：

| 文件面 | 相似度 | 变化行 | 核验结果 |
| --- | --- | --- | --- |
| reading-time-outbox-store.ts | 100% rename | 0 | 纯移动，确认 |
| reading-time-outbox.ts | 100% rename | 0 | 纯移动，确认 |
| reading-time-setup.ts | 95% | 4 | 恰为申报的 :13/:14（`../../`→`../../../`）+:15/:16（`./state/`→`../state/`），深度数学逐行验算正确（time/ 下移一层，src/renderer/api/client 与 src/renderer/shared/ui/toast-store 解析不变；`../state/reader.store` 仍解析 reader/state/） |
| reading-time.ts | 99% | 1 | 恰为 :61 re-export 深度+1（`../../../shared/reading-time-format` 解析不变），确认 |
| ReaderPage.tsx:55/:56 | — | 2 | `./`→`./time/` 纯路径，确认 |
| main.tsx:4 | — | 1 | `./features/reader/`→`./features/reader/time/` 纯路径，确认 |
| shared/reading-time-format.ts:4 | — | 1 | 注释勘正，零行为（残留问题见 N1） |
| tests ×2（:9/:10/:15） | — | 3 | 纯 import 路径改写，断言/describe/用例零触碰，确认 |

域内同层 `./` 引用 4 处零改写与「4 件同迁」自洽（同迁则同层解析不变）；outbox/outbox-store 100% 相似 + typecheck 绿 → 两件无任何指向迁移集外的相对 import，否则必断。829 行总数与 303+139+300+87 算术吻合。

## 二、分级发现

### B（Blocking）：无

### W（Warning）

- **W1 — 审包时点 verify 全链未绿，验收「verify 全链」系收口条件而非已证事实。** 证据：简报 §三「tickets（已知红=registry 两行旧径，主控收口职责）」+ §四自裁 2「真实码 1 在 raw.log（registry 红所致）」。tickets 红属结构性鸡生蛋（registry file 随迁须与 G5 翻 done 同笔），接受主控预裁；但**放行硬条件=收口终跑 verify 全链真实 EXIT=0**，非零即不得提交。
- **W2 — 最终提交面将超出本审计 diff。** §五收口计划含 registry.ts 两行 + 7 份 .log（add -f），均不在附录 diff 内。属流程常态（留档三桶口径①+翻 done），但主控收口时须 `git diff --stat` 对照「本审计 diff + registry 2 行 + logs」白名单核验范围，防蔓延。
- **W3 — 退出码取证法缺陷的污染面大于单文件。** 自裁 2 的双 echo 消耗 `$?` 伪码问题：基线 verify EXIT=0 若同法取得则证据力同样存疑（包内无法裁决基线 log 是否同法，**不确定**）；真实码链赖 raw.log 与各关卡独立取证兜底。**收口终跑必须采用 `$ec=$?` 变量法留证**，否则「全链绿」终证不成立。

### N（Note）

- **N1 — 注释勘正不彻底，同行新旧路径并存。** diff `shared/reading-time-format.ts` hunk：line 4 改为「reader/time/reading-time.ts re-export」，但**同一行**残留「reader/reading-time 双 feature 消费」旧名——迁移后消费方模块名为 reader/time/reading-time，注释内部自相矛盾。零行为，建议收口顺手补正或挂起备案。
- **N2 — grep 空证类申报包内不可独立复核（不确定）。**「其余 reading-time 命中零 import」「state/ 域对 reading-time 反向边零（grep exit=1）」两条无 diff 内证据；但 typecheck+build+test 三关绿构成结构性兜底——漏改 import 必红。采信为工具关卡旁证。
- **N3 — 构建哈希三方恒等证据链成立但有覆盖面边界。** index-D3egZtl2.js（1,392.72 kB）+ index-BfpEygSE.css（52.49 kB）三方同名同尺寸，vite 内容哈希命名使同名=同内容，对 src 面零行为构成数学旁证；**但 tests 不入 bundle**，tests 面零行为由指纹门 187/1789/5411 零漂移 + 170 文件/1744 用例恒定旁证，两链互补无冲突。基线 build 在迁移前的时点口径成立（拷问 6）。
- **N4 — M1 复绿仅 typecheck 单关卡可接受。** 还原后 diff identical 已证复原，单关复绿足够；口径以本报告记为「typecheck 单关」，简报「typecheck/verify」二选一表述作废。
- **N5 — locks 自洽性确认。** 345 恒定 + manifest 仅 generatedAt+两 tests sha 更新，与「仅 2 个受锁 tests 内容变化」吻合；shared/reading-time-format.ts 非受锁面（src/renderer/shared/ ≠ src/shared/），locks:check 绿反向印证。e2e 两 spec 未触碰，diff 内无清单外文件（拷问 8，src 面确认；收口面见 W2）。

## 三、拷问清单逐项回答

1. 已逐 hunk 核，除路径/注释外零语义变化——成立（见 §一表）。
2. 是。95%=恰 4 行申报深度修正；99%=恰 1 行 re-export 深度；100%×2 零内容。行号与申报全对。
3. 是。3 行纯路径；345 恒定+两 sha 更新自洽（N5）。
4. 反向边空证包内不可复核（**不确定**），typecheck 绿兜底；time→state 唯一边=setup:15/:16 与 diff 一致，本票零新增域边确认。
5. 闭环成立。M1：main.tsx:4 回退→TS2307 EXIT=2→还原 diff 空→typecheck 复绿；M2：test:9 回退→vitest `Failed to load url` EXIT=1→还原→17/17 复绿+复锁。两段均为「改动承力」红证+还原同一性证明。
6. 成立（见 N3）。
7. 妥当，逐条裁决见 §四。
8. 审计 diff 内无；收口提交将扩面（W2）。

## 四、实现者自裁 4 条裁决

1. **open 17→16：准。** 简报起草时点滞后，非实现缺陷，且已如实记——符合「计数类数字落笔前实测」纪律的纠错形态。
2. **verify.log 伪 EXIT=0：准，附加条件。** 申报+勘误+改变量法处置妥当；但污染面溯及基线 log 的可能性包内不可排除（W3），收口终跑强制变量法取证为本票放行条件。
3. **M2 额外 unlock→apply 轮：准。** 受锁件写权限必需，先例同型；还原 diff identical+复锁绿，闭环合规。
4. **M1 复绿=typecheck 单关：准。** 以 N4 口径入档。

## 五、总评

实现面：diff 与迁移地图逐行对账零偏差，深度数学全对，受锁面处理（unlock→改→generate+apply、345 恒定）合规，变异双证闭环，构建哈希+指纹门双证据链互补——零行为断言成立，无 Blocking。放行条件全部挂在收口侧：终跑 verify 全链真实 EXIT=0（变量法取证）、提交面白名单核验。主控收口满足 W1/W2/W3 后无需复审；N1 注释残留建议顺手补正。

FINDINGS: B=0 W=3 N=5 VERDICT=PASS
