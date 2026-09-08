[routing]: run=20260908190219-uzii source=deepseek model=deepseek-v4-flash switches=0 usage=in=7532,out=30471 latency=213250ms (by ds-call.mjs 链)

行号按新文件正文计（`@@ -0,0 +1,333 @@`，L1–L333）。

## 一、逐条裁定

### [B-1] crop 模式尺寸不等退出码违约 → **ADDRESSED**
- L147–150：`cropInPage` 不再对尺寸不等抛普通 `Error`，改为返回 `{ sizeMismatch: { baseline, after } }`。
- L276–279：crop 主链收到 `sizeMismatch` 后走 `bail(1, …)`，退出码固定为 1。
- L304–306：差分模式同构，尺寸不等同样 `bail(1)`。

证据链完整，报告中的 neg5 实测 `exit=1` 与代码路径一致。

### [W-1] absDir 无法区分文件与目录 → **ADDRESSED**
- L205–211：`absDir` 改为 `statSync(r)` + `st.isDirectory()`。
- L209：不存在 → `fail(2, “目录不存在”)`。
- L210：存在但不是目录 → `fail(2, “不是目录（传了文件路径?）”)`。

已替换 `existsSync(join(r, '.'))` 的失真判断，neg4 的 `exit=2` 可由此路径解释。

### [W-2] mkdtemp/launch 在 try/finally 之外，launch 抛错泄漏 tmpDir → **ADDRESSED**
- L256–258：`exitCode`、`tmpDir`、`browser` 均预先声明为 `null`。
- L260–261：`mkdtemp` 与 `chromium.launch` 已移入 `try`。
- L329–331：`finally` 判空执行 `browser.close()` 与 `rm(tmpDir, …)`。

launch 抛错时 `browser` 仍为 `null`，不会调用 `close`；`tmpDir` 非 `null` 则会被清理。W-2 修复成立。

### [N-1] 负例盲区 → **ADDRESSED**
本包回炉 2 报告给出 neg1–neg6 六支重跑结果。代码侧可对应：
- neg4：目录参数传文件路径 → L210 `fail(2)`。
- neg3/neg5：尺寸不等 → L304–306 / L276–279 `bail(1)`。
- neg6：伪 `.png` → 页内 `Image.onerror`（L97/L142）抛普通 Error，主 catch L326–328 记 `exit=2`，与报告实测一致。

我只能看到报告中 exit code 摘要、无法重放 raw 文件；就本包证据而言，代码路径与声称结果一致，裁 **ADDRESSED**。

### [N-2] 页内字面量 16/6/4 双写漂移无守卫 → **ADDRESSED**（按主控裁量）
- L20–21：头注已增“参数对位表”说明 `BLOCK/TH/CNT=16/6/4 ↔ 页内 diffInPage 字面量 16/6/4`。

主控已裁定不加运行时守卫，本项按头注对位表落地，不再攻击。

### [N-3] crop 模式静默忽略态清单参数 → **ADDRESSED**
- L66–68：`opts.crop !== null && pos.length === 3` 时直接 `fail(2, “crop 模式不接受态清单参数”)`。

修复有效，不再静默忽略。

---

## 二、新破坏扫描

未发现高置信的、由本次修复本身引入的新缺陷。逐行扫描中只有一项低置信防御性缺口，不确定实际触发，明确标注如下：

- **低置信**：L329–331 的清理是线性顺序：
  ```js
  if (browser !== null) await browser.close()
  if (tmpDir !== null) await rm(tmpDir, …)
  ```
  如果 `browser.close()` 在浏览器已异常退出/失联时 reject（我无法在本包证据中确认 Playwright 该场景是否抛错），则下一行 `rm(tmpDir)` 不会执行，仍可能留下临时目录。若要严格保证 W-2 的清理目标，可用嵌套 `try/finally` 或让 `browser.close()` 自身容错。  
  由于触发条件不确定，不据此改判 W-2。

其余修复点未发现新的静默失败、退出码漂移或边界回归。