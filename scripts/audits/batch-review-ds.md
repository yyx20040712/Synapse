[routing]: run=20260901232151-0s81 source=deepseek model=deepseek-v4-flash switches=0 usage=in=31322,out=24370 latency=191074ms (by ds-call.mjs 链)

# 门一全批双源复审报告（v18 P0+U1+U2 / v19 交接）

## 发现清单

### [W1] 文档契约与 effectiveZoom 实际实现直接矛盾（两处文档残留）

**证据**：
- `docs/invariants.md` INV-34 附注（2026-09-02）写：`effectiveZoom（gBCR.height/clientHeight，guard 除零返 1）`。
- `scripts/audits/f-r2-ticket.md` ③-1 主控裁决写：`z = scroller.getBoundingClientRect().height / scroller.clientHeight；guard 除零（clientHeight=0 ... 返回 1）`。
- 但实际实现 `src/renderer/features/reader/scroll-converge.ts` 新函数 `effectiveZoom` 为：`z *= Number(getComputedStyle(el).zoom) || 1`，且函数注释明确写着 **“禁用 gBCR/clientHeight 比值法——gBCR 含横滚动条+亚像素小数，真机实测 1.25 档即偏 ε≈0.0005”**。

**影响**：`invariants.md` 是受控契约，若后续维护者按文档“重构”回比值法，会重新引入 ε≈0.0005 的量化污染（该污染已实证顶破「重开原位 ±2px」容差，见 F-R2e 3.45px 记录）。ticket 票面亦未同步回炉 1 的定案。虽当前功能实现正确，但文档与代码的矛盾必须处置后才能视为完全闭环。

---

### [W2] model-routing-log.jsonl 被提交但不受锁，且每次运行 append，必然持续污染工作区

**证据**：
- diff 中 `scripts/audits/model-routing-log.jsonl` 为 `new file mode`，内容含 18 条运行记录。
- `locks/manifest.json` 的 diff 中**没有**该文件的 sha256 条目（新增锁仅 `f-r2-diag2.mjs`、`f-r2-probe.mjs`、`f-r2-probe2.mjs`）。
- `scripts/audits/ds-call.mjs` 中 `logEvent` 实现 `appendFileSync(LOG_PATH, ...)`，每次调用派发器都会向该文件追加新事件。

**影响**：该文件是版本库内可变文件，每次运行 ds-call.mjs 后 `git status` 必脏，且不受 locks 机制约束，会破坏后续审计所需的干净工作区前提。建议：从版本库移除并加入 `.gitignore`，或另设只读证据归档路径（如 `f-r2-out/` 式一次性落盘）。

---

### [N1] callSource 中 RETRYABLE 状态耗尽后抛 `'unreachable'`，掩盖真实 HTTP 错误

**证据**：`scripts/audits/ds-call.mjs` 的 `for (let attempt = 0; attempt < 4; attempt++)` 中，`if (RETRYABLE(res.status)) { ... continue }`；当 4 次全部为 429/5xx 时循环自然结束，最终 `throw new Error('unreachable')`，而原始 HTTP 状态未进入错误信息。链式路由在 `logEvent('exhaust')` 时记录的是 `error: 'unreachable'`。

**影响**：全源因 429/5xx 耗尽时，操作者无法从 exhaust 事件直接得知是限流还是服务端错误，只能翻 attempt 日志推断。建议在最后一次退避后改抛 `HTTP ${res.status}`。

---

### [N2] `--source` 缺少参数时静默退化为全链

**证据**：`scripts/audits/ds-call.mjs` 中 `if (argv.includes('--source')) onlyAlias = argv[argv.indexOf('--source') + 1]`；当 `--source` 是最后一个参数时 `onlyAlias` 为 `undefined`，随后 `chain = onlyAlias ? sources.filter(...) : sources.filter((s) => s.ok)`，退化为全链调用，而非报错。

**影响**：属 CLI 边界缺陷，低影响，但若在脚本中误用 `--source` 作为末尾参数，会绕过“主源不得主动跳过”的状态机约束。建议对缺参情况显式 `throw`。

---

### [N3] effectiveZoom 只覆盖 scroller 向上祖先链，不覆盖 scroller 内部（目标与 scroller 之间）的 zoom

**证据**：`src/renderer/features/reader/scroll-converge.ts` 中 `effectiveZoom` 循环为 `while (el !== null) { z *= ...; el = el.parentElement }`，仅沿 `parentElement` 向上。若滚动容器内部存在有 `zoom` 的 wrapper，则目标元素 gBCR 的视觉偏移中包含该内部 zoom 的乘积，但 `z` 不含该因子。

**影响**：当前阅读器场景（ui-scale 挂在 `.app-content-row`，滚动容器内部无 zoom）经真机验证闭合，不构成现实缺陷。但函数注释声称“自 scroller 至 documentElement 逐层 zoom 链乘积”，语义上未覆盖“目标与 scroller 之间”的 zoom 层，建议在注释中明示限制，或作为后续泛化候选。

---

### [N4] F-R2e 3.45px 序列敏感备案：同值复现提示确定性状态污染，建议观察项加严

**证据**：已披露事项 3：“全量序列第三跑 3.45px 超 2px 容差（同值复现）/单跑绿/收口全量亦绿=序列敏感备案，未立案”。

**影响**：同值复现不是纯随机噪声，暗示全量序列中前置测试遗留的确定性状态（如窗态持久化/缩放残留）恰好推动该测试越过 2px 容差。当前“收口全量亦绿”使其不阻断，但若 v19 再现应直接立案，并优先排查 effectiveZoom 链在“划选高亮重开原位”场景的亚像素取整（3.45px ≈ 2px + 1.45px 余量，与 ε≈0.0005 污染数量级不吻合，更可能是另一独立因素）。

---

## 统计

**B:0 / W:2 / N:4**

---

## 工单 A~D 结论

### A 三单元实现终审
- **P0 派发器**：路径规范化（剥尾 `/v1` 统一拼 `/v1/messages`）与日志/退避/换源状态机实现正确，与 6.3s 实调命中证据吻合。边界问题仅 N1/N2。
- **F-R2**：`effectiveZoom` 单源 + start/center 除 z + `measurePageBoxes` 同折算，数学完备（含 clamp 本地口径保持）；测试先红/变异红证证据链在档。残留面为文档不一致（W1）与内部 zoom 未覆盖（N3）。
- **P7A**：清场标记+条件重读+失败归因设计合理，断言锚未放宽，受锁头注与红证路径合规。未发现竞态覆盖漏洞。

### B 流程合规
- 主控压缩票直做（U1 回炉 1 与 U2）均已担责披露，补偿充分（探针/红证/变异/三连跑）。
- 受锁改向链（头注 `[locked-change]` / 先红 / 断言锚保持）在 diff 中可见，符合 F-A4/F-N1 先例。
- 门一/门二覆盖面与欠账披露连续（Kimi 链 504→backup 实战、deepseek B:0/W:2/N:2），U3 顺延预算停点合规。

### C 诚实性
- 数字对账成立：verify 126 文件 1081 用例（1074+7）；locks 226→229（新增 3 文件）；e2e 首跑 29/29、第三跑 28/29 且失败项非 P7A。
- 备案清单完整（F-R2e、B-3/H3、ε≈0.0005、工作区修复），无应备案未备案面。唯一遗漏风险是 W1 文档未同步，但实现侧已在代码注释中披露“回炉 1 定案”，故不构成恶意隐瞒。

### D 下场建议
- **U3 顺延位**：按 v19 交接序执行，预算停点后先跑一次 verify 确认工作区干净（重点排查 W2 日志文件 dirty）。
- **新备案项优先级**：
  1. 立即修复 W1（invariants.md/ticket 与 effectiveZoom 实现对齐）；
  2. 立即处理 W2（model-routing-log 去跟踪或纳入伪锁/归档）；
  3. v19 观察项加严 F-R2e（再现≥1 即立案）；
  4. 后续 N1/N2 CLI 边界改进（低优先）；
  5. 可选：effectiveZoom 内部 zoom 覆盖泛化。

---

## 总评

**本批复审通过（附处置要求）**。三单元实现（P0/U1/U2）与 v19 交接书在功能、数学、测试与流程层面均无阻断问题；W1（文档契约矛盾）与 W2（日志文件污染工作区）需在收口或 v19 启动前处置，N 类为后续优化项。