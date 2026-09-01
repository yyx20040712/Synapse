# F-R2 实现报告 —— ui-scale≠1 程序滚动落点漂移（方案 B 算术折算）

> 实现者子代理（2026-09-02）。票面=`scripts/audits/f-r2-ticket.md`（五层规约）。
> 开工技能清点：test-driven-development=用（红→绿→变异红证全流程）；
> verification-before-completion=用（各关原始输出落盘）；systematic-debugging=不用
> （根因已由探针+排查报告定位，任务书自带）；subagent-driven-development=不用
> （本代理即被派发实现者，不再派发）；receiving-code-review=不用（门审归门一/门二）；
> 其余技能与本票技术面无关=不用。配置欠账：工具面无 model 参数，运行于会话统一档
> （GLM5.3 同源），目标档 GLM5.3flash 无法显式指定——派发方已披露，照单记录。

## 1. 实现摘要

- **B-1（H1 主修）**：`scroll-converge.ts` 新导出 `effectiveZoom(scroller)`（③-1 裁定式
  `gBCR.height / clientHeight`，clientHeight=0 guard 返 1）；
  `scrollIntoNearestScroller` 的 start/center 两分支 elRect 侧（gBCR 视觉差值）除 z 折算
  回本地空间，clientHeight 项与 `:62` clamp 保持本地口径不动。INV-34 语义原样（最近祖先
  +显式夹取，仅量纲修正）。函数签名/导出面零破坏（③-2）。
- **B-2（H2 同批修）**：`scroll-progress.ts` 新导出 `measurePageBoxes(el)`——
  `top = (r.top − base.top)/z + el.scrollTop`，height 同除（保 nearestPage 距离比较同
  空间）；z 经单源 `effectiveZoom` 引用（禁两处各写）。装配工厂 `createReaderScrollProgress`
  的 getPageBoxes 改用之（原内联量测式删除——方案切换=删旧方案）。既有 ScrollProgressDeps
  契约零改动。
- **B-3 备案不修**（票面②）：`PageColumn.tsx` anchoredScrollTop 未触碰。
- **「下一页」旁支**（票面③-4）：未解析未扩面。修复前探针值在档（1.25 档 dSt=293.76 vs
  δv=165.4、landOffset=−201.8；探针 `f-r2-probe.json` tiers.large_1.25.hops[next]）——
  修复后三档真机复验（dSt≈δv/z）归主控⑤f。

## 2. 文件清单（本代理改动面）

| 文件 | 改动 | 行数 |
| --- | --- | --- |
| `src/renderer/features/reader/scroll-converge.ts` | +effectiveZoom；start/center 折算；头注公式同步 | 63 |
| `src/renderer/features/reader/scroll-progress.ts` | +import effectiveZoom；+measurePageBoxes；装配 getPageBoxes 改用 | 348 |
| `tests/unit/renderer/scroll-converge.test.ts` | 受锁改写：头注 [locked-change] 行；既有 4 用例补桩（见自裁 1）；新 describe 3 用例 | 174 |
| `tests/unit/renderer/scroll-progress.test.tsx` | 受锁改写：头注 [locked-change] 行；新 describe 4 用例 | 405 |

均 ≤500 行。`git diff --stat` 另有 `tickets/registry.ts` 1 行=主控派发前登记（非本代理所写，
且该行携语法缺，见 §7）。

## 3. 红证（全部 .raw.txt 落盘）

| 证据 | 路径 | 结果 |
| --- | --- | --- |
| 首红（终版测试面+HEAD 旧实现重现） | `scripts/audits/f-r2-red1.raw.txt` | 6 failed/29 passed/exit=1：converge start 530≠430、center 1300≠800（断言级=H1「dSt=δv」数学复现）；progress 4 用例 TypeError（measurePageBoxes 未存在）；既有用例 29 全绿（补桩零破坏当场验证） |
| 定向绿 | `scripts/audits/f-r2-green.raw.txt` | 35/35 passed/exit=0 |
| M1 变异（去 /z 回退 H1 原形态） | `scripts/audits/f-r2-m1.raw.txt` | 2 failed（530≠430、1300≠800）/exit=1 |
| M2 变异（effectiveZoom 恒返 1） | `scripts/audits/f-r2-m2.raw.txt` | 5 failed（两文件：converge 2+progress 数值锚 toEqual [top:−27.5,height:125]+判页 1≠2+记账 0≠1）/exit=1 |
| M3 变异（measurePageBoxes height 不除） | `scripts/audits/f-r2-m3.raw.txt` | 3 failed（数值锚 height 125≠100 且 top=+0 已折算=变异面精确；nearestPage 距离判页 1≠2；记账 0≠1）/exit=1 |
| M4 变异（clamp 上限误除 z） | `scripts/audits/f-r2-m4.raw.txt` | 1 failed（1280≠1600=上限被 /1.25 精确锚）/exit=1 |
| 全量 test | `scripts/audits/f-r2-test-full.raw.txt` | 677 用例全过 0 断言失败；57 文件死于 registry transform（§7），exit=1 |
| typecheck | `scripts/audits/f-r2-typecheck.raw.txt` | exit=2，唯一错误 registry.ts(230,3) |
| lint | `scripts/audits/f-r2-lint.raw.txt` | exit=1，唯一错误 registry.ts:230 解析——本代理 4 文件 lint 零错 |
| verify | `scripts/audits/f-r2-verify.raw.txt` | exit=1：quality+tickets 关过，断在 locks:check（§6 中间态） |
| build | `scripts/audits/f-r2-build.raw.txt` | exit=0 绿（registry 不进 app bundle） |

- 定向跑口径申报：`npm run test -- <两文件>`（ABI 前导随 npm script 自带，非裸 npx vitest）。
- 变异还原安全：全部 cp 备份法（备份→变异→测→cp 还原→diff 确认空，原始输出含
  M1-RESTORE-OK/M2-RESTORE-OK/M3-RESTORE-OK/M4-RESTORE-OK 回显），全程未 git checkout。
- 首红取证方式（自裁 5）：测试设计在首跑后修正两处（§4），为保证落盘首红与终版测试面
  一致，用 `git show HEAD:` 取旧实现写入+终版测试重现首红（工作区恢复靠 cp，diff 确认空）。

## 4. 新用例设计要点（7 个新 it）

converge 3：start z=1.25（500/400，期望 430 vs 现状 530）；center z=1.5 由桩推出（1460/300
桩，期望 800 vs 现状 1300）；z≠1 底夹取（raw=1920 夹 1600 本地口径=M4 专用锚，现状碰巧绿）。
progress 4：measurePageBoxes 数值锚（三盒折算回本地 [{0,100},{200,100},{400,100}]）；z=1
恒等护栏（修复前后皆绿）；nearestPage 判页（center=160→第 2 页；不折算误判第 1 页）；滚动
记账（onScrollEvent→pending=1，不折算记 0）。桩空间口径：scroller/页盒 gBCR=视觉（本地×z）、
scrollTop/clientHeight=本地；视口 scrollTop=110 避开 150 等距平手歧义（自裁 4）。

## 5. 测试证据（用例数）

- 两受锁文件合计 35 用例（converge 9：既有 6+新 3；progress 26：既有 22+新 4），定向全绿
  exit=0。
- 全量 test（基线 126 文件 1074 用例）：当前工作区 677 用例全过、69 文件绿；57 文件因
  registry.ts transform 失败未能收集（677+57 文件内约 397 用例=1074 吻合）——修 §7 逗号后
  预期 126 文件全量绿，最终数以主控收口 verify 为准（新用例 7 个计入后基线 1074→1081）。
- e2e：零触碰（票面④预期）；未单独跑（verify 链被 locks 中间态截断，e2e 本就不在 verify
  内、需先 build——build 已单独取证绿）。

## 6. locks 实录

- 两受锁测试=主控已 unlock 授权面（派发指令明示），本代理未跑 locks:apply（主控收口统一做）。
- locks:check 当前报 4 项：两测试「被修改」（=unlock 改写中间态，apply 后消）+两探针脚本
  `f-r2-probe.mjs`/`f-r2-probe2.mjs`「未登记」（主控探针面，locks:generate+apply 归主控）。
  verify 断在此关（quality/tickets 两关已过）。

## 7. BLOCKED 项（主控面，一字符修复）——挡 typecheck/test/build 外全量证据

**`tickets/registry.ts:229` 行尾缺逗号**：主控派发前插入 F-R2 工单行时，漏给上一行 R2-SH2
（原数组末元素）补尾逗号——HEAD 版 R2-SH2 无逗号合法（其后即 `] as const`），插入后成
`{R2-SH2…} {F-R2…}` 两元素无分隔 → `ERROR: Expected "]" but found "{"`（registry.ts:230:2）。
- 证据：esbuild 转译工作区版报错/HEAD 版该处结构合法；git diff 显示 registry 唯一改动=
  F-R2 行插入（本代理全程未写 tickets/**，取证只读）。
- 影响：typecheck exit=2（唯一错误）、vitest 57 文件 transform 失败（677/1074 用例收集到，
  已收集用例 0 失败）、lint 唯一错误。build 不受影响（exit=0）。
- 修复（主控执行）：registry.ts:229 行尾 `' }` → `' },`。修复+locks:apply 后重跑 verify
  即为收口径径——本代理 4 文件面证据（定向 35/35、变异红证×4、lint 干净、build 绿）已齐。
- 本代理按「禁翻 tickets/registry + 卡点=BLOCKED 停手不自裁」纪律未代修。

## 8. 自裁申报（超票面决定全列）

1. **既有 4 个 converge 用例补 scroller gBCR.height 桩**（`stubRect(inner,100)` →
   `stubRect(inner,100,400)` 型）：既有桩 gBCR.height=10 vs clientHeight=400 非同空间
   （z=0.025≠1），会使折算实现崩既有断言；依票面⑤e「jsdom 桩同空间时 z=1 恒等=既有用例
   零破坏的数学保证」的前提补全桩的空间一致性。**断言值一字未动**（480/640/0/1600/320
   原样）——非语义放宽。
2. **B-2 落地为导出函数 `measurePageBoxes`**：票面 B-2 给了「z 传参或经单源函数取」两径，
   选单源函数——scroll-progress.test 为全注入桩，可锚的实现面只在装配侧，抽导出函数是
   测试可锚的最小形态；不动 ScrollProgressDeps 契约。
3. **center 用例 z=1.5 替代票面点名的 1.1 档**：IEEE754 下 1.1 不可精确表示
   （1100/1.1=799.99…）导致期望值非确定整数；1.5 二进制精确（600/400 桩推出），保 toBe
   严格断言（变异红证更敏感）。满足票面「z 由桩推出者至少 2 例」分支（1.25+1.5）。
4. **判页用例视口 scrollTop=110**（非 100）：center=150 恰落页 1/页 2 中心等距平手点
   （nearestPage 取先者=歧义），110 使 center=160 判定无歧义；折算后盒 top 恒=本地内容
   坐标（与 s 无关），数值锚期望不受影响。
5. **首红取证方式**（§3 已述）：终版测试面+HEAD 旧实现重现——保证落盘首红与最终测试面
   一致（首跑版本含两处设计缺陷已修正）。
6. **删减面 diff 自查**：git diff 仅 4 授权文件+主控 registry 1 行；无未授权文件写入；
   落盘证据文件均在 scripts/audits/f-r2-*.raw.txt（仓库既有惯例位）。

## 9. 疑虑（供门审/主控）

- `effectiveZoom` 的 `gBCR.height/clientHeight` 口径：容器带 border 时 gBCR 含 border 而
  clientHeight 不含，比值≠Z 精确值（fitWidth 先例 width 侧用 offsetWidth 同含滚动条）。
  ③-1 裁定即此式、真机阅读区容器无 border（探针结构链实测口径），⑤f 真机复验
  （1.25 档 fill(4) 落点偏移 −512.6 → |偏移|≤5px、三档 dSt≈δv/z）归主控。
- 既有用例补桩（自裁 1）改变了受锁测试的夹具面——虽断言锚未动，请门一独立复核
  「补桩≠放宽」定性。
- registry.ts:229 逗号（§7）修复后，57 文件恢复收集——其中是否有对 scroll-converge/
  scroll-progress 桩几何敏感的传播用例（如 page-column/reader-double-page 经
  createReaderScrollProgress 间接消费），补齐的全量跑见分晓；本代理预判零影响
  （measurePageBoxes 对 z=1 恒等，jsdom 桩均同空间）。
