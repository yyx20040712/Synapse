# deepseek 补审 + 架构系统性排查报告(2026-08-30 下午场)

> 用户令:①同意 F-A1/F-L1-C 补 deepseek 一审(v11 §3 回溯面)②对当前架构
> 系统性排查避免屎山③「一定要调用 deepseek 辅助审查,本机 zcode 有配置」。
> 本场零产品代码改动(体检场纪律:只登记不修),全部发现登记台账开票。
> deepseek 通道:zcode v2 config 自定义 provider(deepseek-v4-flash,OpenAI
> 兼容 API)——行内调用器 `scripts/audits/ds-call.mjs`(形态②,密钥不落盘;
> 推理模型特性=reasoning_content 独立字段,坑在 §4)。

## 0. 开工记录

技能清点:verification-before-completion 用/code-review-excellence 用
(门审口径)/systematic-debugging 不用(只登记不修)/webapp-testing 不用
(无 UI 面)/subagent-driven-development 不用(deepseek=API 行内调用)。
配置自查:主控 GLM-5.3 max;deepseek-v4-flash;Node 24 口径。

## 1. F-A1 deepseek 补审(材料=票面+diff+实现报告;不给同基座报告保持视角独立)

产物:`scripts/audits/f-a1-gate1-ds.md`。**B 级零**;W 级 8 条主控逐条处置:

| 条 | deepseek 发现 | 主控核验 | 处置 |
| --- | --- | --- | --- |
| W1 | fixture 头注「行距 24<行盒 25.6→负间隙」与 24pt=32px 换算矛盾 | **实锤**:头注把 PDF 用户空间单位当 px;实际正间隙 +6.4px,T4(行间钳制)e2e 锚缺席 | 开票修 fixture(行距改 ≤19.2pt 产生真负间隙)+头注修正 |
| W2 | lowerMedian 对 NaN 未防御→style.top='NaN%' 静默视觉缺失 | 成立(边界) | 备案:mergeRects 入口非有限值过滤 |
| W3 | 挂 A 空数组调用方判空未见 | **消解**:AnnotationLayer:104 `length>0`+SelectionLayer:213 `.map` 空安全 | 闭 |
| W4 | 聚类不按 page 隔离,混页脏数据并簇 | 成立(低概率) | 备案:头注明示单页约束 |
| W5 | W_MIN 严格大于滤除恰 1px@612pt 实体块 | 成立(工程取舍) | 备案:头注写「≤1px 视为零宽」 |
| W6/W7 | 组件断言耦合 F-11 收边/浮点等于边界无锁定用例 | 成立 | 备案 |
| W8 | annotation-anchor 476 行近红线 | AUDIT-A 已在档(475→476) | 并入 F-ARCH4 |

## 2. F-L1-C deepseek 补审(两轮:第二轮用最终合入 diff)

产物:`f-l1c-gate1-ds.md`+`f-l1c-gate1-ds-round2.md`+`f-l1c-gate1-final.diff`。

- **第一轮 B1(重磅)**:「呈现 diff 与回炉后状态不一致」——主控核验:
  **代码已含回炉**(dx 五档/主动 scrollTop 在 HEAD 实证),diff 快照是
  门一时点(回炉前)=**取证归档缺陷**非代码缺陷;已按 deepseek 要求生成
  最终 diff(7cbd52ef..1436a462)二轮重审,B1 消解。归档缺陷登记 §4。
- 二轮结论:B 零新增;**W2(FO 交互盒 130px 分离不保证→短标签密集处
  wheel 可能命中错标签)/W4(padding 2px→3 行实为 2.7 行,CSS 实证
  33.05<37.05)/新 3.3(截断标签滚到边界后继续滚仍吞 zoom,无余量放行)**
  三条成立开备案票;W3(fit 盒估宽<FO 宽)/W1(best-effort 回退无告警)
  弱成立备案;W5 消解降 N;N1~N5 备案(N2 dx 差 2px/N5 测试 cwd 依赖)。
- 安全面五条在档(wheel 时序/空 label/确定性/fit 兼容/单委托性能)。

## 3. 架构系统性排查(机器面+异基座面)

机器面:`scripts/audits/arch-scan.mjs`→`arch-out/arch-scan.json`(167 文件):
行数红线全过(唯一 >450=annotation-anchor 476)/分层值导入零违例/零孤儿/
零三重复/类型跨侧 2 疑点=同名误报/ ipc 11 环=真环但 import type 回边
(运行时无环)/churn Top=ReaderPage 20 次/45d(schemas 17/App 15)。

异基座面:`scripts/audits/arch-review-ds.md`(材料=架构文档+不变量册 46
INV+扫描结果+ReaderPage/reader.store 全文)。**三条 B 级实锤,主控全部
核验确认**,登记 F-ARCH1~3;W/N 级处置见台账。

### 三实锤摘要(完整机制链见 arch-review-ds.md)

1. **F-ARCH1 [B] closeOne 残留 scrollRequest**:reader.store closeOne
   (195-212)清了 tabLoadSeq/inflightOpen/撤销栈/tabs/order/activeId 但
   **不清 scrollRequest**(closeAll 走全量复位无此问题——单路径残留);
   消费方过滤只有 paperId 维度→「程序跳页→手动滚→关 tab→重开同 id」
   四步自然操作即回跳旧页。INV-29 缺 tab 生命周期维度。
2. **F-ARCH2 [B] undo apply 覆盖并发编辑**:undo()(412)整体列表替换,
   await runUndo 窗口内的新增标注在 store 视图消失(DB 在)。INV-23 的
   busy 互斥只覆盖 undo vs undo,未登记 undo vs 普通编辑。
3. **F-ARCH3 [B→重构票] ReaderPage 声明漂移**:头注「只装配」但
   pageTexts/pageRoots/handlePageRender/dropPageState/PageFrame 缓存编排
   五件套仍在(81-197);8 职责叠放+20 次 churn=屎山形成机制在跑。拆分线
   =PagesOverlay 下沉(deepseek 给了具体方案)。

### deepseek 总评(在档引用)

「治理框架异常完备,但框架正在制造新型屎山:行为登记高度依赖人写注释/
不变量册,机器强制面集中在静态结构,动态时序接缝的登记滞后于代码演化。
漂移模式统一:不变量册描述行为契约,但契约的边界条件(何时失效/清空)
往往缺失。」——修复顺序建议:B1(一行+一测)→B2(小改)→ipc 消环(1 人时
专项)→PagesOverlay 拆分(测试护航)→anchor 拆件。

## 4. 流程与取证坑(入档)

1. **推理模型响应形态**:deepseek-v4-flash=reasoning_content 独立字段,
   max_tokens 须覆盖推理+正文(512 全被推理吃掉→content 空);调用器已
   双读+告警。
2. **gate1.diff 归档时点缺陷**:F-L1-C 门一 diff 是回炉前快照——宪法
   「受锁文件改动即时同步」精神应延伸:门一 diff 在回炉落地后须重生成
   为最终版(本场已补 final.diff,后续场次照此)。
3. Git Bash /tmp 在 node 内解析为 E:\tmp——跨工具传文件用 os.tmpdir()。

## 5. 后续执行序(接 v11 §4)

F-ARCH1(一行+一测,立即)/F-ARCH2(小改+跨格序列测)→F-A1 补审票
(fixture 单位)→F-ARCH5(ipc 消环,冻结窗口)→F-ARCH3(PagesOverlay
拆分)→F-ARCH4(anchor 拆件)→F-A3 选择模式票(门一 deepseek=新规
首发)→AUDIT-C 竞态批(F-ARCH1/2 已先行消化两项)→B/D/E。
