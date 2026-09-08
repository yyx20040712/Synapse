# F-TOOL-01 实现者报告——visual-diff-locate 像素差分带定位器

> 档位：GLM5.3flash 位（环境 Agent 工具无 model 参数=实际统一档，如实记）。
> 简报：scripts/audits/f-tool01-impl-brief.md（票面+主控预裁=完整任务书）。

## 1. 实现摘要

新件 `scripts/audits/visual-diff-locate.mjs`（**333 行**终态，UTF-8 零乱码，`node --check`
过；初版 313+回炉 1 净增 2+回炉 2 净增 18，见 §8/§9）——
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
| `scripts/audits/visual-diff-locate.mjs` | **实现（唯一实现面）** | 333 行（回炉 2 终态） |
| `scripts/audits/visual-diff-report.json` | 产物 | 八态差分 JSON（缺省路径） |
| `scripts/audits/visual-diff-crop.png` | 产物 | crop 自测输出 1608×194（回炉 1 后重生成） |
| `scripts/audits/f-tool01-sameimg-report.json` | 产物 | 同图对比 JSON（--json 指名，避免覆盖八态缺省件） |
| `scripts/audits/f-tool01-diff-8states.raw.txt` | 证据① | 八态实跑全输出+exit |
| `scripts/audits/f-tool01-sameimg.raw.txt` | 证据② | 同图对比零带自证+exit |
| `scripts/audits/f-tool01-crop.raw.txt` | 证据③ | crop 自测+exit（回炉 1 后重跑） |
| `scripts/audits/f-tool01-negcases.raw.txt` | 证据（补/回炉 2 扩） | 退出码合同负例六支+exit |
| `scripts/audits/f-tool01-crop-order.raw.txt` | 证据（回炉 1/2 重跑） | crop 上下顺序验证（合成蓝/红像素判定）+exit |

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

## 9. 回炉 2——门一 BLOCKED（deepseek 兜底审出 1B/2W/3N，主控裁决全收）

终态 `visual-diff-locate.mjs` **333 行**（回炉 1 后 315+净增 18）。逐条处置：

**[B-1] crop 尺寸不等退出码违约——ADDRESSED**。根因：cropInPage 对尺寸不等抛普通
Error → 主 catch 记 exitCode=2，违反合同「尺寸不等=1」。修复采主控建议的**与差分
同构**形态：页内改返回 `{ sizeMismatch: { baseline:[…], after:[…] } }`（语义键——
顺带继承回炉 1 的防标签颠倒设计），Node 侧 `bail(1, …)`。验证=neg5（构造
baseline=1009 真图/after=194 crop 图 → `crop 两图尺寸不等: baseline=1608x1009
after=1608x194`）**exit=1** ✓。

**[W-1] absDir 目录判定失真——ADDRESSED**。根因：`existsSync(join(r,'.'))` 经路径
规范化=r 本身，传 PNG 文件路径不拦 → 后续 readdir 未捕获异常、退出码非合同 2。
修复：`statSync(r).isDirectory()` 判定（try 包裹不存在路径），非目录
`fail(2, '… 不是目录（传了文件路径?）…')`。验证=neg4 **exit=2** ✓。

**[W-2] mkdtemp/launch 在 try 外——ADDRESSED**。根因：launch 抛错（浏览器缺失等）
→ tmpDir 泄漏+browser.close 无从调用。修复：`tmpDir=null`/`browser=null` 先行声明，
mkdtemp+launch **移入 try**，finally 判空清理（`if (browser !== null) await
browser.close()` / `if (tmpDir !== null) await rm(…)`）——任一阶段异常均不泄漏。

**[N-1] 负例补三支——ADDRESSED**。`f-tool01-negcases.raw.txt` 六支全量重跑（标注
「回炉 2 终态代码」）：neg1 无参=**2**/neg2 态缺文件=**2**/neg3 差分尺寸不等=**1**/
neg4 目录传文件路径=**2**/neg5 crop 尺寸不等（B-1 验证）=**1**/neg6 .png 改名文本
（页内 Image onerror「页内图片加载失败」→主 catch 执行异常）实测落码=**2**（合同内
「文件缺/不可读」族非零码，如实记）。注：neg3 首跑构造失误（after 误传真 after 目录
致两图同尺寸正常跑完 exit=0——测试脚本错误非工具缺陷），修正素材（after 目录置
194px reader.png）后六支一次成型重跑，散件 retry 已删。

**[N-2] 头注参数对位表——ADDRESSED**。头注算法段后增一行：「参数对位表：Node 侧
BLOCK/TH/CNT=16/6/4 ↔ 页内 diffInPage 字面量 16/6/4（序列化不带闭包——改值双写面，
两处须同步）」。按主控裁量不加运行时守卫。

**[N-3] crop+态清单互斥——ADDRESSED**。parseArgs 增：`--crop` 在场且第三位置参数
（态清单）在场 → `fail(2, 'crop 模式不接受态清单参数（--crop 已指定态）')`。

**终态代码证据一致性重跑（全部基于回炉 2 终态）**：八态实跑
`f-tool01-diff-8states.raw.txt`（8 态 42 带，与回炉前逐值一致——算法面零触碰）exit=0；
同图对比 `f-tool01-sameimg.raw.txt`（八态全零带）exit=0；crop 自测
`f-tool01-crop.raw.txt`（1608×194）exit=0；顺序验证 `f-tool01-crop-order.raw.txt`
（上蓝/分隔洋红/下红 order_assert=PASS）verify_exit=0。
