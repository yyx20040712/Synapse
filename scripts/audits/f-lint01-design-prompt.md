# F-LINT-01 设计链首跳——INV-11 lint 机器化设计书拟定（Kimi K3 架构位）

你是本项目架构/技术路线设计拟定者（methodology §4.5：Kimi 拟定→deepseek 对抗审核→GLM5.3 终裁）。禁接触仓库——本包=全部输入,不确定处明确标注假设。中文输出。

## 1. 目标

不变量 INV-11 现文:「类型/颜色/文案/数值单一真相源（禁止两份等价声明靠注释对齐）|强制方式=审查（lint 无对口规则）|状态=**部分**（已知双源残留清零后防线仍是人审）」。本票目标=设计 lint 机器锚定方案,使 INV-11 升格「已锚定」——**机器防线覆盖可机检形态,不可机检形态显式登记边界**。

## 2. 项目现状（硬约束）

- Electron+纯 TS 单仓;**禁新增 npm 依赖**（运行时预算 ≤15,dev 亦不轻加——自写件优先）。
- eslint flat config（eslint.config.js 192 行,受锁）:files 白名单制（scripts/*.mjs 不在面内）;已用 no-restricted-imports 做分层边界;**flat config 支持本地插件对象**（plugins:{local:{rules:{...}}}——零依赖自写 rule 技术路线存在）。
- scripts/check-quality.mjs（172 行,受锁）=文本关卡先例:TODO/FIXME grep+mojibake 正则+CSS 行数关卡+features 跨域互引相对路径检查（walk+正则形态）。
- 已有测试负锚群（防重复建设——设计须划清 lint 与测试锚分工）:theme.test.ts FS_DECL 正则全域负锚（font-size 值段数字+单位五通道闭合,含 calc 载体;七 CSS 件**硬编码数组**——新增第八件 CSS 不自动入锚=F-CSS-02 W1 已知通道）;tsx fontSize/text-[N] 两全域锚;INV-59/60/61 等册内条目均单测锚定。
- CI 口径=npm run verify（quality→tickets→locks→lint→typecheck→test→build 全链）。
- 分层:ipc→services→repos→db;renderer→window.api→ipc;跨进程类型唯一源=src/shared/。

## 3. 设计任务（三件,缺一不可）

### 3a. What-to-lint 逐形态可检性矩阵

INV-11 四域（类型/颜色/文案/数值）×形态枚举——**逐形态裁决:可机检/不可机检/部分可检+误报面+归属（lint vs 测试锚 vs 人审残留）**。至少覆盖以下候选形态（可增补）:
1. 同值双常量（两 const 同字面量值——数值/颜色域）;
2. 常量旁落（常量已定义但消费处直写字面量——如 NOTE_TITLE_MAX 在而别处写 200）;
3. 重复字面量魔法值（同值字面量 N 处消费,阈值 N≥?）;
4. CSS 颜色字面量（#hex/rgb()/hsl() 消费面 vs theme 颜色 token——token 名清单如何获得?硬编码清单漂移风险）;
5. tsx inline style 颜色字面量;
6. 手写两份等价类型（interface 重复声明/结构等价两 interface——结构对比的假阳面）;
7. 文案双份（同一中文串两处——catch:合法复用 vs 双源,语义不可判?）;
8. 新增 CSS 文件未入负锚数组（F-CSS-02 W1 通道——lint 面可覆盖:扫 src 全 CSS 对 FS_DECL 同正则）;
9. 你识别的其他形态。

### 3b. 规则形态三案选型

- 案 A:eslint no-restricted-syntax 自定义 selector（estree selector——表达力边界在哪?对「字面量 vs 标识符」「同值双声明」这类跨节点断言可行吗?）
- 案 B:自写 eslint rule 对象经 flat config plugins.local 注入（零依赖;AST 断言全表达力;但 eslint.config.js 复杂度+受锁面扩大+rule 单测形态?）
- 案 C:check-quality.mjs 文本关卡扩展（walk+正则先例现成;对语义盲但对 CSS/颜色/新文件形态够用?）
对比维度:表达力/误报控制/维护成本/受锁面变化/verify 链位置（lint 段 vs quality 段）/对 3a 各形态的适配度——**给出终态选型（可组合）+逐形态路由表**。

### 3c. 实施分期

MVP（高置信低误报先行）→扩展面→不做面（显式边界登记 INV-11 升格措辞建议）。每期验收口径（先红证植入反例形态清单+存量零误报）。

## 4. 输出格式

设计书 markdown:§1 可检性矩阵表（形态×裁决×误报面×归属）/§2 三案对比表+终态选型+路由/§3 分期/§4 风险与开放问题（列给你下游 deepseek 审核的攻击面自认）/§5 INV-11 升格措辞建议。全文 ≤6K 字符。
