全部核验完成。以下为终审裁决书。

---

# SR2-AI-05 第二门终审裁决书（GLM 位 · 处置核验+终审）

**对象**：第一门 PW（0B+1W+4N）处置落地核验。方法=静态逐条比对 + CLI 行为面 11 场景实测 + 机器关卡全跑。基线=工作区待提交态（与门一一致）。

## 一、处置核验（逐条）

**W1（readJson 三态合并）→ ✓ 真实落地，行为面双后果均实证修复**
- 代码位 `queue.mjs:98-105`：仅 `e.code === 'ENOENT'` 返回 fallback，SyntaxError/其余 IO 失败上抛中文错误（含完整路径+原因）；CLI `invokedAsScript` 分支（190-198 行）外层 catch → stderr + exit 1。
- 后果 (b) 修复实证：S1 空目录 → `exit=1`「manifest.json 不存在——导出未完成或目录不对（…ADR-0011 v1.1）」；S2 损坏 manifest → `exit=1`「读取/解析失败：…manifest.json（Expected property name…）——文件损坏？」——**两态逐字可辨**，门一“逐字相同”缺陷消除。
- 后果 (a) 修复实证：S3 损坏 progress → `exit=1` 消息含 progress.json 完整路径，不再静默重置（门一实测的 exit=0 静默打回 pending 场景已堵死）。
- catch 分支静默面复查：`e instanceof Error && e.code === 'ENOENT'` 收窄正确；EACCES/EISDIR/SyntaxError 全走上抛。**唯一残余**见下「新发现」。

**N1（exportedAt 缺失）→ ✓ 落地**
- `queue.d.mts:22-23` `exportedAt: string` 必填（无 `?`）+「门一 N1」注释；夹具 `manifestOf`/`paper` 均补字段；typecheck 绿实证 d.mts 经测试 import 链被 tsc 解析且夹具联动正确。应用侧 `corpus.export.service.ts:212` finalizing 分支无条件写 `exportedAt: now()`——「真 manifest 恒有」声明属实，必填化方向正确。改动方向是夹具符合**更严**契约而非放松断言，不属改测试过测；locks:check 绿（manifest 第 401 行在册）实证 unlock→改→apply 流程真实走完。

**N2（schemaVersion 只写不读）→ ✓ 落地，两条读取路径全覆盖**
- `loadProgress`（116-124 行）读入后 `schemaVersion !== PROGRESS_SCHEMA_VERSION` 抛中文错；grep 确认 `readJson(PROGRESS_FILE)` 全文件唯一调用位在 loadProgress 内，`planSession:135` 与 `markDone:150` 两条路径**均过版本门**，无旁路。
- 实测：S3b `schemaVersion=2` → `exit=1`「progress.json schemaVersion=2 与工具版本 1 不匹配」；S8b（`123`）/S8c（`"corrupt"`）证明版本门顺带拦截一切「合法 JSON 非对象」形态。

**N3（CLI 防御三缺口）→ ✓ 三缺口全堵，--done 分支顺序正确**
- S4 `--done p-typo` → `exit=1`「paperId 不在 manifest：p-typo」，且校验先于 progress 读取（markDone 顺序：manifest 存在→paperId∈manifest→outputs 非空→版本门→原子写——输入校验全部前置于 IO 写）；S5 `--foo` → `exit=1` 报用法；S6 零 outputs → `exit=1`「--done 至少给一个产物相对路径」。

**N4（不采）→ ✓ 裁量合理，但登记承诺未兑现**
- 不扩测试与票面明文（测试头注「主循环骨架不在单测面」）一致，裁量维持。**但 `docs/reports/` 无 AI-05 战役报告**（最新 2026-08-26_p7c-campaign 无 ai-sensor 内容；ai-module-plan.md:183 仅排程条目）——「登记战役报告随手验清单」尚未存在，列为本裁决收尾条件（见裁决附注）。

## 二、新发现（本门）

**【N-新1】`queue.mjs:117` —— JSON null 与 fallback 哨兵碰撞，W1 残余静默边缘（实测实锤）**
`loadProgress` 用 `(await readJson(..., null)) ?? freshProgress(manifest)`：progress.json 内容恰为合法 JSON 字面 `null` 时，`JSON.parse("null")` 返回 null 被 `??` 当缺失。实测 S8：done p-1 后写入 `null` → 输出「队列：1 篇待读 / 0/1 已完成」、**exit=0 零警告**——W1 后果 (a) 的极窄复活面（同型：manifest.json 内容为 `null` 会误走「不存在」分支）。定级 N：现实损坏形态（截断/乱码/半写）几乎必为非法 JSON，已被 W1 全拦；其余合法 JSON 非对象已被 N2 版本门全拦——静默面从门一的“三态全并”收窄到唯一 4 字节字面值。一行可修：fallback 改 `undefined` 哨兵（`JSON.parse` 永不返回 undefined，天然免疫）。不阻断，交父会话裁量（建议随手修或入随手验清单）。

**【观察】** `--done p1 --foo` 会把 `--foo` 吞作 outputs 路径写入 progress——N3(b) 字面范围（flag 位）外的扩展面，不计缺陷。

## 三、机器关卡（本门实测）

| 关卡 | 结果 |
| --- | --- |
| CLI 抽测 S1-S8c（11 探针） | 全符合预期（详见上文；S7 happy path 回归 0 待读/1 已完成 ✓，处置未破坏主流程） |
| `npx eslint tools/ai-sensor/queue.mjs` | 绿（198 行 ≤500） |
| `npm run typecheck` | 绿 |
| vitest queue.test.ts | 6/6 绿（ABI 切 node 跑完已切回 electron v146 ✓） |
| `npm run locks:check` | 绿（110 受锁文件含改后 queue.test.ts，sha 同步） |
| `npm run quality:check` | 绿（无占位/无乱码/无跨域） |
| git status | 与门一基线逐项一致，无范围蔓延（queue.mjs M、d.mts/tests/ 等 untracked、dist_new/+scripts/audits/ 残留系门一已知，staging 须显式列文件） |
| 中文可读 | 全部 CLI 输出/注释/错误消息可读 ✓ |

## 四、终审裁决：**PASS**

门一四采纳项（W1/N1/N2/N3）全部真实落地、无虚报，行为面与静态面双实证；无 BLOCKING、无 WARN 级新缺陷；机器关卡全绿；无范围蔓延。**允许提交。**

附注（不阻断）：
1. **提交纪律提醒**：本单含 `tests/unit/tools/queue.test.ts` 新增 + `locks/manifest.json` 修改，提交信息须带 `[locked-change]` 尾注；staging 显式列文件。
2. **收尾条件两条**（交父会话）：(a) N4 的「AI-05 战役报告随手验清单」登记尚未兑现——战役收尾时必须落实，建议清单含：CLI 三态可辨、`--done` 幽灵 ID、版本门、progress null 边缘；(b) N-新1（null 哨兵碰撞）随手一行修（fallback 改 undefined）或明示接受登记。
3. 抽测遗留临时目录 3 个（各含几字节 json，rm 执行时被会话包装层打断，系统自动清理，无害——与门一先例同）。

**技能清点回执**：verification-before-completion（用——全关卡实测后裁决）、code-review-excellence（用——逐条比对+静默面扫描）；systematic-debugging/TDD 未用（审计位不改码，抽测全程无待查缺陷）。环境异常记录：Bash 包装层多次卡在收尾段（命令体已完整执行、输出已落盘），杀任务不影响任何证据采集，判定为会话环境问题非被测对象问题。