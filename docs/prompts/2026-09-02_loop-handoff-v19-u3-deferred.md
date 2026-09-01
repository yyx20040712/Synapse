# 2026-09-02 LOOP 交接文档 v19——R2 批次 P0+U1+U2 收口，U3 顺延（预算停点）

> 上场=v18（R2 漂移+稳定性批次）。本场执行 P0（派发器扩展）→U1（F-R2 修复）
> →U2（P7A 防线），**U3（F-L1-C 三条合票）顺延本场**——预算停点合规处置
> （详见 §4 复盘），非虚假闭环。三笔提交：1a35596b8（P0）/e0e8a827a（U1）/
> 6e58d9eb9（U2）。

## 1. 终态数字与基线跃迁

| 项 | v18 基线 | 本场终态 |
| --- | --- | --- |
| verify | 126 文件 1074 用例 | **126 文件 1081 用例**（+7=F-R2 双空间折算用例）exit=0 亲验 |
| locks | 226 | **229**（+ds-call 受锁改向重锁已含；+f-r2-{probe,probe2,diag2}.mjs 三探针收编） |
| e2e | 29 | **29 首跑绿**（P7A 修复后连跑 3 次：29/29、29/29、28/29——第三跑失败=F-R2e 序列敏感备案 §5，P7A 三次全绿） |
| registry | 全 done | 全 done（F-R2/P7A 建单即闭环） |
| **locks 226 vs 231 归因（v18 §1 备案清账）** | — | LG14 实 222（提交记 227）/LG15 实 226（记 231）——两笔提交信息人工计数各偏高累计漂移 5，manifest 与磁盘全对账一致**无锁面丢失**；日常以机器输出为准维持 |

## 2. 三单元摘要

- **P0 派发器（1a35596b8）**：ds-call.mjs 单源 deepseek→Kimi 链多源（kimi-main→kimi-backup→deepseek 兜底；GLM 兜底诚实降级——builtin 全 anthropic+私有路径）。双形态适配（Kimi 条目 kind=anthropic→POST /messages；deepseek OpenAI→/chat/completions）+`--list-sources`/`--dry-run`/`--source` 自检+429/5xx 退避换源/4xx 立即换源+事件流水账 `model-routing-log.jsonl`+输出 `[routing]` 头注。首轮 lint 拦 unused 变量→unlock 修→复跑全绿（改受锁后才能 lint 的流程时序教训）。
- **U1 F-R2（e0e8a827a）**：H1 坐实=scroll-converge 把 gBCR 视觉差值 1:1 加本地 scrollTop（真机探针三场景三档数值闭合：fill4 双档 −204.8/−512.6 逐位合预测；P1 语义/H4 anchorNone/H5 量级三排除；H3 zoom 往返实测证伪）。实现=方案 B 算术折算（effectiveZoom 单源+converge+progress measurePageBoxes）→门一 Kimi 可收口→**回炉 1**=e2e「划选高亮重开原位」3.45px 稳定红→诊断实证比值法 ε≈0.0005 污染（gBCR 亚像素+滚动条）→effectiveZoom 改 **computed zoom 链乘积**（零几何污染；jsdom 桩=getComputedStyle mock）→e2e 29/29+真机终态三跳 ±0.2px。回炉由**主控压缩票直做**（原实现者会话终止 SendMessage 续命不可达+预算降级，担责披露）。
- **U2 P7A（6e58d9eb9）**：第七现实锤（读到用户剪贴板文件名）+受锁先红注入复刻→防线=清场标记+5×200ms 条件重读+失败可归因；断言锚不放宽；主控压缩票直做。**门二=deepseek 异构合并审**（F-R2 回炉+P7A 双面 11.2k out）：可收口 B:0/W:2/N:2（W2=ε→3.45 因果链定量未全闭合、W4=压缩票流程偏离已披露）。

## 3. 成本账本（模型×供应商×套餐分列）

```
P0 派发器：主控直做（GLM5.3×bigmodel-coding-plan 主力，~15 工具轮/40min；
  返工 1=lint unused 变量）
U1 F-R2：排查子代理（GLM5.3 统一档×2.96M tok/41 工具/14.7min——目标档=GLM5.3
  关键裁决链，环境内可达）+实现者（目标 GLM5.3flash 不可达=「环境限制统一档」
  欠账，实际 GLM5.3 同源×4.12M tok/72 工具/19min）+门一（kimi-k3×Kimi 主源
  504 换源→kimi-backup 接手：11.2k out/231s——换源事件首实战）+回炉 1 主控
  压缩票直做（diag2 探针+zoom 链+M5 变异）+主控亲做面（四轮真机探针/材料包/
  收口）+门二欠账段（并入 U2 合并审）
U2 P7A：主控压缩票直做（清场+重读+先红注入+3 连跑）+门二（deepseek-v4-flash
  ×梁圣·套餐外按量：11.2k out/107s——审计面放行首用）
U3：顺延（零成本）
```

- **通道实调锚点（references/06「实证状态」已同步回填）**：Kimi kimi-main 探针 in=170/out=63/7.9s+门一大包换源后 backup 接手；deepseek 门二 in=4693/out=11200/107s。全程 GLM 兜底未启用（诚实降级）。
- **「环境限制统一档」欠账（Agent 工具面无 model 参数）实测确认**：实现者子代理目标 flash 档不可指定，实际与主控同源（GLM5.3）——异构对抗实际由门一 Kimi+门二 deepseek 承担（反而强化门一必保面地位）；门二子代理位被外部 API 派发器+主控亲跑矩阵数据代偿（本场门二=deepseek 裁决复算面+包内亲跑数据，无独立子代理）。

## 4. 预算实测 vs 35~40% 锚复盘（超锚，如实）

**实测估计 45% 上下（停点线）**，超锚原因三条：①registry 全文+manifest 历史
等基线阅读比预估重（v18 白名单已尽力但 registry 119 单条目 8k+）；②commit
message 首笔过长回显双倍成本（P0 教训自记，后续已收敛）；③U1 回炉走主控
直做——排查/实现/回炉三轮的证据链阅读集中主控。**降级路径已按规则启用**：
门二合并审（兑现）+回炉主控压缩票（担责披露）+U3 单边界停点顺延（本场
收口即边界，合规）。**下场建议**：registry 类大文件读摘要段（grep 定位+
offset 窄读）；排查报告只回传五行摘要纪律对子代理同样要求（本场实现者
遵守良好）；门一大包生成走脚本化（f-a5 生成器形态，本场手工拼装费主控）。

## 5. 新增备案与顺延清单（v19 场首项）

1. **U3 F-L1-C 三条合票（顺延首位）**：W2 碰撞盒估宽 vs FO 交互盒 130/W4
   padding 2px→2.7 行/3.3 截断标签吞 zoom 无余量——定义=台账 129-134 行；
   小同形批量首例（§4.5 条款）+⑤f 真机实景验证；票面模板可 crib p7a-ticket
   紧凑形态。
2. **F-R2e**：e2e「划选高亮重开原位」序列敏感脆弱面（全量第三跑 3.45px 超
   2px 容差同值复现/单跑绿/收口全量绿——窗态持久化或顺序依赖；测试注释自认
   噪声源）——再现 ≥2 立案（容差 vs 窗态种子隔离两案）。
3. **B-3/H3**：PageColumn anchoredScrollTop 分母空间错配——H3 实测证伪
   （zoom± 往返三 cycle 两档 Δst=0）代码债在档；修 N1（effectiveZoom guard
   分支零覆盖——zoom 链版已无 guard 需求，N1 随实现消解但 clamp 饱和区用例
   z 不敏感事实在档）/N2（桩面 z=0 路径）一并评估。
4. **门二 W2**：ε→3.45px 定量因果未全闭合（方向正确）——若立案 F-R2e 顺带
   补 δ_visual×(1/z_meas−1/z_true) 对账。
5. **范围外滚动**（v18 §1 原样）：F-R3 pdfjs stream 竞态（低优）/AUDIT-C→E
   批+备案池（LG14-N1/N2、LG15 竞态、F-G 池、双页 e2e 兑现）。

## 6. 工具与流程资产增量

- **zoom 链量测口径**（effectiveZoom 终形态）：凡「视觉/本地空间折算」一律
  computed zoom 链乘积直读，**禁 gBCR/clientHeight 比值法**（亚像素+滚动条
  ε≈0.0005 污染实证）；jsdom 桩=getComputedStyle mock 注入（透传+仅覆写
  zoom）。
- ds-call.mjs 链式派发器（P0）+`--source` 单源直调（门二 deepseek 形态）。
- 受锁先红「外部占用注入」形态（P7A）：对 HEAD 旧形态注入复刻故障机制跑红
  →还原→上防线——受锁改向三步先例的新变体。
- e2e 三连跑判据实操：`for i in 1 2 3; do npx playwright test; done`（注意
  全量序列本身的脆弱面=F-R2e 教训）。

## 8. 双源全批复审（2026-09-02 深夜追加——用户令+Kimi 调用修复后）

用户修复 Kimi config（baseURL 去 /v1）→派发器适配 anthropic 路径规范化
（剥尾 /v1 统一拼 /v1/messages，kimi-main 直命中复验 6.3s）→同包同工单
双源复审（batch-review-brief.md）：**Kimi kimi-k3 主源**（30.2k in/18.8k
out/276s）=**B:3/W:4/N:6**；**deepseek**（11.7k out）=B:0/W:2/N:4 通过附
处置。B/W 合并处置全落地（提交见本节尾）：

- **B1/W1 三处文档停留已否决比值法口径**（INV-34 附注/台账 F-R2 段/票面
  ③-1）——INV-34+台账改 zoom 链终形态口径；票面加「回炉 1 修订注」保留
  历史裁决（票面=历史档案不回写改史）。
- **B2 3.45px 双归因互斥**——scroll-converge 头注统一为「两次复红实证；
  ε 为实证确定性偏差但量级不足以单独解释 3.45px（δv≈8300px 才够——Kimi
  独立复算）；完整归因未结案=台账 F-R2e」。
- **B3/N1 派发器 RETRYABLE 缺末次守卫**——429/5xx 四连后退避白等 40s 且
  落 try 外 'unreachable'：换源事件漏记+状态码被抹（log 实证 18:26
  kimi-main 四 attempt 无 switch）。修=attempt===3 抛真实状态码（经外层
  catch 落 switch 事件）。
- **W2 日志污染**——model-routing-log.jsonl 曾被 git 追踪但 append 型流水
  账必致工作区脏；处置=git rm --cached+.gitignore（本地保留，可指认性由
  报告 [routing] 头承载）。
- **N2** --source 缺参显式报错（原静默退化全链）；**N3** effectiveZoom 注释
  补口径边界（只覆盖 scroller 祖先链，内部 zoom 层不在量测——当前布局豁免
  在祖先侧，引入内部 zoom 层需扩）；**N4/F-R2e** 维持观察项不立案。
- **Kimi W4（门审链单门欠账）如实记录**：U1 回炉与 U2 为 deepseek 单源审
  （本次双源复审为事后补偿，票级门一 Kimi 未过——下场 U3 派发时若同批
  触及 F-R2/P7A 面可顺带补 Kimi 票级审；本批以此披露收口）。

## 7. 环境事实滚动

PATH 前导 /d/nodejs24 不变；git geometric-repack「File exists」警告本场两现
（本地 gc pack 重名，提交成功无碍，待 gc 自愈——若再现可 `git gc --prune=now`）；
Git Bash 控制台中文乱码=显示编码（quality mojibake 关卡以存储 UTF-8 为准）。
