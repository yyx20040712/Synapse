# 2026-09-11 LOOP 交接 v60——架构裁决批 + F-TESTREF-00 指纹门落地（测试优化战役开役）

> 上段=v59（F-LINT-04 战役收官+池尽收段）。本段=用户指令「基于 deepseek 两分析件
> 裁决→规划→优化架构→维护文档群」：①GLM 终裁书（复杂度审计×测试宪章逐项裁决）
> ②立案 10 票（测试优化战役七票+DEDUP+GEOM+S1）③**F-TESTREF-00 指纹门全链落地
> （设计链三跳+三屋+回炉一轮）——「测试不可静默削弱」自本场起为 CI 机检**。
> 基线推进：**162 文件/1579 用例/locks 325**；registry **9 open/174 done**。

## 0. 开场（三态恢复——下批次首读）

- 预期 **A 态**：HEAD=本交接提交+干净树→§2 首项 **F-TESTREF-W1A**（mock 工厂下沉
  ——前置 F-TESTREF-00 已毕）可直接接续；战役执行序与全部票面在
  `docs/design/2026-09-11_glm-ruling-arch-complexity-and-test-campaign.md` §4-4/§5。
- B/C 态处置照 AGENTS 既有规约。
- HEAD 链：…dcd1108e98（v59）→8dfd6229f7（裁决批+立案+S1 骨架）→ff96cb1f02
  （F-TESTREF-00 收口）→本交接提交。
- **战役纪律提醒（W1A 起每票适用）**：解锁 tests→重构→`npm run test-surface:check`
  对拍（C 面零变化）→`[locked-change][test-refactor]` 双尾注→锁重施→**本地显式跑
  `npm run test -- --coverage` 与 `npm run test:e2e` 真退出码落盘**（战役 DoD——
  本地 verify 不含两者）；净删行数记账入交接书 §3。

## 1. 本段终态（三件）

| 件 | 提交 | 要点 |
| --- | --- | --- |
| GLM 终裁书 | 8dfd6229f7 | 断言核验对账（全机检断言抽查——三处计数勘误：37037→37012/reader 修正期新建 25→18/几何桩 93→97）；M1-M5 五机制全采纳；审计建议逐项裁决（INV-58 立案压轴/治理预算轻量/迁移 squash 否决设触发线/P2 去重立案）；宪章死结诊断成立战役放行；§5 用户裁决面三项（存储债/postcss/观察项） |
| 立案 10 票 | 8dfd6229f7 | F-TESTREF-00/W1A/W1B/W1C/W2/W3/W4+F-DEDUP-01+F-GEOM-01（+收口段 S1→ff96cb1f02）；骨架件按「工单文件头注=任务书」先例；locks 319→322 |
| F-TESTREF-00 | ff96cb1f02 | **测试面指纹门**：check-test-surface.mjs 386 行+test-surface/extract.mjs 477 行+基线 23910 行（179 文件/1623 用例/4979 断言/15 skipSite/each 160/UNRESOLVABLE=0）；C_after ⊇ C_before 多重集机检+verify 链挂载（quality 后）+CI 范围闸+豁免清单留痕通道；设计链三跳（Kimi 拟定→deepseek 审 B2/W9「不可终裁」→GLM 终裁含两 ⑤i 实锤修正）+门一 R1（deepseek 兜底——B1 空基线恒绿通道）→回炉八项→门一 R2（kimi-main 862s 收口放行）+门二 PASS（verify 独立亲跑 0）；变异矩阵 M1-M10+B1b+M3/M5 补证全过；locks 322→325（基线/豁免入 protectedFiles 双侧登记=信任根受锁） |

## 2. 挂起项与后续票候选（按执行序）

1. **F-TESTREF-W1A（§2 首项）**：mock 工厂下沉（api/client 39 文件+Toast 32 文件
   →tests/utils/api-client-mock.ts 单源——骨架头注即票面）。指纹门对拍+净删记账。
2. **战役序（终裁 §4-4）**：W1A→W1B（几何桩 22 文件/97 处+工厂下沉）→W1C（e2e
   launch 5+seed 5+first-window 配方收敛）→W2（探针 @probe 化 719 行移出默认门）
   →W3（shared 直接契约测试——纯增先红后绿）→W4（flake 台账机件化+INV-63/64 入册
   +战役收口段含本地 coverage/e2e 亲跑总账）。
3. **F-DEDUP-01**（战役毕后）：DomainError 15 文件/原子写/清洗单源化。
4. **F-GEOM-01**（压轴设计链）：INV-58 双几何族同族化——态空间表+跨格序列推演
   缺一不受理。
5. **F-TESTREF-S1**（搭车票）：抽取器语法子集补强（W12 哨兵 each 形态/N11 本地
   变量别名/N15 type-only 排除）——零存量命中，随战役任意票顺带或触发时单独。
6. **用户裁决面（终裁 §5-3 原样挂起）**：①存储债（audits 1.6G+.git 6.7G 三选项）
   ②postcss 显式化（v58 承袭）③v59 观察项全数承袭（F-A12/T4 行尾注释/T2 kebab
   域缝/F-A9/F-UI-01/settings.png/SVG var() 引擎线）。
7. **备选池（不立案含触发线——终裁 §5-2）**：F-LOCKAUDIT-01 锁面清点/deepseek_audit.py
   锁网缺口微票（先查引用倾向删除）/删通道出口（死通道实证时）/迁移 squash（≥12 或
   单表 ALTER≥4）/corpus.export 拆分（破 500 或功能触及）/reader 头注瘦身（随 GEOM）。

## 3. 本段成本账本（§4 口径——模型×供应商分列）

```
主控 GLM5.3（本窗全程）：核验对账/终裁书/立案/设计链第三跳终裁/回炉裁决十项/
  门二前误提交自纠（软重置）/M3/M5/B1b 补证亲跑/收口三提交/v60 滚动
F-TESTREF-00 设计链：
  Kimi drafter（kimi-main）：in 3087/out 8982/187s
  deepseek auditor-readonly：in 8380/out 19015/89s（审核结论「不可终裁需回炉」
    ——B1/B2 两契约级漏洞+⑤i 实锤两处主控预埋进审核包命中）
F-TESTREF-00 实现者（环境统一档——Agent 无 model 参数，同源欠账如实记）：
  首轮 7.49M tok/85 调用/26.8min+回炉轮 6.37M tok/37 调用/7.5min（十项修复+
  两新自裁）；探针/变异全部 cp 备份法
门一 R1：deepseek 兜底（kimi-main×3+kimi-backup×3 全 504 退避——状态机 6 次换源
  成）in 22544/out 24019/114s/switches=2——B1 空基线恒绿+W11/N10 放行附条件
门一 R2：kimi-main 第三退避 862s 成（网关窗恢复）out 9273——收口放行 B0/W1→S1/N6
门二统一档：0.996M tok/30 调用/5.2min——四清单+一全 PASS+verify 独立亲跑 exit=0
```

## 4. 教训行（本段追加三条）

- **门二前勿提交（主控自纠实录）**：P0 收口时主控在门二终审前落了提交——违反
  三屋次序（门一+门二→处置→收口提交）。补救=软重置（保留暂存面=同一棵树）→补
  门二→过审重提交。本地未推送窗口内软重置零损失，但该纪律不该靠补救维持：
  收口动作清单固化为「verify 亲验→门一→门二→翻 registry→提交」不可重排。
- **宪法 shell 四坑之二亲历（M3 补证实录）**：主控用 node -e 插入中文变异文本，
  GBK 化后 replace 无匹配静默无效——两轮「门盲区」假象实为探针失效，探针文件法
  （Write .mjs 后 node 文件）一轮成。探针纪律对主控同样生效，「看起来是门的 bug」
  先查探针工具面。
- **输入件计数责任（终裁 §7）**：外部模型分析件的计数不可直接转录——三处偏差
  （37037/25 个/93 处）若未实测即落票面，W1B/W1C 规模即带病立项。「计数实测」
  纪律适用面包含「别人给的计数」。

## 5. 环境事实滚动（含治理五指标首用——终裁 §3-2/methodology §4 规约）

- 基线：**162 文件/1579 用例/locks 325/e2e 44**；registry 9 open/174 done。
- **治理五指标（2026-09-11 首录）**：test:src LOC 比=**37,033:31,076=1.19**
  （+21=两骨架件头注）；locks **325**；registry **9/174**；audits **1.6G**；
  .git **6.7G**。
- 指纹门基线（W1A 起对拍锚）：179 文件/1623 用例/4979 断言/15 skipSite
  （conditional 15+hard 0）/each 160 行/UNRESOLVABLE=0；`npm run
  test-surface:check` 已入 verify 链（quality 后）；基线再生成=`npm run
  test-surface:baseline`（显式+全量 diff 审计）；豁免通道=scripts/
  test-surface.exemptions.json（reason+rulingLink 强制，受锁）。
- Kimi 网关窗本段不稳：R1 时段双源 504×6（deepseek 兜底成）；R2 时段第三退避成
  （862s）——派发器状态机全链实证可靠，额度窗按 org-config 口径随批重申。
- v59 承袭事实全数有效（volta 布局/geometric-repack 噪声/Node 25 vitest 破损等）。
