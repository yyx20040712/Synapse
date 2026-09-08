# F-TOOL-01 实现者简报——像素差分带定位器工具固化

> 档位：GLM5.3flash（实现者位；环境限制统一档如实记）。主控=GLM5.3。
> 票面：tickets/registry.ts F-TOOL-01（本简报含主控预裁=完整任务书）。

## ① 任务一句话

新件 `scripts/audits/visual-diff-locate.mjs`：输入 baseline/after 两个 PNG 目录
+态清单，输出每态差分行带（16px 块网格/TH6/cnt≥4——y 行带+x 范围）+可选
crop 模式（指定区域 before/after 上下拼接输出 PNG）。纯 Node 面零 app 依赖
（**不 launch electron**；用 playwright chromium headless 读像素）。

## ② 必读序（文件清单化）

1. `AGENTS.md`——代码组织/依赖纪律/UTF-8（≤500 行；禁新依赖）。
2. 票面=registry F-TOOL-01 摘要+本简报（冲突以本简报预裁为准）。
3. `docs/methodology.md` §4.1 ⑤h——三坑记载原文+三件套语境（工具头注素材）。
4. 先例池：
   - `scripts/audits/p7d01-visual-probe.mjs`——代码风格/输出习惯参照
     （**只参照风格，其 electron launch 面本票禁止**）；
   - `scripts/audits/f-a5-diag.mjs`——playwright 页内 canvas getImageData
     先例（:61 附近）。
5. 验收素材：`scripts/audits/p7d01-out/baseline/*.png` 与
   `scripts/audits/p7d01-out/after/*.png`——八态同名 PNG
   （lib/ws-panel/settings/lineage-canvas/lineage-side/
   lineage-side-tagged/dialog/reader），1280×800 上下文（以实际 IHDR 为准）。

## ③ 主控预裁（逐条给依据——实现者不再自裁这些点）

1. **CLI 接口**：
   - 差分模式：`node scripts/audits/visual-diff-locate.mjs <baselineDir> <afterDir> [state1,state2,...]`
     （态清单缺省=两目录同名 PNG 交集全跑；逐态报告 y 行带+x 范围）。
   - crop 模式：`--crop <state>,<x>,<y>,<w>,<h> [--out <file>]`——读该态
     baseline/after 两图，裁矩形，上下拼接（上=baseline 下=after，中间 2px
     分隔线），写 PNG（缺省 `scripts/audits/visual-diff-crop.png`）。
2. **算法钉死**（v51 配方）：16px 块网格；TH6=像素差异判定 RGB **任一通道**
   |a−b|>6 即差异像素；cnt≥4=块内差异像素计数≥4 该 16×16 块计差分块；
   聚合=**连续差分块行**合并为行带，每带输出 y 像素范围（含端块全界）+
   x 像素范围（带内差分块的 min/max 列范围）+差分块数。
3. **两图尺寸不等**=该态直接判 FAIL 报错（对比前提破坏），非零退出。
4. **三坑规避内建**（⑤h 原文）：①launch 后 **goto file:// 原源页**（HTML
   载体页自身用 pathToFileURL——禁 about:blank 后再 load file）；②
   `chromium.launch({ args: ['--allow-file-access-from-files'] })`；③一切
   文件路径经 `pathToFileURL`（本仓路径含中文「智慧水务」）。HTML 载体页可
   用临时文件（os.tmpdir）——页内 `<img>`/fetch 加载两图入 canvas。
5. **chromium 引入**：`import { chromium } from 'playwright'` 或
   `'@playwright/test'`（两者皆装）。**禁 import `_electron`**。
6. **退出码**：全态零差分带=exit 0 并打印每态零带；有差分带=exit 0（差分带
   是定位输出不是失败——调用方以输出文本对位，本工具不替人判 PASS/FAIL）；
   参数错/文件缺/尺寸不等=非零。差分报告同时落 JSON
   （`--json <file>` 缺省 `scripts/audits/visual-diff-report.json`）。
7. **工具头注**：含 §6.2 三件套使用语境（带对位=三件套①，输出供②crop 与
   人工核对）+用法两行+三坑一句话各注。
8. **locks 不碰**（受锁/控制面=主控收口职责）；**git 不碰**。

## ④ 纪律

- 证据落盘 `.raw.txt` 后缀（`.log` 被根 .gitignore 静默拦）：
  ①八态实跑全输出；②同图对比（baseline vs baseline）零带自证；③crop 模式
  自测一次（如 lib 态顶栏区域；输出 PNG+控制台回显均入 raw）。各附
  `echo exit=$?`。
- 「先红」形态（工具票适配）：先跑同图对比应零带——若带出=算法有 bug 当场
  修（此即测试是锁定的合约的工具面等价物）；八态实跑出的带须与批二在档
  对位（见⑤验收）。
- 禁新依赖；≤500 行；UTF-8；卡点=BLOCKED 停手不自裁（报告写明卡点）。
- 不需要跑 vitest/verify（新件不触测试面与构建面——eslint files 白名单不含
  scripts/*.mjs）；但须自查 `node --check` 语法过。

## ⑤ 验收判据（主控+门一将按此核对）

1. 八态实跑：每态差分行带**恰落批二在档预期变化区**（顶栏/侧栏/卡片 meta/
   边标签/图例/底部版本号——见 p7d01-b2-gate2-package.md §6.2 对位句），
   无意外区（大面积全图带=实现错的信号）。reader 态变化面最大属预期
   （PDF 文本层字号变化）。
2. 同图对比=八态全零带。
3. crop 自测：输出 PNG 存在且可读（尺寸=裁区宽×(2×高+2)）。

## ⑥ 报告契约

全文落 `scripts/audits/f-tool01-impl.report.md`：实现摘要/文件清单/证据日志
清单/三坑落点各自证（页内 console 或代码行号指认）/疑虑与自裁申报（本票
预裁外的任何决定）。回复五行内。
