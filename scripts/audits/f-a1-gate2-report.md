# F-A1 门二终审报告（三屋模式·ADR-0017）

> 审计代理：门二终审孙代理（只读；唯一可写=本档）。2026-08-30。
> 铁律遵守：零 npm/test/git 执行，仅 grep/read/wc 目视取证；全部结论对实物
> （终态源码+测试+证据档）核对，不采信报告转述。
> 技能清点：code-review-excellence（用）、verification-before-completion（用，
> 证据档数理复核）、test-driven-development（不用执行——铁律禁跑测试，仅按其
> 红证判据评估证据链）、systematic-debugging（不用——纯审计无调试面）。

## 裁决：PASS（0 阻断 / 2 微瑕备案 / 5 遗留移交主控收口）

---

## 清单 1 处置核对（门一 2W/5N + 主控裁决 vs 终态实物）

| 项 | 处置要求 | 终态实物核对 | 判 |
|---|---|---|---|
| W1 | fixture 头注"取证在档"改推演表述 | `tests/utils/pdf-factory.ts` L98-108 现文：L100-102 保留 24pt 真取证（f-a1-e2e-forensic 在档）；L103-106 改为「推演：overlap=25.6−leading≥0.25×25.6=6.4 即并，18pt 时 overlap 7.6 满足；开发期实测过一次未留档，故此处记推演不记取证，门一 W1 裁定表述与档对齐」。全文 grep「取证在档」**零残留**；无重复块（头注单段连续，旧句已整体替换）。改动限定在受锁授权面内（pdf-factory 为票面授权文件） | **已真改** |
| W2 | M4/M5 红点勘误追记 | `f-a1-impl.report.md` §七（L129-135）在档：M4=3 红/M5=5 红含组件连带，注明「誊录缺项非证据缺口」。对 raw 档实证：M4 档 FAIL 行 L3003(④)/L3015(⑧b)/L3027(annotation-layer 用例1)=3 红 ✓；M5 档 L3011(④)/L3030(⑤)/L3049(⑧a)/L3068(⑧b)/L3087(组件)=5 红 ✓——勘误数字与档**逐一对上** | **已落档** |
| N1~N5 | 记录性备忘（tie-break/反向边界/证据分工三档/紧行距定性/skipIfPending 形态） | 全文载于 `f-a1-gate1-report.md` §统计（L97）；均无需代码处置的裁决，收口处置见遗留项 4 | 落档 |

**清单 1 结论：门一全 findings 处置 100% 兑现，无「说了没改」。**

## 清单 2 母本符合度（票面+设计文档 vs 终态源码目视）

**算法六步**（`annotation-merge.ts` 132 行全文目视）：

| 步 | 票面 | 实现 | 判 |
|---|---|---|---|
| ① | 滤零宽 w<=W_MIN，W_MIN=1/612 | L72 `filter(r => r.w > W_MIN)`；L48 `W_MIN = 1/612` | 符 |
| ② | (中心y,x,y) 全序 | L77-79 三段 comparator（`centerY→x→y`） | 符 |
| ③ | 与全部簇比、取最近、容差 min(hNew,hRowMedian)/2、中位随簇维护 | L86-101：遍历全部 rows、L88 双条件 `dist<=nearestDist && dist<=min/2`、L99-100 入簇即重算下中位 | 符 |
| ④ | x 并集/h 与中心y 下中位/page 最小；单成员恒等 | L104-121：L106-108 单成员全字段透传（deep equal 恒等根）、L110-120 多成员归并、L50-54 `lowerMedian` 索引 floor((n-1)/2) | 符 |
| ⑤ | 行间钳制 y_i >= bottom_{i-1} | L124-128 只下推 y 不动 h | 符 |
| ⑥ | 输出 (y,x) 稳定排序 | L131 | 符 |

**两挂点**：挂 A=`annotation-anchor.ts` L325-339 `rectsBetweenPoints` 尾部 `return mergeRects(pixels.map(…))`（clamp01 截断在前，票面指定顺序）；挂 B=`AnnotationLayer.tsx` L191 `mergeRects(resolved[a.id] ?? a.rects).map(…)`。头注补句两文件均在（anchor L24-26 读时归并口径 / Layer L10-12 INV-E 句）。

**恒等性**：单块 L106-108 透传不经中心 y 浮点往返；幂等由 ⑦ 测试（L109-121）+ 门一 C.4 IEEE754 bit-identical 数学验证双锚。INV-A~E 头注在 merge.ts L4-14 逐条可读。

**测试面**：`annotation-merge.test.ts` ①~⑩ 全在（11 个 it，⑧拆 a/b 双锚=票面单条两断言的等价实现）；`annotation-layer.test.tsx` 挂 B/INV-E 双用例（pageRoot=null+存量缺陷态夹具，L82-104/L106-119）；e2e F-A1 用例 L707-789（渲染面 INV-C/A+块数=行数+保存面挂 A 读库断言+quote 首末行防假绿锚）。无缺项。

**与设计文档 §3 的偏差均有主控预裁覆盖**：W_MIN=1/612 归一化域 vs 文档"滤 w<1px"（预裁 1）；x 并集不保留栏间断段（预裁 2）；容差 min(h)/2 可比高度读法（预裁 3）；中位数非主导（预裁 4）；selection-layer 不扩（预裁 5）；zeroRect 删除（预裁 6——grep src/+tests/ 零残留实证）。

**清单 2 结论：母本符合度成立，全部偏差在预裁授权内。**

## 清单 3 宪法红线终审

- **分层单向**：renderer 特性内横向 import；annotation-merge 零 DOM/React（仅 `import type`）；AiAnnotationLayer 零引用 mergeRects（=零改实证）；anchor 仍是唯一 DOM 遍历点。
- **受锁与授权面**：locks:check 6 红项（`f-a1-verify.raw.txt` L35-40）=4 本票授权面（reader-text.spec 改+pdf-factory 改+两新测试文件未登记）+2 主控预置脚本（f-a1-forensics.mjs/f-a2-retest.mjs）——与票面受锁面清单**逐项吻合，无越权第 7 项**；实现者未跑 locks 命令 ✓。
- **安全禁令**：三源文件 grep `eval|new Function|nodeIntegration|require(|process.|ipcRenderer|fs.` **零命中**。
- **行数**（wc 实测）：merge 132 / anchor 475(<500) / Layer 238(<250) / merge.test 170 / layer.test 120 / reader-text.spec 789（`eslint.config.js` L189 tests 豁免 max-lines:'off'，既有配置） / pdf-factory 125。
- **UTF-8**：七文件中文注释抽读全部可读（头注/断言注释/夹具名）。
- **TDD 证据链四档**：
  1. 首红全量口径：`f-a1-first-red.raw.txt` 3076 行=全套套跑，exit=1；merge suite 级红（L11 模块不存在）+layer 2 红（L95 4≠2/L118 1≠0）+既有 911 绿；
  2. 变异红证：M1 exit=1（annotation-layer 2 红 L2881-2884）/M2 vitest 924 全绿 exit=0+e2e L779 红 exit=1（定向理由合规）/M3 exit=1（①红）/M4 exit=1（3 红）/M5 exit=1（5 红）——五档 exit 码与勘误后清单全部对上；
  3. 还原安全：文件备份法申报在案（禁 git checkout）；终态 7 文件与 gate1.diff 文件面（L1/34/93/231/362/488/664 七个 diff --git）一致、无变异残留痕迹；
  4. 证据落盘：10 档 .raw.txt + forensic + clipboard-retry + baseline 全在（ls 时间戳 01:21-01:53 连贯）。
- **TODO/FIXME/placeholder**：七文件 grep 零命中（quality:check 亦过：无占位/无乱码/无跨域）。

**清单 3 结论：无红线违例。** 微瑕备案 2 条（不阻断）：①门一报告写「eslint.config.mjs」，实际文件为 `eslint.config.js`（文件名笔误，L189 豁免内容核过实在）；②impl.report 文件清单表记 pdf-factory 122 行、终态 125 行——差 3 行源自主控 W1 直修头注扩写（L103-106），授权面内合理漂移。

## 清单 4 机器面核对

- **数理一致**：`f-a1-verify-rest.raw.txt` 110 文件/924 用例=基线 108/911+新增 13（merge 11+layer 2）✓；test-exit=0（L2996）；lint-exit=0（L7）/typecheck-exit=0（L14）；`f-a1-verify-build.raw.txt` build-exit=0（L35）。verify 链=verify.raw（quality+tickets 过+locks 红为预期）+verify-rest（lint/typecheck/test）+verify-build 三档分工（N3 口径）。
- **e2e**：`f-a1-e2e-final.raw.txt` 11 用例全绿（既有 10+F-A1 新 1，L707）exit=0 ✓。
- **locks 状态**：`locks/manifest.json` 175 条=基线；reader-text.spec（L233）+pdf-factory（L685）在册（sha 待 re-generate=「被修改」红）、两新测试文件+2 主控脚本未登记——**全部待收口 locks:generate+apply，与预期解锁态吻合**。
- **registry**：`tickets/registry.ts` grep F-A1 **零命中**——LOOP 会话票未触 registry ✓（票面明令）。
- **主控真库取证**：`audit0-out/f-a1-verify.json`——高亮 count 5/realCount 5/zeroW 0/gaps [1.9×4]/intersections []/dupPairs []/pass true；下划线 count 4/zeroW 0/gaps [5,6.9,6.8]/pass true；verdict **PASS**。设计文档 §5 验收量化（7→5=行数、零宽 0、gaps 全≥0、相交面积 0）**全部兑现**；下划线滚动虚拟化两轮不同页等价划选定性与任务输入一致。

**清单 4 结论：机器面全部对账。**

## 清单 5 成本账本行

| 单元 | token | 工具调用 | 时长 | 口径 |
|---|---|---|---|---|
| 实现者 | 9.62M | 91 | 31.2 分钟 | 派发回执（impl.report 头部无 usage 行，按主控台账口径引用） |
| 门一深审 | 1.48M | 28 | 7.0 分钟 | 派发回执 |
| 门二终审（本档） | ≈0.16M | 21 | ≈8 分钟 | 自报估算 |

## 遗留项（移交主控收口）

1. `locks:generate` + `locks:apply`（4 本票授权面+2 主控脚本共 6 红项）+ [locked-change] 尾注提交——门二已核红项与授权面逐项吻合；
2. INV-40 登记 `docs/invariants.md`（文案就绪：impl.report §六.1）；
3. 全量 e2e 28 基线复跑（实现者仅单跑 reader-text 11 绿）；
4. 可选（非阻断）：N1 聚类等距 tie-break 语义（取后遍历簇=创建序）可随 INV-40 登记文案或 merge.ts 头注补一句，消除「实现确定但票面未指定」的悬空；
5. 成本账本三行入战役台账（上表）。

**总评：PASS。实现、测试、证据链、处置兑现四面对实物终审全部成立；微瑕 2 条仅备案不回炉。**
