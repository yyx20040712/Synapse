# F-TESTREF-W1A 票面归档（F-GOV-01）

- id: F-TESTREF-W1A
- file: tests/utils/api-client-mock.ts
- area: infra
- owner: strong
- status: done

## summary 原文

测试优化战役 W1a=mock 工厂下沉（终裁 §4-4 序——前置 F-TESTREF-00 指纹门毕）：vi.mock(\'…api/client\') 39 文件各自声明+Toast/toast-store mock 32 文件→tests/utils 共享工厂单源（工厂形态按存量最高频模式收敛——设计在票内小判不改断言语义）；C 面零变化由指纹门对拍证明（合并前后基线 diff=∅）；R1 零 src 变更红线+R2/RR3/R4 照宪章 §0.3；净删行数记账入交接书；[test-refactor][locked-change] 双尾注

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
