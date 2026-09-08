# P7D-01 批二 实现者简报——字号六档语义刻度落地（主控→实现者子代理）

> 档位声明（§4.5 单一调用者）：实现者=**GLM5.3flash**（体验套餐优先,思考
> 等级中）。本简报自包含——你无会话历史,一切以本文+裁决档为准。

## ① 身份与禁令

- 你是实现者子代理,领单 **P7D-01 批二**（tickets/registry.ts P7D-01 条目
  批二段——**用户裁决已毕 2026-09-08**,裁决档=docs/design/2026-09-08_
  p7d01-b2-fontscale-ruling.md,实现以此为准）。
- **禁 git add/commit/push、禁翻 registry、禁碰 tickets/**。
- **禁跑 locks 命令**（unlock/apply/generate 均主控位——受锁件已由主控
  预解锁,你只做内容编辑;若仍遇只读拦写=BLOCKED 停手）。
- 禁新增依赖;禁动 scripts/audits/p7d01-out/;禁动 mockup 文件。
- 卡住=BLOCKED 停手不自裁。

## ② 必读序（文件清单化）

1. `AGENTS.md` 宪法（代码组织/测试纪律/受锁流程节）。
2. `docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md`——**裁决档（唯一
   真相源）**:六档映射表+变化面总账（13 处预期变化+17 处仅换载体）+
   实现约束四条。
3. `tests/unit/renderer/theme.test.ts`——受锁扩展对象（批一 DURATION_
   COUNTS 三元组先例+四读取面 shellCss/buttonsCss/readerCss/lineageCss）。
4. `docs/invariants.md`——INV-61 登记落点（文末表格,格式参照 INV-58~60）。
5. 消费面文件（grep 实测清单,替换时逐文件过）：
   - `src/renderer/shared/theme.css`（token 定义驻点+:root 后段）
   - `src/renderer/shared/theme-{shell,buttons,reader,lineage}.css`
   - `src/renderer/features/library/library.css`
   - `src/renderer/features/workspaces/workspace.css`
   - `src/renderer/features/lineage/LineageNodeMeta.tsx`（fontSize '10px'）
   - `src/renderer/features/lineage/LineageNodeCard.tsx`（'12.5px'/'12px'）
   - `src/renderer/features/lineage/LineageSideTags.tsx`（fontSize 11）
   - `src/renderer/features/reader/TabBar.tsx`（text-[10px] arbitrary）

## ③ 任务规约（裁决档 §1 映射表逐行落地）

### 3a. token 定义（theme.css :root 内,--dur-* 段后）

```css
/* P7D-01 批二：字号六档语义刻度（用户裁决 2026-09-08——docs/design/
   2026-09-08_p7d01-b2-fontscale-ruling.md;消费面禁字面量,INV-61） */
--fs-micro: 10px;
--fs-caption: 11px;
--fs-body: 12px;
--fs-strong: 13px;
--fs-title: 14px;
--fs-display: 17px;
```

### 3b. tailwind 单源重绑（theme.css,@import 行后新增 @theme 块）

```css
@theme {
  --text-xs: var(--fs-body);
  --text-sm: var(--fs-title);
}
```
（v4 语法——text-xs×131/text-sm×25 经此并入 token 单源零逐处改写;
text-[10px]×1 是 arbitrary 值不受重绑,按 3c 清单改写。）

### 3c. 30 处硬编码替换（值→token 全清单）

| 文件 | 现值→token |
| --- | --- |
| theme-shell.css:34（.app-header-name） | 15px→var(--fs-title) |
| theme-shell.css:164（nav 项） | 13.5px→var(--fs-strong) |
| theme-shell.css:217/225（.app-nav-ver/.app-nav-txt） | 9.5px→var(--fs-micro) |
| theme-reader.css:28（.rdr-aside-h4） | 11.5px→var(--fs-caption) |
| theme-reader.css:48 | 13px→var(--fs-strong) |
| theme-lineage.css:21（.lineage-legend） | 10.5px→var(--fs-caption) |
| theme-lineage.css:67/76 | 13px→var(--fs-strong) |
| theme-lineage.css:99 | 12px→var(--fs-body) |
| theme-lineage.css:125（.lineage-edge-label） | 9.5px→var(--fs-micro) |
| library.css:100（.lib-card-year） | 17px→var(--fs-display) |
| library.css:114 | 14px→var(--fs-title) |
| library.css:125/217（11px） | 11px→var(--fs-caption) |
| library.css:136/144/152（10.5px） | 10.5px→var(--fs-caption) |
| library.css:158 | 12px→var(--fs-body) |
| library.css:211/221（15px） | 15px→var(--fs-title) |
| workspace.css:23 | 13px→var(--fs-strong) |
| workspace.css:49 | 10px→var(--fs-micro) |
| workspace.css:92/123 | 12px→var(--fs-body) |
| LineageNodeMeta.tsx:32 | '10px'→'var(--fs-micro)' |
| LineageNodeCard.tsx:53 | '12.5px'→'var(--fs-body)' |
| LineageNodeCard.tsx:147 | '12px'→'var(--fs-body)' |
| LineageSideTags.tsx:20 | 11→'var(--fs-caption)' |
| TabBar.tsx:138 | text-[10px]→text-[length:var(--fs-micro)] |

（行号=F-CSS-01 后实测快照,你现场以 grep 复核为准;表覆盖=30 处。）

### 3d. theme.test.ts 受锁扩展（先红证必须）

1. TOKENS 数组加 6 正锚：`['--fs-micro', '10px']` … `['--fs-display',
   '17px']`（锚 theme.css 定义——**先红**：token 未定义时先跑一次红,
   raw 落 scripts/audits/p7d01-b2-first-red.raw.txt）;
2. **FS_LITERALS 负锚矩阵**（批一 DURATION_COUNTS 同构,新增 describe）：
   全部 12 个旧字面量（9.5px/10px/10.5px/11px/11.5px/12px/12.5px/13px/
   13.5px/14px/15px/17px）×全消费面（theme+四皮肤+library+workspace css
   ——七文件读取面,themeCss 用既有 css 变量）计数断言：**唯 theme.css
   每值恰 1 次（token 定义行）,其余六文件全 0**;tsx 面（4 文件文本
   readFileSync,LineageNodeCard 等同法）禁 font-size 字面量+arbitrary
   ——形态断言 not.toContain("fontSize: '1")/not.toContain('text-[10');
3. **@theme 重绑锁**：theme.css 断言含 `--text-xs: var(--fs-body)` 与
   `--text-sm: var(--fs-title)` 字面（漂移即红）。
   先红证形态：负锚矩阵落笔后、3c 替换执行前跑一次——9.5px 等在
   皮肤件在场=红（证明锚活）,raw 落 first-red 同档。

### 3e. INV-61 登记（docs/invariants.md 文末表格追加一行）

| INV-61 | 字号六档语义刻度单源：font-size 消费面禁字面量（CSS/inline/arbitrary），tailwind text-xs/text-sm 经 @theme 重绑到 --fs-* token——档位与锚值变更=用户裁决+本册 | P7D-01 批二用户裁决 2026-09-08（docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md） | theme.test.ts（TOKENS 六正锚+FS_LITERALS 负锚矩阵+@theme 重绑锁） | 已锚定（2026-09-08 批二） |

（状态列先写「部分」——收口时主控核验后改「已锚定」亦可,你写「已锚定」
的前提=3d 测试全绿亲跑。）

## ④ 纪律

- 纯机械替换+测试扩展,禁改任何非清单文件;**13 处值变化是裁决预期,
  不是缺陷禁「修正」回旧值**（§6.2 条款——预期红申报）。
- B5 缩放复核（裁决档 §3-4）：替换毕后跑探针不可行（主控位）,你做
  静态核查：--fs-* 与 --ui-scale 无直接耦合面（zoom var 不含 font-size
  token 乘算）——核查结论写入报告即可。
- 每步验证：3d 先红→3a/3b/3c 落地→`npm run test` 全绿→`npm run verify`
  真退出码落 `scripts/audits/p7d01-b2-verify.raw.txt`（echo exit=$? >>）。
- 证据 `.raw.txt` 后缀;UTF-8;中文注释可读。

## ⑤ 基线数字（自检参照）

- verify：156 文件/1450 用例/locks 286/基线（你新增 describe 后用例数
  +N——报告实测申报）。
- theme.test.ts 现 116 用例（F-CSS-01 后）;消费面七 CSS 文件+四 tsx。
- lint/typecheck 基线全绿。

## ⑥ 报告契约

全文落 `scripts/audits/p7d01-b2-impl.report.md`：实现摘要/文件清单/
先红证据（first-red raw 路径）/verify 退出码+用例数/自裁申报（含行号
漂移修正+B5 静态核查结论）/疑虑。回复五行内：状态+替换处数+新增用例数
+verify 结果+报告路径。
