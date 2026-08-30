# F-L2 实现者收口报告（三屋第一屋·ADR-0017）

- 领单：LOOP F-L2（lineage 视口量测 zoom 污染修复）
- 实现者：F-L2 修票子代理；日期 2026-08-30
- 配置自查：与主控同模型同思考等级 ✓

## 摘要

三消费点本地坐标系归一落地：fit effect 改 clientWidth/clientHeight 直取
（守卫同步）；wheel 锚点/pan 增量改根框差值×`rootToLocalScale`（新导出
纯 helper=clientWidth/gBCR.width，消费域单一驻本文件）。TDD 全程红→绿→
变异红证；真机探针 14/14 PASS（含修复主断言 A：三档 refit 后全节点入视口，
large 档 k 修后 1.0552 随 1158 本地宽正确缩小）；verify 唯一红=locks 结构
性（三个新文件未登记，预期内，归收口主控 locks:generate+apply）。

## 文件清单

| 文件 | 性质 |
| --- | --- |
| `src/renderer/features/lineage/lineage-viewport.ts` | 唯一源码改动（186→223 行 <<500）：头注坐标系声明段+INV-43 指针、helper 导出、fit/wheel/pan 三消费点、fitViewport 头注 vw/vh 语义 |
| `tests/unit/renderer/lineage-viewport-scale.test.ts` | 新测试（票面 5.1 ①~④+自裁 ③b，共 5 用例，always-active） |
| `scripts/audits/f-l2-fix-verify.mjs` | 新真机取证探针（票面 5.3 场景 A~D，crib precheck） |
| `scripts/audits/f-l2-out/f-l2-fix-verify.json` | 探针产物 |
| `scripts/audits/f-l2-{first-red,green,mut1-red,mut2-red,build,fix-verify-probe,closeout-verify}.raw.txt` | 各环节原始输出（均含真退出码） |

## 红证索引（TDD）

- 首红：`f-l2-first-red.raw.txt`——全量 `npm run test`，新文件 4 用例全红
  （rootToLocalScale is not a function），基线 114 文件 956 用例零回归，EXIT=1。
- 绿：`f-l2-green.raw.txt`——115 文件 **961 用例全过**（956+5；票面预估
  ≈960，实际 961=①②③③b④），EXIT=0。
- M1（helper 恒返 1）：`f-l2-mut1-red.raw.txt`——**①④红**（与票面一致），
  cp 备份→变异→定向红→cp 还原→diff 空（RESTORE-DIFF-EMPTY 回显）。
- M2（比值倒置 rw/cw）：`f-l2-mut2-red.raw.txt`——**①④红**，还原 diff 空。
  票面预估「①②④红」中 **②数学不可达**：②输入 1568/1568，倒置偏差对期望
  值 1 严格对称（|1−A/B|=|1−B/A|），任何精度阈值下倒置均绿——自裁申报。
- M3 型（fit 回 gBCR）：按票面主控预裁不硬跑 jsdom，真机探针场景 A 门锁。

## 测试证据

- 新用例数字 crib f-l2-precheck.json 真机实测（1158/1447.5→0.8 等）；
  stub=per-instance `Object.defineProperty(clientWidth)`+原型
  `vi.spyOn(Element.prototype,'getBoundingClientRect')`（票面 ③ 裁决手法）。
- 受锁面零触碰：tests/**、src/shared/**、tickets/、docs/、locks/ 均未改。

## 真机取证摘要（f-l2-fix-verify-probe.raw.txt，EXIT=0）

- **A**（修复主断言）三档 wheel 置位→点适应→refit：全节点入视口
  （small 1636≤1757 / medium 1593.9≤1727.4 / large **1532.5≤1683**——
  修前溢出 211.75px 场景闭环）；三档 k=1.5264/1.3115/1.0552 随
  clientWidth 1568/1381/1158 正比缩小（宽定界比 918/1328=0.6913 与
  k 比 1.0552/1.5264=0.6913 吻合——本地口径数学自洽）。
- **B** 100% 档：clientWidth==gBCR 宽高 0.0000% 差（量测源恒等+
  fitViewport 纯函数既有锁=输出数学恒等）+small 档无溢出双锚。
- **C** wheel：k 1.0552→1.2633 增且在 [0.25,4]，页面错误 0。
- **D** pan：拖 100 根框 px→dtx=80.03≈100×0.8003±5（本地口径增量；
  修前直用根框差会 ≈100）。

## 自裁申报（超票面决定）

1. **helper 双向防御+fit 量测退化回退**（源码偏离票面 §0/1.1 原文）：
   首轮实现严格按票面（fit 纯 clientWidth、helper 仅防 gBCR≤0）后受锁
   `tests/unit/renderer/lineage-canvas.test.tsx` 3 用例红——其
   `stubViewportRect` 只 stub gBCR（jsdom clientWidth 恒 0），票面
   「jsdom 语义保持：跳过 fit」假设与受锁现实（fit 测试断言 k≈1.279
   生效）不符。受锁测试不可改（sha256），故：helper 改「任一量测 ≤0→1」
   （票面 ③ 用例语义仍满足）；fit 改 `clientWidth||gBCR 回退`（真机恒有
   布局走直取主路径=修复生效；clientWidth=0 且 gBCR>0 = CSS 布局不可
   量测退化态，回退不劣于修前）。新增 ③b 用例锁该语义。请门审核对该
   回退的裁夺。
2. **探针 A 场景加 wheel 置位步骤**：首轮探针实证「适应视图」点击在
   userInteracted=false 时被 React bail out（setUserInteracted(false)
   no-op→effect 不重跑→三档 transform 恒同=首载 fit）——票面「每档:
   设 ui-scale→点适应视图」流程测不到 per-档 refit。加 wheel 置位后
   resetFit 真触发。precheck 三档 transform 逐位相同即此机制（基线
   本身未走 resetFit 路径）。
3. **B 场景断言改锁量测源恒等**：precheck transform 基线不可比——真库
   数据与首载档在两轮间漂移（基线 k=1.3873 按 1568 视口；本轮按 settings
   当前档 1158 得 k=1.0552，两 k 均为各自数据的正确 fit）。改锁票面 §4
   原文语义（zoom=1 档 clientWidth 与 gBCR 仅整数舍入差）+fitViewport
   纯函数既有锁=100% 档输出恒等的数学论证。
4. 删减面 diff 自查：git status/diff 核对——源码改动仅
   lineage-viewport.ts（+51/−30 内）；无 tickets/docs/shared/CI/既有
   tests 触碰；f1-out/* 为他票产物未动；无 TODO/FIXME/placeholder 引入。

## 收口证据

- `f-l2-fix-closeout-verify.raw.txt`：verify EXIT=1，**唯一红=locks:check 结构
  性**（三个新文件未登记：新测试+precheck.mjs+fix-verify.mjs——工单预裁
  预期内，勿触 locks，归收口主控 locks:generate+apply+[locked-change]）；
  管线被 locks 截断后补全证据同文件追加：LINT-EXIT=0、TYPECHECK-EXIT=0；
  test=961 绿（f-l2-green.raw.txt）、build EXIT=0（f-l2-build.raw.txt）。
- e2e 29：未单独跑（test:e2e 需 build 已备，收口主控 verify 全量口径覆盖）。

## 疑虑

- 自裁 1 的回退分支若门审不认可（视为「迁就测试」），替代路径=走
  [locked-change] 给 lineage-canvas.test.tsx 补 clientWidth stub——需主控
  裁决，实现者无权动受锁面。
- 真库在 precheck（15:33Z）与本轮（15:45Z）间数据漂移（同 nodeCount=4
  但包围盒不同）——若非主控操作所致，建议关注是否有并发写。

## 回炉 1（2026-08-30，原实现者承接；主控裁决=门一 W-2/N-3 两项）

开工技能清点：用——test-driven-development（新用例可失败性变异红证）、
verification-before-completion（verify 真退出码+全量绿落盘）、
javascript-testing-patterns（沿用 stubMeasured 手法）；不用——
systematic-debugging（非缺陷排查，回炉项已裁决固化）、browser/web 类
（无 UI 变更面）、subagent-driven-development（本人即实现者）。配置
自查：与主控同模型同思考等级。

### 两项处置

1. **W-2 消同帧双读**：`rootToLocalScale` 签名改
   `(el: Element, rect?: DOMRect)`——rect 传入则复用其 width 作根框宽
   （不自读 gBCR），缺省自读（既有调用/测试零变，pan 消费点不动）。
   wheel 消费点改单次 gBCR：`const rect = el.getBoundingClientRect();
   const s = rootToLocalScale(el, rect)`——锚点差值 rect.left 与比值
   分母同源同帧。helper 头注+wheel 行注同步标注
   「同帧两次 gBCR 的自洽假设消除——门一 W-2」。票面 §0/§2 单参签名
   原文由本回炉令状（主控裁决）取代——自裁申报。
2. **N-3 守卫四组合补全**：测试增 ③c「gBCR.width=0 而 clientWidth>0
   → 1」（stubMeasured(800,0)；注释声明真机不可达——gBCR 零宽则布局
   框不存在，桩面边界补全——门一 N-3）。

### 新证据索引（均含真退出码）

- `f-l2-green-r2.raw.txt`：全量 test **963 用例全过** EXIT=0
  （961+③c+⑤；预估 962 的 +1 偏差=自裁 ⑤，见下）。
- `f-l2-mut1-red-r2.raw.txt`：M1（恒返 1）签名变更后重验——**①④⑤红**
  （3 failed），还原 diff 空。
- `f-l2-mut2-red-r2.raw.txt`：M2（比值倒置）重验——**①④⑤红**（断言
  行 L47/L76/L85；②数学不可达同首轮自裁），还原 diff 空。
- `f-l2-mutn3-guard-red-r2.raw.txt` / `f-l2-mutw2-rect-red-r2.raw.txt`：
  自裁可失败性变异（见自裁 2）——各定点 1 红，还原 diff 空。
- `f-l2-fix-closeout-verify-r2.raw.txt`：verify EXIT=1，**唯一红=
  locks:check 结构性**（恰为预裁三新路径：新测试+precheck.mjs+
  fix-verify.mjs，勿触 locks）；补全 LINT/TYPECHECK/BUILD 均 EXIT=0。

### 回炉自裁申报

1. **票面签名原文取代**（上述 W-2）：ticket §2
   `rootToLocalScale(el: Element): number` 增可选参——回炉令状授权，
   票面文件禁改故在此备案。
2. **自裁增第 ⑤ 用例（超出回炉令状明列的 N-3 一例）**：W-2 新参数
   路径（rect 传入不自读 gBCR）若无单测锁即门一 N 级同型空缺——桩
   gBCR=1447.5 与传入 rect=1600 刻意不同，忽略 rect 即红。用例总数
   963≠预估 962 即此（+③c+⑤）。宪法「每个测试必须能失败一次」：③c
   与 ⑤ 恒真性由自裁变异 A（守卫退化 cw>0→③c 红：Infinity≠1）与
   变异 B（忽略 rect→⑤ 红：0.5526≠0.5）各实证一次（M1/M2 对两用例
   恒绿——M1 下 ③c 期望即 1，M2 下 ③c 走守卫短路）。
3. 删减面自查：git status——改动仅 lineage-viewport.ts+新测试+六个
   *-r2.raw.txt；f1-out/* 他票产物未动；原排查票证据
   f-l2-closeout-verify.raw.txt 未触碰（本回炉收口一律 -r2 前缀）。
   全部命令 npm run 口径（无裸 npx）；UTF-8 写后验证（本段回读可读）。

