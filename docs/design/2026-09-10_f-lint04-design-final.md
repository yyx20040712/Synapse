# F-LINT-04 关卡扩展战役终裁档（GLM5.3 主控——设计链第三跳）

> 链：Kimi 拟定（scripts/audits/f-lint04-design-kimi.md）→ deepseek 对抗审核
> （f-lint04-review-ds.md——ENDORSE_WITH_CHANGES）→ 本档终裁。
> 流程注记：审核跳未附设计书原文（主控拼包失误——审核按攻击清单转述进行，
> 发现仍多为真；下不为例：对抗审核必附被审对象全文）。

## 0. 终裁前当场证伪（主控亲跑）

- ③ ESM 可行性：`node -e "import('./eslint.config.js')"` → **IMPORT OK**
  （jiti 疑虑排除；eslint.config.js 可 import scripts/color-re.mjs）。
- postcss **8.5.26 在树内**（tailwind 传递依赖——⑥⑦②换 postcss 零新依赖成立）。
- ④ 动态拼名 `var(--${`/字符串拼接：**全仓 0**（R 集可静态闭合）。
- ⑥ 分号面（content 字符串/data URL）：**现存 0**（但存量 0≠规则安全，postcss 化照采纳）。
- ② @theme var() 同值现状：`--text-xs:var(--fs-body)`/`--text-sm:var(--fs-title)`
  值互异**零同值**（假阳指正仍成立——见 §2 修正）。

## 1. 采纳的审核修正（对设计书）

1. **①逐属性判定**（弃"全 Literal 门"——混一个计算属性整对象豁免=绕过通道）；
   **unwrap as const/satisfies/Object.freeze**（TS 色值表默认形态非边角——
   VariableDeclarator.init 层 unwrap 后判 ObjectExpression）；**SVG attr 两张
   表**（JSX camelCase：stopColor/floodColor/lightingColor——CSS kebab 表并行）
   +未知属性兜底（属性名命中 fill|stroke|color|*Color 且 Literal 值命中
   COLOR_RE 即报）。
2. **②检测域限定=色值域**：value 归一后命中 COLOR_RE 的 token 声明行之间查
   同值（票面语义本=颜色 token 同值第二源；@theme var() 重绑天然出域零假阳）；
   `#fff` vs `#ffffff` 缩写同色、`red` vs `#f00` 命名等价=**明示不做面**（C-4
   头注登记）。
3. **③哨兵第三副本闭合**：哨兵的 hex 特征 meta 模式（识别"内联 hex 正则文本
   形态"）也驻 color-re.mjs 导出（META_RE）；哨兵扫描面显式枚举=两消费文件
   （eslint.config.js+check-quality.mjs），哨兵行自身以 import 的 META_RE 执行
   matchAll（其行文本是带反斜杠的 source 形态，不自咬）；**import 失败
   fail-closed 抛错**（禁 try/catch 回退内联正则——回退=③静默失效）；
   COLOR_RE 禁 g/y 标志（RegExp 实例共享 lastIndex 污染——现行无 g，写进
   color-re.mjs 头注禁令）。
4. **⑥⑦②载体换 postcss**（8.5.26 树内零新依赖）：C-4 的 CSS 面整体迁
   `root.walkDecls`（decl.prop 以 -- 开头=token 定义天然豁免——行级豁免+单行
   多声明绕过+引号/分号边界三题一举消解）；⑦ url() 剥离经 value 解析
   （url(#x)=id 引用非色值）；②归一化同源。tsx 面仍归 B-5（eslint AST 域）。
5. **④白名单 doc 由代码生成**（DYNAMIC_TOKENS 数组单源驻 check-quality——
   文档互指改为生成或注释单向指，弃双向手维护）。
6. **⑧三面采纳**：命名色（orange 裸词）=明示不做面（维护面大）+fail-open
   统一（哨兵/rule/postcss 解析任一异常→push violation 非吞错）+职责定界
   （哨兵管"正则源被复制"；关卡管"色值字面量本体"——双报口径豁免）。
7. **验收注入式测试**：W3 与③哨兵并存验证=注入一条内联 hex 正则→恰一条③
   violation；注入 FS_DECL 副本→恰一条 W3（无此测试该验收不成立）。

## 2. 分期终裁（拆票——deepseek T1-T4 采纳+调整）

| 期 | 工单 | 面 | 前置 |
| --- | --- | --- | --- |
| T1 | **F-LINT-04（本段落地）** | ③单源化（color-re.mjs 新件+两消费文件 import 化+META_RE 哨兵+fail-closed）+⑦顺修（单源正则处 url() 剥离）+②⑥的 postcss 化（C-4 CSS 面迁 walkDecls+色值同值守卫） | 无（存量全零已 dry-run） |
| T2 | 候选票 | ①AST 扩展（逐属性+unwrap+双表+兜底） | 全仓 tsx as-const 形态基数 dry-run（含模块常量对象/SVG attr 两面） |
| T4 前置 | 候选票 | --warning token 化（TabBar.tsx:139 fallback 悬空清理） | 无 |
| T4 | 候选票 | ④var() 语义锚（R−D−W=∅ 上线门槛+DYNAMIC_TOKENS 生成式白名单） | T4 前置毕 |

T1 合并 deepseek 的 T1+T3（③单源化与 postcss 化同触 check-quality/C-4 面，
拆两票=同文件两轮受锁流程成本；两者独立验收互不依赖，同票分节落地）。

## 3. T1 验收条款（F-LINT-04 票面）

1. 先红证逐支：②植入同值色值 token→红；⑥植入 `--a: var(--x); color: #fff`
   单行（walkDecls 后=非法形态改植入 minified 多声明 CSS）→红；⑦植入
   `fill: url(#face)`→不红+`color: #face`→红；③植入内联 hex 正则回退→恰一条
   哨兵红；import 破坏（color-re.mjs 改名）→fail-closed 红。
2. 存量零误报：82 token 声明行等价通过（walkDecls 化后豁免语义等价）；全 CSS
   文件零新红。
3. verify 全链绿；受锁面（check-quality.mjs/eslint.config.js/新件 color-re.mjs
   诞生即锁）[locked-change]。
4. 注入式并存测试（§1.7）落 check-quality 自测面或独立探针（形态实现者定）。

## 4. 不做面（本战役明示）

- ⑦独立哨兵（存量 0 低概率——过度工程，随③顺修 regex 即可）。
- ⑤十进制/命名色穷举检（文本规则无法完备覆盖自然语言色值叙述——人审面，
  C-4 头注明示残留面）。
- ②跨文件同值（theme.css vs 其他 CSS 硬编码——C-4 现行已覆盖）。
- ⑧命名色表（orange 类裸词——维护面大，明示不检）。
- `#fff`/`#ffffff` 缩写同色、`red`/`#f00` 命名等价（②口径明示）。
