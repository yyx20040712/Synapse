你是 F-TOOL-01 工单（像素差分带定位器工具固化）的门一对抗深审员。只读审计——只看本审计包（票面+主控预裁+实现者报告+完整 diff+证据摘录）,禁接触仓库/禁跑命令/禁臆测包外事实。不确定的明确说不确定。铁律：每条 finding 给 [B|W|N]+file:line 或 diff 摘录。中文输出。

工单：A 母本符合度（票面+简报预裁逐条 vs diff——CLI 双模式接口/算法钉死【16px 块网格+TH6=RGB 任一通道 |a-b|>6+cnt>=4 差分块+连续差分行合并为带,y/x 含端块全界】/三坑规避落点/goto file:// 载体页/--allow-file-access-from-files/pathToFileURL/退出码合同【差分有带或零带均 0,参数错缺文件 2,尺寸不等 1】/纯 Node 禁 electron import/工具头注含 §6.2 三件套语境/≤500 行）;B 宪法红线（UTF-8/无新依赖【import 面仅 playwright+node: 内置】/新文件无孤儿引用问题=工具件自引用 CLI 场景）;C 代码与测试质量——**附加强制审项=工具票专项**：①算法实现与钉死配方逐行一致性（块网格边缘块处理/TH 判断/计数早退 cnt>=4 是否改变语义【早退=计数到 4 即停,是否影响差分块判定语义】/行带聚合 y1=min((end+1)*16,h) 与 x1=min((maxX+1)*16,w) 端界）②三坑落点真实性（载体页是否真经 pathToFileURL+goto/launch args/两图 URL 编码——中文路径「智慧水务」）③页内 evaluate 双写面风险（16/6/4 字面量内联 vs Node 侧 BLOCK/TH/CNT 常量——改值漂移风险是否已注记+可接受）④资源清理（browser.close+tmpDir rm 的 finally 路径/异常路径泄漏面）⑤边界（空目录交集/态名空白过滤/crop 越界/负坐标/IHDR 断言读法 readUInt32BE(16/20)）⑥playwright evaluate 序列化限制的处理（真函数+单对象参数）;D 报告诚实性（自裁 7 项+疑虑 1 vs diff 实物逐条/回炉 1 节完整性——主控亲核发现的 crop 顺序颠倒 bug 根因记述与修复是否如实/证据日志构成可解释【八态实跑 42 带+同图零带+crop IHDR+顺序验证+负例 2/2/1】/「证据基于终态代码」申明）;E 接缝与后续单（工具缺省输出路径 visual-diff-report.json/visual-diff-crop.png 是否有覆盖风险/JSON 报告结构对三件套②③的可用性/§6.2 语境下调用方工作流接缝/负例盲区还有哪些【如非 PNG 文件/目录传文件路径】）。

主控已预裁项（可攻击但推翻需更强依据）：
1. 回炉 1=crop 上下顺序颠倒（主控亲核代码语义发现,IHDR 断言对内容顺序盲）→已修复【urlBase/urlAfter 语义命名直画】+顺序验证实验【合成蓝/红图 y=30 蓝/y=98 红 order_assert=PASS】——门一核修复面即可,不复审已处置根因链;
2. 疑虑 1（简报预判 reader 变化面最大,实测 135 块=八态最少）=主控裁量接受——物理解释:验收 PDF 为探针合成单行小 PDF,canvas 渲染不消费 app --fs-* token,批二在档对位句也仅列 UI 区;验收主判据=带恰落预期区+无意外区,成立;
3. 自裁 7 项（crop 分隔线 #ff00ff/半开区间记法/ToolError+finally/负例补充/evaluate 真函数+字面量内联/同图 JSON 指名/交集排序）=主控初核合理,门一可深挖。

输出：[B|W|N] 逐条+证据+统计+总评（PASS/PASS_WITH_WARNINGS/BLOCKED）。

=== 审计包正文 ===
## 票面（registry 摘要）

## 实现者简报（主控预裁=完整任务书）
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

## 实现者报告全文
# F-TOOL-01 实现者报告——visual-diff-locate 像素差分带定位器

> 档位：GLM5.3flash 位（环境 Agent 工具无 model 参数=实际统一档，如实记）。
> 简报：scripts/audits/f-tool01-impl-brief.md（票面+主控预裁=完整任务书）。

## 1. 实现摘要

新件 `scripts/audits/visual-diff-locate.mjs`（**315 行**终态，UTF-8 零乱码，`node --check`
过；初版 313 行+回炉 1 净增 2 行，见 §8）——
纯 Node 面零 app 依赖（不 launch electron），playwright chromium headless 页内 canvas
读像素。双模式：

- **差分**：`node scripts/audits/visual-diff-locate.mjs <baselineDir> <afterDir> [s1,s2,...] [--json f]`
  ——态清单缺省=两目录同名 PNG 交集；逐态输出差分行带并落 JSON（缺省
  `scripts/audits/visual-diff-report.json`）。
- **crop**：`... <baselineDir> <afterDir> --crop <state>,<x>,<y>,<w>,<h> [--out f]`
  ——读该态两图裁矩形，上=baseline 下=after、中间 2px 分隔线，写 PNG（缺省
  `scripts/audits/visual-diff-crop.png`）；输出后 Node 侧独立读 IHDR 断言尺寸=
  裁区宽×(2×高+2)，不符 exit 1。

算法按票面钉死：16px 块网格（边缘块按实际尺寸——八态实图 1608×1009 即
101×64 网格，右缘 8px/底缘 1px 非整除块已处理）；TH6=RGB 任一通道 |a−b|>6
计差异像素；块内计数≥4 → 差分块；连续差分块行合并为行带，带 y=首行块顶..尾行
块底（含端块全界），x=带内差分块最小/最大列块全界，附块数。退出码按预裁：
有带/全零带均 exit 0（带=定位输出非判定）；参数错/文件缺 exit 2；尺寸不等
（对比前提破坏）exit 1。

## 2. 文件清单（git status 亲验——纯新增，零既有文件改动）

| 文件 | 性质 | 说明 |
|---|---|---|
| `scripts/audits/visual-diff-locate.mjs` | **实现（唯一实现面）** | 315 行（回炉 1 终态） |
| `scripts/audits/visual-diff-report.json` | 产物 | 八态差分 JSON（缺省路径） |
| `scripts/audits/visual-diff-crop.png` | 产物 | crop 自测输出 1608×194（回炉 1 后重生成） |
| `scripts/audits/f-tool01-sameimg-report.json` | 产物 | 同图对比 JSON（--json 指名，避免覆盖八态缺省件） |
| `scripts/audits/f-tool01-diff-8states.raw.txt` | 证据① | 八态实跑全输出+exit |
| `scripts/audits/f-tool01-sameimg.raw.txt` | 证据② | 同图对比零带自证+exit |
| `scripts/audits/f-tool01-crop.raw.txt` | 证据③ | crop 自测+exit（回炉 1 后重跑） |
| `scripts/audits/f-tool01-negcases.raw.txt` | 证据（补） | 退出码合同负例三支+exit |
| `scripts/audits/f-tool01-crop-order.raw.txt` | 证据（回炉 1） | crop 上下顺序验证（合成蓝/红像素判定）+exit |

## 3. 证据日志与结果

| 验收 | 命令要点 | 结果 | exit |
|---|---|---|---|
| ② 同图对比（先跑——「先红」形态） | baseline vs baseline（八态交集） | **8 态全零带**（diff-blocks=0 ×8，假阳性侧封死） | **0** |
| ① 八态实跑 | baseline vs after（缺省交集） | 8 态 42 差分带（假阴性侧反证：真差异→出带） | **0** |
| ③ crop 自测 | `--crop lib,0,0,1608,96`（lib 顶栏区） | 输出 1608×194=裁宽×(2×96+2)，工具内 IHDR 断言+独立探针（PNG 魔数/IHDR/IEND）双过 | **0** |
| 补：负例 | 无参/态缺文件/尺寸不等 | 用法 fail/`baseline 缺 nosuchstate.png`/`态 reader 两图尺寸不等: baseline=1608x1009 after=1608x194` | **2/2/1** |

全部证据基于**终态代码**重跑（中途修 sizeMismatch 消息标签颠倒后四类全量重跑，
证据-代码版本一致）。

## 4. 八态 42 带对位（验收判据⑤1——逐带归属批二 §6.2 在档预期变化区）

在档对位句（p7d01-b2-gate2-package.md §6.2）=「变化带恰落顶栏/侧栏/卡片 meta/
边标签/图例/底部版本号，无意外区」。逐带归位：

- **顶栏**（8/8 态共带）：y=[16,64) x=[48,1424)；ws-panel 另有 y=[0,192) x=[0,1424)
  （面板 overlay 自 y=0 起+遮罩缘）——批二「wspanel crop 目检 0 可见差」恰核过该区。
- **侧栏**（8/8 态共带）：y=[96,128)/[96,144) x=[0,128) 左窄条；lib/settings/reader
  另有侧栏纵向带（x∈[0,224)/[32,128) 系列延伸）。
- **卡片 meta**：lib y=[448,496) x=[240,1184)（93 块）+y=[704,752)（40 块）主区两行
  文献卡；ws-panel 同形带（93+40，面板半透明纱下同一卡片面）。
- **边标签**：lineage-canvas/lineage-side/lineage-side-tagged/dialog 四态共有
  y=[160,352) x=[0,800)（105 块）画布节点/边标签区（dialog=画布上开对话框，overlay
  下同一画布变化透出）。
- **图例**：lineage 三态 y=[464,480) x=[848,928)（5 块）右下小盒。
- **底部版本号**（8/8 态共带）：y=[944,992) x=[0,896)/[0,224)。
- **无意外区**：最大单带 144 块/6464 网格块=2.2%，无大面积全图带。
- 交叉自洽：lineage 三态与 dialog 的带值逐块相同（36/12/105/97~98）、lib 与 ws-panel
  卡片带值相同（93/40）——同一底层面在不同态中的一致呈现，佐实现对位而非噪声。

## 5. 三坑落点自证（代码行号+raw 回显双证）

| 坑 | 代码落点 | 证据 |
|---|---|---|
| ①goto file:// 原源页（禁 about:blank 后 load file） | 载体页段 `await page.goto(carrierUrl)`，carrierUrl=`pathToFileURL(htmlPath).href`（:225-226 附近） | 每 raw 回显 `载体页就绪: file:///C:/...（goto file:// 原源页）`——八态像素读通=页未挂死 |
| ②`--allow-file-access-from-files` | `chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] })`（:221 附近） | getImageData 未抛 SecurityError：八态实跑出带+同图全零带（读到真像素而非污染异常），raw 头部自证行回显 |
| ③pathToFileURL（中文路径「智慧水务」） | 载体页+baseline 图+after 图三处 `pathToFileURL(...).href`（:226/:245/:272 附近） | 工作目录即中文路径，16 次图加载（8 态×2 跑）零「页内图片加载失败」reject；file:/// URL 回显正常编码 |

页内错误监听（`page.on('pageerror')`）内建——任一坑触发会向 stderr 回显（三跑 raw
中零出现）。

## 6. locks / git

- locks：未碰（受锁/控制面=主控收口职责——预裁⑧）。注意：本新件 `.mjs` 诞生即属
  check-locks walk 受锁面，`locks:generate`+`apply` 待主控收口执行（AGENTS 自产
  工具件硬规）。
- git：零写操作（禁令遵守）；`git status --porcelain` 亲验=纯未跟踪新增，无既有文件改动。

## 7. 疑虑与自裁申报（本票预裁外的一切决定）

**疑虑 1（预判句与实测不符，请主控裁量）**：简报⑤1 末句「reader 态变化面最大属
预期（PDF 文本层字号变化）」——实测 reader diff-blocks=135 为八态**最少**档（最大=
ws-panel 322），带全部落 UI 面版区（顶栏/侧栏/底部/阅读器侧栏），无 PDF 文本层带。
物理解释：p7d01 验收 PDF=探针生成的单行小 PDF，其 canvas 渲染不消费 app `--fs-*`
token（批二改动面）；批二在档对位句也仅列 UI 区未提 reader 文本层。验收主判据
（带恰落预期区+无意外区）成立；「最大」预判与实测不符，如实申报。

**自裁清单**：
1. crop 分隔线色=#ff00ff 洋红（简报只定 2px 未定色——取与内容零撞色的高醒目值）。
2. y/x 范围输出=半开区间 `[y0,y1)` 记法（简报「含端块全界」未定开闭口径；半开=
   端块全界的无歧义表达，console 与 JSON 同口径，JSON 中 y/x 两元素数组并列）。
3. 运行期错误经 ToolError 异常→catch 记退出码→finally 清理（browser.close+临时目录
   删除）→末尾统一 exit——直接 process.exit 会跳过 finally 泄漏浏览器进程与临时目录。
4. 负例探针（negcases.raw.txt）=简报④三类证据外补充，自证退出码合同非零分支
   （2/2/1 三支）；构造素材（临时目录+复用 crop 产物当异尺寸图）用后即删。
5. 页内函数用**真函数**传 evaluate 而非字符串：playwright 的 evaluate 仅函数类型可
   带参调用（string 形态按表达式求值返回 undefined——首跑实证后修正）；且序列化
   函数不带闭包常量，16/6/4 在页内函数以字面量内联并注释声明「改值须同步头注
   与 meta」（双写面已注记，属 playwright 序列化机制的不可避免代价）。
6. 同图对比 JSON 指名 `f-tool01-sameimg-report.json`（避免覆盖八态缺省
   `visual-diff-report.json`——两份均留档）。
7. 态交集缺省时目录序=排序后（readdir sort）——确定性输出（预裁只说交集未定序）。

**卡点**：无。

## 8. 回炉 1——crop 上下顺序颠倒（主控亲核代码语义发现，先于门一修复）

**根因（两层）**：
1. **参数间接层**：调用处定义 `urlB`=baseline、`urlA`=after，而页内
   `[ia, ib]=Promise.all([load(urlA), load(urlB)])` → ia=**after** 图；随后 `drawImage(ia,…,0,0,…)`
   把 after 画在 y=0 上半、ib(baseline) 画在下半——实际输出=上 after 下 baseline，与头注
   /console「上=baseline 下=after」相反。urlA/urlB 无语义的中转命名是颠倒温床。
2. **断言盲区**：crop 输出的 IHDR 尺寸断言（宽×(2×高+2)）对**内容顺序盲**——两图同尺寸，
   上下互换不改尺寸，断言恒绿。

**修复**（visual-diff-locate.mjs，315 行终态）：cropInPage 参数改语义命名
`{ urlBase, urlAfter, … }`，加载即得 `baseImg/afterImg`，按语义名直画
（`drawImage(baseImg,…,0,0,…)` 上半 / `drawImage(afterImg,…,0,h+2,…)` 下半），
调用处同步 `urlBase/urlAfter`——消除 urlA/urlB 间接层，命名即契约；页内注释钉根因。
另：尺寸不等错误消息顺势改 `baseline=…x… after=…x…` 明示标签。

**顺序验证实验（防复发——IHDR 断言对顺序盲，须内容级判定）**：证据
`scripts/audits/f-tool01-crop-order.raw.txt`（verify_exit=0）——合成两张 64×64 纯色
PNG（baseline=纯蓝 #0000ff、after=纯红 #ff0000，node zlib 手工编码，用后即删），
crop 全图 → 输出经**独立**playwright 页内 canvas 解码读像素：
`y=30 px=[0,0,255,255]`（上半蓝=baseline）/`y=64 px=[255,0,255,255]`（分隔洋红）/
`y=98 px=[255,0,0,255]`（下半红=after）——order_assert=PASS。若顺序再颠倒，y=30 将
读到红 → 断言 FAIL（恒真排除：判定依赖像素内容非恒等式）。

**正式 crop 自测重跑**：`f-tool01-crop.raw.txt` 更新（exit=0），产物
`visual-diff-crop.png` 重生成（旧产物=颠倒版已覆盖废弃）。

**差分模式核对（主控示「不用动」，亲核注记）**：diffInPage 调用处 urlA=after 图/
urlB=baseline 图——差分运算 |a−b| 对称，图序不影响差分布与行带；其唯一的顺序敏感点=
尺寸不等消息标签，上轮已改语义键 `sizeMismatch.after/baseline` 并经 neg3 raw 亲验
（baseline=1608x1009=真 baseline 目录图）——差分面零改动、零影响。

## 完整 diff（新文件 315 行全量）
diff --git a/scripts/audits/visual-diff-locate.mjs b/scripts/audits/visual-diff-locate.mjs
new file mode 100644
index 0000000000..95793cc3fa
--- /dev/null
+++ b/scripts/audits/visual-diff-locate.mjs
@@ -0,0 +1,315 @@
+/**
+ * visual-diff-locate——像素差分带定位器（F-TOOL-01，methodology §4.1 ⑤h 三件套①固化）。
+ *
+ * §6.2 三件套使用语境：本工具=①像素差分带对位（变化带逐带归属预期组件区，
+ * 意外带=回炉信号）；输出（行带 y/x 像素范围）供②差分区 crop 目检与③DOM
+ * 计算样式断言取坐标——②即本工具 --crop 模式，③由调用方另跑探针。
+ *
+ * 用法（差分）：node scripts/audits/visual-diff-locate.mjs <baselineDir> <afterDir> [s1,s2,...]
+ *   态清单缺省=两目录同名 PNG 交集全跑；逐态输出差分行带（y 含端块全界+x 范围），
+ *   报告落 JSON（--json 缺省 scripts/audits/visual-diff-report.json）。
+ * 用法（crop）：node scripts/audits/visual-diff-locate.mjs <baselineDir> <afterDir> \
+ *   --crop <state>,<x>,<y>,<w>,<h> [--out <file>]
+ *   读该态两图裁矩形，上=baseline 下=after、中间 2px 分隔线，写 PNG
+ *   （缺省 scripts/audits/visual-diff-crop.png）。
+ *
+ * 算法（v51 配方，票面钉死）：16px 块网格（边缘块按实际尺寸）；差异像素=RGB
+ * 任一通道 |a-b|>6（TH6）；块内差异像素计数≥4（cnt≥4）→ 该块计差分块；
+ * 连续差分块行合并为行带，带 y=首行块顶..尾行块底（含端块全界），带 x=带内
+ * 差分块最小/最大列的块全界，附差分块数。
+ *
+ * 三坑规避（⑤h 原文内建）：①about:blank 加载 file:// 静默挂死 → launch 后
+ * **goto file:// 原源载体页**（HTML 载体页自身经 pathToFileURL）；②file:// 页
+ * canvas 污染 → chromium.launch args 带 **--allow-file-access-from-files**；
+ * ③本仓路径含中文（智慧水务）→ 一切文件路径（载体页+两图）经 **pathToFileURL**
+ * 编码后入页。纯 Node 面零 app 依赖（不 launch electron）。
+ *
+ * 退出码：差分有带/全零带均 exit 0（带=定位输出非失败，本工具不替人判
+ * PASS/FAIL）；参数错/文件缺 exit 2；两图尺寸不等（对比前提破坏）exit 1。
+ */
+import { chromium } from 'playwright'
+import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
+import { existsSync, readFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { dirname, isAbsolute, join, resolve } from 'node:path'
+import { fileURLToPath, pathToFileURL } from 'node:url'
+
+const HERE = dirname(fileURLToPath(import.meta.url))
+const BLOCK = 16
+const TH = 6
+const CNT = 4
+const DEFAULT_JSON = join(HERE, 'visual-diff-report.json')
+const DEFAULT_CROP_PNG = join(HERE, 'visual-diff-crop.png')
+
+// ── CLI ─────────────────────────────────────────────────────────────
+function parseArgs(argv) {
+  const pos = []
+  const opts = { crop: null, out: null, json: null }
+  for (let i = 0; i < argv.length; i += 1) {
+    const a = argv[i]
+    if (a === '--crop' || a === '--out' || a === '--json') {
+      const v = argv[i + 1]
+      if (v === undefined) fail(2, `参数 ${a} 缺值`)
+      opts[a.slice(2)] = v
+      i += 1
+    } else if (a.startsWith('--')) {
+      fail(2, `未知参数 ${a}`)
+    } else {
+      pos.push(a)
+    }
+  }
+  if (pos.length < 2 || pos.length > 3) {
+    fail(2, '用法: node scripts/audits/visual-diff-locate.mjs <baselineDir> <afterDir> [s1,s2,...] [--json f] | --crop <state>,<x>,<y>,<w>,<h> [--out f]')
+  }
+  if (opts.crop !== null) {
+    const parts = opts.crop.split(',')
+    const nums = parts.slice(1).map((n) => Number(n))
+    if (parts.length !== 5 || !parts[0] || nums.some((n) => !Number.isInteger(n))) {
+      fail(2, `--crop 格式应为 <state>,<x>,<y>,<w>,<h>（整数），实得 "${opts.crop}"`)
+    }
+    const [x, y, w, h] = nums
+    if (x < 0 || y < 0 || w <= 0 || h <= 0) fail(2, `--crop 区域须 x,y>=0 且 w,h>0，实得 (${x},${y},${w},${h})`)
+    opts.cropRect = { x, y, w, h }
+    opts.cropState = parts[0]
+  }
+  return { baselineDir: pos[0], afterDir: pos[1], statesArg: pos[2] ?? null, ...opts }
+}
+
+function fail(code, msg) {
+  console.error(`[visual-diff-locate][FAIL] ${msg}`)
+  process.exit(code)
+}
+
+/** 页内差分（evaluate 函数——playwright 仅函数类型可带参调用，字符串按表达式求值）。
+ *  参数=单对象（playwright 限制多参数须封装）。数字字面量内联（序列化函数不带闭包）：
+ *  16=块边长 / 6=TH / 4=CNT——与票面钉死配方一致，改值须同步头注与 meta。
+ *  getImageData 可读的前提=launch 带 --allow-file-access-from-files（坑②——否则
+ *  file:// 页 canvas 污染抛 SecurityError）。 */
+async function diffInPage({ urlA, urlB }) {
+  const load = (url) => new Promise((res, rej) => {
+    const img = new Image()
+    img.onload = () => res(img)
+    img.onerror = () => rej(new Error('页内图片加载失败: ' + url))
+    img.src = url
+  })
+  const [ia, ib] = await Promise.all([load(urlA), load(urlB)])
+  const w = ia.naturalWidth, h = ia.naturalHeight
+  if (ib.naturalWidth !== w || ib.naturalHeight !== h) {
+    // urlA=after 图 / urlB=baseline 图（Node 侧调用约定）——尺寸键按此命名防标签颠倒
+    return { sizeMismatch: { after: [w, h], baseline: [ib.naturalWidth, ib.naturalHeight] } }
+  }
+  const grab = (img) => {
+    const c = document.createElement('canvas')
+    c.width = w; c.height = h
+    const x = c.getContext('2d', { willReadFrequently: true })
+    x.drawImage(img, 0, 0)
+    return x.getImageData(0, 0, w, h).data
+  }
+  const da = grab(ia), db = grab(ib)
+  const gw = Math.ceil(w / 16), gh = Math.ceil(h / 16)
+  const blocks = new Uint8Array(gw * gh)
+  for (let by = 0; by < gh; by += 1) {
+    const y0 = by * 16, y1 = Math.min(y0 + 16, h)
+    for (let bx = 0; bx < gw; bx += 1) {
+      const x0 = bx * 16, x1 = Math.min(x0 + 16, w)
+      let cnt = 0
+      hit: for (let y = y0; y < y1; y += 1) {
+        let i = (y * w + x0) * 4
+        for (let x = x0; x < x1; x += 1, i += 4) {
+          const dr = da[i] - db[i], dg = da[i + 1] - db[i + 1], dbl = da[i + 2] - db[i + 2]
+          if (dr > 6 || dr < -6 || dg > 6 || dg < -6 || dbl > 6 || dbl < -6) {
+            cnt += 1
+            if (cnt >= 4) { blocks[by * gw + bx] = 1; break hit }
+          }
+        }
+      }
+    }
+  }
+  return { w, h, gw, gh, blocks: Array.from(blocks) }
+}
+
+/** 页内 crop：裁两图同区上下拼接（上=baseline 下=after，中间 2px 分隔线
+ *  #ff00ff），返回 PNG dataURL。同样=单对象参数（playwright 限制）。 */
+async function cropInPage({ urlBase, urlAfter, x, y, w, h }) {
+  const load = (url) => new Promise((res, rej) => {
+    const img = new Image()
+    img.onload = () => res(img)
+    img.onerror = () => rej(new Error('页内图片加载失败: ' + url))
+    img.src = url
+  })
+  const [baseImg, afterImg] = await Promise.all([load(urlBase), load(urlAfter)])
+  const W = baseImg.naturalWidth, H = baseImg.naturalHeight
+  if (afterImg.naturalWidth !== W || afterImg.naturalHeight !== H) {
+    throw new Error('两图尺寸不等: baseline=' + W + 'x' + H + ' after=' + afterImg.naturalWidth + 'x' + afterImg.naturalHeight)
+  }
+  if (x + w > W || y + h > H) {
+    throw new Error('crop 区域越界: (' + x + ',' + y + ',' + w + ',' + h + ') vs 图 ' + W + 'x' + H)
+  }
+  const out = document.createElement('canvas')
+  out.width = w; out.height = h * 2 + 2
+  const ctx = out.getContext('2d')
+  // 拼接契约（头注）：上=baseline 下=after——按语义参数名直画，禁 urlA/urlB 式间接层
+  // （回炉 1 根因：间接层致 ia=after 被画上半而 IHDR 尺寸断言对内容顺序盲）。
+  ctx.drawImage(baseImg, x, y, w, h, 0, 0, w, h)
+  ctx.fillStyle = '#ff00ff'
+  ctx.fillRect(0, h, w, 2)
+  ctx.drawImage(afterImg, x, y, w, h, 0, h + 2, w, h)
+  return out.toDataURL('image/png')
+}
+
+// ── 行带聚合（Node 侧）：连续差分块行 → 带 ──────────────────────────
+function aggregateBands(blocks, gw, gh, w, h) {
+  const rowHasDiff = (by) => {
+    for (let bx = 0; bx < gw; bx += 1) if (blocks[by * gw + bx]) return true
+    return false
+  }
+  const bands = []
+  let total = 0
+  let by = 0
+  while (by < gh) {
+    if (!rowHasDiff(by)) { by += 1; continue }
+    let end = by
+    while (end + 1 < gh && rowHasDiff(end + 1)) end += 1
+    let minX = gw, maxX = -1, count = 0
+    for (let r = by; r <= end; r += 1) {
+      for (let bx = 0; bx < gw; bx += 1) {
+        if (!blocks[r * gw + bx]) continue
+        count += 1
+        if (bx < minX) minX = bx
+        if (bx > maxX) maxX = bx
+      }
+    }
+    total += count
+    bands.push({
+      y0: by * BLOCK,
+      y1: Math.min((end + 1) * BLOCK, h),
+      x0: minX * BLOCK,
+      x1: Math.min((maxX + 1) * BLOCK, w),
+      rows: end - by + 1,
+      blocks: count
+    })
+    by = end + 1
+  }
+  return { bands, totalDiffBlocks: total }
+}
+
+// ── 主链 ────────────────────────────────────────────────────────────
+const args = parseArgs(process.argv.slice(2))
+const absDir = (p, label) => {
+  const r = isAbsolute(p) ? p : resolve(process.cwd(), p)
+  if (!existsSync(r) || !existsSync(join(r, '.'))) fail(2, `${label} 目录不存在: ${p}`)
+  return r
+}
+const baselineDir = absDir(args.baselineDir, 'baseline')
+const afterDir = absDir(args.afterDir, 'after')
+
+const pngStates = async (d) => (await readdir(d)).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)).sort()
+let states
+if (args.statesArg !== null) {
+  states = args.statesArg.split(',').map((s) => s.trim()).filter(Boolean)
+  if (!states.length) fail(2, '态清单为空')
+} else {
+  const baseStates = await pngStates(baselineDir)
+  const afterSet = new Set(await pngStates(afterDir))
+  states = baseStates.filter((s) => afterSet.has(s))
+  if (!states.length) fail(2, `两目录无同名 PNG 交集（${baselineDir} vs ${afterDir}）`)
+}
+for (const s of states) {
+  for (const [d, label] of [[baselineDir, 'baseline'], [afterDir, 'after']]) {
+    if (!existsSync(join(d, `${s}.png`))) fail(2, `${label} 缺 ${s}.png（目录 ${d}）`)
+  }
+}
+if (args.crop !== null) {
+  for (const [d, label] of [[baselineDir, 'baseline'], [afterDir, 'after']]) {
+    if (!existsSync(join(d, `${args.cropState}.png`))) fail(2, `${label} 缺 ${args.cropState}.png（目录 ${d}）`)
+  }
+}
+
+/** 运行期错误（浏览器已开）——不直接 process.exit（会跳过 finally 清理），经 catch 收退出码。 */
+class ToolError extends Error {
+  constructor(code, msg) {
+    super(msg)
+    this.code = code
+  }
+}
+const bail = (code, msg) => { throw new ToolError(code, msg) }
+
+console.log('[visual-diff-locate] 算法: 16px 块网格 / TH6=RGB 任一通道 |a-b|>6 / cnt>=4 → 差分块; 连续差分行合并为带')
+console.log(`[visual-diff-locate] 三坑自证: ①goto file:// 载体原源页 ②launch --allow-file-access-from-files ③全部路径 pathToFileURL（仓路径含中文）`)
+console.log(`[visual-diff-locate] baseline=${baselineDir}`)
+console.log(`[visual-diff-locate] after=${afterDir}`)
+console.log(`[visual-diff-locate] states(${states.length})=${states.join(',')}`)
+
+// 载体页（坑①：launch 后 goto file:// 原源页——临时 HTML 自身 pathToFileURL）
+const tmpDir = await mkdtemp(join(tmpdir(), 'vd-locate-'))
+const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] })
+let exitCode = 0
+try {
+  const page = await browser.newPage()
+  page.on('pageerror', (e) => console.error(`[visual-diff-locate][页内错误] ${e}`))
+  const htmlPath = join(tmpDir, 'carrier.html')
+  await writeFile(htmlPath, '<!doctype html><meta charset="utf-8"><title>visual-diff-locate carrier</title><body></body>\n')
+  const carrierUrl = pathToFileURL(htmlPath).href
+  await page.goto(carrierUrl)
+  console.log(`[visual-diff-locate] 载体页就绪: ${carrierUrl}（goto file:// 原源页）`)
+
+  if (args.crop !== null) {
+    // ── crop 模式 ──（urlBase/urlAfter 语义命名——与页内直画名一一对应，防顺序再颠倒）
+    const { x, y, w, h } = args.cropRect
+    const urlBase = pathToFileURL(join(baselineDir, `${args.cropState}.png`)).href
+    const urlAfter = pathToFileURL(join(afterDir, `${args.cropState}.png`)).href
+    console.log(`[crop] state=${args.cropState} 区域=(${x},${y},${w},${h}) 上=baseline 下=after 分隔=2px#ff00ff`)
+    const dataUrl = await page.evaluate(cropInPage, { urlBase, urlAfter, x, y, w, h })
+    const pngPath = args.out !== null ? (isAbsolute(args.out) ? args.out : resolve(process.cwd(), args.out)) : DEFAULT_CROP_PNG
+    await writeFile(pngPath, Buffer.from(dataUrl.split(',')[1], 'base64'))
+    const ihdrW = readFileSync(pngPath).readUInt32BE(16)
+    const ihdrH = readFileSync(pngPath).readUInt32BE(20)
+    const wantH = h * 2 + 2
+    console.log(`[crop] 输出 ${pngPath} IHDR=${ihdrW}x${ihdrH}（期望 ${w}x${wantH}）`)
+    if (ihdrW !== w || ihdrH !== wantH) bail(1, `crop 输出尺寸 ${ihdrW}x${ihdrH} != 期望 ${w}x${wantH}`)
+    console.log('[crop] OK')
+  } else {
+    // ── 差分模式 ──
+    const report = {
+      meta: {
+        tool: 'scripts/audits/visual-diff-locate.mjs',
+        date: new Date().toISOString(),
+        algorithm: { blockPx: BLOCK, threshold: `RGB 任一通道 |a-b|>${TH}`, minDiffPixels: CNT },
+        baselineDir, afterDir, states
+      },
+      states: {}
+    }
+    let grandBands = 0
+    for (const s of states) {
+      const bp = join(baselineDir, `${s}.png`)
+      const ap = join(afterDir, `${s}.png`)
+      const r = await page.evaluate(diffInPage, { urlA: pathToFileURL(ap).href, urlB: pathToFileURL(bp).href })
+      if (r.sizeMismatch) {
+        bail(1, `态 ${s} 两图尺寸不等: baseline=${r.sizeMismatch.baseline[0]}x${r.sizeMismatch.baseline[1]} after=${r.sizeMismatch.after[0]}x${r.sizeMismatch.after[1]}（对比前提破坏）`)
+      }
+      const { bands, totalDiffBlocks } = aggregateBands(r.blocks, r.gw, r.gh, r.w, r.h)
+      grandBands += bands.length
+      const zero = bands.length === 0 ? ' （零带）' : ''
+      console.log(`[state] ${s} ${r.w}x${r.h} grid=${r.gw}x${r.gh} diff-blocks=${totalDiffBlocks} bands=${bands.length}${zero}`)
+      for (const [i, b] of bands.entries()) {
+        console.log(`  band ${i + 1}: y=[${b.y0},${b.y1}) x=[${b.x0},${b.x1}) rows=${b.rows} blocks=${b.blocks}`)
+      }
+      report.states[s] = {
+        width: r.w, height: r.h, gridW: r.gw, gridH: r.gh,
+        diffBlocks: totalDiffBlocks, bandCount: bands.length,
+        bands: bands.map((b) => ({ y: [b.y0, b.y1], x: [b.x0, b.x1], rows: b.rows, blocks: b.blocks }))
+      }
+    }
+    const jsonPath = args.json !== null ? (isAbsolute(args.json) ? args.json : resolve(process.cwd(), args.json)) : DEFAULT_JSON
+    await writeFile(jsonPath, JSON.stringify(report, null, 2))
+    console.log(`[visual-diff-locate] 汇总: ${states.length} 态 / ${grandBands} 差分带 / JSON=${jsonPath}`)
+    console.log('[visual-diff-locate] 完成（带=定位输出非判定——对位归调用方，见头注三件套语境）')
+  }
+} catch (e) {
+  exitCode = e instanceof ToolError ? e.code : 2
+  console.error(`[visual-diff-locate][FAIL] ${e instanceof ToolError ? e.message : `执行异常: ${e}`}`)
+} finally {
+  await browser.close()
+  await rm(tmpDir, { recursive: true, force: true })
+}
+process.exit(exitCode)

## 证据摘录
### 八态实跑（八态 42 带——节选 dialog/lib 全带+reader/settings/ws-panel 头）
[visual-diff-locate] 算法: 16px 块网格 / TH6=RGB 任一通道 |a-b|>6 / cnt>=4 → 差分块; 连续差分行合并为带
[visual-diff-locate] 三坑自证: ①goto file:// 载体原源页 ②launch --allow-file-access-from-files ③全部路径 pathToFileURL（仓路径含中文）
[visual-diff-locate] baseline=E:\class\智慧水务\Synapse_remake\scripts\audits\p7d01-out\baseline
[visual-diff-locate] after=E:\class\智慧水务\Synapse_remake\scripts\audits\p7d01-out\after
[visual-diff-locate] states(8)=dialog,lib,lineage-canvas,lineage-side,lineage-side-tagged,reader,settings,ws-panel
[visual-diff-locate] 载体页就绪: file:///C:/Users/ADMINI%7E1/AppData/Local/Temp/vd-locate-HfeJBs/carrier.html（goto file:// 原源页）
[state] dialog 1608x1009 grid=101x64 diff-blocks=250 bands=4
  band 1: y=[16,64) x=[48,1424) rows=3 blocks=36
  band 2: y=[96,128) x=[32,128) rows=2 blocks=12
  band 3: y=[160,352) x=[0,800) rows=12 blocks=105
  band 4: y=[944,992) x=[0,896) rows=3 blocks=97
[state] lib 1608x1009 grid=101x64 diff-blocks=253 bands=8
  band 1: y=[16,64) x=[48,1424) rows=3 blocks=36
  band 2: y=[96,144) x=[0,224) rows=3 blocks=27
  band 3: y=[160,192) x=[32,128) rows=2 blocks=12
  band 4: y=[208,240) x=[32,112) rows=2 blocks=10
  band 5: y=[256,304) x=[32,112) rows=3 blocks=7
  band 6: y=[448,496) x=[240,1184) rows=3 blocks=93
  band 7: y=[704,752) x=[240,720) rows=3 blocks=40
  band 8: y=[944,992) x=[0,224) rows=3 blocks=28
[state] lineage-canvas 1608x1009 grid=101x64 diff-blocks=256 bands=5
  band 1: y=[16,64) x=[48,1424) rows=3 blocks=36
  band 2: y=[96,128) x=[32,128) rows=2 blocks=12
  band 3: y=[160,352) x=[0,800) rows=12 blocks=105
  band 4: y=[464,480) x=[848,928) rows=1 blocks=5
  band 5: y=[944,992) x=[0,896) rows=3 blocks=98
[state] lineage-side 1608x1009 grid=101x64 diff-blocks=256 bands=5
  band 1: y=[16,64) x=[48,1424) rows=3 blocks=36
  band 2: y=[96,128) x=[32,128) rows=2 blocks=12
  band 3: y=[160,352) x=[0,800) rows=12 blocks=105
  band 4: y=[464,480) x=[848,928) rows=1 blocks=5
  band 5: y=[944,992) x=[0,896) rows=3 blocks=98
[state] lineage-side-tagged 1608x1009 grid=101x64 diff-blocks=256 bands=5
  band 1: y=[16,64) x=[48,1424) rows=3 blocks=36
  band 2: y=[96,128) x=[32,128) rows=2 blocks=12
  band 3: y=[160,352) x=[0,800) rows=12 blocks=105
  band 4: y=[464,480) x=[848,928) rows=1 blocks=5
  band 5: y=[944,992) x=[0,896) rows=3 blocks=98
[state] reader 1608x1009 grid=101x64 diff-blocks=135 bands=5
  band 1: y=[16,64) x=[48,1424) rows=3 blocks=36
  band 2: y=[96,128) x=[32,128) rows=2 blocks=12
  band 3: y=[144,240) x=[0,224) rows=6 blocks=52
  band 4: y=[256,304) x=[32,112) rows=3 blocks=7
  band 5: y=[944,992) x=[0,224) rows=3 blocks=28
[state] settings 1608x1009 grid=101x64 diff-blocks=137 bands=4
  band 1: y=[16,64) x=[48,1424) rows=3 blocks=36
  band 2: y=[96,128) x=[32,128) rows=2 blocks=12
  band 3: y=[160,304) x=[0,224) rows=9 blocks=61
  band 4: y=[944,992) x=[0,224) rows=3 blocks=28
[state] ws-panel 1608x1009 grid=101x64 diff-blocks=322 bands=6
…
[visual-diff-locate] 汇总: 8 态 / 42 差分带 / JSON=E:\class\智慧水务\Synapse_remake\scripts\audits\visual-diff-report.json
[visual-diff-locate] 完成（带=定位输出非判定——对位归调用方，见头注三件套语境）
exit=0
### 同图对比（八态全零带）
[state] dialog 1608x1009 grid=101x64 diff-blocks=0 bands=0 （零带）
[state] lib 1608x1009 grid=101x64 diff-blocks=0 bands=0 （零带）
[state] lineage-canvas 1608x1009 grid=101x64 diff-blocks=0 bands=0 （零带）
[state] lineage-side 1608x1009 grid=101x64 diff-blocks=0 bands=0 （零带）
[state] lineage-side-tagged 1608x1009 grid=101x64 diff-blocks=0 bands=0 （零带）
[state] reader 1608x1009 grid=101x64 diff-blocks=0 bands=0 （零带）
[state] settings 1608x1009 grid=101x64 diff-blocks=0 bands=0 （零带）
[state] ws-panel 1608x1009 grid=101x64 diff-blocks=0 bands=0 （零带）
[visual-diff-locate] 完成（带=定位输出非判定——对位归调用方，见头注三件套语境）
exit=0
### crop 顺序验证（回炉 1 证据）
[crop] OK
tool_exit=0
decode size=64x130（期望 64x130）
y=30 上半  px=[0,0,255,255]（期望 ≈[0,0,255,255] 蓝=baseline）
y=64 分隔  px=[255,0,255,255]（期望 ≈[255,0,255,255] 洋红）
y=98 下半  px=[255,0,0,255]（期望 ≈[255,0,0,255] 红=after）
order_assert=PASS（上蓝=baseline 下红=after——顺序正确）
verify_exit=0
### crop 自测（IHDR 断言）
[crop] 输出 E:\class\智慧水务\Synapse_remake\scripts\audits\visual-diff-crop.png IHDR=1608x194（期望 1608x194）
[crop] OK
exit=0
### 负例三支（退出码合同）
[visual-diff-locate][FAIL] 用法: node scripts/audits/visual-diff-locate.mjs <baselineDir> <afterDir> [s1,s2,...] [--json f] | --crop <state>,<x>,<y>,<w>,<h> [--out f]
neg1_noargs exit=2
[visual-diff-locate][FAIL] baseline 缺 nosuchstate.png（目录 E:\class\智慧水务\Synapse_remake\scripts\audits\p7d01-out\baseline）
neg2_missing_state exit=2
[visual-diff-locate][FAIL] 态 reader 两图尺寸不等: baseline=1608x1009 after=1608x194（对比前提破坏）
neg3_size_mismatch exit=1
