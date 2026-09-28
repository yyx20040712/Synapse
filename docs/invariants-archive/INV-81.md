# INV-81 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-81 | better-sqlite3 安装零编译依赖（F-CI-01，2026-09-28；k1-W3 处置）：原生绑定由包内 prebuilds/ 直供（N-API 跨 Node/Electron ABI 通用——F-ELE-02 口径），npm 安装全程无源码编译需求；package.json allowScripts 置 better-sqlite3: false（npm 11.19 install-scripts 审批机制）为强制面——npm ci 形态对该包 binding.gyp 的缺省动作 node-gyp rebuild（经项目 .bin 解析 node-gyp@9.4.1←@electron/rebuild 传递，无法解析 windows-latest runner VS 18）已按包禁用；升级复核钩子=better-sqlite3 大版本升级必须核 prebuilds 平台覆盖（win32-x64 在位+require 冒烟），若新版本改为需编译安装则本条与 deny 同票重议 | package.json（allowScripts 单源）+本册 | vitest db 层（require 失败=测试层响亮红——静默跳过不可能漏网）+CI 实跑（真实脱扣路径=prebuilds 缺失→require 失败→CI 测试步红） | 已锚定（verify 全量+CI run 36372251379 首绿双面——2026-09-28 F-CI-01 翻票笔刷新） |
