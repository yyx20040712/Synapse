# 2026-08-30 LOOP 交接文档 v12——验收闭环+异基座制度化首跑+架构修复批

> 背景:v11 交接后用户三连令:①「按 v11 交接书验收」②「同意继续+系统性
> 排查避免屎山+一定要调用 deepseek(本机 zcode 有配置)」③「基于这些反馈,
> 继续解决问题」。本场三幕连打:**v11 九项验收(ALL-PASS,双票闭环)→
> deepseek 补审+架构系统性排查(三 B 实锤)→ 修复批四票落地(含两次翻案)**。
> 基线:verify **112 文件 942 用例**(937+5 新测)全绿 / locks **186** /
> e2e **29/29**(P7-A 剪贴板本轮亦绿) / 依赖环 **0**(11→0)。六笔提交:
> 18eda1653(验收)/a7dbb778a(补审+架构)/c42185a6d(ARCH1+2)/
> 11075a1aa(fixture 勘误)/d6e9a5a59(消环)/960b8d2f5(门审收口)。

## 0. 开工纪律(下场执行前必读)

- 会话开工先做技能清点(AGENTS 宪法第一条)+配置自查;**Node 24 口径**
  (`export PATH="/d/nodejs24:$PATH"` 前缀一切命令——本机默认 v25 必红)。
- **deepseek 门一已制度化且首跑成功**(v11 §3 新规):调用器
  `scripts/audits/ds-call.mjs`(用法 `node ds-call.mjs <prompt文件>
  [输出文件]`,密钥运行时读 zcode 配置不落盘)。材料包组装范式在档
  (f-arch-gate1-prompt.txt 可参考)。**坑在案**:推理模型
  reasoning_content 独立字段,max_tokens 给小=正文空;Git Bash /tmp 在
  node 内解析为 E:\tmp,跨工具传文件用 os.tmpdir()。
- 红线:体检场只登记不修;修复走票;用户反馈=最高优先级。

## 1. 现状快照(2026-08-30 深夜,六笔提交后)

| 项 | 状态 |
| --- | --- |
| F-A1 标注归并 | **已闭环**(v11 九项验收 A 面全过+补审 B 零;W1 二轮翻案:fixture 头注数值口径勘误,Td 保持 24,T4 锚本成立) |
| F-L1-C 边标签 | **已闭环**(B 面全过+补审两轮 B 消解;备案 W2 FO 交互盒分离不保证/W4 padding 3 行实 2.7/3.3 滚到边界仍吞 zoom——低优先后续票) |
| F-ARCH1 closeTab 信号残留 | **已修待复测**(scrollRequest 条件清+瞬态通知仅关激活 tab 清;4 测+双轮变异红证;INV-29 增补) |
| F-ARCH2 undo 并发覆盖 | **翻案闭环**(指控不成立——undo 在 await 后重新取态;回归锁+真快照变异红证在档) |
| F-ARCH3 ReaderPage 拆分 | **待开工**(PagesOverlay 下沉方案 deepseek 已给具体拆分线;需测试护航) |
| F-ARCH4 anchor 476 行 | **预警**(拆 anchor-serialize.ts,趁早别在红线边缘) |
| F-ARCH5 ipc 类型环 | **已闭环**(IpcDeps 移 ipc-deps.ts,cycles 11→0) |
| F-A2 工具条不弹 | 定性闭环(联动 F-A3) |
| F-A3 选择模式按钮 | **可开票**(修法定向:选择模式标注层 pointer-events 全关) |
| F-L2 适应视图节点出视口 | **待排查**(auto-fit 包围盒疑似漏 1 节点,0bd9a528 超 212px) |
| 对偶矩阵 | 5 对闭环剩 6 对(台账 §四) |
| 台账 | docs/audits/audit0-findings.md(全场唯一发现登记处) |

## 2. 下一场执行序

1. **F-ARCH3 PagesOverlay 拆分**(重构票,测试护航;三屋+deepseek 门一)
   ——拆分线在档:pageTexts/pageRoots/handlePageRender/dropPageState/
   PageFrame 五件套下沉独立组件,ReaderPage 收敛到路由/布局/scroll 装配/
   fitWidth/快捷键;
2. **F-ARCH4 anchor 拆件**(anchor-serialize.ts 拆序列化与校验);
3. **F-A3 选择模式票**(功能票:选择模式标注层 pointer-events 全关+模式
   切换 UI——F-A2 根治+用户原始建议;门一 deepseek);
4. **F-L2 排查**(孤立节点/包围盒是否只含连通子图);
5. F-L1-C 备案三条择机(W2 交互盒/W4 padding/3.3 滚动边界);
6. AUDIT-C 竞态批→B 对偶→D 数据→E 性能→遗留池(F-G7 SettingsPage 拆件
   预警最近红线/F-G2 随 F-A1 已闭环一并复评销账)。

## 3. 本场工具与制度资产(下场直接复用)

- **ds-call.mjs**:deepseek 行内调用器(退避/超时/双读 reasoning)。
- **v11-accept.mjs**:九项验收器(真鼠标+隔离副本+注入碰撞源/旧格式),
  可复跑回归。
- **arch-scan.mjs**:架构机器面扫描(行数/依赖图环/孤儿/状态模块/跨模块
  行为/churn/类型跨侧七项)——**建议纳入常规体检轮换**;注意其 import
  解析不剥注释(头注里写 import 语句原文=假边)。
- 变异红证纪律增补:**变异锚点必须带足够上下文**(本场打偏教训:两行
  锚点首撞 markTabError,变异从未生效差点发假绿证;用「注释行+代码」
  组合锚点后咬合)。

## 4. 成本与流程如实账

- **本场无实现者子代理**——三幕全部主控直做(验收器/扫描器/修复批)。
  偏离三屋默认的理由:小票批(ARCH1 一行+测/ARCH2 纯测试/fixture 纯头注
  /消环纯机械)+取证密集交互(探针/翻案需主控即时判断);修复批仍走了
  门一 deepseek+主控核验,测试纪律(TDD 红→绿→变异红证)未打折。若下场
  F-ARCH3/ARCH4 大重构,**应回三屋**(实现者子代理领票)。
- deepseek API 调用 6 次(smoke/F-A1 补审/F-L1C 两轮/arch 架构审/修复批
  门一),产物 5 份在 scripts/audits/(*-ds.md);每份均经主控逐条核验后
  处置——**核验纪律:读全文,不只 grep 行号**(ARCH2 翻案教训)。

## 5. 方法论资产(本场最大产出之一)

1. **异基座审查三分法**(本场实证有效的流程):deepseek 独立审(不给同
   基座报告保视角)→主控逐条核验(读全文+必要时一手实测)→按裁决权限
   处置。首跑战绩:B 级指控 3 中 1 真实锤(ARCH1)/1 翻案(ARCH2)/1 半
   翻案(fixture W1 二轮翻案但暴露真问题=头注数值错);W 级多处真金
   (W-2 恒真断言/W-1 边界)。
2. **翻案两则在档**:数值断言会被在档错误数据带偏(fixture 头注 25.6px
   →deepseek+主控先后被带偏,探针实测 34.1px 翻案);「快照覆盖」指控
   误读 await 后取态(读全文即破)。**异基座≠免检,实测=终审**。
3. 取证坑累计入档(本场+4):推理模型响应形态/注释 import 假边/tmp 映射
   /zod .strict() rects 须含 page(注入打开文献当场炸)。

## 6. 档案索引

- 验收:scripts/audits/v11-accept-out/(JSON+九截图)+
  docs/audits/2026-08-30_v11-acceptance-report.md
- 补审+架构:scripts/audits/{f-a1-gate1-ds.md,f-l1c-gate1-ds*.md,
  arch-review-ds.md,arch-out/arch-scan.json}+docs/audits/
  2026-08-30_ds-supplement-arch-review.md
- 修复批:scripts/audits/f-arch-gate1-ds.md(门一)+f-arch-batch-verify
  .raw.txt+f-arch-batch-e2e.raw.txt(收口亲验)
- 台账:docs/audits/audit0-findings.md(§一 各票状态已翻新+修复批收口段)
