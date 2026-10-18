import { describe, expect, it } from 'vitest'
import { createFloatingNotesService } from '../../../src/main/services/lineage/floating-notes.service'

/**
 * [F-VISFB-65 单元二] ghost-folder 拒点 reason 发射锚（全库唯一发射点——
 * 设计书 §7；既有 floating-notes.service.test 锁行为面，本件锁 reason 面）。
 * always-active。
 */
function svc(folderExists: (id: string) => boolean): ReturnType<typeof createFloatingNotesService> {
  return createFloatingNotesService({
    repo: {
      upsert: () => ({ id: 'n', folderId: '__main__', x: 0, y: 0, content: '', createdAt: 't', updatedAt: 't' }),
      remove: () => 0,
      listByFolder: () => [],
      listAll: () => []
    },
    folderExists
  })
}

describe('F-VISFB-65 单元二 floating-notes ghost-folder reason 发射', () => {
  it('幽灵 folder 拒：CONFLICT+reason=GHOST_FOLDER（三联判据的 main 侧两联）', () => {
    const s = svc(() => false)
    try {
      s.upsertNote({ folderId: 'f-gone', x: 0, y: 0, content: '文' })
      expect.unreachable('应抛 CONFLICT')
    } catch (e) {
      const err = e as { code?: string; reason?: string }
      expect(err.code).toBe('CONFLICT')
      expect(err.reason).toBe('GHOST_FOLDER')
      expect((e as Error).message).toContain('f-gone')
    }
  })

  it('活 folder 放行零 reason 面（正常路径不携 reason）+其余守卫零 reason', () => {
    const s = svc((id) => id === '__main__')
    expect(() => s.upsertNote({ folderId: '__main__', x: 1, y: 2, content: '文' })).not.toThrow()
    try {
      s.upsertNote({ folderId: '__main__', x: Infinity, y: 0, content: '' })
      expect.unreachable('应抛 INVALID_REQUEST')
    } catch (e) {
      expect((e as { code?: string }).code).toBe('INVALID_REQUEST')
      // 域实例 reason 值 undefined（键纪律=折叠后 AppError 面——contracts 锚；
      // useDefineForClassFields 下实例恒有该 own key，故此处只断言值位）
      expect((e as { reason?: string }).reason).toBeUndefined()
    }
  })
})
