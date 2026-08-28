# SR2-F-06 实施报告（页间分隔与选区不透明——缺陷 B+C 视觉小票）

> 实现者子代理，三屋模式。票面=`scripts/audits/sr2-f-06-brief.md` v1。
> 收尾时点：实现+测试全绿，registry 未翻（主控收口职责），e2e 处守卫态。

## 0. 开工记录（技能清点）

- test-driven-development：**用**——票面文化层 TDD 四档（红→绿→变异红证≥2）。
- e2e-testing-patterns：**用**——交付核心=e2e 新 test（launch/seedPaperRow/skipIfPending 先例复用）。
- verification-before-completion：**用**——verify/test:e2e 真退出码落盘。
- frontend-ui-engineering：**用**——改造面=renderer CSS+内联样式（页盒底/阴影/::selection）。
- systematic-debugging：**用**——verify 三次红回炉（行数上限/工单号/tsc）逐根因处置。
- 其余（git 工作流/monorepo/部署/SAST 等）：**不用**——本单禁 git 操作、单仓单包、
  纯 renderer 视觉面无部署无安全面。

## 1. 实现摘要

- **缺陷 B（页间无分隔）**：`PageColumn.tsx` 页盒 div（`data-page-box`）style 增补
  `background: 'var(--panel)'` + `boxShadow: '0 1px 4px rgba(0,0,0,.12)'`（票面 P1
  示例值）。背景落在页盒 div 上，与渲染态无关——未渲染占位盒与渲染后页盒同底
  （消色差跳动，票面 P1 要求）。gap-3/PAGE_GAP_PX 零触碰（INV-33 口径）。
- **缺陷 C（划选加重）**：`text-layer.css` 两处 `::selection`/`::-moz-selection` 的
  background **两行都改不透明**：fallback 行 `rgb(191 191 255)`（官方
  `rgba(0 0 255 / 0.25)` 压白底的合成等效色）+ color-mix 行
  `color-mix(in srgb, AccentColor 25%, white)`（票面 P2 指定值）。`br` 的
  transparent 保持。头注追加偏离登记（票面 P2 明文要求的 [SR2-F-06] 字样行）。
- **为什么 fallback 行必须一起改（关键发现）**：真机探查实证 Electron 42 Chromium
  对 `::selection` 伪元素**不解析 color-mix 声明**——computed/生效值取级联
  fallback 行（官方版 computed=`rgba(0, 0, 255, 0.25)`）。只改 color-mix 行修复无效。

## 2. 文件清单（git diff --stat，无范围蔓延）

| 文件 | 变更 | 受锁 |
|---|---|---|
| `src/renderer/features/reader/PageColumn.tsx` | +5/-2（头注增补 2 行+页盒 style 两属性+注释） | 否 |
| `src/renderer/features/reader/text-layer.css` | 两处 selection 块+头注偏离登记 | 否 |
| `tests/e2e/reader-text.spec.ts` | +64（新 test+F06_DEPS） | 是（unlock→改→apply，manifest 同步） |
| `locks/manifest.json` | generatedAt+spec 一条 sha256 | 随 locks:apply |

props/导出/geometry/单测零触碰；无新依赖。

## 3. TDD 证据链（目标 test：`F-06 视觉小票：页盒 panel 底+阴影页缘可辨；划选高亮不透明（重叠 span 不加深）`）

### 3.1 首红（实现前；守卫激活=spec 备份法，禁触 registry）

- `pageBg` 断言红：`Expected "rgb(255, 255, 255)" / Received "rgba(0, 0, 0, 0)"`
  （页盒无背景——B 缺陷计算样式实证）。
- 同帧探查快照：`{pageBg:"rgba(0,0,0,0)", pageShadow:"none", scrollBg:"rgba(0,0,0,0)",
  bodyBg:"rgb(247,248,250)", selectionBg:"rgba(0, 0, 255, 0.25)"}`——::selection
  真机解析形态定案（fallback 行生效，见 §1）。

### 3.2 绿（实现后，同守卫激活态）

`1 passed (2.3s)`。

### 3.3 变异红证 ×2（cp 备份→变异→build→跑→cp 还原→diff 确认空；禁 git checkout）

- **变异①**（页盒 background 删除，boxShadow 保留）：B 断言红——
  `Expected "rgb(255, 255, 255)" / Received "rgba(0, 0, 0, 0)"`。还原 diff 空。
- **变异②**（::selection 两处改回官方 `rgba(0 0 255 / 0.25)` +
  `color-mix(in srgb, AccentColor, transparent 75%)`）：C 断言红——
  `Error: C: ::selection 带透明分量：rgba(0, 0, 255, 0.25)`（双正则断言第一道拦截；
  同时再次佐证 fallback 行为生效行）。还原 diff 空。

两断言均证明「能失败一次」（非恒真）。

## 4. 真退出码

- `npm run verify`：**EXIT=0**（quality 无占位/乱码/跨域 → tickets 111 一致 →
  locks 143 一致 → lint → typecheck → 单测 **94 文件 729 用例全过（与基线零增，
  视觉面单测零触碰）** → build）。
- `npm run test:e2e`（全量，守卫态）：**EXIT=0，23 passed + 1 skipped**——skip 条目
  即本单新 test（`skipIfPending(F06_DEPS)`，SR2-F-06 未翻 done 自守卫），与票面
  P3 推演一致；主控翻 done 后推演 24 passed + 0 skip。

## 5. locks 实录

- unlock（143）→ 写探查版 test → …红/绿/变异… → 恢复守卫（'SR2-F-06' 加回
  F06_DEPS）→ 第一次 apply（143）。
- verify 中两次红回炉后再 unlock → 修 spec 类型 → **apply（143）→ verify 全绿**。
  manifest 最终与工作区同步（仅 spec 一条 sha256 变更+时间戳）。提交须带
  [locked-change] 尾注（主控收口职责）。

## 6. 自裁申报（票面授权面+超票面决定）

1. **阴影值**：采用票面 P1 示例值 `0 1px 4px rgba(0,0,0,.12)`（票面授权自裁）。
2. **::selection fallback 行同步改不透明 `rgb(191 191 255)`**：超票面字面（票面
   P2 只写了 color-mix 行的值），但为修复成立的必要项——真机实证 color-mix 行在
   ::selection 上不生效（§1）；fallback 色取官方半透明蓝压白底的合成等效
   （25% 蓝 over 白），视觉与官方单层意图最接近。
3. **断言一「滚动区背景 --bg」的落点**：滚动容器（`.overflow-auto`）自身透明
   （`rgba(0,0,0,0)`），`--bg` 实际在 body 上（theme.css 单源）。断言锚定为：
   容器透明 + `bodyBg=rgb(247, 248, 250)` + 页盒≠滚动区两值可辨——比票面原文
   「滚动区背景=--bg」更贴代码事实，意图（页缘可辨）不变。
4. **断言二形态**（票面 P3 授权「按真机实测定」）：真机=`rgba(0, 0, 255, 0.25)`
   家族。落四道断言：非 missing / 非 transparent / 非 `rgba(…, α<1)` /
   非 `color(srgb … / 0.x)`——对 `rgb(…)`/`rgba(…, 1)`/`color(srgb …)` 不透明
   家族皆绿（未来 Chromium 若开始解析 color-mix 行也兼容）。
5. **PageColumn.tsx 注释用 `[F-06]` 不用 `[SR2-F-06]`**：check-tickets 兜底——
   registry 尚无 SR2-F-06（主控收口建票）时 src 引用即红；且建票翻 done 后
   「引用 done 工单占位」仍会红。与该文件头注 `[F-04 增补]`/`[F-05 增补]` 先例
   一致（先例本就无 SR2 前缀）。text-layer.css 头注保留票面明文要求的
   `[SR2-F-06]` 字样（css 不在 check-tickets 扫描面，已验证）。
6. **探查断言临时态**：首红阶段曾用 `expect(...).toBe('PROBE')` 探查断言取真机
   形态（两次跑：B 断言红一次+探查块前移一次），随后替换为正式断言，未残留。

## 7. verify 红回炉记录（如实）

1. PageColumn.tsx 251 行超组件 250 上限（quality 关）→ 压缩注释至 248 行。
2. check-tickets「引用不存在的工单号 SR2-F-06」→ 见自裁 5。
3. tsc TS2345（`col?.querySelector` optional chaining 的 undefined 分支，
   `=== null` 不收敛）→ `?? null`。票面「受锁 spec 改动后必须全量 verify（tsc
   关卡才能拦）」预言成真——playwright 转译跑绿但 tsc 拦住了。

## 8. 疑虑

- 12px gap+阴影的分隔强度若用户验收仍觉不足，属 P7-D 设计面（票面已预裁 gap 不改）。
- 「Chromium 对 ::selection 不解析 color-mix」为行为实证（未查官方文档背书）；
  若未来 Electron 升级行为改变，computed 走 color-mix 行→`color(srgb …)` 不透明，
  断言家族兼容（绿），视觉从固定淡蓝变为 AccentColor 相关淡蓝——修复语义（不透明
  不叠深）保持。
- locks/manifest.json 的 CRLF→LF git 警告为 locks 工具既有行为（sha 以 LF 为准，
  AGENTS 环境事实），未处置。
