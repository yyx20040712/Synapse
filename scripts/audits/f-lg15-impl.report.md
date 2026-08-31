# F-LG15 实现者报告：脉络图人工第二父文献连线（manual 边）

> 票面：scripts/audits/f-lg15-ticket.md（用户 2026-08-31 反馈批末条+不限条数裁决）
> 基线：F-LG14 ec1e7e959（图例四项/菜单六项/边三型渲染现状基线）
> 三屋第一屋（实现者）；禁 git/registry/locks 已守——零提交零推送零 locks 脚本调用。
> 开工技能清点：TDD/systematic-debugging/verification-before-completion 用；
> subagent-driven-development 不用（本会话即第一屋本体）；e2e/browser 类不用
> （验收口径=npm run test+真机 Electron 探针）；git 类不用（票面禁令）。

## 一、交付摘要（协议/守卫/布局渲染/UI 四段）

### 协议与存储（main+shared，受锁改向）
- **零迁移申报**：迁移 004/006 核查——`lineage_edges.kind TEXT NOT NULL DEFAULT
  'tree'` **无 CHECK 约束**（006 注释明言「DDL 不承担行为约束」），kind 扩
  'manual' 零迁移，存量库零风险（票面 §1 预判「若有则扩值」→ 无，报告申报）。
- **shared/models/lineage.ts**（受锁 [locked-change]）：`lineageEdgeKindSchema`
  扩 `z.enum(['tree','ref','manual'])`+三 kind 注释（manual 豁免单父不限条数/
  拒环/同端点对互斥/draft 不收）。draft edge schema **零变**（strict 无 kind
  字段=含 kind 的草稿边拒收——「draft 导入协议不收 manual」由既有 strict 天然
  承载，单测断言 anchors.0+reason 含 kind）。
- **lineage.repo.ts**（票面改动面未列，申报）：`toEdge` 读面归一扩展
  `row.kind === 'manual' ? 'manual' : ...`——DB 写 manual 读回 tree 会断
  渲染/守卫往返（先红实证：落库用例红的根因即此）。守卫宿主不变仍在 service。
- **ipc 载荷**（shared/ipc/schemas.ts 受锁 [locked-change]+ipc/lineage.ts）：
  upsert-edge Req 加 `id: z.string().min(1).optional()`（F-LG15 label 后编辑
  更新语义——缺省=新建，既有新建载荷形状逐字节保持：store 条件展开不进键）；
  handler 透传 id。api-surface 泛型引用零改。

### 守卫（services/lineage/lineage.service.ts，受锁 [locked-change]）
**结构发现：三守卫零新增代码天然承载 manual**——①多父守卫 `if (kind === 'tree')`
天然豁免 manual（不限条数）；②环检测 `reachable` 用**全部边**（tree+ref+manual
——「tree 父链+manual 父链双向」由全边可达图承载）；③同端点对 dup 检查不区分
kind 天然三方互斥。本单 service 改动=注释扩写+互斥/成环 reason 文案 kind 通用化
（`（${dup.kind} 与 ${kind} 同端点对互斥）`；受锁断言查「互斥」「环」子串不受影响，
既有断言锚逐字未动）。manual **无 from 属性限定**（票面守卫清单无此类限定——
ref 的综述限定是 R2-LG12 专属；「仅允许人工」由 UI 入口+draft 拒收承载，自裁
申报④）。

### 布局与渲染（renderer）
- **lineage-layout.ts**：净化段 `if (e.kind === 'ref') continue` → `if (e.kind
  !== 'tree') continue`（manual 同 ref 不进树/右列计算——父子几何语义由 tree
  边独占，manual 纯叠加连线仅渲染消费，不计 dropped 不 warn）。
- **LineageEdges.tsx**：manual 渲染分支——`var(--manual-edge)` 1.4 **虚线 7 5**；
  优先级 ref>综述关联>**manual**>推断>普通（manual 直读 kind，优先于推断标记
  ——人工标注语义>label 文本启发，变异红证锚）。label 沿既有 edge-label-layout
  槽位渲染（零改——非空 label 全边通用管道）。
- **theme.css**：新变量 `--manual-edge: #c07a2a`（琥珀）+图例样式
  `.lg-manual`（1.4px dashed）。**LineageLegend**：第五项「人工父连线」
  （既有四项 toContain 断言语义不变——扩展非改向，新测试锚第五项）。

### UI（连接父文献+管理人工连线）
- **LineageNodeMenu**：「连接父文献…」（所有节点呈现——守卫无 from 限定）+
  「管理人工连线…」（仅节点有 manual 入边时呈现——label 后编辑+删除入口，
  票面 §1「可后编辑：侧板/菜单；删除入口同菜单」的菜单路径承载）两菜单项。
- **LineageManualParentDialog**（新件 105 行）：目标选择对话框（LineageAddNodeDialog
  形态 crib）——候选=图中既有节点（自身+已有同端点对边端点过滤防呆）+搜索本地
  过滤+逻辑线说明 label 可选输入；未选目标禁用确认。
- **LineageManualEdgesDialog**（新件 89 行）：逐行列出 manual 入边（不限条数
  ——来自节点标题+label 输入+保存（id 更新语义）+删除）。
- **LineageManualDialogs**（新件 66 行）：双对话框宿主拆件（Board 行数红线整改
  产物，见自裁⑦）——节点/边查找收口本件，写路径仍上抛收口 Board→store。
- **LineageBoard**：两 state+菜单接线；**「删除父连线」改向**：menuParentEdge
  过滤 `kind === 'tree'`（既有 find 任意入边——manual 入边会被「删除父连线」
  误删，语义修正；受锁 board 测试夹具是 tree 边，行为不变保持绿，自裁⑤）。
- **lineage.store.ts**：`linkManualParent(childId, parentId, label?)`（kind='manual'
  经既有 upsert-edge 通道）+`editManualEdgeLabel(edgeId, label)`（id+端点+kind
  保持的更新载荷）；WriteAction upsert-edge input 复用 LineageEdgeUpsert（id
  本在类型面）。CONFLICT 拒绝型丢弃不卡队列（既有机制天然适用）。

## 二、测试结果

| 阶段 | 结果 | 取证 |
|---|---|---|
| 先红（三新文件） | **7 红 \| 5 先行绿** | 见下「先行绿申报」 |
| 全量绿 | **126 文件 / 1073 用例全过，exit=0** | f-lg15-final-test.raw.txt（真退出码；基线 123/1049+新增 3 文件 24 用例） |
| lint/typecheck/quality | 全过（无占位标记/无乱码/无跨域引用） | 本节 Console 记录 |
| build | 过（探针前置） | 2026-08-31 01:0x |
| 变异红证 M1~M4 | **全部红→还原绿**（cp 备份法，diff 确认空，未用 git checkout） | f-lg15-mut-m{1..4}.raw.txt |
| 真机复验 | **5/5 全过** | f-lg15-verify.json + f-lg15-verify.png |

**先行绿申报**（5 用例先绿）：拒环三向（经 tree/经 manual/纯 manual 链）+manual
自环+合法 draft 恒 tree——根因=环检测全边不区分 kind、自环检查在 kind 前、draft
导入显式 kind:'tree' 均为既有结构（同 F-LG14「先行绿」先例申报）；其失败路径由
**M2 变异域承担**（reachable 过滤非 tree 边 → 拒环②③红，实证）。

**新增测试三文件**（always-active，不经 guardedDescribe）：
- tests/unit/services/lineage-manual-edges.test.ts（10 it）：落库往返/豁免单父+
  不限条数（两 manual 同子）/拒环三向/同端点对三方互斥（tree·ref·manual 两两
  方向+ref→manual）/draft strict 拒（path=edges.0+reason 含 kind）/自环/label
  更新语义（created_at 保留+kind 保持+更新非新建）。
- tests/unit/renderer/lineage-manual-layout.test.ts（2 it）：manual 边不进树
  （含 manual 输入与剔除恒等+零 warn——manual 在前抢占 tree 父的构造）+多条
  manual 同子零树占位。
- tests/unit/renderer/lineage-manual-edit.test.tsx（12 it）：渲染三方色型断言
  （var(--manual-edge) 1.4 虚线 7 5+≠branch+≠survey-edge+≠'2 3'）+manual 优先
  于推断+label 沿边渲染+图例第五项/Board 全链（右键→连接父文献→搜索过滤+选取
  +label→upsert-edge {from,to,label,kind:'manual'} 载荷）/取消零写/未选目标
  禁用/管理对话框 label 编辑（id 更新载荷）+删除（remove-edge）/无 manual 边无
  管理项/「删除父连线」仅针对 tree 边/store linkManualParent·editManualEdgeLabel
  载荷回填。

**变异红证明细**：
- M1=多父守卫豁免断裂（`kind === 'tree'`→`kind !== 'ref'`——manual 也查多父）
  →「豁免单父+不限条数」红；
- M2=环检测图缩窄（reachable 过滤 `e.kind !== 'tree'`）→「拒环②经 manual 父链」
  +「拒环③manual 纯链造环」2 it 红（环检测必须含 manual 边的必要性实证——
  先行绿用例的失败路径补齐）；
- M3=布局净化段回退（`kind !== 'tree'`→`kind === 'ref'`——manual 进树）
  →布局 2 it 全红（抢占 tree 父+warn）；
- M4=渲染 manual 分支断裂（`const manual = false`）→「三方色型」+「manual 优先
  于推断」2 it 红。

**真机复验**（f-lg15-verify.mjs，真实用户库副本+两次真实启动，双 ABI 自管+收尾
还原 node）：
- ① 菜单连第二父：右键子文献→「连接父文献…」→搜索「甲」选取+label→连接→
  manual 边在场：stroke=`var(--manual-edge)`/dash=`7 5`/width=`1.4`+label
  「研究者补判的方法源头」沿边渲染；
- ② label 编辑持久化：「管理人工连线…」改「再判：修正的逻辑线」→保存→**关窗
  重开**→新说明在场（DB 持久化双向取证）；
- ③ 再连第三父（不限条数）：「平行路线乙」→2 条 manual 边同子共存；
- ④ 造环被拒：起源节点（P1→P4 tree 父在）反向连子文献为父→service 拒→toast
  role=alert「成环拒绝：该边将使脉络图出现环路（树边、参考边与人工边均不得
  成环）」可见+manual 计数保持 2（未建）；
- ⑤ pageerror 0（两次启动合计）。

## 三、三边样式对比表（票面 §6 主控裁决——供用户复测辨义）

| 边型 | 色 | 线型 | 宽 | 语义 |
|---|---|---|---|---|
| tree 普通 | `var(--node-branch)` 灰蓝 #b8c4d4 | 实线 | 1.2 | 树父子继承（单父） |
| tree 推断（label 含「推断」） | #8a94a6 深灰蓝 | 虚线 5 4 | 1.2 | 推断的树边（AI 草稿文本启发） |
| ref/综述关联 | `var(--survey-edge)` 淡灰 #c8cdd6 | 点线 2 3 | 1.4 | 综述参考（自动分流） |
| **manual（本单）** | `var(--manual-edge)` 琥珀 #c07a2a | **长虚线 7 5** | 1.4 | **人工补父（研究者判断）** |

三方区分度=色相（灰蓝/淡灰/琥珀）×线型（实线/点线/长虚线）双维；图例第五项
「人工父连线」（琥珀长虚线样条）随边入册。

## 四、守卫矩阵（INV-27 三 kind 全景）

| 守卫 | tree | ref | manual |
|---|---|---|---|
| 单父 | 拒（至多一 tree 父） | 豁免 | **豁免且不限条数（用户裁决）** |
| 环 | 拒 | 拒 | 拒（全边可达图含 manual 父链——双向） |
| 同端点对 | 三方互斥（任一先行后续他 kind 拒，reason 附 kind 名） | 同左 | 同左 |
| from 属性限定 | 无 | 仅综述文献节点（isSurveyTitle+paperId≠null） | **无**（自裁④） |
| draft 收 | ✓（导入恒 tree） | ✗（应用内手工） | ✗（应用内手工——strict 拒含 kind 草稿边） |
| 自环/悬空 | 拒 | 拒 | 拒 |
| 布局 | 进树 | 剔除 | 剔除（`kind!=='tree'` 统一continue） |

## 五、自裁申报（超票面决定）

1. **零迁移**（票面预判分支落定）：004/006 kind 列无 CHECK——「若有则扩值」
   不触发，零迁移零数据搬迁。
2. **repo.toEdge 归一扩展**（票面 §1~§3 改动面未列 lineage.repo.ts）：manual
   读面往返必要（写 manual 读回 tree 会断守卫/渲染——先红实证）；读面归一
   enum 外值仍归 tree（DB 无 CHECK 的防线=zod 单源写入口）。
3. **互斥/成环 reason 文案 kind 通用化**：`（参考边与树边同端点对互斥）`→
   `（${dup.kind} 与 ${kind} 同端点对互斥）`；成环文案补「人工边」。受锁断言
   查子串（「互斥」「环」）零影响；manual 边拒绝时 reason 准确指明 kind 对。
4. **manual 无 from 属性限定**：票面守卫清单（§1 行为层）无 ref 式限定条款；
   「仅允许人工」的口径由 UI 入口（菜单手工发起）+draft 拒收承载。菜单项对
   文献/主题节点均呈现（与守卫一致）。若用户后续要「仅文献节点可连人工父」
   → 加 service 双守一行+菜单限定（票外）。
5. **「删除父连线」kind 过滤改向**：既有 `edges.find(e.toNode===node)` 会命中
   manual 入边（节点无 tree 父仅 manual 父时误删语义）。改为过滤
   `kind==='tree'`；manual 边删除走「管理人工连线…」。受锁 board 测试夹具
   全 tree 边——既有断言零改保持绿。
6. **IPC upsert-edge 加 id optional**（票面 §2 未明示）：label 后编辑的更新
   语义需要 id 通道（service 更新语义 R2-LG12 已备——dup/多父/环守卫均按
   input.id 排除自身）。契约扩展非放宽；新建载荷逐字节不变（store 条件展开）。
7. **Board 拆件 LineageManualDialogs**：填充后 272 行超组件 250 红线（quality
   关卡拦截实证）——拆双对话框宿主件（66 行），Board 收 249。Toolbar 拆件先例
   同型（F-LG14 自裁⑤）。
8. **先行绿 5 用例**（见测试结果节申报）：环检测全边不区分 kind 的既有结构所
   致；失败路径由 M2 变异红证补齐。
9. **探针右键改道**：Playwright 元素中心右键在节点贴视口缘时 fixed 菜单越界
   （「outside of the viewport」超时）——dispatchEvent contextmenu 指定视口内
   安全锚点（单测同款）；菜单行为面零改（真实 contextmenu 事件全链）。
10. **测试期两处自修**（新测试未锁定前的合法修正）：互斥用例三 block 共享库
    未清面（补 repo.clearGraph）+draft strict 断言 path 锚（对象级 edges.0 非
    edges.0.kind——zod unrecognized key 锚定行为）。

## 六、受锁改向对照（既有断言锚逐字不动原则）

| 文件 | 改向 | 依据 |
|---|---|---|
| src/shared/models/lineage.ts | kind enum 扩 'manual'+三 kind 注释 | 票面 §1/§2 明示受锁改向 |
| src/shared/ipc/schemas.ts | upsert-edge Req 加 id optional+注释更新 | label 后编辑（自裁⑥）——契约扩展非放宽 |
| src/main/services/lineage/lineage.service.ts | 注释扩写+互斥/成环 reason 文案 | 票面改动面明列；受锁断言查子串零影响 |
| docs/invariants.md | INV-27 修订（三 kind 全景表+manual 面锚定清单） | 票面 §6 主控裁决明示 |

受锁但**零改**：lineage-import.test.ts（24 断言锚逐字未动）/lineage-board.
test.tsx/lineage-canvas-visual.test.tsx（图例 toContain 语义随五项扩展保持——
测试名「四项」stale 但断言锚不动，新测试锚第五项）/lineage-layout.test.ts/
lineage-store-write.test.ts/e2e lineage.spec.ts/api-surface.ts（泛型引用）。
**新增受锁测试 3 文件待 locks:generate 登记**——重锁归主控。

## 七、diff 自查

`git diff --stat`：13 文件 +160/−44，全部落票面 §1~§3 改动面（shared×2/service/
repo/ipc/layout/edges/legend/menu/board/store/theme.css/invariants）。
- 新增 8 件主交付：3 受锁测试+3 组件（Dialogs←Board，ParentDialog/EdgesDialog
  ←Dialogs 引用闭合）+探针 mjs+本报告；另探针产物（verify.json/png+变异取证
  raw×5）随场（f-lg15-ticket.md 为主控件非本单产物）。
- scripts/audits/ 下 f-l4/f-n1/f-lg1x 历史未跟踪残留=既有场产物（非本单扫入面）。
- 组件行数：Board 249/Menu 123/Dialogs 66/ParentDialog 105/EdgesDialog 89——
  全部 ≤250（quality 关卡过）。
- 死代码检查：新增文件全部被引用；无 TODO/FIXME/placeholder（quality 关卡过）。
- locks:check **预期红**（受锁文件已改+3 新测试未登记）——重锁（locks:apply+
  manifest 同步+generate 新路径）归主控（本单禁令）。

## 八、docs 登记

- docs/invariants.md **INV-27 修订**（票面 §6 裁决）：三 kind 全景表——tree 单父
  保持/ref 综述参考豁免/manual 人工补父**豁免且不限条数**、拒环（全边可达图）、
  同端点对三方互斥、draft 不收、布局 `kind!=='tree'` 统一剔除、渲染三方可区分
  色型；锚定清单补 manual 面十用例+layout 恒等+渲染色型断言。
- 无新 INV 号（manual 边行为=INV-27 三 kind 全景的自然扩面，主控预裁同构）。

## 九、成本账本

- 实现者会话时长：约 80 分钟（现状通读→红→绿→变异→真机→报告）。
- token 估算：约 240k input/16k output（含 12 文件全文通读+三轮全量测试回显）。
- 全量测试 3 跑（红 1+绿 1+终态 1）+定向 8 跑；build 1；真机探针 2 次启动
  （首跑菜单越界改道后 1 次过）+改道前 2 次失败启动。

## 十、卡点/证据矛盾

无阻塞性卡点。两处测试期自修已申报（自裁⑩）；探针右键越界改道已申报（自裁⑨）。
环境无矛盾（受锁文件无只读位——F-LG14 自裁③场景未复现）。
