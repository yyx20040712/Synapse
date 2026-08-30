# 2026-08-30 LOOP 交接文档 v14——F-A3 选择模式+F-L2 修复双闭环

> 背景:v13 交接后用户令「基于此开发」。本场按 v13 §2 执行序连打两票:
> **F-A3 选择模式票(三屋+回炉 1)→ F-L2 修复票(三屋+回炉 1,前置实测
> 定向修法并扩面 wheel/pan)**。基线:verify **115 文件 963 用例**全绿 /
> locks **193** / e2e **29/29**。两笔提交:adf6d2221(F-A3)/
> 19cf29b3d(F-L2)。

## 0. 开工纪律(下场执行前必读)

- 会话开工先做技能清点(AGENTS 宪法第一条)+配置自查;**Node 24 口径**
  (`export PATH="/d/nodejs24:$PATH"` 前缀一切命令——本机默认 v25 必红)。
- deepseek 门一调用器 `scripts/audits/ds-call.mjs`;材料包范式=票面+报告
  +diff 全文+**证据关键段原文内嵌**(v13 教训已兑现);**首调可能因推理
  耗尽 token 预算截断**——输出纪律尾注+重调(本场 F-A3 实录);ds-call
  可改进:finish_reason 落盘。
- 红线:体检场只登记不修;修复走票;用户反馈=最高优先级。
- git geometric-repack「File exists」噪声持续在档(提交完好,cat-file
  验证过);staging 永远显式列文件(f1-out/*.png 残留仍未扫入)。
- **证据文件命名先查在档**(本场事故):派单简报指定证据文件名前必须
  `git ls-files` 核对——f-l2-closeout-verify.raw.txt(排查票证据)曾被
  简报指名覆盖,主控 git checkout 定向恢复+新日志改 f-l2-fix-* 前缀。

## 1. 现状快照(2026-08-30 v14 场收口后)

| 项 | 状态 |
| --- | --- |
| F-A3 选择模式 | **已闭环**——待用户复测观感(工具栏「选择模式」按钮:开启后标注块上可直接划选=F-A2 根治;标注暂不可点) |
| F-A2 工具条不弹 | **联动兑现实证**(真机 A/B 同点位对照:常规 selLen=0 vs 选择 selLen=81+保存成功) |
| F-L2 适应视图出视口 | **已闭环**——待用户复测(大档 UI 缩放下「适应视图」全节点入视口;wheel 锚/pan 手感同修) |
| F-L3 保存链滚动漂移 | **新登记待排查**(保存高亮后滚动位漂 2142px;候选源=Playwright scrollIntoView 或保存链程序滚动) |
| 档位切换不自动 refit | 新备案小票候选(SET1 换档后需手动点「适应视图」;候选修法=uiScale 变化→resetFit) |
| F-ARCH4-M1 副产 | 存量缺口登记(e2e 反向选区覆盖,低优先) |
| F-L1-C 备案三条 | W2 交互盒/W4 padding/3.3 滚动边界(择机) |
| 对偶矩阵 | 5 对闭环剩 6 对(台账 §四) |
| 台账 | docs/audits/audit0-findings.md(全场唯一发现登记处;F-A3/F-A2/F-L2 已翻,F-L3 新增) |

## 2. 下一场执行序

1. **用户复测回收优先**:F-A3 选择模式观感/F-L2 三档 fit(用户肉眼终裁
   权保留);回收反馈按最高优先级开票;
2. 小票批择机:档位切换 auto-refit(半小时级)/F-L1-C 备案三条/
   F-ARCH4-M1(e2e 反向选区);
3. **AUDIT-C 竞态批**→B 对偶→D 数据→E 性能→遗留池(F-G7 SettingsPage
   拆件预警/F-G2 复评销账/F-L3 排查/F-A3 备案组 N3/N5/N6);
4. reader 侧同型量测面备案触发条件:用户报告 SET1 档位下阅读器几何异常
   (PDF 列反向补偿在档自洽,未主动排查)。

## 3. 本场工具与流程资产(下场直接复用)

- **前置实测范式**(f-l2-precheck.mjs):修票前 10 分钟探针答「口径三
  问」,把票面从候选修法(二选一)变成实证定向修法——v13 的「排查票与
  修票分离」可按此并入修票前置段(省一整轮排查票)。
- **A/B 同点位同距离唯一变量=模式**的探针实验设计(f-a3-verify.mjs
  场景 A/B);hitTest/计算样式全量采样诊断段。
- **可选字段形态**作为受锁夹具 typecheck 兼容第三路:必填+改锁 vs
  可选+`?? false` 兜底——8 文件受锁面时取可选(F-A3 自裁 1,门一预裁
  维持;生产单源 makeLoadingTab 显式置值)。
- **jsdom 不可达断言的替代锁**:pointer-events 是 hit-test 面,jsdom
  程序化 click 不走——onClick 守卫(程序化派发兜底,真浏览器
  HTMLElement.click() 同样绕过 pointer-events)+真机 hitTest 诊断。
- 门一材料包生成纪律不变(diff 生成前 git add -N 新件、零 add 跟踪件);
  **生成后 --stat 与 git status 对账**(本场曾混入撞名 hunk 3078
  deletions,r2 净版重生成)。

## 4. 成本与流程如实账

- F-A3:实现者 11.27M tokens/119 工具/30.7m+回炉 5.27M/31 工具/4.3m;
  门一 deepseek 3 调(首调截断+重调+r2 复核);门二 567K/21 工具/3.9m。
- F-L2:前置实测主控直做(precheck 探针);实现者 2.44M/43 工具/11.4m;
  回炉代理(原实现者不可续命,新代理承接)1.12M/32 工具/7.2m;门一
  deepseek 2 调;门二 469K/28 工具/4.5m。
- 两票均走满三屋+回炉 1;F-A3 真机三场景+F-L2 真机 14 断言全 PASS。
- 事故 1 起(证据撞名覆盖)——主控简报缺陷担责,恢复+改名+披露在提交
  信息与台账;门二专项核对 PASS。

## 5. 方法论资产

1. **deepseek 行内调用截断处置**:首调输出仅 1.9KB 断句=推理耗尽
   max_tokens 预算——材料包尾追加「输出纪律」段重调即全;判断特征=
   统计行声明 N 条但正文缺 N 与总评。
2. **测复位口先推演 setState 同值 bail**(F-L2 实录):resetFit 在
   userInteracted 已 false 时 setState(false)=React bail 不重触发——
   探针测「复位/重触发」类行为必须先制造可复位态(wheel 置位);precheck
   的三档 transform 恒同 k 实为 mount-fit 伪复测,基线比较不可用。
3. **数值断言先核一手数据**(v13 教训再证):门一对「clientWidth=本地
   口径」的质疑全靠 precheck JSON 原文内嵌消解——材料包内嵌证据原文
   是异基座审查的生命线。
4. **同源污染面主动扩票**(F-L2 实录):排查根因(fit 量测)时前置实测
   发现同机制第二/第三消费点(wheel 锚/pan 增量)——同文件同 helper
   的小增量当场并入,好过用户下一轮反馈「拖拽手感不对」再开票。
5. **受锁测试兼容的可选 props 先例**(F-A3):ReaderToolbar 缺席回调=
   可点无操作而非 disabled——因受锁视觉测试直植渲染;与 onFitWidth
   「缺席=禁用」并存说明先例不唯一,头注如实声明即可。

## 6. 档案索引

- F-A3:scripts/audits/f-a3-{ticket,impl.report,gate1-ds,gate1-r2-ds,
  gate2-report}.md+gate1{,-r2}.diff+raw ×21+out/{f-a3-verify.json,
  f-a3-final-state.png};提交 adf6d2221
- F-L2:scripts/audits/f-l2-{precheck,fix-verify}.mjs+{ticket,impl.
  report,gate1-ds,gate1-r2-ds,gate2-report}.md+gate1{,-r2}.diff+raw
  ×16+out/{f-l2-precheck,f-l2-fix-verify}.json;提交 19cf29b3d
- INV-42(F-A3 选择模式)/INV-43(F-L2 视口坐标系)登记
  docs/invariants.md
- 台账:docs/audits/audit0-findings.md(F-A3/F-A2/F-L2 翻已闭环+
  F-L3 新登记+备案组扩三条)
