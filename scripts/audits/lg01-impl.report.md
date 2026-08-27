# SR2-LG-01 实现者报告 —— lineage 数据基座（迁移 004+repo+草稿导入+lineage 域立）

日期：2026-08-27 ｜ 实现者子代理（strong，三屋模式）｜ 工单状态：open（registry 翻状态归主控收口）

## 摘要

- 脉络图数据基座落地：迁移 004_lineage.sql（ADR-0014 §数据模型 DDL 字面照抄——
  两表+UNIQUE(from,to)+三级联）+lineage.repo 六方法族（upsertNode/upsertEdge 为
  ON CONFLICT(id) 语义——created_at 首插保留；removeNode/removeEdge/listGraph/
  **clearGraph**——清面原语，自裁项见下）+lineage.service（validateDraft 三段校验
  纯函数：zod 行级中文/幽灵 paperId/树结构【多父/环/自环+悬空边/重复节点/重复边】；
  importDraft 全有或全无——errors 非空库不动，全过 withTransaction 包裹清面重灌；
  **upsertEdge 运行时守卫=INV-27 守卫宿主**（自环/节点不存在/重复边中文收口/
  多父/成环五道，与导入校验同源树约束）；四写方法全建全测但 IPC 只注册
  lineage/import+lineage/graph 两通道——写四通道 schemas 预留归 LG-03，本单零死条目）。
- lineage 域立：api-surface 十域→十一域（契约测试同步扩，[locked-change]）；
  dialog 在 ipc 层（INV-07——ipc/lineage.ts 拾 **dialogs.pickJsonFile**（本单在
  Dialogs 依赖对象新增，pickPdfFiles 单选同型，主控裁决 2），service 收已选路径，
  corpusSession C-02 同序）；register/preload/renderer 经动态机制零改动。
- INV-27 随单登记 invariants.md（树单父：声明处=service 两守卫口；强制方式=单测
  三拒绝双覆盖（导入面+运行时面）；锚定状态=已锚定（单测级）——listGraph 森林
  语义供 LG-02 布局前提）。

## 文件清单

实现面（非受锁）：
- src/main/db/repos/lineage.repo.ts（STUB→真实实现，232 行 ≤500；票面头注五层
  规约原样保留、LINEAGE_REPO_STUB 导出已删）
- src/main/services/lineage/lineage.service.ts（新增，305 行 ≤500）
- src/main/ipc/lineage.ts（新增，38 行——薄分发+CANCELLED 域错误）
- src/main/db/repos/index.ts（Repos+lineage 注册）
- src/main/services/index.ts（ServiceBundle+lineage 装配——paperExists 接
  papers.findById（AI-07 同型）、withTransaction 接 repos.withTransaction）
- src/main/ipc/index.ts（装配桶+createLineageIpc）
- src/main/dialogs.ts（Dialogs 接口+pickJsonFile 实现——单选 JSON，取消 null）
- src/main/db/migrate.ts（MIGRATIONS 追加 version 4——非受锁，003 先例同型）
- docs/invariants.md（INV-27 登记行）

受锁面（unlock→批内改→generate→apply 全程留痕，122→125）：
- src/main/db/migrations/004_lineage.sql（新增 [locked-change]——migrations/ 全目录受锁）
- src/shared/models/lineage.ts（新增 [locked-change]——shared/ 全目录受锁；draft*
  snake_case 文件面与应用面 camelCase 两套 schema 分开命名（主控裁决 3）；
  draft 字段级中文 required_error/invalid_type_error）
- src/shared/ipc/schemas.ts（+lineageImportRes（判别联合）/lineageGraphRes [locked-change]）
- src/shared/ipc/api-surface.ts（lineage 域两通道 [locked-change]）
- tests/unit/services/lineage-import.test.ts（新增 [locked-change]，22 用例
  always-active 不经 guardedDescribe——ADR-0017 裁决 3）
- tests/contracts/api-surface.test.ts（unimplementedObject 十一域 [locked-change]）
- **涟漪适配（契约扩展的必要同步，非断言放宽）[locked-change]**：
  - tests/unit/db/migrate.test.ts（appliedVersions 期望 [1,2,3]→[1,2,3,4]——迁移
    清单扩 4 的事实清单同步；断言语义严格不变，且下一行本就是
    Math.max(...MIGRATIONS) 动态断言；AI-01 加 003 时同型演进）
  - tests/unit/services/enrich.service.test.ts / import.service.test.ts / 
    tests/utils/ipc-deps.ts（Repos/ServiceBundle/Dialogs 接口扩展的类型对账：
    lineage 桩位+pickJsonFile 桩——三处均为 `{} as`/`null as never` 桩工厂同型补位）
- locks/manifest.json（125 条）

## 红证四档（TDD）

1. 红：新测试文件先行（22 用例全量断言），lineage.service 模块缺失→收集级红
   （Failed to load url .../lineage.service），npm exit=1（1 failed/520 passed），
   scripts/audits/lg01-red.log。
2. 绿：npm run test 80 文件 542 用例全过（基线 79/520 → +1 文件+22 用例），
   scripts/audits/lg01-green.log，exit=0。（中途一红：migrate.test 既有用例
   appliedVersions 期望 [1,2,3]——迁移扩 4 后事实清单同步，见涟漪适配；其余
   541 全绿。）
3. 断言级变异红证（cp 备份法，禁 git checkout；npm 真退出码；三轮还原 diff 均
   空输出，scripts/audits/lg01-mutation.log；变异对象=非受锁的 lineage.service.ts）：
   - M1 validateDraft 多父守卫禁用（`froms.length > 1`→`false && …`）→「多父边
     拒绝」用例断言级红（1 failed/541 passed，exit=1）；还原 diff 空。
   - M2 upsertEdge 运行时环守卫禁用（reachable 调用前置 false）→「运行时守卫③
     成环拒绝」用例红（1 failed/541，exit=1）；还原 diff 空。
   - M3 validateDraft 幽灵检查禁用（`!paperExists`→`false && …`）→「幽灵
     paperId 拦截」用例红（1 failed/541，exit=1）；还原 diff 空。
4. verify 终局：scripts/audits/lg01-verify.log，exit=0（quality 无占位/无乱码/
   无跨域引用+tickets 一致+locks 125 一致+lint+typecheck+test 80/542+build）。

## 测试证据（22 用例，tests/unit/services/lineage-import.test.ts）

- repo 真库夹具（6）：upsertNode 新建往返+同 id 更新 created_at 保留/
  removeNode 级联边+removeEdge 计数（含二删 0）/UNIQUE(from,to) 拒同端点第二条
  +listGraph 空库=空数组/clearGraph 清面/级联链（paper 删→节点 CASCADE→边随亡）。
- 导入三段+全有或全无（11）：合法全过 {ok:true,2,1}+x/y=null 自动布局面/替换
  重灌旧图清空/幽灵拦截（path=nodes.0.paper_id+库不动）/多父拒/成环拒（DFS——
  单链 A→B→C→A 不经多父面独立检出）/自环拒/zod 行级中文（nodes.0.title+顶层
  nodes 缺失）/空 draft 空图合法/悬空边拒/重复节点+重复边拒/validateDraft 纯
  函数性质（同输入两次 deepEqual）。
- upsertEdge 运行时守卫（W1 宿主，4）：三拒绝路径各自断言中文 reason+库不变
  （自环/多父/成环）+重复边「已存在」中文收口+节点不存在+合法路径放行。
- 其余（1+）：upsertNode 幽灵拒+remove 透传/importFromFile 损坏 JSON 动作型
  中文上抛+合法文件导入。

## locks 实录

unlock（123 解锁——含新测试文件已被目录扫描面捕获）→批内改（本报告受锁面清
单全量）→generate（125 条，新增 3 受锁路径：004_lineage.sql/shared/models/
lineage.ts/lineage-import.test.ts）→apply（125 只读）→locks:check 一致 exit=0。
manifest 变更随本单提交，提交信息须带 [locked-change] 尾注。

## 自裁申报

1. **repo 第六方法 clearGraph()（票面接口清单五方法外的清面原语）**：票面行为层
   明写「替换式导入（清面重灌）」但接口层清单未给清面方法——按「AI-01 六方法
   同型」（deleteByPaper=重灌清面原语的对应物）补第六方法；服务导入器消费它，
   不经 IPC。头注接口段已同步补写。
2. **draft 校验增强三面（票面测试清单外的结构拒绝）**：悬空边（边引用不在节点
   清单的 paper）/重复节点（同 paper_id 两次）/重复边（同 from→to 两次）——
   三者不拒则 paper→node 映射歧义或导入中途撞 DDL 约束出英文错误；归入
   validateDraft 树结构段（path 行级），各配用例。
3. **ImportResult 形状=判别联合** `{ok:true,nodeCount,edgeCount} | {ok:false,
   errors}`：票面「{ nodeCount, edgeCount } | errors: []」两态互斥的忠实建模
   （消费方 INV-13 分支呈现）；zod Res=union 两 strict 分支。
4. **dialog 实现=pickJsonFile 新增于 Dialogs 接口**（主控裁决 2 授权）：pickPdfFiles
   单选同型（openFile+JSON filter）；涟漪=tests/utils/ipc-deps.ts 桩工厂补
   pickJsonFile 桩（类型对账）。
5. **受锁测试涟漪四处**（见文件清单涟漪适配段）：migrate.test 版本清单同步+
   三处桩工厂补位——均为契约扩展必要同步非断言放宽（migrate.test 断言语义
   严格不变：全量应用版本清单精确匹配）。
6. **upsertEdge 更新场景守卫按新端点重估**：input.id 已存在且改端点（=改父）
   时，重复边/多父/环三查均排除自身 id 后重估（reachable 带 excludeEdgeId）；
   非票面明文，改父编辑（LG-03）的语义前提，最小发明。
7. **importFromFile 的 IO/损坏面动作型上抛**（非 errors 数组）：与校验面三态
   分离（文件读不到/JSON 语法坏=操作失败 toast INV-02；结构/数据坏=行级 errors
   清单）——ai-notes-import「损坏 JSON 入 errors」语义差异声明：该先例是逐篇
   批处理（一篇失败不中断整批），本单是单文件全有或全无（文件面失败无「部分
   成功」可言，上抛更忠实）。
8. **删减面 diff 自查**：git diff --stat=15 文件 235+/15-，加未跟踪新增 5 路径
  （004/ipc/lineage.ts/services/lineage//shared/models/lineage.ts/测试）——
   全部在本票交付面+涟漪适配面+invariants.md；未跟踪 dist_new/ 为 2026-08-23
   前历史残留（本会话未触碰，ai10 报告同声明）；无范围蔓延。
9. **工单号引用纪律**：新文件头注一律「LG-01」短式（check-tickets 规则 2——
   翻 done 后全号仅票面登记文件 lineage.repo.ts 自身可引用，该文件头注保留
   全号合法）。

## 疑虑

- lineage.repo.ts 头注接口段仍写五方法清单原文（票面规约原文保留原则）+clearGraph
  补写——收口翻 done 时若主控选择规约头注同步修订（AI-01 先例头注未随 done 更
  新），此处不影响机检。
- upsertEdge 的 listGraph 前置守卫每调用全图单读——个人库图规模（数百节点内）
  无性能面；若 LG-03 大图编辑期出现感知延迟，索引化查询（findEdge by 端点）为
  后续优化项，本单不做（票面接口清单约束）。
- draft year 语义：允许 null（DDL year 可空对齐）+整数校验；若梳理智能体实际
  产物带字符串年份（如 '2021'），将行级拒绝——这是校验面故意收紧（AI 产物应
  结构化），首个真实 draft 走通前无实证数据，留给 LG-03 消费期反馈。
