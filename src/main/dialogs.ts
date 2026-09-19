/**
 * 系统对话框注入（SR-INFRA-15，已完成；2026-08-23 Q2-B2 修复：绑父窗口模态化）。
 *
 * 职责：main 侧唯一的系统对话框出口（安全 §6.3：文件/目录路径只能从这里产生，
 * renderer 永远不传路径）。接口窄化便于测试打桩。三个对话框均以主窗口为父
 * （模态：对话框打开期间主窗口不可交互、不会沉到主窗口后面）；窗口未就绪或
 * 已销毁时退化为无父对话框（可用性优先——装配点在窗口创建之前，靠惰性
 * getter 在对话框实际弹出时才取窗口）。
 */
import { dialog } from 'electron'
import { dirname } from 'node:path'
import type { BrowserWindow, OpenDialogOptions, SaveDialogOptions } from 'electron'

/**
 * 三 pick 共享的上次选择目录（F-ELE-03）：Electron 43 起 showOpenDialog 未传
 * defaultPath 时默认开 Downloads 且不再记住上次目录——以模块级内存态复刻
 * 42 时代的「记住上次目录」体感（主控预裁：内存态，跨会话不持久）。
 */
let lastDir: string | undefined

export interface Dialogs {
  /** 选择一个或多个 PDF（取消返回 null） */
  pickPdfFiles(): Promise<string[] | null>
  /** 选择目录（批量导入，取消返回 null） */
  pickFolder(): Promise<string | null>
  /** 选择单个 JSON 文件（LG-01 脉络图草稿导入，取消返回 null） */
  pickJsonFile(): Promise<string | null>
  /** 保存文件（导出用；extFilters 形如 [{ name: 'BibTeX', extensions: ['bib'] }]） */
  saveFile(defaultName: string, extFilters: Array<{ name: string; extensions: string[] }>): Promise<string | null>
}

export function createElectronDialogs(getParent: () => BrowserWindow | null): Dialogs {
  // 绑父（模态）打开文件对话框；无父时退化为普通对话框
  const openWithParent = (options: OpenDialogOptions) => {
    const parent = getParent()
    return parent !== null ? dialog.showOpenDialog(parent, options) : dialog.showOpenDialog(options)
  }
  const saveWithParent = (options: SaveDialogOptions) => {
    const parent = getParent()
    return parent !== null ? dialog.showSaveDialog(parent, options) : dialog.showSaveDialog(options)
  }
  return {
    pickPdfFiles: async () => {
      const r = await openWithParent({
        title: '选择要导入的 PDF',
        defaultPath: lastDir,
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'PDF 文档', extensions: ['pdf'] }]
      })
      if (r.canceled || r.filePaths.length === 0) return null
      lastDir = dirname(r.filePaths[0]!)
      return r.filePaths
    },
    pickFolder: async () => {
      const r = await openWithParent({
        title: '选择要批量导入的文件夹',
        defaultPath: lastDir,
        properties: ['openDirectory']
      })
      if (r.canceled) return null
      const dir = r.filePaths[0] ?? null
      if (dir !== null) lastDir = dirname(dir)
      return dir
    },
    pickJsonFile: async () => {
      const r = await openWithParent({
        title: '选择脉络图 JSON 草稿',
        defaultPath: lastDir,
        properties: ['openFile'],
        filters: [{ name: 'JSON 文档', extensions: ['json'] }]
      })
      if (r.canceled || r.filePaths.length === 0) return null
      const file = r.filePaths[0]!
      lastDir = dirname(file)
      return file
    },
    saveFile: async (defaultName, extFilters) => {
      const r = await saveWithParent({
        title: '导出到',
        defaultPath: defaultName,
        filters: extFilters
      })
      return r.canceled || !r.filePath ? null : r.filePath
    }
  }
}
