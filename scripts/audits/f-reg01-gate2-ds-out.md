[routing]: run=20260909111106-aeow source=deepseek model=deepseek-v4-flash switches=0 usage=in=3895,out=22303 latency=180441ms (by ds-call.mjs 链)

以下基于消息内可见的 diff 片段与门二工单说明；`raw/log/manifest/registry 实文`均不在可见范围内，凡是依赖这些证据的项，我仅能给“证据不可见/待补”而非通过。

1. **[W] B-1 处置核对**  
   `file === ''` 硬拦与 `idLineCount !== tickets.length` 对账哨兵均已在代码中出现，空串逃逸通道确实被堵住。但哨兵只统计“行首 `{ id`”的条目：  
   ```js
   const idLineCount = (registry.match(/^[ \t]*\{[ \t]*id[ \t]*:[ \t]*'/gm) || []).length
   ```
   若某个工单对象写成多行，例如 `{\n  id: 'SR2-X-1', file: ...`，则行级解析和该哨兵都看不到它，两边计数仍相等，票会静默逃逸。旧版块级解析反而能覆盖这类多行对象。是否属实际缺陷取决于 registry 是否被强制为“一票一行”——该强制在本审包中未见，故按对抗性标准记为 W。

2. **[W] W-1 处置核对**  
   白名单正则已是：  
   ```js
   /^((SR2?|R[123]|F|C)(-[A-Z0-9]+)+|(P7A|P7D|P7E|P7X)(-[A-Z0-9]+)*|B7)$/
   ```
   `P7D|P7E|P7X` 后接 `(-[A-Z0-9]+)*`，意味着这三个前缀也可以“裸”通过。但处置文字明确写“裸形态仅 B7/P7A 实存两枚”。若未来出现裸 `P7D/P7E/P7X`，不会被白名单拦下，与门一 W-1 的收紧意图存在偏差。

3. **[N] W-2 处置核对**  
   `DIR_FILE_EXEMPT` 显式只含 `F-AUDIT-01`、`P7X-03`，规则 3 与规则 5 对不在清单的目录票都会 push violation。可确认“不平限量逃逸口”已收紧。

4. **[N] W-3 处置核对**  
   头注已改为“非 SR 系 44 票+SR 系嵌套截断 2 票=46 票脱检”，与 `165-119=46` 的分解自洽。44/2 的明细来源我无法独立核验，但该处文字口径已不再矛盾。

5. **[W] W-4 流程裁定**  
   门一给出的缓解均为自证材料（侦查证据链、locks 纪律、双轮 verify raw、红证链）。本审包内看不到 locks 时间戳日志、红证 raw 正文或任何外部复核记录。我不同意直接“接受”，至少应补一份主控直改处置简报并声明“下不为例”，否则流程债不闭合。

6. **[N] W-5 处置核对**  
   规则 3/5/6 均加了 `statSync(p).isDirectory()` 守卫，规则 6 的 EISDIR 风险已防住。附带：规则 4 仍未加守卫，但触发条件是目录名恰以 `.tsx` 结尾，且需是 open 的 SR 系票，实际概率极低，不作为阻断项。

7. **[B] 机器面“翻 done 推演不红”不成立（新发现）**  
   门二工单第 4 条假设：`F-REG-01` done 后 `file=check-tickets.mjs` 存在、白名单过、内容无占位桩。  
   但规则 3 检测的是：  
   ```js
   if (/unimplementedObject|NotImplementedError\(/.test(content)) {
     violations.push(`${t.id} 已 done，但文件仍含未实现占位：${t.file}`)
   }
   ```
   而 `check-tickets.mjs` 自身就包含字面量 `unimplementedObject`——即使不看注释，检测正则本身就含该词。因此只要 `F-REG-01` 的 `status='done'` 且 `file=scripts/check-tickets.mjs`，规则 3 必然匹配自身并红。  
   门二工单第 4 条所称“内容无占位桩”的推演与代码证据直接矛盾。该问题会阻止 F-REG-01 自身正常关闭，故为阻断级。

8. **[W] 其余机器证据（工单 2/3 及 verify2/manifest）**  
   “票面两扩展项、先红证、165 存量绿、locks 纪律、verify2 raw 尾部 exit=0、manifest 290 条、现 258 行、UTF-8”等均依赖原始 raw/log/manifest 文件，而这些文件未出现在本消息可见范围内。无法据此给 `N`，只能给“证据待补”。

一行总评：**B** — F-REG-01 翻 done 后规则 3 必然对 `check-tickets.mjs` 自身红（文件含 `unimplementedObject` 字面量），门二“翻 done 不红”前提不成立；须先修复该自匹配问题，并补齐 locks/红证/verify raw 等独立证据后重审。