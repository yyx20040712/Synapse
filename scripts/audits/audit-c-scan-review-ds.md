[routing]: run=20260902014440-w79h source=deepseek model=deepseek-v4-flash switches=0 usage=in=10459,out=16550 latency=164883ms (by ds-call.mjs 链)

## 对抗审核结论

### B 级（必须修报告）

**B-1｜§1.2-a #2 与 §5 的“FK 兜底”逻辑不成立：FK 只挡“paperId 不存在”，不挡“新库存在同 id paper”时的错写。**  
证据：  
- 摘录 A 中 `saveSoon` 发出的载荷只有 `{ paperId, title, contentMd }`，没有 workspace/库标识。  
- 报告自己写：“若 switch 已完成：打到新层 service/新库→notes→papers FK+foreign_keys=ON 拒绝→reject→catch 静默复位”。  
  这句话把“FK 拒绝”当成了必然结果。但 FK 语义是：仅当新库 `papers` 中不存在该 `paperId` 时拒绝；若新库中存在同 id paper，则该写会合法落库，且内容是旧 workspace 的草稿。  
- 报告没有给出任何证据证明：不同 workspace 的 `paperId` 不可能相同，或 switch 后的新库不可能命中同 id paper。  
- 该缺口直接击穿 §5 “为何无 B 级”的第①条缓解结构：“写目标按 id 寻址（FK/UPDATE-0-行/map-filter 天然 no-op）”。若命中同 id，不是 no-op，而是跨库错写。  
- 定级影响：A3 至少不能继续以“FK 偶然兜底”作为降 W 的核心理由；在未排除同 id 命中前，“未发现新增 ≥B 级”的结论不成立。  
- 不确定性说明：如果仓库确实保证 paperId 全局唯一且跨 workspace 不可能命中，则该条可降级；但报告未给该证据，当前逻辑不能自洽。

---

### W 级（应修订）

**W-1｜“写方向守卫缺席（唯一实锤）”与报告自身其他结论矛盾。**  
证据：  
- §1.2-c 写：“写方向守卫缺席（唯一实锤）：`SelectionLayer.save`”。  
- 但 §1.1 表中 `notes.saveSoon` 已明确标为“**守卫缺席**（无世界核对）”；§1.2-b 又写“D4 = import in-flight × workspace switch 互斥【**守卫缺席，实锤**】”。  
- 因此“唯一实锤”在全文范围内不成立；应改为“reader 标注写方向内唯一实锤”或类似限定表述。

**W-2｜settings.save 的三态“不确定”与报告自身的机事实描述不自洽，且未闭环项自我矛盾。**  
证据：  
- §1.1 表写“ipcMain.handle 对 async handler 不序列化——register.ts:51 注册形态+settings.store.ts:43 机事实在档”。  
- 但“未闭环项”又写：“settings.save 交错终态（W~N 边界，需 main 侧 ipc/settings.ts handler 时序实证——未读该文件”。  
- 这构成前后矛盾：若已“机事实在档”，就不需要再实证；若需要实证 handler，就不能把“不序列化”当作已证事实。  
- 另外，`settings.save` 从摘录 C 看确实没有 save 间互斥，`saving` 只驱动 UI 不拒绝并发；因此至少在 renderer 侧应标“守卫缺席（main 侧交错待实证）”，而不是笼统“不确定”。

**W-3｜“map/filter 按 id 匹配天然 no-op”被当作写方向守卫，依赖未声明的 id 唯一性假设。**  
证据：  
- 报告 §1.2-c 写：“`updateAnnotation/removeAnnotation` 走 map/filter 按 id 匹配，写错 tab 时天然 no-op”。  
- 这只有在“annotation id 在跨 tab 间不可能重复”时才成立。报告没有给出该不变量的出处。  
- 若目标 tab 中碰巧存在同 id 注释，则 stale 更新会错误改写该注释，而不是 no-op。应把“天然 no-op”降级为“依赖全局唯一 id 的缓解，非守卫”。

**W-4｜“NotesPanel 全文未读”与“以上不影响本票三组结论”的断言冲突。**  
证据：  
- “未读”清单包含 `NotesPanel`（notes 域另一消费方）全文。  
- A3 的核心结论是“`timers` 无任何外部取消口”。该结论只读了 `notes.store.ts` 的当前实现；如果 `NotesPanel` 以某种方式持有/清理 timer，或存在其他 store action 触及 `timers`，报告无法排除。  
- 建议把“不影响三组结论”改为“不影响已读面结论，NotesPanel 相关路径未闭环”，不要做全局断言。

**W-5｜建议修复“minimal cancel API”覆盖不了“timer 已 fire、save 已在途”的路径。**  
证据：  
- `saveSoon` 中 `delete timers[paperId]` 发生在发请求之前（摘录 A :183-184）。  
- 如果用户关脏 tab/切课题时 timer 已 fire、请求已发出，那么“确认后调 `cancelPendingSave(paperId)`”只能清掉尚未发起的 timer，不能收回已发出的 `api.notes.save`。  
- 报告自己的 §1.2-a #3 也承认“timer fire 即删句柄，第一个可能仍在途”。因此修复方案必须包含 in-flight 代际检查或 main 侧归属校验，仅“关 tab/切课题各接一行 cancel”不充分。

---

### N 级（建议）

**N-1｜“为何无 B 级”的缓解结构①应补限制条件。**  
报告说“①写目标按 id 寻址（FK/UPDATE-0-行/map-filter 天然 no-op）”。  
至少 FK 一项已被 B-1 击穿；`UPDATE-0-行` 同理依赖“目标 id 在新库不存在”，若存在同 id 则可能错更新。建议改写为“在 id 不跨 workspace 命中时成立”，否则不能作为降级依据。

**N-2｜ImportProgress 无 sessionId 的附带发现，建议与 D4 合并为同一个 W 项。**  
证据在报告 §1.2-b 附带发现和组③表，二者同根；分开列容易弱化“import 会话身份缺失”的严重性。

**N-3｜Settings.save 的 finally 复位存在“第三个并发可进入”的放大。**  
摘录 C 中 `finally { set({ saving: false }) }` 会在前一个 save 完成时无条件复位；若 save1 与 save2 交叠，save1 的 finally 可能把 UI 置为未保存中，从而允许 save3 进入。报告只讲了“save₂ 后 save₁ 迟到覆盖”，未提 finally 复位造成的窗口放大。

---

### 行号可信度核对

- **可核验且匹配**：  
  - `notes.store.ts:176-217` 与摘录 A 内容一致；`:183-216` timer 回调、`:185` 取 draft、`:192-194` 发 `api.notes.save` 均能从摘录对应。  
  - `SelectionLayer.tsx:199-224` 与摘录 B 一致；`:211` await save、`:212` onSaved、`:217-220` removeAllRanges、`:221-224` 失败 markTabDirty 均对应。  
  - `settings.store.ts:63-76` 与摘录 C 一致；`settingsSeq += 1` 在 `await` 后、`finally` 复位 saving 均对应。  
  - `reader.store.ts:388-411` 与摘录 D 一致；`addAnnotation` 经 `updateActiveTab` 追加、`markTabDirty` 对不存在的 paperId 直接 return 均对应。

- **无法核验（报告未给出对应摘录）**：  
  - `register.ts:51`、`settings.store.ts:43`、`ReaderPage.tsx:188`、`workspace.service.ts:80-200`、`import.service.ts:1-284`、`tab-dirty.ts:70-107`、`AnnotationLayer.tsx:131-186` 等。  
  这些行号无法从当前证据边界确认；报告中若作为关键结论证据，应保留可追踪摘录。

---

## 总裁决

**需返工。**  
原因是 B-1 直接动摇了“无 ≥B 级新增候选”的核心结论：报告将“FK 拒写”当作跨 workspace 悬置写的兜底，但 FK 并不保证拒绝“同 id 命中”的错写路径。该漏洞未排除前，A3 不能维持当前 W 定级，整个“无 B 级”结论也不能成立。其余 W-1/W-2/W-5 等自洽性问题也需在返工中一并修订。