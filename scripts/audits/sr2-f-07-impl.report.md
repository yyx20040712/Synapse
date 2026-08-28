# SR2-F-07 实现者报告（划选自绘选区 + AI 层去 multiply）

## 0. 开工记录（会话纪律）

### 技能清点（用 / 不用 + 理由）

| 技能 | 用/不用 | 理由 |
|---|---|---|
| test-driven-development | 用 | 票面强制 TDD：受锁守卫先红 → unit 首红 → 实现 → 绿 → 断言级变异红证 ≥2 |
| verification-before-completion | 用 | DoD 要求 verify 真退出码落盘，一切完成声明须新鲜证据 |
| javascript-testing-patterns | 用 | 新增 unit it 需贴合现有断言风格与 stub 结构 |
| e2e-testing-patterns | 用 | 受锁 e2e 守卫（reader-text.spec.ts）改写并先跑红取证 |
| frontend-ui-engineering | 用 | 渲染层组件/CSS/层叠次（z 序、pointer-events）机制改动 |
| systematic-debugging | 暂不用 | 当前无待查缺陷；首红形态异常或卡点时立即补加载（实际未触发——两次中程红均有明确根因：守卫序列化形态、tsc 类型收窄） |
| subagent-driven-development | 不用 | 本会话即三屋模式实现者子代理，无再派发面 |
| git 系列（workflow/worktrees 等） | 不用 | 实现者禁令：禁 git add/commit/push；变异还原用 cp 备份法（本会话全部还原 diff 验空） |
| code-review-excellence / receiving-code-review | 不用 | 门一/门二由独立子代理承担，实现者不做对抗自审（自裁申报代替） |

### 配置自查

- 模型/思考等级：实现者子代理由主控派发并确认配置（主控预裁见票面）；本会话未感知等级配错迹象。
- 环境铁律：一切 npm 命令前缀 `export PATH="/e/class/智慧水务/tools/node24:$PATH"`（全程遵守）。

### 基线对账（动工前）

- 单测文件 95 ✓（与票面一致）；locks manifest 144 ✓；工单 registry 解析 114 个（**票面写 116，偏差**——粗 grep `id: '` 计 116 含 summary 文本内引用串，check-tickets 对象级解析 114 为权威，见疑虑 4）。
- 用例数对账（收口后精确）：基线 741 + 本单 2 it = **743 = verify 实测** ✓。

---

## 1. 实现摘要

**修法=B 案（自绘选区）+AI 层去 multiply，全部按票面 §1 P1~P4 执行**：

1. `text-layer.css`：`.textLayer ::selection`/`::-moz-selection` 的 background 改
   `transparent`（两规则结构保留、br 规则不动；F-06 的两行 fallback 中第二行
   color-mix 行随值统一失去存在意义故不再重复两行——单值即可，头注登记演进链）。
2. `SelectionLayer.tsx` 自绘选区块：`evaluate()` 在 pending 产出时同步计算
   `overlay`（选区所在页 `.textLayer` 盒经两盒 getBoundingClientRect 差值换算到
   挂载盒——toolbar 定位数学同型；rect 块百分比定位——AnnotationLayer 同型数学），
   渲染 `SelectionRects`（容器 `data-testid="selection-rects"`，z-index:2、
   pointer-events:none、禁 mixBlendMode；rect 块 `data-testid="selection-rect"`、
   背景 `color-mix(in srgb, var(--accent) 30%, transparent)`）。选区消失
   （pending null）=组件整体返回 null=层不渲染。
3. `AiAnnotationLayer.tsx:144` 容器摘除 `mixBlendMode:'multiply'`；段级
   `opacity:0.45` 保留；**AnnotationLayer 单层 multiply 未动**（P4）。
4. 头注三处（P3 接缝核对）：SelectionLayer 头注追加 F-07 段（**含门一强制审项
   的完整层叠次推演**）；text-layer.css 头注登记 F-07 演进（为何透明+反馈移交）；
   AiAnnotationLayer 头注补去 multiply 决策依据（层间叠乘两源头之一摘除）。

**层叠次推演（登记于 SelectionLayer 头注，同一 stacking context 内比较——挂载盒/
页盒/页框均无 z-index 不成上下文，各绝对定位层直达公共根）**：

```
canvas 字形(非定位，最底) < .textLayer(z-index:0，自成 stacking context，span 内 z1)
  < 自绘选区块(z-index:2，pointer-events:none 防吞划选手势；禁 mixBlendMode)
  < AnnotationLayer(z-index:5，multiply——与本层相乘为单次合法荧光笔语义)
  < AiAnnotationLayer(z-index:5，已去 multiply，同值 DOM 后绘在上)
  < 工具条(z-10)
```

**宪法强制拆分（超出票面文件清单，自裁申报 3）**：实现后 SelectionLayer.tsx
312 行，quality 关卡红（renderer .tsx 组件 ≤250）。拆出
`SelectionRects.tsx`（59 行，自绘层）与 `SelectionToolbar.tsx`（77 行，工具条
DOM/KIND_LABEL/按钮随迁），SelectionLayer 收敛 246 行，保持挂载位/状态机/
evaluate/save 所有权与全部头注。DOM 形状、testid、交互零变化（unit/e2e 全绿证）。

## 2. 文件清单

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/renderer/features/reader/text-layer.css` | 改 | ::selection/::-moz-selection → transparent；头注 F-07 段 |
| `src/renderer/features/reader/SelectionLayer.tsx` | 改 | 头注 F-07 段（层叠次推演）；PendingSelection+overlay；evaluate 容器换算；渲染改挂两子组件；textLayer 类型收窄 |
| `src/renderer/features/reader/SelectionRects.tsx` | **新** | 自绘选区块组件（250 行关卡强制拆分产物） |
| `src/renderer/features/reader/SelectionToolbar.tsx` | **新** | 划选工具条组件（同上；KIND_LABEL 随迁） |
| `src/renderer/features/reader/AiAnnotationLayer.tsx` | 改 | 容器去 multiply；头注决策依据 |
| `tests/e2e/reader-text.spec.ts` | 改[locked] | F-06 视觉小票 C 节守卫重写+测试名更新；B 节不动 |
| `tests/unit/renderer/selection-layer.test.tsx` | 改[locked] | 新增 F-07a/F-07b 两 it+selRects helper+头注覆盖声明 |
| `locks/manifest.json` | 改 | 三轮 unlock→apply 后的哈希同步（144 条不变） |
| `scripts/audits/sr2-f-07-*.log` | 新 | 首红/绿/变异/verify/e2e 证据日志（本报告同目录） |

`git diff --stat` 范围自查：6 文件改动 +2 新组件文件，与票面+申报拆分一致，无范围蔓延（工作区其余未跟踪文件为主控会话既有产物，非本单产生）。

## 3. 首红证据（实现前）

- **e2e 首红**（`scripts/audits/sr2-f-07-firstred-e2e.log`，exit=1）：
  新守卫 vs 旧实现，红在新 C 节第一条——
  `Error: C: ::selection 背景为透明家族：rgb(191, 191, 255)`（旧不透明近似色被
  透明家族断言拦下；B 节页盒断言先行通过，证明红位准确）。
- **unit 首红**（`scripts/audits/sr2-f-07-firstred-unit.log`，exit=1）：
  恰两新 it 红（F-07a `expected null not to be null`——无自绘渲染；F-07b 同），
  10 旧 it 全绿——特征缺失红，非笔误红。

## 4. 测试证据

### 绿证

- unit：selection-layer.test.tsx **12/12 passed**（10 旧+2 新），exit=0（拆分前后各跑一次，均 12/12）。
- e2e F-06：**1 passed**，exit=0（含 ::selection 透明家族+selection-rects 层在场+selection-rect 背景 `color(srgb 0.145 0.388 0.922 / 0.3)` alpha∈(0,1) 三组断言）。
- 全量 verify：**95 文件 743 用例全过，exit=0**（见 §6）。
- 全量 e2e：**24 passed (1.2m)，exit=0**（`scripts/audits/sr2-f-07-e2e-full.log`）。

### 变异红证（≥2，cp 备份法，全程未用 git checkout；还原后 diff 空）

| 变异 | 目标 | 红证 | 还原 |
|---|---|---|---|
| M1（拆分前形态） | 删 SelectionLayer 内整个自绘渲染块（941 字符） | unit F-07a/F-07b 红（2 failed/10 passed，exit=1）`scripts/audits/sr2-f-07-mutation-m1.log` | cp 还原，`diff` 空（M1-RESTORE-DIFF-EMPTY） |
| M1b（**最终代码形态**，拆分后复证） | 删 `<SelectionRects .../>` 挂载行 | unit F-07a/F-07b 红（2 failed/10 passed，exit=1）`scripts/audits/sr2-f-07-mutation-m1b.log` | cp 还原，diff 空（M1b-RESTORE-DIFF-EMPTY） |
| M2 | text-layer.css `::selection` 改回不透明 `rgb(191 191 255)` | e2e 红：`C: ::selection 背景为透明家族：rgb(191, 191, 255)`，exit=1 `scripts/audits/sr2-f-07-mutation-m2.log` | cp 还原，diff 空（M2-RESTORE-DIFF-EMPTY） |

## 5. locks 实录（unlock→改→apply 时间序）

| # | 动作 | 内容 |
|---|---|---|
| 1 | locks:unlock | 解锁 144 文件 |
| 2 | 改 e2e spec | F-06 C 节守卫重写+测试名 |
| 3 | 改 unit spec | +selRects helper+F-07a/F-07b+头注 |
| 4 | locks:apply | manifest 144 同步 |
| 5 | （首绿跑红在守卫自身形态）locks:unlock | Chromium 对 color-mix 产物 computed 序列化为 `color(srgb … / 0.3)`，守卫正则原只认 rgba() → 修正正则兼容两形态 |
| 6 | locks:apply | manifest 144 同步 |
| 7 | （tsc 关卡拦截后）locks:unlock | e2e spec `alpha![1]` 在 noUncheckedIndexedAccess 下为 string\|undefined → 改显式 NaN 兜底（缺失即两界断言同红，不伪造通过值） |
| 8 | locks:apply | manifest 144 同步（最终态） |

locks:check 终态：144 受锁文件与 manifest 一致（verify 内含，通过）。

## 6. verify 真退出码

- 最终全量 `npm run verify` → `scripts/audits/sr2-f-07-verify.log`，**exit=0**：
  quality 通过（无占位/无乱码/无跨域）→ tickets 通过（114 注册一致）→ locks 通过
  （144 一致）→ lint 通过 → typecheck 通过 → **Test Files 95 passed (95) / Tests
  743 passed (743)** → build 通过。
- 落盘方式说明：票面建议命令形态 `npm run verify 2>&1 | tail -30; echo exit=$?`
  中 `$?` 实为 tail 退出码（首跑实证 exit=0 假绿）——本单改用「全量重定向落日志+
  真码追加」，语义忠实于「真退出码」要求。

## 7. 自裁申报（一切超票面决定）

1. **选区色值**：`color-mix(in srgb, var(--accent) 30%, transparent)`（票面明示
   两可之一）。理由：theme.css `--accent:#2563eb` 单源引用（硬编码 rgba 会造第二
   色源）；30% alpha 在白底合成浅蓝、黑字透出可读（e2e 实测 computed=
   `color(srgb 0.145 0.388 0.922 / 0.3)`）；主控明示不锁死、验收判据=黑字透出
   可读已由 e2e alpha∈(0,1) 断言锚定。
2. **测试钩拆两层**：票面给单一 `data-testid="selection-rects"`；实现拆容器
   （selection-rects，无背景）+rect 块（selection-rect，带 alpha 背景）——
   AnnotationLayer 的 annotation-layer/annotation-rect 同构先例；e2e 断言=
   层存在+首块背景 alpha（票面措辞「存在且背景带 alpha」的落地拆分）。
3. **组件拆分**（宪法硬规则 vs 票面文件清单冲突，以宪法为准）：+2 新文件
   SelectionRects.tsx/SelectionToolbar.tsx（详见 §1）；行为/DOM 零变化。
4. **e2e 守卫 alpha 正则兼容 color(srgb) 形态**（首次绿跑暴露的 Chromium
   序列化事实，守卫修正非断言放宽——两形态都要求 alpha∈(0,1)，M2 类不透明
   变异仍红）。
5. **F06_DEPS 未追加 'SR2-F-07'**：票面未要求；spec+impl 同收口提交原子落地无
   中间态窗口；追加反而使守卫在本单执行期 skip、每次取证都需备份法激活。
6. **src 内工单号引用形态**：SR2-F-07 尚未注册进 registry（check-tickets 对
   不存在号引用即红）——src 他文件一律短式 `[F-07 增补]`（F-05/F-06 先例：
   长号独占注册文件，如 anchor-locate.ts 之于 SR2-F-02；PageColumn 内
   `[F-05 增补]` 同构）。**主控注册时注意**：check-tickets 规则 4 要求 open 且
   file=.tsx 的工单文件渲染 `data-ticket` 占位——若注册 file=SelectionLayer.tsx
   且在 open 态跑 verify 会红；建议收口同提交翻 done，或参照 F-05 注册非组件
   文件先例。text-layer.css 的长号引用不受限（关卡只扫 .ts/.tsx）。
7. **textLayer 类型收窄**：`if (anchor === null || textLayer === null)`——
   anchor 非空逻辑上蕴含 textLayer 非空，并列条件纯收窄无行为分支（tsc 关卡
   拦截后修正；vitest/playwright 均不查类型的实证又一枚）。
8. **首绿中程红两次**（守卫序列化形态/tsc 类型）均为测试侧或类型侧修正，
   未触碰实现断言语义；全部日志留存。
9. 报告与证据日志新增于 `scripts/audits/`（票面报告契约要求，非蔓延）。

## 8. 疑虑（供门一/门二/主控）

1. **manifest CRLF**：locks:apply（PowerShell）写出的 manifest 带来 git
   「CRLF→LF」警告——locks:check 绿（哈希对账的是目标文件内容）；主控提交时
   .gitattributes 归一，建议收口 diff 复核一眼。
2. **自绘层位于标注层（multiply）之下**（票面钦定层叠序）：划选已存在的不透明
   标注块区域时，选区着色被标注块遮盖（标注可点击性优先的代价）；工具条仍在
   （z-10）保底可见。交互细节请门一复核裁定。
3. **真实拖选手感**：e2e 用程序化 selectText（既有配方先例），鼠标拖选手感/
   拖选中途防抖帧的视觉表现未在 e2e 覆盖——票面文化层已预告「真实拖选验证留
   主控复测」。
4. **基线工单数偏差**：票面 116 vs check-tickets 权威 114（registry 对象数）；
   主控台账对账时留意。
5. **registry 未注册 SR2-F-07**：本单一切引用已按可注册任意 file 的形态收敛
   （短式），注册动作归主控（控制面单写者纪律，实现者未触 tickets/ 一字）。

## 9. 门一 W1 回炉（机制三项零测试锁——已补齐）

**裁决**：z-index / pointer-events:none / 禁 multiply 三机制无断言锁（容器加回
multiply 或 zIndex 改 50 将全绿——与 F-06「审了色值没审遮字机制」教训同构）。
其余全过。

**回炉执行（最小面）**：

- `tests/e2e/reader-text.spec.ts` F-06 新守卫处（selection-rects 层可见断言后）
  补容器 computed style 三断言（带注释声明机制语义与推演指针）：
  `mixBlendMode === 'normal'`（禁容器级 multiply——与标注层 backdrop 相乘=层间
  叠乘加深，AI-09 教训）/ `pointerEvents === 'none'`（防吞划选手势）/
  `zIndex === '2'`（.textLayer z0 之上、标注/AI 层 z5 之下——z 序声明存在且
  在标注层之下；注释写明「容器加回 multiply 或 zIndex 改高均须红」）。
- 流程实录：locks:unlock → 补断言 → `-g "F-06"` 跑绿（1 passed，exit=0，
  `sr2-f-07-rework-w1-green.log`）→ **变异红证**：SelectionRects 容器临时
  `mixBlendMode:'multiply'` → `Error: C: 自绘容器禁 multiply（层间叠乘）`红
  （1 failed，exit=1，`sr2-f-07-rework-w1-mutation.log`）→ cp 备份法还原
  （diff 空，W1-RESTORE-DIFF-EMPTY）→ **还原证据落 verify.log**（restore 后
  `git diff --stat` append——工作区仅余本单正当改动+受锁 spec 新断言，
  verify.log 尾部 W1 分节）→ locks:apply（manifest 144 同步）→ **全量 verify
  exit=0**（95 文件 743 用例全过，verify.log W1 分节：quality/tickets/locks/
  lint/typecheck/test/build 全绿）。
- 中途一次 MUTATE-FAIL（变异标记缩进记错 10/8 空格，变异未发生即止，无污染、
  无需还原）——修正标记后重试成功；如实登记。
- e2e 全量未重跑：W1 改动仅 F-06 spec 内新增断言（无实现变更、无跨 spec 面），
  全量 verify 已覆盖 lint/typecheck/test/build；上一轮全量 e2e 24 passed 仍有效
  （如门二需要可要求补跑）。
