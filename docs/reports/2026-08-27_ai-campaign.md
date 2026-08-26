# P7-G 应用面第一批（AI 传感器链条）战役报告（2026-08-27）

> 范围：SR2-AI-01~05 五单全役（ai_notes 数据基座→提取管线→五件套导出会话→
> 设置页入口/e2e 全链→zcode 工具骨架）。
> 前置基线：verify 68 文件 389 用例 + e2e 12/12 + locks 105（2026-08-27 工单
> 化前——1516a97 五票面 plan 门两轮后）。
> 终态基线：**verify exit 0（71 文件 432 用例）+ e2e 13/13 + locks 110 + 工单
> 94 open 0**；INV-16/17/18/25 锚定+INV-14 扩面（事件订阅同族）。

## 1. 交付清单（全役）

| 单元 | 提交 | 要点 |
| --- | --- | --- |
| 工单化（五票面） | 1516a97 | 五层规约+会话状态机前置表（ai-plan-review §6 母本）；deepseek plan 门 r2 PW+GLM 二审；通道名冲突预警（母本 export/corpus 已被 C-02 占用——AI-03 兑现更名 corpus-session） |
| SR2-AI-01 数据基座 | 222962c | 迁移 003+ai_notes.repo 六方法；一行一锚定段×一问（N2）；自持锚定三元组与 annotations 解耦（D3）；INV-25 级联语义（CASCADE/SET NULL）单测锚定 |
| SR2-AI-02 提取管线 | 102df65 | CorpusExtractor 四态+背压（每项 await ack）+cropBoxPixels 裁剪数学+**真 pdfjs 集成**（4.10 node 实测 getTextContent 多页）；ESLint pdfjs 白名单 INV-16 机器锚（lint 实拦 OutlinePanel/OutlineThumb 漏扫类型直连）；契约修正两处（annotations 随发+rect.page 单源） |
| SR2-AI-03 导出会话 | c9ea6ec | 状态机全表（idle→preparing→streaming→finalizing→done/failed+EXPORT_BUSY 单飞）；manifest 终局单写 tmp+rename；清空重建（目录根用户文件不动）；幂等（范围=产物文件）INV-17；corpusSet 目录隔离守卫；orderAiNotes 装配延展（R12 单源内）；INTERFACE.md 静态单源 |
| SR2-AI-04 入口+e2e | 5310975 | 三件套（corpus-export.store/useExportCorpusEvents/CorpusExportSection）+App 层订阅桥（INV-14 成对清理+终局 toast busy 变化沿——R14 设置节卸载不丢）；**e2e 受锁新 spec：pdfjs render→canvas→PNG 渲染面首次真环境覆盖**+manifest sha 口径（INV-17 e2e 面）+残留清空重建（INV-18 e2e 面）；**两处 e2e 发现的 AI-03 真缺陷修复**（见 §2）；INV-14 扩面回写 |
| SR2-AI-05 工具骨架 | 9fea57e | queue.mjs 纯函数三件（diffQueue/applyDone/freshProgress——diff/幂等/断点续跑六用例锁定）+IO 骨架（planSession 激活判据/markDone 原子写）+CLI；SKILL.md/config.template/prompts×4/README；零 npm 依赖；readJson 三态分离（门一 W1——损坏静默重置实锤修复）+版本门+undefined 哨兵（门二 N-新1）；config.json 入 .gitignore；eslint 覆盖核对（`eslint .` glob 实证含 tools/） |

## 2. 本段（AI-04/05）技术要点

### 2.1 e2e 首跑即抓出 AI-03 两处真缺陷（单测桩世界不可达面）

- **修复①（fileRefById 全路径）**：preparing 阶段源文件存在性判定原用
  `PaperDetail.fileName`——该字段是 file_ref 的**基名**（`sha.pdf`），丢
  `xx/yy/` 目录层，`resolveManagedPath` 解析必失败→全库误报「源 PDF 文件
  缺失」。AI-03 单测桩是恒等映射（fileRef→files/<fileRef>）故不可达此面；
  e2e 种子按真实三层 file_ref 落盘首跑即实锤。修复=改用协议层同源
  `fileRefById`（全路径）。
- **修复②（deferOutcome 串行死锁）**：corpusItem(complete) 处理器内部同步
  发下一篇 extract-request——事件先于 invoke 回复到达 renderer，提取器
  `extracting` 未复位按防御分支（票面明文「仅防事件重发」）丢请求→第二篇
  起串行链挂死（单篇调试不触发，多篇 e2e 首跑超时实锤；导出目录终局=
  corpus md 齐但 figures 半套+无 manifest）。修复=篇终局推进 setImmediate
  延后至回复之后（检查阶段晚于回复微任务——事件循环语义保证确定性）；配合
  同步摘牌防窗内重复终局双推进+failSession session!==s 守卫（门一 N2）。
  **时序契约入 INV-18 补条**（串行不死锁前提=回复先于下一篇请求）+两侧
  声明（service deferOutcome 注释+CorpusExtractor 防御分支注释互证）。

### 2.2 renderer 三件套接缝设计

- 终局源=invoke resolve 单源（INV-11：store 只投影不推算——errorCount/
  fileCount 不从事件推算）；applyProgress 双过滤（busy 迟到守卫 INV-03 同族
  +跨会话 sessionId 过滤——门一 N1，残余理论窗注释声明）
- 终局 toast 在 App 层 hook 订阅 store busy true→false 变化沿——与
  Settings/Reader 挂载态零耦合（R14 跨格序列：Probe 不含 SettingsPage 的
  单测形态等价锚定「设置节卸载 toast 不丢」）
- check-quality 组合根白名单+settings/useExportCorpusEvents→reader/
  CorpusExtractor（tab-dirty 同型受控例外——AI-02 票面指定组装点+INV-16
  锚定路径）

### 2.3 会话超时兜底观察项（AI-03 r2 W1 票面外裁决维持）

v1=进程组同死语义：renderer 挂死→窗口挂死（用户可见可杀），重启即清
（cleanRebuild+无 manifest=工具不激活）——单人本地应用可接受，不加超时
定时器（新事件源须回 plan 门）。e2e 不模拟挂死（票面裁决：CI 不稳定）。

## 3. 双门战绩（本段两单）

- **AI-04**：门一 FAIL 轻量（0B+2W+5N——实现本体零缺陷，阻塞点全在测试面）
  →W1（初始态用例自证恒真——INITIAL_SNAPSHOT 模块级快照锚「reset 字面量≡
  真实默认值」）/W2（sendItem not-ok 透传——防「吞折叠拒绝→提取器误判
  ack→会话悬挂」死锁镜像面）/N1/N2 采纳；N3（PNG 1KB 下限）/N4（日期口径）
  /N5（UUID 恒等映射无碰撞面）不采经门二独立证据复核成立→门二四清单终审
  PASS（受锁 AI-03 测试零改动 10/10 绿+verify 七关卡+e2e 真环境回归）。
- **AI-05**：门一 PW（0B+1W+4N——W1 readJson 三态合并实测实锤：progress
  损坏静默全量重置+manifest 损坏报「不存在」失实诊断）→W1/N1/N2/N3 采纳
  +N4 不采登记（票面明文 IO 骨架不在单测面）→门二 11 场景 CLI 探针+机器
  关卡全绿终审 PASS+新发现 N-新1（JSON null 与哨兵碰撞——undefined 哨兵
  随手修如约落地）。
- 存档：scripts/audits/{ai04-impl.audit.raw.txt, ai04-impl-glm.md,
  ai05-impl.audit.raw.txt, ai05-impl-glm.md}（未跟踪面，入库与否留用户裁决）。
- **回炉 0**（两单门一即终态轻量处置，无回炉链）。

## 4. 验收清单逐项对账（ROADMAP P7-G 验收行）

- repo 单测 → ai_notes.repo 级联两路径用例（INV-25）✅
- 提取管线多页夹具断言 → corpus-extractor.test 真解析多页工厂产物+页序/背压/
  裁剪数学+e2e 真渲染 PNG（magic+体积）✅
- 导出 golden+结构断言（ADR-0011 v1.1 口径）→ corpus.export.test golden 逐字节
  +幂等重导+manifest sha=e2e 侧再锚（INV-17 两面）✅
- e2e 全链 → corpus-export.spec（导入夹具→对话框桩→五件套+manifest 一致+
  部分成功三面一致+残留清空重建+目录根用户文件不动）✅
- queue 幂等测试 → queue.test 六用例（vitest 宿主 R11）✅
- INV-16/17/18/25 全锚定；INV-14 扩面（事件订阅消费方级）✅
- **手动视检留用户**：设置页「AI 语料导出」真实目录选择→进度行→toast 全流程
  视检；导出产物在文件管理器中的实际观感；zcode 会话按 SKILL.md 走一遍激活
  自检（工具侧端到端含 LLM 环节不在 CI 面）。

## 5. 随手验清单（门二收尾条件 (a)——AI-05 IO 面行为锚，人工可复跑）

CLI 三态可辨（空目录=「不存在」exit 1/损坏 manifest=「形态不对…损坏？」
exit 1/损坏 progress=含路径报错 exit 1）；`--done` 幽灵 ID 当场拒绝；版本门
（schemaVersion≠1 报「形态/版本不对」）；progress 内容为字面 `null` 的
undefined 哨兵边缘（报错+「删除后全量重读」引导）。五场景本段行为探针全过
（详见 §3 AI-05 门二 11 探针）。

## 6. 新教训（本段新增）

- **pipe 吞退出码**：`cmd | head; echo $?` 取的是 head 的退出码——退出码
  断言必须直跑或重定向后 `$?`（CLI 冒烟实录）。
- **提交消息回显乱码≠存储乱码**：Git Bash 控制台 GBK 回显 UTF-8 字节的
  显示侧假象——核存储本体用 `git log --format=%s > 文件`+python 按 UTF-8
  读（9fea57e 实录：回显全花、存储完好）。
- **mjs 写 TS 断言**：纯 JS 文件里 `(e as {code?:string})` 语法错——JS 面
  属性直取即可（AI-05 W1 修复实录，import 探针即拦）。
- **tests/unit/X import 深度=三级**（摩擦常量⑩本段再实录——queue.test 两个
  import 各踩一次，探针隔离法定位）。
- **npx vitest 直跑陷阱**：绕过 `npm run test` 就绕过了 `sqlite-abi use node`
  前置——NODE_MODULE_VERSION 错误是绑定问题不是代码问题（本段两次实录，
  切回 electron 勿忘）。
- **e2e 调试法**：临时 _debug spec（console 捕获+状态轮询打印）定位挂死
  链条→修完删——比盲改快一个数量级（deferOutcome 死锁定位实录）。
- Windows rm 挂死（摩擦常量⑧再实录两次）——PowerShell Remove-Item 兜底
  已成肌肉记忆；临时目录清理同用。

## 7. 边界与声明

- 应用侧零 LLM 出网/零新依赖维持（AI-05 工具零 npm 依赖，模型调用=zcode
  会话内建模能力）；v1 无生产者声明维持（ai_notes 生产者=AI-07 导入器）。
- 三读/梳理管线本体=提示词工程实验循环（prompts/ 迭代），工程化边界止于
  骨架与契约——本役交付即边界。
- 第二批（AI-06~10 回灌与联动组，ADR-0015）票面未工单化——按 ROADMAP
  P7-G 增容节顺排。
