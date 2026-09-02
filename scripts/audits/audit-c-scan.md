# AUDIT-C 票 C-3 时序面静态全枚举扫描报告

> 执行形态=B-1 修订：只读子代理（GLM5.3 统一档）全枚举返回→主控落盘本档。
> 子代理：2.40M tok / 52 工具调用 / 625s（2026-09-02 AUDIT-C 首波执行场）。
> 产出审=deepseek 对抗审核位（门一链裁剪版）——审核档=audit-c-scan-review-ds.md
> （1B/5W/3N，「需返工」）→**主控终裁：B-1 不成立，W/N 全采纳，本版=v2 修订版**
> （修订注记见各节〔ds-审 N〕标记；B-1 裁决理由见 §1.2-a #2 补证据段）。
> 行号可核验性：本档在仓库内，行号可被直接验证（deepseek 无仓库访问=审核形态
> 限制；其「无法核验」清单已由主控抽查核过：ReaderPage.tsx:188/workspace.service
> .ts:97/import.service.ts:124/tab-dirty.ts:70-107 均实存无误）。

（纯静态只读；仓库 `E:\class\智慧水务\Synapse_remake`；所有行号为真实读取所得；基线=`docs/invariants.md` 全文 63 条已读）

---

## 〇、扫描对象全集与已读声明

**store 全集（Glob `*.store.ts`，9/9 全读，无其他形态 store 文件）**：
1. `src/renderer/features/library/library.store.ts`（93 行）✔全读
2. `src/renderer/features/lineage/lineage.store.ts`（337 行）✔全读
3. `src/renderer/features/notes/notes.store.ts`（221 行）✔全读
4. `src/renderer/features/reader/ai-notes.store.ts`（72 行）✔全读
5. `src/renderer/features/reader/reader.store.ts`（470 行）✔全读
6. `src/renderer/features/settings/corpus-export.store.ts`（95 行）✔全读
7. `src/renderer/features/settings/settings.store.ts`（83 行）✔全读
8. `src/renderer/features/tags/tags.store.ts`（60 行）✔全读
9. `src/renderer/features/workspaces/workspace.store.ts`（108 行）✔全读

**辅助模块（写路径归属，全读）**：`reader/annotation-undo.ts`（196 行）、`reader/scroll-progress.ts`（348 行）、`reader/tab-dirty.ts`（107 行）、`reader/open-paper-anchor.ts`、`shared/open-paper-bus.ts`、`shared/keymap.ts`（头注+结构）、`preload/index.ts`（46 行）、`shared/ipc/api-surface.ts`（181 行）。

**组件级写路径（全读）**：`reader/SelectionLayer.tsx`（249 行）、`reader/AnnotationLayer.tsx`（80-209 行写路径段）、`reader/ReaderPage.tsx`（60-179 行装配段）、`library/ImportDropZone.tsx`（145 行）、`library/MetaEditDialog.tsx`（85-125 行）、`tags/TagEditor.tsx`（40-120 行）、`app/App.tsx`（205 行）、`app/TitleBarControls.tsx`（55-105 行）、`settings/useExportCorpusEvents.ts`（69 行）。

**main 侧互斥证据（全读）**：`services/workspaces/workspace.service.ts`（80-200 行）、`services/import_/import.service.ts`（284 行）、`data-layer.container.ts`（95 行）、`bootstrap.ts`（1-219 行）、`services/index.ts`（147 行）、`services/reader.service.ts`（85 行）、`services/ai_sensor/ai-notes-import.service.ts`（头注行为层）。

**未读（明确标注）**：`CorpusExtractor.ts` 全文（仅读注释面 7-77/271-277 行防御分支）、`LineageSidePanel.tsx` 内部 stale 实现细节（仅确认头注声明「定位防 stale 守卫参照 anchor-locate.ts:122 locateSeq 同族」，LineageSidePanel.tsx:18）、`NotesPanel`（notes 域另一消费方）全文、`WorkspaceSection.tsx`、`LineageBoard/LineageCanvas` 组件态、`ipc/register.ts` 全文（仅读 51 行 handler 注册形态）。〔ds-审 W-4 收敛：以上未读面只保证「不影响**已读面**结论」——A3 的「timers 无外部取消口」结论仅基于 notes.store.ts 已读实现，NotesPanel 若持有/清理 timer 未核验（域互引面 tab-dirty.ts:85 白名单声明使其概率极低，但未闭环即如实标注）；不作全局断言。〕

---

## 一、组①：全部 store 的 async 写路径三态总表

三态口径：守卫**在场**=busy 标志/单飞互斥/序号失效检查中至少一种且覆盖该 await 窗口；**缺席**=窗口内他动作可并发进入且恢复写回不核对世界；**不确定**=守卫部分覆盖或证据不足以闭环。

### 1.1 逐 store 逐动作

| store.动作 | 方向 | 三态 | 证据（文件:行号）| 后果推演（可达性×级别）|
|---|---|---|---|---|
| notes.load | 读 | 守卫在场 | notes.store.ts:113-117（全局 loadSeq，成功/失败双路丢弃 :157）| — |
| notes.edit | 同步写内存 | 守卫在场 | notes.store.ts:162-174（同步无 await 窗口；editSeq 打点 :168）| — |
| notes.saveSoon（防抖→save） | **写 DB** | **守卫缺席**（无世界核对）| notes.store.ts:176-217：timer 回调（:183-216）读 `get().noteByPaper[paperId]` 后直发 `api.notes.save`（:192-194）——**不核对该 paper 的 tab 是否已关、课题是否已切换**；无 cancel API；`timers` 闭包（:84）无外部清理口 | 见 §1.2-a（A3 主体），W 级 |
| reader.openPaper | 读（写 tabs）| 守卫在场 | reader.store.ts:210-217（loadSeq 总序+tabLoadSeq per-tab+isCurrentLoad 三规则）、:295/:297/:313（三个 await 后三处核对）、:277-280（loading 重入尾随 inflightOpen）| — |
| reader.undo | **写 DB+写 tabs** | **守卫在场**（写方向守卫最佳样本）| reader.store.ts:439（paperId await 前捕获）、:456-459（await 后核对 tabs[paperId] 存在，tab 被关→不追写）；互斥=annotation-undo.ts:142（per-paper Set）、:146-154（busy 拒绝）、:181-184（按身份移除防下标漂移）、:125-137（remapStackIds 按 = 身份跳过）| — |
| reader.*（setPage/setZoom/addAnnotation 等旧 setter）| 同步写内存 | 守卫在场（结构性）| reader.store.ts:220-226（updateActiveTab：activeId=null/tab 缺席 no-op）| 追加路径的**异步消费面**见 §1.2-c |
| reader.closeTab/close（触发 progressFlusher.flush）| **写 DB（进度）** | 守卫在场（尽力而为语义）| reader.store.ts:231（flush(id)）；scroll-progress.ts:245-250（flushPending 立即落账）、:133-142（saveOne 双路吞错——进度非关键数据规约）| 切课题后迟到进度写：UPDATE 不存在 id=0 行影响（reader.service.ts:80-83→papers.updateReadPage），静默无害，N |
| workspace.load | 读 | 守卫在场 | workspace.store.ts:75-87（loadSeq 双路丢弃）| — |
| workspace.create | 写（main）| 守卫在场（main 侧）| renderer 无守卫（workspace.store.ts:89-94）；main=workspace.service.ts:151-152（busy 单飞，CONFLICT 中文）| 并发 create 双击→第二个被 main 拒，toast 可见，W→实际无感（N~W）|
| workspace.rename | 写（main）| 守卫在场（main 侧+写回安全）| workspace.store.ts:95-98：await 后 `set({items: get().items.map(...)})` **现取非快照**——不覆盖期间 load 刷新；main 侧 busy=workspace.service.ts:165-166 | — |
| workspace.switchTo | 写（main+reload）| 守卫在场（幂等+confirm+main busy）| workspace.store.ts:100（幂等直返）、:101（同步 window.confirm 阻塞）、:102-104（switch→reload）；main=workspace.service.ts:181-197（busy 互斥+关旧→指针→装配时序）| reload 前 in-flight 窗口见 §1.2-a/§1.2-b |
| lineage.load | 读 | 守卫在场（含写读互锁）| lineage.store.ts:235-256（seq+**flushing/queue 未清空丢弃** :242-244——写回填面为准，写读竞态窄窗防御）| — |
| lineage.enqueue→flush（全部 12 个写动作）| **写 DB** | **守卫在场**（写方向最完备的 store）| lineage.store.ts:125-131（enqueue 合并=最后写胜出）、:175-179（flushing 单飞互斥）、:185（按动作身份出队——flight 期间同实体合并替换不误删）、:187-192（CONFLICT 拒绝型丢弃不卡队头）、:194-198（系统型失败队首保留可重试=INV-04 同型）| flush 写回填 set 无世界核对，但 lineage 是全局单图（无 per-tab 语境）+切课题走 reload 且 dirty 在退出聚合（App.tsx:113）——弃改语义闭环，N |
| tags.refresh | 读 | 守卫在场 | tags.store.ts:43-50（loadSeq 双路丢弃）| — |
| tags.attach/detach/upsert（TagEditor 组件级）| **写 DB** | 守卫在场 | TagEditor.tsx:57-67/:71-90/:93-104（busy useState 单飞+disabled）；写回=onChanged 刷新（无本地态写回可错位）| — |
| settings.load | 读 | 守卫在场（版本计数变体）| settings.store.ts:55-61（settingsSeq，仅 save 成功抬升 :71——跨通道乱序两类窗在档 :43-48）| — |
| settings.save | **写（settings.json）** | 守卫**不确定** | settings.store.ts:63-76：**无 save 间互斥**（saving 标志仅驱动 UI，不拒并发 save）；版本计数只防「load 旧快照覆盖 save 终态」，**不防 save₁ 旧全量迟到覆盖 save₂**（ipcMain.handle 对 async handler 不序列化——register.ts:51 注册形态+settings.store.ts:43 机事实在档）| 快速连点两档：save₂ 落地后 save₁ 若交错迟到→档位回跳。可达性=低频（需毫秒级连点）×后果=**W**（可恢复：重点一次即正）。注意 INV-39「一切 set 调用必须组装全量」放大此面：全量写互相整体覆盖 |
| corpus-export.start | 写（会话）| 守卫在场（双层）| corpus-export.store.ts:69（busy 单飞拒绝）+ main 侧 EXPORT_BUSY 折叠（头注 :15-17，INV-18）| — |
| corpus-export.applyProgress（事件写回）| 写内存 | 守卫在场 | corpus-export.store.ts:89（busy=false 忽略）+:92（sessionId 跨会话迟到过滤——门一 N1）| — |
| ai-notes.loadNotes/loadObserve | 读 | 守卫在场 | ai-notes.store.ts:50-61（notesSeq/observeSeq 双路丢弃）| — |
| ai-notes.requestRead | 写（job 文件）| 守卫在场（幂等服务保证，UI 无锁=声明性）| ai-notes.store.ts:64-66（透传无锁）+头注 :5-8（「不置 busy 锁、重试幂等由 06 服务保证」）；UI 侧 disabled=observe 三态（AiNotesSection.tsx:151,215）| — |
| ai-notes.importAll | **写 DB** | 守卫在场（UI disabled+幂等账本）| ai-notes.store.ts:68-70 透传；AiNotesSection.tsx:151/:215（busy disabled）；main 幂等=ai-notes-import.service.ts 头注（archive 账本 sha256 三路径）| 残余理论窗：两次并发 importAll 交错「双删双插」可双套（毫秒级+需绕过 disabled 狂点），下次 importAll 走 skipped 不自愈双套——**N**（理论面，无用户路径） |
| library.load/setQuery/selectPaper/openPaper | 读/同步 | 守卫在场 | library.store.ts:63-77（loadSeq 双路丢弃）；openPaper 经 bus（:89-91）| — |
| library.updateMeta（MetaEditDialog）| **写 DB** | 守卫在场 | MetaEditDialog.tsx:89-90（busy 拒绝）、:106-113（await→onSaved 回调）；Dialog 模态天然互斥 | — |

### 1.2 三条特别核验（二波立案依据素材）

#### a) A3 = notes.store 防抖悬置写【守卫缺席，实锤】

**写路径形态**（notes.store.ts:60,84,176-217）：`SAVE_DEBOUNCE_MS=1500`；`timers: Record<paperId, timer>` 为 store 工厂闭包（:84），**模块生命周期=页面生命周期，无任何外部取消口**；timer 回调取 `get().noteByPaper[paperId]`（:185）后直发 `api.notes.save`（:192-194）。editSeq 守卫（:190,:200）只防「成功回调误清 pending 标记」，**不防悬置写本身**。

**三个用户路径逐一推演**：

1. **弃改（关脏 tab）后防抖回调仍落笔**：`confirmCloseDirty`（tab-dirty.ts:97-107）文案明示「关闭后将丢失未落库部分」——用户确认丢弃；`reader.store.closeOne`（reader.store.ts:229-259）清了 tabLoadSeq/inflightOpen/撤销栈（:233-235），**但不触碰 notes.store**（域互引红线——tab-dirty.ts:85 注释「本模块是 reader 域唯一 notes.store 引用点」且仅读 pending）；tab-dirty.ts:70-71 注释自认「已关闭 tab 的 pending 草稿残留（noteByPaper 不驱逐）」——**残留的不止草稿，还有在途 timer**。关 tab 确认后 ≤1.5s 内 timer fire→写 DB 成功。用户重开该 tab：load 读回「已保存」的内容=已确认丢弃的内容**复活**。DB 无损坏、数据方向是「多保存非丢失」。定级：**W**（需特定序列：有未落库笔记编辑+关 tab 确认丢弃+重开；后果=状态与用户预期错乱，可手动清空恢复）。
2. **切课题（switchTo 确认弃改）竞窗**：INV-35④ 在档口径复核成立，且比册面描述更精确的双路径：switchTo（workspace.store.ts:101-104）confirm 是同步阻塞（期间 timer 排队不 fire）→`api.workspaces.switch` in-flight/完成→**reload 尚未发生**（renderer 仍活着）→悬置 timer fire→`api.notes.save` 发出。main 侧该 invoke 经 facade（bootstrap.ts:148 `services: container.services`，liveProxy=data-layer.container.ts:60-71「访问即取当前」）→ 若 switch 已完成：打到**新层 service/新库**→notes→papers FK+`foreign_keys=ON`（INV-25 连接级 PRAGMA）拒绝→reject→catch 静默复位（notes.store.ts:211-215）→**INV-35④ 偶然兜底实锤**；若恰在 closeCurrent 前进入：写落旧库（保数据，切回可见——与「弃改」预期不符但非丢失）。定级：**W，且已在档接受**（INV-35④ 明文「无 FK 新表接入课题切换面须显式防悬置写」——这正是二波修票的架构条款依据）。
   **〔ds-审 B-1 主控终裁：不成立——同 id 命中路径加密级不可能〕**deepseek 挑战：FK 只挡「paperId 不存在于新库」，若新库存在**同 id paper** 则悬置写错落新库（旧课题草稿覆盖新库同 id 文献的笔记）——击穿「FK 兜底」降 W 依据。**裁决证据链：paperId 跨课题全局唯一=结构性事实非假设**——①迁移政策单源：`001_init.sql:3`「主键一律 TEXT uuid（crypto.randomUUID 生成）」；②生产插入位唯一=import.service.ts:124 `id: randomUUID()`（ai-notes-import.service 同源 randomUUID）；③无任何共享 id 空间来源（无自增/无跨库复制）。UUID v4 同 id 命中概率 ≈2⁻⁶¹/对=加密级不可能；e2e 种子行硬编码 id（'e2e-seed-paper' 等）为测试夹具，不入用户路径。**结论：FK 拒绝在用户路径上成立，A3 维持 W 定级，「无 ≥B 级」恢复成立**。B-1 的正确内核=原报告未给此证据（已补）+「天然 no-op」类缓解应显式声明 id 唯一性依赖（§1.2-c 已按 W-3 修订）。
3. **saveSoon 并发 in-flight 交叠**：timer fire 即删句柄（:184），保存中用户再 edit→新 timer→1.5s 后第二个 save 发出，第一个可能仍在途。两 save 载荷均为各自派发时刻快照（新者内容新）。本地 IPC+SQLite 同步写使乱序窗口毫秒级，且 ipcMain.handle async handler 理论可交错——若旧请求迟到落库，DB 终值=旧内容=**丢最新编辑**。定级：**N→W 边界**（理论面为主：本地往返 1-3ms 内需完成「edit→防抖到期→二连写交错」，无 realistic 用户路径；但与 settings save 同族机事实在档）。

#### b) D4 = import in-flight × workspace switch 互斥【守卫缺席，实锤】

- **main 侧**：workspace.service.ts:97 busy 标志的互斥入口仅 create（:151）、rename（:165）、switch（:182）三方法（同实例内）；**import.service.ts 全文无 busy、无库切换感知、无取消**（import.service.ts:1-284）。「switch/create/rename 变更互斥单飞」的守卫集合（INV-35②）不含 import——**互斥不存在，已证**。
- **renderer 侧**：ImportDropZone.tsx:71/:81-83/:126/:131 busy 守卫只防**重复点击导入**，不拦 workspace switch（切换器在顶栏 WorkspaceSwitcher.tsx:47-53，独立 busy，二者无交集）。
- **机制链（谁持有哪个引用）**：bootstrap.ts:91-125——`assemble` 闭包每次装配都 `createServices({repos, fileStore,…})`（:98），即 **import.service 的 `deps.repos/deps.fileStore` 是发起时刻那一层的闭包引用，不是热换 facade**（facade 只覆盖 IPC 入口 bootstrap.ts:148）。switch 时序（workspace.service.ts:190-193）=`closeCurrent()`（data-layer.container.ts:90-93：`db.close()`+current=null）→写指针→`assembleInto` 新层。
- **后果链**：in-flight 批的后续文件——`fileStore.storePdfFromPath` 继续成功写**旧课题库 files/ 目录**（fs 无句柄，closeCurrent 不影响）；`repos.papers.findBySha256/insert` 走**已 close 的旧 db handle**→抛错→importOne catch 折叠 failed（import.service.ts:147-151 尽力而为）→批耗尽→invoke resolve→**renderer 已 reload，回复无人消费，无任何 toast**。净效应：①旧库 files/ 残留无 DB 行的孤儿分桶文件（内容寻址，切回重导同文件 sha 复用，非永久垃圾但无清理面）；②用户视角导入静默消失（源文件只读未动，可重做）；③switch 装配窗（current=null）内在途其他 IPC 经 facade 抛「课题数据层未装配」（data-layer.container.ts:76-80）——workspace.service.ts:25 头注自认「装配失败=当前层已关，后续库调用报错」。定级：**W**（低频：大文件夹导入分钟级窗内切课题×后果=导入结果静默丢失可重做+旧库孤儿文件；无数据损坏/已有数据丢失）。
- **附带发现（进度事件乱序面）**：`ImportProgressEvent` 载荷**无 sessionId**（preload/index.ts:27-31；api-surface.ts:117 通道），ImportDropZone.tsx:77 订阅回调无条件 `setProgress`——reload 后新页面会收到旧会话残留事件（busy=false 不显示，:138 渲染门）；但若用户 reload 后立即再发起导入，旧会话事件会污染新会话进度显示。**同族修复先例=corpus-export.store.ts:92 的 sessionId 过滤（门一 N1），import 面未同步修**。定级：N~W。

#### c) A1 残余盲区 = INV-03 stale-guard 只锁 load 方向——save/undo/edit 写方向清点

结论：**写方向守卫覆盖呈三档分化，无 B 级缺口，一处明确不一致**。

- **写方向守卫在场**（可直接作修复范式）：reader.undo（paperId 捕获+await 后 tab 存在核对+per-paper busy Set，reader.store.ts:439,456-459+annotation-undo.ts:142-194）；lineage flush（flushing 单飞+身份出队+CONFLICT/系统型分流，lineage.store.ts:175-202）；AnnotationLayer.saveComment/deleteAnnotation（busy useState+markTabDirty/clearTabDirty/pushUndo 全部**参数化 paperId**，AnnotationLayer.tsx:131-151,166-186——且 `updateAnnotation/removeAnnotation` 走 map/filter 按 id 匹配，写错 tab 时为 no-op〔ds-审 W-3 口径修订：这是**依赖 id 全局唯一的缓解非守卫**——annotation id 同为 randomUUID 单源（annotations.repo randomUUID 同族+迁移政策 001_init.sql:3），跨 tab 同 id 命中=加密级不可能，故缓解实际成立，但属性应如实标「缓解」〕）。
- **写方向守卫缺席（reader 标注写方向内唯一实锤〔ds-审 W-1 收敛表述：全文范围另有 notes.saveSoon/D4 两处缺席，见 §1.2-a/§1.2-b〕）**：`SelectionLayer.save`——busy 在场（SelectionLayer.tsx:88,199-209），但 await `api.reader.saveAnnotation`（:211）后 `onSaved(saved)`（:212）接线为 `onSaved={addAnnotation}`（ReaderPage.tsx:188），而 `addAnnotation` 经 **updateActiveTab 追加**（reader.store.ts:390-392）——**不核对 activeId 是否仍为发起时的 paperId**。await 窗口（本地毫秒级）内切 tab→A 的标注被追加进 B 的 tab.annotations（幽灵标注，内存态；DB 写正确落 A 行）。重开 B tab 从 DB 重载自愈。定级：**W**（需毫秒级窗口完成「点保存+点另一 tab」双击×可恢复）。**与 undo 的正确做法构成同文件内不一致——修复模式现成（照抄 undo 的 paperId 捕获即可）**。
- **写方向不确定**：settings.save 并发交错（见 §1.1 表——〔ds-审 W-2 口径修订：renderer 侧无 save 互斥=**守卫缺席**（saving 标志仅驱动 UI）；「ipcMain.handle 对 async handler 不序列化」为 Electron 通用机事实（settings.store.ts:43 头注在档），main 侧 handler 具体交错形态未读=未闭环；另〔ds-审 N-3〕finally 无条件复位 saving 使交叠时可提前放行第三个并发〕）；ai-notes.importAll 双发交错（理论面）。

---

## 二、组②：IPC invoke 往返窗口内 renderer 侧状态消费

invoke 通道全集=api-surface.ts:30-112（13 域 38 通道）。逐一复核「回复到达时语境是否已切、写回前是否核对」：

| 调用点 | await 后写回 | 语境核对 | 证据 |
|---|---|---|---|
| 各 store load（library/tags/notes/workspace/lineage/ai-notes/reader.openPaper）| 写 store 域数据 | **守卫在场**（INV-03 五 store+per-tab+useAsync+settings 版本计数，全部实读核对，见 §1.1）| §1.1 表 |
| TitleBarControls get-state 初值 vs windowState 事件双通道乱序 | setMaximized | **守卫在场**（迟到应答仅在 unknown 态生效——TitleBarControls.tsx:70-74「门一 C1」+alive 门 :78-80）| 组②最佳样本 |
| PaperDetailPanel detail（useAsync）| 局部 data | 守卫在场（useAsync 请求令牌，INV-03 在册）| PaperDetailPanel.tsx:78-79 |
| MetaEditDialog updateMeta | onSaved 回调 | 守卫在场（Dialog 模态互斥+busy）| MetaEditDialog.tsx:106-113 |
| corpus-export.start | busy/phase 终局 | 守卫在场（busy 单飞+main EXPORT_BUSY）| corpus-export.store.ts:68-84 |
| SelectionLayer.save | onSaved→addAnnotation | **缺席**（§1.2-c 幽灵标注面）| SelectionLayer.tsx:211-212 |

**INV-22 窄窗复核（重点）**：链=tab dirty（TabState.dirty+notes pending 镜像，tab-dirty.ts:74-79）∪ lineage dirty（lineage.store.ts:96-98）→ App.tsx:112-114 聚合 → 变化沿 effect（App.tsx:137-140）push `system/set-quit-dirty` → main 缓存值为 close 守卫唯一判定源（bootstrap.ts:199-214）。窄窗=「最后一个 dirty 信号置位→store set→React commit→effect→invoke 到达 main」的一个微任务帧+一次 IPC 往返，期间用户点 close→main 读到旧值 false→直接放行→**丢未保存数据**。**窗口面有无扩大复核**：逐一检查 dirty 信号源置位路径——TabState.dirty 由 markTabDirty 同步 set（reader.store.ts:408-411）、notes pending 由 edit 同步置位（notes.store.ts:173）、lineage saveStatus 由 enqueue 同步置 'saving'（lineage.store.ts:127-129）——均为同步 set，无新增「先 await 再置位」的滞后跳（notes save 失败路径 pending 早在 edit 已置位，不新增跳）。lineageDirty 是 saveStatus 派生，enqueue 同步。**结论：接受判据仍成立，窗口面无扩大**（INV-22 在档「push 一跳延迟 deepseek r2 WARN 存档，pull 更差不采」维持）。

组②标注：**已完成**（38 通道中 renderer 侧实际消费的写回点全数清点；main 侧 handler 内部时序未逐通道深审——api-surface/register 形态已读，settings 跨通道乱序机事实引用在档 settings.store.ts:43-48）。

---

## 三、组③：事件桥「发出时快照 vs 消费时现态」全链

**main→renderer 事件全集（preload/index.ts:25-42）=3 个**；renderer 内部事件监听装配面另列。

| 事件 | 载荷（快照性）| 消费方 | 快照/现态假设核对 | 挂载时序 |
|---|---|---|---|---|
| `onImportProgress`（api-surface.ts:117）| {phase,current,total,fileName}——**无会话身份** | ImportDropZone.tsx:77 `setProgress`（无条件写 state）| 载荷为纯进度事实，无现态假设；**但无跨会话迟到过滤**（对照 corpus-export sessionId 修复，§1.2-b 附带发现）——reload 后新组件收旧会话事件，渲染被 busy 门挡住（:138），新会话进行中被旧事件污染进度文案=理论窗 | 订阅/退订成对（:76-79 useEffect cleanup），INV-14 在册 |
| `onExportCorpus` | {type:'progress'\|'extract-request', sessionId,…}——**携带会话身份** | useExportCorpusEvents.ts:45-51：progress→applyProgress（busy+sessionId 双过滤在 store，corpus-export.store.ts:89-92）；extract-request→CorpusExtractor.handleEvent | **守卫在场**：sessionId 过滤+CorpusExtractor extracting 态防御分支（CorpusExtractor.ts:271-277「sessionId 不同=日志+忽略」）+INV-18 deferOutcome 串行时序（事件先于回复到达时提取器不永久丢请求——e2e 2026-08-27 实证在档）| App 根挂载一次（App.tsx:117），卸载成对 off（useExportCorpusEvents.ts:64-67），INV-14 已锚 |
| `onWindowState` | {maximized}——瞬时状态量 | TitleBarControls.tsx:77 setMaximized | 载荷=最新状态非快照，消费即写——正确方向；**invoke 应答 vs 事件跨通道乱序有守卫**（迟到应答仅 unknown 态生效，:70-74）| 成对退订+alive 门（:78-81）|
| renderer 内部：`OPEN_PAPER_EVENT`（window CustomEvent）| {paperId,anchor?,aiNoteId?}——发出时快照 | 双路：实时监听（ReaderPage.tsx:108-115）+**闩锁补读**（takePendingOpenPaper，open-paper-bus.ts:52-55）| 快照载荷消费无现态假设；**LG-08 同族对照模式本体**：修复=「监听器注册必须先于闩锁消费」（ReaderPage.tsx:8 头注+107-113 实序：addEventListener→takePendingOpenPaper）——防 openFromBus→locateAnchor→waitOpen 同步重发事件②自丢失→8s 超时。**此模式（先注册后消费闩锁）应作为一切「事件+闩锁」装配面的审查清单项** | 成对清理（:114）|
| renderer 内部：document keydown（keymap.ts）| 事件无载荷快照 | 模块级单例，register/unregister 成对（keymap.ts:43-48，INV-14 锚点，12 用例在册）| 无快照面 | 监听与绑定表共存亡 |
| renderer 内部：SelectionLayer 四监听（selectionchange/mousedown/mouseup/keydown）| 拖选坐标闭包（downX/downY）| SelectionLayer.tsx:181-193 | 卸载清理+setPending/setPaint 复位（:191-192）成对 | 成对在位 |

**组③结论**：3 事件桥中 exportCorpus/windowState 双守卫在场；**importProgress 是唯一无会话身份+无迟到过滤的事件通道**（与 D4 附带发现同根）；renderer 内部装配面（keymap/SelectionLayer/open-paper-bus/scroll-progress keydown 接管 scroll-progress.ts:341-347）成对清理全部在位（INV-14 已锚定的四处+本扫描核对无第五处缺口）。

---

## 四、附带（架构批 W7 欠账）：组件态空间表

### PageColumn.tsx（src/renderer/features/reader/PageColumn.tsx，249 行）

| 态（useState/useRef）| 行号 | 驱动源 | 主要迁移 |
|---|---|---|---|
| pageSizes: PageBoxSize[]\|null | :92 | 就绪管线（doc/totalPages 变化）| null→sizes→（doc 换/null 重置 :106）|
| visible: Set&lt;number&gt; | :93 | IO 回调（:144-155，same 短路防重渲）| 可见集增删→调度效应 |
| rendered: Set&lt;number&gt; | :94 | 调度效应（:169-175）| 窗口并入+离屏回收（recycledPages）|
| sizesError: boolean | :96 | 管线失败（:123-126）| false→true 终态→error 分支渲染（:217）|
| liveScrollTop: ref | :98 | 容器 scroll 镜像（:187-196）| 每次滚动更新→zoom 锚消费 |
| prevZoom/prevLayout: ref | :99,:101 | zoom/layout props 对照位 | 变化检测驱动段⑥修正/:134-139 重报 onReady |
| 回调 latest-ref（onReady/onVisible/onError）| :83-88 | 父层内联函数 | 恒定身份不触发管线重跑 |
| props 驱动态 | :57-76 | doc/totalPages/zoom/layout/scrollRequest/renderWindow/recycleWindow | 见六段行为层（头注 :14-21）|

**事件迁移要点**：就绪管线 cancelled 守卫在场（:107,:112,:117,:124,:128——doc 切换旧管线作废）；IO 三态（observe/disconnect/same 短路）；段⑤程序滚动（:179-184 scrollRequest→scrollIntoNearestScroller 'start'）；段⑥ zoom 锚（:200-215 useLayoutEffect 程序修正 scrollTop）。布局态状态机（loading→ready；每页 empty→rendering→rendered→recycling）在头注 :20 声明并由 PageBox 承载。

### SelectionLayer.tsx（src/renderer/features/reader/SelectionLayer.tsx，249 行）

| 态 | 行号 | 驱动源 | 主要迁移 |
|---|---|---|---|
| pending: PendingSelection\|null | :86 | evaluate（mouseup/防抖 settled）| null↔{anchor,pageNo,x,y}；Escape 只清 pending（:177-178，INV-37）；卸载复位（:191）|
| paint: PaintSelection\|null | :87 | evaluate 双路（visualOnly 节流/全量）| 选区真清除→null（:103-131 六个拒绝/坍缩分支全清）|
| busy: boolean | :88 | save 流程 | save 期间 true 防重入（:199-209）|
| color/setColor | :90-91 | reader.store active tab | 工具条换色直写 store |
| downX/downY（effect 内 let）| :155-158 | mousedown 闭包坐标 | F-12 位移阈值判定（:166-173）|
| toolbarRef | :92 | 工具条 DOM | mouseup 归属判定（:163）|

**事件迁移要点**：selectionchange→scheduler 双路（createVisualScheduler leading+trailing，:149-153）；mouseup→evaluate(true)（跨页 toast INV-02，:109-112）；save 成功→removeAllRanges+层随清（:217-220）；失败→markTabDirty+toast（:221-224）。effect deps=[pageRoot,paperId]（:196），重挂清态。

---

## 五、≥B 级候选专节

**结论：本次全枚举未发现新增 ≥B 级（丢数据/崩溃/损坏）候选。** 二波修票立项依据为以下 W 级清单（按推荐优先序）：

1. **A3（W，主候选）**——notes.saveSoon 悬置写无世界核对（notes.store.ts:176-217）：关脏 tab 确认丢弃后 ≤1.5s 防抖仍落笔（复活面）+切课题竞窗（INV-35④ FK 兜底=架构性脆弱：**兜底依赖 notes→papers FK 存在，INV-35④ 自己已写明「无 FK 新表接入课题切换面须显式防悬置写」**——建议修复=minimal cancel API（store 增加 `cancelPendingSave(paperId)`，reader.closeOne 与 workspace.switchTo 确认后各接一行；域互引经既有白名单点 tab-dirty.ts 同型）**+〔ds-审 W-5 补强：cancel 只清未 fire 的 timer，不覆盖「timer 已 fire、save 已在途」路径（saveSoon :183-184 fire 即删句柄）——完整修法须补 in-flight 代际检查（保存回调核对课题代际/tab 存活）或 main 侧归属校验，二波修票票面按此三件套设计**。
2. **D4（W）**——import in-flight × workspace switch 互斥不存在（import.service.ts 无守卫 × workspace.service.ts:97 busy 不含 import）：后果=导入结果静默丢失（reload 后回复无人消费）+旧库孤儿分桶文件；建议=switch busy 扩面收 import in-flight 标志，或 import 进度事件加 sessionId 并在 switch 时折叠。**〔ds-审 N-2 合并〕附带发现 ImportProgressEvent 无会话身份（§1.2-b 末+组③）与本项同根=「import 会话身份缺失」，修票一并覆盖（corpus-export.store.ts:92 sessionId 过滤为先例）**。
3. **SelectionLayer.save→addAnnotation 无 activeId 核对（W）**——同文件 reader.undo 已有正确范式（:439），照抄 paperId 捕获即可；毫秒窗×可恢复。
4. **settings.save 并发无互斥（W~N）**——renderer 侧守卫缺席（saving 仅驱动 UI）；全量写互相整体覆盖（INV-39 条款放大）+finally 复位放大窗（N-3）；建议 saving 期间拒绝或合并；main 侧 handler 交错形态未读=二波实证子项。
5. （已并入 D4 第 2 条，不再单列。）

**为何无 B 级**（定级理由必须给足；〔ds-审 N-1 补条件〕）：所有「守卫缺席」写路径的共同缓解结构=①写目标按 id 寻址（FK/UPDATE-0-行/map-filter——**成立条件=id 不跨课题命中，由 UUID 单源生成器结构性保证**（001_init.sql:3+import.service.ts:124 randomUUID，同 id 命中=加密级不可能；B-1 终裁在 §1.2-a #2），故缓解实际成立）；②切课题统一走 `location.reload()`（ADR-0018，workspace.store.ts:104）清空一切 renderer 态，竞窗只剩 reload 前毫秒级；③两大弃改面（关脏 tab/切课题）均有 confirm 门（tab-dirty.ts:106/workspace.store.ts:101）——数据方向是「多保存」而非丢失。唯二可能丢数据的路径（INV-22 一跳窄窗、import×switch 静默丢失）前者在档接受（判据复核仍成立）、后者源文件只读可重做。**deepseek 审曾以此挑战「无 B 级」结论——终裁：挑战不成立（UUID 证据链补齐后缓解①恢复成立），「无 ≥B 级」结论维持。**

**未闭环项（不确定三态，如实移交）**：settings.save 交错终态（W~N 边界，需 main 侧 ipc/settings.ts handler 时序实证——未读该文件）；ai-notes.importAll 双发双插（N，需绕过 disabled）；CorpusExtractor 全文与 LineageSidePanel 内部 stale 实现（头注声明在，细读未完成）；NotesPanel（notes 域另一消费方）全文未读。
