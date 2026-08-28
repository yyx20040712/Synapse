# SR2-ENR-02 实现者派发简报(主控→实现者子代理)

## ① 身份与禁令

你是三屋模式的实现者子代理,领单 **SR2-ENR-02 venueTier 映射与 manifest 装配**。

- 禁 `git add/commit/push`(一切 git 写操作);禁读改 `tickets/registry.ts`
  (控制面单写者=主控)。
- 只改票面文件清单内的文件;卡点=输出 `BLOCKED: <卡点描述>` 停手,不自裁绕过
  (ENR-01 同型票面断言被证伪先例:停手申报是对的)。
- 实现者自裁权:票面明确下放项可裁但必须申报;其余歧义一律 BLOCKED。

## ② 必读序(按序读完再动手)

1. `AGENTS.md` —— 硬规则。
2. **票面(=完整任务书)**:`src/shared/venue-tier.ts` 头注五层规约 +
   `scripts/audits/enr-ticketing-draft.md` 的 SR2-ENR-02 节(契约全定 W7)。
3. ADR 母本:`docs/adr/0011-md-corpus-interface-contract.md`
   (v1 契约+v1.1 修订记录:94 行起——你的 v1.2 补注行落点在同节尾)。
4. 先例池(逐文件看):
   - `src/main/services/export_/corpus.assemble.ts` :18 预留位(「可选含金量字段
     citedByCount/venueTier」)+frontMatter 装配点——**头指针 P7-C 勿动**(票面 N2:
     一文件双裁决来源,改头指针=丢 C-02 链,门一必 B)。
   - `src/main/services/export_/corpus.export.service.ts` :182 附近 deps.now 先例
     +manifest per-paper 条目组装处(citedByFetchedAt 装配落点)。
   - `src/main/services/export_/interface-template.ts`(47 行)——INTERFACE.md
     模板,指标口径节补两字段+sha 消费者提示(W6 口径见票面)。
   - `src/main/db/repos/papers.repo.ts` detailById 透出面(ENR-01 已就位:
     count 非 null 三字段齐出 null 全省略——你的装配数据源;INV-28 配对规则)。
   - `src/shared/models/paper.ts` paperDetailSchema 三 optional 字段(ENR-01)。
   - 测试三件:`tests/unit/services/corpus.export.test.ts` :115-150(golden=装配
     纯函数输出逐字节内联断言,非快照文件)+`tests/unit/services/corpus.assemble.test.ts`
     (圆点命名)+`docs/invariants.md` INV-17/18(导出幂等/会话协议——manifest
     结构断言口径)facts。
   - `tests/unit/services/cited-by.test.ts`(ENR-01 新测试——裸 describe 与
     跨格序列风格参照)。

## ③ 主控裁决(票面范围内澄清——实现者不再自裁这些点)

1. **环境铁律(最高优先)**:一切 node/npm 命令必须带前缀
   `export PATH="/e/class/智慧水务/tools/node24:$PATH" && ...`
   (本机默认 node=v25 假红;ENR-01 已实证)。
2. 基线数字以 ENR-01 收口后为准:verify **88 文件 639 用例** exit 0;
   locks **136**;工单 106/open 1(ENR-02)。
3. 新测试文件名=`tests/unit/shared/venue-tier.test.ts`(票面定名,裸 describe)。
4. golden 更新口径:夹具**加含缓存值篇**(citedByCount+venueTier 有值形)+
   既有无指标篇保持缺省形——两形断言(票面行为层);golden 字面量改动在既有
   块内合法(W4);**schemaVersion 恒 1 不动**。
5. ENR-01 收口已清短式:src 引用本单工单号用 `ENR-02` 短式(非注册文件);
   venue-tier.ts(注册文件)全号合法。**收口清短式=主控职权,你只管实现**;
   但新写注释请直接用短式减少收口面。
6. STUB 处置:`VENUE_TIER_STUB` 导出实现完成后删除(grep 零残留)。

## ④ 纪律

- **TDD 四档**:先写测试→首红(输出留存)→实现→绿→**断言级变异红证**
  (单 token 变异→恰中目标用例红→`cp` 备份法还原→`diff` 确认空输出入日志;
  禁 `git checkout` 还原)。
- `npm run test` 禁裸 `npx vitest`;完整 `npm run verify` 收口自检,
  **真退出码落盘**:`echo "exit=$?" >> scripts/audits/enr02-impl-verify.log`。
- 禁新依赖;文件 ≤500 行(repo ≤300);中文 UTF-8(写后验证可读)。
- 受锁文件流程:改受锁文件(corpus.export.test.ts/corpus.assemble.test.ts)
  前 `npm run locks:unlock`;**新增受锁路径**(src/shared/venue-tier.ts 受锁吗?
  ——**是**:src/shared/** 全域入锁,且已在 manifest;tests/unit/shared/
  venue-tier.test.ts 新增)先 `npm run locks:generate` 再 `npm run locks:apply`;
  每轮改动完成即保持 apply 状态。
- ADR-0011 v1.2 补注行:修订记录节尾追加(纯 docs 随单提交;不改正文)。

## ⑤ 基线数字(自检参照)

- verify:**88 文件 639 用例** exit 0(ENR-01 收口后;你的测试会增加总数)。
- locks:**136**(完成后预期 137:+venue-tier.test.ts;venue-tier.ts 已在册)。
- 工单:106/open 1(ENR-02)。

## ⑥ 报告契约

全文落 `scripts/audits/enr02-impl.report.md`,含:实现摘要/文件清单/
TDD 红证(首红输出)/测试证据(verify 真退出码行)/locks 实录(generate+apply
输出)/**自裁申报**(含删减面 diff 自查——对照票面文件清单逐项列「改了什么/
没改什么」)/疑虑。回复五行内(详细内容在报告文件里)。
