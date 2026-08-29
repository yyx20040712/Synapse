# F-A1 门一对抗深审报告（三屋模式·ADR-0017）

> 审计代理：门一深审孙代理（只读；唯一可写=本档）。2026-08-30。
> 输入：f-a1-gate1.diff（7 文件 +576/−20，与工作区 `git diff --stat` 逐文件核对一致）
> / f-a1-ticket.md / f-a1-impl.report.md / 证据日志 9 档（另发现 f-a1-verify.raw /
> f-a1-verify-build.raw / f-a1-impl-green.raw / f-a1-baseline-verify.raw /
> f-a1-e2e-reader-text.raw / f-a1-e2e-clipboard-retry.raw 六个过程档）。
> 技能清点：code-review-excellence（用）、javascript-testing-patterns（用）、
> verification-before-completion（用）、test-driven-development（按红证原则评估，
> 不写码）、systematic-debugging（不用，只推演）。

## A 母本符合度（diff vs 票面五层）

**行为层——算法六步逐条**（diff L99-230 = annotation-merge.ts 全文）：

| 票面步骤 | 实现 | 判 |
|---|---|---|
| ①滤零宽 w<=W_MIN，W_MIN=1/612 | L72 `filter(r => r.w > W_MIN)`，L48 `W_MIN = 1/612`；边界 w==W_MIN 被滤（票面"不 入集合"） | 符 |
| ②(中心y,x,y) 全序排序 | L77-79 comparator 三段 || 链 | 符 |
| ③与全部簇比中心距取最近，容差 min(hNew,hRowMedian)/2，中位数随入簇维护 | L86-101 遍历全部 rows、L88 `dist <= Math.min(r.h, row.medianH) / 2`、L99-100 入簇即重算下中位 | 符 |
| ④行内 x 并集/h 中位/中心y 中位/page 最小；下中位 floor((n-1)/2) | L110-120；单成员恒等分支 L106-108（票面恒等性要求的实现强化——不经中心 y 浮点往返） | 符 |
| ⑤行间钳制 y_i>=bottom_{i-1} | L124-128，只下推 y 不动 h | 符 |
| ⑥输出 (y,x) 稳定排序 | L131 | 符 |

- **两挂点**：挂 A=annotation-anchor.ts L325-337（归一化 map 后收口 `return mergeRects(...)`，diff L73-81）；挂 B=AnnotationLayer.tsx 渲染处 `mergeRects(resolved[a.id] ?? a.rects).map`（diff L30）。两处均与票面逐字对齐。头注补句两文件均在（diff L10-13 / L42-44）。
- **恒等性**：单块 deep equal（L106-108 全字段透传）✓；幂等数学验证见 C 节——**成立**。
- **既有行为不变面**：e2e 既有 10 用例全绿（f-a1-e2e-final.raw.txt L6-16，含「单行划选恰 1 矩形」用例 2/5/6）；selectionToAnchor 的 quote/prefix/suffix/start/end 零改（diff 未触碰该函数）；rectStyle/annotation-style 零改（diff 无该文件）；跨页/toast/undo/Escape 链零改（SelectionLayer.tsx 无 diff）。
- **zeroRect**：票面授权"死代码即删（自裁申报）"——diff L89-92 删除，`grep -rn zeroRect src/ tests/` 零残留。
- **测试清单①~⑩**：annotation-merge.test.ts L530-663 逐条在（①L530 ②L543 ③L555 ④L567 ⑤L577 ⑥L595 ⑦L602 ⑧a L616 ⑧b L628 ⑨L637 ⑩L651——⑧拆 a/b 双锚，票面单条含两断言，等价）。组件测试（挂 B/INV-E，pageRoot=null+存量缺陷态夹具）L448-487。e2e 多行用例 L707-789。**无缺项**。
- **变异 M1~M5**：五档全在、exit 码与报告一致（M1=annotation-layer 2 红；M2 vitest 全绿 exit=0+e2e L779 红 4≠3 exit=1；M3 ①红；M4 ④+⑧b 红；M5 ⑧a+⑧b+④+⑤ 红）。M2"红点落全量口径或定向理由"——报告申报定向理由（挂 A 不在单测面，vitest 全量绿本身即证据），合规。
- **超额项**（全部自裁申报）：组件第 2 用例（自裁 6，纯加强）；e2e 保存面断言（自裁 2，主控预裁 4 已核准）；seedAndLaunch bytes 默认参数（自裁 4，预裁 6 核准；既有调用点 diff 零改动核实）；fixture 24pt（预裁 5 核准）。**无未申报超额**。

**接口/架构/生命周期层**：annotation-merge.ts 纯函数零 DOM/React（仅 `import type`，L45）✓；anchor 475 行<500、AnnotationLayer 238<250、merge 132——红线全过；零新依赖/零 shared/零 CSS（diff 无 package.json/shared/*.css）✓。

## B 宪法红线

- **新测试 always-active**：两测试文件 describe/it 直书，`guardedDescribe` 仅出现在头注说明文字（grep 核实），无实际使用 ✓。
- **断言行尾中文注释同置**：组件测试 L461-468、e2e L344-347 等断言与注释同置 ✓。
- **死代码**：zeroRect 零残留 ✓。
- **文件行数**：≤500/250 全过；tests 789 行超 500 但 eslint.config.mjs L186-190 `files: ['tests/**/*.ts','**/*.test.ts'] max-lines:'off'` 豁免（既有配置，非本票引入），lint-exit=0 印证。
- **UTF-8**：diff/源码中文全部可读 ✓。
- **分层单向**：renderer 特性内横向 import，annotation-merge 零 DOM ✓。
- **受锁面与 [locked-change] 授权一致性**：f-a1-verify.raw.txt 尾部 locks:check 6 红项=4 本票授权面（reader-text.spec 改+pdf-factory 改+两新测试文件）+2 主控预置脚本——与票面受锁面清单及自裁 9 完全吻合；实现者未跑 locks 命令（票面明令）✓。
- **禁新依赖**：无 package.json/lockfile 变更 ✓。
- **TODO/FIXME/placeholder**：7 文件 grep 零命中 ✓。

**B 项：无。**

## C 代码与测试质量（算法独立推演）

1. **聚类容差边界**：
   - 同中心不同高：dist=0 恒 <=min/2 → 并入（同中心必同文本行，正确）。
   - **高瘦先入簇（反向边界）**：min 钳制保护的是"高瘦块作为新块"方向（测试⑧a tall 先入簇、line 后进不并 ✓ 实测核）；反向"行块进入高瘦簇"仍可能——行块中心落入高瘦簇中心 min(h_row,h_tall)/2=h_row/2 内即被吸入。后果：h 取下中位保住行高（[0.128,0.019] 下中位=0.019）、中心 y 取下中位（高瘦中心）→ 视觉半行级偏移，无叠深（INV-A 不破）。物理前提=横排行与竖排块中心几乎重合，极端理论态；票面预裁 3 容差公式明文语义内。**[N2]**
   - **簇中位数随入簇漂移**：medianC 下中位使漂移半程受抑（每入一簇中位移动 ≤ 新成员距），链式吸入最多再延 1 块；红行距（中心距=h）恒 > h/2 不误并 ✓（⑧b 实测：dist 0.019>0.01 分立）。边界 dist==容差恰等时并入（`<=`），确定性无歧义。
2. **钳制连锁传播**：⑤只增 y 不动 h；归纳可证 y_i' 与 bottom_i'=y_i'+h_i 均单调不减 → 两两分离 INV-A 构造成立。连续负间隙下推=设计语义（恰好接触链）✓。
3. **clamp01 截断与聚类相互作用**（挂 A 专属）：截断在 mergeRects 之前（票面指定顺序，diff L73-81 ✓）。跨页顶/底选区截断后同 y 块中心距 0 → 并簇（INV-A/B 仍满足，可接受）；w 截为 0 的块被 INV-C 滤（zeroRect 删除的兜底语义被 ①接住）。空数组链路核实：幽灵-only 选区 → SelectionLayer.tsx L141-144 `box.width===0 && box.height===0` 收起兜住；重锚路径 rectsFromRange L289 `rects.length>0` 判空兜住——票面预裁 6"调用方判空语义既有"**成立**。
4. **幂等性数学验证（重点攻击）**：
   - 单成员恒等路径不经中心 y 浮点往返（L106-108 全字段透传）→ 二次输入每行一块各走恒等 → 值不变。
   - 钳制浮点往返：一轮钳制赋值 `y: prevBottom`（=表达式 `merged[i-1].y + merged[i-1].h` 的求值结果）；二轮重算同一对 double 的同一加法 → **bit-identical** → `merged[i].y < prevBottom` 为 false 不再动。幂等在 IEEE754 下成立。
   - 二次聚类稳定性：一轮输出相邻行恰好接触时中心距 dist=c1+h1/2+h2/2−c1=h1/2+h2/2 ≥ min(h1,h2)/2（等号 h1==h2 时 dist=h>h/2）→ 恒不误并。数学保证成立，⑦实证绿。
   - centerY 浮点误差（a−b+b≠a）仅参与比较不参与输出，无路径进入结果。
5. **排序确定性**：②comparator 全序（中心y→x→y，坐标域无 NaN）；等距 tie（③`dist <= nearestDist`）取后遍历簇=rows 数组序（创建序=y 升序），确定但票面未指定 tie-break 语义。**[N1]**
6. **恒真风险**：①~⑩+组件+e2e 各断言均被首红或 M1~M5 变异实证能红（首红 4≠2/1≠0；M3 ①红；M4 ④⑧b+组件红；M5 5 红；M2 e2e 4≠3）。①中 `W_MIN>0.0005` 是常数卫兵（M3 时 0>0.0005 为假亦红），非恒真。**全部测试具备失败能力。**
7. **e2e 断言强度**：块数=3 经取证锚定——f-a1-e2e-forensic.raw.txt 实录 raw clientRects 6 块缺陷族（2 幽灵 w:0 + 行2 h18/h25.6 双计量同位 + 3 行盒）→ saved 3 块（y 间隔 0.03232==h 恰好接触，浮点贴合）→ render 3 块（正间隙 ~5.6px）。渲染面 0.5px 容差（像素域量测噪声）与保存面 1e-9（归一化域数学精确）双口径有据。quote 含首末行文本锚防单行假绿 ✓。

## D 报告诚实性（自裁 9 条逐条对档）

| # | 自裁 | 核实 | 判 |
|---|---|---|---|
| 1 | chmod 临时解锁已恢复 | Windows/GitBash 下只读属性痕迹不可从 git 见；两文件内容与票面授权面一致、无越权改动 | 按声明采信+标注 |
| 2 | e2e 读库断言纯加强 | spec 保留票面全部渲染面断言（零宽/分离/块数）+增保存面；M2 红点依赖它 | 采信 |
| 3 | fixture 24pt"取证在档" | 24pt 成功取证在 forensic 档 ✓；**但"18pt 并簇取证在档"不实**——全部 f-a1-*.raw.txt 无 18pt 失败实录（forensic 01:44 仅 24pt；18pt 尝试输出未落盘/被覆盖）。18pt 并簇结论本身经我独立推演证实（h_box=25.6, leading=18 → overlap=7.6≥0.25×25.6=6.4 → 并簇成立），且 fixture 头注（pdf-factory.ts L685-686）"取证在档"一句已成无据声明并将随 locks 固化 | **[W1]** |
| 4 | seedAndLaunch bytes 默认值零影响 | 默认参数=原表达式字面；diff 内既有 8 调用点零改动 | 采信 |
| 5 | M5=0.05 | ⑧a dist 0.03/⑧b dist 0.019 均 ≤0.05 双锚红，档实证 5 红 | 采信 |
| 6 | 组件第 2 用例加强 | 纯增断言无删减 | 采信 |
| 7 | M2 首跑语法坏重做 | 坏跑输出被覆盖过程如实申报；干净跑（vitest 绿+e2e 红）有效 | 采信 |
| 8 | P7-A 剪贴板 flaky | f-a1-e2e-reader-text.raw.txt（失败"基于 audit0-findings 台账开工"）+f-a1-e2e-clipboard-retry.raw.txt（1 passed）双档在 | 采信 |
| 9 | 两主控脚本归属 | locks:check 红项与 f-a1-forensics.mjs 头注（验收取证复跑脚本）印证；时间戳先于会话 | 采信 |

- verify 关卡声明"逐项 ✓"：证据实际分三档——f-a1-verify.raw.txt（quality+tickets 过+locks:check 红为预期）+ f-a1-verify-rest.raw.txt（lint/typecheck/test exit=0，924 全绿）+ f-a1-verify-build.raw.txt（build-exit=0）。链条完整但报告未注明分工。**[N3]**

## E 接缝与后续单

- **F-A2（工具条）/F-A3（选择模式）**：SelectionLayer.tsx 零 diff；pending→save 链 rects 只换内容不换语义（落库前 map 改写 page 的既有逻辑不变，L213）——接缝干净。
- **AiAnnotationLayer/AiNote 高亮**：零改 ✓；其 rects 全产自 findRangeAtOffset→rectsBetweenPoints（挂 A 自动同口径），头注明示"唯一 DOM 遍历点/同一几何函数族"（AiAnnotationLayer.tsx L9-12），无存量 rects 回退面——票面"AiAnnotationLayer 零改"与现场一致。注意其渲染处**未**过挂 B（与 AnnotationLayer 不对等）——因输入已过挂 A，几何等价，票面预裁内。
- **F-11 收边**：rectStyle 零改；收边（顶 10%/底 12%）使分离更宽（组件测试数学验证：firstBottom=30.2+1.56=31.76≤32.2）——与 INV-A 同向无冲突。
- **主控预置脚本归属**：f-a1-forensics.mjs（真实库取证复跑，产物 audit0-out/f-a1-verify.json）+f-a2-retest.mjs 的 locks 登记归主控收口 ✓。
- **INV-40**：实现者未触 invariants.md（diff 无），登记文案在报告疑虑 1 供主控——符合票面生命周期层分工。
- **预裁 2（紧行距并簇）复核**：mergeLineRects L359 `Y_OVERLAP_RATIO_MIN=0.25`+L410 门槛推演——并簇条件 leading ≤ 0.75×h_box；取证行盒 h25.6（1.42×字号）→ leading ≲1.07×字号时并簇，与主控数字吻合。后果=像素域 3 行并 1 大块（y 并集膨胀连锁，实现者 18pt 实录方向一致）；归并器对已并簇块无拆分能力（中心距 0）但 INV-A 不破（单块无叠深）——**维持"既有缺陷（非本票引入）、真实库未触发（p1b 负间隙 -1.5~-5.5 保留分立）"定性，reachable 面未扩大**（学术排版 leading 常态 ≥1.15×；<1.07× 仅紧排参考文献/表格）。不升 B。**[N4]**

## 统计与总评

**0B / 2W / 5N**

- **W1**（报告诚实性）：自裁 3"18pt 并簇取证在档"与 fixture 头注"取证在档"无对应原始档（全部 raw 无 18pt 失败实录）。结论经独立推演证实无误，但该取证缺失且不实声明将随 locks 固化进受锁测试文件注释。
- **W2**（报告精确性）：M4/M5 红点清单漏列组件层连带红——M4 实测 3 红（④+⑧b+annotation-layer 用例 1），报告只列④⑧b；M5 实测 5 红（+组件 1），报告只列④⑤⑧a⑧b。证据档本身完整（exit=1 全在）。
- N1 聚类等距 tie-break 取后簇（确定性保证，票面未指定）；N2 行块入高瘦簇反向理论边界（预裁 3 语义内）；N3 verify 三档证据分工未注明；N4 紧行距并簇维持既有缺陷定性（后果整段单块非叠深）；N5 e2e 新用例 skipIfPending 形态随既有 spec（F02 已 done，实跑无 skip）。

**总评：PASS**（无回炉必须项）。建议主控收口时顺手处置：
1. W1：修正 pdf-factory.ts 头注取证指向（或补落 18pt 并簇取证后再锁）——受锁文件再动需 [locked-change]；
2. W2：报告勘误（不影响裁决）；
3. 收口单既定流程：locks:generate+apply（含 2 主控脚本登记）+INV-40 登记+全量 e2e（28 基线）。

## 追记(2026-08-30 主控处置后失误——如实入档)

本报告 N3 引用的三档证据之首 `f-a1-verify.raw.txt`(实现者中间态
verify:quality+tickets 绿+locks:check 6 红预期)在两笔收口提交之后被
主控误判为无引用残留**删除**——删前 grep 核对命令的输出被误读(3 处
引用即本报告)。未跟踪文件不可再生。证据链闭合性不受损的佐证:同档
结论由 `f-a1-verify-rest.raw.txt`(lint/typecheck/test 924 绿)+
`f-a1-verify-build.raw.txt`(build exit=0)+主控收口三轮 verify
(f-a1-closeout-verify/audit0-batch2-verify,locks:check 180 绿终态)
覆盖;locks:check 6 红项清单另由 manifest 179→180 变更史独立佐证。
教训:删除任何 scripts/audits/ 产物前 grep 引用面须含全部报告档并逐条
目视确认输出,不得凭记忆跳读。
