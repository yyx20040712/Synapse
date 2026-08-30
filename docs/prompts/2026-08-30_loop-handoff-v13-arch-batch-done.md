# 2026-08-30 LOOP 交接文档 v13——架构批收官(F-ARCH3/4 双拆件)+F-L2 根因实证

> 背景:v12 交接后用户令「基于此开发」。本场按 v12 §2 执行序连打三票:
> **F-ARCH3 PagesOverlay 下沉(三屋全流程)→ F-ARCH4 anchor 拆件(三屋
> 全流程)→ F-L2 排查(主控探针实证,初判推翻)**。基线:verify **113 文件
> 948 用例**全绿 / locks **188** / e2e **29/29**。三笔提交:52c738517
> (ARCH3)/28d83fca8(ARCH4)/b82cd770c(F-L2)。

## 0. 开工纪律(下场执行前必读)

- 会话开工先做技能清点(AGENTS 宪法第一条)+配置自查;**Node 24 口径**
  (`export PATH="/d/nodejs24:$PATH"` 前缀一切命令——本机默认 v25 必红)。
- deepseek 门一调用器 `scripts/audits/ds-call.mjs` 制度化在档;材料包
  范式=f-arch3/f-arch4-gate1-prompt.txt(**任务+预裁声明+证据路径+票面
  +实现报告+diff 全文内嵌**)。
- 红线:体检场只登记不修;修复走票;用户反馈=最高优先级。
- 环境观察:git 提交时 geometric-repack 连续三次报「pack renaming
  failed: File exists」(并发维护任务冲突,提交本身完好,cat-file 验证
  过)——不影响功能,如持续可 `git maintenance stop` 或忽略。

## 1. 现状快照(2026-08-30 v13 场收口后)

| 项 | 状态 |
| --- | --- |
| F-ARCH3 ReaderPage 拆分 | **已闭环**(PagesOverlay 122 行持缓存注册表七件逐行迁入;ReaderPage 249→197;门一 0B/4W 回炉双 ADDRESSED;INV-30 宿主随迁同步) |
| F-ARCH4 anchor 拆件 | **已闭环**(anchor-serialize 187 行收锚定格式与校验六件;anchor 476→339 脱离红线边缘;消费方+受锁测试改向真源;INV-40 不动) |
| F-L2 适应视图节点出视口 | **已定位待开票**(根因实证:CSS zoom 污染 fitViewport 量测——**非**包围盒漏节点,初判推翻;修法方向在档) |
| F-A1/F-L1-C/F-ARCH1/2/5 | 已闭环(v12 在档) |
| F-A2 工具条不弹 | 定性闭环(联动 F-A3) |
| F-A3 选择模式按钮 | **可开票(下场首选)**——修法定向:选择模式标注层 pointer-events 全关+模式切换 UI;**状态机前置**(宪法:store+异步+用户输入) |
| F-ARCH4-M1 副产 | 存量缺口登记:selectionToAnchor 的 root.contains 防线 jsdom 不可达(真浏览器可达性未锚,低优先 e2e 反向选区覆盖票) |
| 对偶矩阵 | 5 对闭环剩 6 对(台账 §四) |
| 台账 | docs/audits/audit0-findings.md(全场唯一发现登记处) |

## 2. 下一场执行序

1. **F-A3 选择模式票**(功能票:选择模式标注层 pointer-events 全关+模式
   切换 UI——F-A2 根治+用户原始建议;门一 deepseek;**票面前置态空间表**
   :模式态×标注层交互×工具条三面矩阵);
2. **F-L2 修复票**(根因与修法在档:量测改不随 zoom 口径——clientWidth
   或 zoom 归一,修票时实测 Chromium zoom 下 clientWidth 行为;对偶面
   SET1 三档×fit 互检);
3. F-L1-C 备案三条择机(W2 交互盒/W4 padding/3.3 滚动边界);
4. F-ARCH4-M1 副产票(低优先:e2e 反向选区覆盖);
5. AUDIT-C 竞态批→B 对偶→D 数据→E 性能→遗留池(F-G7 SettingsPage
   拆件预警/F-G2 复评销账)。

## 3. 本场工具与流程资产(下场直接复用)

- **f-l2-probe.mjs**:排查范式样板(真实库副本 freshUserData+sqlite 注入
  +Electron launch+几何 dump+**本地数学反推**——transform/svg/节点/标签
  四源齐采,除 k 归一重建 fitViewport 盒,自洽性比对定位量测污染)。
- **纯重构票 TDD 形态**(两票实证):新组件=组件测试先行红;拆件=受锁
  测试 import 改向先行红;变异红证转为「咬合证明」(防测试仍咬旧路径/
  旧残留假绿)+静态咬合(grep 零残留+符号集合等价)。
- **门一材料包改进方向**(本场 W 类教训):证据文件**原文应内嵌**材料包
  (只给路径=审计者无法自证——F-ARCH4 的 M1 诊断 deepseek 因只见转述而
  合理存疑,主控亲验补位;下场证据关键段直接贴 prompt)。

## 4. 成本与流程如实账

- F-ARCH3:实现者子代理 3.77M tokens/63 工具/17.4m+回炉 1.30M/2.9m;
  门一 deepseek×2(主审+回炉复核);门二 480K/3.6m。
- F-ARCH4:实现者 3.61M/67 工具/15.4m+回炉 654K/1.9m;门一 deepseek×2;
  门二 965K/6.3m。
- F-L2:主控直做(探针编写+运行+数学反推)——排查票取证密集,无实现面。
- 两重构票均走满三屋(实现者 TDD+门一异基座+回炉+门二),F-L2 排查票
  主控直做符合「体检场只登记不修」红线。

## 5. 方法论资产

1. **变异点设计须核测试环境可达性**(F-ARCH4 M1 实录):票面预设变异
   「摘 root.contains」在 jsdom 结构性不可达——Selection.addRange 把
   反向 range 规范化为 collapsed(isCollapsed 先兜),防线执行不到;
   替代变异 M1'(start+1)达成咬合意图。教训:**设计变异点前先推演
   「该变异在该测试环境(含 jsdom 与真浏览器差异)下是否可达」**,
   不可达=换点,别硬跑。
2. **数值断言先除干净再比对**(F-L2 实录):渲染 rect 含 svg transform
   k 与 CSS zoom 双重缩放——反推必须全除(漏除 zoom 导致「档值对不上」
   的第一重误读,除净后 325/275=260/220×1.25 一击定音)。
3. **接缝归责的字面精确**(F-ARCH3/4 头注同步实录):拆件后消费方头注
   的「模块.符号」引用会失真(假边),双源消费(直调+间接)须拆述,
   以偏概全的「只经 X 调用」会被门一/门二捉。
4. git Bash 控制台中文乱码≠存储乱码:git log 回显乱码时用 node 读
  UTF-8 验证(FFFD 计数=0 即存储完好),勿误判返工。

## 6. 档案索引

- F-ARCH3:scripts/audits/f-arch3-{ticket,impl.report,gate1-ds,
  gate1-r2-ds}.md+gate1.diff+证据 .raw.txt×12;提交 52c738517
- F-ARCH4:scripts/audits/f-arch4-{ticket,impl.report,gate1-ds,
  gate1-r2-ds}.md+gate1.diff+证据 .raw.txt×13(含 m1-diagnosis);
  提交 28d83fca8
- F-L2:scripts/audits/f-l2-probe.mjs+f-l2-out/{probe.json,
  probe-fitview.png}+closeout-verify.raw.txt;提交 b82cd770c
- 台账:docs/audits/audit0-findings.md(F-ARCH3/4 翻已闭环+F-L2 翻
  已定位待开票+存量缺口两条新登记)
