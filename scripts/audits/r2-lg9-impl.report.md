# R2-LG9 实现报告 —— 脉络「命之座星象板」视觉重制

> 三屋模式实现者子代理交付。票面=`scripts/audits/r2-lg9-brief.md`；
> 视觉规范单一来源=`docs/design/mockups/lineage-constellation.html`（v2）。

## 1. 实现摘要

- **P1 画布底**：LineageCanvas 根改夜幕宿主 div（`.lineage-night`：夜幕渐变
  +3 层星云 radial，mockup body 逐值）+星空两层平铺+✦ 四芒星 4 枚+边型图例
  （拆件 `LineageNightDecor.tsx`）——装饰层全部 `data-night-decor`+
  `aria-hidden`+CSS `pointer-events:none`（注意事项 ⑥）；svg 背景由
  `var(--bg)` 改透明（夜幕由宿主透出），`data-testid="lineage-canvas"` 与
  `rect[data-panbg]` 保留（pan 事件面零触碰）。工具条玻璃浮层化
  （`.lineage-toolbar`：blur10+金 hairline rgba(207,174,114,.28)）。
- **P2 节点卡面**：拆件 `LineageNodeCard.tsx`（组件 ≤250 红线，F-07 先例）。
  rect=defs `linearGradient#lg-node-face`（165° 向量 x2=0.26/y2=1，三档
  node-face-hi→node-face→#1e2745）+rx 14+金系半透明描边（strokeOpacity
  .42）；L 形金角饰两枚 path（`data-corner` tl/br，臂长 12px 骑 rect 圆角
  外侧）；题名 `#f5f3ea` 12.5px；年份=`--font-display` 15px
  `--gold-bright`+letter-spacing 1.5px；主题节点=虚线银描边
  （`#9aa3c0` opacity .55 dasharray 6 4）+半透明渐变面
  （`lg-node-face-theme`）；选中态=金描边 2.5+`lg-edge-glow` 外光+
  `data-selected` 保留。
- **P3 年份层带**：层带线改金微光实线（`--band-line`，dasharray 移除）+
  左端菱形刻度 `rect[data-band-tick]` 6×6 rotate45（fill `--gold-night`
  opacity .5）+年份标衬线化（`--font-display` 14px `--gold-bright`
  letter-spacing 2px）；「YYYY 年」文案逐字保留；y 对齐由 layout 既有
  精确计算（注意事项 ④）。
- **P4 边辉**：实链 path=金 `--gold-night` strokeOpacity .8 width 1.7+
  `filter=url(#lg-edge-glow)`（feGaussianBlur stdDeviation 2.6+feMerge）；
  推断边（label 含「推断」）=虚线银 `#9aa3c0` opacity .6 width 1.3
  dasharray 5 4 无辉；边 label=夜色胶囊近似（paintOrder=stroke halo
  底色 `--night-bg2` strokeWidth 3.5 round+fill `--text-on-night`
  10.5px）；底部图例胶囊（实链/推断两型，静态非交互）。
- **P5/P6**：lineage-layout 零触碰；布局算法/侧板/边避障不做（票面 P6）。

## 2. 文件清单（git diff 面）

| 文件 | 变更 |
| --- | --- |
| `src/renderer/features/lineage/LineageCanvas.tsx` | 重写：夜幕宿主+defs+层带刻度+NodeCard 接线（245 行） |
| `src/renderer/features/lineage/LineageNodeCard.tsx` | 新建：节点卡面拆件（83 行） |
| `src/renderer/features/lineage/LineageNightDecor.tsx` | 新建：星空+✦+图例装饰拆件（35 行） |
| `src/renderer/features/lineage/LineageEdges.tsx` | 边辉+推断边+胶囊 halo 色改（73 行） |
| `src/renderer/features/lineage/LineageBoard.tsx` | 工具条玻璃化（样式级，229 行——行为/testid/文本零变） |
| `src/renderer/shared/theme.css` | 追加 .lineage-night/.lineage-stars(2)/.lineage-sparks/.lineage-legend/.lineage-toolbar 类（mockup 逐值，320 行） |
| `tests/unit/renderer/lineage-canvas.test.tsx` | [受锁] 新增 describe「R2-LG9 星象板视觉」5 it |

## 3. TDD 证据链

- **首红**：5 新 it 对现状全红（15 既有绿并存）——见下节 verify 前
  `npx vitest run` 输出（5 failed | 15 passed）。
- **绿**：实现后 20 passed（含 theme.test 45 passed——token 防漂移锁未破）。
- **变异红证 ×2**（cp 备份法，禁 git checkout）：
  1. 删 `linearGradient#lg-node-face` defs 块 → 「节点渐变 defs」it 红
     （1 failed | 19 passed）→ cp 还原。
  2. 删层带刻度 `rect[data-band-tick]` → 「层带金微光+菱形刻度」it 红
     （1 failed | 19 passed）→ cp 还原，`diff` 空落证（RESTORE-DIFF-EMPTY）。
- **e2e 绿基线（改前亲跑）**：`npm run build && npx playwright test
  tests/e2e/lineage.spec.ts` → 4 passed，EXIT=0，落
  `scripts/audits/r2-lg9-e2e-baseline.log`。

## 4. e2e lineage.spec 逐断言兼容性核对表（结构红线）

| 断言（行号） | 兼容裁决 |
| --- | --- |
| T1:163/197 空态文案 getByText | 保留（svg 常驻+text 结构不变，fill 换夜 token） |
| T1:165 nodeG=`svg g[data-node-id]` filter hasText | g+data-node-id+题名 text 结构保留 |
| T1:203-205 getByText 标题/`2022`/`2023` exact | 题名/纯数字年份独立 text 保留（无新增含数字文本） |
| T1:206 getByText `2020 年`（层带标） | 文案逐字保留；fontSize/字体变不断言 |
| T1:208/239 `svg path[data-edge-id]` count 2 | path+钩保留；glow filter 挂属性不带钩；defs/filter 元素不带 data-edge-id |
| T1:213-225 svg boundingBox+pan 起点（左下空白） | 宿主 div 包裹不改 svg 盒；星空/✦/图例 pointer-events:none → pointerdown target 穿透达 panbg |
| T1:222/233 `g[data-viewport]` transform 串 `^translate\((x), `/`scale(k)$` | transform 模板逐字未动 |
| T2:263-274 parseTranslate `^translate\((-?[\d.]+), (-?[\d.]+)\)$` | 同上 |
| T2:265-270 rootG.boundingBox() 中心拖拽 | 角饰贴 rect 边界±0.5px 对称，中心不变；位移断言相对 before |
| T2:290/308 data-kind=theme | 属性保留 |
| T2/T3/T4 菜单/保存态/侧板 testid 全部 | Board 行为零变（仅样式类替换）；侧板零触碰 |
| T4:483 getByText `已绑定文献`（**strict 单源**） | **画布不加「已绑定文献」badge 文本**（加了即 strict violation 必红）——见自裁申报 |

**结论：零必然红**（无 e2e 断言值变更 → 无 [locked-change] e2e 面）。

## 5. locks 实录

- `npm run locks:unlock`（152 解锁）→ lineage-canvas.test.tsx 加 5 it +
  typecheck 修正（decor?.length）→ `npm run locks:apply`（152 重锁，
  manifest 同步）。无新测试文件（不加 generate）。
- e2e lineage.spec.ts 未触碰。

## 6. verify / e2e 真退出码

- `npm run verify` → VERIFY-EXIT=0（全量：quality+tickets+locks+lint+
  typecheck+test+build），日志 `scripts/audits/r2-lg9-verify.log`。
- 首轮 verify 曾 EXIT=1：quality 抓 LineageCanvas 268 行>250 组件红线 →
  拆 LineageNightDecor+头注压缩 → 245 行复验过（本轮留证）。
- e2e 全量 25 保持：**25 passed，E2E-EXIT=0**（`npm run test:e2e` 亲跑，
  含 lineage.spec T1-T4 全 4 条 ok），日志 `scripts/audits/r2-lg9-e2e-full.log`。
- 基线对账：verify 102 文件 / 832 用例（基线 827 + 5 新 it）；locks 152；
  e2e 25 passed——全数一致无偏差。

## 7. 自裁申报（超票面/字面决定全部列出）

1. **「已绑定文献」badge 不落画布**（票面 P2 字面 vs e2e 红线冲突）：
   e2e T4 `getByText('已绑定文献')` strict 单源在侧板，画布渲染同名文本
   即 strict violation 必红——按主控预裁「优先调整实现保结构」取舍，
   绑定语义由侧板呈现（R2 第二票侧板夜化时仍在）。
2. **色值字面（token 无对应，mockup 字面直接引用）**：深端 `#1e2745`
   （渐变三档）、主题/推断银 `#9aa3c0`、题名 `#f5f3ea`（票面 P2 明文）、
   星空亮星 rgba(227,201,143,.8)/rgba(222,230,255,.9)、星云三档
   rgba 值、工具条/图例底 rgba(34,44,77,…)——均 mockup 逐值，theme.css
   已有 token（--gold-night/--band-line/--node-face 系/--text-on-night/
   --night-bg2/--gold-bright/--gold-soft/--star）一律消费不复写。
3. **尺寸/布局微调**：节点 rect rx 6→14（票面 P2 明文）；题名 fontSize
   12→12.5、y=-8 不变；年份 fontSize 11→15 y 14→16（衬线金标放大）；
   层带线 dasharray『4 6』移除（金微光实线）；层带标 fontSize 12→14
   衬线+letter-spacing 2px，位置（-190, l.y+NODE_H/2）不变；空态/边
   label fill 换夜 token。grep 确认 e2e 无 rect 尺寸/rx 断言（主控
   预裁允许面）。
4. **边 label 胶囊以 halo 近似**（票面「halo 机制可被胶囊替代」的「可」
   字面取舍）：SVG 无文本宽度测量原语，真 rect 胶囊需渲染后 getBBox
   DOM 交互（破坏纯渲染+jsdom 不可测）——paintOrder=stroke round
   join 底色（--night-bg2）3.5px 视觉近似玻璃胶囊，data-edge-label
   钩保留。
5. **LineageBoard 触碰**（票面「零触碰预期」vs 主控预裁 P1「工具条玻璃
   浮层化」冲突，取主裁）：仅工具条容器挂类+按钮/指示条去内联白底换
   夜色玻璃类——testid/onClick/文案/状态机零变；重试按钮 accent-soft
   底换 --gold-soft（夜面对比度）。
6. **图例放 svg 前渲染**（LineageNightDecor 拆件序）：svg 透明背景不
   遮图例视觉；pointer-events:none 无命中影响。
7. **typecheck 修正**：新 it `decor.length`→`decor?.length ?? 0`
   （TS18048）——测试自身笔误非断言放宽。
8. **组件拆件两枚**：NodeCard（票面预案）+ NightDecor（超行拆分，行数
   红线强制）。

## 8. 疑虑

- 无 BLOCKED。e2e 亲跑已见证装饰层 pointer-events:none 纪律（pan/zoom/
  拖拽/菜单全链 25 passed）。
