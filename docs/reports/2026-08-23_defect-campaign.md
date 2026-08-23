# 四问题缺陷修复战役收官报告（U1–U7）

- 日期：2026-08-23
- 范围：用户运行时报告的四类问题（Q1 界面布局 / Q2 按钮 / Q3 标注渲染 / Q4 笔记链）的
  取证、终裁分类与七单元修复；含前置会话 GLM 思考等级配置事故的裁决重验
- 基线：起点 HEAD=15180cb（a33324a 及之前 8 提交已 push、CI 绿）；终点 HEAD=7d744b0，
  共 6 个新提交，全部经「deepseek 一审 + GLM（正确配置）二审 + 机器事实终裁」双门流水线
- 最终机器证据：`npm run verify` exit 0（50 文件 230 用例，战役前 212）；`npm run test:e2e`
  6/6；工作树干净；受锁文件全部即时 `locks:apply`

## 1. 四问题终裁分类总表

| 问题 | 终裁 | 用户实锤 | 修复单元 |
| --- | --- | --- | --- |
| Q1 阅读器右侧大号纯灰白文档滚动条 | 假设 1：html/body/#root 缺 overflow:hidden，文档级滚动泄漏、下方 body 背景纯空白 | ✅ | U4 |
| Q2 按钮偶发无响应 | 主因不可复现（用户侧偶发、无法定位）；伴生缺陷四处实证 | ❌ 无法复现 | U1（详情链三缺陷）/U5（对话框非模态）/U6（tags 吞错）/U7（Toast 挡点击） |
| Q3 高亮叠深一块浅一块、下划线歪扭双线 | 逐 clientRect 透传无行合并（叠深 ~0.58）+ 下划线逐矩形底边 | 逻辑实证 | U3 |
| Q3b 高亮点了无可见效果 | 创建链正常；opacity 0.35×浅黄白纸对比度 ~1.1:1 低于感知阈 | ✅ | U3 |
| Q4 笔记写进上一篇/被覆盖 | 详情 effect deps [run] 恒稳定永不重取（错靶根因）+ notes 链五处竞态 | ✅ 错靶 | U1（错靶）/U2（notes 链） |

已排除项（取证反证，无需动作）：D3 保存乱序（单通道 FIFO+同步处理器结构不可能）、A2 迟到
置位（不可达）、高亮创建链/CSS 变量/层叠遮挡假设（穷举反证）。

## 2. 七修复单元（提交 × 6，U1 为重审保留）

| 单元 | 提交 | 内容 | 测试增量 |
| --- | --- | --- | --- |
| U1 详情面板 | 15180cb（重审保留） | effect deps 补 [paperId,reloadKey]；error 渲染（首败红条+刷新失败窄条+旧数据保留）；enrich 按 enrichStatus 分支 toast | 0（e2e 既有） |
| U2 笔记链 | 5212b20 | loadSeq stale-guard；pendingEdit 状态机（未落库编辑一律字段级合并）；editSeq 派发快照守卫；touchedFields 生命周期配对（edit 打点/save 成功清/整版清/合并保留）；首载门控+补存；面板三态+maxLength | +8（212→220） |
| U3 标注渲染 | 739073c | 容器级 mix-blend-mode:multiply+rect 不透明 1（高亮可见且不盖字）；mergeLineRects 行级合并（同形去重/y 重叠率≥25% 聚簇/高度可比带防旋转互并/x 大间隙断段防多栏桥接/主导矩形定行盒）——两路径同口径；下划线随行盒平齐 | +8 单测+e2e 计算样式/计数断言（228） |
| U4 外壳溢出锁 | e1fbac2 | html/body/#root overflow:hidden（文档永不滚）+ SettingsPage min-h-full | 0（CSS 级，e2e 兜底） |
| U5 对话框模态 | 21eea22 | createElectronDialogs 惰性 getParent，三对话框绑主窗口模态、无父退化 | 0（接口不变） |
| U6 tags 错误反馈 | ef6483d | store error 字段+loadSeq stale-guard；双消费方迁移守卫 toast；消除注释互斥 | +2（230） |
| U7 Toast 穿透 | 7d744b0 | 容器 pointer-events-none+卡片 auto | 0 |

所有新增测试先红后绿自证；U2/U3 另做变异红证（移除守卫/聚类失效→精确红）。

## 3. 配置事故裁决重验（信任分级处置）

- 前置会话 GLM 思考等级被设为低 → 其一切裁决视为未验证。处置：
  - **15180cb（U1，未 push）**：deepseek 一审 PASS(0) 维持有效；GLM 二审按正确配置重做
    （audits/U1-detail-panel-glm-rereview.md）——deps 快照时序/error 分支/enrich 枚举/
    影响面逐项核验，**PASS 维持**。观察项：切换文献时旧详情短暂展示（useAsync 既有设计）。
  - **已 push 8 提交（至 a33324a）**：抽样裁定不重审——其中 6 个为 docs/打包提交，机器事实
    （CI run #15 绿、冒烟五真跑、dist 产物断言）+ deepseek 审计（audits/ 内 9 份）覆盖其
    风险面，GLM 终裁仅涉措辞/格式裁量；无代码行为类裁决需重验。
- Q3 修正案（GLM 实证门产物、U3 实施规格核心）：接手会话按 CSS 规范独立重验**成立并强化**
  ——z-5 容器（absolute+zIndex:5）确为 stacking context：rect 级 mix-blend 只与容器内透明
  背景混合（无效）且同标注矩形互相叠乘（正是要消灭的叠深）；multiply 必须上容器级。

## 4. 双门流水线的两处纪律生效实录

1. **U2：GLM 门漏判、deepseek 门拦截**。GLM 态空间 18 格首审 PASS，但漏了跨格序列
   「合并落地→补存失败→再 load」（touchedFields 清除早于其描述内容落库）——deepseek 第 5
   轮抓出 BLOCKING，GLM 撤回 PASS 并修正 I3' 设计后修复。单格枚举不覆盖跨格序列是本案教训。
2. **U5：deepseek 门误读、机器事实终裁**。一审三条 BLOCKING（"diff 无装配调用"/"可能有未
   迁移调用点"/"销毁竞态"）经 diff 内容复核、独立 tsc exit 0、同 tick 同步论证全部证伪；
   携核验事实重审 PASS(0)。契约条款「机器事实作为最终裁判」首次实际生效。

## 5. 观察项与存档（不构成回修义务）

- U2：IPC 单通道 FIFO 回复顺序假设（notes get/save 同步处理器——与已排除项 D3 同族）；面板
  状态指示在「合并落地与 in-flight 保存失败交叠」时可能短暂误显已保存（内容安全由
  pendingEdit 保障，下次编辑自然重试）；模块级 Map/Set 随会话文献数线性增长（KB 量级，已
  落注释）；lastEditedAt 命名 vs 仅存在性语义（注释已明示）。
- U3：贪心聚类边界两场景（行内高度方差 ≥2.2× 主导切换、高瘦矩形 y 序插队致同行碎片失联）
  ——后果均仅同行拆两矩形（multiply 下无叠深），ADR-0002 复杂排版近似边界，已注释存档并
  注明正确修法方向；pastel 调色板在 multiply 下的观感需真实 PDF 人工视检。
- U5：多窗口场景绑首个存活窗口（v1 负面清单单窗口）；U6：watch+toast 第 2 次重复（Rule of
  Three 维持）、React 默认转义下错误消息展示面无险。
- U4：阅读器页内滚动条本身属合理行为（页高于视口时需要），改善方向（打开文档自动适应宽度）
  未实施——属 UX 增量非缺陷。

## 6. 暂缓项（待用户立项，本战役未动）

enrich 交互式重试预算（特性级）、连续滚动（架构级四层）、玻璃质感/切换渐变（UX 增量）。

## 7. 审计轨迹索引（Temp\synapse_workflow\）

- 取证分析：analyses\Q1-ui-layout.md、Q2-buttons.md、Q3-annotation-render.md、
  Q3b-highlight-invisible.md、Q4-notes.md（各配 deepseek 逻辑门审计）
- 简报：briefs\U1-detail-panel.md、U2-notes.md（五回炉全记录）、U3-annotation-render.md、
  U4~U7 各一份
- deepseek 审计：audits\U1-detail-panel.audit.json、U2-notes 系列 6 份（5 FAIL→
  PASS_WITH_WARNINGS）、U3 系列 2 份、U4/U7 各 1 份 PASS、U5 系列 2 份（FAIL→PASS）、
  U6 系列 3 份（收敛 2 NIT）
- GLM 门：audits\U1-detail-panel-glm-rereview.md、U2-notes-glm-statespace.md（含撤回与
  修正全记录）、U3-annotation-render-glm.md；U4–U7 的 GLM 二审结论在对应提交信息内

## 8. 验收建议（用户人工）

1. 真实 PDF 上划选高亮/下划线——高亮应清晰可见（荧光笔效果）、同行下划线应单条平齐、
   多行选择每行一条色带；复杂排版（多栏/公式/上下标）下允许行盒近似（ADR-0002 边界）。
2. 笔记面板：快速切换文献+立即输入+断网保存失败等场景下，草稿不应丢字、不应写错文献。
3. 设置页矮窗口滚动观感；系统对话框应模态于主窗口。
