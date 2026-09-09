[routing]: run=20260909014414-7i4u source=deepseek model=deepseek-v4-flash role=auditor-readonly@de7c6402 cfg=add15c606e1b switches=0 usage=in=7496,out=10059 latency=106379ms (by ds-call-v2 链)

# 对抗式代码审核报告（审查包 A）

## 阻断实施（B）

**B1. 文件1 scripts/ds-call-v2.mjs「源装载」段（loadSources 内 find 回调）**
- 定位：`ds-call-v2.mjs`，`loadSources` 中
  `Object.entries(hostCfg.provider || {}).find(([id, p]) => i.startsWith(def.uuid_prefix) ...)`
- 问题：回调参数解构为 `[id, p]`，实际比较却引用未声明变量 `i`；任何运行时走到此处的路径（真实调用、`--list-sources`、`--dry-run`）都会抛 `ReferenceError: i is not defined`，而不是执行通过校验后的源装载。
- 建议修正：应将条件改为 `id.startsWith(def.uuid_prefix)`。此类基础路径错误应补一条冒烟回归用例。

**B2. 文件1 双落账目录缺失 + 本地 IO 错误混入远程退避重试**
- 定位：`ds-call-v2.mjs` 中 `ledger` 方法的 `appendFileSync(ledgerPath, …)`；`ledgerPath = join(process.cwd(), merged.ledger_path || '.zcode/org-ledger.jsonl')`
- 问题：
  1) `appendFileSync` 不自动创建父目录；当项目无 `.zcode/` 目录或未预建时，首次写账本抛 `ENOENT`。
  2) 更严重的是 `logger.ledger('ok', …)` 位于 `callSource` 的 `try` 块内；账本写入抛出的 `ENOENT` 会被 `catch (e)` 当作“源网络错误”处理，在 attempt<3 时触发退避重试同一个已成功的 API 请求——导致重复计费，且用户看到的是“换源/耗尽”而非“账本写失败”。
- 建议修正：首次落账前确保目录存在（`mkdirSync(dirname(ledgerPath), { recursive: true })`）；将 `logger.ledger` 调用移出 `callSource` 的远程调用重试作用域，本地日志失败应独立抛错并退出而非触发源重试。

## 应修（W）

**W1. 未实现“v1/v2 禁混用于同一工单”的运行机制**
- 定位：文件头注释 `两版禁混用于同一工单` 与 CLI/记账实现
- 问题：代码只在注释声明约束，未查找/比对当前工单是否已有 v1 审计产物，也未在产出中写可被主控识别的互斥标记；作为迁移护栏存在可执行性缺口。
- 建议：主控流程在选型前读取目标工单既有路由日志，确认不存在 v1/v2 混用；至少需在 `exhaust` 事件中输出明确警示字段。

**W2. “抛真实状态码”语义未结构化为数值字段**
- 定位：`callSource` 中 `throw Object.assign(new Error(\`HTTP ${status}…\`), { fatal: true })`；耗尽时 `throw new Error(\`HTTP ${status}…\`)`；外层 catch 仅取 `e.message`
- 问题：v1 终裁语义“末次守卫抛真实状态码”，实现仅把状态码拼进 message 文本，无 `error.statusCode` 之类结构化字段；下游若按数值判断须再解析字符串，行为不等价且脆弱。
- 建议：所有携带 HTTP 状态的错误对象加 `statusCode` 属性；外层路由与 exhaust 事件记录结构化的 `statusCode`。

**W3. switch 事件落账语义错位：源已耗尽时仍记 switch**
- 定位：`callSource` 内部对致命/耗尽统一 `logger.routing('switch', …)` + `logger.ledger('switch', …)`；外层末位失败后又记 `exhaust`
- 问题：对链上最后一个源失败时，实际并没有“切换”发生，却先记一条 switch，再记 exhaust；账本同一故障重叠两条事件，破坏“switch/ok/exhaust”互斥的审计含义。
- 建议：让 `callSource` 返回值区分“可换源”与“已无源”，或把 switch 事件外提到确认有下一源时记录；末源失败只记 exhaust。

**W4. validateProviders 对 roles 条目缺 source 时报错信息误导**
- 定位：`org-config.mjs` `validateProviders` 中 `roles.${role}.source` 校验
- 问题：`def.source !== 'chain' && !cfg.providers[def.source]` 在 `source` 字段缺失时返回“引用未知 alias=undefined”，并未提示“roles.*.source 缺失”。项目覆盖件新增角色若漏写 source，会被误判为引用错误。
- 建议：先判断字段存在性，缺失时报“roles.X.source 缺失，应显式填写 chain 或某 alias”。

**W5. 输出文件写失败被当作换源条件**
- 定位：`ds-call-v2.mjs` 主循环 try 段：`if (outPath) writeFileSync(outPath, …)` 位于 callSource 之后的同一 try 内
- 问题：若 `writeFileSync` 因磁盘/权限失败，会落入 catch 增加 switches、尝试换源甚至触发重复 API 调用；成功的 API 结果被误判为源失败。
- 建议：输出写入错误应在调用链之外独立处理，不以 switch/exhaust 状态退出。

## 提示（N）

**N1. canonicalize 对数组内 null 不剔除，与注释“剔除 null/undefined”不完全一致**
- 定位：`org-config.mjs` `canonicalize`：`if (Array.isArray(v)) return v.map(canonicalize)`；对象内 null 会剔除，数组内 null 会保留。
- 说明：source_chain 等数组语义上也不应含 null；但注释表述宜精确到“对象键值中的 null”，或递归剔除数组内 null，另注意不能破坏数组顺序语义。

**N2. JSON 解析未剥离 BOM**
- 定位：多处 `JSON.parse(readFileSync(path, 'utf8'))`（org-config 默认件/覆盖件/宿主 config/registry）
- 说明：Windows 编辑器易存 UTF-8 BOM；Node 的 utf8 解码不剥离 BOM，`JSON.parse` 会抛错。建议加 strip BOM 封装。

**N3. --mock-source 传 200 时无 success 路径**
- 定位：mock 响应对象只实现 `text()`，无 `json()`；mock.status=200 时 `res.json()` 抛 TypeError。
- 说明：故障注入按 4xx/5xx 设计成立，但 2xx 状态未被文档禁止；建议文档注明仅支持非 2xx，或补一个可配置 mock 成功体。

**N4. runId 时间部分生成不直观**
- 定位：`new Date().toISOString().replace(/[-:TZ.]/g, '')` 会保留毫秒小数位，`slice(0,14)` 只是截断；runId 中日期段与注释“YYYYMMDDHHMMSS”实际含 `.<毫秒>`。仅影响可读性，不影响唯一性。

## 总评

本送审代码的架构方向与设计书一致，深合并/哈希/双校验的主干实现基本正确，密钥不外泄、Windows 无 shell 依赖均未见违规。但 B1 是必然崩溃级缺陷，B2 存在“日志 IO 失败引起源重试导致重复计费”的隐蔽成本风险，二者未修复前不应放行。W2/W3 涉及 v1 行为等价性与审计账本语义，需在切换前修订并补回归。另有多处本地异常与远程错误混合在重试语义中，建议统一按“远程可重试 / 本地致命”分类。

**放行意见：不通过（需 B1+B2 修复后复审）。** W 项若不修，存在与 v1 行为不等价或账本失真风险，建议与 B 项一并整改后重新送审。