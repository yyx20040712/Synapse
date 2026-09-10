# 2026-09-10 LOOP 交接 v58——四票连收（locks 单源/撞名语义化/G2 事件层/LINT-04 T1）

> 上段=v57（CSS-03 补审+LINT-03 收口）。本段=用户指令「继续开发」：v57 §2
> 候选四票全清（小票暖场→小票→中票→压轴设计链）——F-LOCK-01（unlock/lock
> 集合不对称收敛）/F-SNAP-01（BLANK_SNAP_ 撞名语义化）/F-A12（划选释放点
> 浅探事件层重定向——G2 遗留收束+INV-62 登记）/F-LINT-04（颜色关卡扩展
> T1——设计链三跳+COLOR_RE 单源化+postcss 化）。基线推进：
> **162 文件/1579 用例/locks 317**；registry **0 open/170 done**。

## 0. 开场（三态恢复——下批次首读）

- 预期 **A 态**：HEAD=本交接提交+干净树→接 §2 首项。
- B/C 态处置照 AGENTS 既有规约。
- HEAD 链：…12b8356d4e（v57 收口）→ba65bef72d（F-LOCK-01）→786b0c9cc0
  （F-SNAP-01）→b486154ee6（F-A12）→5572ce262d（F-LINT-04）→本交接提交。

## 1. 本段终态（四件）

| 件 | 提交 | 要点 |
| --- | --- | --- |
| F-LOCK-01 | ba65bef72d | unlock/lock 受锁集合不对称收敛——新件 get-protected-files.ps1 单一收集函数（含 baseline.json 漏项）+两脚本 dot-source+check-locks.mjs 头注互指；门一 Kimi 三轮（R2 独立无记忆提三新破坏→R3 三件现状出示全销项）；locks 311→312 |
| F-SNAP-01 | 786b0c9cc0 | anchor-blank-snap 撞名常量语义化（BLANK_SNAP_GAP_*）——主控自为（F-AUDIT-01 先例）+门一 GLM 同源降级（§4.5 ≤3 文件小批可省面）；B-1 措辞更正随案落笔（红层判据=同名+同值跨≥2 文件与 export 无关） |
| F-A12 | b486154ee6 | G2 文本位下探事件层收束——release-affinity.ts 210 行纯函数（y 间隙+x 栏组域外[门一 W1]+prevTop 上界[W2]+4px 余量[实测驱动]）+dragged 门接线+anchor-blank-snap export 扩 5 几何面；真机 G2 end 1504→1465；INV-62 登记；17 用例+接线三态锁；locks→316 |
| F-LINT-04 | 5572ce262d | 颜色关卡扩展 T1——设计链三跳（Kimi 九宫格→deepseek 三硬伤→终裁档+当场证伪四点）；color-re.mjs 单源（COLOR_RE/META_RE/stripUrlFunctions）+C-4 postcss 化（walkDecls 三题消解）+②token 同值守卫（同名合并[门一 W-2 回炉]）+③哨兵+⑦剥离；红证六支+并存双注入；locks→317 |

## 2. 挂起项与后续票候选

1. **F-LINT-04 T2 候选（B-5 AST 扩展）**：逐属性判定（弃全 Literal 门）+
   unwrap as const/satisfies+SVG attr 双表（JSX camelCase+CSS kebab）+未知
   属性兜底；前置=全仓 tsx as-const 形态基数 dry-run（终裁 §2 表）。
2. **T4 前置候选（--warning token 化）**：TabBar.tsx:139 `var(--warning,
   orange)` fallback 悬空——补 token 定义或改引既有（Kimi 裁=红不豁免，
   豁免开永久口子）。
3. **T4 候选（var() 语义锚 C-4c）**：R−D−W=∅ 上线门槛+DYNAMIC_TOKENS
   生成式白名单（动态注入 2 条已盘：--ui-scale/--scale-factor）。
4. **postcss 显式化小票**：传递依赖 hoisting 风险（tailwind 换实现即断——
   fail-closed 方向安全但阻塞开发）；[dep-change] 面留用户裁决。
5. **F-A12 观察项**：R-1 nearestGroupOf 距离式（g[len-1].right）与判别/目标
   （max-right）异式——组内 right 非单调形态选组偏差（罕见+保守）；R-2 栏
   间隙释放保守零变（F-A10 栏间三分语义未在事件层复刻）——真机再现再立票。
6. **W3 检测域窄观察**：FS_DECL 哨兵只咬字面「FS_DECL = /」——改名副本不
   触发（F-LINT-04 并存测试首跑发现；同族③哨兵=逐字副本边界已入 6b 注释）。
7. **③哨兵逐字边界**（同 6 族）：META_RE 序换/量词变体/字符类简写不在面
   ——T2 候选扩展或维持入档明示。
8. 沿用 v57：F-A9 紧排边界带扩张/F-UI-01 光学中心层（用户复测触发）/
   settings.png 非确定面（再现 2 次立案）/SVG attr var() 引擎线
   （Electron 升级必复核）。

## 3. 本段成本账本（§4 口径——模型×供应商分列）

```
主控 GLM5.3（本窗全程）：四票立案/派发/抽检/门审拼包 dispatch/F-SNAP-01 自为
  实现+两处一行级回炉亲改（F-LOCK-01 W1/N3——实现者不可续命时先例 F-CSS-03）/
  F-LINT-04 设计链终裁+当场证伪四点+终裁档/INV-62 登记/收口四提交/v58 滚动
F-LOCK-01 实现者（环境统一档——Agent 无 model 参数，同源欠账如实记）：
  1.5M tok/43 调用/10min；门一 Kimi kimi-main 三轮 in 7.6K+1.7K+~2K/
  out 4.5K+1.7K+~1.5K/145s+61s+~60s；门二统一档 0.6M tok/34 调用
F-SNAP-01 主控自为实现；门一 GLM 同源（§4.5 可省面）0.17M tok；门二 0.2M
F-A12 实现者两轮（首证 7.5M/97 调用/26min+回炉 5.6M/49 调用/14min——回炉轮
  连带修正夹具 4 处+W4 漏桩被 verify 拦截后重刷证据）；门一 Kimi 两轮
  in 9.0K+13.8K/out 9.7K+6.2K/569s+194s；门二统一档 0.7M tok
F-LINT-04 设计链：Kimi 拟定 in 1.5K*/out 3.6K/93s（*token 读取与字节比
  偏差——routing 头注为准）+deepseek 审核 in 1.2K/out 8.8K/44s；实现者两轮
  4.4M+2.3M tok；门一 Kimi 两轮 in 6.1K+~2K/out 6.9K+~1.5K/207s+~60s；
  门二统一档 0.4M tok
```

## 4. 教训行（本段追加四条）

- **对抗审核必附被审对象全文**（F-LINT-04 deepseek 跳实录）：审核跳 prompt
  只附攻击清单转述未附设计书原文——审核员明示「未见原文按未覆盖攻击」，
  幸而发现多为真；终裁档已记「下不为例」。审核跳输入=被审对象+攻击面双件。
- **echo exit=$? 必须落 raw 末行**（F-A12 实现者首跑实录）：verify 跑完但
  raw 无 exit 标记=证据缺口（报告转述不算数）——收口链主控亲跑补证；派发
  简报已含此纪律，实现者执行漂移仍会发生，门二必核项。
- **审包 grep 的 binary 判定**（F-LOCK-01 实录）：git diff 输出含 raw 证据
  （ANSI 色码/NUL）时 grep 视为 binary 静默零匹配（exit 1）——对账用
  `grep -a -c "^diff --git"`；394KB 级大包先裁 manifest/verify.raw 再拼。
- **SendMessage 续命窗口**（环境事实）：子代理完成后**短窗内**可续命回炉
  （F-A12 隔~30min/F-LINT-04 隔~20min 成功），隔久（F-LOCK-01 隔~1h）报
  「No active local_agent task」——回炉宜紧不宜拖；不可续命时一行级改动
  主控亲改先例在册（F-CSS-03/本段 F-LOCK-01）。

## 5. 环境事实滚动

- 基线：**162 文件/1579 用例/locks 317/e2e 44**；registry 0 open/170 done。
- Kimi kimi-main 网关窗本段五趟门一/设计全过（最大 in 13.8K/569s——R2 大
  包时长已近窗缘，大包仍优先分片）。
- color-re.mjs=COLOR_RE/META_RE/stripUrlFunctions 唯一宿主（禁 g/y+哨兵
  扫描面=两消费文件枚举+新增消费方义务扩 SENTINEL_SCAN_FILES）。
- C-4 CSS 面=postcss walkDecls 域（--prop 豁免+②同值守卫 Map<值,Map<prop,
  声明[]>> 同名合并）；at-rule prelude=明示盲区。
- release-affinity=划选终点事件层判定（INV-62 已锚定）；几何消费经
  anchor-blank-snap export 五面（boxOf/visualRows/columnGroups/rowEndOf/Box）。
- get-protected-files.ps1=受锁集合 ps1 侧单一来源（跨语言与 check-locks.mjs
  对齐靠头注互指——哨兵不做，主控预裁在案）。
- postcss 8.5.26=树内传递依赖（hoisting 风险入档 §2-4）。
