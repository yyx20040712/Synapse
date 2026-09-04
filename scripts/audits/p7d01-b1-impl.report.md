# P7D-01 批一实现报告——design token 三轴机械迁移

> 实现者=子代理（定档申报 GLM5.3flash——Agent 工具面无 model 参数，环境统一档欠账
> 如实记账，不自称已定档）。票=registry:245 批一（甲式机械迁移零视觉差）。
> 任务书=scripts/audits/p7d01-b1-brief.md（六段全），照 ③ 主控裁决逐文件逐行执行。

## 1. 实现摘要

三轴全部按票面迁移表落地，token 定义代码照抄主控裁决原文：

- **轴 1（动效 32 处→7 token）**：theme.css `:root` 增 `--dur-press/tint/fast/base/lazy/
  rise/flow`（插在 --radius-l 之后 --font-display 之前，带分节注释）；transition 声明内
  裸值逐值换 `var(--dur-*)`：theme.css 16 处（titlebar 0.12×2/nav 0.18×1/primary
  0.3+0.18+0.08+0.12/secondary·danger·ghost 各 0.14×2+0.08×1）+workspace.css 7 处
  （ws-trigger 0.18×2+0.08+0.12/ws-item 0.14×2+0.08）+library.css 9 处（lib-card
  0.22×3/lib-corner 0.22/chip 0.14×2+0.08/dropzone 0.2×2）。animation 时长（syn-pan-*
  5s/2.8s/6s 与 ws-pop 0.16s）零改。
- **轴 2（弹层 z 四值→4 token+12 class）**：theme.css `:root` 增 `--z-float/anchor-pop/
  pop-veil/pop`（照抄裁决注释）；`.app-header` 与 `.lineage-fit-btn` 的 `z-index: 10`
  →`var(--z-float)`；12 处 tailwind class 改 v4 变量简写：Dialog z-50→`z-(--z-pop)`、
  Toast z-50→`z-(--z-pop)`、AnnotationEditor z-20→`z-(--z-anchor-pop)`、AnnotationMenu
  z-20→`z-(--z-anchor-pop)`、SelectionToolbar z-10→`z-(--z-float)`、TagLifecycleMenu
  z-40+z-50→`z-(--z-pop-veil)`+`z-(--z-pop)`、LineageNodeMenu 同前 2 处、
  LineageToolbar z-10→`z-(--z-float)`、LineageBoard z-10→`z-(--z-float)`。
  page-layer-z.ts:17 头注措辞更新为新 class 名（仅注释，四常量数值零改）。
- **轴 3（间距 inline 12 处→tailwind class）**：按票面表逐行迁移（4→`-1`、3→`-0.75`、
  6→`-1.5`、8→`pt-2`/`gap-1` 按属性），style 对象/常量只删该间距属性其余原样保留；
  `marginLeft: 'auto'`（LineageNodeMeta:82）按票面保留 inline。

## 2. 文件清单（21 件，git diff --stat 零蔓延）

| 文件 | 改动 |
| --- | --- |
| src/renderer/shared/theme.css | 7 dur token+4 z token 定义+16 处 duration 替换+2 处 z-index |
| src/renderer/features/workspaces/workspace.css | 7 处 duration 替换 |
| src/renderer/features/library/library.css | 9 处 duration 替换 |
| src/renderer/shared/ui/Dialog.tsx / Toast.tsx | 各 1 处 z class |
| src/renderer/features/reader/AnnotationMenu.tsx / AnnotationEditor.tsx / SelectionToolbar.tsx | 各 1 处 z class（SelectionToolbar 另含头注 1 行，见自裁①） |
| src/renderer/features/tags/TagLifecycleMenu.tsx | 2 处 z class |
| src/renderer/features/lineage/LineageToolbar.tsx / LineageBoard.tsx | 各 1 处 z class |
| src/renderer/features/lineage/LineageNodeMenu.tsx | 2 处 z class |
| src/renderer/features/lineage/LineageNodeCard.tsx | 2 处间距（pt-2/gap-1） |
| src/renderer/features/lineage/LineageNodeMeta.tsx | 4 处间距（px-1/gap-0.75/px-0.75/pl-1） |
| src/renderer/features/lineage/LineageSideAiNotes.tsx / SideManualNote.tsx / SidePanel.tsx | 各 1 处 pl-1.5 |
| src/renderer/features/lineage/LineageSideTags.tsx | 3 处（gap-0.75/px-1/pl-1.5） |
| src/renderer/features/reader/page-layer-z.ts | 头注 1 行措辞（数值零改） |
| tests/unit/renderer/theme.test.ts（受锁） | TOKENS+11+新 describe 5 用例组 |
| locks/manifest.json | locks:apply 重算（theme.test.ts sha256 变更） |

## 3. TDD 证据链（各原始 stdout 落盘）

- **首红**：`scripts/audits/p7d01-b1-first-red.raw.txt`——31 failed | 54 passed (85)，
  exit=1（TOKENS 11+duration 计数 14+层级 2+间距 1+在场锚 3；0.3s 单条现状恰 1 次消费
  =假绿一条，迁移后语义恒 1 次不变，见自裁④）。
- **绿**：theme.test.ts 85/85；全量 `npm run test` **155 文件/1395 用例全过 exit=0**
  （基线 1357+新增 38=1395，与 brief ⑤ 预估 ~1393~1395 吻合，实测精确值 1395）。
  新增 38=11（TOKENS）+21（值面负锚三元组）+2（层级）+1（间距）+3（在场锚）。
- **变异红证 3 次（cp 备份法，还原后 diff 空三验）**：
  1. `p7d01-b1-mutation-1.raw.txt`——`--dur-fast: 0.14s→0.15s`：2 failed（TOKENS 值锁+
     计数负锚双红），exit=1；
  2. `p7d01-b1-mutation-2.raw.txt`——`--z-pop: 50→51`：1 failed（TOKENS 值锁），exit=1；
  3. `p7d01-b1-mutation-3.raw.txt`——LineageSideTags h4 还原一处 `paddingLeft: 6`：
     1 failed（间距形态锁），exit=1。
  每次变异后 cp 备份还原，`diff` 确认空（RESTORED-CLEAN×3），未用 git checkout。

## 4. verify 真退出码

`npm run verify > scripts/audits/p7d01-b1-verify.raw.txt 2>&1` → **exit=1**。

- 前段关卡全绿（raw 在档）：quality ✓（无占位/乱码/跨域）、tickets ✓、locks ✓
  （282 与 manifest 一致）。
- **红点=lint 且不在实现面**：`scripts/audits/p7d01-out/determinism-check.cjs` 两个
  `require()` 触发 `@typescript-eslint/no-require-imports`（该文件=主控双跑确定性验证
  在档脚本，开工前已在工作区；eslint.config.js ignores 未覆盖 `scripts/audits/p7d01-out/**`，
  历史上该目录无 .cjs 故从未触发）。全仓 lint 仅此 2 errors（落盘
  `p7d01-b1-lint-impl.raw.txt`）——实现触碰面单独 lint exit=0。
- verify 链在 lint 中断后各关卡单独补跑全部落盘：typecheck exit=0
  （`p7d01-b1-typecheck.raw.txt`）、test 155/1395 exit=0、build exit=0
  （`p7d01-b1-build.raw.txt`）。
- 处置留给主控（均属受锁配置/主控资产面，实现者零触碰）：删除该一次性脚本 /
  ignores 增项（[locked-change]）/ 改写 ESM。

## 5. 视觉零差探针（票面硬验收）

`node scripts/audits/p7d01-visual-probe.mjs after > scripts/audits/p7d01-b1-probe.raw.txt`
→ **exit=1，[COMPARE] FAIL——但仅 tokens 一项，零视觉差两项硬证据全过**：

- 8 态截图（lib/ws-panel/settings/lineage-canvas/lineage-side/lineage-side-tagged/
  dialog/reader）**逐字节（sha256）全部 identical**；
- 全 DOM 计算样式 sweeps（transition/zIndex 逐键）**全部态逐键相同**；
- tokens 7 项 FAIL 为**序列化形态非值**：探针 :311 用 `getComputedStyle().getPropertyValue()`
  取值，Chromium 对 `<time>` 归一化——`0.08s→"80ms"`、`0.12s→".12s"`（去前导零；
  z token 10/20/40/50 无归一化全部通过，证明 token 挂载与值面正确）。数值全部等价
  （80ms==0.08s、.12s==0.12s…….3s==0.3s）。探针禁改（票面条款），
  EXPECT_TOKENS 字面期望（'0.08s'）与浏览器计算值序列化的不兼容属主控仪器面期望值
  形态问题——实现值正确（theme.test.ts TOKENS 锁源码字面 `0.08s;`，二者不矛盾：
  源码字面=票面钉死照抄；计算值=浏览器归一）。

## 6. locks 实录

- 改前 `npm run locks:unlock`（282 解锁）→ 改 theme.test.ts → 变异红证全程在解锁窗内
  → 实现毕 `npm run locks:apply`：**已锁定 282 个文件，manifest 282 条**（脚本输出
  原文；node 复核 files.length=282）。条目数恒 282 ✓（无新增受锁路径——探针已由
  主控入锁，本票新件无受锁面）。

## 7. 自裁申报（票面外决定逐条）

1. **SelectionToolbar.tsx:6 头注同步**：`z-10=层叠序最顶` → `z-(--z-float)=层叠序最顶`。
   票面只明示 page-layer-z.ts:17 头注更新；但测试面「9 弹层 tsx 合并串
   not.toMatch(/\bz-(10|20|40|50)\b/)」中 SelectionToolbar 在 9 件清单内，其头注字样
   `z-10` 会被负锚命中——头注措辞同步为测试面的必然要求（grep 实测该行是 9 件内
   唯一 class 外字样）。
2. **在场锚断言形态**：brief 建议「≥3 处新 class 名在场」；实现为 3 用例，断言用精确
   className 子串（`'className="pt-2"'`、`'className="gap-0.75 px-0.75"'` 等）而非裸
   class 名——防两类假绿/假红：多 class 元素带引号断言不匹配（`"gap-0.75"` 不是
   `"gap-0.75 px-1"` 的子串）与前缀误匹配（`pl-1` 匹配 `pl-1.5`；SideTags 的
   input/button 现存 `px-1.5` 会让裸 `'px-1'` 断言假绿）。
3. **it.each 数组显式元组类型注解**（`Array<[string, string, number]>`）：TS 对混合
   类型数组字面量推断联合数组，回调参数与 countLiteral 签名不符——类型必需非风格选择。
4. **首红非全红披露**：`['0.3s', css, 1]` 在现状恰好绿（theme.css 现状 0.3s 消费恰
   1 处）——单条假绿已知悉，断言语义（迁移后恒=定义处 1 次）不受影响；其余 30 条
   现状红足以证测试可失败。
5. duration 计数用 `match(/literal/g)` 全字面计数（`0.2s` 正则不误吞 `0.22s`——
   第 4 字符 `2≠s` 边界自然安全，无需额外断言）。

## 8. 疑虑（上报主控裁决）

1. **verify exit=1**（§4）：红点=主控在档产物 determinism-check.cjs 触发 lint 禁令，
   实现面零问题。不处置（删主控资产/改受锁 lint 配置均越权），等主控裁决。
2. **探针 [COMPARE] FAIL**（§5）：仅 tokens 期望值形态（浏览器序列化归一），视觉
   零差两硬证据全过。仪器禁改；若主控认可形态论定，EXPECT_TOKENS 期望改
   '80ms'/'.12s' 形态或比对逻辑数值归一后重跑即 PASS——属主控仪器面。
3. locks/manifest.json 开工前已是 M 状态（主控探针入锁未提交面）；本次 apply 叠加
   theme.test.ts 新 sha——提交时 [locked-change] 尾注由主控收口处理。
4. CRLF 警告（git diff 时 manifest.json）：`.gitattributes` LF 强制下 unlock/apply
   流程自洽（locks:check 282 一致在 verify 前段已过），无手工行尾干预。

## 9. 附：审计产物索引（本票新增 raw/报告）

- scripts/audits/p7d01-b1-first-red.raw.txt（首红 31F/54P/exit=1）
- scripts/audits/p7d01-b1-mutation-{1,2,3}.raw.txt（2F/1F/1F，均 exit=1）
- scripts/audits/p7d01-b1-verify.raw.txt（exit=1，红=lint 环境面）
- scripts/audits/p7d01-b1-lint-impl.raw.txt（全仓 lint 仅 2 errors 同一处）
- scripts/audits/p7d01-b1-typecheck.raw.txt（exit=0）
- scripts/audits/p7d01-b1-build.raw.txt（exit=0）
- scripts/audits/p7d01-b1-probe.raw.txt（exit=1，png×8+sweeps 全同/tokens 形态 FAIL）
- scripts/audits/p7d01-b1-impl.report.md（本文）

## 10. 回炉一轮（门一 deepseek 兜底审 W1/W2/W3——主控裁定接受，只改 theme.test.ts 负锚，实现面零改）

### 落点（tests/unit/renderer/theme.test.ts，回炉后文件 88 用例）

- **W1 间距负锚补异形态**：主 regex `/(padding|margin|gap)(Top|Bottom|Left|Right)?:\s*('\d…)/`
  → `['"\`]?[\d-]`（单/双/模板串三引号形态+裸数字全覆盖）；另加独立鉴别锚用例
  「双引号/模板串形态单证」两行断言（`"`/`` ` `` 各一条——防字符类笔误退化成仅单引号）。
  kebab-case 键形态（'padding-left': 6）按主控裁定不加（对象键历史形态全驼峰，
  加则 regex 复杂化收益不成比例）——记档于本节。
- **W2 弹层 z 锁补 arbitrary 形态**：新用例「弹层九 tsx 禁 z-[数字] arbitrary class」
  ——`not.toMatch(/\bz-\[\d+\]/)`，z-[50] 类任意值全禁（不限于四档）。
- **W3 duration ms 形态全域锁**：**grep 实测非 0**——`[0-9]ms` 字面量 theme.css=1 /
  workspace.css=1 / library.css=0；两处均为**注释字样**（theme.css:319「瞬态 80~120ms」/
  workspace.css:52「入场 160ms」），声明值面实测 0（动画/过渡时长全 s 形态）。按裁定
  「只锁增量面」：新用例「三 CSS 禁 transition/animation 声明内 ms 时长」——regex
  `/\b(transition|animation)[^;{}]*[0-9]ms/` 锁声明关键词后值段，注释行不含声明
  关键词不误咬（两处注释实测不触发）。0.30s 等价变体不锁（主控裁定记档已知边界）。

### 变异红证（cp 备份法，各自落盘、还原 diff 空）

1. `p7d01-b1-mutation-4.raw.txt`——LineageSideTags SIDE_TAG_CHIP 临时注入
   `padding: "0 4px",`（双引号形态）：**2 failed**（间距主负锚+W1 鉴别锚双红），
   exit=1；
2. `p7d01-b1-mutation-5.raw.txt`——Toast 容器 `z-(--z-pop)`→`z-[50]`：
   **1 failed**（仅 W2 arbitrary 锁——`z-[50]` 不被 z-(10|20|40|50) 裸值锁咬，
   `[` 挡词边界，证 W2 独立鉴别力），exit=1；
3. `p7d01-b1-mutation-6.raw.txt`——theme.css :352 一处
   `background var(--dur-fast) ease`→`background 140ms ease`：**1 failed**
   （W3 ms 声明锁，红点归属 raw 内实测为「三 CSS 禁 transition/animation 声明内
   ms 时长」用例）。与主控预期「ms 锁+计数负锚双红」的差异如实记：var 形态替换
   不产生 0.14s 字面（定义处 `--dur-fast: 0.14s;` 仍在），计数负锚 `['0.14s', css, 1]`
   按设计不红——1 红=ms 锁独立鉴别力，鉴别目的达成。
   三次还原均 `diff` 空（RESTORED-CLEAN-4/5/6）。

### 收口

- 负锚对现状绿属预期（新形态负锚无从首红）——鉴别力由 mutation-4/5/6 红证。
- locks：unlock（282）→改→apply（**282 恒定**，脚本输出+node 复核 files.length=282）。
- `npm run verify > scripts/audits/p7d01-b1-verify3.raw.txt` → **exit=0 全链绿**：
  quality ✓/tickets ✓/locks 282 ✓/lint ✓（determinism-check.cjs 已由主控清理，
  上轮 §4 疑虑①解除）/typecheck ✓/test **155 文件 1398 用例** ✓/build ✓。
- 用例数精确值：**1398**（批一 1395+回炉 3：W1 鉴别锚 1+W2 1+W3 1；theme.test.ts
  单文件 88）。
- 探针零跑（主控已强化 compiledRules 断言并复跑 PASS 在档
  scripts/audits/p7d01-b1-probe3.raw.txt——本轮回炉不动实现源码，视觉面不变）。
