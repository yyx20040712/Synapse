# SR2-F-03 门一对抗深审档（滚动进度回写恢复与键位迁移）

> 审计人=门一深审子代理（三屋 ADR-0017）；对象=SR2-F-03 实现单元。
> 输入=f03-gate1.diff（1164 行）/票面（scroll-progress.ts 头注+p7f-ticketing-draft.md §SR2-F-03）/
> f03-impl.report.md/f03-*.log 九件。**只读独立核实**（禁 npm/test——实现者自证
> verify+e2e 双 EXIT=0；主控收口亲验）。
> 方法：diff 逐 hunk × 源文件/测试实读 × git 历史/HEAD blob 核对 × sha256 独立重算 ×
> 日志交叉验证。开工技能清点：code-review-excellence 用；verification/TDD/debugging
> 不用（只读审计无实现面）。

## 逐工单结论

### A. 母本符合度 —— 全项成立

| 项 | 核实 | 结论 |
| --- | --- | --- |
| 六态逐格 | scroll-progress.test.tsx `describe('六态全格')` 11 用例：idle→scrolling（:103）/scrolling 防抖窗内零写窗到即写（:111，1999/2000ms 边界）/pending 决定档（:122，mockImplementation 观察 stateOf==='pending'）/writing→idle+{scroll:'none'}（:133）/writing→scrolling W2 新格+迟到完成不回落（:144，writeSeq 双守卫）/restoring→scrolling 三类信号接管（:159）/restoring→idle 到位（:169）/restoring 中程序自发 scroll 不记账 W-B（:177）/loading→restoring+loading 中 scroll 忽略（:185）/idle→restoring 程序跳页入账（:197）/就位快径（:204） | ✓ 逐格有 it |
| 跨格五序列 | S1 滚动→切 tab→回恢复记忆页（:216，失配档丢弃回写+scrollToPage(1)）/S2 滚动中关 tab flushPending 立即落库不双写（:230）/S3 pending 中关 tab 窗内立即 flush（:239）/S4 程序跳页与用户滚动竞态接管后回写实际页（:249）/S5 回写竞 tab 切换失配只丢 setPage 账照落（:258） | ✓ 逐序列有 it |
| writing 用 'none' | 测试 :137/:156 断言字面；M1 变异（'none'→'to'）4 failed 红 | ✓ |
| 就绪时夹取恢复页顶 | onColumnReady→deps.scrollToPage→store.setPage clamp（reader.store.ts :313 `Math.max(0,Math.min(Math.floor(page),totalPages-1))`）+PageColumn 段⑤ clampPageToColumn（PageColumn.tsx :204）双层夹取——scroll-progress 头注「W-A 由 scrollToPage 消费面 PageColumn 段⑤ clamp 承载」表述与实物一致 | ✓ |
| PAGE_KEYS 四键滚动步+空格 | ReaderShortcuts.ts PAGE_KEYS 四键→scrollByRatio(±SCROLL_STEP_RATIO 0.9)（ReaderPage 注入 scrollBy）+空格 spaceScroll(1) 满屏；常量单源导出+测试锚 0.9（M9 变异红证）；editable 避让测试（textarea 内不接管+不 preventDefault） | ✓ |
| ctrl+wheel 零触碰 | diff 中 ReaderShortcuts wheel 段（:94-102 区域）无改动行 | ✓ |
| STUB 删净 | `grep -rn SCROLL_PROGRESS_STUB src/ tests/` exit 1 零残留 | ✓ |

### B. 宪法红线 —— 无 B；一 W（行数口径）

1. **受锁面逐 hunk 无放宽**：
   - reader-shortcuts.test.tsx：纯增量（import describe/SCROLL_STEP_RATIO、makeActions+spaceScroll、裸 describe 3 用例），既有 SR2-KEY-02 用例零触碰。
   - reader.store.test.ts：两旧进度用例**改写**为拆链后契约（旧「两 tab 各自翻页防抖到点各自落库」/「closeTab flush saveProgress」→新「5s 零调用」/「flush 回调接线」）。性质=架构语义迁移后的必要重锁（旧断言在新架构恒红），票面文化层明示「reader.store.test（受锁扩：拆链后 per-tab 进度回归——B3 补）」授权；且 M7 变异（flusher 接线删除）→1 failed 红，证新断言非恒真。S1~S30 其余零触碰（diff 范围核对）。
   - anchor-locate.test.ts：纯新增 S12a/S12b（W3 回归），S1~S11 零触碰。
   - reader-text.spec.ts：纯新增批 3 用例（+92 行），既有用例零触碰。
2. **[B→澄清，非违规] .tsx 后缀疑点**：git ls-tree HEAD 显示 `tests/unit/renderer/reader-shortcuts.test.tsx` 原后缀即 .tsx（HEAD blob ad528cb 与 diff 旧 index 同一 hash）；`git log --all -- reader-shortcuts.test.ts`（.ts 路径）零记录。**结论：非重命名**，主控担心的「旧 .ts 未删+manifest 双计」不存在；manifest 中该条目为原位 sha 更新，141→142 净增=scroll-progress.test.tsx 一条。实现者自裁 6 申报的 .tsx 后缀问题是**新建 scroll-progress.test.tsx 自身**的 tsc 工程归属问题（.ts 后缀 import PageColumn.tsx 链在 node 工程报 TS6142——jsx 未设），处置合理，受锁 tsconfig 零改动。
3. **[W1] scroll-progress.ts 339 行**：ESLint max-lines=500（skipBlankLines/skipComments）机检过；非组件非 repo。但主控简报④字面「组件/模块行数 ≤250」超 89 行，且文件现含三段职责（纯状态机+装配工厂+wiring hook）与宪法「出现第二职责就拆文件」有张力。实现者自裁 5 申报了下沉动机（ReaderPage 250 驱动，裸装配 269 超限）**但未直面申报 339>250 数值偏差**。行为无缺陷——裁量归主控（建议：本单可过，收口单记录；若 F-04 后再增长即拆装配段）。
4. 行数：store 415 ✓（见 D2）；ReaderPage 249 ✓；anchor-locate 282（.ts 非组件，ESLint 500 内 ✓）。
5. 零依赖 ✓：git status 无 package.json/lockfile 触碰。
6. UTF-8 ✓：全部产物中文实读正常+verify quality 关卡「无乱码」过（log :15）。

### C. 代码与测试质量

1. **时间全注入** ✓：ScrollProgressDeps.now/timers 注入口存在；测试经 vi.useFakeTimers 驱动（deps.timers 消费被 fake 化的全局）；装配工厂用真 timer/Date.now 属装配面合法形态（票面只约束 createScrollProgress 核）。
2. **per-tab Record 记账+getPaperId 失配丢弃** ✓：pending Record<string,number>+papers Map；fire() 读 activePage→flushLedger 全账照落→失配 return 只丢 setPage（scroll-progress.ts fire 段，diff :713-728）——「只丢回写不丢账」S1/S5 双锚。
3. **防抖拆链 store 行为等价** ✓：closeTab→`get().progressFlusher?.flush(id)`、close→flushAll()、setPage 不再碰账（reader.store.ts :490-518 实读）；既有 store 用例全绿+接线 3 用例+M7 红。依赖单向成立：reader.store **不** import scroll-progress（diff 实核），scroll-progress→store/api/PageColumn（nearestPage），无环。
4. **[W2] 变异日志质量**：f03-mutation.log 已落盘（F-02 W2 教训吸收 ✓）——9 轮各一行：变异摘要+EXIT=1+失败数（M6 行缺失败数，报告补 1 failed）+「还原diff空」。缺口：①缺「目标 it 名称」明细，无法从日志直接复核单 token 性与红的具体断言（须与报告+测试交叉）；②M6 首轮 sed 语法错误过程被清理未留档（报告诚实申报，但不可复核）。判定 W 非 B：九轮均可经报告↔测试↔变异点三角交叉验证自洽（如 M5↔S12b、M8↔e2e selection-toolbar）。
5. **W3 实现形态** ✓：anchor-locate.ts :172-179——pageRoot 在→页内查；缺席→`querySelectorAll('.textLayer')`，`all.length === 1` 才用，>1→null 继续轮询→3s 超时 page 降级 toast。S12a（恰一→exact 保持单页宿主兼容）/S12b（两→page+toast+scrollIntoView 零调用）+M5 变异（≥1 取首）1 failed 红。
6. **N4 实现形态** ✓：SelectionLayer 从「anchorPage===no 条件渲染挂页盒」改挂**内容级稳定包装盒**（ReaderPage.tsx :242-250，relative div 包 PdfDocProvider+PageColumn，ref=setSelectionMount）；page=0 弃用位（F-02 动态锚定：closestPageRoot/pageIndexOf 内部推导，SelectionLayer :53-68 实读）；坐标基准=mountBox.getBoundingClientRect()（:134）——盒换=常数换算恒等，数学不变。滚动中锚定页切换不再重挂→工具条不闪收；e2e 断言（划选→上滚→toolbar 仍 visible）+M8 红证（忠实变异 pageRoot 随锚定页重绑→e2e 精确红；首试 key={anchorPage} 过烈弃用有留档）。
7. **e2e 批 3 守卫+spec 备份法** ✓：skipIfPending(F03_DEPS)（reader-text.spec :350）；取证=cp 备份→sed skipIfPending([]) 唯一命中→`-g "F-03 批 3"` 1 passed EXIT=0（f03-e2e-newcase.log）→cp 还原；**还原干净双佐证**：当前 spec sha256=3a3a846b…与 manifest 及 verify locks:check 一致。**零触 tickets**：git status 无 tickets/ 改动+registry F-03=open（:205 实读）——F-02 W1 纪律执行 ✓。
8. **[N1] fire() 多 tab 覆盖缺口**：两 tab 同时 pending、到点各自落库（flushLedger 全账本循环落）无直接单测锚——S5 锚单 tab、flushAll 用例锚手动收账面；旧 store 测试曾有双 tab 用例（已随拆链改写）。实现语义保持，锚定缺一档。
9. **[N2] 恢复链重复触发**：onColumnReady 设 restoring+scrollToPage→bump scrollRequest→wiring 第三 effect 又 beginProgramScroll(同页)——重设同 target 行为等价冗余；且 PageColumn 消费 effect 先行时 beginProgramScroll 就位快径可能提前转 idle（窄边界，与疑虑 1 同族，无行为破坏——e2e 恢复段锚定绿）。
10. **[N3] keydown 接管不过滤修饰键**（自裁 8 申报）：ctrl+z/ctrl+wheel 也计接管信号——缩放/撤销同为用户介入，语义成立；与「三类信号」票面字面一致。

### D. 报告诚实性 —— 全项属实

1. 自裁 11 项逐条对 diff 核实**全部落实**（1 pending 零宽度档+mockImplementation 可观察锚/2 失配丢弃/3 beginProgramScroll 入账+arm/4 flusher 注册口防环/5 装配下沉/6 .tsx 后缀 tsc 实录/7 双就位快径/8 document keydown/9 anchor-locate 受锁扩超简报④ unlock 清单+申报/10 INV 登记超票面清单=宪法优先/11 删减面自查）。
2. 「440→415」数理 ✓：`git show HEAD:reader.store.ts | wc -l`=440，当前 415，净减 25。
3. 「719=691+28」数理 ✓：verify log :1921-1922「Test Files 93 passed (93)/Tests 719 passed (719)」；新增 it=scroll-progress 22（六态 11+五序列 5+几何容错 6 实数）+shortcuts 3+store 净+1（2 改写+1 新增）+anchor 2=**28 精确成立**。
4. INV-31/32 登记实物 ✓：invariants.md :45-46；**编号延续 30→31→32 无撞号无跳号**（F-01 W1 撞号教训吸收 ✓）；声明处+强制方式+锚定状态三列齐。
5. 日志数理：red 26 failed|31 passed（f03-red.log :453-454）/green 四文件 69 passed/verify VERIFY_EXIT=0（链序=quality+tickets+locks 142+lint+typecheck+test+build 全过，log :5-34+尾部）/e2e E2E_EXIT=0 20 passed+2 skipped（skip 8=F-04 骨架、12=F-03 批 3 守卫——与 registry open 状态自洽）。
6. 取证中断言修正申报（top0 toBe(0)→toBeLessThan(50)）属实：p-3 内边距 12px 计入 scrollTop，行为正确断言过严，非行为改动 ✓。

### E. 接缝与后续单

1. **F-04 依赖面就绪** ✓：nearestPage 已从 PageColumn 导出（:83，1 基返回+中缝取前页——等距时 `d < bestDist` 严格小于保持先遍历页，测试 :283-285 锚定）；恢复链/稳定盒在位（zoom 重渲染不卸载包装盒→SelectionLayer 兼容）；ctrl+wheel 段原状待批 4 迁移。
2. **[W3] PageColumn.tsx 现 245 行**：F-04 票面要加「zoom 视口中心锚点纯函数（PageColumn 同宿主）」+fit-width 分母列宽基准——余量仅 5 行，**大概率触碰组件 250 关卡**。主控派发 F-04 时应有拆分预案（锚点纯函数独立文件），防实现者临时自裁重蹈 W1 同型困境。
3. **e2e 批 3 翻 done 推演** ✓：F03_DEPS=[...DEPS(4 已 done),SR2-F-01(done),SR2-TABS-01(done),SR2-F-03(open)]——registry :101/:145/:203 实读；翻 done 后全满足→批 3 激活→**21 passed+1 skip**（F-04 骨架）成立。
4. **疑虑 4 条评估**：①restoring 到达窄边界——物理前提成立（用户滚动必先发 wheel/key/pointer 之一），不死锁，接受；②程序跳页后异步 scroll 偶发记账——同页重复回写+'none' 不回弹，无害，接受；③守卫时序——推演独立验证成立（上条）；④saveProgress 拒绝面——装配面 `.then(()=>undefined)` 只吞 reject，IPC Result resolve 形态不属「拒绝」语义；进度=尽力而为规约沿用，接受。**四条均无需回炉处置，备案即可**。
5. **[N4] F-04 联测提示**：zoom 变化改内容高度→触发 scroll 事件→本状态机记账回写；F-04 缩放中心保持实现须与 scroll-progress 联测（防缩放抖动期回写旧页）。

## 统计

**B=0 | W=3 | N=4**

- W1 scroll-progress.ts 339 行超简报④「模块 ≤250」字面（ESLint 500 过；自裁动机已申报、数值偏差未直面；三段职责一文件）
- W2 变异日志缺目标 it 明细+M6 首错过程清理未留档（九轮可交叉自洽，非假证）
- W3 PageColumn 245 行对 F-04 的 250 关卡挤压（接缝预警，本单无责）
- N1 fire() 双 tab 到点各自落库无直接锚 / N2 恢复链重复触发等价冗余 / N3 接管信号含修饰键组合 / N4 F-04 缩放联测提示

## 总评

**有条件通过（PASS，附裁量项）。** 母本符合度全项成立（六态逐格+五序列逐序列有 it、'none'/夹取/四键+空格/ctrl+wheel 零触碰/STUB 删净）；宪法红线零违反——受锁四文件逐 hunk 核实无放宽（store 两用例改写=架构语义迁移的必要重锁，票面授权+M7 红证非恒真），.tsx 后缀疑点澄清为**原后缀非重命名**（manifest 数理自洽，141→142 净增一条）；报告诚实性六面独立复核全部属实（sha256 五文件独立重算一致、440→415、719=691+28、INV-30→31/32 无撞号、red/green/verify/e2e 四档数理、registry open+零触 tickets）；W3/N4 两并入裁决实现形态与红证齐备；取证纪律（spec 备份法）执行到位。三个 W 均非行为缺陷：W1/W2 属申报完整性与口径问题、W3 是给 F-04 的接缝预警。建议主控收口时：①对 W1 行数口径作显式裁决（接受或令拆装配段）；②W2 变异日志格式要求写入后续派发简报模板；③F-04 派发简报预置 PageColumn 拆分预案。
