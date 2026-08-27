# 用户视检走查发现台账（2026-08-27）

> 性质：P8 提案 M0（视检收账）的发现记录与回填载体。§1=用户 2026-08-27
> 亲报两项+主控同场排查一项；§2=10 分钟卡五项的**用户自填区**（用户声明
> 亲自走查后填——见 docs/prompts/2026-08-27_visual-check-10min.md）。
> 纪律：实现缺陷走「事件驱动：用户验收缺陷→双门修复」；范围缺口走立项
> 工单化（双 plan 门须用户在场）。

## 1. 已报发现（2026-08-27 用户亲报 + 主控排查）

### 发现 1：连续翻页未实现 —— 分类=**范围缺口**（非实现缺陷）

- 判定：即 **P7-F 连续滚动阅读**主线遗留位（ROADMAP 执行实况注记
  「F 仍未做，属主线遗留位」；从未工单化）。用户实锤=需求二次确认
  （首次点名 2026-08-23，本次使用中再遇）。
- 处置：P8 立项工单化（战役量级：渲染管线/离屏回收/进度回写/键位迁移
  约 3~4 张工单，成本参照 LG 役重量级）；**排期=缺陷②修复与 SR2-ENR
  工单组之后**；接口冻结面不变（locateAnchor 签名/annotation-order
  文档序语义——F 只换滚动步实现）。
- 状态：待工单化。

### 发现 2：文献标签页显示乱码、未对应 PDF 名称 —— 分类=**规约级实现缺陷**（TABS-02 面）

- 根因：`papers.repo.ts:284-292` detailById 的 `fileName`=`file_ref` 基名，
  而 file_ref=**内容寻址存储路径**（`xx/yy/<sha256>.pdf`）——标签页显示
  64 位哈希串（用户视角即「乱码」且与 PDF 原名无关）。TABS-02 票面把
  fileName 当用户可读名=**规约层误解**（测试夹具用 "foo.pdf" 恒过，
  真库全哈希——首次人眼实锤，与 Phase 4「52 绿但文字不可见」同族教训）。
- 同病面（主控排查）：`TabBar.tsx:46`（标签标题）+`tab-dirty.ts:99`
  （关脏 tab 确认框标题）两处；ImportDropZone 的 fileName 为导入期原名，
  不同源无恙。库内 title 干净（导入时=文件名茎；fill-empty 语义保证不被
  enrich 覆盖）——正确用户可读名单源。
- 修法（主控裁决）：TabState 增 `title` 字段（hydration 取
  PaperDetail.title）；title 优先显示、fileName 去扩展名兜底；两处同修。
- 处置：三屋修复 mini 单元**已完成双门+回炉 2 轮**——实现者 TDD 四档
  （首红 4→绿 619/619→4 变异红证还原 diff 空）；门一 0B/4W/6N→回炉 1
  （M4 红证+头注×2+受锁注释）→复核 PASS→门二 PASS（契约管道六环闭合，
  实现者自裁 schemas.ts+reader.service 透传经复核符合裁决意图）；主控亲跑
  e2e 抓出 2 红（tab 关闭钮 aria-label 含标题×getByRole 子串碰撞——修复的
  真实回归面）→回炉 2 定位收紧 selection-toolbar 作用域+全 spec 排查零
  命中→VERIFY_EXIT=0（619/619）+E2E_EXIT=0（**20/20**）。收口提交见
  git log（[locked-change]，审计档案 scripts/audits/tabs-title-*）。
- 状态：**已修复收口**（复验判据：标签页显示「Reynolds_1883」等文献名）。

### 发现 0（同场，主控先行排查，非用户报）：SKILL.md 平台路径表错误

- 协议目录实名=productName「Synapse Remake」（带空格），旧表误写包名
  `synapse-remake`——zcode 侧照表发现必错（幽灵协议目录=应用侧永不可见）。
- **已修复提交 `13cdbf9`**（三平台行+来历注记+视检卡③步命令同修）。
  根因链：bootstrap 无 setName 覆盖+%APPDATA% 实测目录佐证。

### 发现 3：ai_notes 列表序非确定（测试 flaky）—— 分类=**存量契约缺口**（AI-01/07 面，主控收口亲验实锤）

- 现象：主控亲跑 verify 一红（618/619）——ai-notes-import.test「无 archive
  首导」`notes[0]` 期望 first-read 实得 adjudicate（两行都在，顺序对调）；
  实现者同工作树两次 619/619 绿——间歇性。
- 根因：`ai_notes.repo` `ORDER BY created_at, id`——repo 生成 created_at
  （导入器**同步循环逐条写入、无事务包裹**（门一 W2 核正——原记「单事务」
  有误），快速循环内多行同毫秒），平局决胜键 id=随机 uuid → 顺序=uuid
  彩票（~50% 翻转）。该测试自 AI-07 落地起即带概率翻转，本日首次踩中。
- 判定依据：宪法「恒绿和随机绿一样危险」（Phase 4 教训同源）；与本日
  缺陷②单元零文件交集（复跑特征化见 git log 提交链）。
- 处置：独立 mini 单元三屋修复——`ORDER BY created_at, rowid`（插入序
  确定化）+ 可红首证回归测试（构造同 created_at 且 id 序与插入序相反的
  两行，对现状必红）；受锁测试若动走 [locked-change]。
- **同型雷清单（门一 W1 扩充，5 处——排查自 ai_notes 修复单元，均另立
  单元处置）**：①lineage.repo.ts:177/178（同病低频版）②papers.repo.ts
  :101-103/:272（uuid 决胜低频+year_desc 无第三键）③notes.repo.ts:91
  （无决胜键）④corpus.assemble.ts:104 orderAiNotes 末级 id 字典序决胜
  （三键全平=uuid 彩票——**多锚段同键为导入常态，触发面高于前四处**）
  ⑤corpus.assemble.ts:94 头注「repo 基础序同键兜底」与 repo 新序声明
  漂移（随④修）。
- 状态：**已修复收口**（`ORDER BY created_at, rowid` 两处+回归锁新测试
  +红首证/双变异红证；verify 87 文件 621 用例 EXIT=0 亲验+locks 133；
  提交见 git log [locked-change]，审计三件=scripts/audits/ainotes-order-*；
  同型雷 5 处清单在上方——另立单元待排，其中 orderAiNotes 末级决胜
  触发面最高）。

## 2. 10 分钟卡五项走查结果（**用户自填区**）

| 项 | 结论 | 备注 |
| --- | --- | --- |
| ① 设置页导出全流程 | 待填 | 完成后请把**语料目录路径**告知会话（D1 试点批输入） |
| ② 五件套观感 | 待填 | |
| ③ zcode 激活自检 | 待填 | companion 命令由会话代跑（协议目录用修正后路径） |
| ④ 脉络视图全链 | 待填 | 桌面 `lineage-draft.json` 已预填库内真实三篇（Reynolds 1883→von Kries 1901→管网 2007） |
| ⑤ RT 布局观感 | 待填 | 同年密集区紧凑度/缩放锚点 |

## 3. 挂账联动

- 迁移开工书 §2 五项挂账以本台账 §2 回填为准（全 PASS 即清账=M0 达成）。
- ④ 若遇「导入草稿整图拒收」：先查 paper_id 是否库内真实 id（幽灵 id
  拦截=预期行为非缺陷）。
- 缺陷②修复落地后，标签页应显示文献名（如「Reynolds_1883」）——
  可作为您复验的直观判据。
