# SR2-F-08 实现报告（三屋模式第一屋·实现者子代理）

日期：2026-08-29 · 状态：DONE（verify 各环=除两处票面外红源外全绿，见 §5/§8）
票面：`scripts/audits/sr2-f-08-brief.md` v1 · 母本：ADR-0019

## 1. 实现摘要

划选视觉反馈回退官方原生半透明路线（ADR-0019/R1）：`text-layer.css`
::selection 两规则逐字恢复官方 `rgba(0 0 255 / 0.25)`（pdfjs-dist
web/pdf_viewer.css 678-685 行原值，官方空格格式；color-mix 第二行不抄——
Chromium 不解析）；自绘层 `SelectionRects.tsx` 整体删除（P10 方案切换=删
旧方案）；`SelectionLayer.tsx` 摘除 overlay 五处，职责收窄为「选区→工具条→
保存」；两受锁测试按票面 P2 改写（unit 防回归守卫+e2e C 节三段重写）。
工具条/保存链/undo/Escape/事件注册/AnnotationLayer 零触碰。

## 2. 文件清单（含删除）

| 文件 | 动作 | 内容 |
|---|---|---|
| `src/renderer/features/reader/text-layer.css` | 改 | ::-moz-selection/::selection 两规则 transparent→rgba(0 0 255 / 0.25)；br 两规则不动；头注新增 [SR2-F-08] 段（反转+ADR-0019 指针+根因一句），F-06/F-07 历史段保留 |
| `src/renderer/features/reader/SelectionRects.tsx` | **整删**（59 行） | 自绘层组件（含 SelectionOverlayBox 类型） |
| `src/renderer/features/reader/SelectionLayer.tsx` | 改（249→226 行） | 头注 F-07 层叠推演段改写 F-08；摘 import（旧 :51）/PendingSelection.overlay 字段/evaluate 内 tlBox+overlay 字面量/渲染块 SelectionRects 行/data-ticket 占位包装 div；evaluate 定位数学、save、undo、Escape、事件注册零动 |
| `tests/unit/renderer/selection-layer.test.tsx`（受锁） | 改（[locked-change]） | F-07a→F-08 守卫（toolbar 在场时 selRects() 恒 null）；F-07b 整删（头注登记：测点随组件消亡）；头注 F-07 段改 F-08 说明；selRects() 探针保留 |
| `tests/e2e/reader-text.spec.ts`（受锁） | 改（[locked-change]） | 测试名改「::selection 官方半透明（划选即时可见）」；C 节①精确值断言（rgba(0, 0, 255, 0.25) 四分量全锁正则，注释注明官方原值+Chromium 序列化）②自绘层三机制断言全段删除→`toHaveCount(0)` 防回归守卫（注释引 ADR-0019）③toolbar 可见 timeout 5_000→1_500（注释引 L7：200ms 防抖+evaluate 预算 1.5s）。B 节页盒断言零动 |
| `locks/manifest.json` | 改（locks:apply 产物） | 两受锁测试 hash 换新（预期内）+**4 条主控未跟踪取证脚本新条目**（见 §7-h/§8） |

diff --stat：78 insertions / 174 deletions（tickets/registry.ts 的 M 为主控
建单产物，非本代理改动）。

## 3. 首红原始输出（TDD 红）

落盘：`scripts/audits/sr2-f-08-red.log`（exit=1）。先改 unit 守卫后现状
（自绘层在场）必红——F-08 守卫捕获到 selection-rects DOM：

```
+ Received:
<div class="absolute" data-testid="selection-rects" style="...z-index: 2; pointer-events: none;">
  <div ... data-testid="selection-rect" .../>
</div>
 ❯ tests/unit/renderer/selection-layer.test.tsx:284:24
    expect(selRects()).toBeNull()
 Test Files  1 failed (1)
      Tests  1 failed | 10 passed (11)
exit=1
```

## 4. 变异红证（断言级，cp 备份法）

落盘：`scripts/audits/sr2-f-08-mutation.log`（exit=1）。变异=在
SelectionLayer 渲染块恢复一个 `data-testid="selection-rects"` 的 div
（提前 return）：

```
 Test Files  1 failed (1)
      Tests  6 failed | 5 passed (11)
exit=1
```

还原：cp 备份→cp 还原→`diff` 确认空（输出 `DIFF-EMPTY restore ok`）。
未使用 git checkout（未提交实现保护纪律）。

## 5. verify 尾段+真退出码

落盘：`scripts/audits/sr2-f-08-verify.log`。`npm run verify` 真跑
exit=1——红在 tickets:check（链第 2 环，后续环已手动补跑取证）。
各环真退出码总览（log 尾勘误段，前文 lint-exit=0 为管道假码已更正）：

| 环节 | 退出码 | 说明 |
|---|---|---|
| quality:check | 0 | 含 TODO/mojibake 关卡 |
| tickets:check | 1 | **结构性时序红（票面预判内）**：规则 4 要求 open UI 工单注册文件含 data-ticket 占位——占位已按票面删除+registry 仍 open（本代理禁翻），主控翻 done 前必红，翻后解除 |
| locks:check | 0 | 158 受锁文件与 manifest 一致 |
| lint | 1 | 红源=`scripts/audits/f1-forensics2.mjs`（**主控未跟踪取证脚本**，'rm' unused，非本单改动面；CI checkout 不含未跟踪文件不受影响）；本单四文件 eslint 独立跑 0 error |
| typecheck | 0 | 双 tsconfig 全过 |
| test | 0 | **104 文件 858 用例全绿**（基线 859−1=F-07b 删除，与票面预测 ≈858 一致） |
| build | 0 | out/renderer 产物正常 |

## 6. locks unlock+apply 实录

- `npm run locks:unlock`：已解锁 **158** 个文件（票面基线写 154——开工
  即 158，差异来源见 §7-h）。
- 受锁两测试改写 → verify 各环取证后 `npm run locks:apply`：已锁定 158
  个文件，manifest 记录 158 条；`locks:check` 通过（158 一致）。
- manifest diff：两受锁测试 hash 换新（票面预期内）+4 条新增
  （`scripts/audits/f1-forensics{,2,3,3b}.mjs`——locks 生成器扫入主控
  留在工作区的未跟踪取证脚本；154+4=158 之源）。回滚不可行（会造成两
  受锁文件改而 manifest 未换 hash 的不一致红），保留现状+申报主控裁决。

## 7. 自裁申报（对照票面 P1~P4 逐项+一切超票面决定）

票面 P1~P4 逐项核对：全部按票面执行（P1 三源文件/P2 两受锁改写/P3 接缝
三处声明一致+终态 grep/P4 四不做零触碰），无删减面。超票面/措辞级决定：

- **a) 渲染块外层形态**：主控字面「外层回退为 fragment」——删
  SelectionRects 后仅剩 SelectionToolbar 单子元素，包 fragment 属冗余
  （仓库无 no-useless-fragment 规则但语义等价），实际写为直接返回
  `<SelectionToolbar .../>`（单子 fragment ≡ 直接返回）。属性零动。
- **b) evaluate 并列检查注释**：`if (anchor === null || textLayer ===
  null)` 原样保留（票面「其余零动」），但其注释原援引「供 F-07 容器
  几何取用」——消费方已删，注释失真，微调为「并列检查保留防御语义
  （F-08 起无几何消费方）」（接缝纪律：注释与行为一致的最小修正，行为
  零变）。
- **c) e2e ::selection 断言形态**：主控允许「精确值 OR 等价 alpha 分量
  解析」双形态——实际采用四分量全锁正则
  `/^rgba\(\s*0\s*,\s*0\s*,\s*255\s*,\s*0\.25\s*\)$/`（锁 0,0,255,0.25，
  仅容忍序列化空格差异；精确字符串是其子集——即双形态的并集，不放宽为
  弱家族匹配）。未跑 e2e（票面 ⑤b 豁免），首跑实测序列化由主控收口
  e2e 验证。
- **d) PendingSelection 接口注释**：overlay 描述随字段删除（字段-注释
  一致性的必要同步）。
- **e) unit 头注与 selRects 探针注释措辞**：票面 P2 指定改写方向，具体
  措辞自拟（F-08 语境：守卫探针/防回归）。
- **f) verify 结构性时序红**：票面预判「check-tickets 会拦」——实测拦
  在规则 4（open UI 工单缺占位，check-tickets.mjs:116-122）而非 4b
  （done 残留占位）。主控翻 done 后该环即解除。
- **g) 首跑 lint/typecheck 的 log 段**：`lint-exit=0` 行为管道假码
  （`$?` 取了 tail 退出码），已在 log 尾勘误段更正（真码 lint=1/typecheck
  =0 均已无管道单独重验）。
- **h) manifest 新增 4 条**：locks:apply 扫入主控未跟踪取证脚本——超出
  票面「两 hash 换新」预期，保留现状+申报（见 §6/§8）。

## 8. 疑虑（主控收口处置项）

1. **e2e 首跑实测**：::selection computed 序列化若与正则不匹配（票面
   预期 'rgba(0, 0, 255, 0.25)'），按票面「以实测为准」处理；受锁 e2e
   改动后全量 verify 兜底纪律仍需主控收口执行。
2. **f1-forensics2.mjs lint error**：主控收口 verify 全绿前置条件——需
   处置该未跟踪脚本（删除/修复），否则 lint 环持续红。
3. **manifest 4 条新增**：主控裁决保留或 `locks:generate` 排除后重 apply
   （若排除需同步处理 154↔158 口径）。
4. **真机复评**：归主控（配方=取证脚本 v4：selection-rects 不在场+蓝色
   tint 差分>0+工具条时延）——本代理未跑。
