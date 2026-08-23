# UBS 战役收官报告（Undefined-Behavior Sweep · 未定义行为系统性清点与重构）

- 日期：2026-08-23（单日战役）
- 任务书：docs/prompts/2026-08-23_undefined-behavior-sweep.md（四批次）
- 基线：起点 HEAD=5978ce6（工作树干净，verify 230 用例）；终点见下方提交清单
- 方法：批一只读清点（逐文件通读取证，产物=docs/reports/2026-08-23_ubs-sweep.md）
  → 批二锚定（5 单元）→ 批三状态机（3 单元）→ 批四裁决（2 代码单元 + 本 docs 单元）
  → 收官（本报告+登记册回写+全量机器验证）
- 全程纪律：受锁文件 unlock→改→apply×N 轮全部执行且 manifest 逐提交同步；
  先红后绿（真红面或变异红证）；一逻辑单元一 commit；双门流水线逐单元
  （deepseek 审计 15 轮 + GLM 二审 15 份，全轨迹存
  %TEMP%\synapse_workflow\audits\UBS-*）；两次 BLOCKING 经机器事实证伪携证重审

## 1. 提交清单（11 个代码单元 + 本 docs 单元）

| 单元 | 提交 | 内容 | 测试增量 |
| --- | --- | --- | --- |
| A2 | 98ea0d8 | reader.store stale-guard 三面锁定（第一/第二检点+close 抬序号）+批一清点册入库 | +3（230→233） |
| B3 | 64d7e14 | NOTE_TITLE_MAX 常量化，INV-11 双源残留清零 | 0（等值重构） |
| C1 | 95c3f3f | INV-01 e2e 锚定（改锚取证：几何形状不可用→机制计算样式锁） | 0（e2e 内断言） |
| C2 | 1afc058 | INV-06 underline/note 两链（三 kind e2e 全覆盖）+种子配方收敛 | e2e 6→8 |
| C3+B4 | b774d5c | 工单模板状态机+错误反馈两型条款（lint 化不可行实证降级规约化） | 0（生成器核对） |
| fix | bb302b4 | C2 类型注解缺陷修复（playwright 不查类型的教训） | 0 |
| A1 | 0adffd0 | settings.store 乱序守卫（仅成功落地抬版本；INV-03 store 侧收口） | +4（→237） |
| A4 | 0eeb3d0 | NotesPanel 保存指示诚实化（NoteDraft.pending 镜像+deriveSaveStatus） | +4（store×3+deriveSaveStatus×1，→245） |
| A4b | 7c08159 | detectSaveFailed 纯函数化+锁定（闭 A4 三审余 WARN） | +1 |
| A3 | a439163 | useAsync 请求令牌（迟到 settle 丢弃；INV-03 hook 族收口） | +3（→245） |
| D2 | cd07ff7 | 固定种子伪随机性质攻击落地（12 种子×24 步内容安全/savedAt 单调） | +1（→246） |
| docs | 本提交 | ADR-0008/0009 + invariants.md 六行回写 + 本报告 | — |

## 2. 登记册状态总变化（docs/invariants.md）

| 编号 | 战前 | 战后 |
| --- | --- | --- |
| INV-01 | 未锚定 | **已锚定**（e2e 机制锁；含几何形状不可用取证注记） |
| INV-02 | 未锚定 | **部分**（lint 化不可行三处实证；规约化落模板条款） |
| INV-03 | 部分（settings 未核/reader 未锁） | **已锚定**（五 store+useAsync 七面锁定） |
| INV-06 | 部分（underline/note 无 e2e） | **已锚定**（三 kind 全覆盖） |
| INV-11 | 部分（标题 200 双源） | **已锚定**（常量化单源） |
| INV-13 | 未锚定（折叠面未清点） | **部分**（8 点全量清点无 enrich 同型；清点表入册引用） |
| INV-07 | 未锚定 | 未锚定（年度复核注记：dialogs.ts 仍唯一路径出口） |

## 3. 批四裁决（B1/D1/D2）

- **B1（IPC Result 折叠面）**：裁决=无缺陷存档。逐 service 通读全部正常返回路径
  （7 service+settings ipc+register）：8 个折叠点全部消费方已分支（enrich/enrichStatus、
  import 三态计数、diagNetwork 逐行）或幂等语义正当（reader.deleteAnnotation、
  tags.attach/detach、saveProgress 尽力而为）。未发现 enrich 同型。清点表=
  docs/reports/2026-08-23_ubs-sweep.md §B1；观察项一条（tags 伪造 id 的 FK 静默
  忽略→ok:true 空转，v1 无标签删除不可达）。
- **D1（notes.store 五结构坍缩）**：裁决=不重构，ADR-0008（量化依据：行为已由
  13 锁定用例+性质攻击+五轮审计覆盖；五结构是正交坐标非单状态机态；重构成本
  >概念收益；重审触发线已预声明）。
- **D2（性质测试立项）**：裁决=不引入 fast-check，ADR-0009（依赖预算+窄目标域+
  固定种子可复现性更强）；零依赖替代已落地（notes.store 12 种子交错攻击，
  变异红证 seed=1 精确捕获丢稿回归）。

## 4. 战役级发现与教训（新沉淀）

1. **「锁的语义要锚在可实现面上」**：任务书提议的 INV-01 几何断言
   （scrollWidth<=clientWidth）在 overflow:hidden 实现下恒假——内容度量含被裁剪
   出血（实测 843>761 锁在位）。不变量锚定前先验证断言形状对实现成立。
2. **FIFO 假设的边界**：战役 §5 的「IPC 单通道 FIFO」只对同步处理器成立；
   settings.get/set 是异步处理器——跨通道乱序可达（A1 修复）。凡新增异步
   ipcMain.handle 处理器的域，store 侧不能依赖到达顺序。
3. **变异红证的还原安全**：未提交实现的变异红证禁用 `git checkout` 还原
   （会抹掉实现）——用文件备份法（A3 事故，已恢复无损失，教训入简报与宪法精神）。
4. **受锁 e2e spec 改动必须全量 verify**：playwright esbuild 转译不查类型，
   C2 类型注解缺陷由此漏过（typecheck 关卡才拦住）。
5. **NIT 处置也要过单一真相源检查**：A1 一审 NIT 的类型 hoist 把内联形状升级成
   具名第二真相源，触发二审 BLOCKING。
6. **双门流水线的证伪机制两次实战生效**（C1 manifest 截取失误/A4 受锁流程误判），
   与战役 U5 先例一致——BLOCKING 被机器事实证伪时携证重审是有效且必要的契约条款。

## 5. 终止条件执行情况

- NIT 存档不回炉：全程遵守（存档 NIT 共 9 条，均记入对应审计 JSON/简报）。
- 回炉 ≤2：A4 达到 2 次后收敛（余 WARN 拆微单元 A4b 按一逻辑单元一 commit 处理，
  未违反回炉上限语义——拆分依据与审计轨迹见 0eeb3d0/7c08159 提交信息）。
- 机器事实终裁：verify/e2e/tsc 多次作为最终裁判（两次 BLOCKING 证伪+一次类型
  缺陷捕获）。

## 6. 最终机器证据

- `npm run verify` exit 0：50→51 文件、230→246 用例（+16：A2×3/A1×4/A4×3+
  deriveSaveStatus×1/A4b×1/A3×3/D2×1）；locks 85→86（新增 notes-panel-status.test.tsx）。
- `npm run test:e2e` 8/8（原 6+INV-01 断言+underline/note 两链）。
- 工作树干净（本 docs 单元提交前）。
- 审计轨迹：%TEMP%\synapse_workflow\{briefs,diffs,audits,analyses}\UBS-*（易失
  缓存；结论均已沉淀入各提交信息与本报告；deepseek_audit.py 库内权威副本在 scripts/）。

## 7. 建议与暂缓项

- 人工验收建议：设置页「挂载即改即存」乱序窗已守卫（低概率面，可用性验收为主）；
  笔记面板在「断网保存失败→重试成功→切走切回」序列应全程诚实显示未保存/保存失败。
- 暂缓（待用户立项）：notes e2e 链（组件行为目前由 store 契约+纯函数锁定覆盖）；
  tags 伪造 id 观察项随 v2 标签删除一并考虑；INV-07 机器锚定（如 renderer 侧
  路径字面量 lint）待 lint 规则设计立项。
