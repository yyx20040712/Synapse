# 2026-09-20 LOOP 交接 v63——ELE03 验收场（Electron 44 收尾）+R2-SH3/SH4 改名漏项双票清偿+补验场排程

> 上段=v62（接力通道布板；其间 2026-09-19 batch 29-32 走板完成存储批/Electron
> A/B 双票=37/37 全勾 DONE+停火）。本段=2026-09-20 **ELE03 验收场**（用户在场轮、
> 非接力批）：A 段欠账清理（asar 42 残留治愈+verify 基线零漂移+dist_new 锁因归因）
> +**R2-SH3**（installer-smoke 常量失配）+**R2-SH4**（出网 UA 无空格变体+文档
> 路径失真）两小票立案三屋清偿。基线：**167 文件/1724 用例/locks 244/指纹门
> 183·1768·5368·skip14**；registry **1 open/211 total**（R2-SH3/SH4 已毕）。

## 0. 开场（下会话首读——技能清点+三态恢复）

- 开工首步=技能清点（宪法开工纪律）+配置自查，落开工记录后再动手；门一承载=
  **ops-gate1-k2（zipoo 源）**，勿派 k1（用户 2026-09-18 指令，未见新指令前有效）。
- 预期态：HEAD=本交接提交。工作树**可能有一件 M docs/handoff/relay.md**（他会话
  「hub 停火记」尾注，2026-09-19T23:29Z——处置见 §2-1，属预期非异常）。
- **relay 板=终态**（DONE 37/37，火已删）：勿认领、勿改 claim/状态/计数字段；本场
  证据与销账一律以增补形态纯追加（增补十四已落，十五/十六归本场）。
- 用户前置动作（验收场已裁「按此执行」）：关闭 ZCode→管理员终端
  `npm run dist`+`rmdir /s /q dist_new`→重开 ZCode——**开场先核验其结果**（§2-2）。
- Volta 直连可用性会话间有差异：开场 `command -v node && node -v` 探针，非
  24.20.0 则按 AGENTS 环境事实段绕行（`/c/Program Files/Volta` PATH 前缀）。

## 1. 本段终态（四件）

| 件 | 提交 | 要点 |
| --- | --- | --- |
| ELE03 验收场 A 段+增补十四 | bbdb0aba310 | asar 42 残留治愈（npm install 实测不自愈——install.js isInstalled 秒退；终径=镜像 env 复原缓存键+CopyFile CREATE_ALWAYS 原地截断重写+全成员补齐+path.txt 手补，dist 与 44.4.3 zip 全清单零失配，幂等复证 exit 0）+verify EXIT=0 零漂移+dist_new 清至锁死单件（锁主=ZCode 宿主索引器句柄，欠账携带）+根因新登记（asar 句柄族三处同因） |
| R2-SH3 | 53e74b9bc5b + 8bb7bdef0b5 | installer-smoke 三常量对齐 productName=Synapse+DEVELOPMENT.md:88 勘误+受锁单链 [locked-change]；门一 k2 PW B0/W1/N5（W1 假阳性注记主控顺带修）+门二 GWC（**P2-1 发现**：http-client UA 无空格变体→R2-SH4） |
| R2-SH4 | d97a2571d94 + cb2e26b2bd0 | USER_AGENT='Synapse/0.1.0' 单源常量化+README 标题+ai-sensor 称谓+SKILL.md 路径失真修正（语料目录旧指 Synapse Remake\）；门一 k2 两轮（初 FAIL=主控审包转录笔误→sed 地面真值证伪→重裁 PASS B0/W0/N10）+门二 GO P0=0/P1=0；零受锁件 |
| 本交接 v63 | 本提交 | 排程面指针（§2=补验场执行序——板已终态，交接书恢复排程职能） |

## 2. 挂起项与后续（=补验场执行序）

1. **relay.md 在途尾注处置（首动作）**：`git diff docs/handoff/relay.md` 核「hub 停火记」
   内容与增补十二/十三史实一致（删火 automation-9d069f57、CronList 空集）→单独
   提交（docs(relay) 尾注收录）；内容异常则呈报用户勿提交。
2. **dist 产出核验**：`ls dist/Synapse-*-setup.exe`——在位→续 3；不在位→用户未跑，
   引导其执行管理员窗口动作（关 ZCode→`npm run dist`+`rmdir /s /q dist_new`→重开）。
   顺核 dist_new 是否已随该窗口删除。
3. **smoke:installer 后验**：`npm run smoke:installer -- --installer <新包绝对路径>`
   ——**禁缺省取包**（dist/ 存旧包 Synapse-Remake-0.1.0-setup.exe 假阳性面）；
   R2-SH3 修复后预期绿（装得上/起得来/卸得掉）；红按步骤名取证（[smoke] FAIL @ 行）。
4. **B 段渲染人工视检（用户在场轮）**：`npm run dev` 后台起→用户亲眼看①主界面
   ②导入 PDF ③阅读器渲染（pdf.js canvas+TextLayer+标注层——44 ANGLE 静态链接
   像素面）；执行者零视觉决策承担；异常截图仓外
   E:/zcode_md/synapse-archive/scripts-audits/ele03-visual-*.png+文字描述、立案归
   用户裁决；无异常销账。起窗前一句话告知前台占用。
5. **增补十五/十六落板**（纯追加，板状态字段零动）：十五=R2-SH3/R2-SH4 销账+本段
   叙事；十六=dist/smoke/视检补验结果+relay 尾注处置记录。证据件登记制仓外。
6. **可选呈报（归用户点单）**：①corpus-export e2e flake 排查票（docs/audits/
   flake-ledger.json 尾条 count 5、unpursued、时序敏感竞争嫌疑=F-EXPORT-01 同域）；
   ②local-state.mjs:12-13 注释失真小票（R2-SH1 尾巴，受锁 [locked-change]——或随
   下次 local-state 触碰捎带）。

## 3. 本段成本账本

```
主控 GLM5.3（全程）：验收场三段指挥/欠账取证与根因归因（RM 探针+POSIX 删除
  探针+CopyFile 治疗件）/R2-SH3+R2-SH4 立案-派发-门审-收口全链/增补十四+v63
R2-SH3 三岗：executor=session:host-tier（1 单元）/gate1=zipoo k3$max（PW）
  /gate2=deepseek-flash$max（GWC）
R2-SH4 三岗：executor=session:host-tier（1 单元）/gate1=zipoo k3$max（两轮：
  初 FAIL+重裁 PASS）/gate2=deepseek-flash$max（GO）
账本 96→105 行（+3+3）；外部派发器零调用（绑定子代理通道全承载）
```

## 4. 教训行（本段四条）

- **机制断言先读实现再落笔**：b32「次会话 npm install 自愈」被 install.js
  isInstalled() 源码证伪——凡「X 会自愈/会跳过」类断言，先读 X 的判定源码。
- **审包原样性=门一机制承重墙**：diff 审包一律贴工具原生输出、禁人工转手压缩
  ——R2-SH4 门一初 FAIL 系主控转录一字符失真，合格实现被误报一轮回炉（N8 实证首例）。
- **registry summary 内嵌引号必须转义**：TS 单引号字符串内写 ' 值' 提前截断字面量
  ——SH3 闭合笔转义了、SH4 漏（lint 解析红拦截，同笔修正）；写毕必跑 lint 快关卡。
- **本机 asar 句柄族=ZCode 宿主索引器**（读+写共享、无删除共享——dist_new/dist
  旧产物/node_modules 三处同因实测）：删除/改名/POSIX 删除全拒，**内容修复=原地
  截断重写可行，删除修复=须宿主关闭窗口**；凡 electron-builder 清 staging 的
  unlink 在宿主运行期必撞。

## 5. 环境事实滚动

- 基线：**167 文件/1724 用例/locks 244/指纹门 183·1768·5368·skip14**；
  registry **1 open/211 total**。renderer 产物 index-DW6Z3WXp.js 1,388.14kB
  同名同尺寸（R2-SH4 后 out/main/index.js 已携新 UA——门二实证）。
- **winCodeSign**：darwin 段 symlink 非管理员解包恒红（7za -snld 两链）；缓存重试
  每轮新随机临时名不可预置命中（numeric 尝试目录实测 18 个）——修法=管理员终端
  一次 `npm run dist`（2026-08-22 先例+本段二次实证）。
- **提交信息中文必须 -F 文件法**（argv 中文 GBK 坑实锤两次）；`head -c N` 按字节
  截中文=显示层假乱码（存储态无恙，核验用 `git log --format=%s`）。
- 残留旧名全集（双 grep 口径：空格+无空格变体）：代码侧 9 处全为契约性保留
  （migrate-user-data.ts:54 迁移常量 1+受锁迁移测试 5+local-state 回退探测 3）；
  文档侧 31 处历史叙事；**唯一已知活性尾巴=local-state.mjs:12-13 注释失真**（§2-6②）。
- dist/ 现存**旧产物 Synapse-Remake-0.1.0-setup.exe**（改名前构建，gitignored）
  ——smoke 缺省取包有假阳性面，必须 --installer 显式指新包（§2-3）。
- v62 承袭事实：接力板终态+火已删（增补十二/十三+hub 停火记）；重启径=用户显式
  /batch-relay 换防或手动径领批，两径同规。
