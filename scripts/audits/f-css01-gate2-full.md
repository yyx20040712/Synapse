# F-CSS-01 门二终审报告（独立子代理，2026-09-05）

> **档位申报（首行）**：票面政策档位=deepseek v4flash 优先 unavailable 时 GLM5.3flash 次选
> ——本票 deepseek 平台 unavailable，实际执行模型=**GLM-5.3**（ZCode 平台会话，
> 政策「以实际执行模型为准」条款生效）。
>
> 开工技能清点：verification-before-completion（用——机器面矩阵亲跑）、
> code-review-excellence（用——四清单深审）；systematic-debugging（备用未触发——
> 全程零红源）；test-driven-development（不用——非实现场，仅变异红证）；browser
> 系技能（不用——reduced-motion 验证按前台焦点保护规则走 Playwright 无头脚本）。
> Node 环境自查：本会话 node=Volta shim→项目 pin v24.20.0（版本守卫无忧）。

审计范围：审档包（门一报告+主控处置表+实现者报告+亲验摘要+全量 diff）+仓库工作树
终态亲证。**门二=二审实证位，本报告全部结论以亲跑机检为据。**

---

## ① 处置核对（门一 W5 vs 主控处置表 vs 终态）

| 门一项 | 主控处置 | 门二终审核对 | 结论 |
|---|---|---|---|
| **B2** manifest 新件口径（不确定） | 主控实证：locks/manifest.json 零 .css 条目，renderer 源码非锁面 | **亲证**：`grep css locks/manifest.json` 零匹配（连旧 theme.css 历来就不在锁面——CSS 整体非受锁收录口径）；manifest 286 条亲数；四新 CSS 件不入=口径使然，与 library.css 等存量 CSS 同型。证据链合理 | **闭环 PASS** |
| **D2** 在线授权叙事矛盾 | 定位：无人值守场 AskUserQuestion 路由不明不可作放行依据；4 再锚以主控逐件亲核 diff 追认；教训记档 | 处置表在审档包在案（记档载体=处置表行）；实现者报告 §7.3 原文与门一引述一致，档案无互斥；主控叙事为准的处置自洽 | **记档一致 PASS** |
| **D3** Toast.tsx:20 二次自裁 | 主控追认豁免（该行指 token 变量，:root 留守 theme.css，注释不陈旧） | **亲证**：Toast.tsx:20 现文「theme.css 变量」指 token 消费——token 确留守 theme.css（守恒对账 :root 全量在留守件），语义准确属实；程序瑕疵已记 | **追认成立 PASS** |
| **D5** 计数表述失真 | 报告历史档不改，处置表行即勘误 | 处置表行在案（「文字『四件』后列 8 个数值」勘误义明）；实现者 §4.2 原文核对与门一引述一致 | **勘误在档 PASS** |
| **D6** baseline 时点（不确定） | 主控实证：baseline 采于派发前（拆件前形态） | **亲证时间戳链**：baseline-run1.raw=08:27:50 → baseline-run2.raw=08:28:02 → p7d01-out/baseline/dump.json=08:28:02（run2 升格）→ **brief.md 派发=08:28:34（baseline 后 32 秒）** → after=09:01:16。baseline 先于派发=拆件前形态，COMPARE PASS=真零视觉差。附：p7d01-out/ 下 baseline-run1-keep/（08:27）与旧 baseline-run1/（09-04 22:26，F-SPLIT-01 场）并存痕迹自洽 | **闭环 PASS** |

**①小结：门一 W5 全部五项处置与终态一致，两项不确定项（B2/D6）经门二独立实证收口。**

## ② 母本符合度（票面条款 vs diff 亲证）

独立守恒对账（临时脚本驻 OS temp，对照 `git show HEAD:src/renderer/shared/theme.css`
645 行原版）：

- **token 留守**：:root 全量+@import tailwindcss+html/body/#root 基座+共享动画
  keyframes 全部留守 theme.css；剥离五处 `[F-CSS-01]` 新增注释块（恰 19 行）后
  **五件非空行多重集与原版逐行全等：631=631，0 丢行 0 外来行**——实现者
  「守恒 631=631」声明获独立复算证实。
- **纯迁移抽查（超票面三段要求，做六段）**：shell `.app-nav::after` 常驻动画段 /
  buttons `.syn-btn-primary` 静态段 / lineage `.lineage-edge-label` 段 / reader
  `.rdr-toolbar` 段 / **reduced-motion 守卫段** / 留守 keyframes `syn-pan-y` 段——
  **六段与原版逐字节一致 PASS**（脚本输出存 temp/f-css01-gate2-conservation.out）。
- **import 序**：main.tsx:5-13 theme.css→shell→buttons→reader→lineage，与原文件
  段序（:91/:312/:422/:479）一致；token 留守件先行正确。亲读 main.tsx 在案。
- **受锁扩展**：theme.test.ts 四 readFileSync 与 libCss 同构（URL 法）；B1 三锚改指
  buttonsCss、SET1 两锚改指 shellCss、决5/z-index/MS_DECL 扩四件、DURATION_COUNTS
  21→49 三元组——全部在 diff 内且断言正则本体零改（审档包 diff 亲读复核）。
- **接缝交叉验证（E1 补证）**：ai-note-style.test.ts / reader-text.spec.ts 对
  theme.css 的引用亲查=全为注释且语义锚留守面（token 变量/body 单点声明），零皮肤
  段锚——「零扰动绿」声明成立。
- 空行 15→20（段内空行随段搬运+五件装配分隔），新增面恰=五处头注/拆件注，无隐性改动。

**②小结：票面四条款（token 留守/纯迁移/import 序/受锁扩展）全数符合，守恒获独立复算。**

## ③ 宪法红线终审

- **受锁 6 件+manifest 同步**：`sha256sum` 亲算 check-quality.mjs / theme.test.ts /
  library-cards / lineage-canvas / r3-rdr-set-visual / window-control 六件哈希
  **与 locks/manifest.json 逐字节匹配**；`npm run locks:check` 亲跑（verify 链内）
  =「286 个受锁文件与 manifest 一致」。无第七件受锁改动（git status 改动面=18 文件
  与 diff 一致，四新 CSS 件 A 状态非锁面）。
- **CSS 行数关卡生效**：`node scripts/check-quality.mjs` 亲跑（verify 链 quality 步）
  =「quality 检查通过：无占位标记 / 无乱码 / 无跨域引用」——关卡代码在
  check-quality.mjs:131-141（walk src/renderer *.css >450 行 violation），现状最大件
  236 行余量充足。关卡负向活性由 lint/typecheck 面外另证：变异场未触及此面（关卡
  登记正确性以代码亲读+绿跑为准）。
- **UTF-8**：五 CSS 件+main.tsx+check-quality.mjs 亲检=BOM=false、fatal-UTF-8 解码
  PASS、无 U+FFFD、纯 LF；中文样例可读（「墨青 + 金——shell-library.html nav 段誊录」）。
- **新文件被引用**：grep 亲查四新件——main.tsx import×4 + theme.test.ts readFileSync×4
  + 再锚四测试各 readFileSync——**零孤儿**。
- 安全禁令面：无 SQL/eval/出网/跨层新增（diff 全文为 CSS 拆分+注释+测试再锚+关卡）。

**③小结：红线全绿，无违宪项。**

## ④ 机器面核对矩阵（全部亲跑）

| 项 | 命令 | 结果 | raw 档 |
|---|---|---|---|
| verify 全链 | `npm run verify` | **exit=0**：quality ✅→tickets ✅→locks ✅(286)→lint→typecheck→**test 156 文件/1450 用例全绿**(1422+28 精确吻合)→build ✅ | scripts/audits/f-css01-gate2-verify.raw.txt |
| 探针二轮 | `node scripts/audits/p7d01-visual-probe.mjs after` | **COMPARE PASS / exit=0**：8 PNG 逐字节 identical+11 token 精确匹配+11 utility 规则在场+sweeps 全态 windowSize/trans/zi 逐键相同（写 p7d01-out/after=主控预授权验收面） | scripts/audits/f-css01-gate2-probe-after2.raw.txt |
| **reduced-motion 守卫实机验证**（门一转办项，门二独有职责） | 临时 Playwright 脚本驻 OS temp（f-css01-gate2-reduced-motion.cjs）launch 真实应用 | **14/14 断言 PASS**（详见下节） | scripts/audits/f-css01-gate2-reduced-motion.raw.txt |
| 独立变异抽查（文件备份法） | cp 备份→变异 theme.css `--dur-press: 0.08s→0.09s`（计数自校验=1+落盘回读校验）→`npm run test`→cp 还原→diff 空→复跑 | **红：2 failed/1448 passed**（恰 TOKENS 锚 `['--dur-press','0.08s']`+DURATION_COUNTS `['0.08s',css,1]`→0 双咬中，红点 theme.test.ts:304 在档）→还原 **IDENTICAL（diff 空）**→复绿 **theme.test.ts 116/116** | scripts/audits/f-css01-gate2-mut.raw.txt |
| 翻 done 推演 | `grep -rn F-CSS-01 tests/` | 11 处**全为注释文本**（`// [F-CSS-01]`/头注/用例名字样），零工单状态读取、零 status/owner 耦合；theme.test.ts 新 +28 三元组挂裸 describe（always-active，K3 纪律），guardedDescribe 仅存在于既有面（library-cards/lineage-canvas/r3-rdr-set-visual 各 1，HEAD 前已有，再锚不改变其属性）——**翻 done 不影响任何测试运行，零耦合核 PASS**。registry 现查 status:'open'（未翻=正确，翻 done 属主控收口动作） | — |

### reduced-motion 实证细节（方法与发现）

- **路线选择（自裁申报）**：票面首选 `chromiumArgs --force-prefers-reduced-motion`——
  p7d01 探针注释已实测该 flag 在本 Electron launch 路径无效。门二**实验 A 独立复测**
  证实：launch args 追加 flag 后 `matchMedia('(prefers-reduced-motion: reduce)')`
  =false（flag 确实不透传）。改走票面预授权的替代路径等效实现
  `page.emulateMedia({ reducedMotion: 'reduce' })`（Playwright 标准 API，内部 CDP
  `Emulation.setEmulatedMedia`——媒体查询层生效，正是 CSS @media 守卫的语义层）。
- **B1 默认态对照（防假绿前置）**：`.app-nav::after` 与 `.app-nav-item-active::before`
  computed `animation-name='syn-pan-y'`、duration=5s/2.8s——**常驻动画在场**，证明
  断言面不是「恒 none」。
- **B2 reduce 态**：emulateMedia 后 matchMedia=true，两伪元素
  `animation-name='none'`+`animation-duration='0s'`——**守卫在拆件后的 theme-shell.css
  件末实机生效，无障碍回归零**（门一 C1 层叠论证的运行时铁证补全）。
- **B3 撤销 emulation**：恢复 syn-pan-y（5s/2.8s）——证明 B2 的 none 确由媒体查询
  驱动，非加载态/其他原因。
- 断言对象存在性同检（navPresent/activePresent 均 true）。

### 变异红证还原安全

- 备份=`cp` 至 OS temp（f-css01-gate2-theme-backup.css），**全程未用 git checkout**
  （未提交实现保护纪律）；变异经计数自校验（前置 0.08s 恰 1 处+写入后回读确认），
  杜绝实现者 §7.2 记档的「变异未发生静默 no-op」假绿。
- 还原后 `verify-identical`=**IDENTICAL（字节级 diff 空）**，复跑 theme.test.ts
  116/116 绿。raw 中 `MUT_TEST_EXIT=0` 为管道 tail 退出码口径瑕疵（非 npm run test
  本身退出码）——红铁证=vitest 摘要行「2 failed | 1448 passed」在档，如实申报。

## ⑤ 成本账本行

| 项 | 估计 |
|---|---|
| 模型×档位 | GLM-5.3（ZCode 平台；票面政策 deepseek v4flash unavailable→次选档执行） |
| token（估） | 输入 ~155k（审档包 25.8k+diff/工具面回读）/ 输出 ~30k（含本报告全文） |
| 时长 | ~55 分钟（技能清点→四清单→verify 4min+探针+reduced-motion+变异链+报告） |
| 机器成本 | verify 全链 ×1、探针 after ×1、Electron 实机 ×3 会话（实验 A/B）、vitest 全套 ×1（变异态）+单文件 ×1 |

## 自裁申报（门二过程面）

1. **行内多行 node -e 踩坑**：UTF-8 首验用行内多行 `node -e` 零输出（实现者 §7.2
   已记档教训的再触发）——识别零输出=异常后立即改临时 .cjs 文件法重做得绿。建议：
   「禁行内多行 node -e」教训的适用面从实现场扩至审计/门审场（本报告即档）。
2. reduced-motion 路径=票面替代项等效实现（见上节自裁申报），附实验 A 无效性独立
   实证，方法链完整可复现。
3. 变异 raw 的 MUT_TEST_EXIT 口径瑕疵如实申报（见上节）。

---

## 总评：**PASS**

门一 W5 五项处置全部与终态一致（B2/D6 经门二独立实证收口，D2/D3/D5 记档一致）；
母本四条款符合且守恒 631=631 获独立复算+六段逐字节抽查；宪法红线（受锁 sha/locks
286/关卡/UTF-8/引用面）全绿；机器面五项全数命中（verify 156/1450/exit0、探针二轮
COMPARE PASS、reduced-motion 14/14 实机生效、变异双锚红+还原 diff 空+复绿、翻 done
零耦合）。门一转办的 reduced-motion 盲区已以运行时铁证闭环。**无阻塞项，建议主控
按收口单继续（registry 翻 done+[locked-change] 提交）。**

—— 门二终审子代理 2026-09-05
