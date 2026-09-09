[routing]: run=20260909020530-qlsy source=kimi-main model=kimi-k3 role=auditor-readonly@de7c6402 cfg=add15c606e1b switches=0 usage=in=4304,out=6564 latency=182506ms (by ds-call-v2 链)

## 审核发现

**[B1] registry.json ↔ 文件5~8路径标注**  
注册表解析路径为 `scripts/roles/*.md`，但送审件标为 `roles/*.md`。若摘录路径即真实路径，`loadRole(join(SKILL_ROOT,…))` 将全部缺文件并按约 exit 3。摘录也可能省略了 `scripts/` 前缀，实际不确定。应当提供真实目录树及装载烟测结果，并统一注册表与落盘路径。

**[B2] 文件1处置说明 ↔ 本审查包**  
说明称 `references/06/07` 随 C 包送审，但本终审任务又要求核对六份档案与 06/07 口径；当前未提供 06/07，无法完成该审查面。应当补交对应版本/哈希，或明确其不属于本次放行范围。

**[W1] check-constitution-budget.mjs：正则与计数**  
CRLF、多段、悬垂 BEGIN/END 的处理成立；但匹配及 BEGIN/END 计数均大小写敏感。小写或混合大小写标记会被报成“未找到段”或“不配对”。若标记规范允许大小写变体，三处正则应当统一加 `i`；若必须大写，应当在脚本说明和失败文案中明确。

**[W2] skill-gc.mjs：redirect 判据误伤**  
任务口径称“正文含退役/重定向词”，实现却检查 `description`。且 `redirect|重定向` 可合法出现在 active 技能描述中，如“HTTP redirect/重定向处理”，全文小于 2000B 时会进入可自动归档集。应当以显式 `status: retired/redirect` 或行首锚定的退役声明为准；普通语义词不应触发自动删除。

**[W3] skill-gc.mjs `classify()`**  
`bodyB=Buffer.byteLength(raw)` 计量的是整个 SKILL.md，不是正文；同时 `>-、|-、|+、>+`、多行引号 YAML 等 description 形态不会稳定判为 `unknown`，可能绕过退役词检测。BOM 与注释处理基本可接受。应当采用 YAML 解析器或明确支持的子集，并让 body 阈值排除 frontmatter。

**[W4] skill-gc.mjs 归档事务**  
`--apply` 双开关成立；但移动失败后的清单重写未捕获异常，既有清单 JSON 损坏时会静默丢弃 `prev`，进程在“先写 intended”后崩溃也会留下未移动却被记为 deleted 的记录。应当采用临时文件原子替换，区分 intended/moved/failed 状态，重写失败应非零退出。

**[N1] 插件边界**  
插件缓存位于 ROOT 外时，“不扫描不动”真实成立；但 JSON 输出缺少文本模式中的口径告警，ROOT 内若存在插件代管目录也无所有权识别。应当增加 `scope_warning` 字段及插件代管目录排除规则。

**[N2] registry.json 版本口径**  
`drafter.dod.md` 已为 W7 修订，但 `role_version` 仍为 `1.0.0`。若该版本用于缓存或审计追踪，应当同步递增；若刻意不变，应注明版本规则。

## 角色档案一致性

drafter 系统提示与 W7 版 DoD 未见冲突；auditor-readonly 两件与既定职责一致。gate1-reviewer 按机检结果免审。06/07 一致性因材料缺失无法确认。

## 放行意见

**不放行。** B1/B2 需先闭环；W1~W4 修复并补回归测试后再终审。