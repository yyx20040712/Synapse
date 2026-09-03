# 2026-09-04 LOOP 交接 v40——F-A6-a 取证票收口：路线裁定 R-迁移（阶段化决策门）+T1/T9 真实库零触发/合成量化闭合+重形态未复现的证据降级

> 上段=v39（用户四项裁决+几何源迁移提案并入+设计书全链定稿）。本段=F-A6-a
> 取证票全链落地：三屋探针票（实现者五段探针+A/B 对照+tick 前测）→门一 Kimi
> PWW 回炉闭合→门二 deepseek PWW 4W2N 主控直裁——**R-迁移为主修裁定成立，
> 但被阶段化**（阶段1 T1/T9 前置修复→阶段2 复跑对照决策门→阶段3 主链迁移）。

## 1. 本段终态

| 项 | 数值 |
| --- | --- |
| F-A6-a 产物 | 脚本三件（f-a6-diag{,-lib,-page}.mjs，427/438/339 行——五段探针+双轨守卫复刻+乙轨项几何+量化判据）+f-a6-diag-out/ 44 件数据+裁决表 f-a6-forensic-verdict.md（§1~§9 含门一双档处置）；locks 272=269+3（bundle 落点主控修正至 out/f-a6-bundles/——esbuild 再生产物不入受锁面） |
| 环境段定谳 | **真实库 46 页（2 唯一内容：3882 学术 8 页密集+1c2d 扫描拼合 38 页）T1/T9 全零触发**（rotate=0/view 原点 [0,0]）；合成 S1（/Rotate 90）/S2（CropBox [36 36 …]）触发量化闭合：S1 outside=5/8 span 落盒外+paint 并 1 块 vs 行真值 3；S2 双向平移 x+36.01/y−37.40px（dy=7.9 表值=配对器错行残差非平移量——门一 W1 回炉分解，主控复算验证） |
| 病灶链 | 首个偏离「每视觉行一块」=**mergeLineRects 步骤② rowGroups（80 组 vs 行真值 43——T2/T3 拆簇 +86%）**，mergeRects 收口 42 兜住；b 链（band 匹配）健康；**用户实报重形态（锯齿+右溢）未在真实抽样页复现**（轻形态 3/39 行双块）——修复集以机理+合成证据裁定+验收条件随票流转（裁决表 §5，门二 W2） |
| A/B 路线裁定 | **R-迁移为主修+基线分组并块，R-加固降为回退**——但**阶段化决策门**（门二 W3）：阶段1 T1/T9 duckViewport 前置→阶段2 复跑 A/B 对照（S1/S2 消除+健康 IoU 不劣化）→阶段3 主链迁移。证据结构（依存声明=门二 W1）：真实样本同净（IoU 0.9996/0.9999）+S1 乙净甲错（以 T1/T9 未修为前置，修复后归零——主修剩余支撑=健康页无损+结构性免疫拆簇）+mLR 对项盒结构性反证（211/151 vs 43/10——「换并块语义」而非「换输入」） |
| 双轨守卫 | 五步复刻×5 样本 guard 全等；bandFromMetrics 双轨 5/5；**守卫自证有效性**：首轮抓到复刻 center-clamp 偏差（annotation-resolve.ts:93-97）——非形式主义 |
| G2 交付 | 偏离率≥5%（健康 0~0.12% vs 病理 25~62.5%，间隔≥200 倍）+右溢 >2px 支=占位（全样本右溢 0 无观测支撑）+「仅新增复现证据时启用」（WARN-5） |
| tick 基线（F-A6-c 前测） | 5Hz 步进直接实测（mutation 间隔 199.8~207.3ms）；3882 页 tick 端到端 0/22.4/172.3ms；每 tick gBCR≈101/getComputedStyle≈391；mutations=7 成因式在档（节流窗÷dispatch 间隔，与字符量无关） |
| 门审链 | 门一 Kimi k3 **PWW**（R1~R6 全支持核心裁定；3W=dy 机理/tick 缺行/min 口径已回炉闭合——实现者第二轮）+门二 deepseek v4flash **PWW**（4W=证据依存声明/验收条件/执行顺序决策门/mutations 成因——主控直裁落地；2N=表注对称/C2 标题）——处置档裁决表 §9-7/§9-8 |
| verify/locks | **149 文件/1273 用例/locks 272 全绿亲验**（exit=0；本票零 src 改动——基线数字不变，locks +3）[locked-change] |

## 2. 下段执行序

1. **F-A6-b D1 管线加固票（§2 首项——阶段化起步）**：按裁决表 §5 阶段列——
   **阶段1=T1/T9 前置修复**（TextLayer duckViewport rotation 通道+rawDims 真值化；
   装配链需把 page.rotate/page.view 下钻至 TextLayer——涉 PdfPageCanvas 载荷扩展）
   →**阶段2=复跑 f-a6-diag A/B 对照**（S1/S2 形态消除+健康页 IoU 不劣化=决策门）
   →阶段3=主链迁移（pdf-item-geometry.ts+基线分组并块+bands 同源 C5+viewport/styles
   下钻通道 C1）+T2/T3 回退路径加固。TDD 先红（交错/pitch/项几何夹具）→绿→
   变异红证；RTL/竖排/grapheme 细分须单测夹具补（运行时触发面零——§9-4）。
2. **P7D-01 批一**（闲时可动）：动效 --dur-* 变量+间距 inline 12 处清扫+层级语义
   命名——零视觉差（无头截图 diff 验收）；自产 .mjs 验收脚本诞生即 locks。
3. **P7X-02 时长 outbox**（闲时可动——service 层非视觉）：设计面=与 saveProgress
   单通道关系+重启恢复语义；设计链走外链双跳。
4. **P7D-01 批二**（在场轮）：字号语义刻度+mockup 用户逐档裁。
5. 被动观察照旧：e2e reader-text:872 第 1 现指纹在档（F-A6-c 落地时全量 e2e）。

## 3. 本段方法论资产

- **阶段化决策门（门二 W3 修正）**：取证票给出「主修裁定」时，若判别性证据
  与某前置修复存在依存（前置落地→证据消失），票面必须把「前置修复→复跑
  对照→终裁」写成显式阶段，防实现者在已修基线上引用过时证据（证据超卖）。
- **推理链编号化的对抗红利**：门一包把六条核心推理链编号（R1~R6）供逐条
  立场——门审输出可对号核验，处置档逐条留痕；比自由叙述审查的可复核性强。
- **外链调用器的推理模型预算教训**：kimi k3/deepseek v4flash 均为推理模型，
  max_tokens 需覆盖 reasoning（k3 JSON 强制契约下 3k/10k 全耗 reasoning 正文
  空——改 markdown 瘦身契约+10k 成功；ds v4flash 6k 同病，22k 成功）；输出
  契约优先 markdown 而非纯 JSON（历史成功档同为 markdown）。
- **数据目录 .mjs 的受锁面接缝**：esbuild 再生产物落 scripts/ 下任意 .mjs 会被
  check-locks walk 收录——数据目录不入 git 而 manifest 提交=CI 必红；再生产物
  落 out/（walk 显式跳过）每次运行现场重生成。

## 4. 成本账本

```
主控 GLM5.3×bigmodel-coding-plan：T1/T9 行级复核+PDF 资产预扫（pdfjs ESM 探针）+
  派发票面拟定+验收对账（五样本块数/IoU/shift/tick 逐项复算）+门二直裁修订
  （4W2N 落地裁决表）+bundle 落点修正+registry/设计书/交接书
实现者子代理 GLM5.3flash 档两轮：取证三件+44 件数据+裁决表（11.5M tok/40min）
  +门一回炉（dy 机理解分解/tick 补行/口径统一——4M tok/5min）
外链（gate-call 链）：
  Kimi k3 门一 r1（JSON 契约 3k）：in 8563/out 3000 全 reasoning 正文空=废
  Kimi k3 门一 r2（10k JSON）：同废
  Kimi k3 门一 r3（markdown 契约 10k）：in 8268 / out 4502 / 81s ✓ PWW
  deepseek v4flash 门二 r1（误传 system）：in 12951/out 8000 废
  deepseek v4flash 门二 r2（6k）：out 3257 全 reasoning 正文空=废
  deepseek v4flash 门二 r3（22k）：in 10959 / out 4738 / 37s ✓ PWW
```

## 5. 环境事实滚动

- 基线：149 文件 1273 用例/locks **272**（269+f-a6 脚本三件）/e2e 39——本票零
  src 改动。
- gate-call 调用纪律（新）：kimi k3 与 deepseek v4flash 均推理模型——max_tokens
  给足（k3≥10k/ds≥20k）+输出契约用 markdown 非 JSON（§3 资产条）；
  `--system-file` 必传专用系统提示词文件（误传 .py 会污染 system 位）。
- 真实 userData 实测位=`%APPDATA%\Synapse Remake\user-data\files` 不存在，
  实际=`%APPDATA%\com.synapse.app`（papers/ UUID 布局）——f-a6-diag A1 段已
  自动发现；备份库 local-state-backup 仍是取证主资产。
- verify 后 better-sqlite3 ABI 停 electron（build 尾步切换）——直跑 `npx vitest`
  会因 ABI 不匹配批量假红（178 failed 实录）；测试一律经 `npm run test`
  （先 sqlite-abi use node）；跑完如需恢复 electron 终态手动
  `node scripts/sqlite-abi.mjs use electron`。
- 任务池：open 3（F-A6 a 毕待 b 开工/P7D-01 方向毕待批一/P7X-02 未动）。
- 沿用 v39/v38 各条（Kimi 大包 504 规律/外链探针纪律/事故复盘）。
