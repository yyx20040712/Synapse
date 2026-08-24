# P7-A 交互基建战役收官报告（2026-08-23 ~ 2026-08-24）

> 范围：v2 蓝图 B1→B4 治理链 + P7-A 四工单实现 + e2e 验收。10 提交
> （796f863→fdd83e9，含治理 5 + 实现 5），全部双门闭环。
> 交接任务书：docs/prompts/2026-08-24_next-session-handoff.md。

## 1. 提交清单（10 单元）

| 提交 | 单元 | 性质 |
| --- | --- | --- |
| 796f863 | B2 蓝图草案 + B1 素材报告 | docs（deepseek r1/r2 共 14 发现全采纳） |
| b6f80db | B3 裁决回写（α/确认/DB/授权排期 + P7-F 连续滚动立项）+ AGENTS 多窗口限定 | docs+宪法 |
| a1e1822 | B4 机器防线：check-tickets 规则 6（SR2 命名空间+四正则扩展+b3 指针强制） | 受锁 [locked-change] |
| e364ea0 | P7-A 工单化（四张 SR2 五层规约）+ INV-14 入册 | 工单 |
| c5a2e98 | 规则 4b done 骨架残留检查（BLOCKING 证伪先例：尾注属提交信息非 diff） | 受锁 [locked-change] |
| ec4ab42 | SR2-KEY-01 keymap 单例（12 用例；修饰精确匹配——deepseek 抓真缺陷） | 受锁 [locked-change] |
| 8d9edcb | SR2-KEY-02 快捷键+ctrl 滚轮（8 用例；翻页键双移动/同步异常/deltaY0 三真缺陷修复） | 受锁 [locked-change] |
| 6c2f8d6 | SR2-ANNO-01 标注四选项菜单（4 用例；三态互斥防双弹层） | 受锁 [locked-change] |
| cc3e493 | SR2-UIK-01 SplitPane（11 用例；**W1 主子树重挂真回归**修复=main-null 稳定子位模式） | 受锁 [locked-change] |
| fdd83e9 | e2e 收尾（缩放/拖拽/菜单链/复制断言）+ **剪贴板写权限真缺陷修复**（permissionPolicy 最小放行） | 受锁 [locked-change] |

## 2. 防线战绩（本役新增规则的真实拦截记录）

- 规则 2（done 工单号跨文件引用）：**真阳性 6 次**（规约注释/装配注释中的工单号逐一被拦）
- 规则 6（v2 工单 b3 指针）：生产绿（78 工单）+ 红绿四证（缺指针/越界/尾部/合法）
- 规则 4b（done 骨架残留）：临时翻状态红证×2 双形态
- quality 组件行数上限：拦 ReaderPage 262>250（拆 OutlineAside）
- ESLint：拦导入名错误 1；typecheck：拦 TS2532 索引访问 3
- **e2e 实锤集成缺陷 1**：剪贴板写被全拒权限策略拦截（单元 281 绿测不出——集成层唯一捕手）

## 3. 不变量与登记册

- INV-14（输入接缝注册/注销成对）新登记并**三面全锚**：模块级 keymap.test（12）+
  快捷键/滚轮消费方级 reader-shortcuts.test（8）+ 指针/body 样式面 split-pane.test（11）。
- 登记册 14 条终态：**已锚定 10**（INV-01/03/04/05/06/08/09/10/12/14——INV-14 本役
  新登记即三面全锚）/ **部分 3**（INV-02/11/13）/ **未锚定 1**（INV-07）。
  C1（INV-11/07 lint 化评估→ADR-0010）待做。

## 4. 战役级教训（新沉淀）

1. **React 子树稳定性**：条件分支同一子位的元素类型变化=整棵子树重挂（SplitPane↔button
   导致 PdfCanvas 重初始化）。模式：可变面板用「main 槽可空+主内容外置稳定子位」。
2. **setState updater 副作用与 ref 镜像双坑**：updater 内做持久化违纯净约定；改 widthRef
   镜像又在批量 dispatch 下读陈旧值（50 连击全读旧值被键盘用例当场捕获）。正解：
   链式更新用 updater，副作用收口到状态值的 useEffect 单点。
3. **e2e 是集成缺陷唯一捕手**：权限层/剪贴板/真窗口几何类缺陷单元测试全绿也测不出——
   蓝图验收条款里的 e2e 断言不许省。
4. **事件测试 dispatch 必须包 act**：不冲刷状态即断言=假红（React 18 批处理）。
5. **TDD 顺序违规的标准纠正程序**：实现先于红证→备份实现→还原骨架→跑红→恢复→绿
   （本役 SR2-UIK-01 实录，程序本身入宪法既有条款的执行样例）。
6. 权限策略粒度：全拒策略挡自有功能的合法需求时，改**最小放行清单**并配安全测试
   四断言（放行项+三个拒绝项）锁定收缩面——不是简单关掉策略。

## 5. 基础设施事故记录（2026-08-24 下午，约 20 分钟）

esbuild 服务全链路崩溃（vitest/electron-vite build 均 service no longer running）+
shell 复合命令自动后台化挂起 + rm 句柄锁（探针文件删不掉）。差分定位：直连 JS API
（CJS/ESM/sourcemap/tsconfigRaw/中文路径/30 并发）全健康、单版本无错配、无僵尸进程——
判定系统瞬时态（疑似杀软扫描风暴），自愈。对策沉淀：esbuild 崩溃先移新文件对照；
shell 挂起用单命令+timeout 包装；残留 `_esm_probe.mjs`/`_ptr_probe.mjs` 待系统重启后删
（不阻塞任何关卡——quality 以其在场实测通过）。

## 6. 用户随手验清单（P7-A 能力面）

拖拽阅读器左侧栏分隔条调宽（宽度记忆）/ctrl+滚轮缩放/划选文本后 ctrl+c 复制/
点击已有标注弹四选项菜单（复制引文/删除/添加笔记/取消）/PageUp/PageDown/左右方向键翻页。

## 7. 遗留与指针

- 未 push：本地领先 origin **11 提交**（rev-list 实测）——push 决策属用户。
- C1 防线升级（INV-11/07 lint 化→ADR-0010）待做。
- 主线下一站：P7-B 多标签 → P7-F 连续滚动 → P7-C 笔记结构化（ROADMAP Phase 7+）。
- 安装包未重打（dist_new/ 仍为 2f57653 版）；P7-A 人工验收后可 `npm run dist` 重制
  （dist/ 句柄锁教训：必要时 --config.directories.output 重定向）。
