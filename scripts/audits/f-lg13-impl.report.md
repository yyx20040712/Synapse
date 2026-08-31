# F-LG13 实现者报告——脉络图统一尺寸+紧凑布局+题名滚动

> 工单：scripts/audits/f-lg13-ticket.md（用户 2026-08-31 图4/图5：「方框都一样
> 大小且中间没有空地，信息显示不下给题目加滚动条」）。
> 三屋第一屋（实现者）。禁 git/registry/locks（均未触碰——locks/manifest.json
> 的改动是主控解锁动作，非本实现者所为）。

## 1. 交付概要

| 面 | 落点 |
| --- | --- |
| 统一尺寸 | nodeWidth/nodeHeight 签名兼容保留、返回恒定 NODE_W=240/NODE_H=110；NODE_W_MID/NODE_W_LONG 删除（死代码即删） |
| 紧凑布局 | SIBLING_GAP 40→16、TREE_GAP 80→24、SURVEY_COL_GAP 80→24；LAYER_GAP 140 不动（票面：年份时间轴语义） |
| 题名滚动 | LineageNodeCard 题名 div overflow-y:auto+scrollbar-width:thin+完整文本常驻 DOM（line-clamp 删）；卡 g 根原生 wheel 委托：题名溢出（scrollHeight>clientHeight+1）→ stopPropagation+preventDefault+主动 scrollTop 钳滚动；未溢出不吞 zoom |
| F-LG14 底行锚 | data-card-footer 恒 24px 行承载年份（主控裁决 6——高度含在 110 内） |
| 不变量零变 | RT tidy tree/年份层带/综述右列/覆盖优先/森林语义/viewport 数学全零动（只改几何常量与卡渲染） |

## 2. 尺寸值自裁论证（票面 §1「推荐 240×110，±20 自裁」）

直取推荐值 **240×110**（未动用 ±20 余量）：

- 宽 240：foreignObject 可用宽 216（卡宽−左右 12×2）÷12.5px 全角=17.28 字/行；
  3 行覆盖 ~51 字，常见学术题名（中英文混排）主流长度入卡即读；
- 高 110=题名区 86（3 行 54px+paddingTop 8+余量 24——票面「题名区约 3 行」）
  +底行 24（F-LG14 元信息预留）；
- LAYER_GAP 140>110：层带间恒 30px 呼吸（用户未抱怨层间——不动语义自洽）；
- 与旧中档 220/长档 260 比较取中偏长，视觉密度与 16px 兄弟间隙配合后整图
  宽度约缩 40%（分档占位差+间隙放大效应消除）。

## 3. 二选一自裁：恒定值路线（非「收常量+三消费同改」）

票面 §1 两路线中取 **nodeWidth/nodeHeight 函数签名保留返回恒定值**：
三消费面（lineage-layout place()/LineageNodeCard/lineage-viewport fitViewport
+edge-label-layout 节点盒）调用点零改动=最小改面；受锁测试改向面相应最小。
附带：参数名 title→`_title`（ESLint no-unused-vars args 规则——签名类型不变，
INV-36/38 登记册条目已随修）。

## 4. 受锁改向逐条对照（硬纪律 3「语义随令」）

### tests/unit/renderer/lineage-layout.test.ts

| 原锚 | 改向后 | 依据 |
| --- | --- | --- |
| describe「R2-LG10 题名分档宽」it×3（三档边界 180/220/260；分档兄弟 ≥280；异档单链对齐） | describe「F-LG13 统一尺寸与紧凑间隙」it×4：统一宽 240（6 字面断言）/统一高 110（5 字面断言）/兄弟中心距恰 256/单链对齐保持（**锚逐字保留**） | 用户令统一尺寸——分档语义整体删除 |
| describe「R2-LG11 nodeHeight 卡高单源」it×3（64/82/100） | 并入上述「统一高 110」it | 行数分档随令删除 |
| 「右列位置公式精确值」`toBe(610)` | `toBe(648)`（240+24 间隙手算复算） | TREE_GAP/SURVEY_COL_GAP 改向 |
| E1/紧凑性/轮廓合并 it 注释手算数（90/310/200、310/530、占 400 等） | 120/376/248、368/624、占 480 等 | **断言本体逐字不动**（NODE_W+SIBLING_GAP 常量表达式——语义不变随常量自然更新）；注释数值随常量重算 |
| 文件头覆盖清单 | 增 F-LG13 行 | 登记义务 |

### tests/unit/renderer/lineage-canvas.test.tsx

| 原锚 | 改向后 | 依据 |
| --- | --- | --- |
| 「首载 fit」440/344、80+32k | 440/390、80+55k（chain 卡 240×110 手算复算） | 卡几何改向 |
| 「R2-LG10 题名分档宽」rect 180/260 | 「F-LG13 统一卡尺寸」rect 240×110（短/长题名同卡） | 同上 |
| （无） | **新增** describe「F-LG13 题名滚轮归属」1 it（溢出→scrollTop 钳 220+zoom 阻断；未溢出→zoom 正常——⑨边标签 wheel 同族配方，defineProperty 定溢出态） | 新增测试 always-active（不经 guardedDescribe） |

### tests/unit/renderer/lineage-canvas-visual.test.tsx

| 原锚 | 改向后 | 依据 |
| --- | --- | --- |
| U2a it：line-clamp 三行样式字面+WebkitBoxOrient 源码锁+卡高 100 | overflow-y:auto+scrollbar-width:thin 字面+「不含 -webkit-line-clamp/-webkit-box」负锚+卡高 110+**底行 data-card-footer 24px 在场含年份**；WebkitBoxOrient 源码锁随实现删除而删 | line-clamp 截断=旧方案（方案切换=删旧） |

### tests/unit/renderer/edge-label-layout.test.ts（超票面点名面——申报）

| 原锚 | 改向后 | 依据 |
| --- | --- | --- |
| fitViewport 数值锁 560/290、440/250.5 | 560/320、440/273.5（卡 240×110 手算复算） | 属票面 §3「卡几何断言」面的下游数值锁（nodeWidth/nodeHeight 消费），不改向必红 |

### tests/e2e/lineage.spec.ts

- 结构红线（g[data-node-id]/transform 串格式/真实文本/边计数/toast 链）**逐字保留**；
- T1 新增统一卡尺寸断言：全节点 rect 属性 `240x110` 单值（属性级——k 无关，
  避免 auto-fit 缩放干扰）；已真机跑 T1 单测通过（见 §6）。

### docs/invariants.md

- INV-36：三档语义→恒返 240（签名兼容）；auto-fit 抢占门/data-viewport 契约原样；
- INV-38：行数分档→恒返 110+题名滚动语义（滚轮归属/底行锚/紧凑间隙三常量）
  +B1 补记/综述右列常量值随改（80→24）。

## 5. TDD 证据

- **红**（scripts/audits/f-lg13-red.log）：改测试先行，旧实现下 4 文件 9 it 红
  （统一宽/统一高/兄弟 256/综述 648/首载 fit/统一 rect/滚轮归属/滚动区 DOM/
  fitViewport 数值锁）——全部为改向与新增强断言；
- **绿**：触碰面 4 文件 69/69；全量 `npm run test` 120 文件 1017/1017 全绿
  （23:01 轮，f-lg13-green.log）；终轮复验 119 文件通过+4 失败全部在
  `tests/unit/renderer/annotation-anchor.test.ts`（**F-V1 他场红相中间态，
  非本工单面**——终轮总测试数 1024=他场新增 7 it，纪律 5「含他场中间态」注明）；
- **typecheck/lint**：触碰文件 0 error 0 warning（期间一次 e2e NodeListOf
  迭代器类型错已修 Array.from；annotation-anchor 的一次错为他场中间态，
  其会话内自愈）。

## 6. 变异红证（cp 备份法——/tmp/*.bak，全程未用 git checkout）

| 变异 | 内容 | 红证（f-lg13-mut-m*.log） |
| --- | --- | --- |
| M1 | nodeWidth 分档回归（>28 字 +20） | 「统一宽 240」+「兄弟恰 256」2 it 红 |
| M2 | nodeHeight→64（1 行档回归） | 「统一高 110」红 |
| M3 | SIBLING_GAP 16→40（旧值回归） | 「兄弟恰 256」红——**常量表达式锚全部免疫**（导入同常量自适应），字面锚的必要性实证 |
| M4 | 题名滚动特性整体回归（overflowY hidden+wheel 委托体删） | 「题名滚轮归属」+「题名滚动区 DOM」双面红 |

每轮变异后 cp 还原+diff 确认空；四轮后触碰面复跑 69/69 绿。

## 7. 真机复验（scripts/audits/f-lg13-verify.mjs → f-lg13-verify.json/png）

真实库副本（f-v2-diag 同法，uiScale 用户实况保留）+UI 合成受控图（根+三兄弟
同层，乙=超长题名；右键连线 UI 链=spec T3 同型）：

| 项 | 结果 |
| --- | --- |
| ① 全节点统一尺寸 | 8 节点（4 真实图+4 合成）：rect 属性集合={240x110}、gBCR 宽高集合单元素（162.24x74.36=240×k×uiScale——方差 0）✅ |
| ② 兄弟间隙 | 同层直接兄弟相邻间隙 14.94/14.94≈16（±1.5 容差内；远小于旧 40）✅ |
| ③ 长题名滚动 | scrollHeight 134>clientHeight 86（溢出在场）；**真鼠标 wheel** scrollTop=48（=max，钳制生效）；滚到底后末 6 字 Range 与题名盒相交（文末可达）；computed=auto/thin ✅ |
| ④ pageerror | 0 ✅ |

探针自裁申报（票面 §5 允许面）：② 间隙归一口径=卡 rect gBCR 自标定
（screenPerLayout=rect宽/240）而非除视口 k——F-L2 INV-43 根框口径含祖先
uiScale zoom，首跑除 k 读作 80（=16×1.25 恰好旧值形状）即此因，自标定对
任意嵌套 zoom 免疫。期间一次 Electron firstWindow 失败=他场 ABI 切换争用
（better-sqlite3 node/electron 错配），按纪律等 60s 重试通过。

## 8. 超票面决定申报（硬纪律 7）

1. **尺寸 240×110**：直取票面推荐值（论证 §2）；
2. **恒定值路线**：最小改面（§3）；
3. **参数名 `_title`**：ESLint 适配，签名类型不变；
4. **`overflowWrap: 'break-word'` 新增**：长拉丁连续串防横向溢出（卡内换行
   语义增强——旧 line-clamp hidden 形态下无此暴露面）；
5. **`minHeight: 0` 显式**：flex 收缩滚动防御（规范上 overflow 非 visible 时
   自动最小尺寸已为 0，显式声明防引擎差异）；
6. **底行 `data-card-footer` 属性**：F-LG14 结构锚的测试可断言化（主控裁决 6
   落地形态自裁）；
7. **edge-label-layout.test.ts 数值改向**：票面未点名，属卡几何断言下游（§4
   已列对照）；
8. **e2e T1 亲跑**：票面只要求探针真机复验；为压 spec 改动风险追加单跑
   `npx playwright test tests/e2e/lineage.spec.ts --grep "T1"` 1 passed（2.1s）。
   全量 e2e 未跑（与 F-V1 场争用 out/ 且其 reader spec 中间态——留主控收口）。

## 9. diff 自查（硬纪律 2/完成定义）

```
 docs/invariants.md                                 |  4 +-   （INV-36/38 两行修订）
 src/renderer/features/lineage/LineageNodeCard.tsx  | 85 +++--（滚动卡+wheel 委托+底行锚）
 src/renderer/features/lineage/lineage-layout.ts    | 90 ++--（常量统一+注释随改）
 tests/e2e/lineage.spec.ts                          | 10 +   （T1 尺寸断言）
 tests/unit/renderer/edge-label-layout.test.ts      | 11 +-  （fit 数值锁改向）
 tests/unit/renderer/lineage-canvas-visual.test.tsx | 32 +--  （滚动区断言）
 tests/unit/renderer/lineage-canvas.test.tsx        | 54 ++- （fit/尺寸/滚轮）
 tests/unit/renderer/lineage-layout.test.ts         | 83 ++-- （统一尺寸 describe）
 8 files changed, 229 insertions(+), 140 deletions(-)
 新增：scripts/audits/f-lg13-verify.mjs/.json/.png（+f-lg13-red.log、
       f-lg13-green.log、f-lg13-final-test.log、f-lg13-mut-m1~m4.log、
       f-lg13-e2e-t1.log、f-lg13-probe-run.log 证据链）
```

- 零 TODO/FIXME/placeholder；中文 UTF-8 工具链往返可读（vitest 断言名/报告全中文通过）；
- **reader 域零触碰**（annotation-* 四文件改动=F-V1 他场，git status 可辨）；
- lineage-viewport.ts 零改（票面 ±面——fitViewport 经函数签名自动适配）；
- ABI 末态=electron（探针后；npm scripts 自动切换，不锁环境）。

## 10. 残余风险与交接

- 全量 e2e 未跑（§8.8）——T2~T5 断言面零触碰（仅 T1 加断言）；
- 探针合成节点写入 tmp 用户数据副本，真实库零写入；
- F-V1 中间态 4 it 红在他场文件——主控收口 verify 时若仍在，归他场裁决。

## 11. 成本账本（ADR-0017 义务）

实现者单代理（GLM-5.3）：约 55 分钟墙钟（22:55–23:50 本地，含两次 ABI 争用
等待）；估算 input ~610k tokens / output ~21k tokens / 工具调用 28 轮。
