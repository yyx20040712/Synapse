/**
 * save-status —— 保存状态推导（纯函数，显示诚实性契约的单一推导点）。
 *
 * 自库侧 NotesPanel（C-03 前身）原样迁移 renderer/shared——一切 feature 可消费
 * （NotesPanel 已随 C-06 下线删除——本文件即唯一实现）。
 * 语义：deriveSaveStatus 四态优先级 保存中 > 保存失败 > 未保存 > 已保存；
 * detectSaveFailed 周期终点帧按 savedAt 是否推进裁决（INV-04：失败不推进
 * savedAt）；非终点帧返回 null（不动失败态——savedAt 前进来源含合并落地）。
 * 锁定测试：tests/unit/renderer/notes-panel-status.test.ts（动态 import 已随
 * C-06 迁径本文件 [locked-change]——断言语义原样锁定）。
 * [F-VISFB-13] 四态钮推导面（§0-2 锁定裁决）：SaveUiState 规范态+
 * deriveSaveUiState（notes 轴）/editorSaveUiState（批注轴——clean 并入
 * saved）/deriveSaveButtonView（钮视图单源）。锁定测试：
 * tests/unit/renderer/save-state-button.test.tsx ①（always-active）。
 */

/** 保存状态指示四态（未保存来自 store 的 pending 镜像——合并落地窗口/防抖窗口内切回不得误显"已保存"） */
export type SaveStatus = '保存中…' | '保存失败' | '未保存' | '已保存'

/** 保存状态推导（单一推导点，纯函数锁定）：优先级 保存中 > 保存失败 > 未保存 > 已保存。
 *  saving=周期在飞；saveFailed=周期结束而 savedAt 未推进（INV-04 消费）；
 *  pending=草稿含未落库编辑（store pendingEdit 镜像） */
export function deriveSaveStatus(saving: boolean, saveFailed: boolean, pending: boolean): SaveStatus {
  if (saving) return '保存中…'
  if (saveFailed) return '保存失败'
  if (pending) return '未保存'
  return '已保存'
}

/**
 * [F-VISFB-13] 四态钮规范态（§0-2 锁定裁决的机器形态——SaveStateButton 消费）：
 * dirty=彩色可点（点击即存）/saved=灰色 disabled/saving=spinner 禁用/
 * failed=红+短文本「重试」可点。与 SaveStatus（文案态）分型：文案态供宿主
 * 判定播报语义，钮态供共享钮渲染单源。
 */
export type SaveUiState = 'dirty' | 'saving' | 'saved' | 'failed'

/**
 * [F-VISFB-13] 编辑器草稿态（use-annotation-draft 的 SaveState 结构对齐联合
 * ——本文件驻 renderer/shared 不 import feature，防分层倒挂；两处联合须同步改）
 */
export type EditorSaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed'

/** [F-VISFB-13] notes 轴四态推导（deriveSaveUiState 同优先级：saving > failed > dirty > saved） */
export function deriveSaveUiState(saving: boolean, saveFailed: boolean, pending: boolean): SaveUiState {
  if (saving) return 'saving'
  if (saveFailed) return 'failed'
  if (pending) return 'dirty'
  return 'saved'
}

/** [F-VISFB-13] 批注轴五格映射：clean 并入 saved（无待存=已存基线），余四格直通 */
export function editorSaveUiState(s: EditorSaveState): SaveUiState {
  if (s === 'saving') return 'saving'
  if (s === 'failed') return 'failed'
  if (s === 'dirty') return 'dirty'
  return 'saved'
}

/** [F-VISFB-13] failed 态显式无障碍名单源（可见文字「重试」开头形——WCAG 2.5.3 label-in-name） */
export const RETRY_A11Y = '重试——上次保存失败'

/** [F-VISFB-13] 四态钮视图模型（钮呈现单源——组件禁散落 if-else 态逻辑）：
 *  双编码约定（§0-2 禁仅颜色区分）：每态图形编码=icon/spinner（形状互异），
 *  文本编码=态语（dirty/saving/saved 走 sr-only〔A4 删「已保存」类可见字样，
 *  textContent/accessible name 双面保活〕；failed 可见短文本「重试」）。 */
export interface SaveButtonView {
  /** 皮肤变体（theme-buttons.css .syn-btn-<variant> 类单源） */
  variant: 'primary' | 'secondary' | 'danger'
  disabled: boolean
  /** spinner 呈现（saving 格图形编码——在场时 icon 不渲染） */
  spinner: boolean
  icon: 'save' | 'check' | 'retry'
  /** 态语（aria-live=polite 播报载体——四态迁移与态语一一对应即 AT 播报） */
  text: string
  /** 态语可见性：false=sr-only（A4）；failed=true（短文本「重试」可点重试） */
  visibleText: boolean
  /** 悬停提示（title 与态语义同源；aria/title 保留=§0-2——title/aria-label
   *  恒同源单值：F-UIRES-02 批 B 同源条款+failed 态可见文字「重试」开头形） */
  title: string
}

/** [F-VISFB-13] 四态→钮视图推导（纯函数 O(1)，无重同步计算——状态切换反馈 ≤100ms 判据的地基） */
export function deriveSaveButtonView(state: SaveUiState): SaveButtonView {
  switch (state) {
    case 'dirty':
      return { variant: 'primary', disabled: false, spinner: false, icon: 'save', text: '保存', visibleText: false, title: '立即保存' }
    case 'saving':
      return { variant: 'secondary', disabled: true, spinner: true, icon: 'save', text: '保存中', visibleText: false, title: '保存中' }
    case 'saved':
      return { variant: 'secondary', disabled: true, spinner: false, icon: 'check', text: '已保存', visibleText: false, title: '已保存' }
    case 'failed':
      return { variant: 'danger', disabled: false, spinner: false, icon: 'retry', text: '重试', visibleText: true, title: RETRY_A11Y }
  }
}

/** 周期结束失败判定（单一判定点，纯函数锁定）：saving true→false 的终点帧按
 *  savedAt 是否推进裁决（INV-04：失败不推进 savedAt）；非终点帧返回 null
 *  （不动失败态——savedAt 前进来源含合并落地，不能证明本面板周期成功） */
export function detectSaveFailed(
  prevSaving: boolean,
  saving: boolean,
  prevSavedAt: string | null,
  savedAt: string | null
): boolean | null {
  if (!prevSaving || saving) return null
  return prevSavedAt === savedAt
}
