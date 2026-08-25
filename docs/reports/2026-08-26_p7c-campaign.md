# P7-C 战役报告（2026-08-26）

> 范围：P7-C 笔记结构化重构全役六单（SR2-C-01~06）+ N1 增补交付 + 收官 e2e。
> 前置基线：verify 337 用例/60 文件 + e2e 11/11 + locks 95（2026-08-25 P7-B 终态）。
> 终态基线：**verify exit 0（66 文件 381 用例）+ e2e 12/12 + locks 101 + 工单
> 89 open 0**；INV-20/24 翻已锚定。

## 1. 交付清单

| 单元 | 提交 | 要点 |
| --- | --- | --- |
| 工单化（六张票面） | 9009c13 | 五层规约+状态机前置表；deepseek plan 门 r1 FAIL 3B（diff 缺新文件伪影——add -N 重导）→r2 PW 0B 全采纳；INV-24 入册；机检三拦实录（未存在工单号/data-ticket 占位/行数算法） |
| SR2-C-01 片段序单源 | 671e3ee | compareAnnotations 四键全序（页→偏移→创建序→id）；排序禁字符串字典序（跨位数反例锁定）；createdAt ASCII 字典序（localeCompare 环境依赖证伪不采——deepseek W1）；sortKeyOf 1 基显示 |
| SR2-C-02 corpus 装配 | 5640a3c | R12 单源条款置顶（P7-G 五件套只准延展禁两套）；ADR-0011 v1.1 全口径（无 exportedAt/幂等逐字节/[ai:*] 装配位/多行续行/YAML 对抗面）；corpus/corpusSet 通道+PaperDetailPanel/LibraryPage 入口；B2 证伪（YAML 规范引号标量豁免流指示符）+对抗用例 |
| SR2-C-03 阅读器笔记面 | ff747d4 | save-status 下沉 shared（re-export 过渡→C-06 删壳）；ReaderNotesPanel（ADR-0008 五模块零改动）；per-paper 周期判定字典（B1 跨 paper 污染+W3 切回可见合并处置）；FragmentNotesList（C-01 序+单击上抛+高亮滚动） |
| SR2-C-04 三栏宿主 | a2773d6 | tablist 上移 OutlineAside（坑③容器限定锚）；OutlinePanel mode 化；OutlinePanel 常驻保状态（W1：卸载重挂丢目录树/滚动）；ReaderPage props 削减 249→248 |
| SR2-C-05 N1 定位服务 | 9d28685 | INV-20 三层防线单入口（exact/page/paper）；locateSeq 序号守卫（并发后到胜=旧副作用截断）；S1~S9 九跨格序列（含 seen→absent 被关作废/打开失败作废两形态）；noteHighlight 反向同步（标注单击→切笔记 tab+高亮）；F-aware 接缝由签名承载 |
| SR2-C-06 库侧下线 | a79d163 | NotesPanel 删除（方案切换红线）；「去阅读器写笔记」入口；受锁三面（白名单删行/锁定测试迁径/registry 登记 file 随契约迁移） |
| 收官 e2e+回写 | 本提交 | e2e 第 8 测（三栏切换/划选→片段实时投影/总评 autosave 已保存态/片段单击→locate-flash 闪烁/重启持久 DB 真相源）一次全绿；ROADMAP ✅+INV-24 消费方级收口 |

## 2. 验收清单逐项对账（ROADMAP P7-C 验收行）

- 排序不变量（文档位置序+同段创建序）→ INV-24 已锚定（单测 6 用例+两消费方）✅
- md 导出 golden+机器可读结构断言 → corpus.assemble.test golden 逐字节+结构断言 ✅
- FTS 连续性回归 → notes 写路径不变，381 用例全绿（含 FTS/notes.store 既有锁定）✅
- 跨文献语料集合导出 → corpusSet 通道+LibraryPage 入口（skipped 可见性）——机器锚=ipc 四用例；**手动视检留用户**（选目录→corpus/*.md 落盘）
- textarea 原生 undo 视检+keymap 避让 → keymap editable 避让既有锚（P7-A）；视检留用户 ✅（条款闭环=机器锚+视检清单）

## 3. 双门战绩（全役）

deepseek 十一轮：plan 门 2 轮（r1 FAIL 3B=diff 输入伪影携核验事实重审一次→r2
PW 0B）+ C-01 PW / C-02 FAIL→PW（B1 YAML 换行采纳；B2 流指示符证伪+对抗用例；
一次 900s reasoning 截止复发重试即过）/ C-03 FAIL→PW（B1 跨 paper 周期污染=
接缝归责命中→per-paper 字典）/ C-04 PW（W1 常驻保状态）/ C-05 FAIL→PW（B1
tab 被删中飞未检测→seen→absent+S9）/ C-06 PW（W1 DOI 负向断言）。GLM 二审
七份终审 PASS 全存档 %TEMP%\synapse_workflow\audits\。**回炉均在契约内（每单
≤2 次，无 UNDO-01 型振荡链）**。

## 4. 防线与不变量

- INV-20 翻已锚定（服务单测级 9 用例；跨视图消费方级随 P7-G/P7-H 补）
- INV-24 新登记即锚定（INV-24 全程单测+消费方三面）
- locks 95→101（新增测试文件×5+annotation-order+manifest 同步）
- 机检拦截实录全役：check-tickets 规则 2 连锁×3（去前缀处置）/未存在工单号
  引用/data-ticket 占位缺/行数算法 split 口径（PaperDetailPanel 两轮回压+
  papers.repo 三轮回压+AnnotationLayer 恰满 250）/lint（inline import() 类型
  ×2、未配置规则 disable、未用导入×2）/vi.mock 提升坑×2（vi.hoisted）
- **事故一枚（已修正）**：C-03 提交 `git add -A scripts` 误扫 scripts/audits/
  句柄锁残留（交接书明示留置不跟踪）——amend 剔除（未 push 安全改写）；教训
  入 §5

## 5. 新教训（本役新增）

- **git add 范围纪律**：句柄锁残留目录在 scripts/ 下——staging 一律显式列文件
  （本役 C-03 amend 实录），`add -A <dir>` 需先 `git status` 核对未跟踪面。
- **审计 diff 三坑**：①未跟踪文件不进 `git diff HEAD`（add -N 先行——plan 门
  r1 与 C-03 W1 两度实证）；②受锁文件 apply 后编辑必 EPERM（编辑前确认解锁态）；
  ③manifest 在 apply 后重导 diff（哈希随 apply 变化）。
- **fake timers 驱动法**（C-05 三坑）：轮询循环须并行 advanceTimersByTimeAsync
  （await promise 死锁）；设态后补推进窗；闪烁类摘除定时器与推进量交互
  （断言窗 < FLASH_MS）。
- **React jsdom 驱动法**：受控输入=原生 setter+input 事件；click 派发在子按钮
  （冒泡向上）；vi.mock 工厂引用模块级变量必 vi.hoisted。
- **S7/S9 两形态拆分**：「作废无提示」的判据=可观察终态（error=打开失败已
  toast；seen→absent=被关）——状态机行写「任意非终态」时实现者需两判据齐备。

## 6. 随手验清单（用户）

打开文献→侧栏切「笔记」→划选正文保存高亮→片段列表实时出条目→单击条目看
标注闪烁定位→textarea 写总评看「已保存」→点标注看侧栏自动切笔记+高亮→
库侧详情面板「去阅读器写笔记」一键到位→「导出语料 md」（单篇）与「导出
语料集合」（全库选目录）各跑一次看落盘。

## 7. 下一步

SR2-AI-01~05 逐单（母本=ai-module-plan v1.1；AI-01 起）→ AI-06~10/LG 组随批次
工单化 → C1 穿插。push 决策留用户（本地领先 origin 约 36 提交）。
