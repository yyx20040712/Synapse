# P7D-01 批二 实现者报告——字号六档语义刻度落地

> 档位申报：GLM5.3flash/思考中（平台以实际执行模型为准）。
> 技能清点（开工纪律）：test-driven-development「用」（3d 先红证）；
> verification-before-completion「用」（verify 真退出码+分段落盘）；
> systematic-debugging「暂不用」（新实现非调试，未遇阻）；
> subagent-driven-development「不用」（本人即实现者，无派发面）。

## 1. 实现摘要

裁决档 §1 六档映射表逐行落地：3a token 六档定义（theme.css :root 批一
z 序段后）+3b tailwind v4 @theme 重绑（text-xs→--fs-body/text-sm→
--fs-title）+3c 消费面 30 处硬编码→var(--fs-*)（CSS 25 处+tsx inline
4 处+arbitrary 1 处）+3d theme.test.ts 防线扩展（先红证）+3e INV-61
登记。13 处值变化=用户裁决预期（未「修正」回旧值）。

消费对账（grep 实测）：var(--fs-*) 消费 32 处=30 处替换+2 处 @theme
重绑行；替换后七 CSS font-size 字面量归零（grep "font-size: *[0-9]"
零匹配）。

## 2. 文件清单（git diff --stat 实测 13 文件，零范围蔓延）

| 文件 | 变更 |
| --- | --- |
| src/renderer/shared/theme.css | +17（@theme 重绑块 8 行+:root --fs-* 六档 9 行） |
| src/renderer/shared/theme-shell.css | 4 处（15→title/13.5→strong/9.5→micro ×2） |
| src/renderer/shared/theme-reader.css | 2 处（11.5→caption/13→strong） |
| src/renderer/shared/theme-lineage.css | 5 处（10.5→caption/13→strong ×2/12→body/9.5→micro） |
| src/renderer/features/library/library.css | 10 处（17→display/14→title/11→caption ×2/10.5→caption ×3/12→body/15→title ×2） |
| src/renderer/features/workspaces/workspace.css | 4 处（13→strong/10→micro/12→body ×2） |
| src/renderer/features/lineage/LineageNodeMeta.tsx | fontSize '10px'→'var(--fs-micro)' |
| src/renderer/features/lineage/LineageNodeCard.tsx | '12.5px'/'12px'→'var(--fs-body)' ×2 |
| src/renderer/features/lineage/LineageSideTags.tsx | fontSize 11→'var(--fs-caption)' |
| src/renderer/features/reader/TabBar.tsx | text-[10px]→text-[length:var(--fs-micro)] |
| tests/unit/renderer/theme.test.ts | +77 行 454 行总（<500 达标）；新增 93 用例 |
| tests/unit/renderer/library-cards.test.tsx | 三断言 token 化配套（自裁申报 §4.2） |
| docs/invariants.md | INV-61 登记（文末表格） |

行号核对：简报 3c 表 30 处行号与现场 grep 全吻合，零漂移修正。

## 3. 测试与验证证据

- **先红证**（3c 执行前）：theme.test.ts 单跑 **27 failed | 182 passed，
  exit=1**，raw=scripts/audits/p7d01-b2-first-red.raw.txt。红构成逐项
  可解释：TOKENS 六正锚 6+FS 负锚矩阵 18（=[字面量,文件] 组合，与 25 处
  在场字面量分布一致）+tsx 形态锁 2+@theme 重绑锁 1=27。
- **转绿**：theme.test.ts 209/209（=批一基线 116+新增 93）。
- **全量 test**：npm run test **1543/1543 全绿 exit=0**（=基线 1450+93），
  raw=scripts/audits/p7d01-b2-test-full2.raw.txt（首跑 1 红处置见 §4.2，
  首 跑 raw=p7d01-b2-test-full.raw.txt 在档）。
- **verify 真退出码**：**exit=1，红在 locks:check 段**（三受锁件
  invariants.md/theme.test.ts/library-cards.test.tsx 哈希变更——预解锁
  工作流预期面，locks:apply=主控位我禁跑；quality:check+tickets:check
  在 && 链中已先过），raw=scripts/audits/p7d01-b2-verify.raw.txt。
  其余被截断关卡独立补跑：lint+typecheck+build **exit=0 全绿**，
  raw=scripts/audits/p7d01-b2-lint-type-build.raw.txt（build 产物含
  tailwind v4 编译后 CSS——@theme 重绑经 vite 链验证）。
- 新增用例 93=6（TOKENS 正锚 it.each）+84（FS_COUNTS 12 字面量×7 文件
  it.each）+2（tsx 形态）+1（@theme 重绑锁）。

## 4. 自裁申报

### 4.1 负锚矩阵口径修正：font-size 声明形态（非批一纯文本计数同构）

简报 3d 原口径「DURATION_COUNTS 同构（纯文本计数）：唯 theme.css 每值
恰 1 次」在 px 通用值上**结构性不可行**——实测：theme.css '12px' 现状
1 次为 --radius-m 定义行（token 定义后将=2 次，恰 1 次断言必红）；
theme-shell.css '10px' 9 次全非 font-size 声明（padding/radius 类）。
批一可行前提「时长字面量唯时长消费」在 px 上不成立。修正为：
负锚锚定 `font-size:\s*<字面量>;` 声明形态（七 CSS 全 0），token 定义
行由 TOKENS 六正锚独立锁定——防护语义等价（定义正锚+消费负锚），先红
证仍成立（25 处在场声明形态即红）。已同步注记入测试头注与 INV-61。

### 4.2 library-cards.test.tsx 三断言 token 化配套（超票面编辑）

全量首跑 1 红：library-cards.test.tsx:298-301 既有受锁断言锁定
.lib-card-title/.lib-card-venue/.lib-card-meta 的 font-size 字面量
（14px/11px/10.5px）——与票面 3c（library.css:114 等替换）+3d（负锚
归零）**绝对互斥**（无中间态），属主控派单接缝漏列（全 tests/ 唯一
冲突面，grep 实测）。处置=更新三断言为 var(--fs-*) 载体（**强度不
放宽**：仍逐类逐属性 toMatch 同构；值面转由 TOKENS 六正锚+FS 负锚
双锁），用例名随迁（meta 10.5→11=裁决变化面）。事实依据：该文件
可写（-rw-r--r--，主控预解锁覆盖整个受锁面而非仅 theme.test.ts）；
diff 一键可回退（未提交）。**此编辑请主控门审重点过目**。

### 4.3 其他

- tsx 形态锁在票面两条明文断言（not.toContain("fontSize: '1")/
  not.toContain('text-[10')）之上各增一条通用正则（/fontSize:\s*['"`]?\d/
  覆盖无引号数字形态——SideTags 原状 fontSize: 11 即此形态；/text-\[\d/
  覆盖数字开头 arbitrary，# 开头色值不咬）。
- theme.css token 插入点=批一 z 序段后（--z-pop 行后、--font-display
  前）——「--dur-* 段后」的批一区末尾读法，保持批一 dur/z 两段完整。
- INV-61 锚定方式列含 library-cards 随迁说明+负锚口径注记（与登记
  格式 INV-58~60 同构五列）。

## 5. B5 缩放静态核查（裁决档 §3-4 条款）

--ui-scale 消费面 grep 实测：theme-shell.css 63/66 两处 zoom 声明
（var(--ui-scale,1) 与 calc(1/var(--ui-scale,1)) 反补偿）+App.tsx:135
setProperty 单点写。**--fs-* 六 token 不入任何 zoom/calc 乘算表达式**
（无直接耦合面）；zoom 属布局级缩放（渲染后整体缩放），font-size 无论
字面量或 token 载体同受 zoom 作用——批二仅改取值单源，不改变缩放语义；
13 处值变化点在缩放档位≠1 时与 17 处零变化点同比例呈现。结论：统一
体系（--fs-*×--ui-scale 乘算）现状不存在也无必要，不另行报裁。

## 6. 疑虑

1. **theme-lineage.css:113-119 注释**含「9.5px 斜体」等历史描述字样
   （F-L1-C 裁决档案描述），值变化（9.5→10）后注释失实——按范围纪律
   未动（负锚为声明形态不咬注释），是否顺带更新请主控裁。
2. verify 无法达成整链绿=locks:check 预期红（§3），主控收口
   locks:apply+[locked-change] 提交后即应全绿——请主控亲验。

## 7. 回炉一轮——E-3 第 14 处变化面（字号→行高→盒高耦合链）

主控 E-3 注释清理时抓到批二与门一均漏检的耦合族：.lineage-edge-label
字号 9.5→10（--fs-micro）后 line-height 1.3 派生数学未同步——3 行盒高
39≠旧 max-height 37.05（第 3 行截 ~1.95px+悬停滚动提前触发）。

### 7.1 耦合族全局清点（执行序①）

grep '×1.3|1\.3;|line-height.*1\.3' + '37\.05|12\.35|41\.05|123\.5'
双扫（src+tests）结论：**行高 1.3 派生耦合族唯一=edge-label 域**（唯二
line-height:1.3 声明=theme-lineage.css:126 比例行高（字号无关，不迁）
+theme.css 无）；族成员 8 处：

| 位置 | 旧→新 |
| --- | --- |
| edge-label-layout.ts:30 EDGE_LABEL_H | 37.05→39（3×10×1.3） |
| edge-label-layout.ts:32 LH | 12.35→13 |
| edge-label-layout.ts:16 注释 | lh=12.35=37.05/3,±123.5→lh=13=39/3,±130 |
| edge-label-layout.ts:29 注释 | 3 行×9.5px×1.3→×10px× |
| theme-lineage.css:131 max-height | 37.05px→39px（:113-119 注释主控 E-3 已清，核对无误） |
| LineageEdges.tsx:13/:15 注释 | 130×37.05→130×39；9.5px→10px（清单外同族字样，随迁申报） |
| edge-label-layout.test.ts:20-22/:55/:68/:115 | LH=13/盒高 39+4/43+43/\|dy\|≥77.5/±(10lh+21.5)=±151.5 |
| lineage-canvas.test.tsx:453/:462 | 用例名 130×39+FO height '37.05'→'39' |

清单外发现两项（未擅改，申报主控裁）：
1. **estimateLabelWidth 估宽基准 9.5/4.75**（layout.ts:40-49）：字号派生
   （全宽 9.5px/字≈旧字号）——但头注 ：14-15 有容差声明背书（est 偏差
   由 gap 4+FO 恒 130 吸收，声明容差不修），主控迁移值清单未列；5% 偏差
   仍在声明容差内。是否随迁 10/5 请裁（若迁，test ①:41-42 期望 23/
   18.25 需连带）。
2. **edge-label-layout.test 为同构复算型无绝对值锚**（本轮先红证实证：
   期望改后旧实现下该文件仍全绿——EDGE_LABEL_H import 自实现+LH 测试侧
   常量比较性质断言，值迁移不设防）。全族唯一绝对值锚=lineage-canvas
   :462。可选补强：`expect(EDGE_LABEL_H).toBe(39)` 一行（超票面未加）。

### 7.2 先红证（执行序②）

期望先改→旧实现（37.05 在场）跑两测试：**1 failed（lineage-canvas ⑦
FO height '39' 断言）| 32 passed，exit=1**，raw=scripts/audits/
p7d01-b2-rework-red.raw.txt（edge-label-layout.test 全绿原因见 7.1
发现 2）。

### 7.3 实现迁移+转绿（执行序③）

layout.ts+theme-lineage.css:131+LineageEdges.tsx 注释落地后两测试
**33/33 绿**；src 全域 grep 37.05/12.35/41.05/123.5 **零残留**。
对账：渲染 FO height 由 LineageEdges.tsx:37 import EDGE_LABEL_H 常量
单源消费——layout.ts 改一处渲染自动随迁，无第二字面量。

### 7.4 verify（执行序④）

npm run verify 真退出码**追加** p7d01-b2-verify.raw.txt：**rework-exit=1，
红面仍=locks:check 段**（受锁件本轮新增 edge-label-layout.test.ts+
lineage-canvas.test.tsx 两件哈希变更——locks 输出实测恰列此两件，§3 首
轮的三件主控 E-3 已处理；apply=主控位）；&& 链在 locks 断——test 段
经独立全量补跑：**156 文件/1543 用例全绿 exit=0**（含回炉两文件重跑），
raw=scripts/audits/p7d01-b2-rework-test-full.raw.txt。lint+typecheck+
build 本轮重跑 **exit=0 全绿**（rework-ltb-exit=0，追加 p7d01-b2-
lint-type-build.raw.txt——build 产物 CSS 51.04 kB 不变，max-height 值
迁移不增量）。主控收口 locks:apply 后 verify 整链即绿。

### 7.5 回炉二轮——估宽基准随迁（主控裁决续命：不接受容差声明）

裁决：9.5/4.75 估宽基准随迁（换行行数预估字符宽——字号 +5.26% 后估窄
致边界文本预估行数偏少→碰撞盒偏小，削弱 F-L1-C 防重叠设计意图，非纯
显示容差；行高已 10 基准估宽留 9.5=半迁状态）。落地：:49 `9.5 : 4.75`
→`10 : 5`+:40-41 注释同步+test ①绝对锚期望连带（23→24/18.25→19，
§7.1 申报获批口径）。

**红如实报**：全量首跑 1 failed=edge-label-layout.test ③——该用例实为
数值边界敏感锚：估宽 42→44 使 hw 23→24，dx 第三档 |x|=80 对节点盒
（外扩半宽 56+23=79）由撞（78<79）翻转为分离（80≥80）——dy=0 档即
命中自由位、「y 偏移已发生」前提失效（§7.1 发现 2 的「同构复算零红」
预判对 ②②b③b⑤⑥/fit 成立——它们全满宽钳制 130 不受基准影响，唯 ③
短标签场景踩边界）。适配=节点盒 hw 50→52（外扩 58）恢复「dy=0 全档
相撞」触发条件，断言面零放宽（not.toBe(0)+disjoint 原样），适配理由
注记入用例注释。二跑全量 **156 文件/1543 用例绿 exit=0**（raw=
p7d01-b2-rework2-test-full2.raw.txt，首跑红 raw=p7d01-b2-rework2-
test-full.raw.txt 在档）。verify 追加 rework2 段（真退出码见
p7d01-b2-verify.raw.txt 尾——locks:check 预期红面同 §7.4：edge-
label-layout.test.ts 本轮再改，apply=主控位）。


