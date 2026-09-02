# F-R3 轨二 c 实现者简报——CorpusExtractor 加载失败路径补 destroy（闭 P6 worker 泄漏）

> 单号=F-R3（AUDIT-C C-1 修票·轨二 c）。票面母本=scripts/audits/
> f-r3-investigation.md §5（修票素材三件 v3 终排）+§3.2 P6 行+§4 误伤核对。
> 轨一（上游查证+不升级裁决）与 INV 增补=主控面，不在本单实现范围。

## ① 身份与禁令

- 你是**实现者子代理**（AUDIT-C 二波修票场）。领单号=F-R3 轨二 c。
- 禁 git add/commit/push；禁翻 tickets/registry.ts（控制面单写者纪律，主控收口时翻状态）。
- 受锁文件触碰面=**仅** tests/unit/renderer/corpus-extractor.test.ts（主控已解锁，
  你只许**文末追加**新 describe 块，禁改既有用例/既有 import 段之外的任何行）。
  其余受锁文件一律不碰。
- 禁新增依赖；禁超票面自裁（一切超票面决定停下申报=BLOCKED）。
- shell 前导 PATH 有 node v25 漂移坑：**一切 node/npm 调用前先
  `export PATH=/d/nodejs24:$PATH`**。

## ② 必读序（逐文件清单化）

1. `AGENTS.md`（宪法——硬规则+测试纪律）
2. 本简报全文（=票面五层规约的浓缩载体）
3. `scripts/audits/f-r3-investigation.md` §3.2 P6 行+§4+§5（票面素材——为什么修、
   修什么、不修什么）
4. `src/renderer/features/reader/CorpusExtractor.ts` 全文（**实现对象**——头注
   状态机表 :23-36+loadPdfDocument :180-190+runExtraction finally :256-265）
5. `src/renderer/features/reader/PdfDocProvider.tsx` :68-92（先例池——task 句柄
   在册+失败/卸载两形态 destroy 的正确形态对照）
6. `tests/unit/renderer/corpus-extractor.test.ts`（受锁测试件——桩形态+既有断言
   风格，新用例桩同形）
7. `scripts/audits/f-r3-upstream-check.md`（轨一查证档案——背景认知：泄漏=每 task
   一个专属 worker 线程，destroy 是唯一终止口）

## ③ 主控裁决（票面范围内澄清——实现者不再自裁这些点）

**缺陷**（排查实锤，档案在案）：`loadPdfDocument`（CorpusExtractor.ts:180-190）
`return getDocument(url).promise` **丢弃 loadingTask 句柄**——加载失败时
runExtraction 的 `doc` 恒 null，finally 的 `doc.destroy()` 不可达 → 每次提取加载
失败**泄漏一个专属 worker 线程**（P6）。头注状态机表 :31 行「文档加载失败→
destroy（失败也释放）」被证伪（文档与实现不符）。

**修法**（主控设计，实现者照做）：

1. 新导出**纯函数**（模块级，可单测锚——loadPdfDocument 本体是动态 import
   不可单测，故抽纯件）：

```ts
/** pdfjs loadingTask 形状契约（终接清理面——生产=PDFDocumentLoadingTask） */
export interface PdfjsLoadTaskLike<T> {
  readonly promise: Promise<T>
  destroy(): Promise<void>
}

/**
 * 取 settle 后文档；加载失败即销毁 loadingTask（终止其专属 worker 线程）后
 * 原样重抛——失败路径 task 句柄不可达则 worker 泄漏（F-R3 排查 P6 实锤）
 */
export async function settleLoadTask<T>(task: PdfjsLoadTaskLike<T>): Promise<T> {
  try {
    return await task.promise
  } catch (err) {
    await task.destroy().catch(() => undefined)
    throw err
  }
}
```

   （命名/注释可按模块语言微调，**契约不得变**：成功=透传 resolve 且不调 destroy；
   失败=destroy 恰一次（其自身拒绝吞并）后重抛原错误。）

2. `loadPdfDocument` 接线：`const task = getDocument(url)` →
   `return settleLoadTask(task) as unknown as Promise<PdfjsDocumentLike>`
   （cast 形态循既有 `as unknown as` 惯例；**成功路径行为零变**——doc.destroy
   归 runExtraction finally，与 PdfDocProvider 句柄生命周期语义一致）。
3. 头注状态机表 :31 行改为如实双路径（示意，措辞可润）：
   「文档加载失败 → failed（上报 error；**loadingTask.destroy 在加载器内终接
   清理——worker 线程不泄漏**）/invoke 折叠错误/提取异常 → failed（上报 error；
   doc.destroy 归 finally——失败也释放）」。同步 :35 跨格序列②不 Redundant 改写。
4. **不做**：不动 runExtraction/不动事件防御分支/不动 PdfDocProvider/
   不加 destroy 序列化（轨二 b 另裁）/不动 e2e。

**测试**（受锁件文末追加，**always-active**——新用例**禁** guardedDescribe，直接
describe/it；桩风格循既有件）：

- 成功路径：resolve 原值+destroy 未被调用（断言 destroyCalls===0）。
- 失败路径：重抛原错误（同引用或同消息）+destroy 恰一次。
- 失败且 destroy 自身 reject：仍重抛**原**错误（destroy 错误被吞并——不覆盖）。
- 三用例均不依赖时序 sleep（纯 promise 微任务即可）。

## ④ 纪律

- TDD：**先写测试→首红落盘**（此时 settleLoadTask 尚不存在=编译红也算红，但
  首红落盘必须是「实现缺失红」的原始输出；随后实现→绿）。红/绿原始输出各自
  落盘 `scripts/audits/f-r3-fix-*.raw.txt`（.raw.txt 后缀入 git；.log 被
  .gitignore 拦）。
- **断言级变异红证**（≥1 个）：临时注释/删除 catch 分支的 destroy 调用 → 失败
  路径用例必须红 → 还原。变异与还原的输出均落盘。还原用 **cp 备份法**
  （禁 git checkout——未提交实现会被一并抹掉）。
- 一行一断言（多断言禁与行尾注释同置）。
- `npm run test` 跑测试（禁裸 npx vitest）；收口前 `npm run verify` 真退出码
  落盘（`echo exit=$? >> 日志`——注意 tee 后 `$?` 读的是管道尾，用独立 echo 或
  PIPESTATUS）。
- ≤500 行（现 284 行，余量充足）；UTF-8；中文注释。
- 卡住=BLOCKED 停手报告，不自裁。

## ⑤ 基线数字（自检参照）

- verify 基线=126 文件 **1081** 用例（新增 3 it 后预期 **1084**——数字以你实跑
  为准，偏差如实报告）。
- locks=233（收口时主控核对）。
- e2e 30/30（本单不动 e2e，主控收口亲跑）。

## ⑥ 报告契约

全文落 `scripts/audits/f-r3-fix-impl.report.md`：实现摘要/文件清单/首红证据/
绿证据/变异红证/verify 真退出码/自裁申报（含删减面 diff 自查）/疑虑。
回复五行内（含报告路径+verify 退出码+新增用例数）。
