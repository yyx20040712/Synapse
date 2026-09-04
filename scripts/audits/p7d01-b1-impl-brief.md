# P7D-01 批一实现者简报——动效/间距/层级 token 机械迁移（零视觉差）

> 主控=GLM5.3；实现者=子代理（GLM5.3flash 定档,环境统一档欠账披露）。
> 票：P7D-01 批一（registry open;用户裁决 2026-09-03=「乙字号+甲其余」——
> 批一=甲式机械迁移闲时可动面）。案册=docs/design/2026-09-03_p7d01-token-candidates.md
> §2 底数/§3 方向甲。

## ① 身份与禁令

禁 git add/commit/push;禁翻 registry;禁碰 docs/prompts//ADR/invariants;
字号轴**零涉及**（批二在场轮）;卡点=BLOCKED。

## ② 必读序

1. `AGENTS.md`（宪法——视觉类票 ⑤b/⑤f 条款:零视觉差票仍需无头像素 diff 客观验收）。
2. `docs/design/2026-09-03_p7d01-token-candidates.md`——案册（§1 底数/§2 四轴债面/§3 甲）。
3. `src/renderer/styles/theme.css`——token 宿主（46 键现状——增补不改既有）。
4. grep 实测面：动效 `transition|animation` 的 duration 值（0.14s×10/0.08s×7/
   0.22/0.18/0.12×4/0.2×2/0.3×1——案册 §2;**以你自测 grep 为准,案册数字复核**）;
   间距 inline 12 处（lineage 域 6 文件）;层级弹层 {10,20,40,50} 散点。
5. `scripts/audits/f1-forensics5.mjs` 系列——无头像素差分管线先例（配方形态）。

## ③ 主控裁决

1. **动效轴**：theme.css 增 `--dur-*` 七档（命名=值档位名:0.08s→--dur-instant/
   0.12s→--dur-fast/0.14s→--dur-quick/0.18s→--dur-medium/0.2s→--dur-normal/
   0.22s→--dur-deliberate/0.3s→--dur-slow——命名可微调但**七档一一对应禁归并**
   [归并=视觉差]）;全部 duration 消费点迁 var(--dur-*)。easing 全 ease 零动。
2. **间距轴**：lineage 域 12 处 inline——恰等 tailwind 刻度值→迁 class;不等值
   →**保留 inline+申报**（禁强行 --sp-* 变量化[案册甲未含间距变量轴——清扫
   目标=inline 清零或申报残留,零视觉差优先）。CSS 45 处组件类零涉及。
3. **层级轴**：弹层 {10,20,40,50}→theme.css 增 --z-* 四值（--z-popover:10/
   --z-overlay:20/--z-modal:40/--z-toast:50 类命名;消费点迁 var;页内 {0..3}
   =page-layer-z 单源零涉及）。
4. **零视觉差验收（⑤b 替代形态）**：无头截图差分管线——改前基线+改后同场景
   截图+像素 diff **零差像素**（关键场景覆盖:主窗口/脉络域六文件涉及组件的
   视图+动效 hover 态[transition 时值不变——截静止态+一中途态可选]）;自产
   .mjs 诞生即 locks:generate+apply。diff 非零=BLOCKED 停报（视觉差=返工源）。
5. **theme.css 受锁面自查**：locks manifest 是否含 styles——含则 unlock→改→
   apply 流程;不含则常规改+收口 locks:apply（若 manifest 经 generate 扩面）。
6. **计数实测**：案册 §2 数字（32 token/12 条/7 档/12 处/45 处）逐项 grep 复核
   ——漂移则申报差异（案册 2026-09-03 盘点,今日代码或已有微动）。

## ④ 纪律

TDD 面=纯样式迁移（无逻辑测试面）——防线=**像素 diff 零差+既有单测全绿**（样式
类断言若有[computed style 断言]同步核对值不变）;npm run verify 真退出码;证据
.raw.txt;受锁流程;UTF-8;≤500 行零涉及（样式值替换行数不变）。基线=
**155 文件/1357 用例/locks 281/e2e 42**（本票预期用例数不变——样式零逻辑面;
locks 数=+截图脚本件若新）。

## ⑤ 报告契约

全文落 `scripts/audits/p7d01-b1-impl.report.md`：迁移摘要（三轴各自计数实测/
token 定义清单）/像素 diff 结果（零差证据）/locks 实录/自裁申报（含间距残留
清单+案册数字漂异）/疑虑。回复五行内。

## 修改文件清单（超出即 BLOCKED 申报）

1. `src/renderer/styles/theme.css`——--dur-* 七档+--z-* 四值（增补段,既有 46 键零改）。
2. 动效 duration 消费点文件集（grep 定位——预期 lineage+reader+ui 域若干件）。
3. lineage 域 6 文件间距 inline 清扫面。
4. 层级弹层消费点文件集。
5. `scripts/audits/p7d01-b1-shotdiff.mjs`（新受锁件——截图差分管线）+基线/后
   截图产物目录（不入 git）。
