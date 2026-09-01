# 2026-09-02 R2 漂移+稳定性批次——开工记录（技能清点+配置自查+模型调用面）

> 依据：AGENTS.md 会话开工纪律 + v18 交接书 §0 + references/06 §6「必保留首项」。
> 本批=P0（派发器扩展）→U1（F-R2）→U2（P7-A）→U3（F-L1-C）串行；预算锚 5/17/29/40%。

## 1. 技能清点（用/不用+理由）

**用（经项目文件承载，不重复全文加载）**：

| 技能 | 承载选型 | 理由 |
| --- | --- | --- |
| loop-engineering | 交接书 v18（§0/§2/§3 蒸馏）+references/06（已全文读） | 本场指令集完整承载 LOOP 纪律；禁全读 v15~v17 已由 §3 蒸馏兑现 |
| subagent-driven-development | methodology §4.1~4.3 派发模板三件+references/06 Model Selection 终态 | 三屋派发流程项目内已模板化；蓝本增量已终态入册 |
| test-driven-development | 票面五层规约+§4.1 ④纪律段（红→绿→变异红证+.raw.txt 落盘） | 实现者子代理执行面；主控零亲做实现 |
| verification-before-completion | 宪法 DoD 清单+批次 DoD（v18 §2）+§4.4 收口顺序铁律 | 机检口径（verify/locks/diff）已清单化 |

**用（到场加载）**：systematic-debugging——U1 F-R2 漂移排查为假设消减型调试任务，四阶段法有增量价值；U1 排查子代理派发前由主控加载并把方法要点写入排查票面。

**不用（理由）**：dispatching-parallel-agents（本批串行禁并行，v18 §2 明文）；code-review-excellence（对抗深审由门一 Kimi 链+门二承担，主控不亲做对抗审）；e2e-testing-patterns/webapp-testing/browser-testing-with-devtools（U2 两枚方案在档，验证走既有 playwright 管线）；computer-use（真机验证一律 scripts/audits 探针后台脚本——前台焦点保护红线）；frontend-design/canvas-design/theme-factory（本批无视觉设计新面，U3=CSS 级改值+⑤f 真机实景）；其余领域技能（airflow/dbt/k8s/postgres/security-\* 等）与本仓技术面（Electron+纯 TS+SQLite 本地应用）无关。

## 2. 配置自查

- PATH 前导 `/d/nodejs24`：实测 node v24.20.0 / npm 11.19.0 ✓（本机默认 v25 必红——恒前导）
- ABI 双坑已知悉：探针/真机前 `use electron`；test/verify 前导已含 `use node`；禁裸 npx；build 前清后台 Electron（EBUSY）
- git 基线：HEAD=58a17598d（main），工作区仅 scripts/audits 历史残留未跟踪（无跟踪文件改动）
- locks 机器口径：`locks:check` 实测 **226** 全对账一致（v17 交接记 231，差 5 待 P0 触锁后归因，v19 记录）
- 证据落盘 `.raw.txt` 后缀（`.log` 被 gitignore 静默拦）；控制台乱码≠存储乱码

## 3. 模型调用面（references/06 §6 必保留——每批重测，不缓存跨批复用）

| 角色 | 目标档 | 通道实测 | 结论 |
| --- | --- | --- | --- |
| 编排者（本会话） | GLM5.3×bigmodel-coding-plan | builtin 会话 | ✓ 判断力密集不降档 |
| 只读排查（U1） | GLM5.3 关键裁决链 | Agent 工具面参数=description/prompt/subagent_type/run_in_background——**无 model 参数**（本批重测确认） | ⚠ 环境限制统一档欠账，如实记 v19，禁伪称定档 |
| 实现者 | GLM5.3flash | 同上环境限制 | ⚠ 环境限制统一档欠账（实际与会话同源，非 flash 档——诚实披露） |
| 门一 | Kimi K3 主源→备源→deepseek 兜底 | 外部 API 派发器（P0 扩展 ds-call.mjs），不受 Agent 面限制 | ✓ 可显式定档；通道实调锚点=P0 判据 |
| 门二 | deepseek v4 flash 异构优先 | 预案：裁决/复算面走 ds-call 单源直调（审计面放行）+亲跑矩阵由统一档子代理或主控代跑 | U1 时定案；纯 Agent 面则=同源欠账（且实现者同为统一档→门一成为唯一异构对抗位，必保面强化） |
| 视觉判读（⑤b/⑤f） | flash@体验套餐 | 会话内 Read 图像/analyze_image 通道（无法指定套餐档） | ⚠ 欠账披露；兜底=无阈值像素差分+DOM 状态转储（f1-forensics 配方） |
| 零派发角色 | 冻结提取无独立角色（票面即任务书，小项目裁剪项）；人类用户=Ruling | — | — |

**端点事实（本批实测定稿）**：Kimi 主源=`b2466f8b`（name Kimi）/备源=`5e1abd9d`（name zipoo，同端点第二配额），两者 **kind=anthropic**（`api.kimi.com/coding/v1`，k3→kimi-k3，reasoning defaultVariant=max，context 1M/output 131k）；deepseek=`8ad55776`（梁圣，deepseek-v4-flash，OpenAI 格式）；builtin GLM 全条目 anthropic 格式→派发器 GLM 兜底不可用（诚实降级，不伪装）。→ P0 派发器必须双形态适配（anthropic messages+OpenAI chat/completions）。

## 5. P0 落地实录（2026-09-02 本场）

- ds-call.mjs 重写为链式派发器（[locked-change]）：`--list-sources`/`--dry-run`/`--source` 三自检面+双形态适配（anthropic messages / OpenAI chat/completions）+源序状态机（kimi-main→kimi-backup→deepseek，GLM 兜底诚实降级注释在档）+事件流水账 `scripts/audits/model-routing-log.jsonl`（attempt/ok/switch/exhaust+usage）+输出文件 `[routing]` 头注。
- 自检：`--list-sources` 三源全 ok；`--dry-run` 双形态请求骨架正确（密钥脱敏）。
- **Kimi 首场实调锚点**（runId=20260901173323-bc13）：kimi-main 一次命中，`POST api.kimi.com/coding/v1/messages` anthropic 形态、model=`kimi-k3` 直中（无需回退 'k3'）、usage in=170/out=63、latency 7959ms、finish=end_turn——**references/06「实证状态」行可回填**。deepseek 兜底层未触发（非必要不烧套餐外额度；通道沿用 v11 起多场实证形态，dry-run 骨架核对通过）。
- **locks 226 vs 231 归因（v18 §1 备案清账）**：git 逐提交核对 manifest 实际条目数——ec1e7e959(F-LG14)=222（提交信息记 227）、465c4403c(F-LG15)=226（记 231）→ 两笔提交信息人工计数各偏高（累计漂移 5），manifest 与磁盘 226 全对账一致，**无实际锁面丢失**；此后三笔提交 manifest 未动。日常口径以机器输出为准维持。

## 4. 预算纪律自警

主控零亲做实现（P0 派发器扩展=脚本工具例外）；探针/取证产物只回传指针+关键数值段；子代理报告全文落盘回复五行内；任一锚超 5 点→下一单元降级路径；>45% 单边界停点写 v19。
