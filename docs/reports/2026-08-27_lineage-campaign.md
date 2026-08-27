# P7-H 脉络图组战役报告（2026-08-27）

> 范围：SR2-LG-01~05 五单全役（数据基座+草稿导入→布局+画布+第四视图→
> 交互编辑+自动保存→侧板+跳转→e2e 全链）+跨单 P7-C e2e 崩溃修复。
> 本役为三屋模式（ADR-0017）**整役五连单**（含前置工单化双 plan 门）。
> 前置基线：verify 79 文件 520 用例 + e2e 16/16 + locks 122 + 工单 104
> open 5（工单化后）。
> 终态基线：**verify exit 0（86 文件 615 用例）+ e2e 20/20 + locks 131 +
> 工单 104 open 0**；INV-20（消费方 cell 刷新）/22（扩面）/27（新立）锚定；
> **P7 主线（A~H）全域完成**。

## 1. 交付清单（全役）

| 单元 | 提交 | 要点 |
| --- | --- | --- |
| 工单化（五票面） | e58ff3f | 双 plan 门（门一 0B/4W/9N→回炉文字级→复核→门二 PASS）；INV-27 宿主=01 service 写面（W1）；守卫/LG-04 直连依据/树约束语义等 4W9N 处置入票面 |
| SR2-LG-01 数据基座 | 06ea570 | 迁移 004（ADR-0014 DDL 字面）+repo 六方法+clearGraph（自裁）+lineage.service（validateDraft 三段纯函数+全有或全无替换式导入+upsertEdge 运行时守卫=INV-27 宿主）+lineage 域立域（契约测试十一域穷举）+dialogs.pickJsonFile+INV-27 入册；受锁测试涟漪四处（migrate 版本清单等）全判契约扩展必要同步 |
| SR2-LG-02 布局+画布 | 8491489 | RT tidy tree 零依赖手写（后序轮廓合并+前序绝对化）；**回炉 W1：轮廓帧索引=年份层序**（树深度索引致叔侄同年 x 重叠 70px 被门一 esbuild 机器证伪——自裁申报不实被拦截）；**回炉 W2：空态早退删除**（空→非空转场 pan/zoom 失灵=03 必经路径）；脉络第四视图（E4）+store 三态 |
| SR2-LG-03 交互编辑 | c8758ea | 写四通道接线+**LineageDomainError CONFLICT 升级（主控追认：toAppError 折叠致 reason 透传机制性不成立，7 处）**+Board 交互（拖拽/加节点两型/加边/改父部分失败语义/树拒绝 toast）+自动保存（INV-04 同型+最后写胜出 stale-guard）+退出聚合（INV-22 扩面+tab-dirty 仅 stale 行）+**导入入口回炉补**（门一候裁 B：LG-01 条款消费窗口悬空——工具栏按钮+confirm+单行 errors toast） |
| SR2-LG-04 侧板+跳转 | e7b5836+cbc6b1c | 侧板四区（ai-note-style 跨域白名单）+双击跳转链（锚递达自裁=路径 A 总线载荷扩+open-paper-anchor 模块+anchorPage 基转换单点+INV-20 消费方级）；**收口 staging 失误漏提交新文件（主控）——LG-05 实现者申报拦截** |
| SR2-LG-05 e2e+崩溃修复 | d64aec4 | e2e 全链 4 用例（八验收面；dialog/写通道 mock=main 侧 evaluate 桩 N8 路径）；守卫改仅依赖组（主控裁定）；**P7-C e2e 崩溃跨单修复：App 组合根 `||` 短路违反 Rules of Hooks（主控 LG-03 亲笔引入）——专职调试代理根因定位（bisect/stub 矩阵/sourcemap 栈解码/vitest 同栈最小复现）+回归锁 app-quit-dirty.test.tsx** |

## 2. 三屋账本（ADR-0017 裁决 5）

| 单元 | 实现者 | 门一（含复核） | 门二 | 合计 |
| --- | --- | --- | --- | --- |
| 工单化（主控直做） | — | 1.04M/9.2min+复核 0.32M | 1.96M/7.6min | ≈3.32M/21.0min |
| LG-01 | 4.33M/17.9min | 1.26M/4.6min | 0.75M/4.2min | ≈6.34M/26.7min |
| LG-02 | 8.37M/33.0min（含回炉 2.82M） | 2.41M+复核 0.65M | 0.80M/5.5min | ≈12.23M/51.7min |
| LG-03 | 27.56M/52.5min（含回炉 8.62M） | 1.05M+复核 0.50M | 0.92M/7.8min | ≈30.03M/69.9min |
| LG-04 | 5.03M/22.8min | 0.49M/5.2min | 0.61M/4.9min | ≈6.13M/32.9min |
| LG-05+修复 | 13.81M/47.4min+调试代理 1.48M | 1.25M/12.3min | 0.58M/4.4min | ≈17.12M/64.1min |
| **全役** | **59.10M/174.1min** | **8.97M/49.6min** | **5.62M/34.4min** | **≈73.69M tok/258.1min** |

- 单均 ≈14.7M tok/51.6min（LG-03 最重 30M——交互编辑+写通道+聚合面；
  LG-01 最轻 6.3M）。
- 回炉 3 轮（LG-02 机器证伪自裁不实+转场失灵；LG-03 导入入口候裁 B；
  LG-05 守卫裁定属预裁非缺陷）——全部一轮收口。
- 门审 0B 全役；W 级 13 条（4 票面回炉+2 机器证伪+1 转场+2 文书+2 挂账
  +2 责任记录）。

## 3. 技术要点与裁决记录

### 3.1 lineage 域与数据面终局

- 域六端点：lineage/import（dialog 在 ipc 层）+graph+upsert-node+remove-
  node+upsert-edge+remove-edge（写四通道 LG-03 接线——01 建方法不建死
  条目，消费者窗口纪律）。
- **INV-27 树单父不变量**：守卫宿主=service 写面双口（导入校验三段+
  upsertEdge 运行时三拒绝）——门审 W1 处置防「ipc 直调 repo 绕守卫」；
  存储=图 schema（v2 DAG 升级免迁移）。
- 导入=全有或全无替换式+确认对话框（草稿整图语义；errors 单行汇总
  toast——逐条多 toast 被去重机制吞且刷屏）。
- LineageDomainError('CONFLICT')（主控追认）：写失败二分类=CONFLICT 丢弃
  不卡队头不误报 dirty vs 系统型保留重试——票面「动作型 toast+dirty=≠
  saved」的合成必要条件。

### 3.2 布局语义（回炉 W1 沉淀）

- RT tidy tree 轮廓帧索引=**年份层序**（非树深度）：同年层内任意两节点
  x 区间全分离；异年 x 交错合法（y 带分离无视觉重叠——主控认领语义）。
  单链异年 x 对齐=紧凑性特征非缺陷。

### 3.3 P7-C e2e 崩溃（本役最重要教训）

- 根因：App.tsx `useTabDirtyAggregate() || useLineageDirty()`——**`||`
  短路违反 Rules of Hooks（主控 LG-03 收口亲笔引入，非实现者）**：tab
  dirty=true 的渲染缺席右 hook→同一 fiber 两次渲染 hooks 数量不同→
  生产 bundle commit 阶段 effect 链错位崩 areHookInputsEqual（undefined
  deps.length）。
- 特征：**e2e-only**（生产 bundle 无 dev 警告；vitest 组件级不触发）；
  fill 后 ~110ms 整树卸载。
- 定位链：主控 bisect（06ea570 绿/8491489 红 3/3）+stub 矩阵+sourcemap
  栈解码（Mh=areHookInputsEqual）→调试代理 vitest 级同栈最小复现→根因。
- 修复=两 hook 无条件调用（9 行）+回归锁（修复前红同栈）。
- **未闭合项（诚实记录）**：8491489（LG-02，短路行尚不存在）bisect 实测
  3/3 崩与 git log -S 铁证矛盾——可能=主控 bisect 实验树残留污染；缺陷
  本体已修已锁，历史时序待考。
- **流程沉淀**：组合根 hook 聚合写法禁短路（写法纪律入下批模板候选）；
  e2e 全量跑从「收官才跑」前移（LG-02~04 收口均未跑 e2e——若早跑可
  在引入点拦截）。

### 3.4 主控操作事故两起（交接记录）

- LG-04 收口 staging 漏提交新文件（open-paper-anchor.ts）→已推送提交
  引用 untracked 文件（checkout 后 build 必红）——LG-05 实现者申报拦截，
  cbc6b1c 补提交。教训：**收口 staging 必跑 `git status 核对 untracked
  新文件与 diff 清单对账`**（既有纪律的执行缺口）。
- bisect 实验后未回 main 分支→LG-05 提交落 detached HEAD——即时发现
  修正（branch -f main）。教训：**调试 checkout 后先 `git branch --show-
  current` 再提交**。

### 3.5 挂账与遗留

- 用户视检新增：脉络视图全链视检（导入草稿→树渲染→拖拽→侧板→双击跳转
  ——建议与批一/批二挂账视检合并一次走查）；RT 布局观感（同年密集域
  的紧凑度）。
- 工程挂账（N 级无阻断）：W2/W3 流程改进（日志真退出码行/变异还原入
  日志）本役两次未持续——**升级为收口机检项（缺=拒收）转下批模板强制
  化**；zoom 鼠标锚点 jsdom 不可像素验（e2e 面已覆盖可用性）；导入
  errors 单行汇总呈现（v2 若需逐条再议）；8491489 崩因时序待考（§3.3）。
- dist_new/ 未跟踪残留（历史遗留，待用户处置）。

## 4. 三屋模式评估（本役 vs 批二）

- 质量维持：五单+工单化+修复全链门审 0B；机器证伪拦截（LG-02 自裁
  申报不实）与跨单缺陷申报拦截（LG-04 漏提交）证明门审与实现者申报
  双防线有效。
- 成本：全役 ≈73.7M tok/258min——LG-03 单 30M 触及「单会话单元预算」
  上沿（票面重量决定；后续同重量票建议票面内预拆实现段）。
- 韧性：主控两起操作事故（staging 漏文件/detached HEAD）均被流程防线
  （实现者申报/branch 核对）拦截——**防线有效性实证，但主控收口纪律
  需强化**（见 §3.4 教训两条）。

## 5. 证据档案

- 各单：scripts/audits/lg0{1..5}-*（实现者报告/门一/门二/diff）+
  lg-ticketing.*（工单化双门）+p7c-crash-fix.md（调试报告+主控追记）；
  运行日志同目录（gitignore 不入库）。
- 提交链：e58ff3f（工单化）→06ea570→8491489→c8758ea→e7b5836→
  cbc6b1c（补提交）→d64aec4（LG-05+修复）。
- 交接书链：v8（批二）→批二战役报告→本报告；ADR-0014/0017；
  idle-handoff-v2（闲时线 §2 顺延记录待 idle 会话更新——本役 LG-05
  完成后 open 0，闲时线下一批工单化前无单可领）。
