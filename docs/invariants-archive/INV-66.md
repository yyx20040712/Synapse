# INV-66 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-66 | 受管**内容写盘**原子性单源：一切「同路径内容落盘」（JSON/字节覆写）走 services/shared/atomic-write 的 atomicWriteFile（tmp+rename 同卷原子；直写目标路径=半截文件可观测违例）。**边界（刻意限定）**：仅内容写盘——不覆盖协议流（corpus.export manifest 终写=固定名 manifest.tmp.json 态空间契约残留清理语义，保持内联）与移动语义（ai-notes-import rm+rename 归档挪位）；既有 6 调用点=file-store（uniqueTmp+cleanOnFail）/ai-sensor（ensureDir）/workspace.fs ×2/settings ×2；新增内容写盘点必须经本单源（新直写 writeFile 覆写目标=review 拦截位） | F-DEDUP-01（2026-09-18 入册；四副本收敛的单源承诺缺册=未定义行为）+src/main/services/shared/atomic-write.ts 头注 | 单测锚（tests/unit/services/shared/atomic-write.test.ts 8 用例：string/bytes 双形态/终名存在 tmp 零残留/ensureDir/uniqueTmp 并发各写手 tmp 独立（allSettled 口径——Windows 同目标并发 rename 平台竞态，单源真契约=tmp 独立不字节交错）/cleanOnFail）+变异红证（M2 删 rename→终名存在断言红）+调用方既有测试（file-store/ai-sensor/workspaces/settings 全绿=迁移行为等价） | 已锚定（F-DEDUP-01 落锚；RESTORE 标记为 echo 自声明的既有欠账同 batch 7 P2-1 族） |
