/**
 * [F-TESTREF-W1A] api/client 与 Toast mock 共享工厂——立案骨架（票面载体）。
 *
 * 目标：vi.mock('…api/client') 39 文件+Toast/toast-store mock 32 文件的各自
 * 声明收敛为本件单源（工厂形态按存量最高频模式收敛——设计在票内小判）。
 * 红线：R1 零 src 变更；C 面零变化由指纹门对拍（F-TESTREF-00 前置毕）。
 * 裁决与战役序：docs/design/2026-09-11_glm-ruling-arch-complexity-and-test-campaign.md §4-4。
 * 实现期本件被 39+32 文件 import 后生效；受锁件。[test-refactor][locked-change]
 */
export {}
