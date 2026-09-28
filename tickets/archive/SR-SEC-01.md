# SR-SEC-01 票面归档（F-GOV-01）

- id: SR-SEC-01
- file: src/main/protocol/app-file.protocol.ts
- area: infra
- owner: strong
- status: done

## summary 原文

安全加固——app-file:// ACAO 通配收束（外部组合审视 S-1 立法 2026-09-28；设计真相源=docs/design/2026-09-28_gov-batch-design-final.md §1 D-GOV-1/2/17——规划链三段毕：Kimi 首跳+deepseek 审 B2W10N3+主控终裁吸收返工）：行为层=成功响应 ACAO 由字面 * 改「请求 Origin 白名单命中回显原值，未命中=**不带 ACAO 头静默**（不 403——防破坏 pdf.js loadingTask 错误分支）」；白名单=字面集「null」（file:// 页 CORS Origin 恒此值）+dev 域名集（**URL 解析取 hostname 精确等值** localhost｜127.0.0.1——禁子串/后缀匹配，负例 localhost.evil.com 断言）；**无 Origin 头（headers.get 返回 null）=非 CORS 请求不加头**（JS null 与字面 null 双分支显式区分）；**实现首步=Origin 取证步**（真实 PDF 链路 dev+prod 双态打印实际 Origin 串——app-file 自请求存在性实证后定去留[默认剔除白名单，取证反证则补]）；接口层=模块内私有 resolveAcao(requestOrigin: string|null) 顶层白名单常量单源（零新文件零新依赖）；架构层=受锁面=[app-file.protocol.ts+对应测试件+INV-07 注记]——[locked-change] 单尾注；INV-07 补「ACAO=回显白名单形态」行+renderer origin 形态变更须同步白名单耦合注记；不叠加 referer 校验（独立论证：Origin=CORS 规范权威信号，referrer 受 referrer-policy 控制不可靠非防御面——D-GOV-17）；生命周期=TDD 先红（resolveAcao 纯函数单测五分支：命中/未命中/无头/字面 null/dev hostname+负例）+变异红证（白名单摘除回 * 必红）+e2e reader-text 等既有真实 PDF 链路回归+既有 spec 内追加伪造 Origin 无 ACAO 断言（不新增文件）；文化层=残余暴露如实登记（null 回显对 null-origin 页≈* 等宽——renderer 无远端内容+CSP 封死=前提已断；本票真实收益=挡 dev 白名单外站点+显式枚举可审计）；收口 2026-09-28：三屋全链毕——实现 ops-executor 六自裁全申报（含**取证重大发现：Origin 头 protocol.handle 层恒不可观测**[Electron 构造 Request 剥离 forbidden headers，dev+prod 双态实测，CDP 双证]——设计前提实测推翻在案、实现按终裁原样落地=休眠防线[真实可达测试面 unit 层 new Request 伪造锚定]）；门一=k1 PASS B0W0N5+d1 PWW B0W2N6（双席纯内联零 Read；W1 休眠面事实落 INV-07 行内补记[Electron 44/Windows 双态+激活前提=Electron 未来透传 Origin 升级复核挂点]+重锁已修/W2 e2e 语义判别缺失由 unit 11 例+双变异补偿=接受；N1/N6 主控亲核闭合[manifest 257 三件在册+全 src 恰两处 ACAO 写入点 L115/L125 均门控]）；门二 probe 6/6（verify 独立重跑 EXIT=0[177 件/1954 例+指纹门 194/194·1994→2006·6175→6201 超集，NEW 增量=unit 11+e2e 1 吻合]+e2e 52 passed 含新用例+双变异红证[加料 evil.example 3 面红/成功面恒写 * 4 断言红→cp 还原 diff 空→复绿]+树态零残留+编码 4 件 FFFD=0+e2e 产物零污染）；裁决部 GO_WITH_CONDITIONS[P0=0/回炉 0/C1-C4]——C1=本收口笔[locked-change]五件+翻票/C2=交接书滚动（k1-N5 设计层回写备案+证据清单+基线滚动 177/1954·e2e 52·指纹 2006/6201）/C3=数字勘误（SRC 分项 59+/19−·unit 件 137+/2−[impl 报告误记 52/21 与 139/3 系总变行数口径]·e2e 既有 17+新增 1）/C4=证据档时效注记（diff-inline.txt 为 W1 修正前快照）；数字链裁决部独立复算五条全过；diff 面=恰 5 件 230+/26−（分件：protocol 59+/19−+unit 137+/2−+e2e 29+/0−+invariants 1+/1−+manifest 4+/4−）；零新文件零新依赖；证据=仓外 SR-SEC-01/（impl 报告+k1/d1/probe/裁决部四审档 12-15+批次日志 16+raw 11+probe 15+取证探针 3）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
