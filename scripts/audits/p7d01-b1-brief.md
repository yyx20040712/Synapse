# P7D-01 批一实现者简报——design token 三轴机械迁移（动效 --dur-*/间距清扫/弹层 --z-*）

> 主控=GLM-5.3；实现者=子代理（**GLM5.3flash 定档申报**,环境统一档欠账披露——
> Agent 工具面无 model 参数,账本如实记）。
> 票：P7D-01 批一（registry:245——用户裁决 2026-09-03「乙字号+甲其余」,批一=甲式
> 机械迁移零视觉差,闲时可动）。上游底数=docs/design/2026-09-03_p7d01-token-candidates.md §1/§2
> （主控本场已按 DoD 计数纪律脚本复核——以下数字为准）。

## ① 身份与禁令

禁 git add/commit/push；禁翻 tickets/registry。控制面（docs/invariants.md/ADR/
prompts）**零改**——本票不登记 INV（弹层 z 档/时长档与批二字号轴同族,「design
token 单源」INV 留批二字号轴落地时一并登记,票面明示）。卡点=BLOCKED 停手不自裁。

## ② 必读序

1. `AGENTS.md`（宪法——测试纪律/受锁流程/行数）。
2. `docs/design/2026-09-03_p7d01-token-candidates.md`（§1/§2 底数+裁决语境）。
3. `src/renderer/shared/theme.css` **全文**（:root token 块/各 .syn-* 皮肤——
   token 定义落点+16 处 duration 消费面+B1 教训头注「静态+hover 同层」）。
4. `src/renderer/features/workspaces/workspace.css`（7 处）+`src/renderer/features/
   library/library.css`（9 处）——duration 消费面。
5. 弹层 9 消费件：`src/renderer/shared/ui/Dialog.tsx`+`Toast.tsx`+`src/renderer/
   features/reader/AnnotationMenu.tsx`+`AnnotationEditor.tsx`+`SelectionToolbar.tsx`
   +`src/renderer/features/tags/TagLifecycleMenu.tsx`+`src/renderer/features/lineage/
   LineageToolbar.tsx`+`LineageNodeMenu.tsx`+`LineageBoard.tsx`（各 1~2 处 z-10/20/40/50）。
6. 间距 6 消费件：`src/renderer/features/lineage/`下 LineageNodeCard.tsx（2 处）/
   LineageNodeMeta.tsx（4 处）/LineageSideAiNotes.tsx（1 处）/LineageSideManualNote.tsx
   （1 处）/LineageSidePanel.tsx（1 处）/LineageSideTags.tsx（3 处）。
7. `src/renderer/features/reader/page-layer-z.ts`（头注第 17 行提及「菜单 z-20/编辑器
   z-20/工具条 z-10」——**仅头注措辞更新**接缝归责,数值零改）。
8. `tests/unit/renderer/theme.test.ts`（**受锁**——TOKENS 数组+负锚形态先例,B1 形态锁
   describe 为间距清扫的形态面先例）。
9. `scripts/audits/p7d01-visual-probe.mjs`（**主控验收工具,禁改**——读头注知其原理即可）。

## ③ 主控裁决（实现者不再自裁）

### 轴 1：动效时长 32 处→7 token（值不变仅载体变）

theme.css `:root` 增（放 --radius-l 之后、--font-display 之前,带分节注释）：

```css
/* ── 动效时长（P7D-01 批一：7 档收敛——值即现状,零视觉差）── */
--dur-press: 0.08s;  /* 按压瞬态（active transform 微缩/下沉——游戏钮瞬态） */
--dur-tint: 0.12s;   /* 滤镜/浸染快变（filter/titlebar 底色） */
--dur-fast: 0.14s;   /* 标准快（background/border/color 类） */
--dur-base: 0.18s;   /* 基准（hover 综合态含 box-shadow） */
--dur-lazy: 0.2s;    /* 缓变（dropzone 描边/影） */
--dur-rise: 0.22s;   /* 卡片升腾（文献卡 hover 三通道+角饰 opacity） */
--dur-flow: 0.3s;    /* 渐变流动（primary background-position 平移） */
```

逐值替换（transition 声明内裸值→`var(--dur-*)`）：theme.css 16 处
（0.08×4/0.14×6/0.12×3/0.18×2/0.3×1）+workspace.css 7 处（0.18×2/0.08×2/0.12×1/
0.14×2）+library.css 9 处（0.22×4/0.14×2/0.08×1/0.2×2）=32 处。
**animation 时长（syn-pan-* 5s/2.8s/6s）不在本票面——零改**。

### 轴 2：弹层 z 序语义命名（4 值→4 token+12 class 改写）

theme.css `:root` 增：

```css
/* ── 弹层 z 序四档（P7D-01 批一语义命名——值不变零视觉差；
   页内 0~3 层单源=page-layer-z.ts,不在此）── */
--z-float: 10;       /* 画布/页面浮动控件（工具条/提示条/适应钮）+顶栏抬升 */
--z-anchor-pop: 20;  /* 页内锚定弹层（阅读器标注菜单/编辑器） */
--z-pop-veil: 40;    /* 弹层透明捕捉层（菜单 backdrop） */
--z-pop: 50;         /* 弹层主体（模态/toast/菜单面板） */
```

- theme.css :92 `.app-header` 与 :552 `.lineage-fit-btn` 的 `z-index: 10`→
  `z-index: var(--z-float)`；
- 12 处 tailwind class 改写（**v4 CSS 变量简写形态**）：`z-10`→`z-(--z-float)`、
  `z-20`→`z-(--z-anchor-pop)`、`z-40`→`z-(--z-pop-veil)`、`z-50`→`z-(--z-pop)`
  （9 文件 12 处——Dialog 1/Toast 1/AnnotationEditor 1/AnnotationMenu 1/
  SelectionToolbar 1/TagLifecycleMenu 2/LineageNodeMenu 2/LineageToolbar 1/
  LineageBoard 1）；
- page-layer-z.ts:17 头注措辞「菜单 z-20/编辑器 z-20/工具条 z-10」→新 class 名——
  **仅注释,四常量数值零改**。

### 轴 3：间距 inline 12 处→tailwind class（B1 形态：静态皮肤住类）

px 值→class 映射（tailwind v4 动态 0.25 刻度）：4→`-1`、3→`-0.75`、6→`-1.5`、8→`-2`。

| # | 位置 | 现状（style 内） | 迁移（className 追加） |
| --- | --- | --- | --- |
| 1 | LineageNodeCard.tsx:51 | `paddingTop: 8`（TITLE_STYLE 内） | 消费处 `pt-2` |
| 2 | LineageNodeCard.tsx:147 | `gap: 4`（footer style 块内） | `gap-1` |
| 3 | LineageNodeMeta.tsx:34 | `padding: '0 4px'` | `px-1` |
| 4 | LineageNodeMeta.tsx:47 | `gap: 3` | `gap-0.75` |
| 5 | LineageNodeMeta.tsx:48 | `padding: '0 3px'` | `px-0.75` |
| 6 | LineageNodeMeta.tsx:82 | `paddingLeft: 4` | `pl-1`（`marginLeft:'auto'` 非数值间距,**保留 inline**） |
| 7 | LineageSideAiNotes.tsx:72 | `paddingLeft: 6` | `pl-1.5` |
| 8 | LineageSideManualNote.tsx:58 | `paddingLeft: 6` | `pl-1.5` |
| 9 | LineageSidePanel.tsx:112 | `paddingLeft: 6`（H4_ACCENT 内） | `pl-1.5` |
| 10 | LineageSideTags.tsx:19 | `gap: 3` | `gap-0.75` |
| 11 | LineageSideTags.tsx:20 | `padding: '0 4px'` | `px-1` |
| 12 | LineageSideTags.tsx:48 | `paddingLeft: 6` | `pl-1.5` |

形态：style 对象/常量**只删该间距属性**,其余（color/borderLeft/fontSize/flex 等）
原样保留；消费元素 className 追加对应 class（元素无 className 则新建）。
**接缝前提（主控已核查）**：12 元素均无 unlayered CSS 规则竞争同属性
（theme.css 非 @layer 规则恒压 tailwind utilities 层——若有竞争则迁移改变生效值,
探针必红）。

### 测试面（TDD——theme.test.ts 受锁扩展,唯一受锁触碰件）

改前 `npm run locks:unlock`,改完即时 `npm run locks:apply`（locks 条目数不变=282）：

1. TOKENS 数组追加 11 条（`['--dur-press','0.08s']`…`['--z-float','10']`…）+
   分节注释「P7D-01 批一：token 收敛值（registry 裁决——非 mockup :root 面）」；
2. 新 describe「P7D-01 批一 token 收敛防线（三轴形态锁）」：
   - **值面负锚**：7 个 duration 字面量在 3 CSS 文件出现次数==定义处数
     （theme.css 各 1 次/workspace.css 0/library.css 0——`it.each` 21 三元组）；
   - **层级形态锁**：theme.css `not.toMatch(/z-index:\s*(10|20|40|50)\b/)`；
     9 弹层 tsx 合并串 `not.toMatch(/\bz-(10|20|40|50)\b/)`；
   - **间距形态锁**：6 lineage tsx 合并串无「数值间距属性」（regex 须放行
     `marginLeft: 'auto'`/`var(...)` 值——主控建议
     `/(padding|margin|gap)(Top|Bottom|Left|Right)?:\s*('[\d-]|[\d])/`）；
   - **class 在场锚**：≥3 处新 class 名在对应文件在场（如 NodeCard 含 pt-2、
     SideTags 含 pl-1.5——防「全删不补」假绿）。

## ④ 纪律

- TDD：先红（TOKENS 11+新 describe 全套对现状红）→迁移→绿→**变异红证 ≥3**
  （①token 值 0.14s→0.15s 红/②z 值 50→51 红/③还原一处 paddingLeft:6 间距
  形态锁红——**未提交实现禁 git checkout 还原,用 cp 备份法**,宪法测试纪律条）；
  首红与每次变异原始输出**各自落盘** `.raw.txt`（scripts/audits/
  p7d01-b1-first-red.raw.txt/-mutation-{1,2,3}.raw.txt）。
- `npm run test` 禁裸 npx vitest；**收口 `npm run verify` 真退出码落盘**
  （scripts/audits/p7d01-b1-verify.raw.txt,末行 echo exit=$?）。
- **视觉零差验收（票面条款,主控工具）**：`npm run build` 后
  `node scripts/audits/p7d01-visual-probe.mjs after > scripts/audits/p7d01-b1-probe.raw.txt 2>&1`
  ——console 须 `[COMPARE] PASS`+exit=0（8 态截图逐字节相同+全 DOM 计算样式
  transition/zIndex 逐键相同+11 token 期望值精确匹配；基线已由主控双跑
  确定性验证在档 p7d01-out/determinism-check.cjs 输出）。探针脚本禁改——
  对比失败=实现缺陷,禁调仪器。
- 多断言禁与行尾注释同置；禁新依赖；UTF-8；受锁新件无（探针已由主控入锁）。
- 自裁申报：票面外一切决定（含删减面）报告逐条列。

## ⑤ 基线数字（自检参照）

- verify=155 文件/**1357 用例**/locks **282**（探针入锁后新基线）/e2e 42（本票
  不触碰 e2e 面——主控已核查 tests/ 零断言被迁移形态）。
- 用例数增量预估=11（TOKENS）+21（值面负锚）+2（层级形态）+1（间距形态）+
  1~3（在场锚）≈36~38 →预期 ~1393~1395（以实际为准,报告精确数）。

## ⑥ 报告契约

全文落 `scripts/audits/p7d01-b1-impl.report.md`：实现摘要/文件清单/首红+变异
红证引证（raw 路径）/verify 真退出码/探针 COMPARE 结果/locks 实录（unlock→apply
全程）/自裁申报/疑虑。回复五行内。
