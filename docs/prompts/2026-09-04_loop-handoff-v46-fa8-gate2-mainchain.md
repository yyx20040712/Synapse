# 2026-09-04 LOOP 交接 v46——F-A8 门 2 主链切换毕（阶段 4/5,S0~S6 上线+INV-58 扩域兑现）;门 3 待观察期

> 上段=v45（F-A7 收官+F-A8 立案+门 0/1/1b）。本段续：**F-A8 门 2 主链切换票**
> 全链（实现+回炉+双门审,提交 02d49f27e4）——含**门 0 遗留 CI 隐患修复**
> （anchor-item-verify.test.tsx 补 git add+ls-files 硬校验）。F-A8 剩门 3
> 收口票（观察期语义——跨场次真机使用后回退层去留裁决）。

## 1. 本段终态

| 项 | 数值/结论 |
| --- | --- |
| F-A8 门 2 | **毕**（02d49f27e4,38 文件 25336+）：annotation-resolve-layered.ts 新件（三层编排——Annotation 版+AI 段版[S3b=不渲染]+S6 共享判定 domProductSuppressed）;resolveAnnotationRects 改名 …Dom 函数体零改（S4 回退——INV-47 数值面锚）;两组件接线（CR1 usePageItemsStore react 订阅重入+竞态 fixture 双组件[M1/M1 撇号变体各红]+CR3 page 键+source 域标记 item/dom 运行时不入库）;S1 reconcileItemsWithDom 接线对账;S6 病理抑制（**触发=项盒健康代理**——blocks clamp01 恒盒内实由 boxes 越界触发,名实偏移已补注,门 3 复核）;INV 四条落册（58 扩域/47 收缩[受锁⑪间接保证措辞]/59 同族配对令/60 显示覆盖登记）;探针复跑 7 页×5 锚**逐位相同 maxΔ=0.0000**（健康面接线零漂移铁证——S1/S6 路径单测 S 格补）;门一 Kimi K3 PWW 5W2N 回炉全闭合+门二 deepseek PWW 1W2N（W1=INV-59 证据件未入库时点禁称已锚定→本提交兑现;N1 AnchorCache 头注/N2 INV-58 S4 单入口措辞 vs AI 段内联分支——**转门 3 顺带**） |
| 门 0 遗留修复 | **anchor-item-verify.test.tsx 补 git add 兑现**（manifest 有 sha 无文件=CI clone 必红的隐患——门 0 收口 staged 清单遗漏实录;本提交 ls-files 硬校验过[门一 W3 硬前置]）;INV-59 证据列标注「随门 2 收口提交兑现」 |
| 基线 | verify **155 文件/1357 用例/locks 281/e2e 42** 全绿亲验;grep TODO/FIXME/placeholder 零命中 |

## 2. 下段执行序

1. **F-A8 门 3 收口票**（观察期语义——**不立即开工**：需跨场次真机使用观察。
   开工条件=下一场起算观察期;清单：①DOM 回退层去留裁决（保留=回退层非并存
   方案——设计书 §6 门 3）;②box 口径差真机偏差分布记录（entry.box vs
   textLayer 实测盒——门一 W2 观察项）;③S6 项盒健康代理复核（门 3 随回退层
   去留）;④N1/N2 顺带（AnchorCache 头注旧措辞/INV-58 S4 单入口措辞 vs AI
   段内联分支）;⑤bottom 双根因机制占比分解（门 1b 第二步待办）。
2. **P7D-01 批一**（闲时可动——v45 §2-3 原文）：动效 --dur-*+间距 inline
   12 处+层级语义命名,零视觉差（无头截图 diff 验收）;自产 .mjs 诞生即 locks。
3. P7X-02 时长 outbox（设计链外链双跳）。
4. 被动观察：F-ARCH4-M1（多场零现——最近三轮 42/42）;tsconfig.node jsx 债。

## 3. 本段成本账本（续 v45 §3）

```
主控 GLM5.3×bigmodel-coding-plan：门 2 全链验收（verify 亲验 ×3 含 close 首红
  诊断[registry 撇号转义二犯]）+门一/门二包+裁决处置（回炉 5 项下发+W2/W3
  主控面分工）+INV-59 兑现标注（locks unlock/apply——invariants.md 实为受锁
  面实录）+registry 门 2 注记+收口硬前置执行（补 add+ls-files）+v46
实现者子代理（环境统一档欠账披露——GLM5.3flash 定档申报）：
  门 2 实现者 13.53M tok/29.4min+回炉 3.95M/4.6min
外链：Kimi K3 门一 in 24120/out 5864/163s PWW;deepseek v4flash 门二
  in 24857/out 22881/179s PWW
```

## 4. 教训行（本段追加——v45 §4 之续）

- **受锁新文件 staged 遗漏=CI 定时炸弹**（门 0 实录:anchor-item-verify.
  test.tsx 在 manifest 有 sha 而 git 无文件——本地 verify/locks 恒绿[文件
  在工作区],CI clone 即红;门 2 实现者交叉发现移交）。**收口铁律增补：新受锁
  件提交前 `git ls-files <件>` 硬校验必跑**（staged 清单显式列名的自检不
  够——列名≠staged 成功,本段 git add 整批失败被 2>/dev/null 吞的两实录同源）。
- **registry 注记引号纪律二犯**（M1 撇号 M1'——首犯 v45 单引号 'w',本犯
  撇号转义同族）：**注记内一律禁 ASCII 撇号/单引号**（中文引号+方括号替代
  ——「M1 撇号变体」写法）;close 首红 exit=1 两实录在档。
- invariants.md 实为受锁面（locks:apply 置只读——PermissionError 实录）——
  INV 编辑须走 unlock→改→apply 全流程（此前按「控制面非锁面」认知操作,
  门 2 收口实测纠正）。

## 5. 环境事实滚动

- 基线终态：**155 文件/1357 用例/locks 281/e2e 42**（v45 基线 155/1347/281/42
  →门 2 +10 用例）。
- 任务池：F-A8 open（门 3 待观察期——下段 §2-1 清单）/P7D-01 批一/P7X-02。
- F-A8 阶段全景：立案（设计链三跳）→门 0（纯函数域）→门 1（取证:判据 a 不过
  →回设计）→门 1b（ascent 修+分层过门）→**门 2（主链切换 S0~S6 上线+INV-58
  扩域）**→门 3（待观察期）。
- 沿用 v45/v44 各条。
