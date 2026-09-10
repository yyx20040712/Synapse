# F-A12 实现报告——划选释放点浅探 affinity 事件层重定向（三屋实现者）

## 1. 实现摘要

F-A10 G2 遗留（释放点浅下探→浏览器把终点送进下一段 span 文本位 offset>0，
与刻意深点零 DOM 信号差异——锚定层原理不可辨）按主控预研方案落在事件层：
mouseup 真划选时刻，以 selection focus 盒几何+释放点坐标做手势裁决——释放点
在 focus 行盒顶上方且距上一视觉行盒底 ≤ max(距 focus 盒顶, 浅探余量) 时，
focus 重定向上一视觉行（释放 x 最近栏组）行尾（锚定侧原样），随后
evaluate.full(true) 同帧照常消费。判定纯函数驻新件 release-affinity.ts（零
React 依赖），几何全部经 anchor-blank-snap 导出面复用（几何单源），事件接线
在 SelectionLayer.onMouseUp（F-12 位移门之后、evaluate.full 之前，dragged 旗标
门=程序化零触）。事件时间线逐帧推演画在 release-affinity.ts 头注（门一强制
审项）：mouseup→scheduler.cancel→F-12 门→判定→setBaseAndExtent→
evaluate.full(true)（同步，先于 setBaseAndExtent 排队的 selectionchange 派发，
pending/paint 即终态；后续派发仅触发 visual 快路径幂等重渲）。

**判据微调（实测驱动，派发令 §3「可依实测微调+申报」授权）**：预裁定纯距离
判据「更近上一行」在真实 G2 几何**不触发**——f-a10-verify-real2.raw.txt GEO
实测：段间间隙仅 2.5px（last bottom 540.3 / next top 542.8），释放 y+6=542.3
距上一行盒底 2.0px > 距 focus 盒顶 0.5px——紧间隙排版下距离分割失效，间隙带
整体在人类瞄准精度之外。微调=加绝对余量 SHALLOW_PROBE_MAX_PX=4（人类释放过冲
量级，与 F-12 DRAG_SELECT_THRESHOLD_PX=3 同量级+1px 量测松弛）兜住紧间隙；
距离主判据（更近/等距取上一行——C-2 精神）保持，大间隙底部刻意释放（~19px
级）仍零变（单测锁定）。红证驱动：紧间隙实测几何复刻用例对预裁定判据先红
（f-a12-red2.raw.txt）。

## 2. 文件清单（行数变化）

| 文件 | 动作 | 行数 |
| --- | --- | --- |
| src/renderer/features/reader/release-affinity.ts | 新增 | 166（≤300 ✓） |
| src/renderer/features/reader/SelectionLayer.tsx | 修改 +32/-1 | 207→237（组件 ≤250 ✓） |
| src/renderer/features/reader/anchor-blank-snap.ts | 修改 +30/-11（含头注） | 274→284（≤300 ✓） |
| tests/unit/renderer/release-affinity.test.ts | 新增 | 208（11 用例 always-active） |
| scripts/audits/f-a12-verify-real.mjs + .raw.txt | 新增 | 真机复测探针+输出 |
| scripts/audits/f-a12-db-query.mjs + .raw.txt | 新增 | 落库对照查询+输出 |
| scripts/audits/f-a12-{red,red2,green,mutation1,mutation2}.raw.txt | 新增 | 红/绿/变异证机器输出 |
| locks/manifest.json | 修改 | 312→315（新测试件+2 探针入锁，已 apply） |

未触碰：tickets/**（registry 的 M=主控派发时既有变更）、tests/ 既有文件、
selection-evaluate.ts、anchor-serialize.ts、annotation-anchor.ts、
tests/utils/pdf-factory.ts（受锁，见 §6）。

## 3. 红证索引

- **红（首红）** f-a12-red.raw.txt：新函数不存在（import 解析失败，9 用例收集即红）；
- **红（判据微调红）** f-a12-red2.raw.txt：紧间隙实测 G2 几何复刻用例对预裁定
  纯距离判据红（1 failed——微调的实证缺口锁定）；
- **绿** f-a12-green.raw.txt：全量 **161 文件/1573 用例**（基线 160/1562+本票
  11——以实数申报）；typecheck 0 错/lint 干净/build 过；
- **变异红证（对最终代码）**：
  - M1 浅探判据反转（上方门 `>=`→`<=`）：5 failed/6 passed（f-a12-mutation1.raw.txt）；
  - M2 重定向目标错位（行尾→行首 offset 0）：5 failed/6 passed（f-a12-mutation2.raw.txt）；
  - 还原=文件备份法（cp→变异→测→cp 还原→diff 空，M1/M2 各验）；备份已删（禁驻留）；
- tsc 关卡拦住 2 处类型注解缺陷（Selection.anchorNode 可空/textLayer Element→
  HTMLElement 收窄）——vitest 经 vite 不查类型的已知面，修复后全绿。

## 4. 测试证据（新增 11 用例）

G2 浅下探重定向（boundary+接线等价链 selectionToAnchor 终点断言）/深点（更近
focus 行）零变/词间空格行盒内零触/向上浅上探对称（backward，focus 重定向
r0 行尾）/四零盒量测守卫/双栏释放 x 定向最近（右）栏组行尾不跨栏/首行（无上
一行）零变/坍缩选区零触/等距取上一行/**紧间隙实测 G2 几何复刻**（间隙 2.5px、
释放高 focus 盒顶 0.5px/低于上一行盒底 2px→余量内重定向）/**大间隙底部刻意
释放**（距上一行盒底 19px）零变——锁定微调边界不误吞。

## 5. 几何复用路径申报：export（未重建）

anchor-blank-snap 导出面扩 5：`boxOf`/`visualRows`/`columnGroups`/`rowEndOf`
+ `export type Box`（头注接口层段落同步+各函数注标注 F-A12 复用语义）。耦合
评估：rowEndOf「最近栏组行尾」语义与重定向目标完全同构（box 入参即释放点合成
盒 left/right=upX），零复制聚类逻辑，几何单源达成。selectionToAnchor/start>end
翻转兜底（C-1 同族）复用既有，未改。

## 6. e2e 与真机面处置

- **e2e=申报替代**（票面已备此口）：机械面可行（mouse.move/down/up 精确坐标
  在库内有先例 reader-text.spec.ts:631），但 G2 复现依赖浏览器 caret 下探行为
  ——F-A10 档案实证拖选解析非确定（verify-real3 指纹 1/4 次），合成 PDF 夹具
  不保证复现该前置，断言将退化为恒真风险（违反「每个测试必须能失败一次」）；
  且多行间隙夹具需扩受锁 tests/utils/pdf-factory.ts（不在实现者改动面）。
  替代证据链=jsdom 11 用例（含实测几何复刻）+真机矩阵（下）。若主控仍要求
  e2e：需 [locked-change] 扩 pdf-factory 多行变体+先验证合成夹具可复现下探。
- **真机复测=已执行**（f-a12-verify-real.mjs，temp 拷贝库配方复用 f-a10，
  真库零接触；窗口占用 ~40s）：

| 面 | 修复前（f-a10-verify-real2） | 修复后（f-a12-verify-real.raw.txt） | 判定 |
| --- | --- | --- | --- |
| G2 浅下探释放（y+6） | focus=(With regard span, 39)、end=1504 带下段头、paint 550.7 跨段 | focus=(Mohanty span, **36=行尾**)、sel 尾「(Mohanty et al., 2016).」、paint max bottom **540.3 < 段顶 542.8** | **过** |
| G2 落库（temp 库查询） | end=1504 | **end_offset=1465**（=G1 口径）、quote 尾=段末、suffix=「With regard to urban water infra」 | **过** |
| G1 段末行尾释放（回归） | end=1465、paint 540.3<542.8 | end_offset=1465、paint 540.3<542.8（F-A10 路径原样） | **过（不破）** |

  附注：探针内嵌 DB 查询因 ABI 绑定（build 后=electron 146）静默失败，补
  standalone 查询（sqlite-abi use node 后跑，f-a12-db-query.raw.txt）——与
  F-A10「探针+拷贝库查询分离」同款处置；库内第三条 2026-09-08 旧标注=真库
  既有数据原样拷入，未触碰。

## 7. 自裁申报（超票面决定）

1. **判据微调**（§1 详述）：SHALLOW_PROBE_MAX_PX=4 浅探余量——预裁定纯距离
   判据实测不触发，红证锁定缺口后微调；头注【判据微调申报】标记。
2. **几何复用=export 路径**（§5）——票面两选项中取 export，未重建聚类。
3. **dragged 局部旗标**：SelectionLayer F-12 分支引入最小旗标区分「真划选」与
   「无 mousedown 记录（程序化）」——票面手势态表「程序化→零触」的实现需要
   （票面未规定实现形态）。
4. **focus 元素槽位盒量测形态**（票面授权「实现者按 DOM 实测定」）：文本位=
   父 span 盒（pdf.js 单文本节点——G2 实测形态）；元素槽位=折叠 Range 插字符
   盒（真 Chromium 有行高；jsdom 四零→守卫 null 零变）。
5. **focusRowIndex 回退策略**：文本节点同一性优先（G2 形态零几何歧义）→几何
   垂直重叠回退（全零重叠保守 -1 零变）。
6. **不变量登记候选留主控裁决**：mouseup 事件层 focus 改写（evaluate 消费前置）
   属新跨模块行为——是否并入 INV-37/58 修订或新立条目未自行登记（派发令口径）。
7. 探针/查询两 .mjs 诞生即 locks:generate+apply（315 与 manifest 一致）；真机
   窗口占用未另行预告（三屋子代理场+票面明列该矩阵，F-A10 同款先例）。

## 8. 疑虑

- SHALLOW_PROBE_MAX_PX=4 标定=单 PDF 实测+运动噪声量级类推，未扫全库形态
  （F-A10 §6.4 同族申明）；大间隙 PDF（段间距 ≥20px）体感未实测（单测已锁
  19px 刻意零变面）。
- G1 形态下若 Chromium 把 br 槽插字符盒解析到下段位置，F-A12 将与 F-A10
  归一化双覆盖（同目标 1465，无害叠加；本轮实测 G1 走 F-A10 路径、F-A12
  未触发——两种解析形态下终点一致，已推演未逐一实测）。
- 释放点远高于上一行盒顶（跨多行）时判据恒真（prevBottom<top_f 蕴含
  dist_prev<dist_f）——浏览器 caret 最近文本解析使该形态不可达（下探必先
  命中中间行），未加 prevTop 上界收紧；如门一认为需防御性收紧请回炉。
- tickets:check 现报 169 票（1 open strong）——交接基线 168，差 1=主控侧
  变更（registry M 状态在实现者开工前已存在），段间对账以主控收口实数为准。

## 9. 门一 R1 回炉处置表（2026-09-10，B=0/W=5/N=4——W1-W4 回炉，W5 入档）

| 门审项 | 处置 | 证据 |
| --- | --- | --- |
| W1（必修）判据缺「释放 x 处上一行无文本」编码——票面缺陷机制明示触发前提，原判据只有 y 几何 | 已修：新增 nearestGroupOf（columnGroups 复用+rowEndOf 同型距离式，Rule of Three 第 2 次保持重复）——prev 行按释放 x 定位最近栏组，要求 upX > 该栏组最右文本盒 right+1px（1px 容差对齐 F-A10 `<= box.left + 1` 惯例）才触发；upX 落域内（含容差）=上一行该 x 处有文本→null（组左缘外同式蕴含零变） | 红证 W1（紧间隙同款几何 x=800 域内+878.7 右缘容差→零变，对回炉前代码红，f-a12-red3.raw.txt）→绿；变异 MW1（删栏组域判别）=1 红（f-a12-mutation3.raw.txt）；G2 复刻用例（x=907.7>877.7+1）保持触发 ✓ |
| W2（必修）跨多行释放（upY < prev 行盒顶）判据恒真只上挪一行=错误终态 | 已修：upY ≥ Math.min(prev tops) 防御上界（不可达形态保守零变） | 红证 W2（释放 y=75 高于 prev 盒顶 80→零变，对回炉前代码红——恒真形态实证复刻）→绿；变异 MW2（删上界）=1 红（f-a12-mutation4.raw.txt） |
| W3（必修）翻转兜底缺本票面用例 | 已补：backward 链（anchor=r2 中部、focus 解析到 r1、释放 (75,93)→target=r0 行尾全局 8<anchor 21）→接线等价链断言 selectionToAnchor start=8/end=21/quote='AB firstCD se'（C-1 翻转兜底在本票 backward 链真实存活） | 对回炉前代码即绿（既有 C-1 兜底面回归锁——非新行为红证，如实申报）；随 W1/W2 落地同链复验绿 |
| W4（必修）接线态无组件级测试 | 已补新件 tests/unit/renderer/selection-layer-fa12.test.tsx（137 行 3 用例，act+createRoot+document dispatch，参照受锁 selection-layer.test.tsx 手法零改它）：①程序化 mouseup（无 mousedown 记录）零重定向 ②moved<3px F-12 早退零重定向 ③真划选（mousedown 行内→mouseup 上方间隙行尾空白区）focus 重定向 r0 行尾+锚定侧原样 | 对回炉前后代码均绿（dragged 门+接线为既有面=锁面非红面，如实申报）；**夹具教训**：首版漏桩 Range.prototype.getBoundingClientRect（jsdom 原生无此方法——受锁件专门桩它的原因），evaluateCore:287 抛 TypeError 成 vitest 套件级 Unhandled Errors 1——且被我的 grep 过滤掩蔽两轮（red4/green2 假绿档），verify 真退出码 1 才拦截（f-a12-verify.raw.txt 首跑档）；已补零盒桩（evaluate 走零宽盒守卫早退——接线断言面=selection 终态）并重刷全部证据档（green2/verify 现 0 Unhandled） |

W5=入档（门一档案为准，无代码面动作）。

**回炉证链**：红 2（W1/W2 对回炉前代码，f-a12-red3.raw.txt）→绿定向 17/17→
全量 **162 文件/1579 用例**（回炉前 161/1573+W1/W2/W3 三用例+W4 三用例）
（f-a12-green2.raw.txt，0 Unhandled）→变异 MW1/MW2 各 1 红+还原 diff 空+备份
删→typecheck/lint 净→locks 315→**316**（W4 新件入锁，generate+apply+check
一致）→**npm run verify 全链真退出码=0**（f-a12-verify.raw.txt：quality+
tickets+locks+lint+typecheck+test 162/1579+build）。

**回炉面申报**：
- 判据微调第二次（W1 x 域判别为收紧——非放松：G2 触发面收窄到「行尾空白区」
  原义；W2 为防御上界）；头注判据段/态表/函数 docstring 同步。
- 既有夹具 upX 严谨化（T1 G2 浅下探 60→100、T6 双栏 200→260、T9 等距
  60→100、T11 60→100）：原夹具 x 落栏组域内与「行尾空白区」票面语义不符，
  W1 落地后必红——修正为语义正确形态（对回炉前代码断言中性，red3 档内全绿
  佐证）。
- nearestGroupOf 与 rowEndOf 内部距离式同型重复（Rule of Three 第 2 次保持
  重复，禁第 3 处）；W1 定位组与 rowEndOf 内部定位组同输入同式=必然一致。
- 过程教训（自罚申报）：①grep 过滤掩蔽 Unhandled Errors 两轮——证据档检索
  必含错误面模式（本次 red4/green2 已重刷为净档）；②`grep -c` 计数 0 的
  退出码 1 截断 && 链——计数后接链改用 `;` 或显式 `|| true`（本次致一次
  verify 假跑，旧档时间戳露馅拦截）。
- git 状态注记：新文件现呈已暂存（A）态=主控门审打包流所加，实现者命令史
  无 git add（禁令遵守自证）；tickets/registry.ts M=主控侧既有。
