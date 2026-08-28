# SR2-F-04 门一对抗深审（2026-08-28）

> 审计人=门一子代理（独立只读核实）；输入=diff 包/票面/impl.report/五份 log。
> 开工技能清点：code-review-excellence=用；verification-before-completion/systematic-debugging=不用（只读审计，禁 npm/test——实现者自证+主控亲验）。

## A. 母本符合度 ✓

- 缩放中心锚：anchoredScrollTop=(scrollTop+vh/2)/总高 比值保持+顶底夹取+退化防御——**数学手算复核全对**（(500+400/2)/2000=0.35→0.35×4000−200=1200；组件例 3×1584+2×12=4776→0.25×4776=1194 ✓）。
- 段⑥程序修正 useLayoutEffect 直写 scrollTop——不经 wheel/keydown/pointerdown 接管链（INV-32 信号集）✓；修正派生的 scroll 事件→记账幂等（中心内容不变→页不变，实现者疑虑 2 口径成立）。ctrl+wheel 本身派发 wheel 归用户介入语义，与 INV-32 一致。
- fit-width：分母=onReady 载荷 columnWidth(sizes,1)（最宽页原始宽单源）→(clientWidth−24)/basis ✓；一次性 zoom 语义保持。
- 收官七段逐段在 spec 核实，**真实文本断言在位**（P1/P3/P6 KNOWN/「当前第 N 页」/zoom-label）——非纯几何冒充；INV-01 段=样式锁+批 1 文本锚注记（合理）。
- reader-text P7-A ctrl+wheel 段删除=**迁移非丢失**（新 spec 段③完整复现 100%→110% 全链断言）。

## B. 宪法红线 ✓

- 拆分：geometry.ts 100 行（零项目 import→无环）；PageColumn 旧定义真删（diff+grep 双证零残留）；scroll-progress 经再导出维持 import 路径（单实现双出口非复写）；page-column.test 受锁 sha 同步（manifest f9d6a5d1…+locks:check 过）。
- 行数：PageColumn 237/ReaderPage 249/geometry 100（wc -l 实测=报告数字）✓。
- INV-33 编号延续 32→33 无撞号（F-01 撞号教训已吸收）。
- e2e 守卫：DEPS 四票双条件 test.skip(pending>0)——open 期 21+1（final log 实证）/翻 done 后 22+0（active log 实证）推演兑现。

## C. 代码与测试质量 ✓

- 镜像监听：passive+挂载即读初值+cleanup 成对——无泄漏；父 ref 先于子 effect 赋值（React 次序保证）成立。
- 变异 M1-M4：it 名全录（F-03 W2 教训吸收）+断言行号+还原 diff 空+spec sha=manifest 双佐证；M4 PermissionError 撞锁实录如实申报并全程重做 ✓。
- 自裁四项：onReady 载荷（F-01 times 断言零破坏——verify 绿证）/scrollContainerRef（优于 closest CSS 耦合）/再导出（合规）/anchorPages 死接线删除（grep ReaderPage 零残留——死代码即删红线执行 ✓）。

## D. 报告诚实性 ✓

- 9 项自裁逐条对 diff 核实一致；723=719+4（verify log 93 文件 723；page-column 20=16+4）✓。
- e2e 双态：active 22+0/final 21+1（skip 唯一=收官链）✓；tickets 零改动（git diff 空）+registry F-04 open（主控未翻，正确）——spec 备份法合规（F-02 W1 流程遗产执行）。
- 工作树 7 改文件=清单；dev-launch.cmd/dist_new 前置残留未触碰（申报属实）。

## E. 接缝与战役收官 ✓

- 四票链接口衔接无断点：scrollRequest（F-01→F-03）/nearestPage（F-01→F-03 经再导出）/onReady 载荷（F-01→F-04 扩展=向后兼容）；F-aware 冻结面零触碰（anchor-locate/ReaderToolbar 不在 diff）。
- 收官报告骨架：验收四项对照全 ✅+主控续填位明确（§3/§5/§6）。
- 战役验收四项终对照：离屏回收断言 ✓（组件上界+e2e 计数）/进度回写恢复 e2e ✓（批 3+收官链尾双锚）/标注原位兼容 ✓（标注链全程绿+收官链抽验）/键位迁移锁定用例 ✓（reader-shortcuts.test PAGE_KEYS/SCROLL_STEP_RATIO 单源+e2e PageDown 0.9 屏断言，实测存在）。

## Findings

**0 B / 0 W / 5 N**：

- N1 e2e canvas 上限 ≤5 偏宽（6 页滚底稳态实算=3：可见±renderWindow1+回收窗2 均收敛 {4,5,6}）——拦「恒 6 不回收」主回归成立，但回收窗 ±2→±3 退化不红；建议后续票收紧 ≤4。
- N2 anchoredScrollTop 分母=columnTotalHeight（内容高含固定间隙，不含 scroller padding 24px）——中心点偏差 <12px 级；口径已在 INV-33 声明+实现者疑虑 1 申报，可接受。
- N3 缩小 zoom 时浏览器预夹取或先派发 scroll 污染镜像值——同 <12px 级近似，设计内。
- N4 PageColumn onVisibleChange prop 生产消费面归零（仅锁定测试锚定）——有测试消费非孤儿，不违死代码红线；后续票可裁。
- N5 e2e 第六段 evaluate 直写 scrollTop=程序性赋值同 scroll 事件径，INV-31 记账不受扰——成立注记。

## 总评

**PASS（0B/0W/5N）**——母本符合、红线全守、变异红证扎实、报告与证据零出入、四票链收官完整；5 条 N 级不拦收口。建议主控收口时把 N1（阈值收紧）/N4（prop 裁剪）记入战役报告 §6 或后续票。
