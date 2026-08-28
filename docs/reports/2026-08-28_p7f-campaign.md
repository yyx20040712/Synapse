# P7-F 战役报告（2026-08-28）

> 范围：P7-F 连续滚动阅读全役四单（SR2-F-01~04）+ 工单化 + 收官 e2e。
> 前置基线：verify 679 用例/91 文件 + e2e 20/20 + locks 139（P7-B 缺陷②修复后、
> F-01 开工前）；PageCanvas 逐页翻页模型（方案切换=旧方案删除）。
> 终态基线：**verify exit 0（93 文件 723 用例）+ e2e 22 过+0 skip（翻 done 后
> 常规跑；F-04 收官链取证=spec 备份法 22/22 exit 0）+ locks 142 + 工单 110
> open 0（F-04 翻 done 推演）**；INV-29/30/31/32/33 全锚定。
> 模型裁决：连续滚动（用户 plan 门拍板「保持连续滚动」，2026-08-27）；
> 全长真实占位（非虚拟滚动——总高确定，进度/锚定几何可算）。

## 1. 交付清单（四票链完整性）

| 单元 | 提交 | 要点 |
| --- | --- | --- |
| 工单化（四张票面） | 62d84bb | 五层规约+状态机前置表；p7f-ticketing 双门（r2 收敛）；F-01~04 依赖序=页列→四层→滚动进度→缩放收官；机检兼容自查 v2 |
| SR2-F-01 页列几何与懒渲染回收 | f20c2fd | PageColumn 五段（就绪管线/占位盒/IO 懒渲染窗口±1+回收窗±2/层实例化分工/双源 setPage{to\|none}）；PdfCanvas 拆分删除=PdfDocProvider+PdfPageCanvas（方案切换红线）；INV-16 白名单迁移；INV-29/30 登记 |
| SR2-F-02 四层多页化收口与跳页兼容 | 31b3a07 | SelectionLayer 动态锚定根（closestPageRoot）；跨页选区拒绝（toast）；anchor-locate 页限定（防邻页文本层误验证）；:69-86 签名零触碰=F-aware 冻结面 |
| SR2-F-03 滚动进度回写恢复与键位迁移 | aba9da0 | scroll-progress 六态状态机（idle/scrolling/pending/writing/restoring/loading；时间全注入）；键位迁移（四键=滚动步 0.9 屏+空格，preventDefault 语义反转）；N4 SelectionLayer 挂载盒稳定化；INV-31/32 登记 |
| SR2-F-04 缩放重定义与收官 e2e | （本提交——主控收口） | page-column-geometry 拆分（250 行预裁预案落地：纯函数搬移+组件留装配）；anchoredScrollTop/columnTotalHeight 缩放中心锚（段⑥布局效应程序修正）；fit-width 分母=列宽基准（onReady 载荷单源）；reader-scroll.spec 收官全链（INV-01/键位/缩放锚+ctrl+wheel 段迁移/fit/标注原位/离屏回收/进度恢复）；INV-33 登记 |

依赖链兑现：F-01（几何模型）→F-02（选区/定位多页化）→F-03（状态机+键位）→
F-04（缩放语义+全链收官）——每票消费前票接口（scrollRequest/nearestPage/
onReady），无回溯改约；F-aware 冻结面（anchor-locate 签名/ReaderToolbar
props）两票零触碰。

## 2. 验收四项对照（ROADMAP P7-F 验收行）

- 离屏回收断言（视口外页 canvas 数上限）→ 组件级=page-column.test 渲染集
  上界+快速滚动回收用例；e2e 级=reader-scroll.spec 收官链 canvas 计数 ≤5
  断言（6 页文档滚底稳态）✅（INV-30）
- 进度回写/恢复 e2e → reader-text.spec F-03 批 3（滚动→关→重开=记忆页）+
  reader-scroll.spec 收官链尾（底部中心页记账→flush→重开滚回）双锚 ✅（INV-31）
- 既有标注重开原位用例全量兼容 → reader-text.spec 标注链两用例（重开原位
  位置断言±2px/下划线/备注）F-01~04 全程绿（F-02 门一并入 N4 工具条不闪收）；
  收官链标注原位抽验=色块落所属页盒内 ✅
- 翻页键位语义迁移纳入 keymap 映射表锁定用例 → ReaderShortcuts
  PAGE_KEYS 四键=容器滚动步（SCROLL_STEP_RATIO 单源）锁定用例+e2e PageDown
  0.9 屏断言（收官链第二组）✅
- **用户走查**（滚动阅读体验视检——战役最终验收人=用户）：留用户，建议
  走查面=连续滚动跟手度/缩放中心不跳/fit-width 贴合/长文献内存（任务管理器
  观察 canvas 回收）

## 3. 双门战绩（全役）

- F-01：门一 0B/4W+N（回炉 W2 就绪 catch/W3 卸载哨双删=行为面回炉 1 轮）→
  门二 PASS；主控收口前置两件（registry file 迁移+头注压缩 256→239）。
- F-02：门一 0B/3W/5N 有条件通过（W1=registry 取证擦边→methodology §4.1
  补条款「取证禁触 tickets/，e2e 取证用 spec 备份法」——流程遗产）→门二 PASS。
- F-03：门一 0B/3W/4N（W1 339 行=简报笔误裁量；W3 PageColumn 245 行挤压
  预警→F-04 预置拆分预案——本票兑现）→门二 PASS 无回炉项。
- F-04：门一 **0B/0W/5N（全役唯一零警告票）**→门二 **PASS 0B/0W/2N+战役收官
  判定成立**；零回炉。门一 N1（canvas≤5 偏宽，6 页稳态实算 3——收紧 ≤4
  候选留后续）/N4（onVisibleChange prop 生产零消费——F-02 锚定页通道备而
  未用，后续单消费或删）记本报告存档。
- 回炉均在契约内（每票 ≤2 轮，无振荡链）。

## 4. 防线与不变量

- INV-29（程序跳页/滚动回写双源）/INV-30（canvas=渲染窗口绑定）/INV-31
  （进度回写=视口中心最近页）/INV-32（程序滚动用户接管）随 F-01/03 登记；
  **INV-33（缩放中心保持+fit-width 列宽基准）随 F-04 登记**——五不变量全
  「已锚定」（单测级全量+e2e 级收官链）。
- locks 139→142（page-column.test/selection-layer.test/scroll-progress.test
  入锁；F-04 无新增受锁路径——reader-scroll.spec 骨架期已入锁）。
- 机检拦截实录全役（主控续填：F-04 段——tsc 拦 e2e 类型缺陷 NodeListOf
  迭代器（Array.from 处置）/组件行数 251→250 压缩（ReaderPage F-04 头注
  单行化）/其余各票见各 impl.report）。

## 5. 成本账本（主控续填）

| 单元 | 实现者 | 门一 | 门二 | 回炉 | 小计 |
| --- | --- | --- | --- | --- | --- |
| 工单化 | 主控直做（票面/修票/物化） | ≈1.07M/15.7min | ≈1.11M/15.8min（+r2 复核 ≈0.30M/5.7min+地图测绘 ≈0.66M/4.9min） | 票面 v1→v2.1 一轮 | 子代理 ≈3.14M tok/42.1min |
| F-01 | ≈21.27M tok/75.4min（两轮） | ≈0.74M/12.3min | ≈0.65M/5.9min | 含实现者两轮 | ≈22.66M tok/94min |
| F-02 | ≈11.48M tok/38.5min | ≈0.63M/5.3min | ≈0.73M/2.8min | 0 | ≈12.84M tok/46.6min |
| F-03 | ≈13.20M tok/62.9min | ≈0.81M/6.7min | ≈0.80M/8.5min | 0 | ≈14.81M tok/78min |
| F-04 | ≈8.78M tok/29.2min | ≈0.52M/5.2min | ≈0.77M/10.2min | 0 | ≈10.07M tok/44.6min |
| 战役累计 | — | — | — | — | **≈63.52M tok/305min（子代理口径;门二预估 50~90M 落区间中部）** |

## 6. 新教训（本役新增）

- **spec 备份法=取证正道**（F-02 W1 流程化后全程零再犯）：e2e 守卫取证
  一律备份 spec→临改守卫→跑→还原（sha 双佐证），禁触 tickets/registry。
- **组件 250 行是挤压预警不是配额**：F-03 门一 W3 预警→F-04 预置拆分预案
  →本票兑现（page-column-geometry 纯函数件）——「预裁拆分」模式=头注先
  拆段注释、几何纯函数归位单文件、组件留装配。
- **e2e 受锁改动必须全量 verify 再现**（bb302b4 同源）：F-04 tsc 关卡拦下
  NodeListOf 迭代器类型缺陷（playwright esbuild 不查类型）——收官链 spec
  若只跑 playwright 即带病入库。
- **不变量登记编号=表尾续号**（F-01 门一 W1：实现者插入式中段登记致
  INV-27/28 与 lineage/ENR 撞号——重编 29/30+reader 域引用同步；F-03 起
  实现者自觉接尾号 31/32/33 全役无再犯——教训随门审反馈即时消化）。
- （门审新教训如有续补）

## 7. 随手验清单（主控收口后建议复跑）

- `npm run verify`（93 文件 723 用例）+ `npm run test:e2e`（22 过+0 skip——
  F-04 翻 done 后收官链自动激活，推演已由 spec 备份法取证兑现）
- 用户走查：连续滚动阅读体验（见 §2 末行建议面）
