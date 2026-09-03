# AUDIT-B 审计简报——功能对偶矩阵 6 对取证扫描（L3 交互回归面）

> 蓝本=AUDIT-A/C 场形态（v10 §4.1 批次表+AUDIT-C 执行实录）。排程真相源=
> v28 §2 第 3 项→v30 §2 第 1 项。母本=v10 §3.3 功能对偶矩阵（已验 3 对
> SH3×SET1/SET1×PDF 缩放/zoom×课题切换；§1/§3 两对已在前波闭环，余 6 对）。
> 开工记录：本审计段技能清点延续本日开场（systematic-debugging 取证形态
> 备用加载面；verification-before-completion 持续在岗）。

## 〇、审计对象（6 对+1 边界，逐对配方）

| # | 对 | 母本 | 取证配方（复用既有件） | 判级线 |
|---|---|---|---|---|
| B1 | SET1 zoom × F-06/F-08 划选工具条+划选链定位细节 | v10 §3.3 #2 余面 | 无头 launch+`tests/utils/pdf-factory` 合成 PDF→SET1 125% 档（settings set 或 --ui-scale 注入形态先查 smoke:160 配方）→划选→**截图+工具条 getBoundingClientRect 与选区 rect 对位转储**（zoom 子树内视觉坐标自洽性：工具条 absolute 消费同源 gBCR=自洽；若混用 offsetLeft/未缩放坐标=错位实证） | 错位>4px 或遮挡可交互面=W；≤4px 亚像素=N 记档 |
| B2 | SH3 双击最大化 × F-03 滚动进度记账 | v10 §3.3 #4 | 合成多页 PDF→滚动到中部→scroll-progress 写入锚（store 记账或 SAVE_PROGRESS invoke 桩计数）→双击 titlebar drag 区触发 maximize/unmaximize→断言：页进度不扰动（恢复后 nearestPage 不跳变）+scroll 事件不触发 writing 态 | maximize 瞬间页进度漂移≥1 页=W；瞬时扰动自愈=N |
| B3 | SH3 drag 区 × 阅读器键位滚动 | v10 §3.3 #5 | 阅读器开卷→focus 移到 titlebar drag 区（click/ focus() 注入）→KeyboardEvent PageDown 派发→断言：键位送达阅读器（scroll-progress PAGE_KEYS 链路）或被 drag 区吞（keydown target 转储） | PageDown 失效（滚不动）且用户无替代路径=W；焦点本该先点进阅读器的可辩护交互=N 记档在场裁 |
| B4 | UI1 常驻流光 × 性能/功耗 | v10 §3.3 #6 | 无头 launch 库视图静止 10s：`process.getCPUUsage`（renderer 侧 process.chrome... 不可用则 evaluate 重绘探针：rAF 帧计数+requestAnimationFrame 帧间隔转储+`PerformanceObserver longtask`）→流光动画在场的 CPU 占用/longtask 计数 | 常驻动画致 longtask>50ms/帧 或 CPU 持续>15%=W；纯合成器动画（零 longtask）=N 记档 |
| B5 | workspace 切换器面板 × SET1 zoom 大档 | v10 §3.3 #7 | 125% 档开切换器面板→**量化转储**（面板内文字 computed font-size×内容区字号对照+面板宽度/视口占比+溢出 scrollWidth>clientWidth 判定）——闲时视觉决策零承担：只出量化事实，观感裁决留在场场 | 面板截断/溢出（scrollWidth>clientWidth）=W（功能面）；纯观感反差=N 量化记档在场裁 |
| B6 | TABS-04 关闭拦截 × SH3 三键 close × 最小化组合 | v10 §3.3 #8 | 开 dirty tab（标注未存/notes pending）→点 close 触发拦截确认框→**确认框在场期间点最小化**→断言：最小化生效+确认框保持（不误关不丢失）→恢复窗口→确认框仍在+两条路径（确认放弃/取消）均可达 | 确认框期间最小化致 dirty 丢失或确认框消失=W；行为正确=N |
| B7 | tags upsert 纯空格名 trim 后空串入库（P7E-01 已知边界） | P7E-01 票面 §⑤+B1 §3 | 静态：tags.service.ts upsert 路径读证（trim 后无空判）+动态：真库探针 upsert('   ') 断言行入（name='' 行出现）→计数 | 可复现入库=W 级修票（rename 面已有 trim 空判先例 INVALID_REQUEST——upsert 对齐即可）；不可复现=N 销项 |

## 一、执行形态（AUDIT-C 同型四段）

1. **本简报**（阶段 1，主控）——范围/配方/判级线固化。
2. **只读取证子代理**（阶段 2）：逐对执行配方——探针脚本写 `scripts/audits/
   auditb-*.mjs`（无头 electron+pdf-factory+既有 forensics 配方复用：可参考
   scripts/audits/f-*-verify.mjs 族与 r2-set1-forensics 形态）；**不改动任何
   src/tests 文件**（纯取证：launch 应用构建产物 out/，DB 用临时 userData 种子）；
   每对产物=screenshot（如适用）+rect/computed/计数转储 JSON+结论行（W/N+证据
   file:line）；探针自产 .mjs 的 locks 登记归主控收口（子代理禁 locks）。
3. **对抗审核**（阶段 3）：扫描报告全文外发 deepseek/Kimi（证据纪律/推理链/
   判级合理性四维——AUDIT-C scan-review 同型）。
4. **W 级修票三屋闭环**（阶段 4）：W 发现逐票工单化（态空间表先行）三屋走完；
   N 级处置=记档（视觉类留在场场，触发条件写明）。

## 二、纪律

- 闲时视觉决策零承担：B1/B3/B5 的观感成分只出量化事实，方向级裁决挂起留
  在场场次（AGENTS 闲时条目）。
- 计数/量值落笔前实测（rect/font-size/帧数全部转储在档——禁凭印象）。
- e2e flake 立案线照旧（同用例 2 次）。
- 探针只读应用面：不改 src/tests；探针写库只进临时 userData。
- 主控收口：扫描报告落盘+探针 locks:generate+apply 即时+审计段提交
  （探针 .mjs 入锁 [locked-change]）。

## 三、验收

- 6 对+1 边界逐项有结论行（W/N+证据转储路径）——无「未验」残留（不可执行
  的配方障碍如实申报=BLOCKED 项处置）。
- 对抗审回（B/W/N 分级）；W 项全部转修票或显式挂起（在场裁）。
- verify 基线不动（135 文件 1160/locks 探针增量/e2e 35）。
