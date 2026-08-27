# 门一对抗深审 —— 缺陷②修复（标签页哈希名→文献名）

单元：事件驱动缺陷②；模式：三屋门一（ADR-0017 / methodology §4.2）；日期 2026-08-27。
输入：tabs-title-diff.patch（393 行全量）+ tabs-title-impl.report.md + 主控裁决五条 + verify 证据。
方法：diff 逐文件对账 git status；核心实现/契约/DB 迁移/IPC 注册层/locks 脚本亲读；变异红证逐条按测试断言面复算。

## A. 母本符合度（裁决五条逐条）

- [B 无] 裁决①落实：TabState 增必填 `title: string`（reader.store.ts:71-77），makeLoadingTab 新建分支初值 `''`（:145），error 重试经 `...prev` 沿用（:137-140）；hydration `title: d.title`（:277）。
- [B 无] 裁决②落实：tabTitle title 优先+fileName 去扩展名兜底（TabBar.tsx:45-49）；confirmCloseDirty 同型三段兜底（tab-dirty.ts:101-102）。loading/error 占位早返回未动（TabBar.tsx:46-47）。
- [W2] 裁决③落实不完全：TabBar.tsx 头注行为层段内自相矛盾——:7 消费枚举仍写「tabs（每 tab 的 fileName/status）」未加 title，:9 即声明「title 优先」。段内两行声明不一致（同段自洽性破坏；「含缺陷来历」部分已做到 :8-9）。
- [B 无] 裁决④落实：papers.repo 零触碰——git status 恰 15 个 M 文件（对账报告清单全等），`src/main/db/repos/papers.repo.ts` 不在列；fileName=托管基名语义未动（reader.service.ts:54 仍透传 d.fileName；reader.store.test 新用例 :302 断言 fileName 语义不变）。
- [B 无] 裁决⑤落实：9 个受锁测试=夹具补 `title: ''` 单行+4 个新用例（见 C）；unlock→批内改→apply 三轮实录（报告 §5），manifest 132 条与基线同数（diff 仅 10 条 sha 变化+generatedAt，无条目增删）。

## B. 宪法红线

- [B 无] schema 扩展=收紧非放宽：`title: z.string()` 为 required（schemas.ts:39），strict() 语义下新增必填字段只收紧消费方。required 的真链路根基三重闭合：①DB `papers.title TEXT NOT NULL DEFAULT ''`（001_init.sql:12）→ detailById 的 title 恒为 string（papers.repo.ts:48/146/289-298）；②main 唯一组装点透传（reader.service.ts:54，api-surface.ts:38 通道唯一）；③ApiHandlers 返回类型编译期义务（register.ts:22 仅入向 safeParse，出向无运行时校验——既有架构，非本单元引入）。空串合法态由展示层兜底分支覆盖，闭环。
- [B 无] 既有消费方零冲击实证：renderer unwrap 无 zod 校验（client.ts:19-27 纯 Result 解包）→ reader.store.test 的 loadStore(api: unknown) mock 与 ipc/reader.test.ts:9 桩（无 title）运行时不红；619 全绿的申报与机制自洽。
- [B 无] 分层：renderer 四文件仅 import store/共享类型，无 Node/Electron/路径（TabBar.tsx:37-41、tab-dirty.ts:44-46、reader.store.ts:65-69 亲读）。
- [B 无] 行数：reader.store.ts 425 / schemas.ts 356 / TabBar.tsx 160 / tab-dirty.ts 107 / reader.service.ts 85 / 测试最大 reader.store.test.ts 374——全部 ≤500。
- [B 无] UTF-8：file 命令证四关键文件 UTF-8，中文亲读可读。
- [N4] 接缝注记：tab-dirty.ts:13 头注「confirm 文案含文献名」的「文献名」语义已从 fileName 茎漂移为 title 优先（函数内注释 :99-100 已更新，头注未动）——裁决仅指定 TabBar 头注，不算违规，记档备查。

## C. 代码与测试质量

- [B 无] +4 新用例与首红 4 failed 一一对应（报告 §3 四条 FAIL 名单与四文件新用例名全等）；「既有 615 全绿」与行为面零回归申明一致。
- [B 无] 三处变异红证复算全部真实自洽（按测试断言面独立复算）：
  - M1（`!==`→`===`）恰 3 failed=新用例（tab-bar.test.tsx:256）+ 渲染序 toEqual（:93，title='' 夹具显空）+ 关闭叉 aria-label「关闭 甲」空化（:126-127 closeBtn null）——与报告「3 failed、另 2 红同源连带」精确吻合。
  - M2 恰 2 failed=新用例（tab-dirty.test.tsx:253）+ 既有 stringContaining('论文甲')（:167，title='' 变异后文案空化）；:211 组用例仅断言 CalledTimes 不红——吻合。
  - M3 恰 1 failed=reader.store.test.ts:372 独中（其余用例不读 title）——吻合。
- [W1] 变异红证矩阵不完整：4 个新断言面仅 3 个变异点。reader.service.ts:54 `title: d.title` 透传无红证——若删透传，reader.service.test.ts:105 `expect(r.title).toBe('t')` 应红而未执行（缓解：M3 已锚定管道消费端，service 断言直白；但票面「断言级变异红证」口径下单点缺口实存）。
- [B 无] 5 处 makeTab 夹具补 `title: ''` 无恒真风险：默认走兜底分支保持改前行为，既有断言仍测真实输出；新用例 labels[1]（tab-bar.test.tsx:267）显式锁定兜底分支——两分支均有活断言。
- [N1] 兜底边界不对称注记：TabBar tabTitle ready 态无 paperId 终极兜底（title+fileName 双空→''）而 confirmCloseDirty 有三段（tab-dirty.ts:101-102）。ready 不变量（hydration 必写两字段，reader.store.ts:275-277）下不可达；票面仅要求两处「title 优先+fileName 兜底」同型，已满足。防御位深度差异记档。
- [N2] tab-bar.test.tsx:80 既有用例名「标题=fileName 去扩展名」与新规则部分失配（实际断言兜底分支；受锁改名需 [locked-change]，断言仍有效，不值得动）。

## D. 报告诚实性

- [B 无] 15 文件对账零漏报：git status 的 15 个 M 与报告 §2 清单逐文件全等；未跟踪面（dev-launch.cmd / dist_new/ / enr-* / tabs-title-*）=环境预存申报属实。
- [B 无] 「零删减」vs -19 deletions：逐文件复数=manifest 11（generatedAt+10 sha）+ reader.service 2 + TabBar 3 + reader.store 2 + tab-dirty 1=19，全为同位改写（旧 return/注释/形状行被替换），无行为删减、无孤儿文件、无新增未引用文件。
- [B 无] 自裁申报①（契约管道）验证成立，维持主控预裁：改前 readerOpenResSchema 实为三字段（diff 上下文 schemas.ts:33-38 可证）；reader/open 是 title 到 renderer 的唯一通道（api-surface.ts:38）+ reader.service.open 唯一组装点——票面「hydration 处 PaperDetail 可用」与代码事实不符的修正属实，扩展形态=最小必要（schema+透传各一行+注释），无替代方案私货。

## E. 接缝与后续

- [W4] e2e 缺位+接缝声明互斥：本单元改 reader 渲染链（TabBar 显示文本+schema），按 LG-03「e2e 全量跑前移」教训，收口前应跑全量 e2e（20/20 基线，需先 build）——报告疑虑 2 申报在案但未执行。断言面复算风险低：唯一 TabBar 消费点 reader-text.spec.ts:253-254 按 nth 位置定位、error 态按 /打开失败/ 占位名（早返回不变），预计零红；ai-notes-section/lineage 的 tab 断言均限定 reader-aside 容器（侧栏 tab，非 TabBar）。但 reader-text.spec.ts:254 注释「真实 tab 标题=fileRef 基名（sha.pdf）」已与新行为互斥（受锁 spec 注释过时，改需 [locked-change]——宪法接缝归责项，主控裁量：收口单附带或入后续单）。
- [N3] CRLF 疑虑实证排除：check-locks.mjs:60 按原始字节算 sha，但受锁源文件（schemas.ts/tab-bar.test.tsx 等）file 验证均 LF；.gitattributes `* text=auto eol=lf` 保 CI checkout 口径一致——无回溯假绿。残留仅 manifest.json 自身 CRLF（powershell 写出，非自锁文件）→ 收口 git add 归一 LF 后工作树与 blob 行尾不一致，git status 可能持续显示 M 噪音——主控提交后刷新行尾即可。
- [N6] ENR 工单组交叠=零冲突：ENR-01/02 票面（enr-ticketing-draft.md）改动面=shared/models/paper.ts（paperDetailSchema 三 optional）+papers.repo applyEnrichment+corpus/enrich 链；本单元=shared/ipc/schemas.ts+reader 渲染链。文件面无交集；本单元 papers.repo 零触碰，ENR 票面的现状声明（applyEnrichment 增参/detailById 透出）不因本单元失效。双单对 locks/manifest.json 的串行再生成属流程常态。

## 统计

**0B / 4W / 6N**（W1 变异矩阵缺一；W2 TabBar 头注段内滞后；W3 未列——见下补正：reader.service.ts:8「薄取三字段」计数残留为四字段，注释级；W4 e2e 未跑+spec 过时注释互斥）

补正：上段 W3 即 reader.service.ts:8「本层薄取三字段」——实际 open 已取四字段（fileUrl/fileName/title/lastReadPage），头注计数残留错误，注释级一行修。

## 总评

母本五条全落实、自裁①维持预裁（契约管道=扩展形态最小且为唯一正道）、诚实性零瑕疵（15 文件/-19 逐项复数吻合）、变异红证三处复算全真——行为面与流程主干可过。4W 皆为完备性缺口而非行为缺陷：建议处置=W1 补 service 透传单点变异或主控裁示豁免（M3 已间接锚管道）、W2/W3 两行注释级修正（非受锁文件，可并收口提交）、W4 收口前跑全量 e2e 并裁量 reader-text.spec.ts:254 过时注释的 [locked-change] 处置。无回炉必要，按上述附条件送门二。

---

## ── 回炉复核（第 1 轮后定点）──

输入：重生成 diff 包（420 行，16 files +118/-23）+ 报告 §8 回炉节。逐条判定+新破坏扫描：

- **W1 = ADDRESSED**：M4 红证（reader.service.ts:54 `title: d.title`→`title: ''`）恰 1 failed 独中+618 passed+cp 备份还原 DIFF_EMPTY_M4——逻辑独立复算自洽（变异后 r.title===''≠'t' 唯一红；其余 618 用例不经 service 路径）；4 新断言面↔4 变异点（M1-M4）一一对应，矩阵闭合。变异已还原实证：现 diff :120 该行为 `title: d.title`。
- **W2 = ADDRESSED**：TabBar.tsx 头注消费枚举改「fileName/title/status」（diff :134）——:7 枚举与 :8-9「title 优先」段内自相矛盾消除。
- **W3 = ADDRESSED**：reader.service.ts:8「本层薄取四字段」（diff :111）——与 :54 实返四字段（fileUrl/fileName/title/lastReadPage）计数一致。
- **W4a = ADDRESSED**：reader-text.spec.ts 注释更新为新语义（diff :237-238：title 优先/fileName 兜底/缺陷②来历）+「定位不依赖标题文本——按 order 位置」显式声明（防未来误改，优于原仅隐含）；unlock→改→apply 流程+回炉轮 verify EXIT=0 申报在案。**manifest 同步亲验**：sha256 手动抽检四文件（schemas.ts=d40a15…/reader-text.spec.ts=a8ca45…/tab-bar.test=f7aeb6…/reader.service.test=5051cc…）与 manifest 全对账一致——含回炉新改面，locks:apply 真实落地（铁律禁 npm，以此替代 locks:check 强验证）。
- **新破坏扫描 = 零**：①增量数字自洽——16 files（+1=reader-text.spec.ts）+118/-23 较上轮恰 +5/-4（W2 1 行+W3 1 行+W4a 2 行+manifest 1 对 sha）；②行为面五实现文件全部 hunk 与首轮逐一相同（零新增行为改动，回炉纯注释级）；③W4a 新注释与 tabTitle 实现/nth 定位策略语义一致，无新互斥；④UTF-8 中文可读；⑤W4b（e2e 全量）归主控收口亲跑，不在本复核面；⑥首轮 N1-N4/N6 维持主控裁量档不动，已知悉申报属实。

**结论：PASS 送门二。** 统计：W 判定 4 ADDRESSED / 0 NOT ADDRESSED；新破坏 0B/0W/0N（新增）；N 存量 6 维持。
