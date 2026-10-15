# 交接书 v196 —— F-UIRES-04 批 3b 毕（脉络集成，2026-10-16 凌晨定时批）

> 前承 v195（含 §6 增补——下载模块设计 v2.1 与用户批序待裁项沿承）。
> 本档=批 3b 单据+**下场开工序单源**。

## §0 本场总账（runId=20261016-b3b；账本 8 行在档）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 开工 | 凌晨两点一次性定时任务触发（automation-7c360e07——用户 10-15 深夜指令跨零点修正锚 10-16 02:00）；占用检测四通道=空闲（兄弟会话 4137 已收盘闲置记档；**中段 02:19 苏醒提交 v195 §6 增补 a1526e5f+push CI success 后复归闲置——与工作区零交叠**）；首动作=v195 CI 回执复查 ✓（run 38778241309 success）；技能清点 10 项（2 用 8 不用）+health（kimi-main ok18/deepseek ok67/kimi-third ok94） | session-open 在档 |
| 批 3b 实现 | executor 三轮（r0 6.19M tok/r1 2.34M/r2 3.29M）：TagsRow 31+PaperInfoSection 90+SidePaperInfo 92（新拆件预裁 N-c）+宿主 207+CSS +62+e2e 新 spec 4 例+纯件单测 6 例+INV-136/137/138+六受锁单测 stub 接缝（reject 语义）+seed 扩面+manifest 453→455；r0 BLOCKED 正确上报（6 受锁单测 stub 缺 library.detail——授权墙外停手）→主控扩权 r1→r2 五项回炉 | impl.report §r0-r2+勘正段 在档 |
| 批 3b 门一 | r0 双审：k3 默认席 PWC B0W6N7+d1 PWC B0W4N7 **双源互证**（切篇陈旧帧〔entry 一帧残留+TagsRow/error 滞后帧〕/摘要展开态跨篇驻留/纯件测试盲区三族）→r2（双扇出 useLayoutEffect paint 前归位+key={data.id} 换篇复位+纯件单测 6 例+INV 措辞+seed 注释）→增量复审 k3 **PASS B0W0N4**+d1 PWC B0W1N3（W1=轮询引用相等前提） | 双 verdict×2 轮 在档 |
| 批 3b 门二 | probe **七项全 PASS**（verify 独立复跑 EXIT=0 327/3466+计数零差异〔3587−3466=121 交叉自洽〕+变异红证独立复现 md5 还原+M2 替换语义负检 `\.status *=` 零命中+六桩纯增量 diff 证实）；adjudicator **GO_WITH_CONDITIONS 零回炉**（**d1-W1 主控核销**=M2 三迁移点全替换语义 L55/L104/L115〔probe+裁决部双独立确认〕；**裁决部异构新发现**=impl.report spec 行数 169→148 失实——报告面计数坡口样本） | g2probe-report+终裁 在档 |
| 收口 | 五条件兑现：C1 报告面勘正批注（仓外）/C2 两票立案 F-PINFO-01+F-M2SUB-01（退出条件票面承载——F-GOV-01 适用面核定：轮询非治理面，defense-lifecycle 防线表无对应行）/C3 INV-138 措辞挂 F-TAGS-02/C4 指纹门基线口径锁定 11915（v194 §4 笔误 11901 勘正不再下传）/C5 CI 回执（push 后会话内复核）+feat 笔 2d495256 [locked-change]+本档 | 见 §4 |

成本≈14.38M subagent tokens（executor 11.83M 三轮/k3 88k 两轮/d1 189k 两轮/probe 799k/adjudicator 1.48M——usage 实测）+主控 host-max。

## §1 下场开工序（单源——v195 §1-1 沿承推进）

1. **F-UIRES-04 批 3c（文献库详情面板重排）**：PaperDetailPanel 220/250 红线——**首步出拆件清单**（设计书 §4.5：标签节上移〔既有 TagEditor 整体+key=detail.id 重挂竞态守卫不动〕+信息区挂载〔PaperInfoSection props 化——detail 既有载荷注入，library 域零新增取数面〕+DrActions 九钮下移〔受锁按钮文本/testid 零改〕+滚动承载〔E 裁决右侧滚动条〕）；DrActions 滚动区内随滚 vs 底部固定=视检时用户定（默认随滚动=用户字面顺序）。**F-PINFO-01 三断言顺带补锁**（触 library 同构面窗口）。
2. 批 3d（收起钮 D8——首动作 grep e2e 选择器形态+F-SETSTYLE-01 搭车）+穿插窗四票（DRAGREMOUNT 方案A/REQFP/IMPORTGATE/B6 候补——B6 触 toast-store 面顺带）→ F-UIRES-04 翻 done。
3. **集中视检轮**（1A 裁决——清单六面=仓外 20261015-uiinv/visual-inspection-checklist.md；**视检含批 3b 新面**：标签行/信息区/摘要展开收起/机构禁用位/strip 降级与 partial 徽注）→AI 模块+下载模块 B1-B8。

## §2 沿承挂账

- **F-PINFO-01**（消费面三断言：重试观察链/extracting 省略面/M1 error 面——批 3c 顺带或独立小批）/**F-M2SUB-01**（M2 订阅面升级=error 续轮退出通道——评审触发器=下次触 PaperImageExtractor.ts 的任意批次，>150 行预算解锁拆件评估）。
- INV-138「同票启用」措辞消歧（C3——随 F-TAGS-02 或下次 invariants 受锁触面）。
- pdfjs 升级票 checklist+**真机提取冒烟**（C2-③——结构子集类型敞口，批 3b 兑现记档）。
- v192 挂账余项（③测试名随 regen/②双失败回滚打磨/⑥R16 不立票）+挂起/超时族四例（第五例评估线）+B6 候补+kimi-main 认证观察（本日未再遇失败）沿承。
- **指纹门引用基线口径=自 11915 起算**（C4——v194 §4 的 11901 笔误不再下传；base 冻结落后两件=在册挂账 v192③，下次 baseline 再生成同行）。

## §3 待用户面

1. **下载模块两项批序**（v195 §6 增补：v1v2 合并乙案〔内嵌浏览器 B5 位，70.6% 行数处闭获取可用〕+PubMed 升 B8）——B1 开工前一句话。
2. 集中视检轮排期（批 3 全毕后由主控提示——1A 已裁）。

## §4 基线与治理（本场终态）

- HEAD=本批 2 笔：①2d495256 feat(ui) 批 3b [locked-change]（18 件=5 新+13 改，+646/−19）；②本笔 docs(prompts) v196。
- verify：**收口主控终验 EXIT=0**（327 文件/3466 用例=3460+6；e2e 121=117+4〔全量面 CI 承载〕；locks 455；指纹门 base 358/3548/11805+cur **362/3587/11949** 绿 exemptions 0——总增量 +2/+10/+34=e2e 4 例 16 断言+unit 6 例 18 断言）。
- registry：**290 票（open 12/done 278）**——F-UIRES-04 批 3b 完成注（票维持 open）+F-PINFO-01/F-M2SUB-01 立案（grep -c 实测对账 290=288+2）。
- 治理基线行：INV **138**（+136/137/138）；locks **455**；ADR 触及=**零新 ADR 如实申报**（组件级实现批——设计书 v1.2 既有架构面，无架构决策演进）。
- 账本 ts 勘正注：本场账本行 ts（02:47-04:35 段）为主控手写估算偏晚——实测墙钟 03:37 时点核对+裁决部以机器时间戳定谳 probe 窗 03:10-03:18 正确；**后续会话 ts 一律 date 实测落笔**。

## §5 证据档指针（仓外档案区 /home/yyx/synapse-archive/scripts-audits/20261016-b3b/）

session-open.md / batch3b-brief.md / impl.report.md（§自裁申报×6+§交付面+§r1 扩权面+§r2 五项+主控收口勘正段〔C1〕）/ g2probe-report.md+七件证据日志（b3b-probe-verify.log/b3b-mut-red.log/b3b-restore-green.log/b3b-p4-build.log/b3b-p4-e2e.log/b3b-p5-unit.log/b3b-p7-six.log）。

> 本批 push 后 CI 回执=会话内复核闭账（C5——F-CIFLK-01 纪律）。
