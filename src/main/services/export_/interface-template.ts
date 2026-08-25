/**
 * INTERFACE.md 静态模板单源（AI-03 交付面）。
 *
 * ADR-0011：面向 AI 消费者的说明书——zcode 类代理读文件系统即可理解接口，
 * 无需训练适配（「传感器」定位：应用只负责把数据说明白）。
 * INV-11 单源：目录结构/字段表/语法只在此声明；corpus.assemble.ts 是装配
 * 实现侧（页码基准等口径两处互指，变更联动）。
 * 版本承诺：schemaVersion 升级时本文件同步改+导出会话 manifest.schemaVersion
 * 联动（破坏性变更禁止——ADR-0011 演进规则）。
 */
export const INTERFACE_MD = `# Synapse 语料导出接口说明书（INTERFACE）

> 本目录由 Synapse 应用导出（五件套：本文件+manifest.json+corpus/+fulltext/
> figures/）。「manifest.json 存在」= 导出完整就绪（唯一激活判据）；导出中断
> = 无 manifest，重跑导出即修复（目录清空重建）。

## 目录结构

- \`INTERFACE.md\`：本说明书
- \`manifest.json\`：导出索引（schemaVersion/exportedAt/papers[]/可选 errors[]；
  contentSha/fulltextSha=对应文件字节 sha256，供增量对比）
- \`corpus/<paperId>.md\`：每篇语料（结构化标注+笔记，二阶消费主面）
- \`fulltext/<paperId>.txt\`：全文本层（pdf 文本按页拼接，**页界符 \\f 分隔**，
  页序 1 基——一阶消费主面）
- \`figures/<paperId>/page-<N>.png\`：页级快照（N=1 基页码；2 倍分辨率渲染）
- \`figures/<paperId>/anno-<annotationId>.png\`：标注区域裁剪（归一化 rects
  包围盒从页快照裁出，与 corpus md 引文块对应）

## corpus md 结构

- front-matter（YAML 单引号标量）：schemaVersion / paperId / title / authors /
  year / venue / doi / source / citationKey / annotationCount / noteCount。
  **不含 exportedAt**（时间戳只在 manifest——保证 contentSha 幂等：同库重导
  逐字节稳定）
- 正文：\`# 标题\` → \`## 总评\`（存在时）→ \`## 片段\`
- 片段层逐条（文档序=页码→页内偏移→创建序）：
  - 引文块：\`> 引文原文（p.N）\`——**N 为 1 基页码**（存储 0 基，显示 1 基）
  - 缩进批注行（4 空格缩进）：\`[user] 人工批注\` / \`[ai:<model>] <question>: <回答>\`
- 语料来源前缀：\`[user]\`=人工；\`[ai:…]\`=AI 语料（role 序=一读→二读→裁决；
  question 标记在内容首——Q1..Q7/divergence）。消费者按前缀区分来源，
  未知前缀不破坏解析（忽略即可）

## 版本承诺

- schemaVersion=1；新增字段必须可选；删除/改名=禁止（升版本保留旧字段）
- figures 收窄（如仅标注页）、增量导出=未来版本化修订（本文件同步升版）
`
