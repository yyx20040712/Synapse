# 2026-09-09 LOOP 交接 v52——文档群维护+夜间大批量三单立案（F-TOOL-01/F-CSS-02/F-LINT-01）

> 上段=v51（P7D-01 批二在场轮毕,P7-D 收官）。本段=文档群维护（AGENTS
> audits 三桶章+methodology ⑤g/⑤h+INV 册核验）+用户裁决（INV-11 纳入
> 夜间批+两增强小单全立案）→**夜间大批量交接文档**（本文=夜间场排程
> 真相源）。基线未动：156 文件/1543 用例/locks 286/e2e 43。

## 0. 夜间场开场（先于任何新开发——闲时纪律三态恢复）

- **三态判定**：A 干净树+HEAD=v52 提交=直接接 §2 首项；B 脏树=票中断
  残留（verify 绿补完门审收口/红速修或还原——未跟踪新件删或移 audits）;
  C HEAD 非 v52=查该提交门审在档与否（过=补更新交接书/未过=补审）。
- **每会话首动作=技能清点**（AGENTS 开工纪律）——夜间场默认带：loop-
  defenses/loop-engineering（闲时三停止条件+断点保护）、verification-
  before-completion（收口 verify 亲跑退出码）、subagent-driven-development
  （三屋派发）、test-driven-development（实现者面）。
- **夜间铁律**：每票独立提交（任意时刻会话死损失≤一票）;**夜间不留
  半门审提交**（提交前该票门审完成或整体还原挂起）;视觉决策零承担
  （遇即挂起跳次项——本批三票均无视觉裁决面,票面已写死）;e2e 非确定
  红立案线=同用例 2 次;禁自估上下文。

## 1. 本段终态（维护面）

| 项 | 结果 |
| --- | --- |
| AGENTS.md | 依赖与提交节增**audits 三桶口径章**（F-AUDIT-01 终裁制度化——证据件随收口入库/`*out*` 目录 gitignore 拦/backup 禁驻留;收口毕 status 未跟踪面=零） |
| methodology.md | §4.1 简报模板增 **⑤g 值→派生耦合链清点**（批二 37.05px 截断案——非整数盒高字面量=派生痕迹/行高系数 grep/禁容差声明半迁）+**⑤h 定向 diff 三件套**（改值票视觉验收范式——带对位+crop 目检+计算样式断言,Playwright 三坑内记） |
| invariants.md | 核验无腐（INV-61 单行格式完好——首查「重复」为 grep+sed 双打印伪影,awk 复核闭环;INV-58~61 批二后全一致） |
| registry | 三单立案（§2）——area 全取联合值,typecheck 过（v48 教训防复发） |

## 2. 夜间执行序（三票——序=①工具②测试③设计链压轴）

### ① F-TOOL-01 像素差分定位器固化（infra 小票,零网络,暖场）

- 新件 `scripts/audits/visual-diff-locate.mjs`：两 PNG 目录+态清单→每态
  差分行带（16px 块网格/TH6/cnt≥4）+可选 crop 模式;三坑规避内建（file://
  原源 goto/--allow-file-access-from-files/pathToFileURL）;纯 Node 零
  electron。
- **自产 .mjs 诞生即 locks:generate+apply**（AGENTS 硬规——manifest 落后
  =verify 必红）。
- 验收=对 p7d01-out 现存 baseline/after 八态实跑（批二裁决态——差分带与
  在档对位一致）+同图对比零带自证。三屋派 GLM5.3flash。

### ② F-CSS-02 theme.test 负锚升级（ui-kit 小票,受锁面）

- FS_LITERALS 枚举矩阵→正则全域 `font-size:\s*[\d.]+px\s*;` 计数=0
  （七 CSS 件;去分号依赖——无分号绕过通道闭合）;tsx 形态锁同步升级评估。
- 先红证（植入 13.5px 一处→新锚红→还原）+**变异红证=升级不弱化证明**
  （现行枚举锚删一组→新锚仍拦）;unlock→改→apply+[locked-change]。
- 三屋派 GLM5.3flash。

### ③ F-LINT-01 INV-11 lint 机器化（infra 压轴,设计链三跳+全链）

- **设计链强制**（§4.5 架构位）：Kimi K3 拟定（What to lint 逐形态可检性
  裁决+规则形态三案选型 no-restricted-syntax/AST 插件/文本关卡+分期）→
  deepseek 对抗审核→GLM5.3 主控终裁。**外跳包口径**：设计书 prompt
  ≤10KB（ds-call ~300s 网关窗——v47 体量分界）;网络断=顺延留次日
  （闲时纪律,勿降级为同源自拟）。
- 实现=终裁版落地（eslint.config.js 受锁+[locked-change]）;规则先红证
  （植入双源反例→红→删）+全量绿（存量零误报）;INV-11「部分」→「已
  锚定」升格登记。
- 夜间压轴位：①②收口后启动;门审链全（门一 Kimi 外跳/门二子代理）;
  **token 预算警觉**：设计链两跳+实现三屋,夜间额度自检（Kimi 主源
  失败按换源状态机,源尽记欠账回退——勿空转重试）。

> 停止条件：三票毕+交接书滚动=①池尽;夜间任何真阻塞逐项处置后跳次项
> 继续,三票全阻才收段。每票收口即取次票——无事收段=事故。

## 3. 本段成本账本（续 v51 §3）

```
主控 GLM5.3（维护场）：文档群维护（AGENTS/methodology/invariants 核验
  ——含 INV-61 重复伪影排查闭环）+用户两问裁决路由+三单立案（TicketArea
  联合核+typecheck）+v52
（无子代理/外链调用——纯文档与控制面场）
```

## 4. 教训行（本段追加——v51 §4 之续）

- **「文档重复」类报告先复算再动手**（本段 INV-61 伪影实录）：grep+sed
  双打印同一行被误读为重复登记——awk 计数复核一行闭环;受锁文件「修复
  重复」若无重复=白付一次解锁+引入真损坏风险。**格式缺陷断言须独立
  第二口径复核**（与计数纪律同族）。
- **交接书留场的「待用户裁决」项应趁在场窗口立即收敛**（v50/v51 两度
  延期 INV-11 的对照：本段用户一句「维护文档+夜间交接」顺带即裁——
  在场窗口的裁决成本低,池面挂起项攒多=每份交接书的固定负债）。

## 5. 环境事实滚动

- 基线：**156 文件/1543 用例/locks 286/e2e 43**;registry 4 open（F-A8
  门 3+F-TOOL-01+F-CSS-02+F-LINT-01）/153 done。
- p7d01-out 现存 baseline/after 八态=批二裁决态（F-TOOL-01 验收素材,
  勿清理）;批二后新 baseline 重采纪律照旧（视觉票才需要）。
- ds-call 外跳体量分界沿用（~10KB 设计包入窗/~300s 网关）;Kimi 主源
  稳定（v50 三场+批二一场全 switches=0）。
- 沿用 v51/v50/v49 各条（含 Playwright 三坑/§6.2 三件套配方/electron
  seed 崩溃 out/ 坏中间态 rebuild 法）。
