# 新增功能模块骨架细化（2026-08-25 第五轮：AI-06~10 回灌联动组 + LG-01~05 脉络组 + N1 定位服务）

> 定位：ADR-0015（B' 协议+回灌契约）/ADR-0014（lineage 模型）是**契约层**；本文是
> **工程骨架层**——文件级模块布局/IPC 通道总表/状态机母本/测试分层，角色对齐
> ai-module-plan（AI-01~05 的工单化母本）。排序=E6（蓝图 §4.3）：P7-B 收官 →
> P7-C（含 N1）→ AI-01~05 → AI-06~10 → LG-01~05。工单化时本文 §1~§3 随各批次
> ticket:new 消费（五层规约头注+状态机前置+deepseek plan 门，P7-B 先例流程）。

## 1. N1 锚点定位服务（P7-C 增补交付物，两消费方共享，INV-20 单入口）

```
src/renderer/features/reader/anchor-locate.ts
  export interface LocateTarget {
    paperId: string
    anchor: { quoteText; prefixText; suffixText; anchorPage?: number } | null  // null=篇级
  }
  export type LocateResult = 'exact' | 'page' | 'paper'   // 三层防线结果
  export async function locateAnchor(target: LocateTarget): Promise<LocateResult>
    内部编排：requestOpenPaper（open-paper-bus 跨视图闩锁，reader 域单点）→
    等 ReaderPage 就绪（tab 挂载/切换）→ setPage(anchorPage) → verifyQuote 重锚
    （成功：rects 滚动+闪烁=exact；失败：页级停留+「锚定失效已定位到页」=page；
    无锚/篇级：仅开篇=paper）
  接缝：reader.store 增「滚动到页 P 的 rect R」入口（rect 归一化×页面显示尺寸；
    F-aware：P7-F 连续滚动后仅换该入口实现，locateAnchor 不动）
tests/unit/renderer/anchor-locate.test.ts（三防线×消费入口，INV-20 锚定面）
```

消费方：①P7-C 笔记面板条目单击（同视图定位+标注单击反向同步高亮）；②LG-04
脉络侧板笔记双击（跨视图跳转）。标注单击=既有四选项菜单+侧栏同步（方案a，
AnnotationLayer 点击路径扩一个侧栏滚动事件）。

## 2. SR2-AI-06~10 模块骨架（回灌联动组，ADR-0015 落地）

### 2.1 文件布局

```
main:
  src/main/services/ai-sensor/ai-sensor-files.ts     协议读写纯逻辑：writeReadJob/
                                                      readStatus+心跳新鲜度阈值/corpus-ai 扫描
  src/main/services/ai-sensor/ai-notes-import.service.ts  导入器：zod 校验→withTransaction
                                                      写 ai_notes→archive/ 移动；内容 sha 幂等
  src/main/services/ai-sensor/skill-install.ts       zcode 检测（fs 痕迹三档）+技能模板复制
  src/main/ipc/ai-sensor.ts                          域 handlers（request-read/status/
                                                      linkage-status/install-skill）
  src/main/ipc/notes.ts 扩或 ai-notes.ts             import/list handlers（并入现有 notes 域）
shared:
  src/shared/models/ai-note.ts                       跨进程类型单源（question 枚举/锚定三元组）
  src/shared/ipc/api-surface.ts + schemas.ts         [受锁] 六通道接线（§2.2 总表）
renderer:
  src/renderer/features/reader/ai-note-style.ts      七问分色单源（INV-11/19）
  src/renderer/features/reader/notes-panel/（P7-C 面板扩展）
    AiNotesSection.tsx        [ai:*] 分节（role 分组→question 条目，色边）
    ReadingStatus.tsx         「AI 正在读」状态行（挂载期轮询 status；done 翻转触发刷新）
    ReadButton.tsx            「AI 读文献」按钮（→request-read；心跳缺失→toast 引导）
  src/renderer/features/reader/AiAnnotationLayer.tsx 重锚→rects→渲染（question 色）；
                                                      点击=高亮+跳面板条目；无编辑/删除
  src/renderer/features/settings/ZcodeLinkageSection.tsx  三档态+装技能确认
tools:
  tools/ai-sensor/serve.mjs                          拾取循环+心跳+三读执行（复用 queue.mjs）
```

### 2.2 IPC 通道总表（全部受锁 [locked-change]；命名沿用「<域>/<动作>」）

| 通道 | 方向 | 用途 | 载荷要点 |
| --- | --- | --- | --- |
| ai-sensor/request-read | r→m | 写 pending job | `{ paperId }`→`{ jobId }`；同篇 pending 去重 |
| ai-sensor/status | r→m | 读状态+心跳 | `void`→`{ state, currentPaper, role, heartbeatFresh }` |
| ai-sensor/linkage-status | r→m | zcode 检测三档 | `void`→`{ tier: 'no-zcode'\|'installed'\|'running' }` |
| ai-sensor/install-skill | r→m | 复制技能模板 | `void`→`{ ok, dest }`（用户确认后调用） |
| ai-notes/import | r→m | 触发导入 | `void`→`{ imported, skipped }`（幂等） |
| ai-notes/list | r→m | 篇级读 | `{ paperId }`→行数组（role/question/锚/content） |

### 2.3 job 生命周期状态机（AI-06 工单头注母本）

态：`idle → submitted（pending job 落盘）→ picked（工具拾取，心跳开始）→
reading（role 流转 first→second→adjudicate）→ done ｜ failed ｜ abandoned（心跳超时）`

| 跨格序列 | 期望行为 |
| --- | --- |
| 提交后工具未运行 | 状态行=「等待 zcode 工具」（心跳缺失档）；按钮可重复提交→同篇去重 |
| 读取中途关应用 | job 仍在 pending/进行；重开应用状态行恢复；工具侧按篇幂等续跑 |
| 心跳超时（阈值秒数常量单源） | abandoned 档+重试引导；不算 failed（进程可能只是停了） |
| 导入时产物半份（写入中断） | zod 校验拒绝整文件→下一轮重导（工具侧篇级产物原子写：temp+rename） |
| 三读完成 | 产物 corpus-ai/<paperId>.json 落盘→状态行 done→「导入」可点（或自动） |

### 2.4 测试分层

| 层 | 文件 | 内容 |
| --- | --- | --- |
| 协议纯逻辑 | tests/unit/services/ai-sensor-files.test.ts | job 写入去重/心跳新鲜度/目录布局/产物扫描 |
| 导入器 | tests/unit/services/ai-notes-import.test.ts | 幂等 sha/校验拒绝/事务回滚/paper 级联 |
| 工具侧 | tests/unit/tools/serve.test.ts | 拾取→心跳→产物→移 job 序列（vitest） |
| 组件 | notes-panel 三件/联动节 | 分节渲染/只读/状态行三态/检测三档/无 spawn 断言 |
| e2e（AI-10 验收） | 扩展 | INV-21 不代启：安装/检测全程无子进程断言 |

## 3. SR2-LG-01~05 模块骨架（脉络组，ADR-0014 落地）

```
main:
  src/main/db/migrations/004_lineage.sql             [受锁]（ADR-0014 DDL 原文）
  src/main/db/repos/lineage.repo.ts                  nodes/edges CRUD（≤300 行红线，映射函数拆分）
  src/main/services/lineage/lineage.service.ts       图操作：upsert/move/delete 节点边+树约束
                                                     （第二父拒绝）+withTransaction
  src/main/services/lineage/lineage-import.service.ts  lineage JSON 草稿导入（ai-draft 标记）
ipc（受锁，工单化时定稿通道名）：lineage/get、upsert-node、move-node、upsert-edge、
  delete-node、delete-edge、import-draft
renderer:
  src/renderer/features/lineage/
    LineagePage.tsx          顶层视图（App.tsx 导航第四项）
    lineage.store.ts         图状态+autosave（INV-04 语义+脏点投影）
    LineageCanvas.tsx        SVG 画布+pan/zoom（滚轮/拖拽，INV-14 成对注册）
    tidy-tree.ts             Reingold-Tilford 布局纯函数（y=年份层，x=tidy 整序）
    LineageNode.tsx          节点卡片（title/year/core_idea 摘要；单击=侧板）
    LineageEdge.tsx          边渲染（bezier；label）
    LineageDetailPanel.tsx   侧板：元信息+AI/人工笔记（ai-notes/list+notes 读）；
                             笔记双击→anchor-locate（N3，INV-20 共享单入口）
tests: tidy-tree.test（布局数学：同层不重叠/父居中子树上/深度单调）；
  lineage.repo.test（CRUD/树约束/级联）；store autosave 态空间；e2e=LG-05
```

**autosave 态空间（LG-03 工单头注母本）**：`clean → editing（拖拽/加删边，debounce
窗口）→ saving → saved ｜ save-failed（灰点+重试）`。跨格：连续拖拽合并一次保存；
失败不推进 savedAt；图视图脏态并入退出拦截上报源（App 层 effect 取
useTabDirtyAggregate ∥ lineage dirty 的并集——接缝一行，不动 TABS-04 已交付面）。
手工位置=x/y 覆盖（NULL=自动布局）；「重置布局」=清 x/y。

## 4. 红线复核（全组）

- **零新依赖**：SVG 画布/布局/文件协议/检测全部自研；sha=node:crypto 先例 ✓。
- **受锁面**：api-surface/schemas/migrations/全部新测试文件→locks:generate+apply；
  改前 unlock、提交即 apply（INV-12）。
- **INV 挂钩**：INV-19（AI-09）/INV-20（N1+AI-08+LG-04）/INV-21（AI-10）验收条款
  已写入登记册，各单头注引用。
- **依赖声明**：AI-08/09 依赖 P7-C 面板与片段锚；LG-04 依赖 N1；LG 全组依赖
  AI-07 读通道；F-aware 接口两处（anchor-locate 滚动入口/tidy-tree 与画布几何）。
