你是 F-CSS-02 回炉 1 的门一定点复核员（你=原门一审人 Kimi K3 同位复核——R1 总评 PASS_WITH_WARNINGS 0B/4W/9N）。只看本包（你上轮 findings+主控裁决+修复后完整 diff+回炉证据摘录+实现者报告回炉节）,禁接触仓库/禁跑命令。中文输出。

任务：逐条裁定 ADDRESSED / NOT ADDRESSED（diff 行号证据）+新破坏扫描（修复引入的新缺陷——重点：新正则的误咬面与语义漂移）。

你上轮 findings 与主控裁决：
[W1 新文件通道未闭合] →主控裁决**不修**：转 F-LINT-01 lint 面设计输入+registry 注记修订措辞（票面歧义句「新文件自动被拦」按值通道解）——你可攻击此裁决但需更强依据
[W2 calc 绕行通道] →主控裁决**修**：正则升级值段中缀形态（方向=font-size: 后值段内任意 数字+单位 字面量,不跨 ;/{} 声明界）
[W3 报告数理矛盾] →主控裁决**修**：报告补 §7 更正节（454→451 实测起点）
[W4 注释内示例文本误咬] →主控裁决**不修**：知悉（此红=严格性非缺陷）
[N9 头注「三通道」列四项] →主控裁决顺带修：五通道精确实列

=== 修复后完整 diff（两文件 21+/20−——上轮你审的是 17+/20− 版） ===
diff --git a/docs/invariants.md b/docs/invariants.md
index 74abefe18f..534e216f62 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -74,7 +74,7 @@
 
 | INV-59 | 重锚同族配对令（F-A8 门2，2026-09-04 随主链切换落地登记）：标注/AI 段重锚产物 resolved.rects 与 resolved.bands 必须**同几何族**（项几何主链=rectsForOffsetRange 项盒+bandsFromItems 同源派生；S4 DOM 回退层=findRangeAtOffset 行盒+bandsForTextNodes 节点口径同源）——主链禁跨族配对（消 R1：正确 rects×失真 bands 互漂错绑）；跨族配对仅允许显式回退格且属登记边界：**S3b 条目回退**（存量 rects[库]×bandsNearRects[DOM 量测]——现状语义逐位保持）与 **S5/S6 页级回退**（DOM 产物或其抑制后的存量直显）；matchBand 阈值（\|Δcenter\|≤rect.h）仍在为跨格边界兜底 | src/renderer/features/reader/annotation-resolve.ts（ResolvedAnnotation 域内 rects/bands 成对产出+resolveAnnotationRectsItem 同族管线）+annotation-resolve-layered.ts（三层编排=同族配对的编排保证——主链产物 rect/band 同域，跨族仅在登记回退格） | 单测（annotation-layer.test F-A8 门2 describe：S2 项几何产物 rect/band 同族数值断言（块几何=band 几何同基线）+S3b/S6 回退格跨族配对=登记边界渲染断言；anchor-item-verify.test：resolveAnnotationRectsItem 产物与 itemSelectionGeometry 同参直调逐位一致（rects+bands 双断言）） | 已锚定（单测级 F-A8 门2 本单——证据件 anchor-item-verify.test.tsx 为门 0 遗留未跟踪件,随门 2 收口提交补 git add 后生效[门二 W1 标注]） |
 | INV-60 | 重锚显示覆盖登记（F-A8 门2，2026-09-04 随主链切换落地登记）：重锚成功产物（项几何主链/S4 DOM 回退层）覆盖库值 rects **仅显示层、永不回写**（annotation.rects 库数据零迁移零触碰——重锚是渲染态推导非数据变更；INV-37 只覆盖拖选期不扩其文，本条另立）；产物域标记 source:'item'\|'dom' 随 resolved 运行时走（调试面=渲染块 data-source 属性+单测断言面；**不入库**=Annotation 模型锁面零触碰），渲染行为零差（色块样式不区分源） | src/renderer/features/reader/annotation-resolve.ts（ResolvedAnnotation.source 可选域）+AnnotationLayer.tsx/AiAnnotationLayer.tsx（data-source 调试属性）+annotation-resolve-layered.ts（markSource 唯一标域点） | 单测（annotation-layer.test/ai-annotation-layer.test F-A8 门2 describe：域标记断言（S0/S4='dom'/S2='item'/S3b·S6 抑制=无标记）+M3 主链换 DOM 变异→域标记断言红证在档；e2e reader-text「划选高亮后重开仍在原位」INV-51 稳态口径回归=显示覆盖不回写的端到端面） | 已锚定（单测级 F-A8 门2 本单；e2e 面随全量 reader-text 回归） |
-| INV-61 | 字号六档语义刻度单源：font-size 消费面禁字面量（CSS 声明/inline/arbitrary），tailwind text-xs/text-sm 经 v4 @theme 重绑到 --fs-* token——档位与锚值变更=用户裁决+本册 | P7D-01 批二用户裁决 2026-09-08（docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md）；token 定义=src/renderer/shared/theme.css :root --fs-* 段+@theme 重绑块，消费面=四皮肤件+library.css+workspace.css+四 tsx inline+tailwind 类 | theme.test.ts（TOKENS 六正锚+FS_LITERALS 负锚矩阵（font-size 声明形态口径——px 通用值纯文本计数不可行）+@theme 重绑锁）+library-cards.test.tsx 三断言随迁 token 载体（实现者自裁申报在档） | 已锚定（2026-09-08 批二） |
+| INV-61 | 字号六档语义刻度单源：font-size 消费面禁字面量（CSS 声明/inline/arbitrary），tailwind text-xs/text-sm 经 v4 @theme 重绑到 --fs-* token——档位与锚值变更=用户裁决+本册 | P7D-01 批二用户裁决 2026-09-08（docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md）；token 定义=src/renderer/shared/theme.css :root --fs-* 段+@theme 重绑块，消费面=四皮肤件+library.css+workspace.css+四 tsx inline+tailwind 类 | theme.test.ts（TOKENS 六正锚+FS 正则全域负锚（任意数字 font-size 声明归零——新值/无分号/大小写/非 px 单位通道闭合；2026-09-09 F-CSS-02 升级）+@theme 重绑锁）+library-cards.test.tsx 三断言随迁 token 载体（实现者自裁申报在档） | 已锚定（2026-09-08 批二） |
 
 ## 维护规则
 
diff --git a/tests/unit/renderer/theme.test.ts b/tests/unit/renderer/theme.test.ts
index daaf899cd9..883f1bcaf7 100644
--- a/tests/unit/renderer/theme.test.ts
+++ b/tests/unit/renderer/theme.test.ts
@@ -393,11 +393,18 @@ describe('P7D-01 批二 字号六档语义刻度防线（消费面负锚+@theme
    * 裁决预期非缺陷+17 处仅换载体零视觉差）；tailwind text-xs×131/text-sm×25 经
    * v4 @theme 重绑并入单源（arbitrary 值 text-[10px] 不受重绑——tsx 面单改
    * var 载体）。
-   * 负锚口径注记（与批一 DURATION_COUNTS 的差异）：px 是通用长度单位
-   * （padding/radius/border 同值并存——实测 theme.css '12px' 现状 1 次为
-   * --radius-m 定义行，皮肤件非 font-size 声明同值多见），纯文本计数必误咬；
-   * 故负锚锚定「font-size: <字面量>;」声明形态（七 CSS 全 0），token 定义行
-   * 由 TOKENS 六正锚独立锁定——防护语义等价（定义正锚+消费负锚）。
+   * 负锚口径注记（F-CSS-02 升级 2026-09-09+回炉 1 补 calc 载体通道——正则
+   * 全域形态）：px 是通用长度单位（padding/radius/border 同值并存——纯
+   * 文本计数必误咬，批二教训），故负锚不锚文本计数而锚「font-size 声明
+   * 值段内任意 数字+单位 字面量」正则全域归零——/font-size:[^;{}]*
+   * [\d.]+\s*[a-z%]/gi：[^;{}]* 不跨声明界（;/{/} 即停）而值段中缀扫全，
+   * calc/clamp/min/max 载体内字面量（如 calc(12px + var(--fs-body))）同拦
+   * 而无单位乘算（calc(var(--fs-body) * 2)）不误咬；数字后任意单位首字符
+   * 即拦（px/pt/em/rem/% 全覆盖）；i 防大写变体绕过；不依赖尾分号（块末
+   * 声明合法无分号形态同拦）——较批二字面量枚举矩阵闭合其漏通道（新值/
+   * 无分号/大小写/非 px 单位/calc 载体——五通道）；var(--fs-*) 载体不误咬
+   * 前提=六 token 名全字母无数字且无 fallback 字面量；token 定义行由
+   * TOKENS 六正锚独立锁定——防护语义等价（定义正锚+消费负锚）。
    */
   const wsFsCss = readFileSync(
     fileURLToPath(new URL('../../../src/renderer/features/workspaces/workspace.css', import.meta.url)),
@@ -412,13 +419,10 @@ describe('P7D-01 批二 字号六档语义刻度防线（消费面负锚+@theme
     ['library.css', libCss],
     ['workspace.css', wsFsCss]
   ]
-  const FS_LITERALS = [
-    '9.5px', '10px', '10.5px', '11px', '11.5px', '12px',
-    '12.5px', '13px', '13.5px', '14px', '15px', '17px'
-  ]
-  const FS_COUNTS: Array<[string, string, string]> = FS_CSS.flatMap(([name, text]) =>
-    FS_LITERALS.map((lit) => [lit, name, text] as [string, string, string])
-  )
+  /** 任意「数字+单位」font-size 字面量（值段中缀全域——calc/clamp/min/max
+   *  载体内同拦，[^;{}]* 不跨 ;/{} 声明界；g 全域计数+i 大小写不敏感+无
+   *  分号依赖；match 带 g 不受 lastIndex 跨用例污染） */
+  const FS_DECL = /font-size:[^;{}]*[\d.]+\s*[a-z%]/gi
   const FS_TSX = [
     '../../../src/renderer/features/lineage/LineageNodeMeta.tsx',
     '../../../src/renderer/features/lineage/LineageNodeCard.tsx',
@@ -428,13 +432,10 @@ describe('P7D-01 批二 字号六档语义刻度防线（消费面负锚+@theme
     .map((rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'))
     .join('\n')
 
-  it.each(FS_COUNTS)(
-    'font-size 声明字面量 %s 在 %s 消费后归零（字号单源=--fs-* token）',
-    (lit, name, text) => {
-      const decl = new RegExp(`font-size:\\s*${lit.replaceAll('.', '\\.')}\\s*;`, 'g')
-      expect((text.match(decl) ?? []).length, `${name} 禁 font-size: ${lit} 字面量回填`).toBe(0)
-    }
-  )
+  it.each(FS_CSS)('%s 禁任意数字 font-size 声明（正则全域负锚——字号单源=--fs-* token）', (name, text) => {
+    const hits = text.match(FS_DECL) ?? []
+    expect(hits.length, `${name} 禁 font-size 值段数字字面量回填（含 calc/clamp 载体；匹配样例：${hits.slice(0, 3).join(' / ')}）`).toBe(0)
+  })
 
   it('四 tsx 禁 fontSize 数值字面量（inline 字号消费仅 var(--fs-*) token）', () => {
     expect(FS_TSX, '票面明文形态：单引号数字开头').not.toContain("fontSize: '1")

=== 回炉证据摘录 ===
-- c 支：植入 calc(12px + var(--fs-body)) → v1 正则（回炉前）不红 exit0:

exit=0
-- c 支：同植入 → v2 正则红（样例消息含 calc 载体）:
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m131 passed[39m[22m[90m (132)[39m
exit=1
-- 沙箱 18/18 误咬面实证（var 载体/无单位乘算不咬/混合 Npx 咬）:
f-css02-r1-c-v1-green.raw.txt
f-css02-r1-c-v2-red.raw.txt
f-css02-r1-full-test.raw.txt
f-css02-r1-lint.raw.txt
f-css02-r1-mut-a-enum-green.raw.txt
f-css02-r1-mut-a-v2-red.raw.txt
f-css02-r1-mut-b-red.raw.txt
f-css02-r1-regex-sandbox.raw.txt
f-css02-r1-targeted-green.raw.txt
f-css02-r1-typecheck.raw.txt

=== 实现者报告 §7 更正+§8 回炉节 ===
## 7. 更正节（回炉 1·门一 W3 数理更正——以实测口径为准，历史文字不动）

- **§1 「文件 455→451 行」有误**：theme.test.ts 起点实测 **454** 行
  （`git show HEAD:tests/unit/renderer/theme.test.ts | wc -l`）；首轮实现后
  451 行（454→451 净 −3，单文件 **16+/19−**——与门一实测一致）。
- **§1 「17+/20−」归因含混**：该数为 `git diff --stat` **两文件合计**
  （theme.test.ts 16+/19− + invariants.md 1+/1−），原上下文在叙述 theme.
  test.ts 单文件，应写单文件口径 16+/19−。
- **回炉 1 后终态重述（本节口径以此为准）**：theme.test.ts **455 行**
  （451→455 净 +4=头注扩 3 行+FS_DECL 注释扩 1 行）；`git diff --stat`
  终态=两文件 **21+/20−**（theme.test.ts 20+/19− + invariants.md 1+/1−），
  454→455 与 +20/−19 机器输出自洽；全量用例数 **1466 不变**（it 数结构
  未动，r1 全量绿复核）。
- **报告其余数字复核**（逐项对机）：§1 209→132（−77=84 枚举负锚−7 正则
  负锚）与 1543→1466 均机器输出 ✓；§1/§2「25 处 font-size 声明全 var
  载体」「七件零匹配」grep 实测 ✓；§3 表内全部 pass/fail 数与 exit 码均
  tee 落盘原文 ✓——除上述两项外无其他更正。
- **行号漂移声明**：§1/§6 历史文字中「:396-400」「:26 前」等行号为当轮
  快照，回炉后已漂移，历史文字不动。

## 8. 回炉 1 记录（门一 PWW 0B/4W/9N——主控裁决 3 修+2 不修）

### 8.1 修 1·W2 calc 绕行通道闭合

**正则终态（v2）**：

```js
const FS_DECL = /font-size:[^;{}]*[\d.]+\s*[a-z%]/gi
```

值首字符前缀锚 → 值段中缀全域：`[^;{}]*` 不跨声明界（`;`/`{`/`}` 即停）
而声明内扫全，calc/clamp/min/max 载体内字面量同拦。

**误咬面推演（沙箱 18/18 机器实证=f-css02-r1-regex-sandbox.raw.txt）**：

| 形态 | 判定 | 机理 |
|------|------|------|
| `var(--fs-body)` 纯载体（带/无分号） | 放 ✓ | 六 token 名全字母无数字+现状零 fallback 字面量→值段无「数字+单位」 |
| `calc(var(--fs-body) * 2)` 无单位乘算 | 放 ✓ | `2` 后为 `)`，无单位首字符——合法 token 乘算不咬 |
| `calc(12px + var(--fs-body))` / `calc(var(--fs-body) + 12px)` | 咬 ✓ | 值段中缀扫到 `12px`——混合形态 Npx 被咬（票面要求） |
| `clamp(10px, 3vw, 16px)` | 咬 ✓ | 同上中缀机理 |
| 邻声明 `padding: 12px` / 跨块 | 放 ✓ | `[^;{}]*` 遇 `;`/`}` 停——不越声明界 |
| `transition: font-size 0.2s` | 放 ✓ | 锚为 `font-size:` 字面（含冒号），值内词无冒号 |
| `font-size-adjust:` / `--fs-body: 12px` 定义行 | 放 ✓ | 前缀非 `font-size:`（token 定义由 TOKENS 正锚独立锁） |
| 无分号块末/大小写/枚举外新值/百分比/点开头 | 咬 ✓ | v1 既有四通道保持（回归沙箱+变异重跑） |

前提依赖登记（头注已记）：未来 token 名带数字或 var() fallback 写字面量
→负锚会红=负锚前提变化提醒，语义可辩护。注释内示例文本会被咬——W4 主控
已裁严格性非缺陷，知悉不改。

**c 支先红证（calc 植入）**：植入 `font-size: calc(12px + var(--fs-body));`
于 theme-buttons.css `.syn-btn-primary` 块末→v1 正则（回炉前形态）132 全
绿 exit=0（缺口实锤）→还原 v2（cp 备份法 diff 空自证）→1 failed exit=1
（样例 `font-size: calc(12p`）→还原植入（皮肤件 git diff 0 行）。

### 8.2 修 2·W3 数理更正

即 §7（454→451 起点/单文件口径/回炉后 455 终态重述+其余数字复核结论）。

### 8.3 修 3·N9 头注措辞

「闭合其漏三通道（枚举外新值/无分号/大小写与非 px 单位）」（括号列四称
三）→终态「闭合其漏通道（新值/无分号/大小写/非 px 单位/calc 载体——
五通道）」——按终态实列精确表述，theme.test.ts 头注已改。

### 8.4 不修项知悉（主控已裁）

- W1 新文件通道（FS_CSS 七件硬编码 vs 票面「新文件自动被拦」歧义）——
  落 F-LINT-01 lint 面设计输入+registry 注记，实现者不改。
- W4 注释内示例文本误咬——严格性非缺陷，知悉。

### 8.5 回炉 1 证据件清单（scripts/audits/，均含原始输出+exit 码）

| # | 证据件 | 内容 | 结果 |
|---|--------|------|------|
| 1 | f-css02-r1-regex-sandbox.raw.txt | v2 沙箱 18/18 矩阵+V1 calc 缺口实证+七件 V2 零匹配 | ALL PASS，exit=0 |
| 2 | f-css02-r1-targeted-green.raw.txt | v2 clean tree 靶向跑 | 132 passed，exit=0 |
| 3 | f-css02-r1-c-v1-green.raw.txt | calc 植入+v1 正则 | 132 passed（缺口），exit=0 |
| 4 | f-css02-r1-c-v2-red.raw.txt | calc 植入+v2（还原 diff 空） | 1 failed（样例含 calc），exit=1 |
| 5 | f-css02-r1-mut-a-enum-green.raw.txt | 13.5px 无分号+批二枚举锚模拟 | 132 passed（旧锚漏无分号），exit=0 |
| 6 | f-css02-r1-mut-a-v2-red.raw.txt | 还原 v2 复跑 | 1 failed，exit=1 |
| 7 | f-css02-r1-mut-b-red.raw.txt | 16px（枚举外+带分号） | 1 failed，exit=1 |
| 8 | f-css02-r1-full-test.raw.txt | 全量 `npm run test` | 156 文件/1466 用例绿，exit=0 |
| 9 | f-css02-r1-typecheck.raw.txt | `npm run typecheck` | exit=0 |
| 10 | f-css02-r1-lint.raw.txt | `npm run lint` | exit=0 |

还原安全照旧：皮肤件/测试件 cp 备份法（/tmp→变异→cp 还原→diff 空），
备份还原毕即删（零驻留）；皮肤件终态 git diff 0 行；改动面仍恰两文件
（`git diff --stat`：theme.test.ts 20+/19− + invariants.md 1+/1−）。

