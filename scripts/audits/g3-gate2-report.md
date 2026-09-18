# F-GEOM-01-G3 门二异构终审报告（ops-adjudicator 逐字归档——岗无写通道，主控落盘）

> 归档注：本岗（ops-adjudicator）工具面=Read/Glob/Grep+通信，无写通道——报告全文随回复交付，主控逐字落盘本件（g3-gate1-report.md 逐字归档同型先例）。档位=deepseek-flash $max（派发显式定档）。
> 审材：`scripts/audits/g3-gate2-brief.md`、`scripts/audits/g3-gate2-diff.patch`（终态 6 文件 +24/-9）、票面 registry.ts:294、设计书 2026-09-18_f-geom01 §2.3(140-143)/§2.5(160-170)/§2.6(172-184)/§5.4(362-370)、g3-impl-brief/report、g3-gate1-brief/report、g3-verify-final.log(:3876 EXIT=0)、g3-verify-final2.log(:3914 EXIT=0)、g3-gate1-diff.patch（处置前对照）。裁决=逐 hunk/逐锚点独立复算；不引包外事实。

## 一、四清单结论（+一）

**1 处置核对——通过（附两项新发现）**
- W1 落准：终态 annotation-resolve.ts:231-233 逐字含门一措辞「现状唯一消费=AnnotationLayer S3b/S6 存量回退（INV-68 档3）」（g3-gate2-diff.patch:64-67）。
- W2 落准：invariants.md:84 状态列=「未锚定（门一 W2 裁改词：…）」——词表合规（:88 三档）+括注保留 substance（对照 g3-gate1-diff.patch:18 旧文「已登记（防漂移性 INV…）」）。
- 增量隔离（机器）：终态 diff 相对处置前唯一新增 hunk=annotation-resolve `@@ -228,7 +228,9 @@`（g3-gate2-diff.patch:60 起；对照 g3-gate1-diff.patch:60 该文件仅 itemViewport hunk）；其余差异=INV-68 状态词与 manifest 时间戳/sha（重 apply 机制面）。W1/W2 之外零改动，「说了没改/改了没说」零项。
- N 级 7 条：无应处置未处置（N5/N6 的 G11 覆盖已核 registry.ts:302①④；N4 勘误链成立：+21/-8→+24/-9 复算一致）。
- 新发现（门一未见）：**P1-1**（W1 插入净 +2 行使 INV-68 两处行号锚失准）；**P2-1**（同族残句 annotation-resolve.ts:21-23/:25-28/:49 未清）。

**2 母本符合度——全中（行号锚 2 处失准见 P1-1）**
- 六要件：INV-68 落册 :84 接续 :83 尾号 67 ✓；INV-58 行内追加 :73 ✓；三处头注 :61-63/:79-81/:380-382 ✓；§2.6 #2/#3/#4 收口句 ✓；受锁单链 ✓。
- §2.5 表逐格 ✓（档1/档2/档3 绑定+禁跨档+禁第四推导+calibrateBands 现状不变）；§2.3 登记不物理收敛 ✓（三函数体零改）。
- 行号锚独立复算 10 处：命中 8（pdf-item-geometry.ts:366/:506；selection-evaluate.ts:130/:207/:296、:43/:292；annotation-resolve.ts:209；AnnotationLayer.tsx:98；annotation-band-calibrate.ts:77）；失准 2（annotation-resolve.ts:235 实为 :237；:300 实为 :302=档2 bands 行、函数定义 :277）。

**3 宪法红线终审——无违**
- 零行为变更逐 hunk 成立（6 文件全注释/条文/manifest；W1/W2 增量同样纯注释/词条）。
- 受锁两轮：11:33:02Z/ac9999b5（g3-gate1-diff.patch:28-38）→11:56:23Z/8455738b（locks/manifest.json:2/:10；g3-gate2-diff.patch:28-38）；final2 locks:check 绿（log:87）。sha 不可只读复算（N3）。
- UTF-8 抽读全可读+quality 绿（log:18）；行数 413/283/143/88/91 ≤500（lint 在链内）；[locked-change] 义务=收口执行面（预批清单）。

**4 机器面核对——数理一致**
- final2: EXIT=0(:3914)、quality 绿(:18)、指纹门 187/1789/5411(:27)+豁免 2 hits/2/stale 0(:67)、票 206/open 18(:77)、locks 338(:87)、test 170/1744(:3873-3874)、build 三绿(:3892/:3898/:3913)。
- 独立复核：206=registry grep 实测；open 18=grep 实测；翻 done 后 17；tickets:check 在链内(:74-78)。
- e2e 不跑口径成立（verify 链 :5 无 e2e；G11 ③验收门全跑义务在册 registry.ts:302）。

**5 成本账本行（+一）——格式核对通过（收口执行）**
- 先例（`.zcode/org-ledger.jsonl`:37-42）：role=executor/gate1-reviewer/adjudicator；tier=session:glm5.3flash-max / session:kimi-k3-max / session:deepseek-flash-max；gate2 findings={P0,P1,P2,verdict}（本报告=0/1/1/GO_WITH_CONDITIONS）。「1 unit」非 schema 字段（02 §9 字段序=契约，禁扩字段；行数=每岗一行）。绑定岗无自动落账→收口补记三行，无缺行。

## 二、逐条裁决表

| # | 原判断（来源） | 裁决 | 依据（证据行号） |
| --- | --- | --- | --- |
| 1 | 门一 B=0（g3-gate1-report.md:64） | 成立 | 零行为逐 hunk+全链绿（diff 全文；log:18/:68/:78/:87/:3873-3874/:3914） |
| 2 | 门一 W1（report:50） | 成立；处置落准；副作用移交 P1-1 | g3-gate2-diff.patch:64-67；annotation-resolve.ts:231-233/:237 |
| 3 | 门一 W2（report:51） | 成立；已按裁改词 | invariants.md:84/:88；g3-gate1-diff.patch:18 |
| 4 | 门一 N1（:300 函数锚偏；report:52） | 成立；终态 +2 位移并入 P1-1 | annotation-resolve.ts:277/:300/:302 |
| 5 | 门一 N2（AI 段 S2 未显式；report:53） | 成立（知会级；layered 兜底锚在册） | invariants.md:84 源码锚列 |
| 6 | 门一 N3（S3b 命名狭义；report:54） | 成立（S3b/S6 兼容；三处粒度差异记录级） | annotation-resolve.ts:231-233；selection-paint.tsx:53；AnnotationLayer.tsx:98 |
| 7 | 门一 N4（简报 +21/-9 误；report:55） | 成立（勘误链如实） | 两 diff 全量对照：处置前 +21/-8、终态 +24/-9 |
| 8 | 门一 N5（断锚债；report:56） | 成立（G11 覆盖在册；本票新增位移并入 P1-1） | registry.ts:302④ |
| 9 | 门一 N6（SelectionLayer:42-43 残句；report:56） | 成立（复核仍在档；G11 ①覆盖） | SelectionLayer.tsx:42-43；registry.ts:302① |
| 10 | 门一 N7（r3a 实体不确定；report:56） | 成立（维持；glob 零命中，包不足以裁决实体存在性） | pdf-item-geometry.ts:363-364 |
| 11 | 自裁1 域界宿主落 INV-58（impl-report:82-85） | 成立 | selection-geometry.ts:62-63 |
| 12 | 自裁2 manifest 路径勘正（impl-report:86-88） | 成立 | locks/manifest.json:1 |
| 13 | 自裁3 :235 补行号（impl-report:89） | 成立（当时为真；终态漂移→P1-1） | g3-gate2-diff.patch:60-70 |
| 14 | 自裁4 selection-paint 两处勘正（impl-report:91-94） | 成立 | selection-paint.tsx:10-12/:51-53/:68 |
| 15 | 自裁5 :290 备案未扩（impl-report:95-98） | 成立 | selection-evaluate.ts:290 |
| 16 | 自裁6 头注不对称（impl-report:99-101） | 成立 | 三处头注 :61-63/:79-81/:380-382 |
| 17 | 终态 6 文件 +24/-9（brief） | 成立（逐文件复算见三） | g3-gate2-diff.patch 全文件列 |
| 18 | verify 双跑 EXIT=0+基线（brief） | 成立 | final.log:3876；final2.log:3914 及对应数字行 |
| 19 | e2e 不跑口径（brief） | 成立 | final2.log:5；registry.ts:302③ |
| 20 | 翻 done 推演 18→17（brief） | 成立 | final2.log:77；registry 206/18 grep 实测 |
| 21 | 成本账本三行格式（brief 清单5） | 格式成立（收口待记） | org-ledger.jsonl:37-42；02 §9 |
| 22 | relay 3 行非票面已剔（brief） | 包内一致（diff 6 文件无 relay）；工作树全量无 git 通道（N3 边界） | g3-gate2-diff.patch:1/:22/:42/:56/:83/:98 |

## 三、独立复算记录

- ±行数逐文件（终端 diff 逐 hunk 计数）：invariants.md +2/-1；manifest +2/-2；lineage-viewport +3/-0；annotation-resolve +7/-2（W1 hunk +3/-1＋itemViewport +4/-1）；selection-geometry +3/-1；selection-paint +7/-3（+4/-2＋+3/-1）。**合 +24/-9**；处置前差额恰=W1 hunk（+3/-1）——+21/-8→+24/-9 链自洽。
- 行数实测：annotation-resolve 413（处置前 411+2）、lineage-viewport 283、selection-geometry 143、selection-paint 88、invariants.md 91。
- 锚点复算：见清单 2（10 处 8 中 2 偏）；INV-68 数值锚 pdf-item-geometry.ts:366/:506、selection-evaluate.ts:130/:207/:296、:43/:292、annotation-band-calibrate.ts:77、AnnotationLayer.tsx:98 全部逐点开卷命中。
- 计数复算：206 票（registry grep）、open 18、翻后 17、locks 338（log:87）、test 170/1744（log:3873-3874）、指纹 187/1789/5411（log:27）、豁免 2/2/0（log:67）。
- 增量隔离：g3-gate1-diff.patch vs g3-gate2-diff.patch 逐 hunk——终态唯一新增 hunk=annotation-resolve:60；INV-68 行 :18 词替换；manifest :28-38 时间戳/sha 替换（11:33:02Z/ac9999b5→11:56:23Z/8455738b）。
- 不可复算边界（证据不足项）：manifest sha256（只读工具面无哈希通道）；final2 与 manifest 生成时刻的机器时序（日志无内嵌时间戳，以主控声明+两件一致性为据）；工作树全量（无 git 通道，以审包为界）；r3a 实体（glob 零命中）。

## 四、回炉建议与优先级

- **P0=0**：无阻断。
- **P1=1**：**P1-1 INV-68 行号锚随 W1 位移失准（收口前显式处置，二择一）**——invariants.md:84 两锚：「annotation-resolve.ts:235」实为 :237（export function bandsNearRects）；「:300 resolveAnnotationRectsDom」实为 :302=档2 bands 行（函数定义 :277；门一 N1 已注函数锚语义）。成因=W1 修复在 :231 上方净插 +2 行（g3-gate2-diff.patch:60-70；门一测量 :235/:300 在处置前为真）。菜单：(a) 修复=改 2 数字（unlock→改→apply→verify 重跑取新证据日志；若合并修 P2-1 共一轮——annotation-resolve.ts 非受锁）；(b) 登记=G11 票面/收口语显式记「INV-68 :235/:300 因 G3-W1 处置 +2 漂移→:237/:302，G11 刷新」（沿 N5 既有轨道，收口语留痕）。择一即销。
- **P2=1**：**P2-1 同族残句未清零（annotation-resolve.ts 模块头注）**——:21-23「band 单源三消费点：…③AI 段经 bandsNearRects…」与 :49「F-A5 段（bandsNearRects 三消费点）」仍持 F-A5 口径，与同文件 :231-233（W1 已勘正）及 INV-68 档3 唯一消费互斥；:25-28 更正句亦为 F-A6-b2 前时态（未含档1 bandsFromItems 主链）。菜单：(a) 随 P1-1(a) 同轮补改；(b) 登记 G11 头注全域扫尾（N6 同轨，须点名三处行号防漏扫）。
- **N=5**（记录级）：N1 r3a 实体包外（维持门一 N7；支撑=pdf-item-geometry.ts:363-364；若主控持仓外档案件请收口语注路径）；N2 粒度三处不一（S3b vs S3b/S6，门一 N3 兼容已裁）；N3 证据边界（sha/时序/工作树四处不可复算，如上）；N4 账本三行=收口待办（映射见清单 5，非缺陷）；N5 历史引注仍指旧行号（tests/e2e/z-wg1-probe.spec.ts:7「:224」；docs/design/2026-09-03 两历史件 :73/:122 内 :102-116/:198-218）——历史快照+受锁测试零触碰，无动作。
- **收口预批清单（主控执行序）**：① P1-1 择一处置（若 (a) 重跑 verify 以新日志替换终态证据并注记本报告）；② registry 翻 G3 done（open 18→17）；③ 显式列文件提交+[locked-change] 尾注（docs/invariants.md、locks/manifest.json、四 src 件、scripts/audits/g3-* 全名单含双 verify 日志/双 diff、relay.md 3 行；禁 git add -A）；④ 板面收口（relay 第四波 G3 勾选）；⑤ health-scan；⑥ 账本三行补记。
- **总评：GO_WITH_CONDITIONS**（P0=0/P1=1/P2=1/N=5）——零行为变更声明成立、受锁链两轮在档、机器面数理一致；唯一实质=P1-1 行号位移（一处置级），处置毕即 GO。
