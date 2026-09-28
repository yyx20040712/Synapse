# R1-WS2 票面归档（F-GOV-01）

- id: R1-WS2
- file: src/renderer/features/workspaces/workspace.store.ts
- area: workspaces
- owner: strong
- status: done

## summary 原文

课题切换器渲染层（ADR-0018 渲染面：切课题=dirty 确认→IPC switch→location.reload 全新 stores 零 stale 态类别）——①workspace.store（load/create/rename/switch+内联 error 重试——门一 W1 回炉兑现头注契约）；②WorkspaceSwitcher 侧栏切换器（nav 品牌行下，文案/aria 零触碰）+设置面课题管理节（App slot 注入——quality 禁互引唯一合规路径自裁）；③will-navigate 同 URL 放行（shouldBlockNavigation 纯函数严格等值唯一放行——reload 机制必要+外站/异 file/data: 全 deny 护栏意图不变，门一独立安全裁决无绕过向量；deny 面三 it 双面锚定=W4 回炉）；④e2e workspaces.spec（种子→新建课题 B→reload 库空+脉络空态→切回完整=用户需求 R1 验收场景；加载终态锚防假绿窗=W2 回炉）；INV-35 ④渲染面随单登记（含无 FK 新表防悬置写警示）。门一 0B/4W/10N→回炉 W1/W2/W4→门二 PASS 全核销；新测试 4 件入锁 146→150；vitest 100 文件 779 用例+e2e 25 passed）[locked-change]——票面 scripts/audits/r1-ws2-brief.md；依赖 R1-WS1 四通道（组合回归锁闭 WS1-W3）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
